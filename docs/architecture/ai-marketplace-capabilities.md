# AI Asset Marketplace Capability Guide

This document describes the capabilities represented in [ai-marketplace-capabilities.drawio](ai-marketplace-capabilities.drawio). It is intended to explain what each component does, how it fits into the platform, and which Azure services are expected to support or host it.

The capability map groups the platform into five layers:

1. Presentation and UX
2. API and Registries
3. Orchestration and Governance
4. Data and Observability
5. Azure Services

## 1. Presentation and UX

### Web Dashboard
Marketplace UI for browsing and managing AI assets.

Capabilities:
- Presents the primary catalog experience for agents, MCP servers, tools, models, and skills.
- Supports search, filtering, sorting, and detail pages.
- Displays metadata such as versions, owners, governance status, health, ratings, and install guidance.
- Serves as the main landing surface for internal users and platform consumers.

Typical users:
- Developers
- Architects
- Reviewers
- Platform administrators

Primary Azure support:
- Azure Container Apps for the web host
- Azure Front Door for edge delivery

### Visual Orchestration
Drag-and-drop canvas for workflow composition.

Capabilities:
- Lets users visually assemble agentic workflows from reusable nodes.
- Supports node wiring, branching, sequencing, retries, and stateful execution patterns.
- Enables composition of agents, tools, prompts, skills, and approval gates into executable flows.
- Acts as the design-time surface for orchestration templates.

Primary Azure support:
- Azure Container Apps for the web UI
- Azure Functions or orchestration runtime services for execution backends

### Admin Dashboard
Governance and review experience for platform operators.

Capabilities:
- Shows platform-wide health, submissions, approvals, policy violations, and operational metrics.
- Exposes moderation, registration review, approval, suspension, and audit workflows.
- Helps administrators manage users, tenant settings, access, and enforcement outcomes.
- Surfaces alerts and trends for compliance and operations.

Primary Azure support:
- Azure Container Apps
- Application Insights
- Log Analytics Workspace

### Publisher Portal
Submission and lifecycle management experience for asset providers.

Capabilities:
- Supports onboarding of publishers and their assets.
- Collects metadata, packages, version information, security declarations, and documentation.
- Enables draft, submit, review, revise, approve, and publish flows.
- Provides visibility into validation outcomes, governance feedback, and publication status.

Primary Azure support:
- Azure Container Apps
- Azure Key Vault for signing secrets or partner credentials

### Playground
Interactive environment to test agents and tools.

Capabilities:
- Allows users to run assets in a safe pre-production style experience.
- Supports prompt input, test data, tool invocation, output inspection, and trace review.
- Helps validate behavior before approving or installing assets into workflows.
- Can be used for demos, diagnostics, and regression checks.

Primary Azure support:
- Azure Container Apps
- Azure OpenAI or Azure AI Foundry-backed model endpoints
- Application Insights for traces and metrics

### DevUI
Microsoft Agent Framework testing surface.

Capabilities:
- Gives developers a focused UI for testing MAF-based agents and interactions.
- Supports iterative debugging, configuration validation, and prompt or tool tuning.
- Bridges asset cataloging with engineering-time agent verification.

Primary Azure support:
- Azure Container Apps
- Azure AI Foundry
- Application Insights

## 2. API and Registries

### Asset Catalog
Core CRUD and versioning service for marketplace assets.

Capabilities:
- Stores the canonical records for marketplace assets.
- Tracks asset identity, ownership, version history, visibility, and lifecycle state.
- Supports create, read, update, archive, and publish flows.
- Acts as the system of record for the marketplace domain.

Primary Azure support:
- Azure Functions for API implementation
- Azure Cosmos DB for persistence

### MCP Server and Tool Registry
Registry for MCP servers and their exposed tools.

Capabilities:
- Registers MCP endpoints, tool metadata, schemas, auth requirements, and health details.
- Supports discovery by orchestration services and users.
- Maintains versioning, compatibility, ownership, and governance attributes.
- Serves as the lookup layer for tool binding during orchestration.

Primary Azure support:
- Azure Functions
- Azure Cosmos DB
- MCP Gateway Proxy for mediated access

### A2A Agent Registry
Registry of agent-to-agent capable assets.

Capabilities:
- Tracks registered agents, endpoints, capabilities, protocols, and identity requirements.
- Supports discovery and resolution of specialist agents during workflow planning.
- Enables governance and approval of agent registrations before broad use.
- Forms the inventory for distributed agent collaboration.

Primary Azure support:
- Azure Functions
- Azure Cosmos DB

### Agent Skills Registry
Registry for reusable skill definitions and instruction assets.

Capabilities:
- Stores structured skill metadata and skill content references.
- Makes reusable instructions discoverable across agents and workflows.
- Allows skills to be versioned, reviewed, and governed like other assets.
- Supports composition by orchestrators and developers.

Primary Azure support:
- Azure Functions
- Azure Cosmos DB

### Publisher and Submission API
Submission workflow API for asset onboarding.

