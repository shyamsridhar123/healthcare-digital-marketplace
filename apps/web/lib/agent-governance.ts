// Nebula-X — Agent 365 + Azure AI Foundry governance & observability.
// Single source of truth (mock, but internally consistent) powering the
// Governance, Observability, and Analytics sections. Agent names, models,
// identities, and IDs are shared so every surface tells the same story.

export const NEBULA_TENANT = {
  name: "Deloitte (Nebula-X)",
  tenantId: "16b3c013-d300-468d-ac64-7eda0820b6d3",
  foundryProject: "nebula-x-foundry",
  trustworthyAiVersion: "Trustworthy AI™ v3.2",
}

export type GovStatus = "passed" | "review" | "failed"
export type Severity = "none" | "low" | "medium" | "high"

// ── Governed agents (Entra Agent ID) ────────────────────────────────────────
export interface GovernedAgent {
  id: string
  name: string
  serviceLine: string
  model: string
  // Entra Agent ID / Agent 365 blueprint identity
  agentId: string
  blueprintId: string
  identityStatus: "active" | "provisioning" | "suspended"
  autonomy: "assisted" | "supervised" | "autonomous"
  humanInLoop: boolean
  trustStatus: GovStatus
  foundryScore: number // 0–5 composite Foundry eval score
  safety: Severity // worst safety severity across categories
  invocations30d: number
}

export const governedAgents: GovernedAgent[] = [
  { id: "ledgersentinel", name: "LedgerSentinel", serviceLine: "Deloitte Audit", model: "Deloitte Audit LM (Claude Sonnet 4.5)", agentId: "ag-3f9a21c7", blueprintId: "bp-audit-ledger-01", identityStatus: "active", autonomy: "supervised", humanInLoop: true, trustStatus: "passed", foundryScore: 4.8, safety: "none", invocations30d: 18420 },
  { id: "auditscribe", name: "AuditScribe", serviceLine: "Deloitte Audit", model: "Claude Sonnet 4.5", agentId: "ag-8b12d4e0", blueprintId: "bp-audit-scribe-01", identityStatus: "active", autonomy: "assisted", humanInLoop: true, trustStatus: "passed", foundryScore: 4.7, safety: "none", invocations30d: 12060 },
  { id: "taxarchitect", name: "TaxArchitect", serviceLine: "Deloitte Tax", model: "GPT-5.5 + Deloitte Tax GloBE", agentId: "ag-1c77aa93", blueprintId: "bp-tax-architect-01", identityStatus: "active", autonomy: "supervised", humanInLoop: true, trustStatus: "passed", foundryScore: 4.6, safety: "low", invocations30d: 8730 },
  { id: "controltester", name: "ControlTester", serviceLine: "Deloitte Risk", model: "Deloitte Risk Regulatory LM (GPT-5.5)", agentId: "ag-55e0b218", blueprintId: "bp-risk-control-01", identityStatus: "active", autonomy: "supervised", humanInLoop: true, trustStatus: "review", foundryScore: 4.4, safety: "low", invocations30d: 15310 },
  { id: "ddvault", name: "DDVault Analyst", serviceLine: "Deloitte Deals", model: "Claude Opus 4.8", agentId: "ag-9a34ff51", blueprintId: "bp-deals-ddvault-01", identityStatus: "active", autonomy: "assisted", humanInLoop: true, trustStatus: "passed", foundryScore: 4.9, safety: "none", invocations30d: 6240 },
  { id: "threatnarrator", name: "ThreatNarrator", serviceLine: "Deloitte Cyber", model: "GPT-5.5", agentId: "ag-2d81c6b4", blueprintId: "bp-cyber-threat-01", identityStatus: "active", autonomy: "autonomous", humanInLoop: false, trustStatus: "passed", foundryScore: 4.5, safety: "medium", invocations30d: 22140 },
  { id: "carbonaccountant", name: "CarbonAccountant", serviceLine: "Deloitte ESG", model: "GPT-5.5", agentId: "ag-7e45a0d9", blueprintId: "bp-esg-carbon-01", identityStatus: "provisioning", autonomy: "assisted", humanInLoop: true, trustStatus: "review", foundryScore: 4.3, safety: "none", invocations30d: 3980 },
]

