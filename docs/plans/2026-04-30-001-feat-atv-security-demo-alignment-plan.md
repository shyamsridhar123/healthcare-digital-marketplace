---
title: Align ATV Security Marketplace Demo
type: feat
status: completed
date: 2026-04-30
origin: docs/brainstorms/2026-04-30-atv-security-marketplace-demo-requirements.md
---

# Align ATV Security Marketplace Demo

## Overview

Align the existing ATV security demo target and presenter artifacts with the AI Asset Marketplace security-review story. The current vulnerable target already provides strong scan evidence across application code, MCP-style tools, skills, agents, hooks, and editor configuration. This plan keeps that scan fixture intact while rebranding the visible experience, adding marketplace metadata and review states, creating a saved fallback report, and expanding the presenter script into the requested one-hour technical path.

## Problem Frame

The demo needs to show the full capability of `/atv-security` in one hour without becoming a disconnected list of vulnerabilities. The source requirements define the strongest framing as a publisher-submitted AI asset bundle that must pass a marketplace security gate before enterprise publication (see origin: docs/brainstorms/2026-04-30-atv-security-marketplace-demo-requirements.md). The current app under demos/atv-security-target is technically rich, but its visible UI and script still read as a claims console and 30-minute scanner walkthrough.

## Requirements Trace

- R1-R4. The demo target and workbench must visibly represent a submitted AI marketplace asset bundle with publisher, publication action, bundle inventory, requested permissions, and review status.
- R5-R8. The demo must focus on three to five decision-driving findings, label evidence provenance, and describe fix mode as assisted remediation requiring human review.
- R9-R12. The demo must preserve two-window scanner choreography: monorepo path-scoped source scan plus target-root full config scan with preflight checks.
- R13-R16. The workbench must be a local governance surface with marketplace-specific copy, review states, remediation ownership, and mock-only approval events.
- R17-R20. The demo must include a canonical sanitized fallback report, synthetic data validation, inert demo posture, and isolation from production build/deploy paths.
- R21-R23. The primary script must become a 60-minute technical path with a 30-minute executive subset, proving scanning breadth first and governance decisions second.

## Scope Boundaries

- Do not make the vulnerable target production-safe during this pass; preserve deliberate findings for `/atv-security`.
- Do not wire the workbench to live scanner output or production backend persistence; static/local demo fixture data is acceptable when explicitly labeled.
- Do not add demos/atv-security-target to root npm workspaces, Azure deployment, or production build paths.
- Do not require live dependency installation, real MCP server startup, real hook execution, real LLM calls, or network egress during the primary demo path.
- Do not build a second demo app; evolve the existing target and deliverables.

## Context & Research

### Relevant Code and Patterns

- demos/atv-security-target/README.md already documents the target as an intentionally vulnerable scan fixture and includes the two scan commands.
- demos/atv-security-target/public/index.html, demos/atv-security-target/public/app.js, and demos/atv-security-target/public/styles.css define the standalone demo UI that currently uses claims-console framing.
- demos/atv-security-target/src/db.js seeds users, patients, cases, agents, skills, and audit events, but has no marketplace asset metadata or publication review state.
- demos/atv-security-target/src/routes/cases.js contains local approval behavior for claim cases, which should remain vulnerable evidence rather than becoming marketplace approval logic.
- demos/atv-security-target/.github and demos/atv-security-target/.vscode already contain the key agentic-config scan fixtures.
- apps/web/app/atv-security/page.tsx already has a static scan queue, findings, approval-flow, and evidence tabs, but some fixture paths and states do not yet match the target or marketplace story.
- docs/deliverables/atv-security-demo-script.md is the current 30-minute script and should be expanded rather than replaced wholesale.

### Institutional Learnings

- No docs/solutions or existing docs/plans artifacts were found for this topic.
- Project instructions require ATV plans under docs/plans and preserve docs/brainstorms, docs/solutions, docs/plans, and deliverables as durable project artifacts.

### External References

- No framework-specific external research is required for implementation. Security-demo best practice still shapes the plan: keep the target local, synthetic, inert, clearly labeled, and supported by fallback evidence.

## Key Technical Decisions

