import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { ExecutionDetail } from "@/components/global-orchestrator/execution-detail"

export default async function GlobalOrchestratorDetailPage({ params }: { params: Promise<{ traceId: string }> }) {
  const { traceId } = await params
  return <div className="min-h-screen bg-background"><AppSidebar /><main className="app-shell-offset p-6"><ExecutionDetail traceId={traceId} /></main></div>
}