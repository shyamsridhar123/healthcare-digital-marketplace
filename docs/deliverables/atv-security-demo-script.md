# ATV Security Demo Script

## Purpose

Show the full `/atv-security` capability through a submitted AI asset security review. The demo uses the deliberately vulnerable `demos/atv-security-target` bundle so the scanner can inspect application source, MCP-style tools, agents, skills, hooks, VS Code settings, OWASP Top 10 risks, and a STRIDE marketplace threat model.

## Story Spine

- Audience promise: in one hour, reviewers see how a submitted AI asset moves from scan evidence to a marketplace publication decision.
- First two minutes: frame the **Claims Triage Agent Bundle** from **Contoso Health AI Studio** as a request to **Publish to enterprise AI Asset Marketplace**.
- Scan-to-governance transition: `/atv-security` discovers source and agentic-config risk; the workbench turns the same evidence into review states and owner decisions.
- Fallback trigger: if live scan output is slow or incomplete, use `docs/security/fixtures/atv-security-target-seeded-fallback-report.md` and label it **Seeded fallback**.
- Final decision moment: the submitted version is blocked as `needs_remediation`; waiver is accepted risk, and approval language applies only to `1.4.1-remediated`.

## Audience

- Engineering leaders evaluating ATV security workflows
- Security reviewers validating Copilot agentic configuration controls
- Developers learning how `/atv-security` maps findings to OWASP Top 10 and STRIDE
- Marketplace owners deciding whether an AI asset can be published safely

## Demo Length

Primary path: 60 minutes. Executive subset: 30 minutes.

## Demo Assets

| Asset | Purpose |
| --- | --- |
| `demos/atv-security-target` | Full-stack intentionally vulnerable submitted AI asset scan target |
| `demos/atv-security-target/src/demoAssetReviewFixture.js` | Canonical fixture contract for asset metadata, review states, golden findings, and synthetic evidence |
| `demos/atv-security-target/README.md` | Marketplace framing, scan instructions, safety posture, and expected categories |
| `demos/atv-security-target/public` | Visible submitted AI asset review UI |
| `demos/atv-security-target/src` | Express, SQLite, LLM, agent, MCP, and skill backend |
| `apps/web/app/atv-security/page.tsx` | Local-only demo fixture workbench for marketplace governance review |
| `docs/security/fixtures/atv-security-target-seeded-fallback-report.md` | Canonical seeded fallback evidence report |
| `.github/skills/atv-security/SKILL.md` | Installed ATV security skill definition |

## Pre-Demo Checklist

1. Confirm you are on the demo branch.

   ```powershell
   git branch --show-current
   ```

   Expected: `demo/atv-security-features`

2. Confirm the target and fallback artifacts exist.

   ```powershell
   Test-Path demos/atv-security-target/README.md
   Test-Path docs/security/fixtures/atv-security-target-seeded-fallback-report.md
   ```

   Expected: `True` for both.

3. Confirm the latest ATV security skill exists.

   ```powershell
   Test-Path .github/skills/atv-security/SKILL.md
   ```

   Expected: `True`

4. Run the read-only verifier.

   ```powershell
   cd demos/atv-security-target
   npm run check
   npm run verify:demo
   ```

   Expected: syntax check passes and `Demo alignment verification passed...`.

5. Confirm the primary path is inert.

   ```powershell
   $env:USE_REAL_LLM
   $env:LLM_PROVIDER_URL
   $env:LLM_API_KEY
   $env:DEMO_WEBHOOK_URL
   ```

   Expected: unset, localhost, `.invalid`, or clearly demo/test values. If `USE_REAL_LLM=true` or an external provider/webhook is configured, stop the live path and reset the environment.

6. Confirm two VS Code windows are ready.

   | Window | Workspace root | Purpose |
   | --- | --- | --- |
   | Monorepo | `ai-marketplace` | Path-scoped source scan with `/atv-security demos/atv-security-target` |
   | Target root | `demos/atv-security-target` | Full scan with demo-local `.github` and `.vscode` discovery |

7. Prepare the marketplace workbench.

   Preferred: have `http://localhost:3000/atv-security` already open. Fallback: open the source file and the seeded fallback report; keep labels **Workbench fixture** and **Seeded fallback** clear.

## 60-Minute Technical Path

