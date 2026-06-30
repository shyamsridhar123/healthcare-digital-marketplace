"use client"

import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Code2,
  Plus,
  Cpu,
  HardDrive,
  Zap,
  Users,
  Database,
  CheckCircle2,
  Clock,
  Play,
  StopCircle,
  Settings,
  ExternalLink,
  Shield,
  MemoryStick,
  Layers,
  AlertCircle,
  Terminal,
  FlaskConical,
  Brain,
  RefreshCw,
  Trash2,
  RotateCcw,
  Server,
  CloudCog,
  Loader2,
  Info,
  NotebookPen,
  ArrowUpCircle,
  CalendarPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

interface AmlComputeInstance {
  name: string
  id: string
  computeType: string
  provisioningState: string
  vmSize: string
  state?: string
  description?: string
  createdBy?: string
  createdOn?: string
  modifiedOn?: string
  cpuCores?: number
  memoryGb?: number
  currentNodeCount?: number
  maxNodeCount?: number
  isGpu?: boolean
  gpuSpec?: string
  tags?: Record<string, string>
  sshPort?: number
  studioUrl?: string
}

interface VmSizeOption {
  id: string
  label: string
  tier: string
  isGpu: boolean
}

interface ComputeApiResponse {
  computes: AmlComputeInstance[]
  configured: boolean
  workspace?: string
  resourceGroup?: string
  subscription?: string
  vmSizes?: VmSizeOption[]
  error?: string
}

interface Sandbox {
  id: string
  name: string
  status: "running" | "idle" | "stopped" | "building" | "starting" | "stopping" | "requested" | "provisioning"
  owner: string
  team: string[]
  computeType: string
  cpu: number
  gpu?: string
  memoryGb: number
  storageGb: number
  cpuUsage: number
  memUsage: number
  dataSources: string[]
  preloadedTools: string[]
  createdAt: string
  lastActive: string
  description: string
  studioUrl?: string
  notebookUrl?: string
  dataPackages?: string[]
  amlName?: string
}

// ── Tool presets (pre-loaded in every sandbox) ────────────────────────────────

const toolPresets = [
  {
    category: "ML Frameworks",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    tools: ["PyTorch 2.2", "TensorFlow 2.15", "scikit-learn", "XGBoost", "LightGBM"],
  },
  {
    category: "Data & ETL",
    icon: Database,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    tools: ["pandas", "Spark 3.5", "dbt", "Great Expectations", "Arrow"],
  },
  {
    category: "Dev Tools",
    icon: Code2,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    tools: ["JupyterLab", "VS Code Server", "git", "Poetry", "Docker"],
  },
  {
    category: "Observability",
    icon: Layers,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    tools: ["MLflow", "Weights & Biases", "Prometheus", "OpenTelemetry"],
  },
]

// ── Static fallback data ───────────────────────────────────────────────────────

