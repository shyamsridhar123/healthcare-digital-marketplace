import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";
import { AuthError, getAuthorizationContext, verifyConfiguredBearerToken } from "../../lib/auth/context.js";
import { createPolicyLaunchContext } from "../../lib/policy/launch-context.js";
import { evaluatePolicies } from "../../lib/policy/engine.js";
import type { PolicyContext } from "../../lib/policy/engine.js";

// ── Schemas ───────────────────────────────────────────────────────────────────

const PolicyRuleSchema = z.object({
  // rate-limit
  maxCalls: z.number().int().positive().optional(),
  timeWindowSeconds: z.number().int().positive().optional(),
  // model-allowlist
  allowedModels: z.array(z.string()).optional(),
  // content-filter
  patterns: z.array(z.string()).optional(),
  // data-access
  allowedSources: z.array(z.string()).optional(),
  // compliance
  detectPii: z.boolean().optional(),
  piiTypes: z.array(z.string()).optional(),
  // cost-budget
  maxTokens: z.number().int().positive().optional(),
  // human-gate
  approvalMessage: z.string().optional(),
  // custom
  expression: z.string().optional(),
});

const PolicyScopeSchema = z.object({
  target: z.enum(["all", "agent", "mcp-server", "model", "data-source"]),
  resourceId: z.string().optional(),
});

const CreatePolicySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  type: z.enum(["rate-limit", "model-allowlist", "content-filter", "data-access", "compliance", "cost-budget", "human-gate", "custom"]),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  scope: PolicyScopeSchema,
  rules: z.array(PolicyRuleSchema).min(1),
  action: z.enum(["allow", "deny", "transform", "pending-approval"]),
  tenantId: z.string().min(1),
});

const PolicyLaunchContextSchema = z.object({
  tenantId: z.string().min(1).optional(),
  concern: z.enum(['global-routing', 'global-pre-flight', 'global-post-flight', 'channel-hitl', 'tenant', 'domain', 'asset']),
  scope: z.union([
    z.object({ target: z.literal('tenant') }),
    z.object({ target: z.literal('domain'), domainId: z.string().min(1) }),
    z.object({ target: z.literal('asset'), assetId: z.string().min(1), domainId: z.string().min(1).optional() }),
  ]),
  source: z.object({
    traceId: z.string().min(1).optional(),
    decisionId: z.string().min(1).optional(),
    gate: z.string().min(1).optional(),
  }).optional(),
  returnTo: z.string().min(1),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

async function createPolicy(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  let body: unknown;
  try { body = await req.json(); } catch { return { status: 400, jsonBody: { error: "Invalid JSON" } }; }

  const parsed = CreatePolicySchema.safeParse(body);
  if (!parsed.success) return { status: 422, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };

  const now = new Date().toISOString();
  const policy = {
    id: uuidv4(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  const container = await getContainer(CONTAINERS.POLICIES);
  await container.items.create(policy);
  return { status: 201, jsonBody: policy };
}

async function listPolicies(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId") ?? "default";
  const type = url.searchParams.get("type");
  const enabled = url.searchParams.get("enabled");
  const scopeTarget = url.searchParams.get("scopeTarget");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50")));

  const container = await getContainer(CONTAINERS.POLICIES);
  const { resources } = await container.items.query<any>({
    query: "SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.priority DESC",
    parameters: [{ name: "@tenantId", value: tenantId }],
  }).fetchAll();

  let items = resources ?? [];
  if (type) items = items.filter((p: any) => p.type === type);
  if (enabled !== null && enabled !== "") items = items.filter((p: any) => p.enabled === (enabled === "true"));
  if (scopeTarget) items = items.filter((p: any) => p.scope?.target === scopeTarget);

  const total = items.length;
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  return { status: 200, jsonBody: { items: paged, total, page, pageSize } };
}

async function getPolicy(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.POLICIES);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Policy not found" } };
  return { status: 200, jsonBody: resource };
}

async function updatePolicy(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  let body: any;
  try { body = await req.json(); } catch { return { status: 400, jsonBody: { error: "Invalid JSON" } }; }

  const container = await getContainer(CONTAINERS.POLICIES);
  const tenantId = body.tenantId ?? new URL(req.url).searchParams.get("tenantId") ?? "default";
  const { resource: existing } = await container.item(id, tenantId).read<any>();
  if (!existing) return { status: 404, jsonBody: { error: "Policy not found" } };

  const updated = { ...existing, ...body, id, tenantId: existing.tenantId, updatedAt: new Date().toISOString() };
  await container.items.upsert(updated);
  return { status: 200, jsonBody: updated };
}

async function deletePolicy(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.POLICIES);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Policy not found" } };
  await container.item(id, tenantId).delete();
  return { status: 204 };
}

async function togglePolicy(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const enabled = req.url.includes("/enable");
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.POLICIES);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Policy not found" } };
  const updated = { ...resource, enabled, updatedAt: new Date().toISOString() };
  await container.items.upsert(updated);
  return { status: 200, jsonBody: updated };
}

async function evaluatePolicy(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  let body: any;
  try { body = await req.json(); } catch { return { status: 400, jsonBody: { error: "Invalid JSON" } }; }

  const { context, phase = "pre", additionalPolicyIds = [] } = body as {
    context: PolicyContext;
    phase: "pre" | "post";
    additionalPolicyIds: string[];
  };

  if (!context?.tenantId) return { status: 422, jsonBody: { error: "context.tenantId is required" } };

  const decision = await evaluatePolicies(context, phase, additionalPolicyIds);
  return { status: 200, jsonBody: decision };
}

async function getPolicySummary(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.POLICIES);
  const { resources } = await container.items.query<any>({
    query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
    parameters: [{ name: "@tenantId", value: tenantId }],
  }).fetchAll();

  const all = resources ?? [];
  const byType: Record<string, number> = {};
  let enabledCount = 0;

  for (const p of all) {
    byType[p.type] = (byType[p.type] ?? 0) + 1;
    if (p.enabled) enabledCount++;
  }

  return {
    status: 200,
    jsonBody: {
      totalPolicies: all.length,
      enabledCount,
      disabledCount: all.length - enabledCount,
      byType,
    },
  };
}

