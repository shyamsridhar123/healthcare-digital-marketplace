"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { AiGatewayLive } from "@/components/gateway/ai-gateway-live"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Users,
  Activity,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Filter,
  Fingerprint,
  ShieldCheck,
  Gauge,
  Bot,
  ScrollText,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NEBULA_TENANT,
  governedAgents,
  foundryEvaluations,
  safetyEvents,
  trustPillars,
  govKpis,
} from "@/lib/agent-governance"

interface ApprovalRequest {
  id: string
  title: string
  type: "deployment" | "asset" | "policy-change"
  requester: string
  requestedAt: string
  status: "pending" | "approved" | "rejected"
  environment: string
  riskLevel: "low" | "medium" | "high"
}

interface AuditLog {
  id: string
  action: string
  actor: string
  target: string
  timestamp: string
  details: string
}

interface Policy {
  id: string
  name: string
  description: string
  status: "active" | "draft" | "disabled"
  scope: string
  lastModified: string
}

const approvalRequests: ApprovalRequest[] = [
  {
    id: "apr-1",
    title: "Promote LedgerSentinel v3.2 to autonomous execution",
    type: "deployment",
    requester: "Maya Desai",
    requestedAt: "2 hours ago",
    status: "pending",
    environment: "production",
    riskLevel: "medium",
  },
  {
    id: "apr-2",
    title: "Register Entra Agent ID for CarbonAccountant",
    type: "asset",
    requester: "Jordan Lee",
    requestedAt: "5 hours ago",
    status: "pending",
    environment: "all",
    riskLevel: "high",
  },
  {
    id: "apr-3",
    title: "Approve GPT-5.5 for Deloitte Tax engagements",
    type: "policy-change",
    requester: "Alex Rivera",
    requestedAt: "1 day ago",
    status: "approved",
    environment: "production",
    riskLevel: "low",
  },
  {
    id: "apr-4",
    title: "Override ControlTester eval gate (groundedness 4.4)",
    type: "policy-change",
    requester: "Priya Nair",
    requestedAt: "2 days ago",
    status: "rejected",
    environment: "staging",
    riskLevel: "medium",
  },
]

const auditLogs: AuditLog[] = [
  {
    id: "log-1",
    action: "Entra Agent ID Provisioned",
    actor: "Agent 365",
    target: "DDVault Analyst (ag-9a34ff51)",
    timestamp: "2026-06-30 14:32:15",
    details: "Blueprint bp-deals-ddvault-01 activated with agentic auth",
  },
  {
    id: "log-2",
    action: "Foundry Eval Passed",
    actor: "AI Foundry",
    target: "LedgerSentinel · evalrun-af22e1",
    timestamp: "2026-06-30 03:12 UTC",
    details: "Groundedness 4.9, safety defect rate 0.2% — gate passed",
  },
  {
    id: "log-3",
    action: "Content Safety Block",
    actor: "Prompt Shield",
    target: "DDVault Analyst",
    timestamp: "2026-06-30 13:41:08",
    details: "Indirect prompt injection (XPIA) in data-room doc blocked",
  },
  {
    id: "log-4",
    action: "Human Review Completed",
    actor: "Sarah Chen",
    target: "AuditScribe workpaper draft",
    timestamp: "2026-06-30 12:05:00",
    details: "Human-in-the-loop checkpoint approved before workpaper write",
  },
  {
    id: "log-5",
    action: "Blueprint Updated",
    actor: "Mike Johnson",
    target: "TaxArchitect (bp-tax-architect-01)",
    timestamp: "2026-06-29 16:22:18",
    details: "Model rebased to GPT-5.5 + Deloitte Tax GloBE",
  },
]

const policies: Policy[] = [
  {
    id: "pol-1",
    name: "Trustworthy AI Evaluation Gate",
    description: "Block promotion unless Foundry groundedness ≥ 4.0 and no medium+ safety defects",
    status: "active",
    scope: "All Agents",
    lastModified: "2026-06-20",
  },
  {
    id: "pol-2",
    name: "Human-in-the-Loop Required",
    description: "Autonomous agents must route high-impact actions through a human reviewer",
    status: "active",
    scope: "Production Environment",
    lastModified: "2026-06-15",
  },
  {
    id: "pol-3",
    name: "Entra Agent ID Required",
    description: "Every deployed agent must hold a provisioned Entra Agent Identity",
    status: "active",
    scope: "All Environments",
    lastModified: "2026-06-10",
  },
  {
    id: "pol-4",
    name: "Content Safety & Prompt Shields",
    description: "Enforce jailbreak/XPIA shields and PII redaction on all agent I/O",
    status: "active",
    scope: "All Agents",
    lastModified: "2026-06-05",
  },
  {
    id: "pol-5",
    name: "Engagement Data Residency",
    description: "Restrict engagement-confidential processing to approved regions",
    status: "draft",
    scope: "Production Environment",
    lastModified: "2026-06-01",
  },
]

