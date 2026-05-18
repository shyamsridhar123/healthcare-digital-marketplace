# Data Scientist: Train in IMDE, Publish as Space, and Enable Teammate Reuse

## Demo Goal

Show how a data scientist uses the AI Marketplace IMDE portal to request governed data and compute, train a denial-prediction model, publish the trained agent as an internal Hugging Face Spaces-like **Space**, let teammates run it through a chat-only UI, and seed a new sandbox from the immutable snapshot.

---

## Roles

| Role | Who |
|---|---|
| **Data Scientist** | Dr. Sarah Chen, RCM Insights team |
| **Teammate Evaluator** | Mike Johnson, RCM Operations |
| **Portal Admin** (approver for GPU requests) | Platform Ops |

---

## Prerequisites

- AI Marketplace web running: `http://localhost:3000`
- Local API running: `http://localhost:7071/api`
- At least one sandbox already in the `ready` state (for the "launch" section)
- Azurite running for Cosmos emulation (`azurite --silent`)
- Demo Space route available: `http://localhost:3000/marketplace/spaces/denial-risk-copilot`

---

## Storyline

Today's pain: Sarah wants to train a denial-prediction model on governed claims data, then let RCM teammates try it before they invest in their own sandbox. Today that means data-access tickets, compute requests, screenshots, notebooks, Teams messages, and a lot of “can you give me access to your environment?”

With AI Marketplace IMDE + Spaces: Sarah requests governed data/compute, trains in a sandbox, publishes a safe chat-only snapshot, and teammates try or reuse the agent from the marketplace.

---

## Act 1 — Discover Available Data Packages (2 minutes)

### Step 1 — Open the IMDE portal

Open `http://localhost:3000/imde`.

Talk track:
> This is the IMDE dashboard — the Integrated Model Development Environment inside AI Marketplace. Sarah lands here to manage her sandboxes and see what data is approved for model work.

Point out:
- Sandbox cards with live status badges (Running, Idle, Stopped)
- "New Sandbox" button top-right
- Compute health indicators

---

### Step 2 — Browse data packages before requesting compute

Call the data-packages API directly to show what is available:

```
GET http://localhost:7071/api/data-packages?tenantId=default
```

Expected response (three seed packages):

```json
{
  "items": [
    {
      "dataPackageId": "claims_training",
      "displayName": "Claims Training Dataset",
      "description": "De-identified claims records for RCM model training. Includes diagnosis codes, procedure codes, and payer info.",
      "classification": "internal",
      "allowedSandboxTypes": ["personal", "team"],
      "approvalPolicy": "auto-approve",
      "starterNotebook": "notebooks/claims_baseline_train.ipynb"
    },
    {
      "dataPackageId": "denials_gold",
      "displayName": "Denials Gold Dataset",
      "description": "Curated denial reason codes and appeal outcomes for denial prediction models.",
      "classification": "internal",
      "allowedSandboxTypes": ["personal", "team"],
      "approvalPolicy": "standard-review",
      "starterNotebook": "notebooks/denials_prediction_baseline.ipynb"
    },
    {
      "dataPackageId": "clinical_notes_phi",
      "displayName": "Clinical Notes (PHI)",
      "classification": "phi",
      "allowedSandboxTypes": ["restricted"],
      "approvalPolicy": "restricted-review"
    }
  ]
}
```

Talk track:
> The data catalog shows every dataset approved for model work in this tenant. Classification controls which sandbox types can access it. Claims and Denials are `internal` — they can run in a personal or team workspace. Clinical Notes is `phi` — it needs a restricted workspace with mandatory approval and network isolation.

Point out:
- `approvalPolicy: "auto-approve"` on claims → Sarah gets in immediately
- `approvalPolicy: "standard-review"` on denials → goes to a human reviewer
- `allowedSandboxTypes` enforces the policy at request time, not after provisioning

---

## Act 2 — Request a Sandbox (3 minutes)

### Step 3 — Choose a template

In the IMDE UI, click **New Sandbox**. The "New Sandbox" dialog opens.

Show the three available workspace templates (from `GET /api/sandbox-templates`):

| Template | Type | Default Compute | Needs Approval |
|---|---|---|---|
| Personal Data Science Workspace | personal | cpu-small | No |
| Team Collaboration Workspace | team | cpu-medium | Yes |
| Restricted PHI Workspace | restricted | cpu-medium | Yes |

Talk track:
> Sarah wants to work with the Claims Training Dataset and Denials Gold together. Both are `internal` — she can use the Team template. She picks `cpu-medium` for now but will upgrade to GPU once she has baseline metrics.

---

### Step 4 — Submit the sandbox request

Fill in the dialog fields:

| Field | Value |
|---|---|
| Name | `Denial-Prediction-Sprint-2` |
| Template | Team Collaboration Workspace |
| Data Packages | `claims_training`, `denials_gold` |
| Compute Profile | `cpu-medium` |
| Duration | 30 days |
| Cost Center | `RCM-Analytics-2026` |
| Business Justification | `Training denial prediction model v4 for payer contract negotiations` |

Click **Create**.

