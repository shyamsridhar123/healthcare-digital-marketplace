"use client"

import { useState, useCallback, useEffect } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { WorkflowCanvas } from "@/components/orchestration/workflow-canvas"
import { NodePaletteItem, WorkflowTemplateCard, AssetQuickAdd, PALETTE_SECTIONS, WorkflowTemplate } from "@/components/orchestration/workflow-node"
import { PropertiesPanel } from "@/components/orchestration/properties-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { WorkflowNode, WorkflowEdge, WorkflowNodeConfig, WorkflowNodeType } from "@/lib/types"
import {
  Save,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Plus,
  ChevronRight,
  GitBranch,
  ChevronsRight,
  Merge,
  RefreshCw,
  UserCheck,
  Bot,
  Layers,
  FileCode2,
  Zap,
  CheckCircle2,
  X,
  PanelLeft,
  PanelRight,
  Settings2,
  Shapes,
  LayoutTemplate,
  Package,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { assets } from "@/lib/mock-data"

/* ── Workflow Templates ─────────────────────────────────────────────────── */

const TEMPLATES: WorkflowTemplate[] = [
  {
    id: "tmpl-sequential",
    name: "Sequential Agent Chain",
    description: "Three agents running one after the other, each building on the previous output.",
    icon: Bot,
    tags: ["chain", "sequential", "basic"],
    nodes: [
      { id: "t-s1", type: "start", position: { x: 80, y: 200 }, data: { label: "HTTP Trigger", description: "Receives engagement packet" } },
      { id: "t-a1", type: "agent", position: { x: 320, y: 200 }, data: { label: "ControlTester", description: "Verify compliance requirements" } },
      { id: "t-a2", type: "agent", position: { x: 560, y: 200 }, data: { label: "TaxArchitect", description: "Validate tax/cost classifications" } },
      { id: "t-a3", type: "agent", position: { x: 800, y: 200 }, data: { label: "LedgerSentinel", description: "Submit to regulator portal" } },
      { id: "t-e1", type: "end", position: { x: 1040, y: 200 }, data: { label: "Engagement Submitted", description: "Regulatory tracking started" } },
    ],
    edges: [
      { id: "te1", source: "t-s1", target: "t-a1" },
      { id: "te2", source: "t-a1", target: "t-a2" },
      { id: "te3", source: "t-a2", target: "t-a3" },
      { id: "te4", source: "t-a3", target: "t-e1" },
    ],
  },
  {
    id: "tmpl-condition",
    name: "Conditional Branch (If/Else)",
    description: "Routes transaction testing to findings review or direct completion based on quality checks.",
    icon: GitBranch,
    tags: ["condition", "if/else", "routing"],
    nodes: [
      { id: "c-s1", type: "start", position: { x: 80, y: 220 }, data: { label: "Start", description: "Receive transaction sample" } },
      { id: "c-a1", type: "agent", position: { x: 300, y: 220 }, data: { label: "AuditScribe", description: "Check transaction evidence quality" } },
      { id: "c-c1", type: "condition", position: { x: 530, y: 220 }, data: { label: "Ready for Sign-off?", description: "confidence >= 0.9", config: { conditionExpression: "output.ready === true", trueBranchLabel: "Ready", falseBranchLabel: "Review" } } },
      { id: "c-a2", type: "agent", position: { x: 770, y: 120 }, data: { label: "Submit Agent", description: "Direct regulator submission" } },
      { id: "c-a3", type: "agent", position: { x: 770, y: 320 }, data: { label: "Exception Agent", description: "Route for findings review" } },
      { id: "c-e1", type: "end", position: { x: 1000, y: 220 }, data: { label: "Done", description: "Engagement item handled" } },
    ],
    edges: [
      { id: "ce1", source: "c-s1", target: "c-a1" },
      { id: "ce2", source: "c-a1", target: "c-c1" },
      { id: "ce3", source: "c-c1", target: "c-a2", label: "Ready", edgeType: "true" },
      { id: "ce4", source: "c-c1", target: "c-a3", label: "Review", edgeType: "false" },
      { id: "ce5", source: "c-a2", target: "c-e1" },
      { id: "ce6", source: "c-a3", target: "c-e1" },
    ],
  },
  {
    id: "tmpl-fanout",
    name: "Fan-Out / Fan-In (Parallel)",
    description: "Dispatches work to 3 specialist agents in parallel then aggregates results — Microsoft Semantic Kernel concurrent agent pattern.",
    icon: ChevronsRight,
    tags: ["fan-out", "fan-in", "parallel", "Semantic Kernel"],
    nodes: [
      { id: "fo-s1", type: "start", position: { x: 60, y: 240 }, data: { label: "Start", description: "Financial packet ingested" } },
      { id: "fo-fo", type: "fan-out", position: { x: 280, y: 220 }, data: { label: "Dispatch", description: "Parallel analysis", config: { branches: 3, fanOutStrategy: "parallel" } } },
      { id: "fo-a1", type: "agent", position: { x: 510, y: 80 }, data: { label: "TaxArchitect", description: "Cost classification extraction" } },
      { id: "fo-a2", type: "agent", position: { x: 510, y: 220 }, data: { label: "Compliance Agent", description: "Regulator rule validation" } },
      { id: "fo-a3", type: "agent", position: { x: 510, y: 360 }, data: { label: "Pricing Agent", description: "Fee schedule lookup" } },
      { id: "fo-fi", type: "fan-in", position: { x: 740, y: 220 }, data: { label: "Aggregate", description: "Merge analysis", config: { joinStrategy: "all", joinTimeout: 120 } } },
      { id: "fo-a4", type: "agent", position: { x: 960, y: 220 }, data: { label: "Synthesis Agent", description: "Build final engagement memo" } },
      { id: "fo-e1", type: "end", position: { x: 1180, y: 220 }, data: { label: "Memo Ready", description: "Ready for submission" } },
    ],
    edges: [
      { id: "foe1", source: "fo-s1", target: "fo-fo" },
      { id: "foe2", source: "fo-fo", target: "fo-a1", label: "B1", edgeType: "fan" },
      { id: "foe3", source: "fo-fo", target: "fo-a2", label: "B2", edgeType: "fan" },
      { id: "foe4", source: "fo-fo", target: "fo-a3", label: "B3", edgeType: "fan" },
      { id: "foe5", source: "fo-a1", target: "fo-fi", edgeType: "fan" },
      { id: "foe6", source: "fo-a2", target: "fo-fi", edgeType: "fan" },
      { id: "foe7", source: "fo-a3", target: "fo-fi", edgeType: "fan" },
      { id: "foe8", source: "fo-fi", target: "fo-a4" },
      { id: "foe9", source: "fo-a4", target: "fo-e1" },
    ],
  },
  {
    id: "tmpl-loop",
    name: "Loop with Approval Gate",
    description: "Iterates over transaction samples, processes each, then gates on engagement review before final submission.",
    icon: RefreshCw,
    tags: ["loop", "approval", "human-in-the-loop"],
    nodes: [
      { id: "lp-s1", type: "start", position: { x: 60, y: 200 }, data: { label: "Start", description: "Transaction batch received" } },
      { id: "lp-lp", type: "loop", position: { x: 270, y: 200 }, data: { label: "Process Each Transaction", description: "Iterate batch", config: { loopCondition: "items.length > 0", maxIterations: 100, loopVariable: "transactions" } } },
      { id: "lp-a1", type: "agent", position: { x: 500, y: 200 }, data: { label: "Processing Agent", description: "Validate and classify transaction" } },
      { id: "lp-ap", type: "approval", position: { x: 730, y: 200 }, data: { label: "Engagement Review", description: "Human approval gate", config: { approvalMessage: "Review classified batch before submission", approverRole: "engagement-manager", timeoutMinutes: 90, onReject: "retry" } } },
      { id: "lp-e1", type: "end", position: { x: 950, y: 200 }, data: { label: "Batch Finalized", description: "All transactions queued" } },
    ],
    edges: [
      { id: "lpe1", source: "lp-s1", target: "lp-lp" },
      { id: "lpe2", source: "lp-lp", target: "lp-a1", label: "next", edgeType: "loop" },
      { id: "lpe3", source: "lp-a1", target: "lp-lp", label: "iterate", edgeType: "loop" },
      { id: "lpe4", source: "lp-lp", target: "lp-ap", label: "done" },
      { id: "lpe5", source: "lp-ap", target: "lp-e1", label: "approved" },
    ],
  },
  {
    id: "tmpl-sox-controls",
    name: "SOX Controls Testing",
    description: "End-to-end engagement delivery: compliance verification → parallel classification and testing → condition gate → approval → submit.",
    icon: Layers,
    tags: ["engagement-delivery", "fan-out", "condition", "approval", "full"],
    nodes: [
      { id: "r-s1", type: "start", position: { x: 60, y: 270 }, data: { label: "Control Event", description: "From SAP/Oracle ERP" } },
      { id: "r-t1", type: "tool", position: { x: 270, y: 270 }, data: { label: "Compliance Check", description: "ERP MCP" } },
      { id: "r-fo", type: "fan-out", position: { x: 490, y: 250 }, data: { label: "Parallel Analysis", description: "Concurrent checks", config: { branches: 2, fanOutStrategy: "parallel" } } },
      { id: "r-a1", type: "agent", position: { x: 710, y: 140 }, data: { label: "TaxArchitect", description: "Tax/cost classification" } },
      { id: "r-a2", type: "agent", position: { x: 710, y: 340 }, data: { label: "AuditScribe", description: "Evidence quality check" } },
      { id: "r-fi", type: "fan-in", position: { x: 930, y: 250 }, data: { label: "Merge Results", description: "Combine analyses", config: { joinStrategy: "all" } } },
      { id: "r-c1", type: "condition", position: { x: 1140, y: 250 }, data: { label: "Ready to Submit?", description: "Ready & coded", config: { conditionExpression: "output.coded && output.clean", trueBranchLabel: "Submit", falseBranchLabel: "Review" } } },
      { id: "r-ap", type: "approval", position: { x: 1360, y: 360 }, data: { label: "Manual Review", description: "Engagement team gate" } },
      { id: "r-a3", type: "agent", position: { x: 1360, y: 150 }, data: { label: "Submit Agent", description: "To regulator portal" } },
      { id: "r-e1", type: "end", position: { x: 1580, y: 250 }, data: { label: "Done", description: "Regulatory tracking active" } },
    ],
    edges: [
      { id: "re1", source: "r-s1", target: "r-t1" },
      { id: "re2", source: "r-t1", target: "r-fo" },
      { id: "re3", source: "r-fo", target: "r-a1", label: "B1", edgeType: "fan" },
      { id: "re4", source: "r-fo", target: "r-a2", label: "B2", edgeType: "fan" },
      { id: "re5", source: "r-a1", target: "r-fi", edgeType: "fan" },
      { id: "re6", source: "r-a2", target: "r-fi", edgeType: "fan" },
      { id: "re7", source: "r-fi", target: "r-c1" },
      { id: "re8", source: "r-c1", target: "r-a3", label: "Submit", edgeType: "true" },
      { id: "re9", source: "r-c1", target: "r-ap", label: "Review", edgeType: "false" },
      { id: "re10", source: "r-ap", target: "r-a3", label: "approved" },
      { id: "re11", source: "r-a3", target: "r-e1" },
    ],
  },
]

/* ── Page Component ─────────────────────────────────────────────────────── */

type LeftTab = "components" | "templates" | "assets"

export default function OrchestrationPage() {
  const [workflowName, setWorkflowName] = useState("Untitled Workflow")
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<LeftTab>("templates")
  const [saved, setSaved] = useState(false)
  const [isBuilderPanelCollapsed, setIsBuilderPanelCollapsed] = useState(false)
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false)

  /* ── Keyboard handlers ─────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConnectSourceId(null)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode && e.target === document.body) {
        handleDeleteNode(selectedNode)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode])

  /* ── Node CRUD ─────────────────────────────────────────────────────────── */

  const handleAddNode = useCallback(
    (type: WorkflowNodeType, position: { x: number; y: number }) => {
      const meta = type
      const defaultLabels: Record<string, string> = {
        start: "Start", trigger: "Start", end: "End", output: "End",
        agent: "AI Agent", tool: "MCP Tool", condition: "If / Else",
        "fan-out": "Fan-Out", "fan-in": "Fan-In",
        loop: "Loop", approval: "Approval Gate", transform: "Transform",
      }
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const newNode: WorkflowNode = {
        id,
        type,
        position,
        data: { label: defaultLabels[type] ?? "Node", config: {} },
      }
      setNodes((prev) => [...prev, newNode])
      setSelectedNode(id)
    },
    [],
  )

  const handleAddAssetNode = useCallback(
    (assetId: string, assetType: "agent" | "tool", position: { x: number; y: number }) => {
      const asset = assets.find((a) => a.id === assetId)
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const newNode: WorkflowNode = {
        id,
        type: assetType,
        position,
        data: {
          label: asset?.name ?? assetType,
          description: asset?.summary,
          config: assetType === "agent" ? { agentId: assetId } : { toolId: assetId },
        },
      }
      setNodes((prev) => [...prev, newNode])
      setSelectedNode(id)
    },
    [],
  )

  const handleUpdateNodePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)))
    },
    [],
  )

  const handleUpdateNodeData = useCallback(
    (id: string, data: Partial<WorkflowNode["data"]>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
      )
    },
    [],
  )

  const handleUpdateConfig = useCallback(
    (id: string, configPatch: Partial<WorkflowNodeConfig>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, config: { ...(n.data.config ?? {}), ...configPatch } } }
            : n,
        ),
      )
    },
    [],
  )

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id))
    setSelectedNode(null)
  }, [])

  /* ── Edge CRUD ─────────────────────────────────────────────────────────── */

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId))
  }, [])

  /* ── Connect mode ──────────────────────────────────────────────────────── */

  const handleConnectorClick = useCallback(
    (nodeId: string, port: "in" | "out") => {
      if (!connectSourceId) {
        // Start connection from this node's output
        if (port === "out") setConnectSourceId(nodeId)
        else setConnectSourceId(nodeId) // allow clicking input to start too
      } else if (connectSourceId === nodeId) {
        setConnectSourceId(null)
      } else {
        // Create edge: source → target
        const source = port === "in" ? connectSourceId : nodeId
        const target = port === "in" ? nodeId : connectSourceId
        const sourceNode = nodes.find((n) => n.id === source)
        const targetNode = nodes.find((n) => n.id === target)

        // Determine edge type from source node type
        let edgeType: WorkflowEdge["edgeType"] = "default"
        if (sourceNode?.type === "fan-out") edgeType = "fan"
        else if (targetNode?.type === "fan-in") edgeType = "fan"
        else if (sourceNode?.type === "loop") edgeType = "loop"

        const existingEdge = edges.find((e) => e.source === source && e.target === target)
        if (!existingEdge) {
          setEdges((prev) => [
            ...prev,
            { id: `e-${Date.now()}`, source, target, edgeType },
          ])
        }
        setConnectSourceId(null)
      }
    },
    [connectSourceId, edges, nodes],
  )

  /* ── Templates ─────────────────────────────────────────────────────────── */

  const handleLoadTemplate = useCallback((tmpl: WorkflowTemplate) => {
    setNodes(tmpl.nodes)
    setEdges(tmpl.edges)
    setWorkflowName(tmpl.name)
    setSelectedNode(null)
    setConnectSourceId(null)
    setLeftTab("components")
  }, [])

  /* ── Pattern shortcuts ─────────────────────────────────────────────────── */

  const addPattern = useCallback(
    (pattern: "condition" | "fanout" | "loop" | "approval") => {
      const id = () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const baseX = 200 + nodes.length * 30
      const baseY = 200

      if (pattern === "condition") {
        const c = id(), t = id(), f = id()
        setNodes((prev) => [
          ...prev,
          { id: c, type: "condition", position: { x: baseX, y: baseY }, data: { label: "If / Else", config: { conditionExpression: "", trueBranchLabel: "True", falseBranchLabel: "False" } } },
          { id: t, type: "agent", position: { x: baseX + 250, y: baseY - 100 }, data: { label: "True Branch Agent" } },
          { id: f, type: "agent", position: { x: baseX + 250, y: baseY + 100 }, data: { label: "False Branch Agent" } },
        ])
        setEdges((prev) => [
          ...prev,
          { id: `e-${Date.now()}a`, source: c, target: t, label: "True", edgeType: "true" as const },
          { id: `e-${Date.now()}b`, source: c, target: f, label: "False", edgeType: "false" as const },
        ])
      }

      if (pattern === "fanout") {
        const fo = id(), a1 = id(), a2 = id(), a3 = id(), fi = id()
        setNodes((prev) => [
          ...prev,
          { id: fo, type: "fan-out", position: { x: baseX, y: baseY }, data: { label: "Fan-Out", config: { branches: 3, fanOutStrategy: "parallel" } } },
          { id: a1, type: "agent", position: { x: baseX + 240, y: baseY - 140 }, data: { label: "Agent A" } },
          { id: a2, type: "agent", position: { x: baseX + 240, y: baseY }, data: { label: "Agent B" } },
          { id: a3, type: "agent", position: { x: baseX + 240, y: baseY + 140 }, data: { label: "Agent C" } },
          { id: fi, type: "fan-in", position: { x: baseX + 480, y: baseY }, data: { label: "Fan-In", config: { joinStrategy: "all" } } },
        ])
        setEdges((prev) => [
          ...prev,
          { id: `e-${Date.now()}1`, source: fo, target: a1, label: "B1", edgeType: "fan" as const },
          { id: `e-${Date.now()}2`, source: fo, target: a2, label: "B2", edgeType: "fan" as const },
          { id: `e-${Date.now()}3`, source: fo, target: a3, label: "B3", edgeType: "fan" as const },
          { id: `e-${Date.now()}4`, source: a1, target: fi, edgeType: "fan" as const },
          { id: `e-${Date.now()}5`, source: a2, target: fi, edgeType: "fan" as const },
          { id: `e-${Date.now()}6`, source: a3, target: fi, edgeType: "fan" as const },
        ])
      }

      if (pattern === "loop") {
        const lp = id(), la = id()
        setNodes((prev) => [
          ...prev,
          { id: lp, type: "loop", position: { x: baseX, y: baseY }, data: { label: "Loop", config: { loopCondition: "items.length > 0", maxIterations: 10, loopVariable: "items" } } },
          { id: la, type: "agent", position: { x: baseX + 250, y: baseY }, data: { label: "Loop Body Agent" } },
        ])
        setEdges((prev) => [
          ...prev,
          { id: `e-${Date.now()}1`, source: lp, target: la, label: "next", edgeType: "loop" as const },
          { id: `e-${Date.now()}2`, source: la, target: lp, label: "iterate", edgeType: "loop" as const },
        ])
      }

      if (pattern === "approval") {
        const ap = id()
        setNodes((prev) => [
          ...prev,
          { id: ap, type: "approval", position: { x: baseX, y: baseY }, data: { label: "Approval Gate", config: { approvalMessage: "Please review before proceeding.", approverRole: "manager", timeoutMinutes: 60, onReject: "abort" } } },
        ])
      }
    },
    [nodes],
  )

  /* ── Palette drag ──────────────────────────────────────────────────────── */

  const handlePaletteDragStart = useCallback(
    (e: React.DragEvent, type: WorkflowNodeType) => {
      e.dataTransfer.setData("nodeType", type)
    },
    [],
  )

  const handleAssetDragStart = useCallback(
    (e: React.DragEvent, assetId: string, assetType: "agent" | "tool") => {
      e.dataTransfer.setData("assetId", assetId)
      e.dataTransfer.setData("assetType", assetType)
    },
    [],
  )

  const handleClear = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNode(null)
    setConnectSourceId(null)
  }, [])

  const handleSave = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const selectedNodeData = nodes.find((n) => n.id === selectedNode) ?? null
  const builderTabs: Array<{ key: LeftTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "components", label: "Components", icon: Shapes },
    { key: "templates", label: "Templates", icon: LayoutTemplate },
    { key: "assets", label: "Assets", icon: Package },
  ]

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "app-shell-offset flex shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-out",
          isBuilderPanelCollapsed ? "w-16" : "w-72"
        )}
      >
        <div className={cn("border-b border-border", isBuilderPanelCollapsed ? "px-2 py-3" : "px-3 py-2.5")}>
          <div className={cn("flex items-center", isBuilderPanelCollapsed ? "justify-center" : "justify-between gap-3")}>
            {!isBuilderPanelCollapsed && (
              <div>
                <p className="text-sm font-semibold text-foreground">Agent Builder</p>
                <p className="text-xs text-muted-foreground">Components, templates, and reusable assets</p>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setIsBuilderPanelCollapsed((current) => !current)}
              aria-label={isBuilderPanelCollapsed ? "Expand Agent Builder panel" : "Collapse Agent Builder panel"}
              title={isBuilderPanelCollapsed ? "Expand Agent Builder panel" : "Collapse Agent Builder panel"}
            >
              <PanelLeft className={cn("h-4 w-4 transition-transform", isBuilderPanelCollapsed && "rotate-180")} />
            </Button>
          </div>
        </div>

        {isBuilderPanelCollapsed ? (
          <div className="flex flex-1 flex-col items-center gap-2 p-2">
            {builderTabs.map((tab) => (
              <Tooltip key={tab.key}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={leftTab === tab.key ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setLeftTab(tab.key)
                      setIsBuilderPanelCollapsed(false)
                    }}
                    aria-label={`Open ${tab.label} panel`}
                  >
                    <tab.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>{tab.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          <>
            <div className="flex border-b border-border">
              {builderTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium transition-colors",
                    leftTab === tab.key
                      ? "border-b-2 border-accent text-accent"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setLeftTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {leftTab === "components" && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Add Pattern
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: "condition" as const, label: "If / Else", icon: GitBranch, color: "text-orange-400" },
                        { key: "fanout" as const, label: "Fan-Out/In", icon: ChevronsRight, color: "text-cyan-400" },
                        { key: "loop" as const, label: "Loop", icon: RefreshCw, color: "text-purple-400" },
                        { key: "approval" as const, label: "Approval", icon: UserCheck, color: "text-amber-400" },
                      ].map(({ key, label, icon: Icon, color }) => (
                        <button
                          key={key}
                          onClick={() => addPattern(key)}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                        >
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {PALETTE_SECTIONS.map((section) => (
                    <div key={section.title}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {section.title}
                      </p>
                      <div className="space-y-1.5">
                        {section.nodes.map((n) => (
                          <NodePaletteItem
                            key={n.type}
                            type={n.type}
                            label={n.label}
                            description={n.description}
                            onDragStart={handlePaletteDragStart}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {leftTab === "templates" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Click a template to load it into the canvas. Replaces current workflow.
                  </p>
                  {TEMPLATES.map((t) => (
                    <WorkflowTemplateCard key={t.id} template={t} onLoad={handleLoadTemplate} />
                  ))}
                </div>
              )}

              {leftTab === "assets" && (
                <div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Drag an asset onto the canvas to create a pre-configured node.
                  </p>
                  <AssetQuickAdd onDragStart={handleAssetDragStart} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Main Area ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 gap-3 shrink-0">
          {/* Left: name + stats */}
          <div className="flex items-center gap-3 min-w-0">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="h-8 w-52 bg-background text-sm font-medium"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span>{nodes.length} nodes</span>
              <span>·</span>
              <span>{edges.length} edges</span>
              {connectSourceId && (
                <>
                  <span>·</span>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
                    Connect mode — click target
                  </Badge>
                  <button onClick={() => setConnectSourceId(null)} className="ml-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={handleClear}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-1.5 h-8 text-xs transition-colors", saved && "border-green-500 text-green-500")}
              onClick={handleSave}
            >
              {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FileCode2 className="h-3.5 w-3.5" />}
              {saved ? "Saved!" : "Save Draft"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
            >
              <Play className="h-3.5 w-3.5 text-green-400" />
              Test Run
            </Button>
            <Link href="/deployments/new">
              <Button size="sm" className="gap-1.5 h-8 text-xs">
                Deploy
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Canvas + Properties */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 overflow-hidden">
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              connectSourceId={connectSourceId}
              onSelectNode={setSelectedNode}
              onUpdateNode={handleUpdateNodePosition}
              onAddNode={handleAddNode}
              onAddAssetNode={handleAddAssetNode}
              onConnectorClick={handleConnectorClick}
              onDeleteEdge={handleDeleteEdge}
            />
          </div>

          {/* Properties Panel */}
          <aside
            className={cn(
              "shrink-0 overflow-hidden border-l border-border bg-card transition-[width] duration-200 ease-out flex flex-col",
              isPropertiesPanelCollapsed ? "w-14" : "w-[280px]"
            )}
          >
            {isPropertiesPanelCollapsed ? (
              <div className="flex h-full flex-col items-center gap-3 p-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsPropertiesPanelCollapsed(false)}
                      aria-label="Expand properties panel"
                    >
                      <PanelRight className="h-4 w-4 rotate-180" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={8}>Expand properties</TooltipContent>
                </Tooltip>
                <div
                  className="flex w-full flex-1 items-center justify-center rounded-md border border-dashed border-border bg-secondary/20 px-1 text-center text-[10px] font-medium text-muted-foreground"
                  title={selectedNodeData ? `${selectedNodeData.data.label} selected` : "No node selected"}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="[writing-mode:vertical-rl] rotate-180 tracking-[0.2em] uppercase">
                          Props
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={8}>
                        {selectedNodeData ? `Properties: ${selectedNodeData.data.label}` : "No node selected"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Properties</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedNodeData ? `Editing ${selectedNodeData.data.label}` : "Select a node to inspect settings"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsPropertiesPanelCollapsed(true)}
                    aria-label="Collapse properties panel"
                    title="Collapse properties panel"
                  >
                    <PanelRight className="h-4 w-4" />
                  </Button>
                </div>
                <PropertiesPanel
                  node={selectedNodeData}
                  onClose={() => setSelectedNode(null)}
                  onUpdateNode={handleUpdateNodeData}
                  onUpdateConfig={handleUpdateConfig}
                  onDeleteNode={handleDeleteNode}
                />
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
