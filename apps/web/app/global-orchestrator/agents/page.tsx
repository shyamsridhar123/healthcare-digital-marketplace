import Link from "next/link"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { RoutableAgents } from "@/components/global-orchestrator/routable-agents"
import { Button } from "@/components/ui/button"

export default function GlobalOrchestratorAgentsPage() {
  return <div className="min-h-screen bg-background"><AppSidebar /><main className="app-shell-offset p-6"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-foreground">My Routable Agents</h1><p className="mt-2 text-sm text-muted-foreground">Registration, policy, evaluation, schema, and health gates for owned domain agents.</p></div><Link href="/global-orchestrator"><Button variant="outline">Execution Cockpit</Button></Link></div><RoutableAgents /></main></div>
}