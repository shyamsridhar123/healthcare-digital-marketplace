# Onboarding Agent — Design (v1, Governed-MVP)

**Status:** Ready for plan ·
**Date:** 2026-05-13 ·
**Author:** Brainstormed with Copilot via `/superpowers:brainstorming` ·
**Scope:** §12.1 Onboarding Agent for the AI Asset Marketplace (UAP) ·
**Implements:** Architecture Document `UAP_Architecture_Document_formatted.docx` §12.1 ·
**Related artifacts:** [onboarding-agent-user-stories.csv](../plans/onboarding-agent-user-stories.csv) · [onboarding-agent-glossary.md](../plans/onboarding-agent-glossary.md) · [global-orchestrator-requirements.md](./2026-04-09-global-orchestrator-requirements.md)

---

## TL;DR

The Onboarding Agent is a **LangGraph-based onboarding graph runner** that lives in the AI Marketplace as one of its own assets. It drives a 3-phase, 7-stage pipeline that takes a domain agent from a conversational scaffold in VS Code to a live, governed endpoint in the marketplace — typically in **under 60 minutes** for low-risk submissions.

**v1 quality bar:** Governed-MVP — submit → SLSA verify → security/PHI scan → approval gate (manual for sensitive) → single-step deploy → AgentCard active → APIM-callable. **No canary in v1** (handed off to Lifecycle Manager in v2).

**Key architecture choices:**
1. **Approach 2 — Agentic with Deterministic Gates.** The agent plans per submission and assembles human-readable artifacts; gates (SLSA verify, scan thresholds, approval) are non-bypassable deterministic tools.
2. **Hybrid GitOps deployment.** GitHub Actions runner applies a **platform-published Terraform module** (`agent-aca/azurerm`) via OIDC federation; the Onboarding Agent gates the apply via a `uap/onboarding-gate` check-run.
3. **Three authoring surfaces** powered by one agent: Publisher Portal wizard, `uap` CLI, and a **VS Code Copilot Chat skill** (`SKILL.md` + MCP server).
4. **Single Azure-native telemetry plane** (App Insights / Log Analytics with OTel GenAI semantic conventions; no Phoenix).

**What this design covers:** all 7 sections (System Context · Feature Pillars · Data & Auth · Pipeline Phases · Telemetry · MVP Cut Line · Open Questions).

**What's next:** invoke the `writing-plans` skill to produce an executable implementation plan from this design.

---

## Locked decisions (the Q&A trail)

These decisions came out of the brainstorm dialog and are now baked into the design.

| # | Decision | Choice |
|---|---|---|
| Q1 | Goal of the brainstorm | Comprehensive design = MVP slice + new gap features + persona tailoring |
| Q2 | Persona shape | All three (SME-coder · full-stack · framework-native) with **adaptive scaffolding** driven by repo-shape detection |
| Q3 | GitHub integration shape | GitHub.com + **GitHub App** + **one repo per agent** (monorepo deferred) |
| Q4 | Phase-1 surfaces | Publisher Portal wizard **+** `uap` CLI **+** VS Code Copilot Chat skill (replaced the original "VS Code extension" idea) |
| Q5a | Phase-3 deploy target | **ACA only in v1**, Foundry-hosted in v2 |
| Q5b | v1 quality bar | **Governed-MVP** (no canary) |
| Approach | Agent architecture | **Approach 2 — Agentic with Deterministic Gates** (eat own dogfood; the Onboarding Agent is itself a marketplace asset) |
| Deploy fork | Who runs the deployment | **C — Hybrid: runner-applies a platform-published Terraform module** (publisher CI runs `terraform apply` against `agent-aca/azurerm`; agent gates the apply via check-run) |
| IaC dialect | Terraform flavor | **Terraform AzureRM** for v1 |
| Pillar 2 packaging | VS Code surface | **Copilot Chat skill (`SKILL.md`) + MCP server**, not a custom extension |
| Telemetry | Backend | **Single Azure-native plane** (App Insights / Log Analytics + OTel GenAI conventions); cost not a constraint |

---

## 1. System Context

### What the Onboarding Agent is

A **LangGraph-based onboarding service** (`onboarding-agent`) hosted on Azure Container Apps. It has identity in Entra (managed identity), an AgentCard in the registry (the marketplace's first asset), and is triggered by ACA-hosted ingestion adapters:

- The **Publisher API** when a submission is created via Portal or CLI
- A **GitHub App webhook receiver** when a CI workflow run completes on a connected repo

It is *not* a single Function. It is a long-running ACA app whose LangGraph `invoke` / `stream` entrypoint takes a `SubmissionEvent` or `AuthoringSessionEvent`, resumes from a Cosmos checkpoint keyed by `(tenantId, submissionId)`, and advances graph nodes until the submission terminates (`active` / `rejected` / `failed` / `withdrawn`).

### Boundary diagram

```
                                    ┌─────────────────────────────────────┐
                                    │   Domain Engineer (3 personas)      │
                                    │   • SME-coder  • Full-stack  • Framework-native │
                                    └──────┬──────────────────┬───────────┘
                                           │ pushes code      │ uses
                                           ▼                  ▼
                              ┌──────────────────┐   ┌────────────────────┐
                              │ GitHub.com repo  │   │ Portal / uap CLI / │
                              │ (one per agent)  │   │ VS Code Copilot    │
                              │  + Terraform     │   │ Chat skill         │
                              │  module call     │   └──────────┬─────────┘
                              └────────┬─────────┘              │
                                       │ Actions: build,         │
                                       │ SBOM, SLSA, eval,       │
                                       │ scan, terraform apply   │
                                       ▼                         ▼
                              ┌─────────────────────────────────────────────┐
                              │  GitHub App  ←─ webhooks ─→  Publisher API  │
                              │  (UAP Onboarder)              (APIM-fronted)│
                              └────────────────────┬────────────────────────┘
                                                   │ enqueues SubmissionEvent
                                                   ▼
                              ┌─────────────────────────────────────────────┐
                              │     ★ Onboarding Agent (LangGraph, ACA) ★   │
                              │  Plans per submission; calls deterministic   │
                              │  tools; never bypasses gates.                │
                              └───┬─────────────┬───────────┬──────────┬────┘
                                  │             │           │          │
                                  ▼             ▼           ▼          ▼
                        ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
                        │ Validation   │ │ SLSA     │ │ Security │ │ Approval │
                        │ & Schema     │ │ Verifier │ │ Scanner  │ │ Workflow │
                        │ Service      │ │ (cosign) │ │ (PHI/CVE │ │ (Logic   │
                        │              │ │          │ │  /secret)│ │  Apps +  │
                        │              │ │          │ │          │ │  Teams)  │
                        └──────────────┘ └──────────┘ └──────────┘ └──────────┘
                                  │             │           │          │
                                  └─────────────┴─────┬─────┴──────────┘
                                                      ▼
                              ┌─────────────────────────────────────────────┐
                              │  AgentCard Registry (Cosmos DB)              │
                              │  + AI Search index   + Audit Log container   │
                              └────────────────────┬────────────────────────┘
                                                   │ on Approved
                                                   ▼
                              ┌─────────────────────────────────────────────┐
                              │  Onboarding Agent transitions check-run     │
                              │  → success → publisher's CI runs            │
                              │  `terraform apply` → posts outputs back      │
                              └────────────────────┬────────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────────────────────┐
                              │  Marketplace Catalog (status=active)         │
                              │  + LLM/Agent Gateway exposes via APIM        │
                              └─────────────────────────────────────────────┘

           Cross-cutting:  OTel → App Insights · Audit Log → Cosmos · RBAC via Entra
```

### Ownership of concerns

| Concern | Owner |
|---|---|
| Plan-per-submission orchestration | Onboarding Agent (LLM-decided) |
| Repo-shape detection & adaptive scaffolding | Onboarding Agent (LLM + tools) |
| Governance ticket assembly + remediation copy | Onboarding Agent (LLM-drafted, deterministic-published) |
| Schema validation, SLSA verify, security scan, AgentCard write, OIDC-federation provisioning | **Deterministic tools** — agent calls them but cannot mutate their results |
| `terraform apply` execution | **Publisher's CI runner** (using OIDC federation, scoped to one RG) |
| Approval routing | **Policy Engine + Logic Apps** — gates are out-of-band |
| Canary rollout / rollback | **Lifecycle Manager** (§17.3) — explicit handoff after first deploy in v1 |

### What it explicitly does NOT do

- Does **not** invoke GitHub Actions itself (developer-driven push triggers CI; agent is post-push only)
- Does **not** run the build, SBOM generation, or SLSA attestation (the *hardened builder* in CI does)
- Does **not** make approval decisions for sensitive assets (Policy Engine + human reviewers do)
- Does **not** drive canary advancement in v1 (handed off to Lifecycle Manager)
- Does **not** support monorepo, GHES, or Foundry-hosted runtime in v1 (deferred)
- Does **not** execute `terraform apply` itself — the CI runner does, gated by an agent-controlled check-run

### Trust model in one sentence

**The agent is the *plan-and-explain* layer; the tools are the *prove-and-mutate* layer; the gates are the *non-bypassable* layer.** Anything that changes platform state must flow through a deterministic tool that re-validates its inputs.

---

## 2. The 13 Feature Pillars

### Pillar 1 — Repo-shape detection
Inspects a connected repo and classifies it as `sme-coder` / `full-stack` / `framework-native`; picks the right scaffolding template, Dockerfile generator (or skip), and Terraform inputs. Re-runs on every push to detect drift.
**v1.** All three personas. 🆕 New.

### Pillar 2 — Pre-push Conversational Co-pilot ⭐
The agent's brain in Phase 1. Same agent reachable through every authoring surface (Pillar 3). Drives a dialog with the engineer to author an AgentCard from scratch *or* from an existing repo.

| Capability | What it does |
|---|---|
| **Conversational AgentCard authoring** | The LangGraph authoring graph walks the engineer through name, version, owner, capability tags, RAI tags, data categories — using natural language, not a 12-field form. Conversation state persists per `(tenantId, userId, repo)`. |
| **Source-aware capability inference** | Reads engineer's source, identifies callable functions, prompt templates, MCP tool decorators; proposes capability tags drawn from controlled vocabulary. Engineer accepts/edits/rejects each. |
| **Source-aware data sensitivity inference** | Scans source for: regex patterns suggesting PHI/PII, sensitive imports, comments mentioning HIPAA/PHI/PII, hard-coded clinical codes (ICD/CPT). Auto-suggests `data_categories`; **flips a "PHI suspected — confirm or remediate" gate** if PHI detected. |
| **Tenant policy lint** | Applies per-tenant authoring rules during the dialog. Violations surface *before* PR opens with remediation suggestions. Guardrails over gates. |
| **Eval stub synthesis** | From inferred capabilities, generates a starter eval harness in **Microsoft Foundry Evaluations format**. Engineer reviews and augments. |
| **PR scaffold writer** | Once dialog converges, agent commits scaffolded files (`agent.yaml`, Terraform module call, workflow yaml, `.github/CODEOWNERS`, eval stubs, optional `Dockerfile`) to a new branch and opens the initial PR pre-populated with **labels** (`uap-onboarding`, `tenant:<id>`, `risk-tier:<auto>`, `phi-suspected` if applicable) and **CODEOWNERS** auto-derived from tenant + risk tier. |
| **Resumable drafts + conversation memory** | Drafts auto-save every 30s; resume from any surface; agent remembers prior choices. |

**v1.** All personas (SME-coder gets the most leverage). 🆕 New.

### Pillar 3 — Authoring surfaces
Three I/O channels for the same agent:

1. **Portal wizard** (Next.js, browser-based form + chat panel)
2. **`uap` CLI** (`init`, `link`, `chat`, `validate`, `status`, `submit`, `policy sync`, `withdraw`, `doctor`)
3. **VS Code Copilot Chat skill** (`SKILL.md` scaffolded into onboarded repos at `.github/skills/uap-onboarding/SKILL.md`, AND publishable to the Copilot CLI marketplace as `atv-skill-uap-onboarding`); pairs with `.vscode/mcp.json` registering `uap-onboarding-mcp`)

