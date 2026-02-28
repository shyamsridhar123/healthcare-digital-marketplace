export type AssetType = "agent" | "mcp-server" | "mcp-tool" | "model" | "workflow-template"

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
  pricing: "Free" | "Pro" | "Enterprise"
  icon: string
  lastUpdated: string
  publishedDate: string // Initial publish date
  orchestrationUsage: number // Number of orchestrations/projects using this asset
  capabilities: string[] // List of key capabilities
}

export interface WorkflowNode {
  id: string
  type: "agent" | "tool" | "trigger" | "condition" | "output"
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    icon?: string
    config?: Record<string, unknown>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
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