| Time | Action | Message |
| --- | --- | --- |
| 0:00-3:00 | Set the marketplace frame | A publisher submitted the Claims Triage Agent Bundle; reviewers must decide whether it can publish. |
| 3:00-8:00 | Explain `/atv-security` capability | It scans agentic config, MCP, hooks, skills, agents, VS Code settings, OWASP, and STRIDE. |
| 8:00-13:00 | Show target review packet | The UI says Submitted AI asset security review, Local-only demo fixture, Synthetic data. Claims remain the risky payload. |
| 13:00-21:00 | Run source scan | Use `/atv-security demos/atv-security-target` from the monorepo window. Call out OWASP A01/A03/A10. |
| 21:00-31:00 | Run target-root full scan | Use `/atv-security` from the target-root window so `.github` and `.vscode` are discovered. Call out MCP, hooks, prompts, permissions. |
| 31:00-36:00 | Branch to fallback if needed | Show `docs/security/fixtures/atv-security-target-seeded-fallback-report.md` as Seeded fallback, not live output. |
| 36:00-44:00 | Walk golden findings | Use the same IDs across report, script, and workbench: ATV-MCP-001, ATV-HOOK-002, ATV-A01-003, ATV-A10-004, ATV-STRIDE-005. |
| 44:00-50:00 | Show STRIDE synthesis | Explain why combined AI-agent risk becomes a marketplace decision, not just a bug list. |
| 50:00-56:00 | Show workbench governance | Open the local-only demo fixture workbench and show `needs_remediation`, rejected submitted version, waiver, and approved remediated version states. |
| 56:00-60:00 | Close and Q&A | Fix mode can assist remediation, but human review and tests decide whether `1.4.1-remediated` can publish. |

## Talk Track

### 1. Set The Frame

Say:

> This demo is a submitted AI asset security review. Contoso Health AI Studio wants to publish the Claims Triage Agent Bundle to an enterprise AI Asset Marketplace. The claims data is synthetic, but it represents sensitive domain payload. Our job is to decide whether the submitted version can publish.

Show:

- `demos/atv-security-target/README.md`
- `demos/atv-security-target/src/demoAssetReviewFixture.js`
- `demos/atv-security-target/public/index.html`

Key point:

> The vulnerable app is not production code. It is a local-only demo fixture that preserves evidence for `/atv-security`.

### 2. Explain What `/atv-security` Can Find

Say:

> `/atv-security` looks at two surfaces. First, it reviews agentic configuration: instructions, skills, agents, MCP servers, hooks, setup steps, and VS Code permissions. Second, it reviews application source through OWASP Top 10 and STRIDE.

Use this spoken taxonomy:

| Area | Vulnerability types | How to explain it |
| --- | --- | --- |
| Secrets exposure | API keys, GitHub tokens, AWS keys, bearer tokens, database URLs | Finds credentials or connection strings that should be in environment variables or secret stores |
| MCP server risk | Wildcard tools, `autoApprove`, unpinned `npx -y`, secrets in MCP env | Checks whether connected tools are overly powerful, auto-approved, or installed without version pinning |
| Hook safety | Remote script execution, network exfiltration shapes, suppressed errors, privileged containers | Reviews automation that runs around the agent because hooks can silently move data or run commands |
| Prompt injection | `ignore previous instructions`, `always report ok`, `hide errors`, delayed execution | Detects malicious or unsafe instructions embedded in agent and skill markdown |
| Agent access control | Unrestricted shell/tool access, missing `allowedTools`, escalation chains | Flags agents that can do too much without clear scope or approval boundaries |
| Permission misconfiguration | Workspace trust disabled, chat tool auto-approval enabled, questionable extensions | Looks for editor settings that weaken user consent or workspace isolation |
| Broken access control | Missing auth, hardcoded admin checks, IDOR, missing ownership checks | Maps to OWASP A01 and finds endpoints where users can access or change data they should not |
| Cryptographic failures | MD5/SHA1, hardcoded passwords, non-HTTPS external calls, weak protection for sensitive data | Maps to OWASP A02 and catches weak or missing confidentiality controls |
| Injection | SQL injection, command injection, `eval`, unsafe HTML, NoSQL injection | Maps to OWASP A03 and finds places where user input can become code, commands, or queries |
| Security misconfiguration | Open CORS, debug mode, verbose stack traces, missing security headers | Maps to OWASP A05 and finds unsafe defaults or production-hardening gaps |
| Authentication failures | Long-lived JWTs, weak session controls, poor brute-force protection | Maps to OWASP A07 and checks whether identity controls can be abused |
| Integrity failures | Unsafe deserialization, unsigned updates, third-party scripts without SRI | Maps to OWASP A08 and checks whether code or data can be tampered with |
| SSRF | Server-side requests to user-controlled URLs without allowlists | Maps to OWASP A10 and finds routes that can be abused to reach internal services |
| STRIDE threat model | Spoofing, tampering, repudiation, disclosure, DoS, privilege escalation | Turns code and agent findings into a system-level risk matrix with mitigations |