- Reframe, do not rebuild: Reuse demos/atv-security-target because it already covers the major `/atv-security` source and agentic-config surfaces.
- Keep claims as payload, not product frame: Claims/member-style data remains the risky domain data inside the submitted asset, while the UI and script describe the asset as a marketplace submission.
- Add marketplace metadata as demo fixture data: Seed and expose a single asset-review fixture with publisher, asset/version, publication request, permissions, inventory, status, and review timeline so planning does not require production persistence.
- Define a canonical fixture contract first: Use one shared contract shape for asset ID, asset name, publisher, submitted/remediated versions, requested action, requested permissions, inventory, review state labels, evidence provenance, golden finding IDs, synthetic evidence registry, and report paths. The target app and workbench may consume or mirror the data differently, but the verifier must keep them aligned.
- Use docs/security/fixtures/atv-security-target-seeded-fallback-report.md as the canonical fallback report: The fixture-only path and banner reduce confusion with live `/atv-security` reports generated under the normal docs/security/YYYY-MM-DD-security-report.md convention.
- Treat workbench approvals as mock governance states: Workbench actions should support the story but must not imply production marketplace publication. The primary golden path should block the submitted version with `needs_remediation` or `rejected_submitted_version`; waiver and remediated approval are alternate examples, not the expected outcome.
- Add a lightweight verification script early: A deterministic local check is more reliable than asking future implementers to manually inspect every UI string, report path, deployment isolation, and synthetic-data guardrail.

## Open Questions

### Resolved During Planning

- Saved report location: Use docs/security/fixtures/atv-security-target-seeded-fallback-report.md for the canonical fallback report and link it from the script/workbench with seeded-fallback labels.
- One-hour run-of-show shape: Use the source requirements sequence: setup and framing, source scan, target-root config scan, fallback branch, golden findings, STRIDE synthesis, governance workbench, fix-mode positioning, and Q&A.
- Pre-demo validation approach: Add a verification script that checks fixture paths, marketplace labels, fallback report existence, synthetic markers, and inert-environment expectations.

### Deferred to Implementation

- Exact UI copy and visual density: Final text should be tuned while editing the static UI so it remains readable at demo resolution.
- Exact fallback report wording: The report should reflect the latest `/atv-security` phrasing available during implementation while preserving the required finding categories.
- Exact static fixture format: Prefer a small JSON or CommonJS fixture that the target UI can render and the workbench can mirror; do not add routes/database tables unless implementation proves static fixtures cannot satisfy the demo.

## Implementation Units

- [x] **Unit 1: Define Story Spine, Fixture Contract, and Verifier Scaffold**

**Goal:** Lock the one-hour story spine, establish one canonical demo contract, and add a read-only verifier scaffold before changing UI, workbench, report, or script surfaces.

**Requirements:** R1-R4, R7, R12, R17-R20

**Dependencies:** None

**Files:**
- Create: demos/atv-security-target/src/demoAssetReviewFixture.js
- Create: demos/atv-security-target/scripts/verify-demo-alignment.js
- Modify: demos/atv-security-target/package.json
- Modify: docs/deliverables/atv-security-demo-script.md
- Test: demos/atv-security-target/scripts/verify-demo-alignment.js

**Approach:**
- Add a short story-spine section to the script before detailed editing: audience promise, first two-minute frame, scan-to-governance transition, fallback trigger, and final decision moment.
- Define the canonical demo fixture shape for asset ID, asset name, publisher, submitted version, remediated version, requested action, requested permissions, bundle inventory, review state labels, evidence paths, provenance labels, golden finding IDs, report paths, and synthetic evidence registry.
- Define review states as static demo states/timeline entries, not an enforced governance engine: `new`, `in_review`, `needs_remediation`, `rejected_submitted_version`, `waived_by_reviewer`, and `approved_remediated_version`. `waived_by_reviewer` is accepted risk, not approval of the submitted version. `approved_remediated_version` must name a remediated version and decision reason.
- Add an evidence-to-decision bridge contract: each golden finding has the same stable ID, title, repo path, provenance label, business risk, remediation owner, and governance decision across fallback report, script, and workbench.
- Add a report-path matrix: seeded fallback report path, optional live report path, and the label each path must use when referenced.
- Add an exact synthetic evidence registry: allowed fake value, file, purpose, and expected scanner category for known fake secrets, demo users, member IDs, passwords, endpoints, and token-shaped strings.
- Create the verifier scaffold early with checks for required files, package scripts, deployment isolation, and fail-closed environment guardrails. Additional content assertions can be added as later units land.
- Keep the verifier read-only: no server startup, no hook execution, no MCP startup, no package installation, and no network requests.
- Make deployment isolation deterministic by checking parsed production inputs only: root workspaces, azure.yaml services/hooks, Docker/build manifests, CI deploy jobs, infra references, and production app import paths. Explicitly allow demo package files and documentation references.
- Make network/LLM guardrails fail closed: fail if `USE_REAL_LLM=true`, if `LLM_PROVIDER_URL` points outside localhost/127.0.0.1/.invalid, if `LLM_API_KEY` is set to a non-demo value, or if webhook variables point to routable external hosts.