All three call the same agent endpoint and the same MCP tools. Server-side conversation state is keyed by `(tenantId, userId, repo)` so engineers can switch surfaces mid-dialog.

**v1.** All three. 🆕 (skill packaging is new; CLI/Portal extend US-OB-01a, US-OB-01b, US-OB-07).

### Pillar 4 — GitHub App "UAP Onboarder"
Webhook receiver for `workflow_run.completed`; posts `uap/onboarding-gate` check-run on PRs (gates `terraform apply`); comments with remediation when scans/SLSA fail; auto-configures per-repo OIDC federation + scoped Entra app on first link; rotates federation creds; revokes on unlink.

**v1.** All personas. 🆕 New (replaces ad-hoc reusable Action shape from US-OB-01c).

### Pillar 5 — Manifest schema validation & semver enforcement (deterministic)
Strict server-side validator: `agent.yaml` schema, semver bump enforcement (reject equal/lower), duplicate `name+version` → 409, controlled-vocabulary normalization, JSON Pointer error reporting. The rigorous gate that runs in CI; downstream of Pillar 2's friendly co-pilot.

**v1.** Maps to US-OB-04, US-OB-05.

### Pillar 6 — Platform Terraform module `agent-aca/azurerm`
Opinionated, semver-published Terraform module:
- ACA app + revision + Managed Identity + Key Vault access policy + APIM operation binding + private endpoint + NSG + uniform tags
- Inputs: `agent_card`, `image_ref`, `cpu/memory`, `secrets[]`
- State in publisher-owned Storage Account (lock + encryption)
- Renovate-bot-friendly module bumps (semver pinned in publisher repos)

**v1.** All personas (transparently). 🆕 New (replaces in-platform Bicep from US-OB-06).

### Pillar 7 — CI workflow template (hardened builder)
Reusable composite GitHub Action template that runs in publisher's repo:
build -> CycloneDX SBOM -> SLSA attestation (Sigstore-signed via OIDC) -> eval harness -> publishes artifacts -> waits on uap/onboarding-gate -> terraform plan -> terraform apply -> posts state outputs plus `tenantId` to `/submissions/{id}/deployment-outputs` with an `x-uap-signature-256` HMAC over the raw JSON body.

Pinnable by SHA, minimal permissions documented.

**v1.** Maps to US-OB-01c, US-OB-07 (extended with terraform stage).

### Pillar 8 — Provenance verification (SLSA + Sigstore)
`verify_slsa_attestation` tool: cosign-verifies attestation against marketplace policy — allowed builder identities, allowed source repos, OIDC issuer = `token.actions.githubusercontent.com`, source SHA matches HEAD. Hard gate; failure blocks the check-run. Verification record stored in Audit Log.

**v1.** 🆕 New (was implied by §12.1, never operationalized in user stories).

### Pillar 9 — Security & PHI scanning (gate)
Static scan: PHI patterns (SSN, MRN, DOB), secrets (gitleaks-style), CVE in deps, license blocklist. Prompt scan for injection patterns. Azure AI Content Safety on sample outputs from eval harness. Findings include `file:line + rule_id + severity + remediation_url`; PR comment with patch suggestion when possible.

**v1.** Maps to US-OB-03, US-OB-09.

### Pillar 10 — Approval workflow & risk routing
Risk classifier (data categories × model tier × network egress × first-version flag) → `low/med/high/critical`. Low → auto-approve + audit. Med+ → Logic Apps routes to reviewer queue + Teams notification. Reviewer sees AgentCard, scan results, RAI tags, dep tree, prior version diff, **LLM-drafted governance ticket**. SLA timer + 24h escalation.

**v1.** Maps to US-OB-08, US-OB-10.

### Pillar 11 — AgentCard registry & lifecycle status
Cosmos write partitioned by `tenantId`; AI Search reindex within 30s of go-live; status state machine: `submitted → validating → staging → approval-pending → approved → provisioning → active → deprecated → archived`. Failed terminals: `rejected`, `failed`, `withdrawn`. AgentCard auto-updated post-`terraform apply` from runner-posted outputs.

**v1.** Maps to US-OB-04 (AgentCard generation) and US-OB-14 (discovery via reindex on activate). Deprecation/decommission state transitions (US-OB-17) deferred to v2.

### Pillar 12 — Post-push governance ticket + remediation copy
The agent's *intelligence pillar in post-push mode*. Per submission:
- Drafts a one-screen governance ticket for the reviewer (what changed, risk highlights, SBOM/CVE deltas, eval delta vs. prior version, suggested approver)
- On failure: drafts a PR comment in plain English ("your `agent.yaml` is missing `data_categories`; add `phi: false` if you don't process PHI") with copy-pasteable patch when feasible

Same `uap-onboarding` skill (Pillar 3) triggers post-push too: "fix my onboarding failure" / "why did my submission fail?".

**v1.** 🆕 New (the differentiator that justifies "agent" over "pipeline").

### Pillar 13 — Telemetry, lineage & SLA dashboard
Every stage emits OTel spans with `submissionId, agentId, version, tenantId, stage, outcome, duration` plus OTel GenAI conventions (`gen_ai.system`, `gen_ai.usage.*`, etc.) for LLM spans. `trace_id` propagated through GitHub App → Onboarding Agent → tools → Terraform run → ACA runtime. App Insights workbook with funnel, stage durations, failure-rate alerts. PHI-scrubbed logs.

**v1 basic** (workbook + alerts), **v2 full** (lead-time SLO exec dashboard, US-OB-16).

### Pillar dependency graph

```
1 (repo detect) → 2 (pre-push co-pilot) → 3 (authoring surfaces) → 4 (GitHub App) → 7 (CI workflow)
                                                                           ↓
                                                                           ├─ 5 (schema validate) → 8 (SLSA verify) → 9 (security scan) → 10 (approval) → 6 (Terraform apply) → 11 (registry/active)
                                                                           ↓
                                                              12 (post-push governance ticket + remediation)  ←─ runs throughout
                                                                           ↓
                                                              13 (telemetry)  ←─ cross-cutting
```

---

## 3. Data & Auth Model

### 3.1 Four core data entities

