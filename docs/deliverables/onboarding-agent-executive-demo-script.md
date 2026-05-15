# Onboarding Agent Executive Demo Script

## Demo Goal

Show how AI Marketplace reduces domain-agent onboarding from a manual platform-engineering handoff into a governed self-service flow triggered from a normal GitHub push.

## Setup

- AI Marketplace web: `http://127.0.0.1:3000`
- Onboarding UI: `http://127.0.0.1:3000/onboarding/new`
- Local API: `http://localhost:7071/api`
- Demo repo: `demos/optum-uhg`
- GitHub repo: `https://github.com/rajesh-ms/optum-uhg`
- Marketplace branch: `feat/onboarding-agent-flow`
- Skills Registry: `http://127.0.0.1:3000/registry/skills`

## Storyline

### 1. Open With The Problem

Domain engineering teams can build useful agents quickly, but production onboarding usually slows down at the handoff: manifest questions, security evidence, deployment details, approval tracking, and marketplace registration.

### 2. Show The Marketplace Asset

Open `http://127.0.0.1:3000/asset/uap-onboarding-agent`.

Talk track:

> This is the UAP Onboarding Agent published as a marketplace asset. A domain engineer can install it into VS Code, invoke `/uap-onboarding`, or launch the UI onboarding path directly.

Point out:

- install command for the VS Code skill
- `/uap-onboarding` invocation
- `Onboard via UI` button

Then open the Skills experience:

- Marketplace Skills tab on `http://127.0.0.1:3000`
- Skills Registry at `http://127.0.0.1:3000/registry/skills`

Talk track:

> The same onboarding capability is also published as a downloadable VS Code skill. Domain engineers can discover it under Skills, install it locally, and use the same guided workflow without leaving VS Code.

Point out:

- `UAP Onboarding VS Code Skill` in the marketplace Skills tab
- `uap-onboarding` in the Agent Skills Registry
- trigger phrases such as `uap-onboarding` and `onboard domain agent`

### 3. Show The Demo Agent Repo

Open `demos/optum-uhg`.

Talk track:

> This looks like a normal domain-agent repository. It has code, tests, a Dockerfile, and a small `agent-manifest.json`. The marketplace-specific work is declarative and lives next to the code.

Show:

- `agent-manifest.json`
- `src/agent.js`
- `.github/workflows/marketplace-onboarding.yml`
- `.github/scripts/post-validation-evidence.ps1`
- `.github/scripts/publish-to-marketplace.ps1`

### 4. Run Local Validation

From the demo repo:

```powershell
npm install
npm test
npm run validate:manifest
```

Talk track:

> The engineer validates locally before pushing. This catches basic contract errors before the marketplace ever sees the submission.

### 5. Show GitHub Push Automation

Show the workflow file:

```text
.github/workflows/marketplace-onboarding.yml
```

Talk track:

> On PR, GitHub Actions runs the agent tests, validates the manifest, invokes the onboarding agent through `POST /api/onboarding/submissions`, and posts provenance plus scan evidence. After merge to `main`, the publish lane can approve the demo, open the onboarding gate, post eval evidence, sign deployment outputs, and activate the AgentCard in the marketplace registry.

For the live demo, either push to the GitHub repo or run the same submission helper locally:

```powershell
$env:MARKETPLACE_API_URL="http://localhost:7071"
$env:MARKETPLACE_TENANT_ID="contoso"
pwsh .\.github\scripts\submit-onboarding.ps1
pwsh .\.github\scripts\post-validation-evidence.ps1 -SubmissionId <submission-id>
$env:DEPLOYMENT_OUTPUTS_SECRET="local-demo-deployment-secret"
pwsh .\.github\scripts\publish-to-marketplace.ps1 -SubmissionId <submission-id>
```

Validated local result:

```json
{
	"status": "approval-pending",
	"currentStage": "approval-pending",
	"riskTier": "medium"
}
```

For a GitHub-hosted Actions run, set `MARKETPLACE_API_URL` to a deployed API endpoint or an HTTPS tunnel to the local Functions host. GitHub-hosted runners cannot call `localhost` on the developer machine directly.

To confirm the local marketplace and skill records are seeded, run:

```powershell
Invoke-RestMethod "http://localhost:7071/api/registry/skills?pageSize=5" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:7071/api/assets?type=Connector&pageSize=10" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:7071/api/assets?type=Agent&pageSize=20" | ConvertTo-Json -Depth 6
```

Expected records:

- `uap-onboarding` in the Skills Registry
- `uap-onboarding-vscode-skill` as a Skills-compatible marketplace asset
- `uap-onboarding-agent` as the Onboarding Agent asset

### 6. Show UI Submission Path

Open `http://127.0.0.1:3000/onboarding/new`.

Talk track:

> The same onboarding agent can also be invoked from the portal. This is useful for teams that want a guided manifest authoring experience or need to onboard a repo before CI is wired up.

Submit the sample manifest and show the returned submission status, stage, and risk tier.

### 7. Executive Value Summary

Close with measurable productivity improvements:

- fewer platform tickets for first-time onboarding
- repeatable GitHub push workflow for every agent team
- deterministic evidence capture for governance and audit
- faster path from domain code to marketplace discovery
- one workflow usable from VS Code, CLI, GitHub, or UI

## Expected Demo Result

The onboarding API returns a submission payload with a generated `submissionId`, a lifecycle `status`, current onboarding stage, and computed risk tier. For the demo manifest, the risk tier should be `medium` because it declares PII handling.