The API call the UI sends:

```json
POST /api/sandboxes
{
  "name": "Denial-Prediction-Sprint-2",
  "workspaceTemplateId": "aml-team-standard-v1",
  "sandboxType": "team",
  "dataPackages": ["claims_training", "denials_gold"],
  "computeProfile": "cpu-medium",
  "durationDays": 30,
  "costCenter": "RCM-Analytics-2026",
  "businessJustification": "Training denial prediction model v4 for payer contract negotiations"
}
```

Expected response:

```json
{
  "sandboxId": "sbx-a3f1c9d2",
  "status": "requested",
  "requiresApproval": true,
  "message": "Sandbox request submitted. Awaiting team-template approval."
}
```

Talk track:
> The team template requires approval because it allocates shared cluster compute. The system immediately logs a lifecycle event and routes to the approver queue. Sarah sees the new card in the IMDE dashboard with a "Requested" badge.

Point out:
- Status = `requested`, not pending in a ticket queue
- The lifecycle event is stored in Cosmos (`sandbox-lifecycle-events`)
- Auto-approve would have flipped directly to `provisioning`

---

### Step 5 — Show the approval flow (fast path)

Open the sandbox detail (or call `GET /api/sandboxes/sbx-a3f1c9d2`). Status is `requested`.

Approve via the API (simulating Platform Ops action):

```json
POST /api/sandboxes/sbx-a3f1c9d2/approve
{
  "approverId": "ops-admin",
  "notes": "Approved for sprint 2, claims + denials scope only"
}
```

The system:
1. Transitions status → `provisioning`
2. Emits `sandbox.approved` lifecycle event
3. Kicks off AML workspace provisioning asynchronously

Watch the IMDE card transition from **Requested → Provisioning → Ready** as the AML workspace comes up.

Talk track:
> Approval is a lightweight governance gate, not a ticket. The approver gets the full context — requester, data packages, cost center, justification — in one view. Once approved, the platform provisions an Azure Machine Learning workspace with the two data assets already registered.

---

## Act 3 — Launch the Training Environment (2 minutes)

### Step 6 — Open the pre-provisioned sandbox

When status = `ready`, the IMDE card shows launch links. Click **Open in Studio** (or **Open Notebook**).

Talk track:
> The workspace comes up with both data assets pre-mounted. Sarah doesn't write a single `from azure.storage import BlobServiceClient` block. The Claims Training Dataset is already at `azureml:claims_training:12` and Denials Gold at `azureml:denials_gold:4`.

Point out what comes pre-loaded:
- ML Frameworks: PyTorch, TensorFlow, scikit-learn, XGBoost, LightGBM
- Data/ETL: pandas, Spark, dbt, Great Expectations, Arrow
- Dev Tools: JupyterLab, VS Code Server, git, Poetry
- Observability: MLflow, Weights & Biases, OpenTelemetry

The starter notebook (`notebooks/denials_prediction_baseline.ipynb`) is already staged.

---

### Step 7 — Request a GPU upgrade mid-sprint

Sarah's CPU-medium baseline results are good. She wants to fine-tune a transformer. She clicks **Upgrade Compute** on the sandbox card.

The upgrade request:

```json
PATCH /api/sandboxes/sbx-a3f1c9d2
{
  "computeProfile": "gpu-small",
  "justification": "Baseline AUC 0.81 on cpu-medium. Switching to GPU for transformer fine-tuning."
}
```

The API routes this to approval automatically because `computeProfile: gpu-small` always requires approval regardless of template.

Talk track:
> GPU compute is always approval-gated — policy is in the platform, not a spreadsheet. The approver sees the upgrade request alongside the existing sandbox context. If approved, the workspace is migrated to the GPU cluster without Sarah losing her data mounts, MLflow runs, or notebooks.

---

## Act 4 — Extend or Clean Up (1 minute)

### Step 8 — Extend the sandbox before expiry

Near day 28, Sarah requests an extension:

```json
POST /api/sandboxes/sbx-a3f1c9d2/extend
{
  "additionalDays": 14,
  "justification": "Model training still running, need two more weeks for final hyperparameter sweep."
}
```

The platform adds 14 days to `expiresAt` and emits a lifecycle event.

---

### Step 9 — Stop the sandbox when done

```json
POST /api/sandboxes/sbx-a3f1c9d2/stop
```

Status transitions to `stopped`. Compute is released. Data assets stay registered for the sandbox's remaining lifetime. The full lifecycle event history is queryable.

---

## Act 5 — Publish the Trained Agent as a Space (3 minutes)

### Step 10 — Publish from the IMDE sandbox card

Return to `http://localhost:3000/imde`.

On the `RCM-Denial-Prediction-v3` or `Denial-Prediction-Sprint-2` sandbox card, click **Publish as Space**.

Talk track:
> Sarah has trained a denial-risk model and wrapped it as a chat-only agent. Instead of giving teammates sandbox access, she publishes a Space — an immutable snapshot of the agent definition that can run safely in the marketplace.

The publish review dialog shows:

| Check | Demo result |
|---|---|
| Chat-only definition | Pass — no visitor file uploads |
| PHI/secret scan | Pass — instructions and metadata pass demo checks |
| Snapshot boundary | Pass — data, credentials, notebooks, and runtime threads excluded |
| Budget guardrail | Pass — 250k daily token cap, 80% publisher alert |

Click **Publish Space**. The dialog transitions through:

1. Validating
2. Snapshotting
3. Provisioning runtime
4. Indexing Space
5. Published

Click **Open Space**.

Talk track:
> This is intentionally not a clone of Sarah's compute. The Space gets a versioned snapshot: model settings, instructions, output schema, and safe references. Source data, credentials, notebooks, and chat/runtime state do not cross the boundary.

---

## Act 6 — Teammate Runs the Published Space (3 minutes)

### Step 11 — Discover the Space in the marketplace

Open `http://localhost:3000`.

Click the **Spaces** tab.

Open **Denial Risk Copilot Space**.

Talk track:
> The marketplace now has a Spaces category. This is the Hugging Face Spaces-like experience, but internal: tenant-gated, chat-only, snapshot-backed, and designed for healthcare governance.

Point out:
- `IMDE Space` badge
- Team visibility
- Live runtime state
- Run count and daily token budget
- Snapshot provenance: publisher, source sandbox, snapshot version, hash
- Data references: `claims_training@12`, `denials_gold@4`
- Guardrails: no visitor file uploads, no source data copied, team visibility rechecked

---

### Step 12 — Run the chat-only Space

In the Space chat box, use the example prompt:

```text
Predict denial risk for a de-identified outpatient claim with payer mismatch and prior-auth missing.
```

Click **Run Space**.

Expected response:

```text
Estimated denial risk: 72% high. Top drivers are prior-authorization mismatch, payer-policy variance, and historical denial pattern for the procedure group. Try seeding a sandbox to inspect the immutable agent definition and adapt it for your team.
```

Talk track:
> Mike can evaluate the agent from a link without joining Sarah's sandbox. The first-run warning reminds him not to paste PHI. The Space is chat-only in v1: no uploads, no notebook view, no raw document flow.

Run a second prompt:

```text
What evidence should the appeals team gather for a high-risk medical-necessity denial?
```

Talk track:
> This gives RCM Operations enough confidence to decide whether to reuse the agent, ask Sarah for changes, or ignore it — without waiting for compute access.

---

## Act 7 — Use This Agent to Seed a Sandbox (2 minutes)

### Step 13 — Seed a sandbox draft from the immutable snapshot

On the Space detail page, click **Use this agent**.

The confirmation panel shows:

```text
Sandbox draft seeded from snapshot-v1.2.0.
No source data or secrets were copied.
```

Talk track:
> This is the enterprise version of “fork a Space.” Mike does not get Sarah's compute, notebooks, data mounts, credentials, or chat logs. He gets a new sandbox draft seeded from the sanitized agent snapshot.

Point out what is copied:
- Agent instructions
- Model settings
- Output schema
- Safe tool/data references

Point out what is not copied:
- Source datasets
- Credentials
- Runtime thread IDs
- Notebook files
- Visitor chat transcripts
- Sarah's compute

---

## Act 8 — Republish / Update Behavior (Optional, 1 minute)

Sarah trains v1.3 in IMDE and clicks **Publish as Space** again.

Talk track:
> Existing chat sessions remain pinned to the snapshot they started with. New visitors see the updated Space. Active visitors get an “updated snapshot available” toast instead of silently changing behavior mid-conversation.

This maps to the plan's republish behavior: mutable Space pointer, immutable snapshots.

---

## Key Talking Points

1. **Data governance is built into the request** — `allowedSandboxTypes` and `approvalPolicy` on each dataset enforce policy before provisioning, not after.

2. **Compute cost is controlled without a ticket** — `gpu-small` always requires approval. CPU profiles auto-approve for personal/team work. Budget metadata (`costCenter`) is captured at request time.

3. **Lifecycle is fully auditable** — every state change (requested → approved → provisioning → ready → stopped) emits a `sandbox-lifecycle-events` record with actor, outcome, and details.

4. **PHI datasets need a different lane** — `clinical_notes_phi` can only be requested into a `restricted` sandbox with `restricted-review` approval and separate network controls. The platform enforces this at the data-package level, not by trusting the requester to choose correctly.

5. **Spaces turn sandbox work into reusable internal demos** — Sarah publishes a chat-only snapshot from IMDE; Mike runs it from the marketplace without sandbox access.

6. **Use this agent is safe reuse, not full fork/clone** — the seeded sandbox draft copies the agent definition, not source data, secrets, notebooks, runtime state, or chat logs.

7. **From request to training to teammate evaluation in one afternoon** — No Jira ticket, no platform-engineering handoff, no shared notebook server with stale packages. Governance happens inside the platform.

---

## Demo Reset

```bash
# Clear demo sandboxes from Azurite (leave seed data packages intact)
curl -X DELETE "http://localhost:7071/api/sandboxes?tenantId=demo&purge=true"
```

Or simply restart Azurite to reset all state.