```
   ┌──────────────┐    1:N      ┌──────────────┐    1:N      ┌──────────────┐
   │  AgentCard   │ ─────────▶  │  Submission  │ ─────────▶  │  AuditEvent  │
   │ (canonical)  │             │  (pipeline)  │             │ (immutable)  │
   └──────┬───────┘             └──────┬───────┘             └──────────────┘
          │ 1:1                        │ refs
          ▼                            ▼
   ┌──────────────┐             ┌──────────────┐
   │ RepoBinding  │             │  CheckRun    │
   │ (per repo)   │             │ (gate state) │
   └──────────────┘             └──────────────┘
```

#### AgentCard (canonical asset record)

| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | platform-generated |
| `tenantId` | string | **Cosmos partition key** |
| `name` | string | unique within tenant |
| `versions[]` | array | `{ semver, status, provenance, endpoint_url, revision_name, policy_version_at_approval }` |
| `owner` | object | `{ team, entra_group_oid, primary_contact_oid }` |
| `description` | string | |
| `capability_tags[]` | string[] | normalized to controlled vocabulary |
| `rai_tags[]` | string[] | e.g. `clinical-decision`, `pii-handler` |
| `data_categories` | object | `{ phi: bool, pii: bool, sensitive_business: bool }` |
| `risk_tier` | enum | `low / med / high / critical` |
| `runtime` | enum | `aca` (v1) / `foundry-hosted` (v2) |
| `repo` | object | `{ url, default_branch, github_app_install_id }` |
| `discovery` | object | `{ ai_search_doc_id, marketplace_listed_at }` |
| `lifecycle` | object | `{ created_at, last_active_version, deprecated_at?, archived_at? }` |

**Status state machine** (per version):
```
submitted → validating → staging → approval-pending → approved
                                                          │
                                                          ▼
                                         provisioning → active
                                                          │
                                                          ▼
                                              deprecated → archived

Failure terminals: rejected · failed · withdrawn
```

#### Submission (transient pipeline working record)

| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | |
| `tenantId` | string | partition key |
| `agent_card_ref` | string | FK to AgentCard.id |
| `version_target` | string | semver |
| `source` | enum | `portal / cli / vscode-skill / github-app-webhook` |
| `repo_context` | object | `{ url, branch, commit_sha, pr_number?, workflow_run_id? }` |
| `repo_shape` | enum | `sme-coder / full-stack / framework-native` |
| `provenance` | object | `{ slsa_attestation_url, sbom_url, builder_identity, verified_at?, verification_result }` |
| `scan_findings[]` | array | `{ rule_id, severity, file_line, message, remediation_url, status }` |
| `eval_results` | object | `{ pass_count, fail_count, score_delta_vs_prior, report_url }` |
| `risk_assessment` | object | `{ tier, factors[], computed_at }` |
| `approval` | object | `{ required, reviewer_oid?, decision?, justification?, decided_at? }` |
| `gate_check_run` | object | `{ github_check_run_id, status, transitioned_at }` |
| `deployment_outputs` | object | `{ endpoint_url, revision_name, resource_id, terraform_state_sha }` |
| `governance_ticket` | object | `{ summary_md, suggested_approver_oid, drafted_at }` |
| `stage_history[]` | array | `{ stage, started_at, completed_at, outcome, trace_id }` |
| `current_stage` | enum | one of the 7 pipeline stages |
| `terminal_status` | enum | `active / rejected / failed / withdrawn` (nullable) |

**TTL:** 90 days after terminal status (then archived to ADLS).

#### AuditEvent (immutable governance trail)

| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | |
| `tenantId` | string | partition key |
| `event_type` | enum | `submission_created / scan_completed / slsa_verified / risk_classified / approval_decided / gate_unblocked / terraform_applied / agent_card_activated / ...` |
| `actor` | object | `{ oid, display_name, role_at_time, source }` source ∈ `human / agent / workflow / system` |
| `subject` | object | `{ submission_id, agent_card_id, version }` |
| `evidence_refs[]` | string[] | URLs to scan reports, SLSA attestations, terraform state, etc. |
| `payload` | object | event-specific |
| `trace_id` | string | OTel correlation |
| `timestamp` | iso8601 | |
| `prev_event_hash` | string | tamper-evident hash chain per `subject` |

**Append-only.** No update/delete API. Enforced at **Cosmos data-plane RBAC layer** (not just app code). Cosmos change feed snapshots to ADLS daily.

#### RepoBinding (per onboarded GitHub repo)

| Field | Notes |
|---|---|
| `repo_url`, `tenantId`, `agent_card_ref` | |
| `github_app_install_id` | from GitHub App installation |
| `oidc_federation` | `{ entra_app_oid, federated_credential_subject, scoped_rg_id, role_assignment_id }` |
| `terraform_backend` | `{ storage_account, container, state_path }` |
| `policy_bundle_version` | last-synced tenant policy bundle version |
| `linked_at`, `linked_by_oid` | |

### 3.2 Five auth flows

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FLOW 1 — Engineer → Portal                                                   │
│   Engineer ── Entra interactive login (MSAL) ──▶ Portal ── Entra bearer ──▶  │
│   Publisher API. Token has tenantId + roles claim.                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ FLOW 2 — Engineer → uap CLI                                                  │
│   uap login ── device code OR `az login` token ──▶ Entra ──▶ token cached    │
│   ──▶ uap submit ── bearer ──▶ Publisher API.                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ FLOW 3 — Engineer → VS Code Copilot Chat skill → MCP server                  │
│   Copilot Chat carries engineer's Entra identity ── On-Behalf-Of (OBO) ──▶   │
│   MCP server obtains token for Publisher API on engineer's behalf.           │
│   Source files NEVER leave the workspace; only findings cross the wire.      │
├──────────────────────────────────────────────────────────────────────────────┤
│ FLOW 4 — GitHub Actions runner → Azure (terraform apply)                     │
│   Runner ── OIDC token (sub=repo:org/repo:ref:refs/heads/main) ──▶ Entra ──▶ │
│   Federated credential matched ──▶ access token for Entra app ──▶            │
│   Contributor on `rg-agent-{tenantId}-{agentId}` ONLY (no other scope).      │
│   No PAT, no client secret anywhere.                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ FLOW 5 — GitHub App "UAP Onboarder" ↔ Onboarding Agent                       │
│   GitHub webhook (HMAC-signed) ──▶ webhook receiver (ACA API) ──▶            │
│   validates signature ──▶ enqueues SubmissionEvent ──▶ Onboarding Agent.     │
│   Reverse: Onboarding Agent ── GitHub App JWT (signed by app private key) ──▶│
│   GitHub API (open PR, transition check-run, comment).                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

The Onboarding Agent runs as ACA app with **its own** managed identity; it reads the GitHub App private key from Key Vault by reference (no key in env).

### 3.3 RBAC roles

| Role | AgentCard | Submission | AuditEvent | TenantPolicy | RepoBinding |
|---|---|---|---|---|---|
| **publisher** | read own tenant; write own owner team | create + read own | read own subject | read | create + read own |
| **reviewer** (security / RAI) | read tenant | read tenant; write `approval.decision` | read tenant; create `approval_decided` events | read | read tenant |
| **tenant-admin** | read+write tenant | read+write tenant | read tenant; **no delete** | write tenant | read+write tenant |
| **platform-admin** | read all; write rare exceptions | read all | read all; **no delete** | write all | read+write all |
| **service: onboarding-agent** | write status transitions per state machine | write stage_history, governance_ticket | create events for own actions | read | write `oidc_federation`, `policy_bundle_version` |
| **service: provisioning-runner** (federated) | — | post `deployment_outputs` only | create `terraform_applied` event | — | — |

**Hard rule:** No human role can update or delete an `AuditEvent`. Append-only enforced at Cosmos data-plane RBAC, not just in app code.

### 3.4 Tenant policy bundle

A **signed (ed25519), versioned** JSON bundle published per tenant. Synced to clients via `uap policy sync`. Validated server-side again on submit.

```yaml
# tenant: optum-rcm — policy bundle v17
version: 17
signed_by: <platform key id>
signature: <ed25519 sig>
issued_at: 2026-05-10T00:00:00Z

manifest:
  required_fields: [name, version, owner.team, capability_tags, rai_tags, data_categories]
  semver: { enforce: true, allow_prerelease: false }

vocabulary:
  capability_tags_uri: https://uap.../vocab/optum-rcm/capability-tags-v17.json
  rai_tags_uri:       https://uap.../vocab/optum-rcm/rai-tags-v17.json

sensitivity:
  phi:
    auto_detect_patterns: [SSN, MRN, DOB, CPT, ICD10]
    on_detect: require_explicit_attestation
    if_attested_true: { mandatory_rai_tags: [phi-handler] }
  pii:
    auto_detect_patterns: [email, phone, address]

risk_classification:
  rules:
    - if: data_categories.phi == true
      then: risk_tier_min = high
    - if: rai_tags includes "clinical-decision"
      then: risk_tier_min = high, mandatory_reviewer_group = "rai-board-clinical"
    - if: first_version
      then: bump_one_tier

approval_routing:
  low:      { auto_approve: true, sla_hours: 0 }
  med:      { reviewer_group: "platform-eng", sla_hours: 24 }
  high:     { reviewer_group: "security-rai", sla_hours: 24, escalate_to: "ciso-on-call" }
  critical: { reviewer_group: "ciso-direct",  sla_hours: 4,  break_glass: true }

terraform_module:
  required_module: "registry.uap.io/modules/agent-aca/azurerm"
  pinned_version_constraint: "~> 1.4"
  forbidden_inputs: [ "expose_public_ip", "disable_managed_identity" ]

ci_workflow:
  required_jobs: [build, sbom, slsa-attest, eval, gate-wait, terraform-apply, post-outputs]
  forbidden_runners: [self-hosted-untrusted]
```

