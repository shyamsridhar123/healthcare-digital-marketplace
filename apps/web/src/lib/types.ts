// ─── Asset types ────────────────────────────────────────────────────────────

export type AssetType =
  | "Agent"
  | "MCP Server"
  | "Model"
  | "Workflow Template"
  | "Evaluator"
  | "Connector";

export type DeploymentMode = "SaaS" | "PaaS";

export type ComplianceTier = "Standard" | "Healthcare" | "Financial" | "Government";

export interface AssetVersion {
  version: string;
  releasedAt: string;
  notes: string;
  isLatest: boolean;
}

export interface Publisher {
  id: string;
  name: string;
  verified: boolean;
  logoUrl?: string;
  contactEmail: string;
}

export interface AssetDependency {
  id: string;
  name: string;
  type: AssetType;
  version: string;
  required: boolean;
}

export interface EvaluationResult {
  id: string;
  name: string;
  score: number; // 0–100
  runAt: string;
  model: string;
  passed: boolean;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  description: string;
  publisher: Publisher;
  latestVersion: string;
  versions: AssetVersion[];
  license: string;
  deploymentModes: DeploymentMode[];
  complianceTier: ComplianceTier;
  tags: string[];
  domains: string[];
  dependencies: AssetDependency[];
  evaluations: EvaluationResult[];
  rating: number;
  reviewCount: number;
  deploymentCount: number;
  createdAt: string;
  updatedAt: string;
  verified: boolean;
  riskNotes?: string;
}

export interface AssetListResponse {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Filter types ────────────────────────────────────────────────────────────

export interface AssetFilter {
  type: AssetType | "all";
  tags: string[];
  complianceTier: ComplianceTier | "all";
  deploymentMode: DeploymentMode | "all";
  search: string;
  page?: number;
  pageSize?: number;
}

// ─── Orchestration types ─────────────────────────────────────────────────────

export type WorkflowNodeType =
  | "agent"
  | "tool"
  | "model"
  | "knowledge"
  | "evaluator"
  | "guard"
  | "human"
  | "trigger"
  | "output";

export interface WorkflowNodeData {
  label: string;
  nodeType: WorkflowNodeType;
  assetId?: string;
  assetName?: string;
  config: Record<string, unknown>;
  status?: "idle" | "running" | "completed" | "error";
}

export interface WorkflowEdgeData {
  flowType: "message" | "control" | "data";
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "testing" | "deployed";
  nodes: unknown[];
  edges: unknown[];
}

// ─── Publisher / submission types ────────────────────────────────────────────

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "scanning"
  | "policy-review"
  | "human-review"
  | "approved"
  | "rejected"
  | "published";

export interface AssetSubmission {
  id: string;
  assetId?: string;
  assetName: string;
  publisherId: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

// ─── MCP Registry types ──────────────────────────────────────────────────────

export type McpTransport = "streamable-http" | "sse" | "stdio";
export type McpAuthScheme = "none" | "bearer" | "oauth2" | "api-key";
export type ResourceStatus = "active" | "disabled";
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";
export type SecurityScanStatus = "pending" | "passed" | "failed" | "running" | "error";

export interface McpServerVersion {
  version: string;
  endpointUrl: string;
  registeredAt: string;
  active: boolean;
  deprecated: boolean;
  notes?: string;
}

export interface McpServer {
  id: string;
  name: string;
  description?: string;
  endpointUrl: string;
  transport: McpTransport;
  authScheme: McpAuthScheme;
  tags: string[];
  version: string;
  activeVersion: string;
  versions: McpServerVersion[];
  tenantId: string;
  visibility: "public" | "private" | "group";
  status: ResourceStatus;
  toolsCache: McpTool[];
  toolsCachedAt: string | null;
  healthStatus: HealthStatus;
  lastHealthCheck: string | null;
  consecutiveFailures?: number;
  securityScanStatus: SecurityScanStatus;
  lastSecurityScan: string | null;
  rating: number;
  ratingCount: number;
  registeredAt: string;
  updatedAt: string;
}

export interface McpTool {
  id: string;
  serverId: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  discoveredAt: string;
  server?: Pick<McpServer, "id" | "name" | "status" | "rating">;
}

// ─── A2A Agent types ─────────────────────────────────────────────────────────

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  examples: string[];
  inputModes: string[];
  outputModes: string[];
}

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  url: string;
  documentationUrl?: string;
  provider?: { organization: string; url?: string };
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  authentication: { schemes: string[]; credentials?: string };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentSkill[];
}