async function createPolicyLaunch(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await getAuthorizationContext(req, {
      allowLocalDevFallback: process.env.UAP_AUTH_LOCAL_DEV_BYPASS === 'true'
        && process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development',
      verifyBearerToken: verifyConfiguredBearerToken,
    });
    const parsed = PolicyLaunchContextSchema.safeParse(await req.json());
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
    }

    const launchContext = createPolicyLaunchContext({ auth, ...parsed.data });
    return { status: 200, jsonBody: launchContext };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.status, jsonBody: { error: err.message } };
    if (err instanceof Error && /permission|tenant|return/i.test(err.message)) {
      return { status: 403, jsonBody: { error: err.message } };
    }
    ctx.error('createPolicyLaunch error:', err);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

app.http("createPolicy", { methods: ["POST"], authLevel: "anonymous", route: "policies", handler: createPolicy });
app.http("listPolicies", { methods: ["GET"], authLevel: "anonymous", route: "policies", handler: listPolicies });
app.http("getPolicySummary", { methods: ["GET"], authLevel: "anonymous", route: "policies/summary", handler: getPolicySummary });
app.http("createPolicyLaunch", { methods: ["POST"], authLevel: "anonymous", route: "policies/launch-context", handler: createPolicyLaunch });
app.http("evaluatePolicyEndpoint", { methods: ["POST"], authLevel: "anonymous", route: "policies/evaluate", handler: evaluatePolicy });
app.http("getPolicy", { methods: ["GET"], authLevel: "anonymous", route: "policies/{id}", handler: getPolicy });
app.http("updatePolicy", { methods: ["PATCH"], authLevel: "anonymous", route: "policies/{id}", handler: updatePolicy });
app.http("deletePolicy", { methods: ["DELETE"], authLevel: "anonymous", route: "policies/{id}", handler: deletePolicy });
app.http("enablePolicy", { methods: ["POST"], authLevel: "anonymous", route: "policies/{id}/enable", handler: togglePolicy });
app.http("disablePolicy", { methods: ["POST"], authLevel: "anonymous", route: "policies/{id}/disable", handler: togglePolicy });