### 3.5 Secret handling (no secrets in env, ever)

| Where | What | How |
|---|---|---|
| Onboarding Agent | GitHub App private key | Key Vault reference; rotated quarterly via Logic App |
| Onboarding Agent | LLM API key (Foundry / Azure OpenAI) | Managed identity → AAD token, no key |
| ACA agent runtimes | Tenant secrets (DB conn, etc.) | Key Vault reference baked into Terraform module; agent reads via MI |
| GitHub Actions runner | Azure credentials | OIDC federation only — no secret stored |
| MCP server | Publisher API auth | Entra OBO from caller; no SP secret |

---

## 4. Pipeline Phases (3 phases × 7 stages)

### 4.1 Phase ↔ Stage map

| Phase (§12.1) | Driver | Stages | When it ends |
|---|---|---|---|
| **Phase 1 — Pre-push (co-pilot)** | Onboarding Agent (via Skill/CLI/Portal) | Drafts initial PR; no Submission record yet | When PR is merged or first commit hits a connected branch |
| **Phase 2 — Push & CI (developer-driven)** | Developer push → GitHub Actions hardened builder | Stage 1 (Submission) | When CI emits artifacts and posts to Publisher API; `gate-wait` job parks |
| **Phase 3 — Post-push (verify-govern-deploy)** | Onboarding Agent | Stages 2–7 | Stage 7 transitions to `active` (or terminal failure) |

```
Phase 1 (engineer + agent)         Phase 2 (push triggers CI)              Phase 3 (agent verifies + governs + deploys)
─────────────────────────────      ───────────────────────────────────     ──────────────────────────────────────────────────
[author dialog]                    Stage 1 — Submission                    Stage 2 — Validation
[scaffold files]                     • CI starts                             • schema lint
[infer caps + PHI]                   • build / SBOM / SLSA / eval / scan      • tenant policy lint server-side
[lint vs policy]                     • POST /submissions                     • SLSA verify (cosign)
[open initial PR]                    • Job: gate-wait (parks)                • scan ingestion + PHI gate
                                                                           Stage 3 — Registration
                                                                             • AgentCard upsert; status=staging
                                                                           Stage 4 — Approval
                                                                             • risk classify + governance ticket
                                                                             • auto-approve OR human review
                                                                           Stage 5 — Provisioning
                                                                             • transition check-run → success
                                                                             • runner's terraform apply executes
                                                                             • record terraform_state_sha
                                                                           Stage 6 — Integration Test
                                                                             • ingest eval_report.json (from CI)
                                                                             • apply pass/fail thresholds
                                                                           Stage 7 — Deployment
                                                                             • runner posts deployment_outputs
                                                                             • AgentCard.endpoint_url updated
                                                                             • status=active; AI Search reindex
```

### 4.2 Per-stage detail (Phase 3)

| # | Stage | Trigger | Tools called | Pass criteria | Failure → |
|---|---|---|---|---|---|
| **1** | Submission | CI Job posts `POST /submissions` with `workflow_run_id` | `create_submission` | Valid JSON, repo binding exists, semver new | Reject; runner sees 4xx; `gate-wait` fails |
| **2a** | Validation: schema | webhook | `validate_manifest_schema` | All required fields present; semver bumped; in controlled vocab | Comment on PR with JSON Pointer paths + remediation; status=`failed` |
| **2b** | Validation: SLSA | webhook | `verify_slsa_attestation` (cosign) | Issuer = `token.actions.githubusercontent.com`; subject matches repo+ref; source SHA = HEAD; builder allowlisted | Hard reject; flag as `provenance_fail` in audit; status=`failed` |
| **2c** | Validation: scan ingest | webhook | `ingest_scan_findings`, `enforce_phi_attestation` | No `severity=critical` findings; if PHI detected, `data_categories.phi=true` attested | Comment on PR with findings + remediation patches; status=`failed` |
| **3** | Registration | 2a/b/c pass | `upsert_agent_card` | Cosmos write succeeds | Retry 3× w/ backoff; then status=`failed` |
| **4** | Approval | 3 pass | `classify_risk`, `draft_governance_ticket`, `route_for_approval` (Logic App) | Low: auto-approve. Med+: human approval received within SLA | SLA breach → escalate. Reject → status=`rejected` |
| **5** | Provisioning | 4 approved | `transition_check_run(success)` → runner's `terraform apply` → `ingest_terraform_outcome` | Runner reports `apply succeeded`; state SHA recorded | Runner failure → status=`failed`, agent reads terraform plan/apply log + drafts remediation comment |
| **6** | Integration Test | 5 success | `ingest_eval_report` | `pass_count / total >= threshold`; quality_delta >= -2% vs prior version | Status=`failed`; comment summarizes failed cases |
| **7** | Deployment | 6 pass | `ingest_deployment_outputs`, `upsert_agent_card(status=active)`, `trigger_ai_search_reindex`, `comment_on_pr` | AgentCard status=active; AI Search returns within 30s | Reindex retry; if 3× fail, status=`active-discovery-degraded` (callable; ops alert) |

**v1 vs v2 within stages:**
- **Stage 6 v1** = ingest eval that already ran in CI. **v2** = also re-run eval against deployed endpoint.
- **Stage 7 v1** = single-step deploy at 100% traffic. **v2** = handoff to Lifecycle Manager for canary.

### 4.3 State transition rules

```
                        ┌─────────────┐
                        │   draft     │  (Phase 1)
                        └──────┬──────┘
                               │ engineer pushes
                               ▼
                        ┌─────────────┐
                        │  submitted  │
                        └──────┬──────┘
                               │ webhook
                               ▼
                        ┌─────────────┐    fail   ┌──────────┐
                        │ validating  ├──────────▶│  failed  │ (terminal)
                        └──────┬──────┘           └──────────┘
                               │ pass
                               ▼
                        ┌─────────────┐
                        │   staging   │
                        └──────┬──────┘
                               ▼
                        ┌──────────────┐  reject
                        │ approval-    ├──────────▶  rejected (terminal)
                        │ pending      │
                        └──────┬───────┘
                               │ approve
                               ▼
                        ┌─────────────┐    fail
                        │ provisioning├───────────▶  failed
                        └──────┬──────┘
                               │ apply success
                               ▼
                        ┌─────────────┐    fail
                        │ testing     ├───────────▶  failed
                        └──────┬──────┘
                               │ pass
                               ▼
                        ┌─────────────┐
                        │   active    │
                        └──────┬──────┘
                               │  (v2 lifecycle)
                               ▼
                        ┌─────────────┐ → archived
                        │ deprecated  │
                        └─────────────┘

   At any stage, engineer can: ── withdraw ─────▶ withdrawn (terminal)
```

**Transition invariants:**
- Every transition writes one `AuditEvent` with `actor`, `subject`, `evidence_refs`, `prev_event_hash`.
- Forward-only except `staging → submitted` allowed on resubmission with same `version_target`, capped at 3 attempts before requiring tenant-admin override.
- Terminal states (`failed`, `rejected`, `withdrawn`, `archived`) are immutable. New attempts require a new Submission with bumped semver.

### 4.4 Idempotency

Every Onboarding Agent tool is **idempotent on `submissionId + stage`**. GitHub webhooks can fire multiple times; ACA scaling can deliver SubmissionEvents to multiple agent instances; runner can retry `POST /deployment-outputs`.

| Tool | Idempotency key | On duplicate |
|---|---|---|
| `create_submission` | `(repo_url, commit_sha, version_target)` | Returns existing submissionId |
| `verify_slsa_attestation` | `(submissionId, attestation_sha)` | Re-verifies; same outcome → no new audit event |
| `upsert_agent_card` | `(tenantId, name, version)` | Last-writer-wins on metadata; status state machine prevents backwards transitions |
| `transition_check_run` | `(submissionId, target_status)` | Idempotent |
| `ingest_deployment_outputs` | `(submissionId)` | Updates AgentCard once; subsequent calls return 200 |

**Retry policy:**
- Transient (Cosmos throttle, AI Search 503): exponential backoff, 3 attempts → DLQ + ops alert.
- Validation failures: **no retry** — engineer must fix and resubmit.
- Approval timeouts: SLA timer + escalation, not retry.

### 4.5 Failure handling matrix

