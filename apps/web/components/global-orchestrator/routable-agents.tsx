"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Bot, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchRoutableAgents, getMockRoutability, type RoutabilityItem } from "@/lib/api/global-orchestrator"
import { RoutabilityStatus } from "./routability-status"

export function RoutableAgents() {
  const [agents, setAgents] = useState<RoutabilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    setLoading(true)
    setError(null)
    fetchRoutableAgents().then(setAgents).catch((err) => {
      setError((err as Error).message)
      if (process.env.NEXT_PUBLIC_USE_GLOBAL_ORCHESTRATOR_FIXTURES === "true") setAgents(getMockRoutability())
    }).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div><h2 className="text-sm font-medium text-foreground">My Routable Agents</h2><p className="mt-1 text-sm text-muted-foreground">Owned agents and the gate currently blocking Global Orchestrator routing.</p></div>
        <Button variant="outline" onClick={refresh} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>

      {error && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</div>}

      {loading ? <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">Loading routability...</div> : agents.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center"><Bot className="mx-auto mb-3 h-6 w-6 text-muted-foreground" /><p className="text-sm font-medium text-foreground">No owned agents found</p><Link href="/onboarding/new"><Button className="mt-4">Register a domain agent</Button></Link></div>
      ) : <div className="grid gap-3">{agents.map((agent) => <AgentRow key={agent.agentId} agent={agent} />)}</div>}
    </section>
  )
}

function AgentRow({ agent }: { agent: RoutabilityItem }) {
  const primaryGate = agent.blockingGates[0]
  const href = agent.nextAction.href
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-muted-foreground" /><h3 className="truncate text-sm font-medium text-foreground">{agent.name}</h3></div><p className="mt-1 text-xs text-muted-foreground">{agent.owner?.team ?? "Owner pending"}</p></div>
        <RoutabilityStatus status={agent.status} />
      </div>
      {primaryGate ? <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground"><div className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{primaryGate.reason}</span></div></div> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Last gate update {agent.lastUpdated ? new Date(agent.lastUpdated).toLocaleString() : "not available"}</span>{href ? <Link href={href}><Button size="sm" variant={agent.status === "active" ? "outline" : "default"} className="gap-2">{agent.nextAction.label}<ExternalLink className="h-3.5 w-3.5" /></Button></Link> : <Button size="sm" variant="outline" disabled>{agent.nextAction.label}</Button>}</div>
    </article>
  )
}