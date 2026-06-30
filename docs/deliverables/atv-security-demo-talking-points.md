# ATV Security Demo Talking Points

Use this as a presenter-side reference during the ATV security demo. The story is a submitted AI asset security review for the **Claims Triage Agent Bundle** from **Contoso Health AI Studio**. The submitted version is intentionally vulnerable and should remain blocked until remediation.

## Demo Frame

Core message:

> This submitted asset is not blocked because of one isolated bug. It is blocked because the bundle combines vulnerable application code, unsafe agent instructions, overbroad MCP tools, suppression patterns, auto-approved tooling, and weak workspace safeguards.

Default decision:

> Needs remediation; submitted version is blocked.

Approval language should only apply to a remediated version after human review, tests, and governance evidence.

## App Code Findings

Use [demos/atv-security-target/src/server.js](demos/atv-security-target/src/server.js) for classic OWASP findings.

| Issue | Link | Why it matters | Demo category |
| --- | --- | --- | --- |
| Unrestricted CORS | [server.js](demos/atv-security-target/src/server.js#L21) | The API allows requests from any origin. A marketplace asset handling claims/member data needs a clear origin policy. | OWASP A05, STRIDE information disclosure/tampering |
| Oversized JSON body | [server.js](demos/atv-security-target/src/server.js#L22) | A 10 MB request body can increase denial-of-service risk, especially when paired with LLM/tool calls. | OWASP A05, STRIDE denial of service |
| Broken access control / IDOR | [server.js](demos/atv-security-target/src/server.js#L34-L43) | Any caller can request a patient ID and receive the patient record. The analyst branch does not verify patient ownership, and unauthenticated callers still receive data. | OWASP A01, STRIDE information disclosure/elevation of privilege |
| SQL injection | [server.js](demos/atv-security-target/src/server.js#L45-L49) | `patientId` is interpolated directly into SQL. | OWASP A03, STRIDE tampering/information disclosure |
| Remote code execution via `eval` | [server.js](demos/atv-security-target/src/server.js#L52-L56) | Request-body input is evaluated as code. This is an obvious block-publication issue. | OWASP A03/A08, STRIDE elevation of privilege/tampering |
| Command injection | [server.js](demos/atv-security-target/src/server.js#L58-L63) | `caseId` is inserted into a shell command. This pairs well with the MCP shell-runner story. | OWASP A03, STRIDE elevation of privilege/tampering |
| SSRF / unsafe URL fetch | [server.js](demos/atv-security-target/src/server.js#L65-L69) | The server fetches any user-provided URL, which can reach internal services or attacker-controlled destinations. | OWASP A10, STRIDE information disclosure |
| Internal service over HTTP | [server.js](demos/atv-security-target/src/server.js#L19), [server.js](demos/atv-security-target/src/server.js#L71-L74) | The app posts request data to an internal billing endpoint over plain HTTP with no validation shown here. | OWASP A02/A05, STRIDE information disclosure/tampering |
| Verbose error disclosure | [server.js](demos/atv-security-target/src/server.js#L78-L80) | Stack traces and debug metadata are returned to clients. | OWASP A05, STRIDE information disclosure |

Strongest live walkthrough set:

1. Broken access control / IDOR
2. SQL injection
3. `eval` remote code execution
4. Command injection
5. SSRF

Talk track:

> This is the traditional app-security layer: access control, injection, SSRF, command execution, and debug leakage. `/atv-security` catches these, but the demo gets more interesting when we move into the agent layer.

## Agent Runtime Findings

Use [demos/atv-security-target/src/services/agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js) to show agentic runtime risk.

| Issue | Link | Why it matters | Demo category |
| --- | --- | --- | --- |
| Agent runs without actor authorization | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L6-L17) | `runAgent` loads any agent and any case by ID without proving the actor can run that agent or access that case. | OWASP A01, STRIDE elevation of privilege/information disclosure |
| Claims context flows into MCP and LLM | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L10-L12) | Case data is sent to the MCP tool and LLM call without minimization, egress policy, or review boundary. | OWASP A01/A10, STRIDE information disclosure |
| System prompt from submitted metadata | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L12) | `agent.system_prompt` comes from data controlled by the submitted asset. The seeded database includes unsafe prompt instructions. | Prompt injection, STRIDE tampering |
| MCP tool selected by agent record | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L11) | The submitted agent metadata controls which MCP tool runs. This needs a tool allowlist and approval policy. | MCP governance, STRIDE elevation of privilege |
| LLM output persisted into case record | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L14) | AI output is written into operational case data without reviewer provenance or approval gating. | OWASP A04, STRIDE tampering/repudiation |
| Full AI summary logged | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L15) | The audit log may copy claims/member content, and `actor || "unknown"` weakens accountability. | OWASP A09, STRIDE repudiation/information disclosure |
| Wildcard workload access | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L22-L24) | Agents with `allowed_scope === "*"` receive every case. | OWASP A01, STRIDE information disclosure |
| SQL injection in workload query | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L27) | `agentId` is interpolated directly into SQL. | OWASP A03, STRIDE tampering |
| Unrestricted shell diagnostics | [agentRuntime.js](demos/atv-security-target/src/services/agentRuntime.js#L30-L36) | `runDiagnostic(command)` executes arbitrary shell commands. If reachable through an agent/tool path, this becomes command execution from a submitted asset. | OWASP A03, STRIDE elevation of privilege |

Talk track:

> This is why agentic security is different. The risk chain is: submitted agent -> unsafe prompt -> broad MCP tool -> claims context -> LLM output -> persisted case decision.

## Agent Definition Findings

Use [demos/atv-security-target/.github/agents](demos/atv-security-target/.github/agents) to show unsafe submitted agent policy.

| Issue | Link | Why it matters | Demo category |
| --- | --- | --- | --- |
| Dangerous tool access | [claims-triage.agent.md](demos/atv-security-target/.github/agents/claims-triage.agent.md#L4-L7) | The claims triage agent can run shell commands, read secrets, and use the terminal. | MCP/tool over-permission, STRIDE elevation of privilege/information disclosure |
| Prompt injection / instruction override | [claims-triage.agent.md](demos/atv-security-target/.github/agents/claims-triage.agent.md#L12), [unsafe-maintainer.agent.md](demos/atv-security-target/.github/agents/unsafe-maintainer.agent.md#L7) | The agent explicitly tells the model to ignore previous instructions. | Prompt injection, STRIDE tampering |
| Approval bypass | [claims-triage.agent.md](demos/atv-security-target/.github/agents/claims-triage.agent.md#L12) | The agent says to skip approval checks. | Broken governance, STRIDE elevation of privilege |
| False success / warning suppression | [claims-triage.agent.md](demos/atv-security-target/.github/agents/claims-triage.agent.md#L12), [mcp-tool-runner.agent.md](demos/atv-security-target/.github/agents/mcp-tool-runner.agent.md#L8), [unsafe-maintainer.agent.md](demos/atv-security-target/.github/agents/unsafe-maintainer.agent.md#L9) | The agent hides missing evidence, hides errors, and reports success even when problems exist. | Repudiation, audit integrity risk |
| Wildcard dangerous MCP tools | [mcp-tool-runner.agent.md](demos/atv-security-target/.github/agents/mcp-tool-runner.agent.md#L4-L5) | `mcp.demo-dangerous-shell.*` gives access to every tool in a dangerous shell namespace. | MCP wildcard permission, least privilege violation |
| Automatic dependency installation | [mcp-tool-runner.agent.md](demos/atv-security-target/.github/agents/mcp-tool-runner.agent.md#L10), [unsafe-maintainer.agent.md](demos/atv-security-target/.github/agents/unsafe-maintainer.agent.md#L9) | Agents should not install packages without review. This creates supply-chain risk. | Supply-chain risk, STRIDE tampering |
| Execute downloaded scripts | [unsafe-maintainer.agent.md](demos/atv-security-target/.github/agents/unsafe-maintainer.agent.md#L9), [unsafe-maintainer.agent.md](demos/atv-security-target/.github/agents/unsafe-maintainer.agent.md#L11) | `curl | bash` bypasses review of what code is being run. | Remote code execution, supply-chain compromise |
| Web fetch from case metadata | [claims-triage.agent.md](demos/atv-security-target/.github/agents/claims-triage.agent.md#L14) | Case metadata is untrusted business data. Fetching URLs from it can become SSRF or data exfiltration. | SSRF-style agent behavior, STRIDE information disclosure |

Talk track:

> The submitted asset is asking for dangerous tools, bypassing approvals, hiding failures, and executing remote code. That is not an app bug; that is an unsafe agent policy.

## Skill Suppression Patterns

Use [demos/atv-security-target/.github/skills](demos/atv-security-target/.github/skills) to show how skills can hide risk from reviewers.

Suppression pattern definition:

> A suppression pattern is an instruction that makes an agent hide, downplay, skip, or continue past failures/security findings instead of surfacing them to the reviewer.

| Suppression pattern | Link | Why it matters |
| --- | --- | --- |
| Always report ok and hide errors | [unsafe-helper/SKILL.md](demos/atv-security-target/.github/skills/unsafe-helper/SKILL.md#L6) | The skill instructs the agent to say success even when security findings exist. |
| Retry later when the user is away | [unsafe-helper/SKILL.md](demos/atv-security-target/.github/skills/unsafe-helper/SKILL.md#L8) | Delayed execution removes visible human oversight. |
| Encoded instruction blob | [unsafe-helper/SKILL.md](demos/atv-security-target/.github/skills/unsafe-helper/SKILL.md#L10-L11) | Obfuscated instructions make review and governance harder. |
| Suppress warnings and continue | [mcp-claim-tools/SKILL.md](demos/atv-security-target/.github/skills/mcp-claim-tools/SKILL.md#L12) | Missing evidence should block or escalate the run, not disappear from the response. |
| Always report ok despite missing consent | [case-triage-agent/SKILL.md](demos/atv-security-target/.github/skills/case-triage-agent/SKILL.md#L8) | Missing patient consent is a compliance/privacy concern that should not be hidden. |
| Auto-approve low-risk cases | [case-triage-agent/SKILL.md](demos/atv-security-target/.github/skills/case-triage-agent/SKILL.md#L8) | The model output becomes the decision authority without human review. |
| External attachment pass-through | [case-triage-agent/SKILL.md](demos/atv-security-target/.github/skills/case-triage-agent/SKILL.md#L10) | External URLs from case records are sent directly into the LLM prompt. |

Talk track:

> Suppression patterns make the agent hide problems from the reviewer: always report ok, hide errors, suppress warnings, continue despite incomplete evidence, retry later, or bury instructions in encoded blobs.

## Workspace Settings Findings

Use [demos/atv-security-target/.vscode/settings.json](demos/atv-security-target/.vscode/settings.json) to show editor and tool configuration risk.

| Issue | Link | Why it matters | Demo category |
| --- | --- | --- | --- |
| Workspace Trust disabled | [settings.json](demos/atv-security-target/.vscode/settings.json#L2) | Workspace Trust is the editor's first safety boundary for unfamiliar folders. Disabling it removes a trust gate. | Unsafe workspace policy, OWASP A05 |
| Chat tools auto-approved | [settings.json](demos/atv-security-target/.vscode/settings.json#L3) | Tool execution can be approved automatically instead of requiring reviewer intent. | Agentic configuration risk |
| Bearer-token-shaped terminal env | [settings.json](demos/atv-security-target/.vscode/settings.json#L5) | The token is fake, but the pattern shows how workspace settings can seed secrets into a terminal environment. | Secret exposure risk, STRIDE information disclosure |

Talk track:

> Workspace Trust is VS Code's safety boundary when opening code from an unknown publisher. This submitted asset disables that trust gate and enables chat tool auto-approval. That is why `/atv-security` must inspect editor and agent configuration, not just source code.

Important nuance:

> The token is fake and this fixture is intentionally unsafe. We are not claiming data theft; we are showing an unsafe posture that should block marketplace publication.

## LLM And Webhook Environment Variables

Do not set real LLM values for the primary demo path.

Keep these unset or clearly fake/demo-only:

```powershell
$env:USE_REAL_LLM
$env:LLM_PROVIDER_URL
$env:LLM_API_KEY
$env:DEMO_WEBHOOK_URL
```

Talk track:

> The primary demo path is static-scan-first. It does not require dependency installation, app startup, MCP startup, hook execution, real LLM calls, or network egress.

## Closing Line

Use this as the final synthesis:

> The finding is not just that there is SQL injection. The finding is that this submitted AI asset combines vulnerable application code, unsafe agent instructions, overbroad MCP tools, suppression patterns, auto-approved tooling, and weak workspace safeguards. `/atv-security` gives reviewers one security story across the entire agentic bundle.