| Failure | Where | Detection | Engineer notification | Recovery |
|---|---|---|---|---|
| Schema invalid | 2a | Validator | PR comment with JSON Pointer + patch | Fix `agent.yaml`, push, new submission |
| SLSA verify fail | 2b | cosign | PR comment + audit `provenance_fail` | Re-run CI; persistent → security investigation |
| PHI unattested | 2c | scanner + manifest cross-check | Skill chat: "PHI suspected; confirm or remediate" | Engineer attests *or* removes PHI |
| Critical security finding | 2c | scanner | PR comment with file:line + severity | Fix; gate stays red until clean |
| Risk = critical | 4 | classifier | Teams ping to CISO-direct queue, 4h SLA | Out-of-band review; break-glass possible |
| Approval rejected | 4 | reviewer | PR comment with justification | Engineer addresses; new submission |
| Approval SLA breach | 4 | timer | Escalation to backup approver | Continue review |
| Terraform apply fail | 5 | runner exit code | PR comment with plan/apply log + agent-drafted remediation | Engineer fixes inputs; new submission |
| Eval threshold miss | 6 | thresholds in policy | PR comment with failed cases summary | Engineer improves agent / golden cases |
| AI Search reindex fail | 7 | retry exhaustion | Ops alert (engineer not blocked) | Ops re-trigger |

### 4.6 Escape hatches

| Hatch | Who | Effect | Audit |
|---|---|---|---|
| **Engineer withdraw** | Publisher | `POST /submissions/{id}/withdraw` → status=`withdrawn`; terraform NOT executed | Audit event with reason |
| **Reviewer reject** | Reviewer (med+ risk) | Approval = reject + justification | Immutable; PR comment posted |
| **Tenant-admin override** | tenant-admin only | Bypass 3-attempt resubmit cap | Audit event; reviewer notified |
| **Platform-admin force-fail** | platform-admin only | Kill in-flight submission stuck in any stage | Audit event; reviewer + publisher notified |
| **Break-glass approval** | CISO-on-call only | Approve a `critical` submission outside normal review | Audit event with break-glass reason; post-mortem required |
| **Rollback** | SRE | (handled by Lifecycle Manager in v2) | — |

---

## 5. Telemetry, Tracing & Alerting

### 5.1 Single Azure-native plane

| Plane | What goes here | Backend | Retention |
|---|---|---|---|
| **Pipeline + agent quality** — pipeline timing, tool calls, errors, HTTP, dependencies, LLM prompts/completions, eval scores, judge rationales | OTel spans + metrics + logs (with **OTel GenAI semantic conventions** for LLM spans) | **Azure Monitor / Application Insights / Log Analytics** | 90 days hot, 1 year archive (ADLS via diagnostic export) |

A single `trace_id` threads through every surface (Skill → MCP → Agent → CI → Runtime). End-to-end view in App Insights.

### 5.2 OTel span schema

**Standard attributes (every span):**

| Attribute | Type | Example |
|---|---|---|
| `uap.tenant_id` | string | `optum-rcm` |
| `uap.submission_id` | string | uuid |
| `uap.agent_card_id` | string | uuid |
| `uap.version` | string | `1.4.0` |
| `uap.repo_url` | string | `https://github.com/org/agent-eligibility` |
| `uap.commit_sha` | string | first 12 chars |
| `uap.workflow_run_id` | string | github actions run id |
| `uap.actor_oid` | string | Entra OID |
| `uap.actor_kind` | enum | `human / agent / workflow / system` |
| `uap.repo_shape` | enum | `sme-coder / full-stack / framework-native` |
| `uap.risk_tier` | enum | `low / med / high / critical` |
| `uap.source_surface` | enum | `portal / cli / vscode-skill / github-app` |

**OTel GenAI conventions for LLM spans:**

| Attribute | Type | Example |
|---|---|---|
| `gen_ai.system` | string | `azure_openai` / `azure_ai_foundry` |
| `gen_ai.request.model` | string | `gpt-4o-2024-11-20` |
| `gen_ai.request.temperature` | float | `0.2` |
| `gen_ai.usage.input_tokens` | int | `1842` |
| `gen_ai.usage.output_tokens` | int | `412` |
| `gen_ai.response.finish_reasons` | string[] | `["stop"]` |
| `uap.judge.rubric_id` | string | `governance_ticket_v3` |
| `uap.judge.score` | float | `0.78` |

**Per-stage span names:** `uap.phase1.scaffold_pr`, `uap.stage1.submission_received`, `uap.stage2.validate_schema`, `uap.stage2.verify_slsa`, `uap.stage2.ingest_scans`, `uap.stage3.register_agentcard`, `uap.stage4.classify_risk`, `uap.stage4.draft_governance_ticket`, `uap.stage4.await_approval`, `uap.stage5.transition_check_run`, `uap.stage5.terraform_apply`, `uap.stage6.ingest_eval_report`, `uap.stage7.deployment_outputs`, `uap.stage7.activate_agentcard`.

### 5.3 PHI scrubbing (non-negotiable)

Central `phi_scrubber()` middleware between OTel SDK and App Insights exporter. Golden-set test of 50 known PHI patterns blocks deploy on regression.

| What we DO log | What we NEVER log |
|---|---|
| `uap.commit_sha`, `uap.repo_url` | Source code contents |
| `phi_suspected: bool`, `phi_findings_count: int` | The matched PHI strings — only redacted hash + line number |
| `tokens_in`, `tokens_out`, `model_id`, `judge_score` | Raw prompt/completion text containing PHI patterns (→ `[REDACTED:phi]`) |
| Eval result counts, threshold pass/fail | Test case payloads (only refs) |

Sensitive prompt/completion samples land in custom Log Analytics table `LLMSamples_CL` with **table-level RBAC** (only `reviewer` and `platform-admin` roles can read).

### 5.4 Workbook (App Insights)

Six panels:

1. **Submission funnel** (last 7d / 30d) — submitted → validated → registered → approved → provisioned → live
2. **Lead time per stage** (p50/p95) with SLO column
3. **Failure-rate breakdown** (last 24h) — stacked bar by `terminal_status` × cause
4. **Top 10 slowest submissions** with click-through to trace waterfall
5. **Approval queue health** — open / oldest waiting / breached SLA / auto-approval rate per queue
6. **Agent quality** — judge scores, LLM token spend per submission, capability inference precision, PHI inference recall (queries `LLMSamples_CL`, `LLMEvalResults_CL`)

### 5.5 Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Stage failure rate spike | Any stage failure-rate > 10% over 1h | Sev3 (ticket) | platform-on-call |
| End-to-end SLO miss | p95 lead-time (low risk) > 60m sustained 2h | Sev3 | platform-on-call |
| Approval queue stalled | Any reviewer queue oldest > 80% of SLA | Sev3 | reviewer manager |
| SLA breach | Approval SLA breached | Sev2 (page) | escalation reviewer + manager |
| **SLSA verify failures** | > 0 in 1h | **Sev1 (page)** | security-on-call + audit team |
| **PHI in unattested submission** | > 0 in 1h | **Sev1 (page)** | RAI-on-call + DPO |
| Terraform apply failure burst | > 3 in 15m, same module version | Sev2 (page) | platform-on-call |
| Cosmos throttle | RU exhaustion > 1m | Sev2 | platform-on-call |
| Onboarding Agent down | ACA app health probe failing > 2m | Sev1 (page) | platform-on-call |
| GitHub App webhook backlog | Queue depth > 100 messages > 5m | Sev2 | platform-on-call |
| PHI scrubber test fails on deploy | CI test on `phi_scrubber()` regression | Sev1 (block deploy) | platform-eng |
| Module version published with breaking change | Renovate-bot flags major bump | Sev3 (informational) | platform-eng |

**Alert hygiene:** every alert has a runbook link; Sev1 pages, Sev2 pings a channel, Sev3 files a ticket; all Sev1/2 emit a postmortem ticket on resolve.

---

## 6. MVP Cut Line

### 6.1 Deliverable inventory (23 artifacts)

#### Platform-side (built by the marketplace team)

| # | Artifact | Stack | Hosting |
|---|---|---|---|
| 1 | `onboarding-agent` (LangGraph service) | TypeScript / LangGraph | Azure Container Apps |
| 2 | `uap-onboarding-mcp` (MCP server) | TypeScript | ACA |
| 3 | Publisher API (REST + OpenAPI) | TypeScript / containerized Functions v4 adapter | ACA, behind APIM |
| 4 | GitHub App "UAP Onboarder" | TypeScript / containerized Functions v4 adapter | ACA, behind APIM |
| 5 | Approval routing Logic Apps | Logic Apps Standard | ACA env |
| 6 | Cosmos DB containers (`agent-cards`, `submissions`, `audit-events`, `repo-bindings`, `tenant-policies`) | NoSQL | Cosmos (existing) |
| 7 | AI Search index for marketplace discovery | Azure AI Search | Existing |
| 8 | App Insights workbook (6 panels) | App Insights | Existing |
| 9 | Alert rules (12 alerts) + Sev1/Sev2 runbooks | Azure Monitor + Markdown | Existing |
| 10 | Bicep modules for platform infra | Bicep | `infra/onboarding/` |
| 11 | PHI scrubber middleware + golden-set CI test | TypeScript | Embedded in OTel exporter |

#### Publisher-side (built by marketplace team, consumed by every onboarded repo)