Capabilities:
- Accepts asset submissions from publishers and internal teams.
- Validates metadata shape, package completeness, and required review information.
- Drives the review queue and transitions submissions through approval states.
- Integrates with scanners, governance logic, and audit trails.

Primary Azure support:
- Azure Functions
- Azure Cosmos DB
- Key Vault for protected submission credentials

### Security Scanner
Static and runtime validation service for submitted assets.

Capabilities:
- Performs policy-aligned scanning of agents, MCP servers, skills, and packages.
- Flags risky patterns, unsupported dependencies, or missing metadata.
- Produces findings that are fed into review workflows.
- Supports blocking, warning, or conditional approval outcomes.

Primary Azure support:
- Azure Functions or containerized worker execution
- Application Insights for scan telemetry

### MCP Gateway Proxy
Gateway surface for controlled MCP access.

Capabilities:
- Normalizes access to registered MCP servers and tools.
- Applies auth, policy, routing, and connection mediation rules.
- Reduces direct coupling between clients and backend MCP servers.
- Can support centralized governance, logging, and throttling.

Primary Azure support:
- Azure API Management for API gateway policy
- Azure Functions or Azure Container Apps for proxy logic

## 3. Orchestration and Governance

### Workflow Templates
Reusable blueprints for orchestrated workflows.

Capabilities:
- Stores curated orchestration patterns for common business scenarios.
- Encodes reusable node structures, handoff patterns, tool bindings, and approvals.
- Improves standardization and reduces workflow design time.
- Enables repeatable execution models across teams.

Primary Azure support:
- Azure Functions for template APIs
- Azure Cosmos DB for template storage

### Execution Engine
Runtime responsible for executing composed workflows.

Capabilities:
- Interprets workflow graphs and step definitions.
- Dispatches calls to agents, tools, models, and policy checks.
- Manages state transitions, retries, fan-out/fan-in patterns, and result aggregation.
- Produces execution history, traces, and evidence artifacts.

Primary Azure support:
- Azure Functions for event-driven orchestration steps
- Azure Container Apps for longer-running execution services

### Policy and Governance Engine
Central enforcement layer for enterprise controls.

Capabilities:
- Evaluates policy before publication, execution, and access.
- Applies guardrails around entitlements, risk, data sensitivity, approved asset use, and budgets.
- Supports allow, deny, require-review, and conditional execution outcomes.
- Maintains consistent governance across assets and workflows.

Primary Azure support:
- Azure Functions
- Azure Cosmos DB for policy metadata
- Key Vault for sensitive policy secrets or certificates

### Human-in-Loop Approval Gate
Manual review capability embedded in automated flows.

Capabilities:
- Stops or branches workflows for human decision-making when risk or ambiguity is high.
- Supports review queues, approval actions, exception justification, and overrides.
- Captures rationale and decision provenance for auditability.
- Enables safe enterprise use of automation.

Primary Azure support:
- Azure Container Apps for UI
- Azure Functions for workflow state transitions

### IAM and RBAC Access Control
Identity, access, and authorization capability.

Capabilities:
- Controls who can view, submit, approve, execute, or administer assets and workflows.
- Supports role-based and potentially resource-scoped access models.
- Governs both user access and service-to-service permissions.
- Enforces least privilege across runtime and administrative operations.

Primary Azure support:
- Microsoft Entra ID
- Managed identities
- Azure RBAC and app-layer authorization

### Compensation Logic (Saga)
Failure handling and rollback coordination.

Capabilities:
- Coordinates multi-step rollback or compensating actions for long-running workflows.
- Supports partial failure recovery in orchestrated business processes.
- Prevents inconsistent state when downstream operations fail mid-execution.
- Improves resilience and correctness for distributed actions.

Primary Azure support:
- Azure Functions durable or event-driven coordination patterns
- Azure Cosmos DB for workflow state

## 4. Data and Observability

### Audit Log
Immutable operational and governance record.

Capabilities:
- Captures who did what, when, against which asset or workflow, and with what outcome.
- Supports security review, compliance, and post-incident investigation.
- Tracks administrative actions, approvals, publication events, and execution decisions.
- Can be partitioned and retained with TTL-based lifecycle management.

Primary Azure support:
- Azure Cosmos DB with TTL
- Log Analytics for aggregation and query

### Metrics and OTLP
Telemetry and performance measurement capability.

Capabilities:
- Collects counters, histograms, traces, latency, failure rates, and cost indicators.
- Provides operational visibility into execution engine health and asset usage.
- Supports OpenTelemetry export paths for standardized instrumentation.
- Feeds dashboards, alerting, and optimization workflows.

Primary Azure support:
- Application Insights
- Azure Monitor
- Log Analytics Workspace

### User Sessions
Short-lived state for active user interactions.

Capabilities:
- Stores session context, transient tokens, UI state, and short-lived interaction data.
- Supports secure user experiences across dashboards and administrative flows.
- Uses TTL to avoid unnecessary retention of temporary data.

