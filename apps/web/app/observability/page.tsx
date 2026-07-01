"use client"

import { useState, useEffect, type ElementType } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { cn } from "@/lib/utils"
import {
  Activity,
  Brain,
  Bot,
  Wrench,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Circle,
  Zap,
  Timer,
  TrendingUp,
  TrendingDown,
  Fingerprint,
  Radio,
  Network,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { agentTraces, governedAgents, govKpis, NEBULA_TENANT, type AgentTrace, type TraceSpan } from "@/lib/agent-governance"
import { AiGatewayLive } from "@/components/gateway/ai-gateway-live"

// ─── Types ───────────────────────────────────────────────────────────────────

type RunStatus = "running" | "completed" | "failed" | "queued" | "idle"

interface Run {
  id: string
  name: string
  version?: string
  status: RunStatus
  startedAt: string
  duration: string | null
  requestsPerMin?: number
  errorRate?: number
  latencyMs?: number
  lastError?: string
  tags?: string[]
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const modelRuns: Run[] = [
  {
    id: "mdl-001",
    name: "LedgerSentinel",
    version: "v3.2",
    status: "running",
    startedAt: "2 min ago",
    duration: "2m 14s",
    requestsPerMin: 142,
    errorRate: 0.2,
    latencyMs: 86,
    tags: ["production", "NLP"],
  },
  {
    id: "mdl-002",
    name: "TaxArchitect",
    version: "v1.8",
    status: "running",
    startedAt: "11 min ago",
    duration: "11m 03s",
    requestsPerMin: 67,
    errorRate: 0.0,
    latencyMs: 240,
    tags: ["production", "TextGeneration"],
  },
  {
    id: "mdl-003",
    name: "EngagementRoutingTransformer",
    version: "v2.1",
    status: "completed",
    startedAt: "34 min ago",
    duration: "28m 41s",
    requestsPerMin: 0,
    errorRate: 0.0,
    latencyMs: 112,
    tags: ["batch"],
  },
  {
    id: "mdl-004",
    name: "RegulatorInsightGPT",
    version: "v0.9",
    status: "failed",
    startedAt: "1 hr ago",
    duration: "4m 12s",
    requestsPerMin: 0,
    errorRate: 100,
    latencyMs: 0,
    lastError: "OOMKilled — container exceeded 16 GB memory limit",
    tags: ["beta"],
  },
  {
    id: "mdl-005",
    name: "FraudScoringXGB",
    version: "v4.0",
    status: "queued",
    startedAt: "queued 8 min ago",
    duration: null,
    tags: ["scheduled"],
  },
  {
    id: "mdl-006",
    name: "ApprovalWorkflowPredictor",
    version: "v2.7",
    status: "idle",
    startedAt: "last run 6 hr ago",
    duration: "18m 02s",
    requestsPerMin: 0,
    errorRate: 0.0,
    latencyMs: 55,
    tags: ["production"],
  },
]

const agentRuns: Run[] = [
  {
    id: "agt-001",
    name: "Engagement Delivery Finding Agent",
    version: "v1.4",
    status: "running",
    startedAt: "5 min ago",
    duration: "5m 21s",
    requestsPerMin: 23,
    errorRate: 0.0,
    latencyMs: 1240,
    tags: ["production", "revenue-cycle"],
  },
  {
    id: "agt-002",
    name: "Prior Approval Orchestrator",
    version: "v2.0",
    status: "running",
    startedAt: "22 min ago",
    duration: "22m 07s",
    requestsPerMin: 9,
    errorRate: 1.1,
    latencyMs: 3400,
    tags: ["production", "approverization"],
  },
  {
    id: "agt-003",
    name: "AuditScribe Assistant",
    version: "v1.1",
    status: "completed",
    startedAt: "1 hr 10 min ago",
    duration: "45m 33s",
    requestsPerMin: 0,
    errorRate: 0.0,
    latencyMs: 980,
    tags: ["batch"],
  },
  {
    id: "agt-004",
    name: "Compliance Verification Bot",
    version: "v3.2",
    status: "failed",
    startedAt: "2 hr ago",
    duration: "1m 45s",
    requestsPerMin: 0,
    errorRate: 100,
    lastError: "Upstream counterparty API returned 503 — connection timeout after 3 retries",
    tags: ["production"],
  },
  {
    id: "agt-005",
    name: "Audit Trail Summarizer",
    version: "v1.0",
    status: "queued",
    startedAt: "queued 2 min ago",
    duration: null,
    tags: ["scheduled"],
  },
]

const mcpRuns: Run[] = [
  {
    id: "mcp-001",
    name: "ERP Data MCP Server",
    status: "running",
    startedAt: "3 hr 14 min ago",
    duration: "3h 14m",
    requestsPerMin: 204,
    errorRate: 0.3,
    latencyMs: 18,
    tags: ["core", "erp"],
  },
  {
    id: "mcp-002",
    name: "GL DB MCP Server",
    status: "running",
    startedAt: "3 hr 14 min ago",
    duration: "3h 14m",
    requestsPerMin: 88,
    errorRate: 0.0,
    latencyMs: 12,
    tags: ["core", "transactions"],
  },
  {
    id: "mcp-003",
    name: "Regulator File MCP Gateway",
    status: "running",
    startedAt: "47 min ago",
    duration: "47m 02s",
    requestsPerMin: 31,
    errorRate: 0.0,
    latencyMs: 44,
    tags: ["integration"],
  },
  {
    id: "mcp-004",
    name: "Document Intelligence MCP",
    status: "failed",
    startedAt: "18 min ago",
    duration: "3m 11s",
    requestsPerMin: 0,
    errorRate: 100,
    lastError: "Azure Document Intelligence quota exceeded — retry in 2 min",
    tags: ["azure-ai"],
  },
  {
    id: "mcp-005",
    name: "Engagement Billing Code Lookup MCP",
    status: "idle",
    startedAt: "last run 30 min ago",
    duration: "12m 40s",
    requestsPerMin: 0,
    errorRate: 0.0,
    latencyMs: 6,
    tags: ["core"],
  },
]

const toolRuns: Run[] = [
  {
    id: "tl-001",
    name: "IFRS/GAAP Code Validator",
    status: "running",
    startedAt: "ongoing",
    duration: "continuous",
    requestsPerMin: 512,
    errorRate: 0.1,
    latencyMs: 3,
    tags: ["utility", "inline"],
  },
  {
    id: "tl-002",
    name: "Remittance Parser",
    status: "running",
    startedAt: "12 min ago",
    duration: "12m 05s",
    requestsPerMin: 77,
    errorRate: 0.0,
    latencyMs: 9,
    tags: ["batch"],
  },
  {
    id: "tl-003",
    name: "XBRL Converter",
    status: "completed",
    startedAt: "1 hr ago",
    duration: "32m 18s",
    requestsPerMin: 0,
    errorRate: 0.0,
    latencyMs: 21,
    tags: ["integration"],
  },
  {
    id: "tl-004",
    name: "Compliance Evidence Parser",
    status: "completed",
    startedAt: "2 hr ago",
    duration: "8m 44s",
    requestsPerMin: 0,
    errorRate: 0.0,
    latencyMs: 14,
    tags: ["edi"],
  },
  {
    id: "tl-005",
    name: "Duplicate Transaction Detector",
    status: "queued",
    startedAt: "queued 4 min ago",
    duration: null,
    tags: ["scheduled"],
  },
  {
    id: "tl-006",
    name: "Engagement ID Registry Lookup",
    status: "idle",
    startedAt: "last run 45 min ago",
    duration: "0m 02s",
    requestsPerMin: 0,
    errorRate: 0.0,
    latencyMs: 2,
    tags: ["utility"],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<RunStatus, { label: string; color: string; dot: string; Icon: ElementType }> = {
  running: {
    label: "Running",
    color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    dot: "bg-emerald-400",
    Icon: Loader2,
  },
  completed: {
    label: "Completed",
    color: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    dot: "bg-sky-400",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "bg-red-500/15 text-red-400 border border-red-500/30",
    dot: "bg-red-400",
    Icon: XCircle,
  },
  queued: {
    label: "Queued",
    color: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    dot: "bg-amber-400",
    Icon: Clock,
  },
  idle: {
    label: "Idle",
    color: "bg-secondary text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    Icon: Circle,
  },
}

function StatusPill({ status }: { status: RunStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.Icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", meta.color)}>
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {meta.label}
    </span>
  )
}

function Metric({ label, value, sub, trend }: { label: string; value: string | number; sub?: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {value}
        {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-400" />}
        {trend === "down" && <TrendingDown className="h-3 w-3 text-red-400" />}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

function traceShortId(traceId: string) {
  return `${traceId.slice(0, 8)}…${traceId.slice(-4)}`
}

function statusClasses(status: "ok" | "error") {
  return status === "ok"
    ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
    : "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]"
}

function identityStatusClasses(status: string) {
  if (status === "active") return "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
  if (status === "provisioning") return "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]"
  return "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]"
}

function Agent365Kpi({ label, value, sub, Icon }: { label: string; value: string | number; sub: string; Icon: ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function SpanWaterfall({ span, totalMs }: { span: TraceSpan; totalMs: number; key?: string }) {
  const width = Math.max(8, Math.min(100, (span.durationMs / totalMs) * 100))

  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_88px_minmax(120px,1fr)_72px] items-center gap-3 text-xs">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{span.name}</p>
        {span.attrs && span.attrs.length > 0 && (
          <p className="truncate text-muted-foreground">{span.attrs.join(" · ")}</p>
        )}
      </div>
      <span className="w-fit rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {span.kind}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", span.status === "ok" ? "bg-[var(--primary)]" : "bg-[var(--destructive)]")}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex items-center justify-end gap-2 font-mono text-muted-foreground">
        <span>{formatLatency(span.durationMs)}</span>
        <span className={cn("h-2 w-2 rounded-full", span.status === "ok" ? "bg-[var(--success)]" : "bg-[var(--destructive)]")} />
      </div>
    </div>
  )
}

function TraceCard({ trace }: { trace: AgentTrace; key?: string }) {
  const [expanded, setExpanded] = useState(true)
  const isError = trace.status === "error"

  return (
    <div className={cn("rounded-lg border bg-card", isError ? "border-[var(--destructive)]/40" : "border-border")}>
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/20"
      >
        <div className="flex min-w-0 items-start gap-3">
          <ChevronRight className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{trace.agentName}</p>
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", statusClasses(trace.status))}>
                {trace.status === "ok" ? "OK" : "Error"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{traceShortId(trace.traceId)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {trace.startedAt} · {trace.channel} · {trace.agentId}
            </p>
          </div>
        </div>
        <div className={cn("text-right font-mono text-sm", isError ? "text-[var(--destructive)]" : "text-foreground")}>
          {formatLatency(trace.totalMs)}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <div className="space-y-2">
            {trace.spans.map((span) => (
              <SpanWaterfall key={`${trace.traceId}-${span.name}`} span={span} totalMs={trace.totalMs} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate">{trace.model}</span>
            <span className="font-mono">
              gen_ai tokens in/out: {formatNumber(trace.inputTokens)} / {formatNumber(trace.outputTokens)}
            </span>
            <span>{trace.channel} · {trace.user}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function RunRow({ run }: { run: Run; key?: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        onClick={() => run.lastError && setExpanded((p) => !p)}
        className={cn(
          "border-b border-border/60 transition-colors",
          run.lastError ? "cursor-pointer hover:bg-secondary/30" : "hover:bg-secondary/20"
        )}
      >
        {/* Name */}
        <td className="py-3 pl-4 pr-2">
          <div className="flex items-start gap-2">
            {run.lastError && (
              <ChevronRight
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                  expanded && "rotate-90"
                )}
              />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{run.name}</p>
              {run.version && <p className="text-xs text-muted-foreground">{run.version}</p>}
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <StatusPill status={run.status} />
        </td>

        {/* Started */}
        <td className="px-3 py-3 text-xs text-muted-foreground">{run.startedAt}</td>

        {/* Duration */}
        <td className="px-3 py-3 text-xs text-muted-foreground font-mono">
          {run.duration ?? <span className="text-muted-foreground/40">—</span>}
        </td>

        {/* req/min */}
        <td className="px-3 py-3 text-xs font-mono text-foreground">
          {run.requestsPerMin != null ? (
            <span className={cn(run.status === "running" && run.requestsPerMin > 0 ? "text-emerald-400" : "text-muted-foreground")}>
              {run.requestsPerMin}
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>

        {/* Error rate */}
        <td className="px-3 py-3 text-xs font-mono">
          {run.errorRate != null ? (
            <span className={cn(run.errorRate > 0 ? "text-red-400" : "text-emerald-400")}>
              {run.errorRate}%
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>

        {/* Latency */}
        <td className="px-3 py-3 pr-4 text-xs font-mono text-muted-foreground">
          {run.latencyMs != null && run.latencyMs > 0 ? (
            <span className={cn(run.latencyMs > 2000 ? "text-amber-400" : "text-foreground")}>
              {run.latencyMs >= 1000 ? `${(run.latencyMs / 1000).toFixed(1)}s` : `${run.latencyMs}ms`}
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>
      </tr>

      {/* Expanded error row */}
      {expanded && run.lastError && (
        <tr className="border-b border-border/60 bg-red-500/5">
          <td colSpan={7} className="px-4 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{run.lastError}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Tab data ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "models", label: "Models", icon: Brain, data: modelRuns },
  { id: "agents", label: "Agents", icon: Bot, data: agentRuns },
  { id: "mcp", label: "MCP Servers", icon: Server, data: mcpRuns },
  { id: "tools", label: "Tools", icon: Wrench, data: toolRuns },
] as const

type TabId = (typeof TABS)[number]["id"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObservabilityPage() {
  const [activeTab, setActiveTab] = useState<TabId>("models")
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [ticking, setTicking] = useState(0)

  // Simulate live clock tick every 15 s
  useEffect(() => {
    const t = setInterval(() => setTicking((n) => n + 1), 15_000)
    return () => clearInterval(t)
  }, [])

  const allRuns = [...modelRuns, ...agentRuns, ...mcpRuns, ...toolRuns]
  const totalRunning = allRuns.filter((r) => r.status === "running").length
  const totalFailed = allRuns.filter((r) => r.status === "failed").length
  const totalQueued = allRuns.filter((r) => r.status === "queued").length
  const totalCompleted = allRuns.filter((r) => r.status === "completed").length

  const currentTab = TABS.find((t) => t.id === activeTab)!
  const rows = currentTab.data

  const tabRunning = rows.filter((r) => r.status === "running").length
  const tabFailed = rows.filter((r) => r.status === "failed").length
  const totalInvocations30d = governedAgents.reduce((sum, agent) => sum + agent.invocations30d, 0)
  const avgTraceLatencyMs = agentTraces.length
    ? agentTraces.reduce((sum, trace) => sum + trace.totalMs, 0) / agentTraces.length
    : 0

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="app-shell-offset p-6">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Activity className="h-6 w-6 text-[var(--accent)]" />
              Observability
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Live run status for models, agents, MCP servers, and tools
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLastRefresh(new Date())}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* LIVE AI Gateway telemetry (real — not mock) */}
        <AiGatewayLive />

        {/* Agent 365 OpenTelemetry header */}
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                <Radio className="h-3.5 w-3.5" />
                Agent 365 · OpenTelemetry
              </div>
              <h2 className="mt-3 text-lg font-semibold text-foreground">Microsoft Agent 365 observability</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Distributed tracing for {NEBULA_TENANT.name} agents in Azure AI Foundry project <span className="font-mono text-foreground">{NEBULA_TENANT.foundryProject}</span>.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
              Tenant <span className="font-mono text-foreground">{NEBULA_TENANT.tenantId}</span>
            </div>
          </div>
        </section>

        {/* Agent 365 KPI strip */}
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Agent365Kpi label="Governed agents" value={govKpis.governedAgents} sub="Agent 365 blueprints under policy" Icon={Bot} />
          <Agent365Kpi label="Active Entra Agent IDs" value={govKpis.entraAgentIds} sub="Live workload identities" Icon={Fingerprint} />
          <Agent365Kpi label="30d invocations" value={formatNumber(totalInvocations30d)} sub="Summed from governed agents" Icon={Zap} />
          <Agent365Kpi label="Avg latency" value={formatLatency(avgTraceLatencyMs)} sub="Current OpenTelemetry traces" Icon={Timer} />
        </section>

        {/* Agent 365 distributed traces and identities */}
        <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Network className="h-4 w-4 text-[var(--primary)]" />
                  Agent 365 Distributed Traces
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">InferenceScope, Bot Framework, MCP, and channel spans from the shared governance stream.</p>
              </div>
              <span className="rounded-full border border-border bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground">
                {agentTraces.length} traces
              </span>
            </div>
            <div className="space-y-3">
              {agentTraces.map((trace) => (
                <TraceCard key={trace.traceId} trace={trace} />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Fingerprint className="h-4 w-4 text-[var(--primary)]" />
                Live agent identities
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Entra Agent IDs mapped to governed blueprints.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-3 py-3">Agent ID</th>
                    <th className="px-3 py-3">Model</th>
                    <th className="px-3 py-3">Autonomy</th>
                    <th className="px-3 py-3">30d</th>
                    <th className="px-3 py-3 pr-4">Identity</th>
                  </tr>
                </thead>
                <tbody>
                  {governedAgents.map((agent) => (
                    <tr key={agent.agentId} className="border-b border-border/60 text-xs last:border-0 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{agent.name}</p>
                        <p className="text-muted-foreground">{agent.blueprintId}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-muted-foreground">{agent.agentId}</td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-muted-foreground">{agent.model}</td>
                      <td className="px-3 py-3 capitalize text-muted-foreground">{agent.autonomy}</td>
                      <td className="px-3 py-3 font-mono text-foreground">{formatNumber(agent.invocations30d)}</td>
                      <td className="px-3 py-3 pr-4">
                        <span className={cn("rounded-full border px-2 py-0.5 font-medium capitalize", identityStatusClasses(agent.identityStatus))}>
                          {agent.identityStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Summary banner */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            {
              label: "Running",
              value: totalRunning,
              icon: Loader2,
              color:
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
              iconSpin: true,
            },
            {
              label: "Completed",
              value: totalCompleted,
              icon: CheckCircle2,
              color: "border-sky-500/30 bg-sky-500/10 text-sky-400",
            },
            {
              label: "Failed",
              value: totalFailed,
              icon: XCircle,
              color: "border-red-500/30 bg-red-500/10 text-red-400",
            },
            {
              label: "Queued",
              value: totalQueued,
              icon: Clock,
              color: "border-amber-500/30 bg-amber-500/10 text-amber-400",
            },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className={cn(
                  "flex items-center gap-4 rounded-xl border p-4",
                  s.color
                )}
              >
                <Icon
                  className={cn(
                    "h-8 w-8 shrink-0 opacity-70",
                    (s as {iconSpin?: boolean}).iconSpin && "animate-spin"
                  )}
                />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs opacity-80">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tab bar */}
        <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const running = tab.data.filter((r) => r.status === "running").length
            const failed = tab.data.filter((r) => r.status === "failed").length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className="flex items-center gap-1">
                  {running > 0 && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                      {running}
                    </span>
                  )}
                  {failed > 0 && (
                    <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                      {failed}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab sub-header */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-foreground">{rows.length} {currentTab.label}</span>
            {tabRunning > 0 && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {tabRunning} active
              </span>
            )}
            {tabFailed > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                {tabFailed} failed
              </span>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
            />
            Live Â· refreshed {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pl-4 pr-2">Name</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Started</th>
                <th className="px-3 py-3">Duration</th>
                <th className="px-3 py-3">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Req/min
                  </span>
                </th>
                <th className="px-3 py-3">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Error %
                  </span>
                </th>
                <th className="px-3 py-3 pr-4">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    Latency
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Click a failed row to expand the error detail. Data refreshes every 15 s.
        </p>
      </main>
    </div>
  )
}