// ── Azure AI Foundry evaluations ────────────────────────────────────────────
export interface FoundryQualityMetric {
  name: "Groundedness" | "Relevance" | "Coherence" | "Fluency" | "Retrieval" | "Similarity"
  score: number // 0–5
}
export interface FoundrySafetyMetric {
  category: "Hate & Unfairness" | "Violence" | "Sexual" | "Self-Harm" | "Protected Material" | "Indirect Attack (XPIA)"
  severity: Severity
  defectRate: number // 0–1
}
export interface FoundryEvaluation {
  agentId: string
  agentName: string
  quality: FoundryQualityMetric[]
  safety: FoundrySafetyMetric[]
  gate: GovStatus
  continuous: boolean // continuous monitoring enabled
  lastRun: string
  runId: string
  dataset: string
}

export const foundryEvaluations: FoundryEvaluation[] = [
  {
    agentId: "ag-3f9a21c7", agentName: "LedgerSentinel", gate: "passed", continuous: true,
    lastRun: "2026-06-30 03:12 UTC", runId: "evalrun-af22e1", dataset: "audit-goldset-v4 (820 cases)",
    quality: [ { name: "Groundedness", score: 4.9 }, { name: "Relevance", score: 4.8 }, { name: "Coherence", score: 4.7 }, { name: "Fluency", score: 4.9 }, { name: "Retrieval", score: 4.6 } ],
    safety: [ { category: "Hate & Unfairness", severity: "none", defectRate: 0.0 }, { category: "Violence", severity: "none", defectRate: 0.0 }, { category: "Protected Material", severity: "none", defectRate: 0.002 }, { category: "Indirect Attack (XPIA)", severity: "none", defectRate: 0.004 } ],
  },
  {
    agentId: "ag-55e0b218", agentName: "ControlTester", gate: "review", continuous: true,
    lastRun: "2026-06-30 03:14 UTC", runId: "evalrun-af22e4", dataset: "sox-controls-v3 (610 cases)",
    quality: [ { name: "Groundedness", score: 4.5 }, { name: "Relevance", score: 4.6 }, { name: "Coherence", score: 4.4 }, { name: "Fluency", score: 4.7 }, { name: "Retrieval", score: 4.2 } ],
    safety: [ { category: "Hate & Unfairness", severity: "none", defectRate: 0.0 }, { category: "Protected Material", severity: "low", defectRate: 0.018 }, { category: "Indirect Attack (XPIA)", severity: "low", defectRate: 0.021 } ],
  },
  {
    agentId: "ag-2d81c6b4", agentName: "ThreatNarrator", gate: "passed", continuous: true,
    lastRun: "2026-06-30 03:10 UTC", runId: "evalrun-af22df", dataset: "cyber-triage-v2 (540 cases)",
    quality: [ { name: "Groundedness", score: 4.6 }, { name: "Relevance", score: 4.7 }, { name: "Coherence", score: 4.5 }, { name: "Fluency", score: 4.6 } ],
    safety: [ { category: "Violence", severity: "medium", defectRate: 0.031 }, { category: "Hate & Unfairness", severity: "none", defectRate: 0.001 }, { category: "Indirect Attack (XPIA)", severity: "low", defectRate: 0.012 } ],
  },
  {
    agentId: "ag-9a34ff51", agentName: "DDVault Analyst", gate: "passed", continuous: true,
    lastRun: "2026-06-30 03:16 UTC", runId: "evalrun-af22e8", dataset: "deals-dataroom-v3 (930 cases)",
    quality: [ { name: "Groundedness", score: 4.9 }, { name: "Relevance", score: 4.9 }, { name: "Coherence", score: 4.8 }, { name: "Fluency", score: 4.9 }, { name: "Retrieval", score: 4.8 } ],
    safety: [ { category: "Protected Material", severity: "none", defectRate: 0.003 }, { category: "Hate & Unfairness", severity: "none", defectRate: 0.0 } ],
  },
]