| # | Artifact | Stack | Distribution |
|---|---|---|---|
| 12 | Terraform module `agent-aca/azurerm` v1.0.0 | Terraform AzureRM | Azure Storage with versioning + index file |
| 13 | Reusable composite GitHub Action `uap/submit-action@v1` | YAML composite | github.com/uap/submit-action |
| 14 | Workflow template `.github/workflows/uap-submit.yml` | YAML | Scaffolded into repo by `uap init` |
| 15 | Per-repo OIDC federation auto-config (Entra app + federated cred + RG-scoped role) | Onboarding Agent tool | Runs on `uap link` |

#### Engineer surfaces

| # | Artifact | Stack | Distribution |
|---|---|---|---|
| 16 | `uap` CLI | Node 20 / single binary | npm + GitHub release binaries |
| 17 | Publisher Portal — onboarding wizard pages (5 pages) | Next.js 15 (extends `apps/web`) | Web app |
| 18 | VS Code Copilot Chat skill `uap-onboarding` | `SKILL.md` + scaffolded `.vscode/mcp.json` | Two channels: scaffolded into onboarded repos AND `atv-skill-uap-onboarding` Copilot CLI marketplace plugin |

#### Documentation

| # | Artifact | Path |
|---|---|---|
| 19 | This design doc | `docs/brainstorms/2026-05-13-onboarding-agent-design.md` |
| 20 | Engineer onboarding quickstart | `docs/onboarding/engineer-quickstart.md` |
| 21 | Reviewer guide | `docs/onboarding/reviewer-guide.md` |
| 22 | Tenant policy bundle authoring guide | `docs/onboarding/tenant-policy-authoring.md` |
| 23 | Updated architecture diagram | `docs/architecture/onboarding-agent-v1.drawio` |

### 6.2 Story coverage matrix

#### Existing US-OB-* stories

| Story | Title | v1 status | Notes |
|---|---|---|---|
| US-OB-01a | Submit via Publisher Portal | ✅ v1 | Wizard pages |
| US-OB-01b | Submit via CLI / REST | ✅ v1 | `uap` CLI |
| US-OB-01c | Submit via CI / OIDC | ✅ v1 (refined) | Now via runner-applies-Terraform pattern |
| US-OB-02 | Real-time submission status | ⏸ v2 | v1 = PR comments + `uap status <id>` polling |
| US-OB-03 | Actionable validation feedback | ✅ v1 | JSON Pointer errors + remediation_url |
| US-OB-04 | Auto-generate AgentCard | ✅ v1 | Pillar 2 + Pillar 5 |
| US-OB-05 | Publish a new version | 🟡 partial v1 | Semver bump + new submission ✅; **canary deferred to v2** |
| US-OB-06 | Auto-provisioned infra & secrets | ✅ v1 (refined) | Terraform module, runner-applies |
| US-OB-07 | CI/CD template scaffolding | ✅ v1 | Pillar 2 PR-scaffold writer |
| US-OB-08 | Approval gate routing | ✅ v1 | Logic Apps + Teams |
| US-OB-09 | PHI/PII & content scan visibility | ✅ v1 | Pillar 9 + reviewer dashboard |
| US-OB-10 | Sign-off audit trail | ✅ v1 | Append-only via Cosmos data-plane RBAC |
| US-OB-11 | Automated integration test execution | 🟡 partial v1 | Ingest CI eval ✅; **separate post-deploy test env deferred to v2** |
| US-OB-12 | Canary rollout with auto-rollback | ⏸ v2 | Lifecycle Manager (§17.3) |
| US-OB-13 | Onboarding pipeline observability | ✅ v1 | OTel + workbook |
| US-OB-14 | Discover newly onboarded agents | ✅ v1 (basic) | AI Search reindex on activate |
| US-OB-15 | Trust signals on agent listings | ⏸ v2 | Catalog/discovery feature |
| US-OB-16 | Onboarding SLA reporting | ⏸ v2 | Need 30d data first |
| US-OB-17 | Deprecation & decommission | ⏸ v2 | Lifecycle Manager |

**Existing-story coverage in v1:** 17 numbered stories (US-OB-01 through US-OB-17), with US-OB-01 split into 3 surface variants (a/b/c). Counting each line above: 12 entries fully shipped + 2 partial + 5 deferred = 19 entries across 17 stories. By story: **10/17 stories fully shipped (59%)**, **2/17 partial**, **5/17 deferred to v2**. All 3 surfaces of US-OB-01 (Portal / CLI / VS Code skill) are in v1.

#### New gap features (🆕)

| ID | Feature | Pillar | v1 |
|---|---|---|---|
| 🆕-01 | Pre-push conversational co-pilot | 2 | ✅ |
| 🆕-02 | Source-aware capability inference | 2 | ✅ |
| 🆕-03 | Source-aware PHI/data-sensitivity inference | 2 | ✅ |
| 🆕-04 | Tenant policy bundle (signed, versioned, syncable) | 2/3.4 | ✅ |
| 🆕-05 | Eval stub synthesis | 2 | ✅ |
| 🆕-06 | PR scaffold writer (labels + CODEOWNERS auto) | 2 | ✅ |
| 🆕-07 | GitHub App `UAP Onboarder` with `uap/onboarding-gate` check-run | 4 | ✅ |
| 🆕-08 | Repo-shape detection | 1 | ✅ |
| 🆕-09 | Platform Terraform module `agent-aca/azurerm` v1.0 | 6 | ✅ |
| 🆕-10 | SLSA + Sigstore cosign verification | 8 | ✅ |
| 🆕-11 | LLM-drafted governance ticket | 12 | ✅ |
| 🆕-12 | LLM-drafted PR remediation comments | 12 | ✅ |
| 🆕-13 | VS Code Copilot Chat skill packaging | 3 | ✅ |
| 🆕-14 | MCP server (`uap-onboarding-mcp`) | 3 | ✅ |
| 🆕-15 | OTel GenAI conventions + `LLMSamples_CL` table | 13 | ✅ |

**New gap features in v1: 15/15 (100%).**

### 6.3 Demo-day script (10 minutes, RCM domain)

**Persona:** Priya — RCM SME at Optum, knows Python, doesn't know Azure/Bicep/Terraform.
**Asset:** Existing repo `denial-classifier-agent` — Python agent that classifies CO-4 claim denials and proposes corrective modifiers. Source contains MRN regex (PHI handling).

#### T+0:00 — Phase 1 (Pre-push, VS Code)

1. Priya opens her repo in VS Code; types in Copilot Chat: **`/uap-onboarding scaffold this for the marketplace`**
2. Skill reads workspace → classifies as **sme-coder** (Python, no Dockerfile, no IaC)
3. Capability inference: proposes `["denial_classification", "carc_lookup", "co_4_resolution"]`. Priya accepts.
4. Source scan detects **MRN regex** → skill: *"PHI suspected. Confirm or remediate."*
5. Priya: "We process PHI" → skill auto-sets `data_categories.phi=true`, `rai_tags: ["phi-handler", "clinical-decision"]`
6. Skill synthesizes 5 eval stubs from synthetic 837P denial samples → places in `evals/golden.jsonl`
7. Skill commits scaffold (`agent.yaml`, `Dockerfile`, workflow, 5-line `terraform/main.tf`, `.github/CODEOWNERS`) to a new branch
8. Skill opens **PR #42** with labels `[uap-onboarding, tenant:optum-rcm, risk-tier:high, phi-suspected]`, CODEOWNERS auto-populated to `@optum/security-rai`

#### T+2:00 — Phase 2 (Push, CI)

9. Priya reviews scaffolded files; merges to `main`; pushes tag `v1.0.0`
10. GitHub Actions starts: build → SBOM → SLSA attest (Sigstore via OIDC) → eval → scan → POST `/submissions`; `gate-wait` parks
11. Switch to App Insights workbook → submission appears in funnel at `submitted`

#### T+3:30 — Phase 3 (Onboarding Agent drives)

12. Webhook fires; Onboarding Agent picks up `SubmissionEvent`
13. **Stage 2:** schema ✓ · SLSA verify ✓ · scans (1 CVE-medium, allowed) ✓
14. **Stage 3:** AgentCard upserted with `status=staging`
15. **Stage 4:** risk classifier → `high` (PHI=true + clinical-decision). LLM drafts governance ticket:
    > *"New agent **denial-classifier-agent v1.0.0** by team RCM-Eng. Classifies CO-4 claim denials. Handles PHI (confirmed via attestation). SBOM clean. SLSA verified (builder=github-actions). Eval: 92% accuracy, 0% toxicity. **Recommended approver: Dr. Reyes (security-rai)**. Prior version: none."*
16. Switch to Admin Dashboard → Dr. Reyes clicks **Approve** with justification "PHI attested; eval scores acceptable"
17. AuditEvent fires; status moves to `approved`

#### T+6:00 — Stages 5/6/7 (Deploy)

