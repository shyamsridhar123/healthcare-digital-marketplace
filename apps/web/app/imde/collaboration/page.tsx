"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  GitBranch,
  GitCommit,
  GitMerge,
  Users,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Shield,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Download,
  Star,
  Lock,
  Globe,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CommitEntry {
  hash: string
  message: string
  author: string
  authorInitials: string
  timestamp: string
  branch: string
  additions: number
  deletions: number
  verified: boolean
}

interface ReviewRequest {
  id: string
  title: string
  description: string
  author: string
  status: "open" | "approved" | "changes-requested"
  reviewers: string[]
  comments: number
  createdAt: string
  artifact: string
}

interface AuditEntry {
  id: string
  action: string
  actor: string
  target: string
  timestamp: string
  category: "data-access" | "model-change" | "publish" | "config" | "permission"
  severity: "info" | "warning" | "critical"
}

const commits: CommitEntry[] = [
  { hash: "a3f8c2d", message: "feat: add counterparty-specific feature for GlobalBank cohort", author: "Sarah Chen", authorInitials: "SC", timestamp: "2h ago", branch: "feature/counterparty-feats", additions: 124, deletions: 18, verified: true },
  { hash: "b7e91fa", message: "fix: handle null finding reason codes from GL extract", author: "Mike Johnson", authorInitials: "MJ", timestamp: "4h ago", branch: "feature/counterparty-feats", additions: 12, deletions: 8, verified: true },
  { hash: "c12d405", message: "refactor: vectorize preprocessing for 3× speedup", author: "Priya Patel", authorInitials: "PP", timestamp: "1d ago", branch: "main", additions: 89, deletions: 203, verified: true },
  { hash: "d5b3e91", message: "docs: add domain expert feedback from Gupta session", author: "Amy Kowalski", authorInitials: "AK", timestamp: "1d ago", branch: "main", additions: 44, deletions: 2, verified: false },
  { hash: "e8f21bc", message: "experiment: try focal loss for class imbalance (findings vs. cleared)", author: "James Rivera", authorInitials: "JR", timestamp: "2d ago", branch: "exp/focal-loss", additions: 67, deletions: 31, verified: true },
  { hash: "f03a8d6", message: "chore: update MLflow tracking URI to new workspace", author: "Kevin Wu", authorInitials: "KW", timestamp: "3d ago", branch: "main", additions: 5, deletions: 5, verified: true },
]

const reviewRequests: ReviewRequest[] = [
  {
    id: "pr-001",
    title: "Add counterparty-specific features for GlobalBank going concern risk",
    description: "Adds 8 new features derived from GlobalBank-specific engagement artifact codes. Improves F1 by +1.4% on held-out GlobalBank test set.",
    author: "Sarah Chen",
    status: "open",
    reviewers: ["Mike Johnson", "Raj Gupta"],
    comments: 7,
    createdAt: "2h ago",
    artifact: "Going-Concern-Risk-Model-v3",
  },
  {
    id: "pr-002",
    title: "LoRA rank experiment — r=32 vs r=16 comparison",
    description: "Testing higher LoRA rank for IFRS/GAAP task. +0.7% accuracy, but 2× inference time. Domain expert review needed.",
    author: "James Rivera",
    status: "changes-requested",
    reviewers: ["Priya Patel", "Sarah Chen"],
    comments: 12,
    createdAt: "1d ago",
    artifact: "FinancialDisclosure-AutoCode-LLM",
  },
  {
    id: "pr-003",
    title: "Update finding taxonomy to 2026 counterparty rule set",
    description: "Incorporates 14 new finding codes effective Jan 2026. Required for compliance.",
    author: "Amy Kowalski",
    status: "approved",
    reviewers: ["Kevin Wu", "Linda Park"],
    comments: 4,
    createdAt: "3d ago",
    artifact: "Going-Concern-Risk-Model-v3",
  },
]