const STATIC_SANDBOXES: Sandbox[] = [
  {
    id: "sb-001",
    name: "RCM-Denial-Prediction-v3",
    status: "running",
    owner: "Dr. Sarah Chen",
    team: ["Sarah Chen", "Mike Johnson", "Priya Patel"],
    computeType: "GPU-Accelerated",
    cpu: 32,
    gpu: "NVIDIA A100 × 2",
    memoryGb: 128,
    storageGb: 2048,
    cpuUsage: 67,
    memUsage: 54,
    dataSources: ["Claims DB (prod-mirror)", "ERA/835 Feed", "Payer Rules Engine"],
    preloadedTools: ["PyTorch 2.3", "HuggingFace Transformers", "MLflow", "Jupyter Lab"],
    createdAt: "Feb 12, 2026",
    lastActive: "2 min ago",
    description: "Fine-tuning transformer model on denial reasons using 18 months of payer data",
    studioUrl: "https://ml.azure.com/demo/studio",
    notebookUrl: "https://ml.azure.com/demo/notebook",
    dataPackages: ["claims_training", "denials_gold"],
  },
  {
    id: "sb-002",
    name: "ICD10-AutoCode-LLM",
    status: "running",
    owner: "James Rivera",
    team: ["James Rivera", "Linda Park"],
    computeType: "GPU-Accelerated",
    cpu: 16,
    gpu: "NVIDIA V100 × 4",
    memoryGb: 64,
    storageGb: 512,
    cpuUsage: 88,
    memUsage: 72,
    dataSources: ["Clinical Notes DB", "ICD-10-CM Reference", "Provider Encounter Feed"],
    preloadedTools: ["LangChain", "OpenAI SDK", "vLLM", "Jupyter Lab", "DVC"],
    createdAt: "Jan 28, 2026",
    lastActive: "15 min ago",
    description: "LLM-based ICD-10 auto-coding from clinical notes — multimodal extension in progress",
    studioUrl: "https://ml.azure.com/demo/studio",
    notebookUrl: "https://ml.azure.com/demo/notebook",
    dataPackages: ["clinical_notes_phi"],
  },
  {
    id: "sb-003",
    name: "Auth-Approval-Predictor",
    status: "idle",
    owner: "Amy Kowalski",
    team: ["Amy Kowalski", "Tom Richards", "Sarah Chen"],
    computeType: "CPU-Optimized",
    cpu: 8,
    memoryGb: 32,
    storageGb: 256,
    cpuUsage: 4,
    memUsage: 18,
    dataSources: ["Authorization DB", "Payer Coverage Rules"],
    preloadedTools: ["scikit-learn", "XGBoost", "SHAP", "Jupyter Lab"],
    createdAt: "Feb 20, 2026",
    lastActive: "3 hours ago",
    description: "XGBoost ensemble for prior authorization approval likelihood scoring",
    dataPackages: ["claims_training"],
  },
  {
    id: "sb-004",
    name: "Billing-Anomaly-Detector",
    status: "stopped",
    owner: "Kevin Wu",
    team: ["Kevin Wu"],
    computeType: "Standard",
    cpu: 4,
    memoryGb: 16,
    storageGb: 128,
    cpuUsage: 0,
    memUsage: 0,
    dataSources: ["Billing Transactions DB"],
    preloadedTools: ["TensorFlow", "Pandas", "Jupyter Lab"],
    createdAt: "Feb 1, 2026",
    lastActive: "2 days ago",
    description: "Anomaly detection on billing codes — paused for domain expert review",
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function amlStateToSandboxStatus(state?: string, provisioningState?: string): Sandbox["status"] {
  const s = (state ?? "").toLowerCase()
  const p = (provisioningState ?? "").toLowerCase()
  if (s === "running" || s === "jobrunning") return "running"
  if (s === "stopped") return "stopped"
  if (s === "starting" || p === "creating") return "starting"
  if (s === "stopping") return "stopping"
  if (s === "restarting" || p === "updating") return "building"
  return "idle"
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} days ago`
}

function amlComputeToSandbox(c: AmlComputeInstance, index: number): Sandbox {
  const status = amlStateToSandboxStatus(c.state, c.provisioningState)
  const isRunning = status === "running"
  const defaultTeams = [["Dr. Sarah Chen", "Mike Johnson"], ["James Rivera", "Linda Park"], ["Amy Kowalski"], ["Kevin Wu"]]
  const defaultDs = [["Claims DB", "ERA/835 Feed"], ["Clinical Notes DB", "ICD-10-CM Ref"], ["Auth DB", "Payer Rules"], ["Billing Transactions DB"]]
  const defaultTools = [["PyTorch", "MLflow", "Jupyter Lab"], ["LangChain", "vLLM", "Jupyter Lab"], ["scikit-learn", "XGBoost", "Jupyter Lab"], ["TensorFlow", "Pandas"]]
  return {
    id: `aml-${c.name}`,
    name: c.name,
    status,
    owner: c.createdBy ?? "Team Member",
    team: defaultTeams[index % defaultTeams.length],
    computeType: c.isGpu ? "GPU-Accelerated" : (c.memoryGb ?? 0) >= 64 ? "Memory-Optimized" : "CPU-Optimized",
    cpu: c.cpuCores ?? 4,
    gpu: c.gpuSpec,
    memoryGb: c.memoryGb ?? 16,
    storageGb: 512,
    cpuUsage: isRunning ? Math.floor(Math.random() * 60) + 20 : 0,
    memUsage: isRunning ? Math.floor(Math.random() * 50) + 20 : 0,
    dataSources: defaultDs[index % defaultDs.length],
    preloadedTools: defaultTools[index % defaultTools.length],
    createdAt: c.createdOn
      ? new Date(c.createdOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    lastActive: c.modifiedOn ? timeAgo(c.modifiedOn) : "Unknown",
    description: c.description ?? `${c.vmSize} compute instance in ai-project-q2w5uxlkh4c6o`,
    studioUrl: c.studioUrl,
    amlName: c.name,
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Sandbox["status"] }) {
  const map: Record<string, string> = {
    running: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    idle: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    stopped: "bg-secondary text-muted-foreground border-border",
    building: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    starting: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    stopping: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    requested: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    provisioning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  }
  const labels: Record<string, string> = {
    running: "● Running",
    idle: "● Idle",
    stopped: "○ Stopped",
    building: "⟳ Provisioning",
    starting: "⟳ Starting",
    stopping: "⟳ Stopping",
    requested: "⏳ Approval Pending",
    provisioning: "⟳ Provisioning",
  }
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", map[status] ?? map.idle)}>
      {labels[status] ?? status}
    </span>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IMDEWorkspacePage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>(STATIC_SANDBOXES)
  const [amlComputes, setAmlComputes] = useState<AmlComputeInstance[]>([])
  const [vmSizes, setVmSizes] = useState<VmSizeOption[]>([])
  const [amlWorkspace, setAmlWorkspace] = useState<string | null>(null)
  const [amlConfigured, setAmlConfigured] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [pendingAction, setPendingAction] = useState<Record<string, string>>({})
  const [manageOpen, setManageOpen] = useState(false)
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [provisionName, setProvisionName] = useState("")
  const [provisionVmSize, setProvisionVmSize] = useState("Standard_DS3_v2")
  const [provisionDesc, setProvisionDesc] = useState("")
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [provisionSuccess, setProvisionSuccess] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishSandbox, setPublishSandbox] = useState<Sandbox | null>(null)
  const [publishStage, setPublishStage] = useState<"review" | "publishing" | "published">("review")

  // ── Governed sandbox request form state ───────────────────────────────────────
  const [provisionTemplate, setProvisionTemplate] = useState("standard-research")
  const [provisionDataPkgs, setProvisionDataPkgs] = useState<string[]>([])
  const [provisionComputeProfile, setProvisionComputeProfile] = useState("cpu-medium")
  const [provisionDays, setProvisionDays] = useState("14")
  const [provisionCostCenter, setProvisionCostCenter] = useState("")
  const [provisionJustification, setProvisionJustification] = useState("")

  // ── Upgrade Compute dialog state ─────────────────────────────────────────────
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeSandbox, setUpgradeSandbox] = useState<Sandbox | null>(null)
  const [upgradeProfile, setUpgradeProfile] = useState("gpu-small")

  // ── Extend Sandbox dialog state ──────────────────────────────────────────────
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendSandbox, setExtendSandbox] = useState<Sandbox | null>(null)
  const [extendDays, setExtendDays] = useState("14")

  // ── Fetch compute from API ──────────────────────────────────────────────────

  const fetchCompute = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/aml/compute")
      const data: ComputeApiResponse = await res.json()
      setAmlConfigured(data.configured)
      setAmlWorkspace(data.workspace ?? null)
      if (data.vmSizes) setVmSizes(data.vmSizes)
      if (data.configured && data.computes.length > 0) {
        setAmlComputes(data.computes)
        setSandboxes(data.computes.map((c, i) => amlComputeToSandbox(c, i)))
      } else if (data.error && data.configured) {
        setLoadError(data.error)
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load compute data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchCompute() }, [fetchCompute])

  // ── Start / Stop action ─────────────────────────────────────────────────────

  const handleAction = useCallback(async (sb: Sandbox, action: "start" | "stop" | "restart") => {
    if (!sb.amlName) return
    setPendingAction((p) => ({ ...p, [sb.id]: action }))
    try {
      const res = await fetch(`/api/aml/compute/${encodeURIComponent(sb.amlName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error("Compute action failed:", err.error)
      } else {
        setSandboxes((prev) =>
          prev.map((s) =>
            s.id === sb.id
              ? { ...s, status: action === "start" ? "starting" : action === "stop" ? "stopping" : "building" }
              : s
          )
        )
        setTimeout(() => fetchCompute(), 5000)
      }
    } finally {
      setPendingAction((p) => { const n = { ...p }; delete n[sb.id]; return n })
    }
  }, [fetchCompute])

  // ── Delete compute ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (computeName: string) => {
    if (!confirm(`Delete compute instance "${computeName}"? This cannot be undone.`)) return
    try {
      await fetch(`/api/aml/compute/${encodeURIComponent(computeName)}`, { method: "DELETE" })
      setAmlComputes((prev) => prev.filter((c) => c.name !== computeName))
      setSandboxes((prev) => prev.filter((s) => s.amlName !== computeName))
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }, [])

  // ── Provision ──────────────────────────────────────────────────────────────

  const handleProvision = async () => {
    setProvisionLoading(true)
    setProvisionError(null)
    try {
      // Demo: add a governed sandbox request and simulate the lifecycle
      const sandboxId = `sbx-${Date.now()}`
      const computeProfileLabel = provisionComputeProfile === "gpu-small"
        ? "GPU-Accelerated" : provisionComputeProfile === "cpu-medium"
        ? "CPU-Optimized (16 vCPU)" : "CPU-Standard (4 vCPU)"
      const newSb: Sandbox = {
        id: sandboxId,
        name: provisionName,
        status: "requested",
        owner: "You",
        team: ["You"],
        computeType: computeProfileLabel,
        cpu: provisionComputeProfile === "gpu-small" ? 6 : provisionComputeProfile === "cpu-medium" ? 16 : 4,
        gpu: provisionComputeProfile === "gpu-small" ? "NVIDIA V100 × 1" : undefined,
        memoryGb: provisionComputeProfile === "cpu-medium" ? 64 : 16,
        storageGb: 512,
        cpuUsage: 0,
        memUsage: 0,
        dataSources: provisionDataPkgs.map((p) =>
          p === "claims_training" ? "Claims Training Dataset" :
          p === "denials_gold" ? "Denials Gold Dataset" :
          "Clinical Notes (PHI)"
        ),
        preloadedTools: ["JupyterLab", "PyTorch", "MLflow"],
        createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastActive: "just now",
        description: provisionJustification || `Sandbox using ${provisionDataPkgs.join(", ")} — awaiting approval`,
        dataPackages: provisionDataPkgs,
      }
      setSandboxes((prev) => [newSb, ...prev])
      setProvisionSuccess(true)

      // Simulate: requested → provisioning (2s)
      setTimeout(() => {
        setSandboxes((prev) => prev.map((s) => s.id === sandboxId ? { ...s, status: "provisioning" } : s))
        // → ready/running (6s)
        setTimeout(() => {
          setSandboxes((prev) => prev.map((s) => s.id === sandboxId ? {
            ...s,
            status: "running",
            cpuUsage: 12,
            memUsage: 22,
            studioUrl: "https://ml.azure.com/demo/studio",
            notebookUrl: "https://ml.azure.com/demo/notebook",
            description: s.description.replace("awaiting approval", "ready"),
          } : s))
        }, 6000)
      }, 2000)
    } catch (err) {
      setProvisionError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setProvisionLoading(false)
    }
  }

  const closeProvision = () => {
    setProvisionOpen(false); setProvisionName(""); setProvisionDesc("")
    setProvisionVmSize("Standard_DS3_v2"); setProvisionError(null)
    setProvisionSuccess(false); setProvisionLoading(false)
    setProvisionTemplate("standard-research"); setProvisionDataPkgs([])
    setProvisionComputeProfile("cpu-medium"); setProvisionDays("14")
    setProvisionCostCenter(""); setProvisionJustification("")
  }

  const openPublishFlow = (sandbox: Sandbox) => {
    setPublishSandbox(sandbox)
    setPublishStage("review")
    setPublishOpen(true)
  }

  const publishAsSpace = () => {
    setPublishStage("publishing")
    setTimeout(() => setPublishStage("published"), 1200)
  }

  const running = sandboxes.filter((s) => s.status === "running" || s.status === "starting").length
  const total = sandboxes.length

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="app-shell-offset flex-1 p-6">

        {/* AML Workspace Banner */}
        {amlConfigured && amlWorkspace && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-2.5">
            <CloudCog className="h-4 w-4 text-violet-400 shrink-0" />
            <span className="text-xs text-violet-300 font-medium">Azure ML Project:</span>
            <code className="text-xs text-violet-200 font-mono">{amlWorkspace}</code>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
        )}
        {!amlConfigured && !isLoading && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5">
            <Info className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300">
              Showing demo data — set{" "}
              <code className="font-mono">AZURE_ML_WORKSPACE=ai-project-q2w5uxlkh4c6o</code> to connect to Azure ML.
            </span>
          </div>
        )}
        {loadError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-300 flex-1 truncate">{loadError}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={fetchCompute}>Retry</Button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20">
              <Code2 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">IMDE Workspace</h1>
              <p className="text-sm text-muted-foreground">
                Secure, production-like sandboxes for AI/ML model development
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("border", running > 0
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-secondary text-muted-foreground border-border"
            )}>
              {running}/{total} Active
            </Badge>
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchCompute} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setManageOpen(true)}>
              <Settings className="h-4 w-4" />
              Manage Compute
            </Button>
            <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setProvisionOpen(true)}>
              <Plus className="h-4 w-4" />
              New Sandbox
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: "Active Sandboxes", value: `${running}`, sub: `of ${total} total`, icon: Code2, color: "text-violet-400" },
            { label: "GPU Instances", value: `${amlComputes.filter((c) => c.isGpu).length || sandboxes.filter((s) => s.gpu).length}`, sub: "GPU compute", icon: Zap, color: "text-amber-400" },
            { label: "Compute Types", value: `${[...new Set(amlComputes.map((c) => c.computeType))].length || 2}`, sub: "in workspace", icon: Server, color: "text-blue-400" },
            { label: "Team Members", value: "12", sub: "collaborators", icon: Users, color: "text-emerald-400" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Sandbox Cards */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {amlConfigured ? `Compute Instances · ${amlWorkspace}` : "Your Sandboxes"}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                Enterprise network isolated · SOC2 compliant
              </div>
            </div>

            {isLoading && sandboxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <span className="text-sm">Loading compute instances from Azure ML…</span>
              </div>
            ) : (
              sandboxes.map((sb) => (
                <Card
                  key={sb.id}
                  className={cn("border-border transition-all hover:border-violet-500/40", sb.status === "stopped" && "opacity-60")}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-semibold font-mono">{sb.name}</CardTitle>
                          <StatusPill status={sb.status} />
                          {(sb.status === "building" || sb.status === "starting" || sb.status === "stopping") && (
                            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                          )}
                        </div>
                        <CardDescription className="text-xs">{sb.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        {pendingAction[sb.id] ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                        ) : sb.status === "running" ? (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={() => handleAction(sb, "stop")}
                            title="Stop compute"
                          >
                            <StopCircle className="h-4 w-4" />
                          </Button>
                        ) : (sb.status === "stopped" || sb.status === "idle") ? (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-emerald-400"
                            onClick={() => handleAction(sb, "start")}
                            title="Start compute"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {(sb.status === "running" || sb.status === "idle") && (
                          <>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                              title="Upgrade compute profile"
                              onClick={() => { setUpgradeSandbox(sb); setUpgradeOpen(true) }}
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-blue-400"
                              title="Extend sandbox expiry"
                              onClick={() => { setExtendSandbox(sb); setExtendOpen(true) }}
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {sb.studioUrl && (
                          <a href={sb.studioUrl} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Open in Azure ML Studio">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {sb.notebookUrl && (
                          <a href={sb.notebookUrl} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-300" title="Open Notebook">
                              <NotebookPen className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" />{sb.cpu} vCPU</span>
                      <span className="flex items-center gap-1"><MemoryStick className="h-3.5 w-3.5" />{sb.memoryGb} GB RAM</span>
                      {sb.gpu && <span className="flex items-center gap-1 text-amber-400"><Zap className="h-3.5 w-3.5" />{sb.gpu}</span>}
                      <span className="flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" />{sb.storageGb} GB</span>
                    </div>
                    {sb.status !== "stopped" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">CPU</span>
                            <span className="text-foreground">{sb.cpuUsage}%</span>
                          </div>
                          <Progress value={sb.cpuUsage} className="h-1.5" />
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">Memory</span>
                            <span className="text-foreground">{sb.memUsage}%</span>
                          </div>
                          <Progress value={sb.memUsage} className="h-1.5" />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {sb.dataSources.map((ds) => (
                        <span key={ds} className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400 border border-blue-500/20">
                          <Database className="h-2.5 w-2.5" />{ds}
                        </span>
                      ))}
                    </div>
                    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
                            <Brain className="h-3.5 w-3.5" />
                            Publish trained agent as Space
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Create a chat-only snapshot teammates can try without opening this sandbox.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 gap-1.5 text-xs"
                          onClick={() => openPublishFlow(sb)}
                          disabled={sb.status === "stopped" || sb.status === "building"}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Publish as Space
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                      <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /><span>{sb.team.join(", ")}</span></div>
                      <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /><span>{sb.lastActive}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  Enterprise Data Sources
                </CardTitle>
                <CardDescription className="text-xs">Securely mirrored — no direct prod access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: "Claims Database", type: "SQL", status: "connected", freshness: "15 min lag" },
                  { name: "ERA/835 Feed", type: "Streaming", status: "connected", freshness: "Real-time" },
                  { name: "Clinical Notes", type: "Blob", status: "connected", freshness: "Daily" },
                  { name: "ICD-10-CM Ref", type: "Static", status: "connected", freshness: "Quarterly" },
                  { name: "Payer Rules Engine", type: "API", status: "connected", freshness: "On-demand" },
                  { name: "Auth DB (prod)", type: "SQL", status: "connected", freshness: "1 hr lag" },
                  { name: "Billing Transactions", type: "SQL", status: "connected", freshness: "Daily" },
                  { name: "Provider Encounters", type: "SQL", status: "pending", freshness: "Setup needed" },
                ].map((ds) => (
                  <div key={ds.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-1.5 w-1.5 rounded-full", ds.status === "connected" ? "bg-emerald-400" : "bg-amber-400")} />
                      <span className="text-foreground font-medium">{ds.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{ds.freshness}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">{ds.type}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-violet-400" />
                  Pre-Loaded Tool Stack
                </CardTitle>
                <CardDescription className="text-xs">Available in every new sandbox</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {toolPresets.map((preset) => (
                  <div key={preset.category}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded", preset.bg)}>
                        <preset.icon className={cn("h-3 w-3", preset.color)} />
                      </span>
                      <span className="text-xs font-medium text-foreground">{preset.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pl-7">
                      {preset.tools.map((t) => (
                        <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Sandbox Security</span>
                </div>
                {["VNet-isolated per sandbox", "No direct prod DB access", "Data masking enforced",
                  "Audit log on all data reads", "MFA + RBAC scoped access", "SOC2 Type II compliant"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Publish as Space Dialog ────────────────────────────────────── */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-400" />
              Publish IMDE sandbox as Space
            </DialogTitle>
            <DialogDescription>
              Demo flow: review a chat-only agent snapshot, run eligibility checks, and publish a tenant-visible Space.
            </DialogDescription>
          </DialogHeader>

          {publishSandbox && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Denial Risk Copilot Space</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Source sandbox: {publishSandbox.name} · Snapshot: snapshot-v1.2.0
                    </div>
                  </div>
                  <Badge className="bg-violet-500/20 text-violet-200 border-violet-500/30">Team visibility</Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Chat-only definition", "No files or notebooks exposed to visitors"],
                  ["PHI/secret scan", "Instructions and metadata pass demo checks"],
                  ["Snapshot boundary", "Data, credentials, and runtime threads excluded"],
                  ["Budget guardrail", "250k daily token cap with 80% publisher alert"],
                ].map(([label, description]) => (
                  <div key={label} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                  </div>
                ))}
              </div>

              {publishStage === "publishing" && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-violet-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating, snapshotting, provisioning runtime, and indexing Space...
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
              )}

              {publishStage === "published" && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-semibold text-emerald-200">Space published</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Teammates can now run the chat-only Space from the marketplace and seed their own sandbox from the sanitized snapshot.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {publishStage === "published" ? (
              <a href="/marketplace/spaces/denial-risk-copilot">
                <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                  <ExternalLink className="h-4 w-4" />
                  Open Space
                </Button>
              </a>
            ) : (
              <Button onClick={publishAsSpace} disabled={publishStage === "publishing"} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                {publishStage === "publishing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {publishStage === "publishing" ? "Publishing..." : "Publish Space"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Compute Dialog ─────────────────────────────────────── */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudCog className="h-5 w-5 text-violet-400" />
              Manage Compute · {amlWorkspace ?? "ai-project-q2w5uxlkh4c6o"}
            </DialogTitle>
            <DialogDescription>
              All compute instances and clusters in the Azure ML workspace. Start, stop, or delete resources.
            </DialogDescription>
          </DialogHeader>

          {!amlConfigured ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CloudCog className="h-8 w-8 mx-auto mb-3 opacity-40" />
              Azure ML workspace not configured.
              <br />
              Set <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded ml-1">
                AZURE_ML_WORKSPACE=ai-project-q2w5uxlkh4c6o
              </code>
            </div>
          ) : amlComputes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isLoading ? <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" /> : null}
              {isLoading ? "Loading computes…" : "No compute resources found in workspace."}
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {amlComputes.map((c) => {
                const status = amlStateToSandboxStatus(c.state, c.provisioningState)
                const matchedSb = sandboxes.find((s) => s.amlName === c.name)
                return (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium truncate">{c.name}</span>
                        <StatusPill status={status} />
                        <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                          {c.computeType === "ComputeInstance" ? "Instance" : c.computeType === "AmlCompute" ? "Cluster" : c.computeType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{c.vmSize}</span>
                        <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{c.cpuCores ?? "?"} vCPU</span>
                        <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{c.memoryGb ?? "?"} GB</span>
                        {c.isGpu && <span className="text-amber-400 flex items-center gap-1"><Zap className="h-3 w-3" />{c.gpuSpec}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      {(status === "stopped" || status === "idle") ? (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                          onClick={() => matchedSb && handleAction(matchedSb, "start")}>
                          <Play className="h-3 w-3" />Start
                        </Button>
                      ) : status === "running" ? (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-orange-400 hover:text-orange-300"
                          onClick={() => matchedSb && handleAction(matchedSb, "stop")}>
                          <StopCircle className="h-3 w-3" />Stop
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-blue-400"
                        onClick={() => matchedSb && handleAction(matchedSb, "restart")}>
                        <RotateCcw className="h-3 w-3" />Restart
                      </Button>
                      {c.studioUrl && (
                        <a href={c.studioUrl} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3 w-3" />Studio
                          </Button>
                        </a>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-red-400"
                        onClick={() => handleDelete(c.name)}>
                        <Trash2 className="h-3 w-3" />Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={fetchCompute} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Refresh
            </Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              onClick={() => { setManageOpen(false); setProvisionOpen(true) }}>
              <Plus className="h-3.5 w-3.5" />New Compute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Sandbox / Provision Dialog ────────────────────────────── */}
      <Dialog open={provisionOpen} onOpenChange={(o) => { if (!o) closeProvision(); else setProvisionOpen(true) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-400" />
              Request New Sandbox
            </DialogTitle>
            <DialogDescription>
              Submit a governed sandbox request. Auto-approved for standard templates; GPU and restricted sandboxes require manager approval.
            </DialogDescription>
          </DialogHeader>

          {provisionSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium">Sandbox requested!</p>
              <p className="text-xs text-muted-foreground">
                <code className="font-mono bg-secondary px-1 rounded">{provisionName}</code> is queued.{" "}
                {provisionComputeProfile === "gpu-small"
                  ? "GPU requests require manager approval — watch for status update."
                  : "Auto-approved — provisioning will start in a few seconds."}
              </p>
              <Button size="sm" onClick={closeProvision}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="compute-name" className="text-xs font-medium">
                  Sandbox Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="compute-name"
                  placeholder="e.g. denial-pred-gpu-01"
                  value={provisionName}
                  onChange={(e) => setProvisionName(e.target.value)}
                  className="font-mono text-sm h-8"
                />
                <p className="text-[10px] text-muted-foreground">Letters, numbers, hyphens. 3–40 chars.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="workspace-template" className="text-xs font-medium">
                  Workspace Template <span className="text-red-400">*</span>
                </Label>
                <Select value={provisionTemplate} onValueChange={setProvisionTemplate}>
                  <SelectTrigger id="workspace-template" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard-research">
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Standard Research</span>
                        <span className="text-xs text-muted-foreground">PyTorch · scikit-learn · JupyterLab · auto-approve</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="restricted-clinical">
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Restricted Clinical</span>
                        <span className="text-xs text-muted-foreground">PHI-capable · VNet-isolated · requires manager approval</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="team-collaboration">
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Team Collaboration</span>
                        <span className="text-xs text-muted-foreground">Shared workspace · multi-user RBAC · auto-approve</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Data Packages <span className="text-red-400">*</span>
                </Label>
                <div className="rounded-lg border border-border p-3 space-y-2">
                  {[
                    { id: "claims_training", name: "Claims Training Dataset", classification: "internal", policy: "auto-approve" },
                    { id: "denials_gold", name: "Denials Gold Dataset", classification: "internal", policy: "standard-review" },
                    { id: "clinical_notes_phi", name: "Clinical Notes (PHI)", classification: "phi", policy: "restricted-review" },
                  ].map((pkg) => (
                    <label key={pkg.id} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={provisionDataPkgs.includes(pkg.id)}
                        onChange={(e) => {
                          setProvisionDataPkgs((prev) =>
                            e.target.checked ? [...prev, pkg.id] : prev.filter((p) => p !== pkg.id)
                          )
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">{pkg.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span className={cn(
                            "rounded-full px-1.5 py-0.5",
                            pkg.classification === "phi" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                          )}>{pkg.classification}</span>
                          <span>·</span>
                          <span>{pkg.policy}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="compute-profile" className="text-xs font-medium">
                    Compute Profile <span className="text-red-400">*</span>
                  </Label>
                  <Select value={provisionComputeProfile} onValueChange={setProvisionComputeProfile}>
                    <SelectTrigger id="compute-profile" className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpu-small">CPU Small — 4 vCPU / 16 GB</SelectItem>
                      <SelectItem value="cpu-medium">CPU Medium — 16 vCPU / 64 GB</SelectItem>
                      <SelectItem value="gpu-small">
                        <span className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-amber-400" />GPU Small — V100 × 1 (approval required)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration-days" className="text-xs font-medium">Duration (days)</Label>
                  <Select value={provisionDays} onValueChange={setProvisionDays}>
                    <SelectTrigger id="duration-days" className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["7", "14", "30", "60", "90"].map((d) => (
                        <SelectItem key={d} value={d}>{d} days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cost-center" className="text-xs font-medium">Cost Center</Label>
                <Input
                  id="cost-center"
                  placeholder="e.g. CC-RCM-RESEARCH"
                  value={provisionCostCenter}
                  onChange={(e) => setProvisionCostCenter(e.target.value)}
                  className="font-mono text-sm h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="justification" className="text-xs font-medium">Business Justification</Label>
                <Input
                  id="justification"
                  placeholder="e.g. Train denial prediction model for Q3 release"
                  value={provisionJustification}
                  onChange={(e) => setProvisionJustification(e.target.value)}
                  className="text-sm h-8"
                />
              </div>

              {provisionComputeProfile === "gpu-small" && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  GPU profile requires manager approval before provisioning starts.
                </div>
              )}
              {provisionDataPkgs.includes("clinical_notes_phi") && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  PHI data requires restricted template and privacy officer review.
                </div>
              )}
              {provisionError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{provisionError}
                </div>
              )}
            </div>
          )}

          {!provisionSuccess && (
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={closeProvision}>Cancel</Button>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                onClick={handleProvision}
                disabled={provisionLoading || !provisionName.trim() || provisionDataPkgs.length === 0}
              >
                {provisionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {provisionLoading ? "Submitting…" : "Submit Request"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {/* ── Upgrade Compute Dialog ────────────────────────────────────── */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-amber-400" />
              Upgrade Compute — {upgradeSandbox?.name}
            </DialogTitle>
            <DialogDescription>
              Select a higher compute profile. Upgrade is applied in-place; running jobs are paused then resumed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={upgradeProfile} onValueChange={setUpgradeProfile}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpu-medium">CPU Medium — 16 vCPU / 64 GB</SelectItem>
                <SelectItem value="gpu-small">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-amber-400" />GPU Small — V100 × 1
                  </span>
                </SelectItem>
                <SelectItem value="gpu-large">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-amber-400" />GPU Large — A100 × 2
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              <Info className="h-3.5 w-3.5 shrink-0" />
              GPU upgrades require manager approval. Estimated downtime: ~3 min.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                setUpgradeOpen(false)
                setSandboxes((prev) => prev.map((s) =>
                  s.id === upgradeSandbox?.id
                    ? { ...s, status: "requested" as const, description: `${s.description} (upgrade requested)` }
                    : s
                ))
              }}>
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Request Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Extend Sandbox Dialog ─────────────────────────────────────── */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-blue-400" />
              Extend Sandbox — {extendSandbox?.name}
            </DialogTitle>
            <DialogDescription>
              Extend the expiry of this sandbox. Extensions up to 30 days are auto-approved; longer periods require manager sign-off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Additional Days</Label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["7", "14", "30", "60"].map((d) => (
                    <SelectItem key={d} value={d}>{d} days{Number(d) > 30 ? " (approval required)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {Number(extendDays) > 30 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Extensions beyond 30 days require manager approval.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setExtendOpen(false)
              }}>
              <CalendarPlus className="h-3.5 w-3.5" />
              Extend {extendDays} Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
