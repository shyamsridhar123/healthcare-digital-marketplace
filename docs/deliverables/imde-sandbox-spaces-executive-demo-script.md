# IMDE Sandbox Spaces Executive Demo Script

## Demo Contract

- Scenario: `imde-rcm-denial-demo`
- Audience: executive review
- Target duration: 15 minutes
- Data posture: all visible data is synthetic, de-identified, simulated, or approved demo data
- Live-service posture: request, approval, lifecycle, publish, and projection records use app flows where practical; AML provisioning, notebook execution, and training/evaluation are deterministic demo projections unless a live workspace has been prevalidated

## Starting State

- Branch: `feat/imde-modernization`
- API env for deterministic backend path: `UAP_ENABLE_IMDE_DEMO=true` and `AZURE_FUNCTIONS_ENVIRONMENT=Development` (the latter enables actorId-based auth for reset/approve/publish without an admin token)
- Browser local publish marker cleared before rehearsal if you need pre-publish baseline: remove `localStorage["imde-demo-model-experience"]`
- Canonical reset endpoint, when API is running: `POST /api/sandboxes/demo/reset` with `{ "tenantId": "default", "demoScenarioId": "imde-rcm-denial-demo", "actorId": "presenter-admin" }` in local development, or include `x-imde-demo-admin-token` when `UAP_IMDE_DEMO_ADMIN_TOKEN` is configured.
- Expected reset response: `{ "tenantId": "default", "demoScenarioId": "imde-rcm-denial-demo", "deleted": { "lifecycleEvents": N, "submissions": N, "modelExperiences": N, "sandboxes": N } }`.
- Live Azure is **not** required for the executive flow. Request, approval, publish, and model experience are all deterministic projections; a missing AML compute instance, locked-down storage, or absent `publicNetworkAccess` does not block any of the 8 routes.

## Route-By-Route Walkthrough

| Time | Route | Primary click | Expected visible state | Fallback | Proof point |
|---|---|---|---|---|---|
| 0:00-1:30 | `/sandbox` | Start demo sandbox | Executive demo path card for RCM denial prediction | Open `/sandbox/request?demo=imde-rcm-denial-demo` directly | Sandbox capability is discoverable from marketplace UI. |
| 1:30-3:30 | `/sandbox/request?demo=imde-rcm-denial-demo` | Submit for Approval | Team GPU template, base model, synthetic/de-identified data packages, business justification | Use Load demo preset | Request shows governed compute/data/model bundle. |
| 3:30-5:00 | `/sandbox/[id]` | Approve as Platform Admin | Requested sandbox moves to ready with approval reason, data statement, lifecycle events | If API env is not set, explain live AML would provision and use seeded ready state | Visible approval and deterministic ready projection. |
| 5:00-6:30 | `/imde/notebooks?sandboxId=[id]&demo=imde-rcm-denial-demo` | Open starter notebook | Denial prediction fine-tuning notebook is primary and sandbox-scoped | Use notebook page directly | Marketplace-contained notebook preview, not a full IDE. |
| 6:30-8:30 | `/imde/experiments?sandboxId=[id]&demo=imde-rcm-denial-demo` | Publish selected run | PubMedBERT denial run is selected winner and governance-ready | Use selected winner banner | Evaluation is precomputed but lineage-ready. |
| 8:30-11:00 | `/imde/push?sandboxId=[id]&runId=run-denial-pubmedbert-v3&demo=imde-rcm-denial-demo` | Publish to Marketplace | Published success state links to `/models/rcm-denial-prediction-space` | If API unavailable, UI simulates publish and still sets local route | Guided lineage publish, not a thin pending submission. |
| 11:00-13:30 | `/models` | Open RCM Denial Prediction Space | Spaces-like card near top with runnable preview, governance, reuse signals | Open detail route directly | Existing Models marketplace is the publish destination. |
| 13:30-15:00 | `/models/rcm-denial-prediction-space` | Run preview | Runnable preview, metrics, sandbox lineage, governance evidence | Show static detail fallback | Executive payoff: trained model becomes a reusable governed experience. |

## Presenter Notes

- Do not describe the demo as live training. Say: "The training/evaluation results are deterministic demo projections so we can focus on the governed workflow."
- Call out the approval moment separately from model governance: platform admin approves sandbox/compute/data; model governance passes during publish.
- When showing Models, emphasize that this is not a separate public Spaces product. It is a Spaces-like experience inside the existing enterprise Models marketplace.
- Keep PHI language out of typed fields. Use synthetic claim examples only.

## API-Only Smoke (for headless rehearsal or pre-flight)