// ── Agent 365 OpenTelemetry traces (InferenceScope + Bot Framework spans) ────
export type SpanKind = "server" | "internal" | "client" | "producer"
export interface TraceSpan {
  name: string
  kind: SpanKind
  durationMs: number
  status: "ok" | "error"
  attrs?: string[]
}
export interface AgentTrace {
  traceId: string
  agentId: string
  agentName: string
  channel: "Teams" | "Webchat" | "Copilot" | "M365"
  user: string
  startedAt: string
  totalMs: number
  model: string
  inputTokens: number
  outputTokens: number
  status: "ok" | "error"
  spans: TraceSpan[]
}

export const agentTraces: AgentTrace[] = [
  {
    traceId: "0af7651916cd43dd8448eb211c80319c", agentId: "ag-3f9a21c7", agentName: "LedgerSentinel",
    channel: "Teams", user: "m.desai@…", startedAt: "12s ago", totalMs: 2860, model: "Deloitte Audit LM",
    inputTokens: 3120, outputTokens: 640, status: "ok",
    spans: [
      { name: "POST /api/messages", kind: "server", durationMs: 2860, status: "ok", attrs: ["http.status=200"] },
      { name: "POST login.microsoftonline.com (MSAL)", kind: "client", durationMs: 118, status: "ok", attrs: ["agentic auth"] },
      { name: "invoke_agent LedgerSentinel", kind: "internal", durationMs: 2510, status: "ok" },
      { name: "InferenceScope chat gpt-5.5", kind: "client", durationMs: 2180, status: "ok", attrs: ["gen_ai.usage.input_tokens=3120", "gen_ai.usage.output_tokens=640", "gen_ai.response.finish_reason=stop"] },
      { name: "POST smba.trafficmanager.net (reply)", kind: "producer", durationMs: 96, status: "ok" },
    ],
  },
  {
    traceId: "b8a1f0e2c3d44a55b6677889aabbccdd", agentId: "ag-55e0b218", agentName: "ControlTester",
    channel: "Webchat", user: "a.rivera@…", startedAt: "48s ago", totalMs: 4120, model: "Deloitte Risk Regulatory LM",
    inputTokens: 5240, outputTokens: 910, status: "ok",
    spans: [
      { name: "POST /api/messages", kind: "server", durationMs: 4120, status: "ok", attrs: ["http.status=200"] },
      { name: "MCP tool: ERP control sample", kind: "client", durationMs: 640, status: "ok" },
      { name: "invoke_agent ControlTester", kind: "internal", durationMs: 3200, status: "ok" },
      { name: "InferenceScope chat gpt-5.5", kind: "client", durationMs: 2740, status: "ok", attrs: ["gen_ai.usage.input_tokens=5240", "gen_ai.usage.output_tokens=910"] },
      { name: "Content Safety shield", kind: "internal", durationMs: 42, status: "ok", attrs: ["jailbreak=false"] },
    ],
  },
  {
    traceId: "c9b2e1f3d4e55b66c7788990bbccddee", agentId: "ag-2d81c6b4", agentName: "ThreatNarrator",
    channel: "Copilot", user: "svc-soc@…", startedAt: "1m ago", totalMs: 1980, model: "GPT-5.5",
    inputTokens: 2610, outputTokens: 430, status: "error",
    spans: [
      { name: "POST /api/messages", kind: "server", durationMs: 1980, status: "error", attrs: ["http.status=502"] },
      { name: "invoke_agent ThreatNarrator", kind: "internal", durationMs: 1640, status: "error", attrs: ["error=upstream SIEM timeout"] },
      { name: "InferenceScope chat gpt-5.5", kind: "client", durationMs: 1210, status: "ok" },
    ],
  },
]

// ── Content safety / prompt shields (Foundry + Agent 365 guardrails) ─────────
export interface SafetyEvent {
  id: string
  type: "Jailbreak attempt" | "Indirect prompt injection" | "PII detected" | "Ungrounded output" | "Protected material"
  agentName: string
  action: "blocked" | "redacted" | "flagged"
  severity: Severity
  at: string
  detail: string
}