**Patterns to follow:**
- Use simple CommonJS modules and Node built-ins only, matching the demo target style.
- Keep package.json scripts small and explicit, preserving the existing `check` script.

**Test scenarios:**
- Happy path: verifier runs without starting the app and confirms required fixture, README, `.github`, `.vscode`, script, and deployment-isolation paths.
- Error path: adding demos/atv-security-target to root workspaces or azure.yaml causes the verifier to fail with the offending file path.
- Error path: setting `USE_REAL_LLM=true` or a non-demo provider key causes the verifier to fail before any demo step.
- Error path: removing the canonical fixture contract or required review states causes the verifier to fail with the missing contract field/state.
- Error path: an approval-like state without `remediatedVersion` or explicit waiver reason fails fixture validation.

**Verification:**
- The verifier scaffold exists and can be extended by later units.
- Running the verifier is safe in the same environment used for the live demo.

- [x] **Unit 2: Rebrand Target UI Around Asset Review**

**Goal:** Make the standalone demo target visibly read as a submitted AI asset security review while preserving the claims data as the risky payload being scanned.

**Requirements:** R1, R2, R4, R18, R19

**Dependencies:** Unit 1

**Files:**
- Modify: demos/atv-security-target/public/index.html
- Modify: demos/atv-security-target/public/app.js
- Modify: demos/atv-security-target/public/styles.css
- Modify: demos/atv-security-target/README.md
- Test: demos/atv-security-target/scripts/verify-demo-alignment.js

**Approach:**
- Rename visible shell copy from claims-console framing to submitted AI asset security review framing.
- Add a first-screen Marketplace Review Packet. Above the fold at demo resolution, the top row should show asset identity, publisher, review status, and requested publication action; the second row should show scan scope and provenance; inventory and permissions can sit below or in an expandable section.
- Keep case queue, agents, MCP tools, skills, and LLM summary sections, but present them as bundle evidence and risky domain payload rather than the product itself.
- Add visible synthetic-data and local-only labels so demo viewers understand fake secrets and claims/person data are intentionally seeded.
- Verify readability at 1280x720 and 1366x768, plus a 50/50 split-screen condition if the app is shown next to terminal/browser content. Require no horizontal scrolling, no clipped badges/buttons, readable table/card text, and graceful wrapping for long paths and finding titles.
- Preserve lightweight accessibility basics: keyboard-reachable reviewer actions, visible focus states, status text not conveyed by color alone, and clear accessible labels for mock approval controls.

**Patterns to follow:**
- Keep the existing plain HTML/CSS/vanilla JS style in demos/atv-security-target/public.
- Reuse the current card, badge, metrics, panel, and split layout patterns rather than adding a UI framework.

**Test scenarios:**
- Happy path: loading public/index.html shows an asset review heading, asset name, publisher, publication action, review status, bundle inventory, requested permissions, and synthetic/local-only labels.
- Integration: the existing case, agent, MCP, skill, and LLM sections still render from the same APIs after the copy/frame changes.
- Edge case: when the cases API returns an empty list, the UI still preserves the asset metadata and does not collapse the review story.
- Error path: if a fetch fails, the UI should not imply approval or successful scan evidence; it should leave the related section empty or visibly unavailable.

**Verification:**
- The visible target no longer reads as the product being a generic claims console.
- The claims data remains visible as evidence inside the submitted bundle.
- npm syntax checks for the demo target still pass.

- [x] **Unit 3: Align Marketplace Metadata, Workbench States, and Evidence Bridge**

**Goal:** Add durable seeded fixture data for the submitted asset and its review lifecycle so the target and workbench can share a coherent marketplace story.

**Requirements:** R1-R4, R7, R13-R16

**Dependencies:** Units 1-2

**Files:**
- Modify: demos/atv-security-target/src/demoAssetReviewFixture.js
- Modify: demos/atv-security-target/public/app.js
- Modify: apps/web/app/atv-security/page.tsx
- Test: demos/atv-security-target/scripts/verify-demo-alignment.js

