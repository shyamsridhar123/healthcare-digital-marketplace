# Sandbox Deployment Plan for UAP AI Marketplace

## Objective

Deploy a governed Azure Machine Learning sandbox capability into the existing UAP AI Marketplace so data science teams can request sandbox environments, access approved data packages, train models in isolated Azure ML workspaces, and submit trained models back into the marketplace lifecycle.[cite:1][cite:17][cite:25][cite:26][cite:15]

## Scope

This plan assumes the current AI Marketplace already includes the UAP layers defined in the existing architecture: Marketplace UI, Publisher Portal, Admin Dashboard, Asset Catalog, registries, Policy Engine, Human-in-the-Loop, Projects & Workspace, Audit Log, Execution History, and Azure-native deployment on Azure Container Apps with APIM, AI Search, and Azure AI services.[cite:1]

The sandbox capability will be implemented as an extension of the existing platform, not as a separate product.[cite:1]

## Success Criteria

The deployment is successful when the following outcomes are met:[cite:1][cite:17][cite:26][cite:15]

- A user can discover and request a sandbox from the Marketplace Catalog.[cite:1]
- The request is evaluated by RBAC, policy, budget, and optional approval workflows before provisioning starts.[cite:1][cite:17]
- The provisioning workflow creates an Azure ML workspace, compute, approved data bindings, and launch metadata automatically.[cite:25][cite:26][cite:32]
- The user can open the sandbox directly in Azure ML Studio or a starter notebook path.[cite:32]
- Workspace activity is auditable through the platform audit and execution history model.[cite:1]
- Models trained in the sandbox can be registered and submitted back to the AI Marketplace promotion flow.[cite:15][cite:1]

## Guiding Principles

- Treat sandbox as a **new governed asset type** in the Marketplace, not a side platform.[cite:1]
- Publish only approved data packages, not raw storage navigation, to keep the user experience simple and enforceable.[cite:26]
- Use Azure ML managed identity, RBAC, and managed/private networking as the default control plane for secure access.[cite:17][cite:25][cite:32]
- Reuse the platform's existing workflow engine, HITL gates, policy engine, and observability patterns for provisioning and lifecycle management.[cite:1]
- Keep the MVP narrow and opinionated so it can be adopted quickly by the first data science teams.[cite:1]

## Target Product Experience

The user-facing journey inside the AI Marketplace should be:

1. Search or browse to a sandbox template in the Marketplace Catalog.[cite:1]
2. Select sandbox type, approved data package, compute tier, and duration.[cite:26][cite:32]
3. Submit request; policy checks run and approvals are triggered if required.[cite:1][cite:17]
4. Provisioning workflow creates the workspace and baseline resources.[cite:25][cite:32]
5. User opens the environment in Azure ML Studio, launches starter notebooks, or runs predefined training flows.[cite:32][cite:26]
6. Trained models are registered in Azure ML and optionally submitted into the Marketplace publisher workflow for review and deployment.[cite:15][cite:1]

## Architecture Fit in Existing UAP

### Presentation and UX

Add the following to the existing presentation layer:[cite:1]

- Sandbox entry in Marketplace Catalog
- Sandbox request form
- Sandbox details/status page
- Admin approval queue for restricted or quota-sensitive requests
- Launch actions for Azure ML Studio and starter notebooks
- Project-scoped sandbox listing under Projects & Workspace

### API and Registry Layer

Add the following backend services inside the existing UAIS/API layer hosted on Azure Container Apps:[cite:1]

| Service | Purpose |
|---|---|
| Sandbox Provisioning API | Accepts requests, validates payloads, drives lifecycle state transitions |
| Sandbox Registry | Tracks active sandboxes, ownership, status, expiration, template, and tenant linkage |
| Workspace Template Registry | Stores reusable sandbox blueprints |
| Data Package Registry | Maps approved datasets to Azure ML datastores and data asset versions |
| AML Connector Service | Calls Azure ML APIs/SDK for workspace, compute, data asset, and model operations |
| Cost and Quota Service | Tracks budget, compute quotas, GPU allocation, and expiration policy |

### Orchestration and Governance

Reuse the existing orchestration and governance stack for sandbox lifecycle actions:[cite:1]