When validating end-to-end without driving the UI, hit the API directly. Two actor roles matter:

- **Approver** (reset, approve): `actorId: "presenter-admin"` in local dev, or `x-imde-demo-admin-token` header in token mode.
- **Publisher** (publish-model): `actorId: "ds-priya-shah"` (= sandbox owner). The admin token also works.

```http
POST /api/sandboxes
{ "name": "RCM denial prediction fine-tuning",
  "tenantId": "default", "ownerId": "ds-priya-shah",
  "demoScenarioId": "imde-rcm-denial-demo",
  "baseModelId": "hf-microsoft-biomednlp-pubmedbert-base-uncased-abstract",
  "workspaceTemplateId": "aml-team-standard-v1", "sandboxType": "team",
  "dataPackages": ["claims_training","denials_gold"],
  "computeProfile": "gpu-small", "durationDays": 30,
  "costCenter": "RCM-AI-2026",
  "businessJustification": "…" }
→ 201 { "id": "sbx-…", "status": "requested", "demoScenarioId": "imde-rcm-denial-demo" }

POST /api/sandboxes/{id}/approve
{ "actorId": "presenter-admin", "approverId": "platform-admin-morgan-lee" }
→ 200 { "status": "ready", "amlWorkspaceName": "…", … }

POST /api/sandboxes/{id}/publish-model
{ "actorId": "ds-priya-shah",
  "amlModelName": "rcm-denial-prediction-space",
  "amlModelVersion": "1",
  "trainingRunId": "run-denial-pubmedbert-v3" }
→ 201 { "submissionId": "…", "projectionId": "pme-rcm-denial-prediction-space",
        "modelRouteId": "rcm-denial-prediction-space",
        "modelRoute": "/models/rcm-denial-prediction-space" }
```

Notes on payload contract:

- `amlModelVersion` must be a positive integer string (`"1"`, not `"1.0.0"`).
- The publish body field is `trainingRunId`, even though the UI URL exposes it as `?runId=…`.
- Only `run-denial-pubmedbert-v3` is accepted as the selected winner; any other id returns 400.

## Smoke Checklist

- Reset canonical scenario and clear local publish marker.
- Open `/sandbox`; verify the executive demo card appears.
- Submit the demo request and land on sandbox detail.
- Approve the sandbox; verify ready state, approval reason, lifecycle events, data statement, and next actions.
- Open notebook and experiments from the sandbox detail page.
- Verify selected run is `run-denial-pubmedbert-v3` and publish action is available.
- Publish from `/imde/push`; verify success state includes a marketplace link.
- Open `/models/rcm-denial-prediction-space`; verify runnable preview, metrics, lineage, and governance evidence render.
- Return to `/models`; verify the Published Model Experience card appears with preview and governance badge.
- Reset again; verify backend demo records are removed and browser-local publish marker is cleared for the next rehearsal.

### Backend Proof (when page HTML doesn't make hydrated content visible)

`/models` and `/models/rcm-denial-prediction-space` render the frame server-side but hydrate the experience card and metrics client-side, so a curl/Invoke-WebRequest against those URLs won't contain `rcm-denial-prediction-space` or `f1=0.87` as visible text. Use the backing API as the authoritative proof:

```http
GET /api/model-experiences?modelRouteId=rcm-denial-prediction-space&tenantId=default
→ 200 { "items": [ { "modelRouteId": "rcm-denial-prediction-space",
                     "status": "published", "trustStatus": "governance-passed",
                     "lineage": { "sandboxId": "sbx-…", "selectedRunId": "run-denial-pubmedbert-v3",
                                  "metrics": { "f1": 0.87, "accuracy": 0.91, "latencyMs": 142 } … } } ],
       "total": 1 }
```

## Accessibility And Display Checks

- Desktop/projector: no card text overlaps at 1366px width.
- Narrow window: primary actions remain visible without horizontal scrolling.
- Keyboard: request submit, approval, notebook/experiments/publish links, and model preview actions are focusable.
- Screen-reader names: status badges, approval button, publish button, and model preview button have readable visible labels.

## Healthy Signals

- `sandbox-demo.test.js` passes.
- API build passes.
- Publish response includes `submissionId`, `projectionId`, `modelRouteId`, and `modelRoute`.
- Model detail route is `/models/rcm-denial-prediction-space`.

## Known Local Validation Caveat

`npm run type-check` currently fails on pre-existing project issues outside this slice: missing MSAL module type resolution, chart/resizable component type drift, and legacy mock-data pricing/type mismatches. The IMDE/sandbox/model changes introduced in this demo no longer appear in the type-check error list.