**Approach:**
- Introduce or complete a single static submitted asset fixture such as `Claims Triage Agent Bundle`, with synthetic publisher, submitted version, remediated version, requested marketplace action, requested permissions, inventory, and current status.
- Keep marketplace governance in the static demo fixture boundary. Do not reuse demos/atv-security-target/src/routes/cases.js approval behavior for marketplace approval, because that route remains vulnerable A01 evidence.
- Model the required review states as display states/timeline entries: `new`, `in_review`, `needs_remediation`, `rejected_submitted_version`, `waived_by_reviewer`, and `approved_remediated_version`.
- Add workbench state copy/actions as static UI states: primary action, secondary action, disabled action, required mock input, success copy, unavailable copy, and mock-only label. `Approve remediated version` is disabled unless a remediated version exists; `Waive with reviewer reason` must show accepted-risk language rather than approval language.
- Add evidence provenance labels for each showcased finding: live scanner output, seeded fallback evidence, or workbench fixture data.
- Use a shared provenance taxonomy and placement rule across surfaces: `Live scan`, `Seeded fallback`, or `Workbench fixture`, with command/path/timestamp when available.
- Add the evidence-to-decision bridge: each golden finding must use the same ID/title/path/provenance/risk/owner/decision across the fallback report, script, and workbench.
- Align the workbench findings to demos/atv-security-target paths and golden risks instead of unrelated sandbox paths.
- Keep approval/rejection local and mock-only; do not add production publication behavior. Add a demo-only route banner or environment gate for apps/web/app/atv-security/page.tsx so seeded governance UI is not mistaken for a production scanner or publication workflow.

**Patterns to follow:**
- Follow the static fixture style already used in apps/web/app/atv-security/page.tsx and the plain JS target UI style. Avoid new routes/database changes unless static fixture parity is impossible.

**Test scenarios:**
- Happy path: the target UI and workbench both show the same submitted asset identity, publisher, requested action, and review status.
- Happy path: the workbench can display each required review state without labeling the unsafe original asset as approved.
- Integration: the target UI can render marketplace metadata without removing existing case/agent/tool data.
- Edge case: if static fixture metadata is missing or malformed, the UI falls back to an explicit unavailable/demo-fixture state instead of approval-like language.
- Error path: attempting to represent marketplace approval through the case approval route is rejected by review or verifier coverage because case approval is vulnerability evidence, not governance logic.
- Error path: the workbench cannot show `approved_remediated_version` for the submitted version; it must name the remediated version or show waiver language with reviewer/reason.

**Verification:**
- Workbench findings point to demos/atv-security-target evidence.
- Evidence provenance is visible for showcased findings.
- The review flow blocks the submitted version by default and reserves approval language for remediated-version examples only.

- [x] **Unit 4: Create Canonical Fallback Report and Golden Mapping**

**Goal:** Provide a dated, sanitized fallback artifact that lets the presenter recover gracefully when live `/atv-security` output is delayed, incomplete, or unavailable.

**Requirements:** R5-R8, R17-R19

**Dependencies:** Unit 3

**Files:**
- Create: docs/security/fixtures/atv-security-target-seeded-fallback-report.md
- Modify: docs/deliverables/atv-security-demo-script.md
- Modify: apps/web/app/atv-security/page.tsx
- Test: demos/atv-security-target/scripts/verify-demo-alignment.js

**Approach:**
- Write a sanitized sample report for demos/atv-security-target with a top-line banner that it is seeded fallback evidence, not live scanner output.
- Include the 3-5 golden-path findings: unpinned/overbroad MCP execution, prompt or hook exfiltration risk, broken authorization/IDOR, SSRF/data exposure, and one STRIDE marketplace synthesis.
- Include broader category coverage as an appendix so the demo can prove `/atv-security` breadth without walking every issue live.
- Add a presenter mapping section that connects each golden finding to its demo file path, assurance label, business risk, and governance decision.
- Update the workbench evidence timeline and script to reference the canonical fallback path and the optional live report path separately.

**Patterns to follow:**
- Use concise markdown tables like the existing docs/deliverables/atv-security-demo-script.md taxonomy sections.
- Keep all file references repo-relative.

**Test scenarios:**
- Happy path: the fallback report exists at the planned path and includes the golden findings, STRIDE synthesis, and mapping notes.
- Edge case: report text clearly distinguishes seeded fallback evidence from live scanner output.
- Edge case: if live scan output differs from the saved report, the script explains that live output is primary when usable, saved report is dated fallback evidence, and workbench data is fixture/governance simulation.
- Error path: the script gives a credible presenter branch when live scan output is slow or missing.
- Safety: all secrets, names, endpoints, and member/person data in the report are synthetic and labeled fake.
- Safety: secret-shaped values in the fallback report match the synthetic evidence allowlist or include clear `DEMO`, `FAKE`, `example.invalid`, or test-domain markers.

