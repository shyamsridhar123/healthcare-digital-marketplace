export type AssetType = "agent" | "mcp-server" | "mcp-tool" | "model" | "workflow-template" | "space"

export type AssetCategory = 
  | "All Categories"
  | "AI Agents"
  | "MCP Servers"
  | "MCP Tools"
  | "Models"
  | "Workflow Templates"
  | "Analytics"
  | "Authentication"
  | "Data Processing"
  | "DevTools"
  | "Security"
  | "Storage"

export interface Asset {
  id: string
  name: string
  description: string
  summary: string // Short capability summary
  type: AssetType
  category: string
  publisher: string
  publisherVerified: boolean
  version: string
  downloads: number
  rating: number
  tags: string[]
  pricing: "Free" | "Starter" | "Pro" | "Enterprise"
  icon: string
  lastUpdated: string
  publishedDate: string // Initial publish date
  orchestrationUsage: number // Number of orchestrations/projects using this asset
  capabilities: string[] // List of key capabilities
  installCommand?: string
  invocation?: string
  uiHref?: string
  docsHref?: string
}

export type SpaceRuntimeState =
  | "sleeping"
  | "waking"
  | "live"
  | "capacity-unavailable"
  | "budget-exhausted"
  | "access-revoked"

export interface SpaceDemo {
  id: string
  assetId: string
  name: string
  description: string
  publisher: string
  sourceSandbox: string
  snapshotVersion: string
  snapshotHash: string
  visibility: "Team" | "Org"
  runtimeState: SpaceRuntimeState
  runCount: number
  likeCount: number
  dailyTokenBudget: number
  usedTokens: number
  model: string
  dataRefs: string[]
  guardrails: string[]
  examplePrompts: string[]
  seededSandboxName: string
  updatedAt: string
}

export type WorkflowNodeType =
  | "start"
  | "trigger"      // legacy alias for "start"
  | "agent"
  | "tool"
  | "condition"
  | "fan-out"
  | "fan-in"
  | "loop"
  | "approval"
  | "transform"
  | "end"
  | "output"       // legacy alias for "end"

export interface WorkflowNodeConfig {
  // start / trigger
  triggerType?: "http" | "schedule" | "event" | "manual"
  inputSchema?: string
  // agent
  agentId?: string
  modelId?: string
  systemPrompt?: string
  selectedToolIds?: string[]
  temperature?: number
  maxTokens?: number
  // tool
  toolId?: string
  params?: Record<string, string>
  // condition
  conditionExpression?: string
  trueBranchLabel?: string
  falseBranchLabel?: string
  // fan-out
  fanOutStrategy?: "parallel" | "round-robin"
  branches?: number
  // fan-in
  joinStrategy?: "all" | "any" | "first"
  joinTimeout?: number
  // loop
  loopCondition?: string
  maxIterations?: number
  loopVariable?: string
  // approval
  approvalMessage?: string
  timeoutMinutes?: number
  approverRole?: string
  onReject?: "abort" | "retry" | "skip"
  // transform
  transformExpression?: string
  inputFormat?: string
  outputFormat?: string
  // end
  endOutputFormat?: "json" | "text" | "markdown"
  successMessage?: string
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    icon?: string
    config?: WorkflowNodeConfig
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
  edgeType?: "default" | "true" | "false" | "loop" | "fan"
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: "draft" | "pending-approval" | "approved" | "deployed"
  createdAt: string
  updatedAt: string
}

export interface DeploymentConfig {
  environment: "development" | "staging" | "production"
  region: string
  scaling: {
    minInstances: number
    maxInstances: number
  }
  policies: string[]
}

// ── Azure AI Foundry Model Card types ─────────────────────────────────────────

export interface EvaluationMetric {
  name: string        // e.g. "Groundedness", "Relevance", "Coherence", "Fluency"
  score: number       // 0–5 scale
  maxScore: number    // typically 5
  description: string
}

export interface SafetyMetric {
  category: string    // "Hate & Unfairness", "Violence", "Sexual Content", "Self-Harm"
  severity: "none" | "low" | "medium" | "high"
  defectRate: number  // 0–1 fraction
}

export interface BenchmarkResult {
  name: string        // e.g. "MedQA", "PubMedQA", "USMLE"
  score: number       // 0–100
  dataset: string
  date: string
}

export interface ModelCardData {
  modelId: string
  foundryModelId?: string       // Azure AI Foundry evaluation run target (e.g. "gpt-4o")
  architecture?: string          // e.g. "Transformer, 7B params"
  trainingDataCutoff?: string    // e.g. "September 2024"
  license?: string               // e.g. "Microsoft Research License"
  intendedUse?: string[]
  outOfScope?: string[]
  evaluationMetrics: EvaluationMetric[]
  safetyMetrics: SafetyMetric[]
  benchmarks: BenchmarkResult[]
  limitations?: string[]
  evaluatedAt?: string           // ISO date from Foundry run
  evaluationRunId?: string       // Foundry evaluation run ID
  source: "foundry" | "mock"     // indicates whether data came from live Foundry or fallback
}

// Sandbox Workspace types

export type SandboxStatus =
  | "requested"
  | "approved"
  | "provisioning"
  | "ready"
  | "suspended"
  | "expired"
  | "retired"
  | "failed"

export type SandboxType = "personal" | "team" | "restricted"

export type ComputeProfile = "cpu-small" | "cpu-medium" | "gpu-small"

export type DataClassification = "internal" | "restricted" | "phi"

export interface SandboxLaunchUrls {
  studio: string
  notebook: string
}

export interface SandboxWorkspace {
  id: string
  sandboxId: string
  name: string
  description?: string
  tenantId: string
  ownerId: string
  projectId?: string
  workspaceTemplateId: string
  sandboxType: SandboxType
  dataPackages: string[]
  computeProfile: ComputeProfile
  status: SandboxStatus
  expiresAt: string
  costCenter?: string
  businessJustification?: string
  launchUrls?: SandboxLaunchUrls
  policyProfile: "standard" | "restricted"
  amlWorkspaceId?: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface SandboxTemplate {
  id: string
  name: string
  description: string
  sandboxType: SandboxType
  computeProfiles: ComputeProfile[]
  defaultComputeProfile: ComputeProfile
  defaultDurationDays: number
  maxDurationDays: number
  policyProfile: "standard" | "restricted"
  requiresApproval: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface AmlDataAsset {
  name: string
  version: string
}

export interface DataPackage {
  id: string
  dataPackageId: string
  version: string
  displayName: string
  description: string
  classification: DataClassification
  amlDataAsset: AmlDataAsset
  allowedSandboxTypes: SandboxType[]
  approvalPolicy: "standard-review" | "restricted-review" | "auto-approve"
  starterNotebook?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface SandboxLifecycleEvent {
  id: string
  sandboxId: string
  tenantId: string
  action: string
  actorId: string
  actorType: "user" | "system"
  details?: Record<string, unknown>
  outcome: "success" | "failure" | "partial"
  timestamp: string
}

export type { RegistrySkill } from "../src/lib/types";