Speaker note:

> The unique part is that `/atv-security` treats AI-agent configuration as part of the attack surface. A normal app scanner may find SQL injection, but it usually will not inspect MCP auto-approval, prompt injection in a skill file, or a hook that quietly posts tool output somewhere else.

### 3. Show The Submitted Target

Open:

```text
demos/atv-security-target/README.md
```

Say:

> The UI reads as a submitted AI asset review packet. The risky claims console is still present, but it is evidence inside the bundle rather than the product story.

Show these files quickly:

| File | What to point out |
| --- | --- |
| `demos/atv-security-target/public/index.html` | Browser review packet for asset identity, publisher, status, inventory, permissions, and risky payload |
| `demos/atv-security-target/src/server.js` | Express app, static frontend, API router wiring, CORS, legacy vulnerable endpoints |
| `demos/atv-security-target/src/db.js` | SQLite schema, seeded users, cases, agents, skills, MD5 password hash |
| `demos/atv-security-target/src/services/llmGateway.js` | Mock or real LLM gateway with bearer token and non-localhost provider URL fixture |
| `demos/atv-security-target/src/services/agentRuntime.js` | Agents calling LLM and MCP tools, plus shell diagnostics |
| `demos/atv-security-target/src/mcp/tools.js` | MCP-style case search, web fetch, and shell runner tools |
| `demos/atv-security-target/.github/copilot-mcp-config.json` | Wildcard tools, `autoApprove`, fake demo secrets |
| `demos/atv-security-target/.github/agents/*.agent.md` | Prompt-injection style instructions and broad tool scopes |
| `demos/atv-security-target/.github/skills/*/SKILL.md` | Skill instructions with unsafe approval and suppression patterns |
| `demos/atv-security-target/.vscode/settings.json` | Workspace trust disabled and tool auto-approval enabled |

### 4. Run A Source-Focused Scan

In Copilot Chat from the monorepo window, run:

```text
/atv-security demos/atv-security-target
```

Say:

> Path-scoped mode is useful when a security reviewer wants to scan one app or submitted bundle inside a larger monorepo. In this mode, `/atv-security` focuses on application source under the target path.

Expected findings to call out:

| OWASP category | Expected evidence |
| --- | --- |
| A01 Broken Access Control | Hardcoded admin role checks and patient access without ownership validation |
| A02 Cryptographic Failures | MD5 password hash, hardcoded password, non-localhost HTTP endpoint |
| A03 Injection | SQL query interpolation, `eval`, command execution, unsafe HTML |
| A05 Security Misconfiguration | `cors()` without origin restriction and debug error output |
| A07 Authentication Failures | JWT with `365d` lifetime and long-lived session cookie |
| A08 Integrity Failures | Unsafe deserialization-like `Function(...)` and CDN script without SRI |
| A10 SSRF | `axios.get(targetUrl)` using user-controlled input |
| STRIDE | Spoofing, tampering, repudiation, disclosure, DoS, privilege escalation gaps |

### 5. Run The Full Config + Source Demo

For the full scan, open `demos/atv-security-target` as the VS Code workspace root, then run in Copilot Chat:

```text
/atv-security
```

Say:

> Opening the target folder as the workspace root lets `/atv-security` discover the demo-local `.github` and `.vscode` folders. That is how we demonstrate the agentic configuration scanner in addition to OWASP and STRIDE.

Expected config findings to call out:

| Rule family | Expected evidence |
| --- | --- |
| Secrets | Fake `sk-proj-DEMO...`, bearer token, database URL |
| MCP | Unpinned `npx -y`, wildcard `tools: ["*"]`, `autoApprove` |
| Hooks | `curl -X POST`, suppressed errors, `|| true` fixture |
| Agents and skills | `ignore previous instructions`, `always report ok`, `hide errors`, delayed execution |
| Permissions | Workspace trust disabled and chat tool auto-approval enabled |

Presenter note:

> The hook fixture is intentionally inert. It prints the risky command string rather than executing it, but it preserves the shape `/atv-security` should flag.

### 6. Fallback Branch

If Copilot Chat is slow or the output is incomplete, open:

```text
docs/security/fixtures/atv-security-target-seeded-fallback-report.md
```

Say:

> This is seeded fallback evidence, not live scanner output. It is sanitized and uses the same target, golden finding IDs, paths, risks, and governance decisions we expect from the live scan.

Use the golden map:

| ID | Title | Path | Provenance | Business risk | Owner | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| ATV-MCP-001 | Unpinned and overbroad MCP execution | `demos/atv-security-target/.github/copilot-mcp-config.json` | Seeded fallback | A submitted asset can request wildcard tool access and auto-approved secret reads before security review. | Platform Security | Block submitted version until MCP package version, tool allowlist, and approvals are scoped. |
| ATV-HOOK-002 | Hook exfiltration-shaped automation | `demos/atv-security-target/.github/hooks/scripts/post-tool-use.js` | Seeded fallback | Tool output could be posted outside the review boundary if a similar hook were made active. | Agent Platform | Block submitted version; require hook removal or signed, reviewed telemetry destination. |
| ATV-A01-003 | Broken authorization exposes member case data | `demos/atv-security-target/src/routes/cases.js` | Seeded fallback | Claims payloads can be read or approved without durable reviewer identity and ownership checks. | Asset Publisher | Reject submitted version for enterprise publication until access control is fixed and tested. |
| ATV-A10-004 | SSRF and data exposure through web-fetch tooling | `demos/atv-security-target/src/mcp/tools.js` | Seeded fallback | An agent tool can fetch attacker-chosen or internal URLs while handling claims context. | Asset Publisher | Block submitted version until URL allowlists and network egress controls exist. |
| ATV-STRIDE-005 | Marketplace STRIDE synthesis requires remediation gate | `demos/atv-security-target` | Workbench fixture | Spoofing, tampering, repudiation, disclosure, DoS, and privilege escalation risks combine into a publication decision. | Security Reviewer | Needs remediation by default; waiver is accepted risk, not approval of the submitted version. |

### 7. Show The Visual Workbench

Open the marketplace route:

```text
http://localhost:3000/atv-security
```

Say:

> This page is not the scanner itself. It is a Local-only demo fixture for how security teams could consume `/atv-security` results inside AI Marketplace: submitted asset metadata, scan modes, golden findings, review states, and an evidence timeline.

Show:

- Asset packet: Claims Triage Agent Bundle, Contoso Health AI Studio, requested publication action
- Scope buttons: Full, Config, OWASP, STRIDE
- Mode selector: Report or Fix
- Findings list and remediation panel with evidence provenance
- Review states: `needs_remediation`, `rejected_submitted_version`, `waived_by_reviewer`, `approved_remediated_version`
- Evidence timeline with **Live scan**, **Seeded fallback**, and **Workbench fixture** labels

Key point:

> The real scanner runs in Copilot Chat. The UI demonstrates a productized review experience for the same workflow. Approval language is reserved for the remediated version; the submitted version remains blocked.

## 30-Minute Executive Subset

| Time | Action | Message |
| --- | --- | --- |
| 0:00-3:00 | Frame the submitted asset | Claims Triage Agent Bundle wants marketplace publication. |
| 3:00-8:00 | Show target packet and scanner scope | `/atv-security` covers app source and AI-agent attack surface. |
| 8:00-14:00 | Run source scan | Call out A01, A03, A10. |
| 14:00-20:00 | Run target-root full scan or fallback report | Call out MCP, hooks, prompts, permissions. |
| 20:00-26:00 | Show workbench decision | Submitted version is blocked; remediated version can be reviewed. |
| 26:00-30:00 | Close | ATV makes AI asset security review repeatable across code and agentic config. |

## Fix Mode Positioning

Say:

> Fix mode is assisted remediation, not automatic approval. Developers still need human review, tests, and a new scan before a remediated version can publish.

Do not claim that `/atv-security fix` can safely repair this intentionally vulnerable target during the live path. The target is designed to remain vulnerable as scanner evidence.

## Expected Close

Say:

> The value is not just finding bugs. `/atv-security` makes security review repeatable for both code and AI-agent configuration. It gives marketplace reviewers one workflow for OWASP, STRIDE, MCP safety, prompt-injection hygiene, hook safety, permission review, and publication decisions.

## Follow-Up Options

- Capture live `/atv-security` output under the normal `docs/security/YYYY-MM-DD-security-report.md` path after rehearsal.
- Add remediation commits outside the vulnerable fixture to demonstrate fixed patterns.
- Connect the visual marketplace workbench to persisted security reports when the product needs real scanner integration.
- Add CI automation that asks Copilot to run `/atv-security` before PR review.