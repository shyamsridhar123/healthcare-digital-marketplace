"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchGlobalExecution, getMockGlobalExecutions, type GlobalExecutionRecord } from "@/lib/api/global-orchestrator"
import { StatusTimeline } from "./status-timeline"

export function ExecutionDetail({ traceId }: { traceId: string }) {
  const [record, setRecord] = useState<GlobalExecutionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGlobalExecution(traceId).then(setRecord).catch((err) => {
      setError((err as Error).message)
      if (process.env.NEXT_PUBLIC_USE_GLOBAL_ORCHESTRATOR_FIXTURES === "true") {
        setRecord(getMockGlobalExecutions().find((item) => item.traceId === traceId) ?? null)
      }
    }).finally(() => setLoading(false))
  }, [traceId])

  if (loading) return <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">Loading execution detail...</div>
  if (!record) return <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">{error ?? "Execution unavailable or unauthorized."}</div>

  return (
    <div className="space-y-5">
      <Link href="/global-orchestrator"><Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-foreground">{record.traceId}</h1><p className="mt-1 text-sm text-muted-foreground">Current stage: {record.currentStage.replaceAll('-', ' ')}</p></div>
        <Badge variant="outline">{record.policyDecision?.decision ?? "no policy decision"}</Badge>
      </div>
      <StatusTimeline record={record} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4"><h2 className="text-sm font-medium text-foreground">Policy decision</h2><p className="mt-3 text-sm text-muted-foreground">{record.policyDecision?.reason ?? "No policy decision has been recorded for this trace."}</p></section>
        <section className="rounded-lg border border-border bg-card p-4"><h2 className="text-sm font-medium text-foreground">Domain summary</h2><pre className="mt-3 overflow-auto rounded-md bg-background p-3 text-xs text-muted-foreground">{JSON.stringify(record.safeDomainSummary ?? { state: "not available" }, null, 2)}</pre></section>
      </div>
      <section className="rounded-lg border border-border bg-card p-4"><h2 className="text-sm font-medium text-foreground">Follow-through</h2><div className="mt-3 flex flex-wrap gap-2">{record.linkDescriptors.length ? record.linkDescriptors.map((link) => <Link key={`${link.type}:${link.href}`} href={link.href}><Button variant="outline" size="sm" className="gap-2">{link.state === "unauthorized" ? <Lock className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}{link.type}</Button></Link>) : <span className="text-sm text-muted-foreground">No follow-through links available.</span>}</div></section>
    </div>
  )
}