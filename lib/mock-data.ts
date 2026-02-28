import { Asset, Workflow } from "./types"

export const assets: Asset[] = [
  {
    id: "agent-1",
    name: "Customer Service Agent",
    description: "Enterprise-grade conversational AI agent for customer support with multi-turn dialogue capabilities and CRM integration.",
    type: "agent",
    category: "AI Agents",
    publisher: "Azure AI",
    publisherVerified: true,
    version: "2.4.0",
    downloads: 15420,
    rating: 4.8,
    tags: ["customer-service", "nlp", "enterprise"],
    pricing: "Pro",
    icon: "MessageSquare",
    lastUpdated: "2026-02-15"
  },
  {
    id: "agent-2",
    name: "Code Review Agent",
    description: "Intelligent code review assistant that analyzes pull requests, identifies bugs, and suggests improvements using advanced static analysis.",
    type: "agent",
    category: "AI Agents",
    publisher: "DevTools Inc",
    publisherVerified: true,
    version: "1.8.2",
    downloads: 8930,
    rating: 4.6,
    tags: ["code-review", "devtools", "automation"],
    pricing: "Free",
    icon: "Code",
    lastUpdated: "2026-02-20"
  },
  {
    id: "mcp-1",
    name: "Azure Blob Storage MCP",
    description: "Model Context Protocol server for Azure Blob Storage operations. Read, write, and manage blobs with natural language commands.",
    type: "mcp-server",
    category: "MCP Servers",
    publisher: "Azure AI",
    publisherVerified: true,
    version: "1.2.0",
    downloads: 22100,
    rating: 4.9,
    tags: ["storage", "azure", "mcp"],
    pricing: "Free",
    icon: "Database",
    lastUpdated: "2026-02-18"
  },
  {
    id: "mcp-2",
    name: "GitHub MCP Server",
    description: "Connect AI agents to GitHub repositories. Create issues, review PRs, manage branches, and automate workflows.",
    type: "mcp-server",
    category: "MCP Servers",
    publisher: "GitHub",
    publisherVerified: true,
    version: "3.1.0",
    downloads: 34500,
    rating: 4.7,
    tags: ["github", "devops", "mcp"],
    pricing: "Free",
    icon: "GitBranch",
    lastUpdated: "2026-02-22"
  },
  {
    id: "tool-1",
    name: "SQL Query Generator",
    description: "Transform natural language to SQL queries with support for Azure SQL, PostgreSQL, and MySQL dialects.",
    type: "mcp-tool",
    category: "MCP Tools",
    publisher: "DataForge",
    publisherVerified: false,
    version: "2.0.1",
    downloads: 12300,
    rating: 4.5,
    tags: ["sql", "database", "nlp"],
    pricing: "Pro",
    icon: "Table",
    lastUpdated: "2026-02-10"
  },
  {
    id: "tool-2",
    name: "Document Parser",
    description: "Extract structured data from PDFs, Word docs, and images using OCR and intelligent parsing.",
    type: "mcp-tool",
    category: "MCP Tools",
    publisher: "DocuAI",
    publisherVerified: true,
    version: "4.2.0",
    downloads: 28700,
    rating: 4.8,
    tags: ["document", "ocr", "parsing"],
    pricing: "Enterprise",
    icon: "FileText",
    lastUpdated: "2026-02-12"
  },
  {
    id: "model-1",
    name: "GPT-4 Turbo",
    description: "Latest generation large language model with 128k context window and improved reasoning capabilities.",
    type: "model",
    category: "Models",
    publisher: "OpenAI",
    publisherVerified: true,
    version: "0125-preview",
    downloads: 156000,
    rating: 4.9,
    tags: ["llm", "gpt", "reasoning"],
    pricing: "Pro",
    icon: "Brain",
    lastUpdated: "2026-01-25"
  },
  {
    id: "model-2",
    name: "Azure Vision API",
    description: "Computer vision model for image analysis, object detection, and OCR with enterprise-grade accuracy.",
    type: "model",
    category: "Models",
    publisher: "Azure AI",
    publisherVerified: true,
    version: "4.0",
    downloads: 89000,
    rating: 4.7,
    tags: ["vision", "ocr", "image-analysis"],
    pricing: "Pro",
    icon: "Eye",
    lastUpdated: "2026-02-05"
  },
  {
    id: "workflow-1",
    name: "Customer Onboarding Pipeline",
    description: "End-to-end customer onboarding workflow with document verification, CRM integration, and automated follow-ups.",
    type: "workflow-template",
    category: "Workflow Templates",
    publisher: "Enterprise Solutions",
    publisherVerified: true,
    version: "1.5.0",
    downloads: 4500,
    rating: 4.6,
    tags: ["onboarding", "automation", "crm"],
    pricing: "Enterprise",
    icon: "Workflow",
    lastUpdated: "2026-02-08"
  },
  {
    id: "workflow-2",
    name: "Security Incident Response",
    description: "Automated security incident detection and response workflow with escalation policies and compliance reporting.",
    type: "workflow-template",
    category: "Workflow Templates",
    publisher: "SecureOps",
    publisherVerified: true,
    version: "2.1.0",
    downloads: 6200,
    rating: 4.9,
    tags: ["security", "incident-response", "compliance"],
    pricing: "Enterprise",
    icon: "Shield",
    lastUpdated: "2026-02-14"
  },
  {
    id: "agent-3",
    name: "Data Analysis Agent",
    description: "Automated data analysis and visualization agent that generates insights from structured and unstructured data sources.",
    type: "agent",
    category: "AI Agents",
    publisher: "DataForge",
    publisherVerified: true,
    version: "3.0.0",
    downloads: 11200,
    rating: 4.7,
    tags: ["analytics", "data", "visualization"],
    pricing: "Pro",
    icon: "BarChart",
    lastUpdated: "2026-02-19"
  },
  {
    id: "mcp-3",
    name: "Slack MCP Server",
    description: "Integrate AI agents with Slack workspaces. Send messages, manage channels, and respond to events.",
    type: "mcp-server",
    category: "MCP Servers",
    publisher: "Slack",
    publisherVerified: true,
    version: "2.5.0",
    downloads: 18900,
    rating: 4.6,
    tags: ["slack", "messaging", "integration"],
    pricing: "Free",
    icon: "MessageCircle",
    lastUpdated: "2026-02-16"
  }
]