18. Onboarding Agent transitions `uap/onboarding-gate` check-run → `success`
19. Switch to GitHub Actions → `gate-wait` unblocks → `terraform apply` runs (~3 min)
20. Runner posts `tenantId` and `deployment_outputs` to `/submissions/{id}/deployment-outputs` with the deployment-output HMAC signature
21. **Stage 6:** ingests `eval_report.json` ✓
22. **Stage 7:** AgentCard `endpoint_url` set, `status=active`, AI Search reindex
23. PR #42 receives comment: *"🎉 Live at `https://api.uap-marketplace.optum.com/agents/denial-classifier-agent/v1.0.0` — submission `UAP-2026-05-13-0042`. Total time: 9m 38s."*

#### T+9:00 — Discovery & live invocation

24. Switch to Marketplace Portal → search **"denial classification"** → agent appears
25. Click AgentCard detail → owner, capabilities, RAI tags, SLSA provenance link, eval scores all present
26. Live invocation via gateway: `POST` a sample CO-4 denial → agent returns classification + suggested modifier
27. Switch to App Insights → end-to-end trace waterfall: **one `trace_id`** from Priya's chat in VS Code → CI → agent stages → first prod call

#### T+10:00 — Wrap

28. Funnel: 1 submitted → 1 active (100% pass-through)
29. Call out: **the Onboarding Agent itself is the marketplace's first asset** — show its AgentCard in the catalog
30. Quick roadmap slide: deferred items (canary, deprecation, Foundry runtime, monorepo, real-time SSE status)

#### Failure-path demos (optional, +5 min)

| Mini-demo | Triggered by | Shows |
|---|---|---|
| Schema fail | Engineer hand-edits `agent.yaml` to remove `version` | Pillar 5 + 12: PR comment with JSON Pointer + suggested patch |
| PHI unattested | Engineer flips `data_categories.phi` to false despite MRN regex still in source | Stage 2c hard halt + chat dialog asking for re-attestation |
| SLSA verify fail | Tampered SBOM artifact | Stage 2b hard reject; Sev1 alert; audit `provenance_fail` event |
| Terraform apply fail | Bad input in `module {}` block (e.g., invalid CPU value) | Stage 5 fail; agent ingests terraform log; PR comment with remediation |
| Engineer withdraw | Mid-pipeline `uap withdraw <id>` | `withdrawn` terminal state; terraform never executes; audit clean |

### 6.4 Definition of Done

A v1 release is "done" when **all** of these hold:

#### Functional
- [ ] An RCM domain engineer with no Azure/Bicep/Terraform knowledge can onboard a Python agent end-to-end via VS Code Chat in **< 60 min** (low-risk auto-approve path) or **< 24h** (high-risk human-approve path)
- [ ] All 3 personas (SME-coder, full-stack, framework-native — the latter at minimum: detected and routed to "v2 — coming soon" stub with clear messaging) can submit
- [ ] All 12 alerts wired with runbook links
- [ ] Demo script runs successfully end-to-end on green path
- [ ] All 5 failure-path demos behave as designed

#### Security & compliance
- [ ] PHI scrubber golden-set test in CI; blocks deploy on regression
- [ ] Audit log append-only **enforced at Cosmos data-plane RBAC layer**, not just app code
- [ ] OIDC federation works end-to-end with **zero PATs / client secrets** anywhere in the system
- [ ] Tenant policy bundle is **signed (ed25519) and versioned**
- [ ] SLSA cosign verify rejects all 4 negative test cases (wrong issuer, wrong subject, wrong source SHA, wrong builder)

#### Operational
- [ ] Bicep deploys all platform infra with one `azd up`
- [ ] Terraform module `agent-aca/azurerm` published as v1.0.0 with semver and CHANGELOG
- [ ] App Insights workbook shows funnel for past 7 days (after running synthetic load)
- [ ] All 5 happy-path + 5 sad-path bench tests automated and green
- [ ] Documentation artifacts 19–23 from §6.1 exist and are reviewed

### 6.5 Bench tests (gating test suite)

A v1 build cannot ship without all of these green:

| # | Test | Outcome |
|---|---|---|
| **Happy paths (5)** | | |
| H1 | Python sme-coder, low-risk, auto-approve | `active` in < 15m |
| H2 | TypeScript full-stack with own Dockerfile, low-risk | `active`, custom Dockerfile preserved |
| H3 | Python sme-coder with PHI, high-risk, human-approve | `active` after approval; AuditEvent has reviewer OID |
| H4 | Version bump 1.0.0 → 1.1.0 of an existing active agent | New version `active`; old version still `active`; both callable |
| H5 | Framework-native repo shape detected → routed to "v2 stub" with clear messaging | Engineer sees friendly v2-coming-soon message; no half-done state |
| **Sad paths (5)** | | |
| S1 | Schema invalid (`agent.yaml` missing `version`) | `failed`; PR comment with JSON Pointer + patch |
| S2 | SLSA verify fail (tampered attestation) | `failed`; Sev1 alert; audit `provenance_fail` |
| S3 | PHI in source but `data_categories.phi=false` attested | Stage 2c halt; skill chat re-prompts; submission doesn't progress |
| S4 | Terraform apply fail (bad CPU input) | `failed`; PR comment with terraform log + agent remediation; runner exits non-zero |
| S5 | Eval threshold miss (quality_delta < -2%) | `failed`; PR comment summarizes failed cases |
| **Escape hatch (1)** | | |
| E1 | Engineer `uap withdraw <id>` mid-pipeline (during approval-pending) | `withdrawn`; terraform never runs; audit clean |
| **Security (5)** | | |
| SEC1 | PHI scrubber regression test | All 50 golden patterns redacted |
| SEC2 | Append-only audit (try to update via SDK as platform-admin) | Cosmos data-plane denies; no app-code path either |
| SEC3 | OIDC federation scope test (try to use creds for a different RG) | Azure denies; alert fires |
| SEC4 | Webhook HMAC signature mismatch | Receiver returns 401; no SubmissionEvent enqueued |
| SEC5 | MCP conversation memory isolation (two tenants concurrent) | No state leak across `(tenantId, userOid, repoUrl)` keys |
| SEC6 | GitHub App private key rotation drill | Quarterly rotation completes with no in-flight submission failures; old key invalidated within 5m |
| SEC7 | Approval-queue Logic App outage drill | Agent falls back to direct Teams API call; no submission stalls > SLA |

### 6.6 What's NOT in v1 (clean v2 roadmap)

| Deferred | Why | v2 owner |
|---|---|---|
| Canary 5→25→50→100 with auto-rollback | Lifecycle Manager (§17.3) | Lifecycle Manager team |
| Deprecation / decommission flow | Lifecycle concern | Lifecycle Manager team |
| Continuous post-deploy eval drift detection | Evaluation Agent (§12.2) | Evaluation Agent team |
| Foundry-hosted runtime path | Adds second module + second deploy code path | Onboarding Agent team |
| Monorepo support | One repo per agent in v1 | Onboarding Agent team |
| GitHub Enterprise Server (self-hosted) | GitHub.com only in v1 | Onboarding Agent team |
| SSE/WebSocket real-time status (US-OB-02) | PR comments + polling sufficient | Publisher API team |
| Onboarding SLA exec workbook (US-OB-16) | Need 30 days of data first | Platform Ops |
| Reverse-dependency view (US-OB-15) | Marketplace catalog feature | Catalog team |
| Trust signals panel (US-OB-15) | Marketplace catalog feature | Catalog team |
| First-party VS Code extension | Replaced by Copilot Chat skill — never coming back | n/a |
| Multi-region replication | Single-region for v1 demo bar | Platform team |
| Customer-managed keys (CMK) on Cosmos | Default platform-managed | Compliance team |
| Cross-tenant agent sharing | Single-tenant assets in v1 | Marketplace team |
| Bring-your-own LLM provider (BYOM) | Azure OpenAI / Foundry only | Onboarding Agent team |

---

## 7. Open Questions, Risks, Assumptions & Deferred Decisions

### 7.1 Open questions (need ownership)

| ID | Question | Suggested resolution |
|---|---|---|
| Q1 | Capability inference non-determinism — same source yields different tags across runs | Pin model + `temperature=0`; cache inference by `(file_sha_set, vocab_version)`; explicit "regenerate" button |
| Q2 | Policy bundle version conflicts — agent v1.0.0 approved under v16; v18 introduces stricter rules | Grandfather active versions; flag AgentCard with `policy_version_at_approval`; new submissions use current policy |
| Q3 | MCP conversation memory isolation across tenants | Conversation key = `(tenantId, userOid, repoUrl)`; bench test SEC5 |
| Q4 | Repo-shape ambiguity — Python with Dockerfile = sme-coder or full-stack? | Precedence: Dockerfile → full-stack; engineer can override via `agent.yaml: shape: sme-coder` |
| Q5 | OIDC federation lifecycle on unlink with pending submission | Soft-revoke (`disabled_at`); hard-revoke after 7-day grace; pending submissions → `withdrawn` |
| Q6 | Reviewer pool resolution — CODEOWNERS = team; how to route to on-call? | Logic App reads on-call schedule from Entra group "rai-board-clinical-on-call" |
| Q7 | Eval harness format (Phoenix dropped) | **Microsoft Foundry Evaluations format** |
| Q8 | Capability vocabulary governance (who curates per-tenant vocabulary?) | Tenant-admin owns; vocabulary version embedded in policy bundle; PR-based change with platform-team review |
| Q9 | Terraform module registry hosting (Azure Storage vs. real registry) | Start with Azure Storage + index file; revisit at v1.5 |
| Q10 | Cosmos partition skew if one tenant dominates submissions | Synthetic skew test before GA; consider `(tenantId, agentId_hash_bucket)` if test fails |
| Q11 | GitHub App private key rotation cadence | Quarterly rotation via Logic App; KV soft-delete for rollback; bench test SEC6 |
| Q12 | What does "framework-native" detection look like in v1? | Detection: `agent.yaml: framework: langgraph` or known agent framework dependencies. Stub message routes to "v2 — package as container for now" |

