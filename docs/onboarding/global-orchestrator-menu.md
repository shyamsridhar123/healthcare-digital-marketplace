# Global Orchestrator Menu

The Global Orchestrator menu gives operators and domain authors a tenant-scoped control-plane view of request routing, policy state, and governed follow-through.

## Operator Journey

1. Open **Global Orchestrator** from Operations.
2. Review the summary counts for active traces, policy holds, and completed executions.
3. Filter by stage when investigating pre-flight, routing, domain execution, or post-flight issues.
4. Open a trace detail page to inspect the stage timeline, policy decision, domain summary, and authorized follow-through links.
5. Follow policy, audit, dead-letter, domain, or health links only through the owning service. Mutations remain reauthorized by that service.

## Domain Author Journey

1. Open **My Routable Agents** from the Global Orchestrator route.
2. Review owned domain agents and the first blocking gate.
3. Use the next action to continue onboarding, attach policy, review evaluation, or inspect health.
4. Return to the routability list after onboarding or policy work to confirm the gate state updated.

## Status Sources

- Execution cockpit: `global-execution-records` projection keyed by tenant and trace.
- Routability: derived from onboarding submissions, staged AgentCards, A2A registry records, policy status, evaluation status, schema status, and health.
- Dead-letter follow-through: minimized link descriptors unless an existing durable dead-letter workflow is available.

## Monitoring

Watch these signals during rollout:

- Application Insights events containing `global_orchestrator` and `authorization`.
- 401/403 rates on `/api/global-orchestrator/*` and `/api/policies/launch-context`.
- Cosmos RU and latency for `global-execution-records` list/detail queries.
- PHI scrubber golden-set health and any telemetry processor failures.

Healthy signals: cockpit list returns within the target latency for pilot tenants, denied cross-tenant reads are audited, and no raw payload fields appear in projection documents.

Failure signals: increased 500s on Global Orchestrator APIs, missing stage projections for representative real requests, Cosmos throttling, or any PHI-like value in cockpit telemetry. Roll back by hiding the navigation entry or disabling the role/feature flag while keeping owning services available.
