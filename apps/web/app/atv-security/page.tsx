"use client"

import { useMemo, useState } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Fingerprint,
  GitPullRequest,
  KeyRound,
  LockKeyhole,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Timer,
  TriangleAlert,
} from "lucide-react"

type AuditScope = "full" | "config" | "owasp" | "stride"
type FindingSeverity = "critical" | "high" | "medium" | "low"
type FindingStatus = "open" | "needs_remediation" | "waived_by_reviewer" | "approved_remediated_version"
type ReviewStateId = "new" | "in_review" | "needs_remediation" | "rejected_submitted_version" | "waived_by_reviewer" | "approved_remediated_version"

type SecurityFinding = {
  id: string
  rule: string
  title: string
  category: string
  severity: FindingSeverity
  surface: "Agentic Config" | "Application Code" | "Threat Model"
  path: string
  evidence: string
  businessRisk: string
  remediation: string
  status: FindingStatus
  owner: string
  provenance: "Live scan" | "Seeded fallback" | "Workbench fixture"
  decision: string
}

type SecurityCase = {
  id: string
  name: string
  scope: AuditScope
  command: string
  status: ReviewStateId
  grade: string
  score: number
  findings: number
  confidence: number
  updated: string
}

const assetPacket = {
  name: "AuditScribe Controls Agent Bundle",
  publisher: "Deloitte Audit AI Studio",
  requestedAction: "Publish to Nebula-X",
  submittedVersion: "1.4.0-submitted",
  remediatedVersion: "1.4.1-remediated",
  decision: "Needs remediation; submitted version is blocked",
  fixtureLabel: "Local-only demo fixture",
}

const reviewStates: Array<{ id: ReviewStateId; label: string; detail: string }> = [
  { id: "new", label: "New", detail: "Submission packet received" },
  { id: "in_review", label: "In review", detail: "Live scan or Seeded fallback evidence is being triaged" },
  { id: "needs_remediation", label: "Needs remediation", detail: "Submitted version cannot publish" },
  { id: "rejected_submitted_version", label: "Rejected submitted version", detail: "Unsafe submitted version is blocked" },
  { id: "waived_by_reviewer", label: "Waived by reviewer", detail: "Accepted risk with explicit reviewer reason" },
  { id: "approved_remediated_version", label: "Approved remediated version", detail: "Only 1.4.1-remediated can publish" },
]

const securityCases: SecurityCase[] = [
  {
    id: "ASSET-SEC-001",
    name: "Submitted AI asset security review",
    scope: "full",
    command: "/atv-security demos/atv-security-target",
    status: "needs_remediation",
    grade: "Block",
    score: 38,
    findings: 5,
    confidence: 94,
    updated: "Seeded fallback ready",
  },
  {
    id: "ASSET-SEC-002",
    name: "Target-root agentic config scan",
    scope: "config",
    command: "/atv-security",
    status: "in_review",
    grade: "Review",
    score: 56,
    findings: 3,
    confidence: 91,
    updated: "Target workspace",
  },
  {
    id: "ASSET-SEC-003",
    name: "Remediated publication gate",
    scope: "stride",
    command: "Assisted remediation after target-scoped report",
    status: "approved_remediated_version",
    grade: "Pending",
    score: 0,
    findings: 0,
    confidence: 0,
    updated: "Mock state",
  },
]

