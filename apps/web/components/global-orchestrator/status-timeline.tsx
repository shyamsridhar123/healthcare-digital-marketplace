import { CheckCircle2, Circle, CircleAlert, Clock3 } from "lucide-react"
import type { GlobalExecutionRecord, GlobalStage } from "@/lib/api/global-orchestrator"
import { cn } from "@/lib/utils"

const stages: Array<{ key: GlobalStage; label: string }> = [
  { key: "intake", label: "Intake" },
  { key: "global-pre-flight", label: "Pre-flight" },
  { key: "routing", label: "Routing" },
  { key: "domain-execution", label: "Domain" },
  { key: "global-post-flight", label: "Post-flight" },
  { key: "completed", label: "Outcome" },
]

export function StatusTimeline({ record }: { record: GlobalExecutionRecord }) {
  return (
    <ol className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Global execution stage timeline">
      {stages.map((stage) => {
        const state = record.stageStatuses[stage.key]?.status ?? "pending"
        const Icon = state === "completed" ? CheckCircle2 : state === "failed" || state === "blocked" ? CircleAlert : state === "running" ? Clock3 : Circle
        return (
          <li key={stage.key} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", state === "completed" ? "text-emerald-400" : state === "failed" || state === "blocked" ? "text-red-400" : state === "running" ? "text-sky-400" : "text-muted-foreground")} aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{stage.label}</span>
            </div>
            <p className="mt-2 text-xs capitalize text-muted-foreground" aria-label={`${stage.label} status ${state}`}>{state.replace("-", " ")}</p>
          </li>
        )
      })}
    </ol>
  )
}