const riskColors = {
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  draft: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  disabled: "bg-muted text-muted-foreground border-border",
}

export default function GovernancePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("approvals")

  const pendingCount = approvalRequests.filter((r) => r.status === "pending").length

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <main className="app-shell-offset px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Governance</h1>
            <Badge variant="outline" className="border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]">
              Agent 365 · AI Foundry
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {NEBULA_TENANT.trustworthyAiVersion} — Entra Agent identities, Foundry evaluation gates, content safety, and audit trail
          </p>
        </div>

        {/* LIVE AI Gateway telemetry (real — not mock) */}
        <AiGatewayLive />

        {/* Overview Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Governed Agents
              </CardTitle>
              <Bot className="h-4 w-4 text-[var(--primary)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{govKpis.governedAgents}</div>
              <p className="text-xs text-muted-foreground">{govKpis.entraAgentIds} active Entra Agent IDs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Foundry Score
              </CardTitle>
              <Gauge className="h-4 w-4 text-[var(--primary)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{govKpis.avgFoundryScore.toFixed(1)}<span className="text-sm text-muted-foreground">/5</span></div>
              <p className="text-xs text-muted-foreground">{govKpis.continuousEvals} agents on continuous eval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Guardrail Blocks (30d)
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{govKpis.guardrailBlocks30d.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{govKpis.safetyDefectRate}% safety defect rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trustworthy AI Score
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--primary)]">{govKpis.trustworthyScore}%</div>
              <p className="text-xs text-muted-foreground">{govKpis.humanReviewRate}% human-review coverage</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="approvals" className="gap-2">
                <Clock className="h-4 w-4" />
                Approvals
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="policies" className="gap-2">
                <Shield className="h-4 w-4" />
                Policies
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <FileText className="h-4 w-4" />
                Audit Log
              </TabsTrigger>
              <TabsTrigger value="identity" className="gap-2">
                <Fingerprint className="h-4 w-4" />
                Agent Identity
              </TabsTrigger>
              <TabsTrigger value="evals" className="gap-2">
                <Gauge className="h-4 w-4" />
                Foundry Evals
              </TabsTrigger>
              <TabsTrigger value="safety" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Content Safety
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 bg-secondary"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="approvals" className="mt-0">
            <div className="rounded-lg border border-border">
              {approvalRequests.map((request, index) => (
                <div
                  key={request.id}
                  className={`flex items-center justify-between p-4 ${
                    index !== approvalRequests.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      {request.type === "deployment" && <Activity className="h-5 w-5 text-accent" />}
                      {request.type === "asset" && <Shield className="h-5 w-5 text-green-500" />}
                      {request.type === "policy-change" && <FileText className="h-5 w-5 text-yellow-500" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{request.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{request.requester}</span>
                        <span>·</span>
                        <span>{request.requestedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={riskColors[request.riskLevel]}>
                      {request.riskLevel} risk
                    </Badge>
                    <Badge variant="outline" className={statusColors[request.status]}>
                      {request.status}
                    </Badge>

                    {request.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:bg-green-500/10">
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="mt-0">
            <div className="rounded-lg border border-border">
              {policies.map((policy, index) => (
                <div
                  key={policy.id}
                  className={`flex items-center justify-between p-4 ${
                    index !== policies.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Shield className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{policy.name}</p>
                      <p className="text-sm text-muted-foreground">{policy.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{policy.scope}</span>
                    <Badge variant="outline" className={statusColors[policy.status]}>
                      {policy.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Policy</DropdownMenuItem>
                        <DropdownMenuItem>View History</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        {policy.status === "active" ? (
                          <DropdownMenuItem className="text-destructive">Disable</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem>Enable</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button className="gap-2">
                <Shield className="h-4 w-4" />
                Create Policy
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-12 gap-4 border-b border-border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Action</div>
                <div className="col-span-2">Actor</div>
                <div className="col-span-3">Target</div>
                <div className="col-span-2">Timestamp</div>
                <div className="col-span-2">Details</div>
              </div>

              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-12 gap-4 items-center border-b border-border px-4 py-3 last:border-0 text-sm"
                >
                  <div className="col-span-3">
                    <span className="font-medium text-foreground">{log.action}</span>
                  </div>
                  <div className="col-span-2 text-muted-foreground">{log.actor}</div>
                  <div className="col-span-3 text-muted-foreground">{log.target}</div>
                  <div className="col-span-2 text-muted-foreground font-mono text-xs">
                    {log.timestamp}
                  </div>
                  <div className="col-span-2 text-muted-foreground truncate">{log.details}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing 5 of 127 events</p>
              <Button variant="outline" size="sm">
                Load More
              </Button>
            </div>
          </TabsContent>

          {/* Agent Identity — Entra Agent ID registry */}
          <TabsContent value="identity" className="mt-0">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Fingerprint className="h-4 w-4 text-[var(--primary)]" />
              Every agent runs under a provisioned <span className="font-medium text-foreground">Microsoft Entra Agent Identity</span> with agentic auth and conditional access.
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-12 gap-4 border-b border-border bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
                <div className="col-span-3">Agent</div>
                <div className="col-span-3">Agent ID / Blueprint</div>
                <div className="col-span-2">Model</div>
                <div className="col-span-2">Autonomy</div>
                <div className="col-span-2">Identity</div>
              </div>
              {governedAgents.map((a) => (
                <div key={a.id} className="grid grid-cols-12 items-center gap-4 border-b border-border px-4 py-3 text-sm last:border-b-0">
                  <div className="col-span-3">
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.serviceLine}</p>
                  </div>
                  <div className="col-span-3 font-mono text-xs text-muted-foreground">
                    <p className="text-foreground">{a.agentId}</p>
                    <p>{a.blueprintId}</p>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">{a.model}</div>
                  <div className="col-span-2">
                    <Badge variant="outline" className="capitalize">
                      {a.autonomy}
                    </Badge>
                    {a.humanInLoop && (
                      <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-[var(--primary)]">
                        <Users className="h-3 w-3" /> HITL
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Badge
                      variant="outline"
                      className={
                        a.identityStatus === "active"
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                      }
                    >
                      {a.identityStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Foundry Evals — evaluation gates */}
          <TabsContent value="evals" className="mt-0">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4 text-[var(--primary)]" />
              <span className="font-medium text-foreground">Azure AI Foundry</span> continuous evaluation — quality and safety gates run on every promotion.
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {foundryEvaluations.map((ev) => (
                <Card key={ev.agentId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{ev.agentName}</CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          ev.gate === "passed"
                            ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]"
                            : ev.gate === "review"
                            ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                            : "border-red-500/20 bg-red-500/10 text-red-500"
                        }
                      >
                        {ev.gate === "passed" ? "Gate passed" : ev.gate === "review" ? "In review" : "Gate failed"}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {ev.runId} · {ev.dataset} · {ev.lastRun}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {ev.quality.map((q) => (
                        <div key={q.name} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-xs text-muted-foreground">{q.name}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-[var(--primary)]"
                              style={{ width: `${(q.score / 5) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right text-xs font-medium text-foreground">{q.score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                      {ev.safety.map((s) => (
                        <Badge
                          key={s.category}
                          variant="outline"
                          className={
                            s.severity === "none"
                              ? "border-[var(--primary)]/25 text-muted-foreground"
                              : s.severity === "low"
                              ? "border-yellow-500/25 text-yellow-500"
                              : "border-red-500/25 text-red-500"
                          }
                        >
                          {s.category}: {(s.defectRate * 100).toFixed(1)}%
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3 text-[var(--primary)]" />
                      {ev.continuous ? "Continuous monitoring enabled" : "Scheduled evaluation"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Safety + Trustworthy AI pillars */}
          <TabsContent value="safety" className="mt-0">
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Trustworthy AI™ framework</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trustPillars.map((p) => (
                  <Card key={p.name}>
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <span className="text-lg font-bold text-[var(--primary)]">{p.score}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${p.score}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{p.passing}/{p.controls} controls passing</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <h3 className="mb-3 text-sm font-semibold text-foreground">Content safety & prompt shield events</h3>
            <div className="overflow-hidden rounded-lg border border-border">
              {safetyEvents.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-start gap-4 p-4 ${i !== safetyEvents.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      e.severity === "high" ? "bg-red-500/10" : e.severity === "medium" ? "bg-yellow-500/10" : "bg-[var(--primary)]/10"
                    }`}
                  >
                    <ShieldCheck
                      className={`h-5 w-5 ${
                        e.severity === "high" ? "text-red-500" : e.severity === "medium" ? "text-yellow-500" : "text-[var(--primary)]"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{e.type}</p>
                      <Badge variant="outline" className="capitalize text-xs">{e.action}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{e.detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{e.agentName} · {e.at}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
