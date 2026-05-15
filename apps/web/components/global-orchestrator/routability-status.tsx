import { Badge } from "@/components/ui/badge"
import type { RoutabilityItem } from "@/lib/api/global-orchestrator"

const tone: Record<RoutabilityItem["status"], string> = {
  "not registered": "border-slate-500/40 text-slate-300",
  "registration pending": "border-sky-500/40 text-sky-300",
  "policy pending": "border-amber-500/40 text-amber-300",
  "evaluation pending": "border-violet-500/40 text-violet-300",
  active: "border-emerald-500/40 text-emerald-300",
  suspended: "border-slate-500/40 text-slate-300",
  rejected: "border-red-500/40 text-red-300",
  "circuit open": "border-red-500/40 text-red-300",
}

export function RoutabilityStatus({ status }: { status: RoutabilityItem["status"] }) {
  return <Badge variant="outline" className={`w-fit capitalize ${tone[status]}`}>{status}</Badge>
}