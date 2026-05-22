---
date: 2026-05-22
topic: run-preview-scripted-playground
---

# Run Preview — Scripted Playground for Published Models

## Problem Frame

After publishing a model from the IMDE governed-sandbox flow, the model detail page already advertises a "Run preview" button next to a single hardcoded sample input/output (see `apps/web/app/models/[id]/page.tsx`). The button has no `onClick` handler today, so clicking it does nothing — the published-model experience visibly stops short of what a viewer expects after seeing the affordance.

We want this button to deliver a HuggingFace-Spaces-style moment for the demo: a viewer picks a synthetic input, clicks Run, and sees a deterministic, branded response with latency and confidence — completing the "your governed model is ready to try" story without standing up real inference infrastructure.

## Requirements

**Playground UI**
- R1. Replace the static single-sample card on the published model detail page with an interactive playground panel that contains: an input selector (2–4 pre-canned synthetic claim scenarios), a "Run preview" action, and a result area for the model's response.
- R2. Show a clear "Synthetic data only" badge inside the playground panel so viewers cannot mistake the preview for real PHI inference.
- R3. While the run is in flight, show a transient loading state (spinner + simulated latency in the 400–900 ms range so it feels like a real call, not instant) and disable the Run button.
- R4. After the run, display: the model's prediction (denial risk High/Medium/Low), a one-sentence rationale, an optional reason code, a confidence score (0–100 %), and the simulated latency in ms.
- R5. Allow the user to switch to a different canned input and re-run; the result area updates without a full page reload.

**Scripted scorer**
- R6. Canned inputs and their deterministic outputs are defined alongside the demo scenario (extend the existing `publishedExperience` config in `apps/api/src/lib/sandbox/demo-scenario.ts` and surface them on the experience document returned to the web app). No new inference call is made.
- R7. The scorer is a pure mapping from `input scenario id → output payload` (no fuzzy matching, no model invocation). Outputs are stable across runs.
- R8. The playground emits a `preview` session record via the existing `POST /api/sessions` endpoint so each click is observable in the platform's session history with the asset id, input scenario id, and synthesized output. The simulated latency is recorded in `metrics.latencyMs`.

**Scope alignment**
- R9. The playground is gated on `experienceType === "published-model-experience"` and `previewType === "classification-playground"` — same gate as the existing static card. Other model types continue to render their existing UI unchanged.
- R10. Inputs and outputs are presented as plain text snippets (no structured form, no JSON editor). Each canned scenario carries a short human label (e.g., "Outpatient MRI, missing prior auth") shown in the selector.

## Success Criteria

- A viewer clicking "Run preview" on the published RCM denial model sees a believable, branded interactive moment — not a dead button — within ~1 second.
- The published model page has no remaining hardcoded `sampleInput`/`sampleOutput` strings rendered statically; all sample data flows from the demo scenario config through the experience document into the UI.
- Each preview click produces an audit-visible `preview` session document with `assetId`, `input.scenarioId`, output payload, and `metrics.latencyMs`.
- No new Azure inference resource (AML online endpoint, container app, etc.) is required to make the demo work end to end.

## Scope Boundaries

- Out: real model inference against an AML endpoint. The button never calls an actual scoring service in this iteration.
- Out: free-text input. The user picks from a fixed list of synthetic claim scenarios; arbitrary typed input is deferred.
- Out: shareable public Space URLs (HF-style `huggingface.co/spaces/<user>/<space>` deep links). Anyone with access to the model detail page sees the same playground.
- Out: persisted run history UI on the model page (a "previous runs" list). Session records still write for audit, but the page only shows the most recent result.
- Out: extending the playground to non-`classification-playground` preview types (regression, generation, embedding, etc.) — defer until a second `previewType` exists.

## Key Decisions

- **Scripted scorer over real inference** — Demo data is synthetic and we don't yet have a deployed scoring endpoint for the published model. A deterministic mapping is honest to the demo's "synthetic, de-identified" framing, takes no infra cost, and is straightforward to swap for a real call later by replacing the client-side `runPreview` helper with a backend call.
- **Server-defined scenarios over client-only constants** — Canned inputs/outputs live in the demo scenario config so the published `model.preview` payload remains the single source of truth and stays consistent with the rest of the IMDE demo seed (which already lives there).
- **Reuse `/api/sessions` instead of a new endpoint** — The `preview` session type already exists; emitting through it gives the demo audit/observability story for free without expanding API surface.

## Dependencies / Assumptions

- The published model detail page reads from `apps/web/lib/models-data.ts` today (hardcoded demo data) but should switch to reading the experience document so the new fields propagate. Verify during planning whether the page currently fetches from `/api/model-experiences/{id}` and falls back to the hardcoded data, or vice-versa. _Unverified during brainstorm._
- `previewType: "classification-playground"` is already set on the published experience by `buildImdeDemoPublishArtifacts` ([apps/api/src/lib/sandbox/demo-scenario.ts:407](../../apps/api/src/lib/sandbox/demo-scenario.ts#L407)). Verified.
- The `sessions` container has TTL semantics already (24 h) — preview sessions inherit that and won't accumulate. Verified at [apps/api/src/functions/sessions/sessions.ts](../../apps/api/src/functions/sessions/sessions.ts#L70).

## Outstanding Questions

### Resolve Before Planning
_None._

### Deferred to Planning
- [Affects R1, R6][Technical] Where exactly should the playground panel render in the model page layout — replace the current static card in place, or move it above the tabs as a dedicated section? Confirm during planning by reviewing the model page layout.
- [Affects R6][Needs research] What shape should the scenario list take in the experience document? Inline array on the experience, or a separate `playgroundScenarios` resource? Default assumption: inline array of `{ id, label, inputText, output: { prediction, rationale, reasonCode?, confidence } }` since the list is small (≤4) and per-experience.
- [Affects R3][Technical] Simulated latency: jitter per click (random in range) vs. fixed-per-scenario? Defaulting to per-click random jitter unless planning decides otherwise.
- [Affects R8][Technical] Should the playground call `/api/sessions` before or after showing the simulated result? In-parallel fire-and-forget is fine for a demo; confirm during planning.

## Next Steps

→ `/ce-plan` for structured implementation planning
