# Domain Engineer Quickstart: GitHub Push Onboarding

This guide shows how a domain team publishes a domain agent to the AI Marketplace by pushing code through GitHub.

## Prerequisites

- Repository is registered with the marketplace GitHub App.
- Repository contains `agent-manifest.json` at the root.
- CI can call the marketplace onboarding API with its function key or brokered service credential.
- CI can produce SLSA provenance, SBOM, scan output, eval report, and deployment outputs.

## Required Manifest

```json
{
  "name": "Claims Copilot",
  "version": "1.0.0",
  "description": "Assists claims analysts with document summarization and routing.",
  "owner": { "team": "claims-platform", "email": "claims-platform@example.com" },
  "runtime": { "type": "aca", "image": "contoso.azurecr.io/claims-copilot:1.0.0" },
  "capabilities": ["claims-summary"],
  "rai": { "tags": ["human-in-the-loop"], "data_categories": ["pii"] },
  "repository": { "url": "https://github.com/contoso/claims-copilot", "branch": "main" }
}
```

Use `rai.data_categories: ["phi"]` only when the agent is approved to process PHI. The onboarding scan gate fails submissions when PHI is suspected but not declared.

## GitHub Flow

1. Push a commit or open a pull request.
2. The marketplace GitHub webhook records the sanitized delivery and rejects replayed payloads.
3. CI posts the manifest to `POST /api/onboarding/submissions`.
4. The LangGraph onboarding runner validates the manifest and classifies risk.
5. Low-risk agents are auto-approved; medium/high-risk agents wait for reviewer approval.
6. CI posts provenance to `POST /api/onboarding/submissions/{id}/provenance`.
7. CI posts scan findings to `POST /api/onboarding/submissions/{id}/scan-findings`.
8. CI opens and transitions the GitHub gate through `POST /gate/open` and `POST /gate/transition`.
9. CI posts eval results to `POST /api/onboarding/submissions/{id}/eval-report`.
10. CI deploys the agent to ACA and posts signed deployment outputs to `POST /api/onboarding/deployment-outputs`.

After activation, the onboarding agent writes the active A2A registry record, the active AgentCard projection, an audit event, and a pending search reindex request.

## Local Validation

Run the onboarding backend tests before changing the workflow:

```powershell
npm run test:onboarding --workspace ai-marketplace-api --
```
