# ADR: Pivot Onboarding Agent Runtime to LangGraph

**Status:** Accepted
**Date:** 2026-05-13

## Context

The Onboarding Agent must coordinate a governed, resumable 7-stage pipeline: submission, validation, registration, approval, provisioning, integration checks, and activation. The foundation already uses ACA-hosted API ingress, Cosmos DB for state, Application Insights for telemetry, and deterministic TypeScript helpers for security-sensitive gates.

The original design described the runtime as MAF-built. Before implementing the orchestration runtime, we are pivoting that runtime to LangGraph.

## Decision

Use LangGraph for the ACA-hosted Onboarding Agent orchestration runtime.

The API and webhook ingestion adapters are hosted on Azure Container Apps. The current implementation runs the existing Azure Functions v4 Node worker inside an ACA container as a transitional adapter, so deployment uses ACA without rewriting all handlers at once. Deterministic platform tools remain the source of truth for validation, SLSA verification, scanning, approval state, deployment-output activation, AgentCard writes, audit, and telemetry.

## Shape

The LangGraph runner owns a serializable `OnboardingGraphState` keyed by `(tenantId, submissionId)` and resumes from Cosmos checkpoints. Graph nodes map to deterministic stage boundaries:

1. Load submission
2. Validate manifest
3. Verify provenance
4. Ingest scan findings
5. Register staging AgentCard
6. Classify risk
7. Await or apply approval
8. Open GitHub onboarding gate
9. Await deployment outputs
10. Activate AgentCard
11. Emit audit and telemetry

The LLM is limited to authoring assistance, reviewer summaries, and remediation copy. Gates that mutate state or decide policy remain deterministic.

## Consequences

- We keep all Plan 1 foundation work.
- New onboarding APIs should enqueue or persist graph triggers rather than owning orchestration logic inline.
- Graph state must not store raw source, prompts, logs, or scan bodies; it stores references and PHI-scrubbed summaries.
- Idempotency and checkpoint tests are required around side-effecting nodes.
- The Microsoft Foundry/MAF-specific implementation path is deferred unless needed for deployed agent hosting later.