export const safetyEvents: SafetyEvent[] = [
  { id: "se-1", type: "Indirect prompt injection", agentName: "DDVault Analyst", action: "blocked", severity: "high", at: "27 min ago", detail: "XPIA in data-room document intercepted by prompt shield before tool call." },
  { id: "se-2", type: "PII detected", agentName: "AuditScribe", action: "redacted", severity: "medium", at: "1 hr ago", detail: "Client personal data auto-redacted from workpaper draft (PII-safe policy)." },
  { id: "se-3", type: "Jailbreak attempt", agentName: "ThreatNarrator", action: "blocked", severity: "medium", at: "2 hr ago", detail: "User attempt to override system instructions rejected." },
  { id: "se-4", type: "Ungrounded output", agentName: "ControlTester", action: "flagged", severity: "low", at: "3 hr ago", detail: "Groundedness below 4.0 threshold; response held for human review." },
  { id: "se-5", type: "Protected material", agentName: "TaxArchitect", action: "flagged", severity: "low", at: "5 hr ago", detail: "Potential verbatim standards text flagged for citation review." },
]

// ── Continuous monitoring time series (14 days) ─────────────────────────────
export interface DayPoint { day: string; groundedness: number; safetyDefectRate: number; invocations: number; tokensK: number }
export const monitoringTrend: DayPoint[] = [
  { day: "Jun 17", groundedness: 4.62, safetyDefectRate: 1.9, invocations: 5120, tokensK: 8420 },
  { day: "Jun 18", groundedness: 4.65, safetyDefectRate: 1.7, invocations: 5380, tokensK: 8710 },
  { day: "Jun 19", groundedness: 4.61, safetyDefectRate: 2.1, invocations: 4990, tokensK: 8130 },
  { day: "Jun 20", groundedness: 4.68, safetyDefectRate: 1.5, invocations: 5640, tokensK: 9020 },
  { day: "Jun 21", groundedness: 4.71, safetyDefectRate: 1.3, invocations: 4210, tokensK: 6890 },
  { day: "Jun 22", groundedness: 4.66, safetyDefectRate: 1.6, invocations: 3980, tokensK: 6410 },
  { day: "Jun 23", groundedness: 4.7, safetyDefectRate: 1.4, invocations: 6010, tokensK: 9640 },
  { day: "Jun 24", groundedness: 4.73, safetyDefectRate: 1.2, invocations: 6320, tokensK: 10120 },
  { day: "Jun 25", groundedness: 4.69, safetyDefectRate: 1.5, invocations: 6110, tokensK: 9880 },
  { day: "Jun 26", groundedness: 4.75, safetyDefectRate: 1.1, invocations: 6580, tokensK: 10540 },
  { day: "Jun 27", groundedness: 4.72, safetyDefectRate: 1.3, invocations: 5230, tokensK: 8360 },
  { day: "Jun 28", groundedness: 4.77, safetyDefectRate: 1.0, invocations: 4870, tokensK: 7790 },
  { day: "Jun 29", groundedness: 4.79, safetyDefectRate: 0.9, invocations: 6740, tokensK: 10810 },
  { day: "Jun 30", groundedness: 4.81, safetyDefectRate: 0.8, invocations: 6980, tokensK: 11230 },
]

// ── Trustworthy AI framework pillars (Deloitte) ─────────────────────────────
export interface TrustPillar { name: string; score: number; controls: number; passing: number }
export const trustPillars: TrustPillar[] = [
  { name: "Fair & Impartial", score: 97, controls: 14, passing: 14 },
  { name: "Transparent & Explainable", score: 96, controls: 12, passing: 12 },
  { name: "Robust & Reliable", score: 94, controls: 18, passing: 17 },
  { name: "Private & Secure", score: 99, controls: 21, passing: 21 },
  { name: "Accountable", score: 98, controls: 11, passing: 11 },
  { name: "Responsible", score: 95, controls: 9, passing: 9 },
]

// ── Aggregate KPIs ──────────────────────────────────────────────────────────
export const govKpis = {
  governedAgents: governedAgents.length,
  entraAgentIds: governedAgents.filter((a) => a.identityStatus === "active").length,
  continuousEvals: foundryEvaluations.filter((e) => e.continuous).length,
  avgFoundryScore: 4.6,
  safetyDefectRate: 0.8, // %
  trustworthyScore: 96, // %
  guardrailBlocks30d: 1284,
  humanReviewRate: 71, // %
}
