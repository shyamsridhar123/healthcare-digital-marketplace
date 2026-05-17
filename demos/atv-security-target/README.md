# ATV Security Target Demo: Submitted AI Asset Security Review

This folder is an intentionally vulnerable submitted AI asset security review target for demonstrating `/atv-security`. The visible story is a publisher trying to publish the **Claims Triage Agent Bundle** to an enterprise AI Asset Marketplace. The claims data remains the risky domain payload inside the submitted bundle.

The target includes a browser frontend, Express backend, SQLite persistence, an LLM gateway, agent runtime, MCP-style tools, local skills, hooks, and VS Code settings. It is a Local-only demo fixture, not part of the production AI Marketplace app, and must not be deployed. The Seeded fallback report is available when live scanner output is slow or incomplete.

## Review Packet

| Field | Value |
| --- | --- |
| Demo frame | Submitted AI asset security review |
| Asset | Claims Triage Agent Bundle |
| Publisher | Contoso Health AI Studio |
| Requested action | Publish to enterprise AI Asset Marketplace |
| Submitted version | 1.4.0-submitted |
| Remediated version | 1.4.1-remediated |
| Default review state | Needs remediation; submitted version is blocked |
| Fallback evidence | `docs/security/fixtures/atv-security-target-seeded-fallback-report.md` |

## What The Submitted Bundle Contains

- A marketplace review packet in `src/demoAssetReviewFixture.js`.
- A claims case review payload served from `public/` and `src/routes/cases.js`.
- Users, patients, cases, agents, skills, and audit events seeded into SQLite.
- Case agents that call a demo LLM gateway and MCP-style tools.
- MCP endpoints for case search, web fetch, and shell diagnostics.
- Local `.github/agents`, `.github/skills`, hooks, MCP config, and `.vscode/settings.json` so `/atv-security` can inspect the agentic attack surface.

## Primary Demo Safety Posture

The one-hour demo path is static-scan-first. It does not require dependency installation, app startup, MCP server startup, hook execution, real LLM calls, or network egress.

Before rehearsal, run:

```powershell
cd demos/atv-security-target
npm run check
npm run verify:demo
```

The verifier is read-only. It checks fixture labels, fallback evidence, synthetic data markers, scanner evidence, and production-deployment isolation without starting the server.

## How to Scan It

From Copilot Chat in the repository root, run a source-focused scan:

```text
/atv-security demos/atv-security-target
```

For the full demo, open `demos/atv-security-target` as the workspace root in VS Code and run:

```text
/atv-security
```

Opening the demo folder as the workspace root lets `/atv-security` discover the demo-local `.github/` and `.vscode/` agentic configuration in addition to the application source.

## What It Should Find

| Surface | Example files | Expected categories |
| --- | --- | --- |
| Agentic config | `.github/copilot-mcp-config.json` | Unpinned `npx -y`, wildcard tools, `autoApprove`, fake demo secrets |
| Hooks | `.github/hooks/scripts/post-tool-use.js` | Network exfiltration shape, suppressed errors |
| Agents and skills | `.github/agents/*.agent.md`, `.github/skills/*/SKILL.md` | Prompt injection, output suppression, broad tool scopes, delayed execution, base64-like instruction blob |
| VS Code settings | `.vscode/settings.json` | Workspace trust disabled, tool auto-approval enabled |
| OWASP A01 | `src/routes/auth.js`, `src/routes/admin.js`, `src/routes/cases.js`, `src/server.js` | Hardcoded admin role checks, ad-hoc auth, IDOR-style patient access |
| OWASP A02 | `src/db.js`, `src/services/llmGateway.js`, `src/server.js` | MD5 password hashing, hardcoded password, bearer token fixture, non-localhost HTTP endpoint |
| OWASP A03 | `src/server.js`, `src/mcp/tools.js`, `src/routes/intake.js`, `public/app.js` | SQL injection, `eval`, command injection, unsafe HTML rendering |
| OWASP A05 | `src/server.js` | Debug mode, unrestricted CORS, verbose stack traces |
| OWASP A07 | `src/routes/auth.js` | 365-day JWT and long session cookie |
| OWASP A08 | `src/unsafe-deserialize.js`, `src/routes/intake.js`, `public/index.html` | Unsafe deserialization-like execution and third-party script without SRI |
| OWASP A10 | `src/server.js`, `src/mcp/tools.js`, `src/services/llmGateway.js` | SSRF via user-controlled URL proxy and internal LLM gateway calls |
| STRIDE | Full source | Spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege gaps |

## Optional Local Run

The app can be run if dependencies are installed, but running it is not required for `/atv-security` static analysis or the primary demo path.

```powershell
cd demos/atv-security-target
npm install
npm start
```

The app listens on `http://localhost:4050`.

Use these demo credentials in the UI:

| User | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `Password123!` | admin |
| `analyst@example.com` | `Password123!` | analyst |

By default the LLM gateway returns a mock response. `USE_REAL_LLM`, `LLM_PROVIDER_URL`, `LLM_API_KEY`, and webhook-style variables must be unset or clearly demo-only before the primary path starts.

## Safety Notes

- All credentials, tokens, names, member IDs, and endpoints in this folder are fake demo values.
- The vulnerabilities are deliberate so `/atv-security` has clear findings to report.
- Workbench approvals are mock governance states and do not publish anything.
- Keep fixes out of this folder unless the demo goal changes from detection to remediation.