### 7.2 Technical risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | LLM runaway loops | Hard cap: 50 tool calls per submission; per-stage budget; circuit breaker after 5 consecutive same-tool failures |
| R2 | Source code visibility via Copilot Chat (Copilot's own inference sees source even though we don't) | Document clearly in engineer guide; suggest enterprise Copilot deployment for tenants needing tighter control |
| R3 | GitHub App rate limits (5000 req/hour per app) | Per-tenant submission queue + token bucket; v2 multi-app sharding |
| R4 | Sigstore Rekor availability | Cache verified attestations by hash for 24h; if Rekor down >1h, page on-call; do **NOT** auto-bypass |
| R5 | Concurrent workflow runs same repo | Cosmos optimistic concurrency on `agent_card.versions[]`; submission-level lock by `(repo, version)` for terraform apply |
| R6 | Logic App downtime stalls approval queue | Logic Apps SLA 99.9%; backup is direct Teams API call from agent; bench test SEC7 |
| R7 | Policy bundle distribution latency (local cache stale) | `uap policy sync` on every `uap chat`; server returns `policy_version_used` in lint; mismatch → prompt re-sync |
| R8 | Agent context window blow-out on long Phase-1 conversations | Stream files via summarization tool; cap chat turns at 30; offer "save and resume" |
| R9 | Reviewer rubber-stamping (humans approving in 2s) | Audit log captures `decision_made_at - notification_sent_at`; alert when median review time < 30s for any reviewer; quarterly retro |
| R10 | Terraform state corruption in publisher's Storage Account | State backed by Storage Account with versioning + soft-delete; runbook for state surgery |
| R11 | PHI false negatives — scrubber misses novel pattern | Golden set + CI gate; quarterly red-team adds patterns; second-pass via Azure AI Content Safety |
| R12 | PHI false positives — friction on legitimate non-PHI | Allow `// uap-allow: phi-pattern` inline annotation with audit trail; reviewer can grant exception |
| R13 | First-version SLSA verify fail rate (subtle CI config issues) | Opinionated workflow template; troubleshooting doc; `uap doctor` CLI to test workflow locally |
| R14 | Cosmos data-plane RBAC misconfiguration breaks immutability | Bicep module locks role assignments; bench test SEC2 verifies; quarterly access review |
| R15 | Conversation memory contains PHI (engineer pasted PHI in chat) | PHI scrubber runs on conversation memory before persisting; chat surface displays "PHI detected and removed" warning |

### 7.3 Assumptions to validate

| ID | Assumption | Validation method |
|---|---|---|
| A1 | Domain engineers actually use VS Code | Survey in pilot tenant; if < 70% VS Code, prioritize Cursor/JetBrains skill packaging earlier |
| A2 | 60-min low-risk SLO is achievable end-to-end | Synthetic load test at 100 sub/day with full pipeline timing; tune if any stage exceeds budget |
| A3 | LLM-drafted governance tickets help reviewers | A/B test: 20 reviewers, half see ticket, half see raw artifacts; measure decision quality + time |
| A4 | Capability vocabulary stays bounded (< 500 tags per tenant) | Quarterly vocabulary audit; alert if growth > 20%/quarter |
| A5 | Source-aware PHI inference: precision > 0.9, recall > 0.95 | Golden test set of 100 source files (50 with PHI, 50 without); measured nightly |
| A6 | Most submissions are low-risk auto-approve (> 60%) | Track auto-approval rate in workbook; if < 40%, revisit risk classifier with compliance |
| A7 | Engineers tolerate first-push SLSA failures and learn | Track repeat-offender rate; if > 50% of new engineers hit SLSA fail twice, improve template + docs |
| A8 | GitHub App scales to ~50 tenant orgs in v1 | Load test webhook receiver; document scale-out plan |
| A9 | Foundry Evaluations format is stable | Pin SDK version; budget for format migration if needed |
| A10 | One repo per agent is the dominant pattern | Survey at pilot launch; revisit monorepo support if > 30% want it |

### 7.4 Decisions deliberately deferred (not blockers)

| ID | Decision | When to revisit |
|---|---|---|
| D1 | BYOM (bring-your-own-model) for non-Azure LLM providers | v2 |
| D2 | Tenant-scoped LLM for governance ticket drafting | v1.5 (after D1) |
| D3 | AgentCard `marketplace_id` separate from `version_id` | v2 |
| D4 | Audit log export format (JSON Lines / CSV / STIX) | Before first external audit |
| D5 | Reviewer queue UI full UX (Admin Dashboard is rough sketch in v1) | v1.5 |
| D6 | Marketplace pricing model (free / chargeback / showback) | Marketplace team |
| D7 | `uap` CLI distribution model (npm only / brew / single binary / container) | v1.5 |
| D8 | Cross-cloud (AWS/GCP) deployment targets | Indefinitely (Azure-only) |
| D9 | Plug-in architecture for new asset types beyond Agent / MCP / Tool / Model | When 3rd asset type is requested |
| D10 | Mobile-friendly Admin Dashboard | v2 |
| D11 | i18n of LLM-drafted text | v2 once first non-English tenant onboards |
| D12 | Notification fatigue mitigation (digest mode, per-reviewer prefs) | v1.5 if reviewers complain |

### 7.5 Known unknowns

| ID | Area | Implication |
|---|---|---|
| K1 | Disaster recovery / backup for Cosmos, Storage state, GH App key | DR plan needed before GA |
| K2 | Data residency — EU tenant requirements | Multi-region geo-fencing if EU tenants onboard |
| K3 | Accessibility (a11y) of Portal and Admin Dashboard | WCAG audit before external rollout |
| K4 | Bootstrapping: how does the Onboarding Agent itself get into the marketplace? | Document the bootstrap procedure (manual genesis) |
| K5 | Penetration testing scope | Pen test before GA |
| K6 | Cost attribution per tenant | All resources tagged by `tenantId` already; chargeback is then a query problem |
| K7 | Engineer training & change management | Pilot tenant gets dedicated enablement session |
| K8 | Prompt versioning for in-flight submissions | Pin prompt version per submission start |
| K9 | Marketplace catalog ↔ Onboarding Agent contract | Joint contract review needed with catalog team |
| K10 | GitHub App uninstalled mid-pipeline by publisher | Test scenario; pending submissions → `failed` with `reason=gh-app-uninstalled`; active versions stay active |

### 7.6 Severity rollup (triage)

| Tier | Items | Action |
|---|---|---|
| **🔴 Must answer before build starts** | Q4, Q7, Q12, R14 | Day-0 spike tickets |
| **🟠 Must answer before bench tests pass** | Q1, Q2, Q3, Q6, Q9, Q11, R5, R7, R11, A2, A5 | Address during build; gate on bench tests |
| **🟡 Must answer before pilot launch** | Q5, Q8, Q10, R3, R6, R10, R13, A1, A3, A6, K3, K5, K9 | Track in v1 risk register; resolve during pilot |
| **🟢 Can wait for post-launch / v2** | D1–D12, K1, K2, K6, K7, K10 | Document; don't block v1 |

---

## 8. Cross-references

- **Architecture source:** `docs/deliverables/UAP_Architecture_Document_formatted.docx` §12.1, §12.2, §17.3
- **Existing user stories:** [docs/plans/onboarding-agent-user-stories.csv](../plans/onboarding-agent-user-stories.csv) (US-OB-01 … US-OB-17)
- **Glossary:** [docs/plans/onboarding-agent-glossary.md](../plans/onboarding-agent-glossary.md)
- **Related design:** [docs/brainstorms/2026-04-09-global-orchestrator-requirements.md](./2026-04-09-global-orchestrator-requirements.md)
- **Hybrid governance plan (existing):** [docs/plans/2026-05-12-001-feat-hybrid-agent-governance-plan.md](../plans/2026-05-12-001-feat-hybrid-agent-governance-plan.md)
- **ATV conventions:** [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
- **Project mission:** [CLAUDE.md](../../CLAUDE.md)

---

## 9. Next steps

1. **User reviews this design doc** and approves or requests edits
2. **Invoke `writing-plans` skill** to produce `docs/plans/2026-05-13-001-feat-onboarding-agent-v1-plan.md` — an executable, checkbox-driven implementation plan derived from the 23 deliverables in §6.1, sequenced against the dependency graph in §2, and gated by the bench tests in §6.5
3. **Day-0 spike tickets** for 🔴 items in §7.6 (Q4, Q7, Q12, R14)
4. **`writing-plans` produces a plan that can be handed off to `/ce-work` (ATV) for execution**

---
*End of design document.*