**Verification:**
- The report can stand alone as fallback evidence for the one-hour demo.
- The workbench and script reference the same canonical report path.

- [x] **Unit 5: Expand Script to One-Hour Marketplace Demo**

**Goal:** Turn the current 30-minute claims-console walkthrough into the primary 60-minute technical demo while retaining a shorter executive subset.

**Requirements:** R5-R12, R17-R23

**Dependencies:** Unit 4

**Files:**
- Modify: docs/deliverables/atv-security-demo-script.md
- Modify: demos/atv-security-target/README.md
- Test: demos/atv-security-target/scripts/verify-demo-alignment.js

**Approach:**
- Reframe the purpose and talk track around marketplace publication security review.
- Add a minute-by-minute 60-minute path covering setup, target framing, monorepo source scan, target-root config scan, fallback branch, golden findings, STRIDE synthesis, workbench governance, fix-mode posture, and Q&A.
- Preserve a 30-minute executive path as a named subset, not the primary script.
- Add preflight checks for the monorepo window and target-root window, including `.github` and `.vscode` discoverability.
- Move `npm install`, local app startup, real LLM usage, and network-dependent steps out of the primary live path and into an appendix or pre-demo-only note.
- State that `USE_REAL_LLM`, `LLM_PROVIDER_URL`, `LLM_API_KEY`, and webhook-style variables must be unset or demo-only before the primary path starts.
- Add a workbench readiness gate: the marketplace workbench is pre-started and already open before the primary path, or the script uses a static screenshot/HTML fallback with the same fixture labels. The primary path should not pause for app startup.

**Patterns to follow:**
- Keep the existing script’s useful taxonomy and expected-findings tables, but reorganize around the marketplace story.
- Mirror the origin document’s flow and scope language so planning and presentation stay aligned.

**Test scenarios:**
- Happy path: the script contains a complete 60-minute sequence that covers all required phases and named commands.
- Happy path: the script preserves a 30-minute executive subset with clear omissions.
- Edge case: the fallback branch explicitly tells the presenter when to use the saved report and how to label its assurance level.
- Error path: preflight failure guidance explains how to recover from missing target-root `.github` or `.vscode` visibility.
- Safety: the primary live path does not instruct dependency installation, real MCP startup, hook execution, or real LLM/network usage.
- Safety: preflight failure for real LLM/network variables stops the live path rather than becoming a warning.
- Error path: unavailable workbench route falls back to a prepared static visual artifact without changing the security assurance claims.

**Verification:**
- A presenter can rehearse from the script without inventing product framing, scan choreography, or fallback narration.
- Fix mode is described as assisted remediation with human review and tests, not automatic approval.

- [x] **Unit 6: Complete Demo Alignment Verification**

**Goal:** Add a small deterministic verification surface so future edits can confirm the demo still satisfies the requirements before rehearsal.

**Requirements:** R7, R12, R17-R20, R21-R23

**Dependencies:** Units 1-5

**Files:**
- Modify: demos/atv-security-target/scripts/verify-demo-alignment.js
- Modify: demos/atv-security-target/package.json
- Modify: demos/atv-security-target/README.md
- Test: demos/atv-security-target/scripts/verify-demo-alignment.js

**Approach:**
- Complete the Node-based verification script so it checks static artifacts rather than running risky app workflows.
- Verify required paths exist: demo README, target `.github` fixtures, target `.vscode` settings, fallback report, and demo script.
- Verify required marketplace labels appear in the target UI/workbench/script.
- Verify the fallback report includes seeded evidence labels and the golden findings.
- Verify environment-sensitive variables such as `USE_REAL_LLM`, `LLM_PROVIDER_URL`, `LLM_API_KEY`, and demo webhook variables are unset or synthetic when the script runs, using fail-closed behavior.
- Enforce the synthetic evidence registry from the fixture contract: fail secret-shaped values outside the explicit registry, and fail if required fake fixtures are removed or renamed. Leave broad vulnerability discovery to `/atv-security` rather than turning the verifier into a second scanner.
- Verify parsed production inputs do not include the demo target: root workspaces, azure.yaml services/hooks, Dockerfiles/.dockerignore or build manifests, CI deploy jobs, infra references, and production app imports. Explicitly allow demo package files and documentation references.
- Verify scanner-fixture manifest snippets remain present for the expected categories: MCP auto-approval, unpinned MCP execution, hook exfiltration shape, fake credentials, prompt-injection text, and representative OWASP evidence.
- Add or finalize a package script such as `verify:demo` while keeping the existing `check` script intact.

