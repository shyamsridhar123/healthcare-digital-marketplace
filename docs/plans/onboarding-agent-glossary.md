# Onboarding Agent — Glossary

Terms and acronyms referenced in [onboarding-agent-user-stories.csv](./onboarding-agent-user-stories.csv) and the AI Marketplace / Global Orchestrator design.

## Versioning & Release

- **semver (Semantic Versioning)** — Version format `MAJOR.MINOR.PATCH` (e.g., `1.4.2`). MAJOR = breaking change; MINOR = backward-compatible feature; PATCH = backward-compatible fix. See [semver.org](https://semver.org).
- **Canary rollout** — Progressive traffic shift (5% → 25% → 50% → 100%) to a new revision, gated by quality metrics, with auto-rollback on regression.
- **ACA revision** — Azure Container Apps immutable deployment snapshot. Multiple revisions can run concurrently with traffic splits between them.
- **SLSA** — Supply-chain Levels for Software Artifacts; a framework for build provenance attestations linking artifacts to source + builder identity.

## Identity & Auth

- **Entra ID** — Microsoft Entra ID (formerly Azure AD), the identity provider for users and workloads.
- **OIDC federation / Workload Identity Federation** — Lets CI runners (GitHub Actions, ADO) exchange a short-lived OIDC token for an Entra access token, eliminating long-lived client secrets.
- **Managed Identity** — Azure-managed service principal automatically rotated by the platform, used for zero-secret service-to-service auth.
- **Device code flow** — Interactive Entra sign-in for CLIs on devices without a browser.
- **OID (Object ID)** — Stable Entra identifier for a user or service principal (used in audit logs).
- **RBAC** — Role-Based Access Control.
- **ABAC** — Attribute-Based Access Control.
- **PIM** — Privileged Identity Management (just-in-time elevation of Entra roles).

## Platform Components (UAP)

- **UAP** — Unified AI Platform: catalog + orchestration + governance + dev experience.
- **UAIS** — Unified AI Services: middleware normalizing access to Foundry, OpenAI, MCP, A2A.
- **UDP** — Unified Data Platform: persistence + observability backbone (Cosmos / App Insights).
- **AgentCard** — Self-describing metadata document for an A2A agent (name, version, owner, endpoint, skills, capability tags, RAI tags).
- **A2A (Agent-to-Agent)** — HTTP protocol for agent discovery and invocation via AgentCards.
- **MCP (Model Context Protocol)** — Open protocol for exposing tools/resources to LLM agents via JSON Schema.
- **MAF** — Microsoft Agent Framework.
- **APIM** — Azure API Management.
- **ACA** — Azure Container Apps.
- **AKS** — Azure Kubernetes Service.
- **ADLS** — Azure Data Lake Storage.
- **KEDA** — Kubernetes Event-Driven Autoscaling.

## Governance & Compliance

- **HITL (Human-in-the-Loop)** — Workflow gate that pauses automation for manual review/approval.
- **HIPAA** — US healthcare data privacy regulation.
- **PHI** — Protected Health Information.
- **PII** — Personally Identifiable Information.
- **RAI** — Responsible AI (fairness, safety, transparency review).
- **Policy Engine** — Pre/post-execution evaluator for entitlements, content filters, budgets.
- **Audit Log** — Immutable, append-only record of governance events (Cosmos DB with TTL aligned to retention policy).
- **Delegation Envelope** — Least-privilege bundle (plan + constraints + scoped token) passed from Global Orchestrator to a Domain Orchestrator.

## Observability

- **OTel / OpenTelemetry** — Vendor-neutral standard for traces, metrics, and logs.
- **OTLP** — OpenTelemetry Protocol (wire format for OTel data).
- **trace_id** — Correlation ID propagated across services for end-to-end request tracing.
- **App Insights** — Azure Application Insights (APM service).
- **KQL** — Kusto Query Language (used by Log Analytics / App Insights).
- **Arize Phoenix** — Open-source LLM observability + evaluation platform.
- **LLM-as-a-judge** — Using an LLM (typically a stronger model) to score outputs for accuracy, relevance, toxicity.

## Data & Persistence

- **Cosmos DB** — Azure NoSQL store; partitioned by `tenantId` in this platform.
- **MongoDB** — Alternative NoSQL store (slide deck notes Cosmos DB may be replaced with MongoDB).
- **TTL** — Time To Live; automatic record expiration based on retention policy.
- **RAG** — Retrieval-Augmented Generation (vector search → context injection → LLM).
- **Saga / Compensation** — Pattern for rolling back a multi-step distributed workflow when a later step fails.

## Development & Tooling

- **`uap` CLI** — Command-line client for the Unified AI Platform (`uap login`, `uap submit`, etc.).
- **OpenAPI** — REST API specification format (formerly Swagger).
- **DevUI** — MAF debugging surface for agent + prompt iteration.
- **Bicep** — Azure-native IaC (Infrastructure as Code) DSL.
- **azd** — Azure Developer CLI for end-to-end app provisioning + deploy.
- **SAS URL** — Shared Access Signature; time-limited signed URL for direct Blob upload/download.

## RCM Domain (context)

- **RCM** — Revenue Cycle Management (healthcare claims, eligibility, prior auth, denials, billing).
- **CARC** — Claim Adjustment Reason Code.
- **CO-4** — Specific denial code (procedure code requires modifier).
- **NCCI** — National Correct Coding Initiative edits.
- **270/271** — X12 EDI eligibility request/response transactions.
- **837P** — X12 EDI professional claim transaction.