const auditLog: AuditEntry[] = [
  { id: "a-001", action: "Read transaction dataset (18mo slice)", actor: "Sarah Chen", target: "GL Entries DB (prod-mirror)", timestamp: "Mar 2, 2026 09:14", category: "data-access", severity: "info" },
  { id: "a-002", action: "Model weights exported to artifact store", actor: "Sarah Chen", target: "audit-lm-lr1e4-bs32", timestamp: "Mar 2, 2026 11:22", category: "model-change", severity: "info" },
  { id: "a-003", action: "Published model to marketplace", actor: "Sarah Chen", target: "LedgerSentinel v2.1", timestamp: "Feb 25, 2026 14:05", category: "publish", severity: "info" },
  { id: "a-004", action: "Added domain expert (Gupta) to sandbox", actor: "Amy Kowalski", target: "Going-Concern-Risk-Model-v3", timestamp: "Feb 24, 2026 10:30", category: "permission", severity: "info" },
  { id: "a-005", action: "engagement-confidential data scan flagged 3 records in test set — removed", actor: "Linda Park (DPO)", target: "financial-memos-sample.csv", timestamp: "Feb 22, 2026 08:15", category: "data-access", severity: "warning" },
  { id: "a-006", action: "Model config changed: max_tokens 512→1024", actor: "James Rivera", target: "FinancialDisclosure-AutoCode-LLM", timestamp: "Feb 20, 2026 15:44", category: "config", severity: "info" },
  { id: "a-007", action: "Attempted read of prod-live DB (blocked)", actor: "Kevin Wu", target: "GL Entries DB (production)", timestamp: "Feb 18, 2026 09:01", category: "data-access", severity: "critical" },
  { id: "a-008", action: "Governance sign-off recorded", actor: "Raj Gupta", target: "LedgerSentinel v2.1", timestamp: "Feb 17, 2026 11:30", category: "publish", severity: "info" },
]

const categoryColors: Record<AuditEntry["category"], string> = {
  "data-access": "bg-secondary text-muted-foreground",
  "model-change": "bg-secondary text-muted-foreground",
  "publish": "bg-[var(--primary)]/20 text-[var(--primary)]",
  "config": "bg-[var(--warning)]/20 text-[var(--warning)]",
  "permission": "bg-[var(--warning)]/20 text-[var(--warning)]",
}