const findings: SecurityFinding[] = [
  {
    id: "ATV-MCP-001",
    rule: "MCP-01",
    title: "Unpinned and overbroad MCP execution",
    category: "MCP Servers",
    severity: "high",
    surface: "Agentic Config",
    path: "demos/atv-security-target/.github/copilot-mcp-config.json",
    evidence: "`npx -y`, wildcard tools, `autoApprove`, and fake demo secrets appear in the submitted bundle.",
    businessRisk: "A submitted asset can request wildcard tool access and auto-approved secret reads before security review.",
    remediation: "Pin the MCP package version, replace wildcard tools with an allowlist, and remove auto-approved secret access.",
    status: "needs_remediation",
    owner: "Platform Security",
    provenance: "Seeded fallback",
    decision: "Block submitted version until MCP package version, tool allowlist, and approvals are scoped.",
  },
  {
    id: "ATV-HOOK-002",
    rule: "HOOK-02",
    title: "Hook exfiltration-shaped automation",
    category: "Hooks",
    severity: "high",
    surface: "Agentic Config",
    path: "demos/atv-security-target/.github/hooks/scripts/post-tool-use.js",
    evidence: "The inert fixture prints a `curl -X POST ... || true` command shape that would be unsafe if activated.",
    businessRisk: "Tool output could be posted outside the review boundary if a similar hook were made active.",
    remediation: "Remove the hook or replace it with signed telemetry to an approved destination and no suppressed errors.",
    status: "needs_remediation",
    owner: "Agent Platform",
    provenance: "Seeded fallback",
    decision: "Block submitted version; require hook removal or signed, reviewed telemetry destination.",
  },
  {
    id: "ATV-A01-003",
    rule: "OWASP-A01",
    title: "Broken authorization exposes engagement case data",
    category: "Broken Access Control",
    severity: "critical",
    surface: "Application Code",
    path: "demos/atv-security-target/src/routes/cases.js",
    evidence: "Synthetic engagement packets can be read or approved without durable reviewer identity and ownership checks.",
    businessRisk: "Engagement packets can be read or approved without durable reviewer identity and ownership checks.",
    remediation: "Resolve reviewer identity from authenticated engagement assertions, enforce case ownership/role checks, and add authorization tests.",
    status: "open",
    owner: "Asset Publisher",
    provenance: "Seeded fallback",
    decision: "Reject submitted version for enterprise publication until access control is fixed and tested.",
  },
  {
    id: "ATV-A10-004",
    rule: "OWASP-A10",
    title: "SSRF and data exposure through web-fetch tooling",
    category: "Server-Side Request Forgery",
    severity: "high",
    surface: "Application Code",
    path: "demos/atv-security-target/src/mcp/tools.js",
    evidence: "Agent tools can fetch attacker-chosen or internal URLs while carrying engagement context.",
    businessRisk: "An agent tool can fetch attacker-chosen or internal URLs while handling engagement context.",
    remediation: "Add URL allowlists, block internal address ranges, cap response size, and log tool provenance.",
    status: "needs_remediation",
    owner: "Asset Publisher",
    provenance: "Seeded fallback",
    decision: "Block submitted version until URL allowlists and network egress controls exist.",
  },
  {
    id: "ATV-STRIDE-005",
    rule: "STRIDE",
    title: "Marketplace STRIDE synthesis requires remediation gate",
    category: "Threat Model",
    severity: "medium",
    surface: "Threat Model",
    path: "demos/atv-security-target",
    evidence: "Spoofing, tampering, repudiation, information disclosure, service disruption, and privilege escalation risks combine into one publication decision.",
    businessRisk: "Spoofing, tampering, repudiation, disclosure, DoS, and privilege escalation risks combine into a publication decision.",
    remediation: "Keep the asset in needs_remediation unless a reviewer records accepted risk or a remediated version passes review.",
    status: "waived_by_reviewer",
    owner: "Security Reviewer",
    provenance: "Workbench fixture",
    decision: "Needs remediation by default; waiver is accepted risk, not approval of the submitted version.",
  },
]

const scopeCopy: Record<AuditScope, { label: string; detail: string; checks: string[] }> = {
  full: {
    label: "Full",
    detail: "Application source plus agentic configuration",
    checks: ["MCP and hooks", "OWASP Top 10", "STRIDE synthesis"],
  },
  config: {
    label: "Config",
    detail: "Agents, skills, hooks, MCP, and editor permissions",
    checks: ["Secrets", "Prompt injection", "Tool auto-approval"],
  },
  owasp: {
    label: "OWASP",
    detail: "Express, SQLite, LLM, and MCP source paths",
    checks: ["Access control", "Injection", "SSRF"],
  },
  stride: {
    label: "STRIDE",
    detail: "Marketplace publication threat model",
    checks: ["Spoofing", "Tampering", "Privilege escalation"],
  },
}

const severityStyles: Record<FindingSeverity, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  medium: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  low: "border-sky-500/30 bg-sky-500/10 text-sky-300",
}

const statusStyles: Record<FindingStatus, string> = {
  open: "border-red-500/30 bg-red-500/10 text-red-300",
  needs_remediation: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  waived_by_reviewer: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  approved_remediated_version: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
}