**Patterns to follow:**
- Use the existing simple Node script style in demos/atv-security-target/package.json; avoid new dependencies.
- Keep the verifier read-only and local-file based.

**Test scenarios:**
- Happy path: running the verifier after all alignment changes reports success without starting the server.
- Error path: deleting or renaming the fallback report causes a clear failure naming the missing path.
- Error path: removing a required marketplace label from the target UI or script causes a clear failure naming the missing label.
- Error path: adding demos/atv-security-target to parsed production inputs such as root workspaces, azure.yaml services, deploy jobs, infra references, or production app imports causes a clear failure.
- Safety: setting `USE_REAL_LLM=true`, a non-demo provider key, or an external webhook/provider URL causes the verifier to fail.
- Safety: adding a secret-shaped value outside the synthetic evidence allowlist causes the verifier to fail with the file path and matched category.
- Safety: removing required scanner-fixture snippets causes the verifier to fail so rebrand work cannot accidentally erase the demo evidence.

**Verification:**
- `npm run check` and the new demo verification script both pass in demos/atv-security-target.
- The verifier does not execute hooks, start MCP servers, start the Express app, or make network requests.

## System-Wide Impact

- **Interaction graph:** This pass touches the standalone vulnerable target, the static marketplace workbench, and presenter/security documentation. It does not change production web/API behavior.
- **Error propagation:** Runtime errors in the demo target are not being hardened; the app remains intentionally vulnerable. New verification failures should be explicit and local to the demo alignment script.
- **State lifecycle risks:** Review states are static demo states, not persisted governance workflow. Avoid adding database lifecycle complexity unless implementation proves static fixtures cannot support the demo.
- **API surface parity:** Workbench fixture data and target fixture data should tell the same asset-review story, but they do not need a live integration contract.
- **Integration coverage:** The critical cross-surface check is narrative parity across target UI, workbench, fallback report, and script.
- **Unchanged invariants:** The target remains isolated under demos/atv-security-target, remains intentionally vulnerable, and remains outside production build/deploy paths.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| The rebrand accidentally hides useful scanner evidence | Keep claims data, vulnerable routes, agentic fixtures, fake secrets, and risky instructions intact; change framing and metadata only. |
| The demo implies production approval or automatic remediation | Label workbench actions as local/demo-only, use remediated-version language, and state that fix mode requires human review and tests. |
| Static fixture data drifts across target, workbench, report, and script | Use the canonical fixture contract and verifier checks for IDs, paths, provenance, states, report paths, and evidence-to-decision bridge. |
| Live scan output is slow or differs from the script | Use the canonical saved report as seeded fallback evidence and label live versus fallback versus fixture data. |
| Fake secrets or synthetic data are mistaken for real data | Use obvious fake values, add labels in UI/docs, and verify synthetic markers before rehearsal. |
| Primary demo path performs network or execution side effects | Keep primary path static-scan-first and move dependency install, local server, real LLM, and network steps to pre-demo appendix only. |

## Documentation / Operational Notes

- Update docs/deliverables/atv-security-demo-script.md as the presenter-facing source of truth for the 60-minute and 30-minute paths.
- Update demos/atv-security-target/README.md so local users understand the marketplace framing, safety posture, and optional nature of running the vulnerable app.
- Keep docs/security/fixtures/atv-security-target-seeded-fallback-report.md sanitized and clearly labeled as seeded fallback evidence.
- Before demo rehearsal, verify that parsed production inputs do not include demos/atv-security-target and that the workbench is either pre-started/open or has a static fallback artifact ready.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-30-atv-security-marketplace-demo-requirements.md](../brainstorms/2026-04-30-atv-security-marketplace-demo-requirements.md)
- Current script: [docs/deliverables/atv-security-demo-script.md](../deliverables/atv-security-demo-script.md)
- Target app: [demos/atv-security-target](../../demos/atv-security-target)
- Workbench: [apps/web/app/atv-security/page.tsx](../../apps/web/app/atv-security/page.tsx)
- Project context: [CLAUDE.md](../../CLAUDE.md)