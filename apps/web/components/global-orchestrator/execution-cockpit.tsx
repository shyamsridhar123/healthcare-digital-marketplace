"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Activity, AlertCircle, CheckCircle2, Clipboard, ExternalLink, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchGlobalExecutions, getMockGlobalExecutions, type GlobalExecutionRecord } from "@/lib/api/global-orchestrator"

export function ExecutionCockpit() {
  const [executions, setExecutions] = useState<GlobalExecutionRecord[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGlobalExecutions().then(setExecutions).catch((err) => {
      setError((err as Error).message)
      if (process.env.NEXT_PUBLIC_USE_GLOBAL_ORCHESTRATOR_FIXTURES === "true") setExecutions(getMockGlobalExecutions())
    }).finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => filter === "all" ? executions : executions.filter((execution) => execution.currentStage === filter), [executions, filter])
  const activeCount = executions.filter((execution) => !["completed", "failed"].includes(execution.currentStage)).length
  const blockedCount = executions.filter((execution) => execution.policyDecision?.decision === "deny" || execution.policyDecision?.decision === "pending-approval").length

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Summary label="Active traces" value={activeCount} icon={Activity} />
        <Summary label="Policy holds" value={blockedCount} icon={AlertCircle} />
        <Summary label="Completed" value={executions.filter((execution) => execution.currentStage === "completed").length} icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {['all', 'global-pre-flight', 'routing', 'domain-execution', 'global-post-flight'].map((value) => (
          <Button key={value} type="button" variant={filter === value ? "secondary" : "ghost"} size="sm" onClick={() => setFilter(value)} className="capitalize">
            {value.replaceAll('-', ' ')}
          </Button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">Loading executions...</div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No matching executions</p>
          <p className="mt-1 text-sm text-muted-foreground">Adjust the stage filter or wait for new Global Orchestrator traces.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Trace</span><span>Stage</span><span>Domain</span><span>Policy</span><span>Action</span>
          </div>
          <div className="divide-y divide-border">
            {visible.map((execution) => <ExecutionRow key={execution.traceId} execution={execution} />)}
          </div>
        </div>
      )}
    </section>
  )
}

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return <div className="rounded-lg border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p></div>
}

function ExecutionRow({ execution }: { execution: GlobalExecutionRecord }) {
  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-center">
      <div className="min-w-0"><p className="truncate font-medium text-foreground">{execution.traceId}</p><button type="button" onClick={() => navigator.clipboard.writeText(execution.traceId)} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Clipboard className="h-3 w-3" />Copy trace</button></div>
      <Badge variant="outline" className="w-fit capitalize">{execution.currentStage.replaceAll('-', ' ')}</Badge>
      <span className="text-muted-foreground">{execution.selectedDomain ?? "Unassigned"}</span>
      <span className="text-muted-foreground capitalize">{execution.policyDecision?.decision.replace('-', ' ') ?? "Not evaluated"}</span>
      <Link href={`/global-orchestrator/${execution.traceId}`}><Button size="sm" variant="outline" className="gap-2">Open <ExternalLink className="h-3.5 w-3.5" /></Button></Link>
    </div>
  )
}