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

// Onboarding foundation
export * from "./onboarding/telemetry.js";
export * from "./onboarding/github-webhook.js";
export * from "./onboarding/deployment-outputs.js";
export * from "./onboarding/submissions.js";
export * from "./onboarding/gate.js";
export * from "./onboarding/eval-report.js";
export * from "./onboarding/evidence.js";

// Enhanced Audit Log
export * from "./audit/audit-log.js";

// Metrics (OTLP + Prometheus)
export * from "./metrics/metrics.js";

// Policy Registry
export * from "./policy/policies.js";

// Orchestration Templates & Executions
export * from "./orchestration/templates.js";
export * from "./orchestration/executions.js";

// Global Orchestrator control plane
export * from "./global-orchestrator/executions.js";
export * from "./global-orchestrator/routability.js";

// Sandbox Workspace
export * from "./sandbox/sandboxes.js";
export * from "./sandbox/sandbox-templates.js";
export * from "./sandbox/data-packages.js";