- Workflow Templates for provisioning, extension, suspension, retirement
- Execution Engine to execute provisioning and cleanup workflows
- Policy Engine for entitlement, quota, and sensitivity evaluation
- HITL Gate for restricted data, high-cost requests, and exceptions
- IAM and RBAC for user, approver, admin, and operator roles
- Compensation/Saga logic to roll back partially provisioned resources if provisioning fails

### Data and Observability

Use the existing audit and telemetry patterns for sandbox operations:[cite:1]

- Audit Log for request, approval, provisioning, access grant, and retirement events
- Execution History for provisioning workflows and lifecycle jobs
- Metrics & OTLP for latency, failure, cost, active workspaces, and idle compute
- Projects & Workspace to group sandboxes by team or initiative

## New Marketplace Asset Model

Create a new asset type in Asset Catalog named `sandbox-workspace`.[cite:1]

Recommended metadata schema:

```json
{
  "assetType": "sandbox-workspace",
  "sandboxId": "sbx-<uuid>",
  "name": "Claims Modeling Sandbox",
  "tenantId": "<tenant-id>",
  "ownerId": "<entra-object-id>",
  "workspaceTemplateId": "aml-team-standard-v1",
  "sandboxType": "personal|team|restricted",
  "dataPackages": ["claims_training:v12", "denials_gold:v4"],
  "computeProfile": "cpu-small|cpu-medium|gpu-small",
  "status": "requested|approved|provisioning|ready|suspended|expired|retired|failed",
  "expiresAt": "2026-05-15T00:00:00Z",
  "costCenter": "RCM-AI",
  "launchUrls": {
    "studio": "https://ml.azure.com/...",
    "notebook": "https://ml.azure.com/..."
  },
  "policyProfile": "standard|restricted",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

## Sandbox Types

Start with three template classes aligned to enterprise controls and user needs:[cite:25][cite:32][cite:17]

| Sandbox type | Intended user | Characteristics |
|---|---|---|
| Personal | Individual data scientist | Personal compute instance, lower quota, approved low-risk datasets |
| Team | DS squad / product pod | Shared workspace context, shared training cluster, shared data packages |
| Restricted | Sensitive or PHI workloads | Stricter approval, private network controls, stronger audit and shorter allowed configuration matrix |

Recommendation: for the MVP, deploy **Personal** and **Team** first, then add **Restricted** after governance workflows and network controls are validated.[cite:1][cite:25]

## Azure ML Resource Blueprint

Each sandbox template should provision a standard set of Azure ML-aligned resources.[cite:25][cite:32][cite:26][cite:15]

### Mandatory resources

- Azure ML workspace
- Workspace managed identity
- Linked storage and Key Vault references required by the workspace boundary
- Default compute instance for owner or starter use case
- Shared compute cluster for training jobs where applicable
- Registered datastores for approved data sources
- Registered Azure ML data assets for approved datasets
- MLflow tracking conventions and model registration target
- Launch metadata for Azure ML Studio deep links

### Network posture

Apply one of the following by template:[cite:25][cite:32]

- Standard template: managed network with approved outbound rules
- Restricted template: stronger private/managed network isolation, limited egress, private data access path

### Compute posture

Use predefined compute profiles only.[cite:32][cite:25]

| Profile | Typical use | Notes |
|---|---|---|
| cpu-small | Notebook exploration | Default personal sandbox |
| cpu-medium | Tabular training | Shared lower-cost default |
| gpu-small | Fine-tuning / deep learning | Approval-gated in MVP |

## Data Package Model

To make the sandbox easy to use, datasets must be exposed as approved **data packages** instead of raw storage locations.[cite:26]

Each data package should contain:

- Display name and description
- Sensitivity tier
- Underlying datastore reference
- Azure ML data asset name and version
- Allowed sandbox types
- Required approval policy
- Example notebook or starter template reference

Recommended example schema:

```json
{
  "dataPackageId": "claims_training",
  "version": "12",
  "displayName": "Claims Training Dataset",
  "classification": "internal|restricted|phi",
  "amlDataAsset": {
    "name": "claims_training",
    "version": "12"
  },
  "allowedSandboxTypes": ["personal", "team"],
  "approvalPolicy": "standard-review",
  "starterNotebook": "notebooks/claims_baseline_train.ipynb"
}
```

## RBAC Model

Use Azure ML workspace roles together with marketplace-level roles and Entra group mapping to keep permissions consistent.[cite:17]

| Role | Marketplace permissions | Azure ML permissions |
|---|---|---|
| Sandbox Requester | Request and view own sandboxes | Reader or scoped user access to assigned workspace |
| Sandbox Owner | Launch, run jobs, manage own assets in sandbox | Workspace contributor-level access within assigned sandbox scope |
| Data Approver | Approve sensitive data package requests | No default AML authoring access required |
| Sandbox Admin | Approve, extend, suspend, retire, view team sandboxes | Elevated workspace management permissions |
| Platform Operator | Operate provisioning and rollback workflows | Infrastructure/service principal access |

Implementation rules:[cite:17][cite:1]

- Marketplace remains the system of engagement for approvals and lifecycle state.
- Entra groups are the source of identity for role mapping.
- Azure ML workspace role assignment is created automatically during provisioning.
- Restricted sandbox access always requires explicit ownership and time-bound assignment.

## Provisioning Workflow

Implement provisioning as an auditable UAP workflow template rather than a direct synchronous API call.[cite:1]

### Workflow steps

1. Validate request payload.
2. Resolve tenant, requester role, and project context.
3. Evaluate policy profile, budget, quota, and data sensitivity.[cite:1]
4. Route to HITL approval when policy requires it.[cite:1]
5. Create sandbox record in `requested` or `approved` state.
6. Invoke infrastructure automation to create Azure ML workspace and baseline resources.[cite:25][cite:32]
7. Register datastores and data assets defined by selected data packages.[cite:26]
8. Assign Azure ML roles to owner/admin groups.[cite:17]
9. Create launch URLs and workspace metadata.
10. Update sandbox status to `ready`.
11. Emit audit, telemetry, and notification events.[cite:1]

### Failure handling

Use compensation steps when a downstream step fails.[cite:1]

Examples:

- If workspace creation succeeds but data asset registration fails, retire or quarantine the workspace based on retry policy.
- If RBAC assignment fails, mark the sandbox `failed` and roll back user-facing availability.
- If launch URL generation fails, keep sandbox in `provisioning` and retry asynchronously.

## Lifecycle Workflows

In addition to provisioning, create the following workflows in Workflow Templates:[cite:1]

| Workflow | Purpose |
|---|---|
| Extend Sandbox | Extend expiration after approval |
| Suspend Sandbox | Stop compute and freeze new launches |
| Resume Sandbox | Re-enable a suspended sandbox |
| Retire Sandbox | Delete or archive sandbox resources and update registry state |
| Idle Cleanup | Shut down unused compute or flag idle environments |
| Publish Model to Marketplace | Promote a trained model into publisher submission flow |

## Required Marketplace UI Changes

### Marketplace Catalog

- Add a new category: **Sandboxes**
- Add search/filter facets for sandbox type, domain, approved datasets, and compute profile
- Show request CTA instead of install/deploy CTA for this asset type

### Sandbox Request Form

Fields:

- Sandbox name
- Project / workspace context
- Sandbox template
- Data package selection
- Compute profile
- Requested duration
- Business justification
- Cost center

### Sandbox Detail Page

Display:

- Status
- Owner and project
- Expiration date
- Workspace template
- Approved data packages
- Launch buttons
- Recent lifecycle events
- Model outputs registered from this sandbox

### Admin Dashboard

Add queue views for:

- Pending sandbox requests
- High-cost requests
- Restricted data requests
- Expiring sandboxes
- Failed provisioning jobs

## API Design

Recommended initial endpoints:

```text
POST   /api/sandboxes
GET    /api/sandboxes/{sandboxId}
GET    /api/sandboxes?tenantId=&projectId=&status=
POST   /api/sandboxes/{sandboxId}/approve
POST   /api/sandboxes/{sandboxId}/reject
POST   /api/sandboxes/{sandboxId}/extend
POST   /api/sandboxes/{sandboxId}/suspend
POST   /api/sandboxes/{sandboxId}/resume
DELETE /api/sandboxes/{sandboxId}
GET    /api/sandbox-templates
GET    /api/data-packages
POST   /api/sandboxes/{sandboxId}/publish-model
```

Implementation notes:

- Keep provisioning asynchronous.
- Return workflow/run IDs so frontend can poll or subscribe to updates.
- Persist policy decisions and approval metadata with the sandbox record.
- Emit platform-standard trace identifiers for every lifecycle action.[cite:1]

## Storage and Collections

Assuming MongoDB or Cosmos DB remains the operational store, add the following collections/containers:[cite:1]

| Collection | Purpose |
|---|---|
| `sandbox_requests` | Raw inbound requests, approvals, comments |
| `sandboxes` | Current operational state of each sandbox |
| `sandbox_templates` | Reusable template definitions |
| `data_packages` | Approved data package metadata |
| `sandbox_lifecycle_events` | Audit-friendly lifecycle event stream |
| `sandbox_cost_usage` | Optional summarized cost and quota tracking |

Partition recommendation:

- `tenantId` as primary partition key to remain aligned with current UAP data design.[cite:1]
- Add secondary indexing on `status`, `ownerId`, `projectId`, and `expiresAt`.

## Integration with Projects and Workspace

Use the existing Projects & Workspace concept as the organizational parent for sandboxes.[cite:1]

Recommended rules:

- Every sandbox belongs to a project or team workspace context.
- Project owners can view team sandboxes in that scope.
- Sandbox creation should inherit project defaults for allowed data packages and budget ceilings.
- Project-level dashboards should include sandbox counts, active jobs, and model outputs.

## Integration with Model Marketplace Flow

A trained model should not bypass the Marketplace governance process.[cite:1][cite:15]

Recommended flow:

1. Model is trained and registered in Azure ML.[cite:15]
2. User clicks **Publish to Marketplace** from sandbox detail page.
3. Marketplace creates a publisher submission record tied to the Azure ML model metadata.[cite:1]
4. Policy, evaluation, and approval steps run before deployment or listing.[cite:1]
5. Approved model appears in Asset Catalog with lineage to sandbox, dataset package, and training run.[cite:15][cite:1]

Minimum metadata to carry forward:

- Sandbox ID
- Project ID
- Azure ML model name/version
- Training run ID
- Data package versions
- Owner and approver lineage
- Evaluation artifact references

## Observability and Audit

Follow the platform's current observability pattern based on App Insights, Azure Monitor, OTLP, and audit records.[cite:1]

Track at minimum:

- Sandbox request count
- Approval latency
- Provisioning latency
- Provisioning failure rate
- Active sandboxes by type
- Active compute by profile
- Expiring sandboxes within 7 days
- Publish-to-marketplace conversion rate

Audit events to capture:

- Request submitted
- Approval granted/rejected
- Workspace created
- Role assignment completed
- Data package attached
- Launch URL generated
- Sandbox extended/suspended/resumed/retired
- Model published to marketplace

## Security Controls

Apply these baseline controls from day one:[cite:17][cite:25][cite:32]

- Managed identity for service-to-service operations
- Entra-based RBAC with no shared credentials
- Approved compute profiles only
- Approved data packages only
- Approval gate for restricted datasets and GPU requests
- Time-bound sandbox expiration
- Full audit trail for every lifecycle action
- Restrict direct infrastructure operations to platform operators only

## Delivery Phases

### Phase 1 — Marketplace Foundation (Weeks 1-4)

Deliverables:[cite:1]

- Sandbox asset type in Asset Catalog
- Sandbox request and detail UI
- Sandbox Registry and Template Registry
- Initial data package catalog
- Admin Dashboard approval queue
- API contracts and persistence model

Exit criteria:

- Users can request a sandbox from the Marketplace UI.
- Approvers can review and approve/reject requests.
- Sandbox records move through lifecycle states.

### Phase 2 — Azure ML Automation (Weeks 5-8)

Deliverables:[cite:25][cite:26][cite:32][cite:17]

- Infrastructure automation for personal and team templates
- Azure ML workspace creation
- Role assignment automation
- Data package to data asset binding
- Launch metadata generation
- Provisioning workflow execution and retry logic

Exit criteria:

- Approved requests provision working Azure ML sandboxes.
- Users can launch Azure ML Studio from the Marketplace.
- Data assets are visible and usable in the workspace.

### Phase 3 — Governance and Cost Controls (Weeks 9-10)

Deliverables:[cite:1][cite:17]

- Quota policy checks
- GPU approval path
- Expiry and extension workflows
- Idle compute controls
- Operational dashboards and alerts

Exit criteria:

- No sandbox can exceed approved compute or duration rules without review.
- Expiration and cleanup jobs run automatically.
- Admins can monitor failures and upcoming expirations.

### Phase 4 — Model Promotion Loop (Weeks 11-12)

Deliverables:[cite:15][cite:1]

- Publish-to-marketplace action
- Metadata handoff from AML to Publisher API
- Lineage and artifact mapping
- Pilot with one data science team

Exit criteria:

- A model trained in sandbox can enter Marketplace promotion flow.
- End-to-end lineage is visible from model asset back to sandbox context.

## MVP Recommendation

For the first release, keep the implementation intentionally narrow:[cite:1][cite:25][cite:26][cite:32]

- Support only **Personal** and **Team** sandbox templates.
- Offer only 2-3 approved data packages.
- Allow only `cpu-small`, `cpu-medium`, and approval-gated `gpu-small`.
- Use Marketplace UI plus Azure ML Studio deep links instead of building a fully custom notebook IDE.
- Keep restricted/PHI sandbox as a phase-two extension after standard governance paths are proven.

## Claude Agent Implementation Backlog

The following backlog is structured so a coding agent can execute it sequentially.

### Workstream 1 — Domain model and persistence

- Add `sandbox-workspace` asset type to marketplace schema.
- Add persistence collections for sandboxes, templates, data packages, lifecycle events.
- Add status enums and transition validation.
- Add project-scoped ownership model.

### Workstream 2 — Backend APIs

- Implement `POST /api/sandboxes`.
- Implement `GET /api/sandboxes` and `GET /api/sandboxes/{id}`.
- Implement approval, extension, suspend, resume, retire endpoints.
- Implement template and data package listing endpoints.
- Add audit event creation and trace propagation.

### Workstream 3 — Workflow orchestration

- Create provisioning workflow template.
- Create approval/HITL workflow branch.
- Create extension and retirement workflow templates.
- Implement retry and compensation logic.
- Emit execution history records.

### Workstream 4 — Azure ML connector

- Create service layer for workspace provisioning.
- Create role-assignment automation.
- Create datastore/data asset registration flow.[cite:26]
- Create launch URL generation.
- Create model publish metadata adapter.[cite:15]

### Workstream 5 — Frontend

- Add sandbox listing and discovery in Marketplace.
- Build request form.
- Build sandbox detail/status page.
- Add admin approval queue components.
- Add project workspace integration.

### Workstream 6 — Governance and operations

- Add policy checks for quota, sensitivity, duration.
- Add expiration scheduler and cleanup workflow.
- Add operational dashboard cards and alerts.
- Add publish-to-marketplace action and lineage display.

## Implementation Order for Claude Agent

Recommended execution order:

1. Define schemas and status transitions.
2. Add persistence containers and repository methods.
3. Build template and data package read APIs.
4. Build sandbox create/get APIs.
5. Add approval endpoints and lifecycle state machine.
6. Implement provisioning workflow runner integration.
7. Implement Azure ML connector methods.
8. Add frontend request/detail/admin views.
9. Add telemetry, audit, and alerts.
10. Add publish-to-marketplace integration.

## Acceptance Checklist

- [ ] Sandbox is discoverable in Marketplace Catalog.[cite:1]
- [ ] User can submit sandbox request with template, dataset, compute, and duration.
- [ ] Policy and approval path works correctly.[cite:1][cite:17]
- [ ] Approved request provisions Azure ML workspace successfully.[cite:25][cite:32]
- [ ] Workspace includes expected data assets and launch links.[cite:26]
- [ ] Sandbox lifecycle is visible in Admin Dashboard and project view.[cite:1]
- [ ] Audit and execution history records are written.[cite:1]
- [ ] Expiration and cleanup workflows operate automatically.
- [ ] Trained model can be handed off to Marketplace publisher flow.[cite:15][cite:1]

## Recommended Immediate Next Steps

- Finalize the sandbox asset schema and status model.
- Choose the first two workspace templates.
- Define the first three approved data packages.
- Confirm who owns approvals: platform admin, data steward, or project owner.
- Implement the backend registry and request API before building AML automation.
- Pilot with a single data science team before enabling broad self-service.