export interface A2AAgent {
  id: string;
  agentCard: AgentCard;
  endpointUrl: string;
  authScheme: string;
  tags: string[];
  category?: string;
  tenantId: string;
  visibility: "public" | "private" | "group";
  status: ResourceStatus;
  healthStatus: HealthStatus;
  lastHealthCheck: string | null;
  rating: number;
  ratingCount: number;
  registeredAt: string;
  updatedAt: string;
}

// ─── Skills Registry types ────────────────────────────────────────────────────

export interface RegistrySkill {
  id: string;
  name: string;
  description: string;
  content: string;
  version: string;
  tags: string[];
  category?: string;
  triggerPhrases: string[];
  sourceUrl?: string;
  author?: string;
  license: string;
  tenantId: string;
  visibility: "public" | "private" | "group";
  frontmatter: Record<string, unknown>;
  stars: number;
  starCount: number;
  downloadCount: number;
  registeredAt: string;
  updatedAt: string;
}

// ─── IAM types ───────────────────────────────────────────────────────────────

export interface IamGroupMember {
  id: string;
  type: "user" | "service-account";
  addedAt: string;
}

export interface IamGroup {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  scopes: string[];
  members: IamGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAccount {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  tenantId: string;
  scopes: string[];
  status: "active" | "disabled";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Security Scan types ──────────────────────────────────────────────────────

export type ScanFindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface ScanFinding {
  id: string;
  severity: ScanFindingSeverity;
  category: string;
  title: string;
  description: string;
  remediation?: string;
}

export interface SecurityScan {
  id: string;
  targetId: string;
  targetType: "mcp-server" | "a2a-agent";
  tenantId: string;
  status: SecurityScanStatus;
  score: number;
  findings: ScanFinding[];
  autoDisabled: boolean;
  requestedAt: string;
  completedAt: string | null;
}

// ─── Health Record types ─────────────────────────────────────────────────────

export interface ServerHealthRecord {
  id: string;
  serverId: string;
  targetType: "mcp-server" | "a2a-agent";
  tenantId: string;
  status: HealthStatus;
  latencyMs: number;
  httpStatus: number | null;
  error: string | null;
  checkedAt: string;
}

// ─── Audit Log types ──────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  action: string;
  targetId?: string;
  targetType?: string;
  tenantId: string;
  actorId?: string;
  actorType: "user" | "service-account" | "system";
  details?: Record<string, unknown>;
  outcome: "success" | "failure" | "partial";
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  correlationId?: string;
  toolName?: string;
  timestamp: string;
}

// ─── Metrics types ────────────────────────────────────────────────────────────

export interface ToolUsageStat {
  serverId: string;
  toolName: string;
  calls: number;
  successRate: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface DashboardMetrics {
  tenantId: string;
  activeMcpServers: number;
  activeA2AAgents: number;
  toolCallsLast24h: number;
  successRateLast24h: number;
  topToolsLast24h: { name: string; count: number }[];
  totalAuditEntries24h: number;
}

// ─── Policy Registry types ────────────────────────────────────────────────────

export type PolicyType =
  | "rate-limit"
  | "model-allowlist"
  | "content-filter"
  | "data-access"
  | "compliance"
  | "cost-budget"
  | "human-gate"
  | "custom";

export type PolicyDecisionType = "allow" | "deny" | "transform" | "pending-approval";

export interface PolicyRule {
  maxCalls?: number;
  timeWindowSeconds?: number;
  allowedModels?: string[];
  patterns?: string[];
  allowedSources?: string[];
  detectPii?: boolean;
  piiTypes?: string[];
  maxTokens?: number;
  approvalMessage?: string;
  expression?: string;
}

export interface PolicyScope {
  target: "all" | "agent" | "mcp-server" | "model" | "data-source";
  resourceId?: string;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  type: PolicyType;
  enabled: boolean;
  priority: number;
  scope: PolicyScope;
  rules: PolicyRule[];
  action: PolicyDecisionType;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Orchestration Template types ─────────────────────────────────────────────

export interface TemplateParameter {
  name: string;
  type: "string" | "number" | "boolean" | "agent-id" | "server-id" | "model-id";
  required: boolean;
  default?: unknown;
  description?: string;
}

export interface OrchestrationTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: string;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  parameters: TemplateParameter[];
  defaultPolicyIds: string[];
  tags: string[];
  visibility: "private" | "shared";
  tenantId: string;
  usageCount: number;
  forkedFrom?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Orchestration Execution types ────────────────────────────────────────────

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "policy-denied";

export interface NodePolicyDecision {
  decision: PolicyDecisionType;
  reason?: string;
  appliedPolicies: string[];
}

export interface NodeExecution {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: NodeExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  preDecision?: NodePolicyDecision;
  postDecision?: NodePolicyDecision;
  approvedBy?: string;
  approvedAt?: string;
}

export interface OrchestrationExecution {
  id: string;
  name: string;
  tenantId: string;
  templateId?: string;
  templateName?: string;
  status: ExecutionStatus;
  parameters: Record<string, unknown>;
  appliedPolicyIds: string[];
  nodeExecutions: NodeExecution[];
  policyViolations: number;
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  error?: string;
}

export interface ExecutionSummary {
  id: string;
  name: string;
  tenantId: string;
  templateId?: string;
  templateName?: string;
  status: ExecutionStatus;
  nodeCount: number;
  completedNodes: number;
  policyViolations: number;
  appliedPolicyIds: string[];
  startedAt: string;
  completedAt?: string;
}

// ─── Sandbox Workspace types ─────────────────────────────────────────────────

export type SandboxStatus =
  | "requested"
  | "approved"
  | "provisioning"
  | "ready"
  | "suspended"
  | "expired"
  | "retired"
  | "failed";

export type SandboxType = "personal" | "team" | "restricted";

export type ComputeProfile = "cpu-small" | "cpu-medium" | "gpu-small";

export type DataClassification = "internal" | "restricted" | "phi";

export interface SandboxLaunchUrls {
  studio: string;
  notebook: string;
}

export interface SandboxWorkspace {
  id: string;
  sandboxId: string;
  name: string;
  description?: string;
  tenantId: string;
  ownerId: string;
  projectId?: string;
  workspaceTemplateId: string;
  demoScenarioId?: string;
  baseModelId?: string;
  sandboxType: SandboxType;
  dataPackages: string[];
  computeProfile: ComputeProfile;
  status: SandboxStatus;
  expiresAt: string;
  costCenter?: string;
  businessJustification?: string;
  demoDataStatement?: string;
  launchUrls?: SandboxLaunchUrls;
  policyProfile: "standard" | "restricted";
  amlWorkspaceId?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxTemplate {
  id: string;
  name: string;
  description: string;
  sandboxType: SandboxType;
  computeProfiles: ComputeProfile[];
  defaultComputeProfile: ComputeProfile;
  defaultDurationDays: number;
  maxDurationDays: number;
  policyProfile: "standard" | "restricted";
  requiresApproval: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AmlDataAsset {
  name: string;
  version: string;
}

export interface DataPackage {
  id: string;
  dataPackageId: string;
  version: string;
  displayName: string;
  description: string;
  classification: DataClassification;
  amlDataAsset: AmlDataAsset;
  allowedSandboxTypes: SandboxType[];
  approvalPolicy: "standard-review" | "restricted-review" | "auto-approve";
  demoDataStatement?: string;
  demoDataClassifications?: ("synthetic" | "de-identified" | "approved-demo")[];
  starterNotebook?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxLifecycleEvent {
  id: string;
  sandboxId: string;
  tenantId: string;
  action: string;
  actorId: string;
  actorType: "user" | "system";
  details?: Record<string, unknown>;
  outcome: "success" | "failure" | "partial";
  timestamp: string;
}
