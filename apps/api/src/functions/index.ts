// Azure Functions v4 node model — each module self-registers via app.http().
// Importing them here causes the registration to run when the host loads `main`.

export * from "./catalog/assets.js";
export * from "./catalog/ratings.js";
export * from "./catalog/versions.js";

export * from "./publisher/publishers.js";
export * from "./publisher/submissions.js";
export * from "./publisher/review.js";

export * from "./sessions/sessions.js";

export * from "./workflows/workflows.js";

export * from "./workspace/projects.js";
export * from "./workspace/user-config.js";

export * from "./data/data-sources.js";

// Registry (MCP + A2A + Skills)
export * from "./registry/mcp-servers.js";
export * from "./registry/mcp-gateway.js";
export * from "./registry/tool-discovery.js";
export * from "./registry/a2a-agents.js";
export * from "./registry/skills.js";

// IAM
export * from "./iam/groups.js";
export * from "./iam/service-accounts.js";

// Security
export * from "./security/scans.js";

// Health Monitoring
export * from "./health/server-health.js";

// Enhanced Audit Log
export * from "./audit/audit-log.js";

// Metrics (OTLP + Prometheus)
export * from "./metrics/metrics.js";

// Policy Registry
export * from "./policy/policies.js";

// Orchestration Templates & Executions
export * from "./orchestration/templates.js";
export * from "./orchestration/executions.js";