export default function AtvSecurityPage() {
  const [scope, setScope] = useState<AuditScope>("full")
  const [mode, setMode] = useState<"report" | "fix">("report")
  const [selectedFindingId, setSelectedFindingId] = useState(findings[0].id)

  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) ?? findings[0]
  const filteredCases = useMemo(
    () => securityCases.filter((securityCase) => scope === "full" || securityCase.scope === scope || securityCase.scope === "full"),
    [scope],
  )
  const activeCommand = mode === "fix" ? "Assisted remediation: fix from target-scoped findings, then review tests" : scope === "full" ? "/atv-security demos/atv-security-target" : `/atv-security ${scope}`
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length
  const blockedCount = findings.filter((finding) => finding.status === "open" || finding.status === "needs_remediation").length

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <main className="app-shell-offset mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-300" variant="outline">
                Submitted AI asset security review
              </Badge>
              <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-300" variant="outline">
                Local-only demo fixture
              </Badge>
              <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-300" variant="outline">
                Seeded fallback available
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">ATV Security Workbench</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Mock marketplace governance surface for the AuditScribe Controls Agent Bundle from Deloitte Audit AI Studio.
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 p-2">
            <TerminalSquare className="ml-2 h-4 w-4 text-[var(--accent)]" />
            <code className="min-w-0 flex-1 px-2 text-sm text-foreground">{activeCommand}</code>
            <Button size="sm" className="bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90">
              <Radar className="h-4 w-4" />
              Run
            </Button>
          </div>
        </div>

        <section className="mb-6 rounded-lg border border-border bg-card/40 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-400" />
                <h2 className="text-base font-semibold text-foreground">Marketplace Review Packet</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["Asset", assetPacket.name],
                  ["Publisher", assetPacket.publisher],
                  ["Requested action", assetPacket.requestedAction],
                  ["Submitted version", assetPacket.submittedVersion],
                  ["Remediated version", assetPacket.remediatedVersion],
                  ["Fixture", assetPacket.fixtureLabel],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-background/40 p-3">
                    <p className="text-xs uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
              <p className="text-xs uppercase text-orange-300">Publication decision</p>
              <p className="mt-2 text-sm font-medium text-foreground">{assetPacket.decision}</p>
              <p className="mt-3 text-xs text-muted-foreground">Approval applies only to {assetPacket.remediatedVersion} after review.</p>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Publication Grade</CardTitle>
              <ShieldCheck className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">Block</div>
              <Progress value={38} className="mt-3" />
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Findings</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">{criticalCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">Authorization blocks publication</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Blocked Items</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">{blockedCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">Needs remediation</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Evidence Provenance</CardTitle>
              <Fingerprint className="h-4 w-4 text-[var(--accent)]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">3</div>
              <p className="mt-1 text-xs text-muted-foreground">Live scan, Seeded fallback, Workbench fixture</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_22rem]">
          <section className="rounded-lg border border-border bg-card/40 p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Review Queue</h2>
                <p className="text-sm text-muted-foreground">Preloaded demo cases for triage and sign-off.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(scopeCopy) as AuditScope[]).map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={scope === item ? "default" : "outline"}
                    onClick={() => setScope(item)}
                    className={scope === item ? "bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90" : ""}
                  >
                    {scopeCopy[item].label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1.1fr_1fr_0.9fr_0.7fr_0.8fr] gap-3 border-b border-border bg-secondary/40 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
                <span>Case</span>
                <span>Command</span>
                <span>Status</span>
                <span>Grade</span>
                <span>Updated</span>
              </div>
              {filteredCases.map((securityCase) => (
                <div key={securityCase.id} className="grid grid-cols-[1.1fr_1fr_0.9fr_0.7fr_0.8fr] gap-3 border-b border-border/70 px-4 py-3 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{securityCase.name}</p>
                    <p className="text-xs text-muted-foreground">{securityCase.id}</p>
                  </div>
                  <code className="truncate text-xs text-muted-foreground">{securityCase.command}</code>
                  <Badge variant="outline" className="h-fit justify-self-start capitalize">{securityCase.status.replace(/_/g, " ")}</Badge>
                  <span className="font-semibold text-foreground">{securityCase.grade}</span>
                  <span className="text-muted-foreground">{securityCase.updated}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card/40 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Mode</h2>
                <p className="text-sm text-muted-foreground">Report or assisted fix.</p>
              </div>
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={mode === "report" ? "default" : "outline"} onClick={() => setMode("report")}>Report</Button>
              <Button variant={mode === "fix" ? "default" : "outline"} onClick={() => setMode("fix")}>Fix</Button>
            </div>
            <div className="mt-5 space-y-3">
              {scopeCopy[scope].checks.map((check) => (
                <div key={check} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-foreground">{check}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-xs uppercase text-muted-foreground">Scope</p>
              <p className="mt-1 text-sm font-medium text-foreground">{scopeCopy[scope].detail}</p>
            </div>
          </section>
        </div>

        <Tabs defaultValue="findings" className="gap-4">
          <TabsList>
            <TabsTrigger value="findings"><TriangleAlert className="h-4 w-4" /> Findings</TabsTrigger>
            <TabsTrigger value="flow"><GitPullRequest className="h-4 w-4" /> Review States</TabsTrigger>
            <TabsTrigger value="evidence"><FileSearch className="h-4 w-4" /> Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="findings">
            <div className="grid gap-4 lg:grid-cols-[26rem_1fr]">
              <div className="space-y-3">
                {findings.map((finding) => (
                  <button
                    key={finding.id}
                    type="button"
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${selectedFinding.id === finding.id ? "border-[var(--accent)] bg-secondary/60" : "border-border bg-card/40 hover:bg-secondary/40"}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Badge variant="outline" className={severityStyles[finding.severity]}>{finding.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{finding.id}</span>
                    </div>
                    <p className="font-medium text-foreground">{finding.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{finding.surface} / {finding.provenance}</p>
                  </button>
                ))}
              </div>

              <section className="rounded-lg border border-border bg-card/40 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedFinding.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedFinding.category} in {selectedFinding.surface}</p>
                  </div>
                  <Badge variant="outline" className={statusStyles[selectedFinding.status]}>{selectedFinding.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Path</p>
                    <p className="mt-2 break-words text-sm text-foreground">{selectedFinding.path}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Owner</p>
                    <p className="mt-2 text-sm text-foreground">{selectedFinding.owner}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Provenance</p>
                    <p className="mt-2 text-sm text-foreground">{selectedFinding.provenance}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Evidence</p>
                  <p className="mt-2 text-sm text-foreground">{selectedFinding.evidence}</p>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Business risk</p>
                  <p className="mt-2 text-sm text-foreground">{selectedFinding.businessRisk}</p>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Remediation</p>
                  <p className="mt-2 text-sm text-foreground">{selectedFinding.remediation}</p>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Decision</p>
                  <p className="mt-2 text-sm text-foreground">{selectedFinding.decision}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button><ClipboardCheck className="h-4 w-4" /> Approve remediated version</Button>
                  <Button variant="outline"><AlertTriangle className="h-4 w-4" /> Request remediation</Button>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="flow">
            <div className="grid gap-4 md:grid-cols-3">
              {reviewStates.map((state) => (
                <Card key={state.id} className="rounded-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-[var(--accent)]">
                          {state.id === "approved_remediated_version" ? <LockKeyhole className="h-5 w-5" /> : state.id === "waived_by_reviewer" ? <KeyRound className="h-5 w-5" /> : <Radar className="h-5 w-5" />}
                        </span>
                        <CardTitle className="text-base">{state.label}</CardTitle>
                      </div>
                      <Badge variant="outline">{state.id}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{state.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="evidence">
            <section className="rounded-lg border border-border bg-card/40 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Timer className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-foreground">Evidence Timeline</h2>
              </div>
              <div className="space-y-3">
                {[
                  "Live scan: run /atv-security demos/atv-security-target from the monorepo window.",
                  "Live scan: run /atv-security from the target-root window to discover demo-local .github and .vscode files.",
                  "Seeded fallback: docs/security/fixtures/atv-security-target-seeded-fallback-report.md maps golden findings to owner decisions.",
                  "Workbench fixture: this page converts evidence into review states without publishing anything.",
                ].map((event, index) => (
                  <div key={event} className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-foreground">{index + 1}</span>
                    <p className="text-sm text-foreground">{event}</p>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}