export const sampleWorkflows: Workflow[] = [
  {
    id: "wf-1",
    name: "Customer Support Pipeline",
    description: "Multi-agent workflow for handling customer inquiries with escalation",
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 100, y: 200 },
        data: { label: "Incoming Request", description: "Customer inquiry received" }
      },
      {
        id: "agent-1",
        type: "agent",
        position: { x: 300, y: 200 },
        data: { label: "Triage Agent", description: "Classifies and routes requests" }
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 500, y: 200 },
        data: { label: "Priority Check", description: "High priority?" }
      },
      {
        id: "agent-2",
        type: "agent",
        position: { x: 700, y: 100 },
        data: { label: "Senior Agent", description: "Handles complex issues" }
      },
      {
        id: "agent-3",
        type: "agent",
        position: { x: 700, y: 300 },
        data: { label: "Support Agent", description: "Standard support queries" }
      },
      {
        id: "output-1",
        type: "output",
        position: { x: 900, y: 200 },
        data: { label: "Response", description: "Send to customer" }
      }
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "agent-1" },
      { id: "e2", source: "agent-1", target: "condition-1" },
      { id: "e3", source: "condition-1", target: "agent-2", label: "Yes" },
      { id: "e4", source: "condition-1", target: "agent-3", label: "No" },
      { id: "e5", source: "agent-2", target: "output-1" },
      { id: "e6", source: "agent-3", target: "output-1" }
    ],
    status: "deployed",
    createdAt: "2026-02-01",
    updatedAt: "2026-02-20"
  }
]

export const categories = [
  "All Categories",
  "AI Agents",
  "MCP Servers",
  "MCP Tools",
  "Models",
  "Workflow Templates",
  "Analytics",
  "Authentication",
  "Data Processing",
  "DevTools",
  "Security",
  "Storage"
] as const
