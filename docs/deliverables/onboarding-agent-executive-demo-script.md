# Onboarding Agent Executive Demo Script

## Demo Goal

Show how AI Marketplace reduces domain-agent onboarding from a manual platform-engineering handoff into a governed self-service flow triggered from a normal GitHub push.

## Setup

- AI Marketplace web: `http://127.0.0.1:3000`
- Onboarding UI: `http://127.0.0.1:3000/onboarding/new`
- Local API: `http://localhost:7071/api`
- Demo repo: `demos/optum-uhg`
- GitHub repo: `https://github.com/rajesh-ms/optum-uhg`

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

### 3. Show The Demo Agent Repo

Open `demos/optum-uhg`.

Talk track:

> This looks like a normal domain-agent repository. It has code, tests, a Dockerfile, and a small `agent-manifest.json`. The marketplace-specific work is declarative and lives next to the code.

Show:

- `agent-manifest.json`
- `src/agent.js`
- `.github/workflows/marketplace-onboarding.yml`

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

> On push to `main`, GitHub Actions runs the agent tests, validates the manifest, and invokes the onboarding agent through `POST /api/onboarding/submissions` with source `github-app-webhook`.

For the live demo, either push to the GitHub repo or run the same submission helper locally:

```powershell
$env:MARKETPLACE_API_URL="http://localhost:7071"
$env:MARKETPLACE_TENANT_ID="contoso"
pwsh .\.github\scripts\submit-onboarding.ps1
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
