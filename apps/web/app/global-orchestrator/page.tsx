import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { ExecutionCockpit } from "@/components/global-orchestrator/execution-cockpit"

export default function GlobalOrchestratorPage() {
  return <div className="min-h-screen bg-background"><AppSidebar /><main className="app-shell-offset p-6"><div className="mb-6"><h1 className="text-2xl font-semibold text-foreground">Global Orchestrator</h1><p className="mt-2 text-sm text-muted-foreground">Stage-level execution status, policy decisions, and governed follow-through.</p></div><ExecutionCockpit /></main></div>
}