Primary Azure support:
- Azure Cosmos DB or Redis-style session cache if introduced later

### Projects and Workspace
User-owned or team-owned work area data.

Capabilities:
- Stores project metadata, saved workflows, drafts, and organizational context.
- Supports collaboration and repeatable execution within a bounded workspace.
- Organizes marketplace consumption into manageable units of work.

Primary Azure support:
- Azure Cosmos DB

### Ratings and Reviews
Quality and community feedback layer.

Capabilities:
- Allows users to rate and review marketplace assets.
- Provides qualitative and quantitative signals for asset trust and usefulness.
- Supports discovery ranking, curation, and publisher feedback.

Primary Azure support:
- Azure Cosmos DB

### Execution History
Historical record of workflow and asset execution.

Capabilities:
- Stores run outcomes, inputs, outputs, trace identifiers, and execution metadata.
- Supports debugging, replay analysis, governance, and operational review.
- Provides evidence for audit and cost attribution.

Primary Azure support:
- Azure Cosmos DB
- Application Insights
- Log Analytics

## 5. Azure Services

This layer represents the Azure platform services that host or enable the capability layers above.

### Azure Functions
Primary backend compute for APIs and orchestration steps.

Capabilities:
- Hosts serverless HTTP APIs and event-driven backend handlers.
- Fits registry CRUD, governance checks, scan triggers, and workflow step execution.
- Scales automatically and aligns with modular service boundaries.

Supports:
- Asset Catalog
- Registries
- Submission API
- Execution Engine
- Policy Engine
- Compensation Logic

### Azure Container Apps
Primary host for the Next.js web experience and containerized supporting services.

Capabilities:
- Hosts the marketplace frontend and any long-running containerized runtime components.
- Supports ingress, autoscaling, revisions, and environment-based deployment.
- Fits web dashboard, publisher portal, and containerized proxy or testing services.

Supports:
- Web Dashboard
- Visual Orchestration UI
- Admin Dashboard
- Publisher Portal
- Playground
- DevUI

### Azure Cosmos DB
Primary NoSQL persistence store.

Capabilities:
- Stores tenant-partitioned marketplace metadata and workflow state.
- Supports low-latency read/write patterns for registries, sessions, projects, ratings, and audit data.
- Can enforce retention through TTL where appropriate.

Supports:
- Asset Catalog
- Registries
- Workflow Templates
- Execution state
- Audit Log
- Sessions
- Projects and Workspace
- Ratings and Reviews
- Execution History

### Azure OpenAI
Model inference and reasoning service.

Capabilities:
- Powers classification, summarization, generation, and evaluation steps.
- Supports higher-level agent and workflow reasoning experiences.
- Enables playground and orchestration scenarios that require LLM-backed computation.

Supports:
- Playground
- DevUI
- Execution Engine
- Policy or classification subflows

### Azure Key Vault
Secret and sensitive configuration management.

Capabilities:
- Stores secrets, certificates, connection settings, and signing material.
- Supports secure service-to-service and deployment-time configuration.
- Helps keep secrets out of code and source control.

Supports:
- IAM and RBAC Access Control
- Governance integrations
- Submission and scanning integrations
- Runtime configuration for apps and APIs

### Application Insights
Application telemetry service.

Capabilities:
- Captures traces, request performance, dependency calls, failures, and custom events.
- Supports end-to-end diagnostics across web and API tiers.
- Enables operational dashboards and troubleshooting.

Supports:
- Metrics and OTLP
- Admin Dashboard
- Execution History
- Security Scanner monitoring

### Container Registry (ACR)
Private image registry for deployable components.

Capabilities:
- Stores container images for web, APIs, scanners, and supporting services.
- Supports repeatable deployments and CI/CD integration.
- Secures the software supply chain for containerized runtime artifacts.

Supports:
- Azure Container Apps deployments
- Containerized backend utilities

### Log Analytics Workspace
Centralized log and query platform.

Capabilities:
- Aggregates diagnostics from apps and Azure resources.
- Supports operational analysis, security review, and alerting.
- Works with Azure Monitor and Application Insights to provide deep observability.

Supports:
- Metrics and OTLP
- Audit and troubleshooting workflows
- Admin operations and compliance reporting

## Capability Relationships

The diagram implies the following operating model:

1. Presentation capabilities are primarily user-facing and depend on the API and orchestration layers.
2. Registry capabilities define the control plane for everything the marketplace can publish, discover, govern, and execute.
3. Orchestration and governance capabilities provide the policy-aware runtime that turns registered assets into usable workflows.
4. Data and observability capabilities provide system memory, traceability, and operational safety.
5. Azure services provide the hosting, identity, storage, AI, and telemetry foundation.

## Suggested Reading Order

For stakeholders reading this capability map:

1. Start with Presentation and UX to understand what users experience.
2. Move to API and Registries to understand the platform control plane.
3. Review Orchestration and Governance to understand runtime behavior and enterprise controls.
4. Finish with Data and Observability and Azure Services to understand how the platform is operated and hosted.