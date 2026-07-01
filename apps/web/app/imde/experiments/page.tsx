"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  GitCompare,
  Download,
  Eye,
  Cpu,
  Zap,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { imdeDemoScenario } from "@/lib/imde-demo-data"

interface Run {
  id: string
  name: string
  model: string
  status: "running" | "completed" | "failed"
  duration: string
  startedBy: string
  startedAt: string
  params: Record<string, string>
  metrics: {
    accuracy?: number
    f1?: number
    precision?: number
    recall?: number
    auc?: number
    loss?: number
    latencyMs?: number
  }
  tags: string[]
  starred: boolean
}

const runs: Run[] = [
  {
    id: imdeDemoScenario.selectedRunId,
    name: "deloitte-audit-lm-risk-v3-governed",
    model: "Deloitte Audit LM risk classifier",
    status: "completed",
    duration: "1h 42m",
    startedBy: imdeDemoScenario.actors.ownerName,
    startedAt: "May 20, 2026 09:14",
    params: { learning_rate: "1e-4", batch_size: "32", epochs: "10", warmup_steps: "500" },
    metrics: { accuracy: 0.91, f1: 0.87, precision: 0.89, recall: 0.86, auc: 0.964, loss: 0.143, latencyMs: 142 },
    tags: ["deloitte-audit-lm", "findings", "governance-ready"],
    starred: true,
  },
  {
    id: "run-002",
    name: "audit-lm-lr5e5-bs64",
    model: "bert-base-uncased (fine-tuned)",
    status: "completed",
    duration: "2h 06m",
    startedBy: "Sarah Chen",
    startedAt: "Mar 1, 2026 14:22",
    params: { learning_rate: "5e-5", batch_size: "64", epochs: "10", warmup_steps: "200" },
    metrics: { accuracy: 0.908, f1: 0.901, precision: 0.914, recall: 0.889, auc: 0.951, loss: 0.201, latencyMs: 51 },
    tags: ["bert", "findings", "v3"],
    starred: false,
  },
  {
    id: "run-003",
    name: "xgboost-depth6-est500",
    model: "XGBoost",
    status: "completed",
    duration: "4m 17s",
    startedBy: "Mike Johnson",
    startedAt: "Feb 28, 2026 11:05",
    params: { max_depth: "6", n_estimators: "500", learning_rate: "0.05", subsample: "0.8" },
    metrics: { accuracy: 0.884, f1: 0.876, precision: 0.889, recall: 0.864, auc: 0.942, loss: 0.271, latencyMs: 3 },
    tags: ["xgboost", "findings", "baseline"],
    starred: false,
  },
  {
    id: "run-004",
    name: "lgbm-leaves64",
    model: "LightGBM",
    status: "completed",
    duration: "2m 48s",
    startedBy: "Mike Johnson",
    startedAt: "Feb 28, 2026 11:48",
    params: { num_leaves: "64", n_estimators: "1000", learning_rate: "0.01", feature_fraction: "0.8" },
    metrics: { accuracy: 0.891, f1: 0.883, precision: 0.897, recall: 0.870, auc: 0.947, loss: 0.248, latencyMs: 2 },
    tags: ["lgbm", "findings", "baseline"],
    starred: false,
  },
  {
    id: "run-005",
    name: "audit-lm-lora-r16",
    model: "Llama 3.1 8B (LoRA r=16)",
    status: "running",
    duration: "3h 11m (running)",
    startedBy: "James Rivera",
    startedAt: "Mar 2, 2026 07:03",
    params: { lora_r: "16", lora_alpha: "32", learning_rate: "2e-4", epochs: "3" },
    metrics: { accuracy: 0.934, f1: 0.931, precision: 0.944, recall: 0.919, auc: 0.971, loss: 0.112, latencyMs: 210 },
    tags: ["llm", "lora", "findings", "v3"],
    starred: true,
  },
  {
    id: "run-006",
    name: "bert-augment-noisy",
    model: "bert-base-uncased (fine-tuned)",
    status: "failed",
    duration: "22m",
    startedBy: "Priya Patel",
    startedAt: "Feb 27, 2026 16:33",
    params: { learning_rate: "1e-3", batch_size: "16", epochs: "5", augmentation: "noise_0.1" },
    metrics: {},
    tags: ["bert", "augmentation", "failed"],
    starred: false,
  },
]

