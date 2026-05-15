export type GlobalStage = "intake" | "global-pre-flight" | "routing" | "domain-execution" | "global-post-flight" | "completed" | "failed"
export type GlobalStageStatus = "pending" | "running" | "completed" | "failed" | "blocked" | "skipped"

export interface GlobalExecutionRecord {
  id: string
  tenantId: string
  traceId: string
  currentStage: GlobalStage
  stageStatuses: Partial<Record<GlobalStage, { status: GlobalStageStatus; updatedAt: string; writer: { type: string; id: string } }>>
  selectedDomain?: string
  policyDecision?: { decision: "allow" | "deny" | "transform" | "pending-approval"; decisionId?: string; reason?: string }
  safeDomainSummary?: Record<string, unknown>
  linkDescriptors: Array<{ type: string; href: string; requiredPermission: string; state?: string; expiresAt?: string }>
  updatedAt: string
}

export interface RoutabilityItem {
  agentId: string
  name: string
  owner?: { team?: string; email?: string }
  status: "not registered" | "registration pending" | "policy pending" | "evaluation pending" | "active" | "suspended" | "rejected" | "circuit open"
  blockingGates: Array<{ gate: string; status: string; reason: string }>
  nextAction: { type: string; href?: string; label: string }
  lastUpdated?: string
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7071/api"

export async function fetchGlobalExecutions(): Promise<GlobalExecutionRecord[]> {
  const response = await fetch(`${apiBase}/global-orchestrator/executions`, { headers: devAuthHeaders(), cache: "no-store" })
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Global execution access is unavailable" : "Global execution API unavailable")
  const payload = await response.json()
  return payload.items ?? []
}

export async function fetchGlobalExecution(traceId: string): Promise<GlobalExecutionRecord | null> {
  const response = await fetch(`${apiBase}/global-orchestrator/executions/${encodeURIComponent(traceId)}`, { headers: devAuthHeaders(), cache: "no-store" })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Execution detail access is unavailable" : "Global execution detail unavailable")
  return await response.json()
}

export async function fetchRoutableAgents(): Promise<RoutabilityItem[]> {
  const params = process.env.NEXT_PUBLIC_DEV_OWNER_TEAM ? new URLSearchParams({ ownerTeam: process.env.NEXT_PUBLIC_DEV_OWNER_TEAM }) : undefined
  const response = await fetch(`${apiBase}/global-orchestrator/routability${params ? `?${params}` : ""}`, { headers: devAuthHeaders(), cache: "no-store" })
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Routability access is unavailable" : "Routability API unavailable")
  const payload = await response.json()
  return payload.items ?? []
}

export function getMockGlobalExecutions(): GlobalExecutionRecord[] { return mockExecutions }
export function getMockRoutability(): RoutabilityItem[] { return mockRoutability }

function devAuthHeaders(): HeadersInit {
  if (process.env.NEXT_PUBLIC_DEV_AUTH !== "true") return {}
  return {
    "x-marketplace-dev-tenant": process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? "contoso",
    "x-marketplace-dev-user": process.env.NEXT_PUBLIC_DEV_USER_ID ?? "operator@example.com",
    "x-marketplace-dev-roles": process.env.NEXT_PUBLIC_DEV_ROLES ?? "platform-operator,domain-author",
    "x-marketplace-dev-owner-team": process.env.NEXT_PUBLIC_DEV_OWNER_TEAM ?? "claims-platform",
  }
}

const mockExecutions: GlobalExecutionRecord[] = [
  {
    id: "contoso:trace-rcm-1001",
    tenantId: "contoso",
    traceId: "trace-rcm-1001",
    currentStage: "domain-execution",
    selectedDomain: "claims-routing",
    stageStatuses: {
      intake: { status: "completed", updatedAt: "2026-05-13T15:02:00.000Z", writer: { type: "api", id: "gateway" } },
      "global-pre-flight": { status: "completed", updatedAt: "2026-05-13T15:02:03.000Z", writer: { type: "policy", id: "pre-flight" } },
      routing: { status: "completed", updatedAt: "2026-05-13T15:02:05.000Z", writer: { type: "orchestrator", id: "router" } },
      "domain-execution": { status: "running", updatedAt: "2026-05-13T15:02:12.000Z", writer: { type: "domain", id: "claims-routing" } },
    },
    policyDecision: { decision: "allow", decisionId: "pol-1001", reason: "Required PHI controls present" },
    safeDomainSummary: { queue: "claims-routing", retryable: true },
    linkDescriptors: [{ type: "audit", href: "/audit?traceId=trace-rcm-1001", requiredPermission: "audit:preview", state: "available" }],
    updatedAt: "2026-05-13T15:02:12.000Z",
  },
  {
    id: "contoso:trace-rcm-1002",
    tenantId: "contoso",
    traceId: "trace-rcm-1002",
    currentStage: "global-pre-flight",
    selectedDomain: "prior-auth",
    stageStatuses: {
      intake: { status: "completed", updatedAt: "2026-05-13T14:48:00.000Z", writer: { type: "api", id: "gateway" } },
      "global-pre-flight": { status: "blocked", updatedAt: "2026-05-13T14:48:04.000Z", writer: { type: "policy", id: "pre-flight" } },
    },
    policyDecision: { decision: "pending-approval", decisionId: "pol-1002", reason: "Human approval required for high-risk routing" },
    linkDescriptors: [{ type: "policy", href: "/policies?decisionId=pol-1002", requiredPermission: "policy:launch", state: "available" }],
    updatedAt: "2026-05-13T14:48:04.000Z",
  },
]

const mockRoutability: RoutabilityItem[] = [
  { agentId: "claims-copilot", name: "Claims Copilot", owner: { team: "claims-platform" }, status: "active", blockingGates: [], nextAction: { type: "none", label: "No action required" }, lastUpdated: "2026-05-13T13:00:00.000Z" },
  { agentId: "prior-auth-agent", name: "Prior Auth Agent", owner: { team: "claims-platform" }, status: "policy pending", blockingGates: [{ gate: "policy", status: "pending", reason: "Required policy attachment is missing." }], nextAction: { type: "policy", href: "/policies?assetId=prior-auth-agent", label: "Attach policy" }, lastUpdated: "2026-05-13T12:30:00.000Z" },
]