export default function IMDECollaborationPage() {
  const [comment, setComment] = useState("")

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="app-shell-offset flex-1 p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Collaboration</h1>
              <p className="text-sm text-muted-foreground">Version control, peer reviews, audit logs & domain expert feedback</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export Audit Log
            </Button>
            <Button size="sm" className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white">
              <Plus className="h-4 w-4" />
              New Review Request
            </Button>
          </div>
        </div>

        <Tabs defaultValue="commits">
          <TabsList className="mb-4">
            <TabsTrigger value="commits">Commit History</TabsTrigger>
            <TabsTrigger value="reviews">
              Peer Reviews
              <Badge className="ml-1.5 bg-[var(--warning)]/20 text-[var(--warning)] text-[10px]">2</Badge>
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="commits" className="mt-0">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-2">
                {commits.map((c) => (
                  <div key={c.hash} className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/10 p-3 hover:bg-secondary/20 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                      {c.authorInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground">{c.message}</span>
                        {c.verified && (
                          <span className="rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 px-1.5 py-0.5 text-[10px] text-[var(--primary)]">verified</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{c.hash}</span>
                        <span>{c.author}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.timestamp}</span>
                        <span className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <GitBranch className="h-2.5 w-2.5" />{c.branch}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[var(--primary)]">+{c.additions}</span>
                      <span className="text-destructive">-{c.deletions}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Branch diagram placeholder */}
              <div className="space-y-3">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      Active Branches
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { name: "main", commits: 134, protected: true, lastActivity: "1d ago" },
                      { name: "feature/counterparty-feats", commits: 8, protected: false, lastActivity: "2h ago" },
                      { name: "exp/focal-loss", commits: 4, protected: false, lastActivity: "2d ago" },
                      { name: "exp/lora-r32", commits: 6, protected: false, lastActivity: "1d ago" },
                    ].map((b) => (
                      <div key={b.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={cn("font-mono", b.protected ? "text-foreground font-semibold" : "text-muted-foreground")}>{b.name}</span>
                          {b.protected && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{b.commits} commits</span>
                          <span>{b.lastActivity}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GitCommit className="h-4 w-4 text-[var(--primary)]" />
                      Activity (7 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-16">
                      {[4, 7, 3, 12, 8, 6, 9].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-[var(--primary)]/30 hover:bg-[var(--primary)]/40 transition-colors"
                          style={{ height: `${(h / 12) * 100}%` }}
                          title={`${h} commits`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-0">
            <div className="space-y-4">
              {reviewRequests.map((pr) => (
                <Card key={pr.id} className="border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs",
                          pr.status === "approved" ? "bg-[var(--primary)]/20 text-[var(--primary)]" :
                          pr.status === "changes-requested" ? "bg-destructive/20 text-destructive" :
                          "bg-secondary text-muted-foreground"
                        )}>
                          <GitMerge className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">{pr.title}</span>
                            <Badge className={cn(
                              "text-xs",
                              pr.status === "approved" ? "bg-[var(--primary)]/20 text-[var(--primary)]" :
                              pr.status === "changes-requested" ? "bg-destructive/20 text-destructive" :
                              "bg-secondary text-muted-foreground"
                            )}>
                              {pr.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{pr.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>by {pr.author}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{pr.createdAt}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{pr.comments} comments</span>
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono">{pr.artifact}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {pr.status === "open" && (
                          <>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30">
                              <ThumbsDown className="h-3.5 w-3.5" /> Request Changes
                            </Button>
                            <Button size="sm" className="gap-1.5 text-xs bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white">
                              <ThumbsUp className="h-3.5 w-3.5" /> Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Reviewers:</span>
                      {pr.reviewers.map((r) => (
                        <span key={r} className="rounded bg-secondary px-2 py-0.5 text-xs">{r}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Domain Expert Comment Box */}
              <Card className="border-border bg-secondary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Domain Expert Feedback
                  </CardTitle>
                  <CardDescription className="text-xs">Engagement billing and tax classification experts can leave feedback directly on models and experiments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    rows={3}
                    placeholder="Share domain expertise, flag financial concerns, or suggest training data improvements..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Commenting on: <strong>Going-Concern-Risk-Model-v3</strong></span>
                    <Button size="sm" className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white" disabled={!comment.trim()}>
                      <MessageSquare className="h-4 w-4" /> Post Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search audit log..." className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Actor</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Target</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className={cn(
                      "border-b border-border/50 transition-colors hover:bg-secondary/20",
                      entry.severity === "critical" && "bg-destructive/5"
                    )}>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{entry.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{entry.actor}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{entry.action}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{entry.target}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn("text-[10px]", categoryColors[entry.category])}>
                          {entry.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.severity === "info" && <span className="text-muted-foreground">—</span>}
                        {entry.severity === "warning" && <AlertTriangle className="h-4 w-4 text-[var(--warning)] mx-auto" />}
                        {entry.severity === "critical" && <AlertTriangle className="h-4 w-4 text-destructive mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[var(--primary)]" />
              Audit logs are immutable, tamper-evident, and retained for 7 years per independence requirements.
            </p>
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Sarah Chen", role: "Lead Data Scientist", team: "Deloitte Audit AI Studio", expertise: ["Transformer models", "Finding prediction", "EDA"], status: "online", contributions: 134 },
                { name: "James Rivera", role: "ML Engineer", team: "Deloitte Audit AI Studio", expertise: ["LLM fine-tuning", "LoRA/PEFT", "IFRS/GAAP classification"], status: "online", contributions: 89 },
                { name: "Mike Johnson", role: "Data Scientist", team: "Deloitte Audit AI Studio", expertise: ["XGBoost", "Benchmarking", "Feature engineering"], status: "away", contributions: 67 },
                { name: "Priya Patel", role: "MLOps Engineer", team: "Deloitte Audit AI Studio", expertise: ["Pipeline optimization", "SHAP", "Deployment"], status: "online", contributions: 61 },
                { name: "Amy Kowalski", role: "Data Scientist", team: "Engagement Billing Analytics", expertise: ["Approval workflow", "Counterparty rules", "XGBoost"], status: "offline", contributions: 48 },
                { name: "Raj Gupta", role: "Domain Expert — Engagement Delivery", team: "Engagement Delivery", expertise: ["Engagement Delivery workflows", "Finding remediation", "Classification accuracy"], status: "online", contributions: 22 },
                { name: "Linda Park", role: "Data Privacy Officer", team: "Compliance", expertise: ["independence", "engagement-confidential data review", "Data governance"], status: "away", contributions: 9 },
                { name: "Kevin Wu", role: "MLOps Engineer", team: "Platform", expertise: ["Infrastructure", "CI/CD", "Container ops"], status: "online", contributions: 31 },
              ].map((m) => (
                <Card key={m.name} className="border-border">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
                        {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                        m.status === "online" ? "bg-[var(--primary)]" :
                        m.status === "away" ? "bg-[var(--warning)]" : "bg-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{m.name}</div>
                      <div className="text-xs text-muted-foreground mb-1.5">{m.role} · {m.team}</div>
                      <div className="flex flex-wrap gap-1">
                        {m.expertise.map((e) => (
                          <span key={e} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{e}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <Star className="h-3 w-3 text-[var(--warning)] inline mr-0.5" />
                      {m.contributions}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