function MetricCell({ value, best, low }: { value?: number; best?: number; low?: boolean }) {
  if (value === undefined) return <span className="text-muted-foreground/40">—</span>
  const isTop = best !== undefined && value === best
  return (
    <span className={cn(
      "font-mono text-xs tabular-nums",
      isTop && !low ? "font-bold text-[var(--primary)]" : isTop && low ? "font-bold text-destructive" : "text-foreground"
    )}>
      {(value * 100).toFixed(1)}%
      {isTop && !low && <span className="ml-1 text-[10px]">★</span>}
    </span>
  )
}

function LatencyCell({ value, best }: { value?: number; best?: number }) {
  if (value === undefined) return <span className="text-muted-foreground/40">—</span>
  const isTop = best !== undefined && value === best
  return (
    <span className={cn(
      "font-mono text-xs tabular-nums",
      isTop ? "font-bold text-[var(--primary)]" : "text-foreground"
    )}>
      {value}ms
      {isTop && <span className="ml-1 text-[10px]">★</span>}
    </span>
  )
}

function StatusIcon({ status }: { status: Run["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
  if (status === "running") return <Play className="h-4 w-4 text-muted-foreground animate-pulse" />
  return <XCircle className="h-4 w-4 text-destructive" />
}

export default function IMDEExperimentsPage() {
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<Set<string>>(new Set([imdeDemoScenario.selectedRunId]))
  const [expandedParams, setExpandedParams] = useState<string | null>(null)
  const winningRun = runs.find((run) => run.id === imdeDemoScenario.selectedRunId)

  const completed = runs.filter((r) => r.status === "completed")
  const bestAccuracy = Math.max(...completed.filter((r) => r.metrics.accuracy !== undefined).map((r) => r.metrics.accuracy!))
  const bestF1 = Math.max(...completed.filter((r) => r.metrics.f1 !== undefined).map((r) => r.metrics.f1!))
  const bestLatency = Math.min(...completed.filter((r) => r.metrics.latencyMs !== undefined).map((r) => r.metrics.latencyMs!))
  const bestLoss = Math.min(...completed.filter((r) => r.metrics.loss !== undefined).map((r) => r.metrics.loss!))

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="app-shell-offset flex-1 p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Experiments</h1>
              <p className="text-sm text-muted-foreground">Track, compare, and analyze ML runs — built on MLflow</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selected.size >= 2 && (
              <Button variant="outline" size="sm" className="gap-2">
                <GitCompare className="h-4 w-4" />
                Compare {selected.size} Runs
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white">
              <Play className="h-4 w-4" />
              New Run
            </Button>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-2 bg-[var(--primary)]/20 text-[var(--primary)]">Selected winner</Badge>
              <p className="text-sm font-semibold text-foreground">{winningRun?.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Governance-ready run from {imdeDemoScenario.requestDefaults.name}; lineage includes notebook, base model, and synthetic/de-identified data package versions.
              </p>
            </div>
            <Link href={`/imde/push?runId=${imdeDemoScenario.selectedRunId}&demo=${imdeDemoScenario.demoScenarioId}&sandboxId=${searchParams.get("sandboxId") ?? ""}`}>
              <Button size="sm" className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white">
                <CheckCircle2 className="h-4 w-4" />
                Publish selected run
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: "Total Runs", value: runs.length.toString(), icon: FlaskConical, color: "text-muted-foreground" },
            { label: "Best Accuracy", value: `${(bestAccuracy * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-[var(--primary)]" },
            { label: "Best F1 Score", value: `${(bestF1 * 100).toFixed(1)}%`, icon: BarChart3, color: "text-muted-foreground" },
            { label: "Fastest Model", value: `${bestLatency}ms`, icon: Zap, color: "text-[var(--warning)]" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="runs">
          <TabsList className="mb-4">
            <TabsTrigger value="runs">All Runs</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="mt-0">
            {/* Run Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="w-8 px-3 py-3" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Run Name</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Model</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">Accuracy</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">F1</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">AUC</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">Loss</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">Latency</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Started</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <React.Fragment key={run.id}>
                      <tr
                        className={cn(
                          "border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors",
                          selected.has(run.id) && "bg-secondary"
                        )}
                        onClick={() => toggleSelect(run.id)}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(run.id)}
                            onChange={() => toggleSelect(run.id)}
                            className="rounded border-border"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {run.starred && <Star className="h-3.5 w-3.5 fill-[var(--warning)] text-[var(--warning)]" />}
                            <span className="font-mono text-xs text-foreground">{run.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {run.tags.map((t) => (
                              <span key={t} className="rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-muted-foreground">{run.model}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <StatusIcon status={run.status} />
                            <span className="text-xs text-muted-foreground">{run.duration}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <MetricCell value={run.metrics.accuracy} best={bestAccuracy} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <MetricCell value={run.metrics.f1} best={bestF1} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <MetricCell value={run.metrics.auc} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={cn(
                            "font-mono text-xs tabular-nums",
                            run.metrics.loss === bestLoss ? "font-bold text-[var(--primary)]" : "text-foreground"
                          )}>
                            {run.metrics.loss !== undefined ? run.metrics.loss.toFixed(3) : "—"}
                            {run.metrics.loss === bestLoss && <span className="ml-1 text-[10px]">★</span>}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <LatencyCell value={run.metrics.latencyMs} best={bestLatency} />
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-muted-foreground">{run.startedBy}</span>
                          <br />
                          <span className="text-[10px] text-muted-foreground/60">{run.startedAt}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); setExpandedParams(expandedParams === run.id ? null : run.id) }}
                            >
                              {expandedParams === run.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedParams === run.id && (
                        <tr className="border-b border-border/50 bg-secondary/10">
                          <td />
                          <td colSpan={10} className="px-3 py-3">
                            <div className="flex flex-wrap gap-4 text-xs">
                              <span className="text-muted-foreground font-semibold">Parameters:</span>
                              {Object.entries(run.params).map(([k, v]) => (
                                <span key={k} className="rounded bg-secondary px-2 py-1">
                                  <span className="text-muted-foreground">{k}=</span>
                                  <span className="text-foreground font-mono">{v}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-0">
            <div className="space-y-3">
              {[...runs]
                .filter((r) => r.status === "completed" && r.metrics.f1 !== undefined)
                .sort((a, b) => (b.metrics.f1 || 0) - (a.metrics.f1 || 0))
                .map((run, idx) => (
                  <Card key={run.id} className={cn("border-border", idx === 0 && "border-[var(--warning)]/30 bg-[var(--warning)]/5")}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
                        idx === 0 ? "bg-[var(--warning)]/20 text-[var(--warning)]" :
                        idx === 1 ? "bg-secondary text-muted-foreground" :
                        idx === 2 ? "bg-[var(--warning)]/20 text-[var(--warning)]" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-sm font-medium">{run.name}</span>
                          {run.starred && <Star className="h-3.5 w-3.5 fill-[var(--warning)] text-[var(--warning)]" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{run.model} · {run.startedBy}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-6 text-center">
                        {[
                          { label: "F1", value: run.metrics.f1 },
                          { label: "Acc", value: run.metrics.accuracy },
                          { label: "AUC", value: run.metrics.auc },
                          { label: "Prec", value: run.metrics.precision },
                        ].map((m) => (
                          <div key={m.label}>
                            <div className="text-[10px] text-muted-foreground mb-0.5">{m.label}</div>
                            <div className="text-sm font-bold font-mono">{m.value !== undefined ? (m.value * 100).toFixed(1) + "%" : "—"}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            <div className="rounded-lg border border-border bg-secondary/20 p-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-sm">Interactive metric charts powered by MLflow UI</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2">
                <Eye className="h-4 w-4" />
                Open MLflow Dashboard
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
