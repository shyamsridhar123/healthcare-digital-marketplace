import { getContainer, CONTAINERS } from "../cosmos/client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PolicyType =
  | "rate-limit"
  | "model-allowlist"
  | "content-filter"
  | "data-access"
  | "compliance"
  | "cost-budget"
  | "human-gate"
  | "custom";

export type PolicyDecisionType = "allow" | "deny" | "transform" | "pending-approval";

export interface PolicyContext {
  executionId: string;
  nodeId: string;
  nodeType: string;
  agentId?: string;
  serverId?: string;
  modelId?: string;
  dataSourceIds?: string[];
  inputText?: string;
  outputText?: string;
  tokenCount?: number;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface OutputTransform {
  type: "redact" | "replace" | "truncate";
  pattern?: string;
  replacement?: string;
  maxLength?: number;
}

export interface PolicyDecision {
  decision: PolicyDecisionType;
  appliedPolicies: string[];  // policy IDs that matched
  violatedPolicies: string[]; // policy IDs that denied/flagged
  reason?: string;
  transforms?: OutputTransform[];
}

interface PolicyRule {
  field?: string;
  operator: string;
  value: unknown;
  patterns?: string[];
  allowedModels?: string[];
  allowedSources?: string[];
  maxCalls?: number;
  timeWindowSeconds?: number;
  maxTokens?: number;
  detectPii?: boolean;
  piiTypes?: string[];
  approvalMessage?: string;
  expression?: string;
}

interface Policy {
  id: string;
  name: string;
  type: PolicyType;
  enabled: boolean;
  priority: number; // 0-100, higher = evaluated first
  scope: {
    target: "all" | "agent" | "mcp-server" | "model" | "data-source";
    resourceId?: string; // if set, only matches that specific resource
  };
  rules: PolicyRule[];
  action: PolicyDecisionType;
  tenantId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PII_PATTERNS: Record<string, RegExp> = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  creditCard: /\b(?:\d{4}[- ]?){3}\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
};

function matchesScope(policy: Policy, ctx: PolicyContext): boolean {
  if (policy.scope.target === "all") return true;
  if (policy.scope.target === "agent") {
    if (policy.scope.resourceId && ctx.agentId !== policy.scope.resourceId) return false;
    return !!ctx.agentId;
  }
  if (policy.scope.target === "mcp-server") {
    if (policy.scope.resourceId && ctx.serverId !== policy.scope.resourceId) return false;
    return !!ctx.serverId;
  }
  if (policy.scope.target === "model") {
    if (policy.scope.resourceId && ctx.modelId !== policy.scope.resourceId) return false;
    return !!ctx.modelId;
  }
  if (policy.scope.target === "data-source") {
    if (policy.scope.resourceId) return ctx.dataSourceIds?.includes(policy.scope.resourceId) ?? false;
    return (ctx.dataSourceIds?.length ?? 0) > 0;
  }
  return false;
}

// Simple in-memory call counter (per-execution short-lived; for real rate-limit use audit-log)
const callCounters = new Map<string, { count: number; windowStart: number }>();

function getRateCount(key: string, windowSeconds: number): number {
  const now = Date.now();
  const existing = callCounters.get(key);
  if (!existing || (now - existing.windowStart) > windowSeconds * 1000) {
    callCounters.set(key, { count: 1, windowStart: now });
    return 1;
  }
  existing.count++;
  return existing.count;
}

function evaluateSinglePolicy(
  policy: Policy,
  ctx: PolicyContext,
  phase: "pre" | "post"
): { matched: boolean; transforms?: OutputTransform[] } {
  const rule = policy.rules[0]; // primary rule
  if (!rule) return { matched: false };

  switch (policy.type) {
    case "rate-limit": {
      if (phase !== "pre") return { matched: false };
      const key = `${ctx.tenantId}:${ctx.agentId ?? ctx.serverId ?? "global"}:${policy.id}`;
      const count = getRateCount(key, rule.timeWindowSeconds ?? 60);
      return { matched: count > (rule.maxCalls ?? 100) };
    }

    case "model-allowlist": {
      if (phase !== "pre") return { matched: false };
      if (!ctx.modelId) return { matched: false };
      const allowed: string[] = rule.allowedModels ?? [];
      return { matched: !allowed.includes(ctx.modelId) };
    }

    case "content-filter": {
      if (phase !== "post") return { matched: false };
      const text = ctx.outputText ?? "";
      const patterns: string[] = rule.patterns ?? [];
      const matched = patterns.some((p) => {
        try { return new RegExp(p, "i").test(text); } catch { return false; }
      });
      if (!matched) return { matched: false };
      if (policy.action === "transform") {
        const transforms: OutputTransform[] = patterns.map((p) => ({
          type: "redact" as const,
          pattern: p,
          replacement: "[REDACTED]",
        }));
        return { matched: true, transforms };
      }
      return { matched: true };
    }

    case "data-access": {
      if (phase !== "pre") return { matched: false };
      const allowed: string[] = rule.allowedSources ?? [];
      const requested = ctx.dataSourceIds ?? [];
      const blocked = requested.filter((id) => !allowed.includes(id));
      return { matched: blocked.length > 0 };
    }

    case "compliance": {
      const text = (phase === "pre" ? ctx.inputText : ctx.outputText) ?? "";
      if (!text) return { matched: false };
      const types: string[] = rule.piiTypes ?? Object.keys(PII_PATTERNS);
      const detected = types.filter((t) => PII_PATTERNS[t]?.test(text));
      if (!detected.length) return { matched: false };
      if (rule.detectPii && policy.action === "transform") {
        const transforms: OutputTransform[] = detected.map((t) => ({
          type: "redact" as const,
          pattern: PII_PATTERNS[t]!.source,
          replacement: `[${t.toUpperCase()} REDACTED]`,
        }));
        return { matched: true, transforms };
      }
      return { matched: true };
    }

    case "cost-budget": {
      if (phase !== "pre") return { matched: false };
      const tokens = ctx.tokenCount ?? 0;
      return { matched: tokens > (rule.maxTokens ?? 10000) };
    }

    case "human-gate": {
      if (phase !== "pre") return { matched: false };
      return { matched: true };
    }

    case "custom": {
      // Simple key-path comparisons: "field operator value"
      // e.g. "tokenCount > 5000" or "nodeType == model"
      const expr = rule.expression ?? "";
      const match = expr.match(/^(\w+)\s*(==|!=|>|>=|<|<=|contains)\s*(.+)$/);
      if (!match) return { matched: false };
      const [, field, op, rawValue] = match;
      const actual = (ctx as unknown as Record<string, unknown>)[field!];
      const value = rawValue!.trim().replace(/^["']|["']$/g, "");
      switch (op) {
        case "==":  return { matched: String(actual) === value };
        case "!=":  return { matched: String(actual) !== value };
        case ">":   return { matched: Number(actual) > Number(value) };
        case ">=":  return { matched: Number(actual) >= Number(value) };
        case "<":   return { matched: Number(actual) < Number(value) };
        case "<=":  return { matched: Number(actual) <= Number(value) };
        case "contains": return { matched: String(actual).includes(value) };
        default: return { matched: false };
      }
    }

    default:
      return { matched: false };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Evaluate all enabled policies for a given execution context.
 * Returns the most restrictive decision (deny > pending-approval > transform > allow).
 */
export async function evaluatePolicies(
  ctx: PolicyContext,
  phase: "pre" | "post",
  additionalPolicyIds: string[] = []
): Promise<PolicyDecision> {
  const container = await getContainer(CONTAINERS.POLICIES);

  // Fetch all enabled policies for this tenant
  const { resources } = await container.items
    .query<Policy>({
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId AND c.enabled = true ORDER BY c.priority DESC",
      parameters: [{ name: "@tenantId", value: ctx.tenantId }],
    })
    .fetchAll();

  // Also gather any additional policies explicitly requested by name
  let policies = resources ?? [];

  if (additionalPolicyIds.length > 0) {
    const extra = await Promise.all(
      additionalPolicyIds.map((id) =>
        container.item(id, ctx.tenantId).read<Policy>().then((r) => r.resource)
      )
    );
    const extraIds = new Set(policies.map((p) => p.id));
    for (const p of extra) {
      if (p && !extraIds.has(p.id)) policies.push(p);
    }
  }

  const appliedPolicies: string[] = [];
  const violatedPolicies: string[] = [];
  let finalDecision: PolicyDecisionType = "allow";
  let finalReason: string | undefined;
  const allTransforms: OutputTransform[] = [];

  const DECISION_RANK: Record<PolicyDecisionType, number> = {
    deny: 3,
    "pending-approval": 2,
    transform: 1,
    allow: 0,
  };

  for (const policy of policies) {
    if (!matchesScope(policy, ctx)) continue;

    const { matched, transforms } = evaluateSinglePolicy(policy, ctx, phase);
    if (!matched) continue;

    appliedPolicies.push(policy.id);

    // Escalate decision if this policy is more restrictive
    if (DECISION_RANK[policy.action] > DECISION_RANK[finalDecision]) {
      finalDecision = policy.action;
      finalReason = `Policy "${policy.name}" (${policy.type}) triggered`;
    }

    if (policy.action === "deny" || policy.action === "pending-approval") {
      violatedPolicies.push(policy.id);
    }

    if (transforms) allTransforms.push(...transforms);

    // Short-circuit on deny — no need to evaluate further
    if (finalDecision === "deny") break;
  }

  return {
    decision: finalDecision,
    appliedPolicies,
    violatedPolicies,
    reason: finalReason,
    transforms: allTransforms.length > 0 ? allTransforms : undefined,
  };
}

/**
 * Apply output transforms to text (redact PII / content-filter matches).
 */
export function applyTransforms(text: string, transforms: OutputTransform[]): string {
  let result = text;
  for (const t of transforms) {
    if (t.type === "redact" && t.pattern) {
      try {
        result = result.replace(new RegExp(t.pattern, "gi"), t.replacement ?? "[REDACTED]");
      } catch { /* invalid regex — skip */ }
    } else if (t.type === "truncate" && t.maxLength) {
      result = result.slice(0, t.maxLength) + (result.length > t.maxLength ? "…" : "");
    }
  }
  return result;
}
