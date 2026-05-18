# /atv-security Threat Coverage

## Overview

`/atv-security` is ATV's unified security auditor. It covers two major attack surfaces:

1. **Agentic configuration security**: Copilot instructions, skills, agents, MCP servers, hooks, setup steps, and VS Code settings.
2. **Application security**: OWASP Top 10 source review plus STRIDE threat modeling.

The latest ATV version installed in this repo is `2.6.3`. The command also absorbs the old `/cso` workflow, so `/cso`-style security and threat-model language routes to `/atv-security`.

## Scan Modes

| Command | Coverage |
| --- | --- |
| `/atv-security` | Full scan: agentic config, OWASP, and STRIDE |
| `/atv-security config` | Agentic config only |
| `/atv-security owasp` | OWASP application source scan only |
| `/atv-security stride` | STRIDE threat model only |
| `/atv-security <path>` | Path-scoped OWASP and STRIDE scan |
| `/atv-security fix` | Report plus safe fixes for auto-fixable config findings |

## Agentic Configuration Coverage

| Category | Threats covered | Example findings |
| --- | --- | --- |
| Secrets | Exposed API keys, bearer tokens, GitHub tokens, AWS keys, database URLs | `sk-proj-*`, `ghp_*`, `AKIA*`, `Bearer ...`, `postgres://...` |
| MCP Servers | Overbroad tool access, auto-approval, unpinned package execution, secrets in env | `tools: ["*"]`, `autoApprove`, `npx -y` without pinned package version |
| Hooks | Remote execution, data exfiltration shapes, error suppression, privileged containers, credential access | `curl -X POST`, `curl | bash`, `2>/dev/null`, `|| true`, Docker privileged flags |
| Agents and Skills | Prompt injection, hidden instructions, output suppression, delayed execution, oversized prompts | `ignore previous instructions`, `always report ok`, `hide errors`, zero-width characters, long base64-like blobs |
| Agent Access Control | Unrestricted tool access, missing tool scoping, unsafe agent escalation | Broad `allowedTools`, shell access without a narrow purpose, sub-agent escalation |
| Permissions | Weak workspace/editor controls and unsafe extension posture | Workspace trust disabled, chat tool auto-approval enabled, questionable extension recommendations |
| Setup Steps | Unsafe bootstrap commands and privileged operations | Remote script execution, `sudo` without justification, `chmod 777` |

## OWASP Top 10 Coverage

| OWASP category | What `/atv-security` looks for | Example finding |
| --- | --- | --- |
| A01 Broken Access Control | Missing authorization, hardcoded role checks, IDOR, state-changing endpoints without auth | User can access another patient or admin data without ownership check |
| A02 Cryptographic Failures | Weak hashes, hardcoded passwords, non-HTTPS external calls, sensitive data protection gaps | MD5 password hash or hardcoded password literal |
| A03 Injection | SQL injection, command injection, code injection, unsafe HTML, NoSQL injection | String-concatenated SQL, `eval`, `Function`, `child_process.exec`, `innerHTML` |
| A04 Insecure Design | Missing rate limits, account enumeration, business logic flaws | Login reveals whether an email exists |
| A05 Security Misconfiguration | Debug mode, open CORS, wildcard hosts, verbose stack traces, missing security headers | `cors()` with no origin restriction |
| A06 Vulnerable and Outdated Components | Dependency manifests and risky/stale packages | `package.json` requires audit review or has vulnerable dependency versions |
| A07 Identification and Authentication Failures | Long-lived tokens, weak session controls, weak bcrypt rounds, missing brute-force protection | JWT expiry set to `365d` |
| A08 Software and Data Integrity Failures | Unsafe deserialization, unsigned updates, third-party scripts without SRI | `deserialize`, `Function(...)`, CDN script without `integrity` |
| A09 Security Logging and Monitoring Failures | Missing auth/access-denied/input-validation logging, log injection, no alerting | Approval or auth failure path has no audit event |
| A10 Server-Side Request Forgery | Server-side requests using user-controlled URLs without allowlists | `axios.get(targetUrl)` or `fetch(userInput)` |

## STRIDE Threat Model Coverage

| STRIDE threat | Question answered | Common risk examples |
| --- | --- | --- |
| Spoofing | Can an attacker impersonate a user, service, agent, or tool? | Weak auth, unsigned agent/tool identity, trusted caller-supplied actor IDs |
| Tampering | Can data, prompts, workflows, or tool outputs be modified? | Missing integrity checks, mutable audit records, unverified MCP results |
| Repudiation | Can users or agents deny actions because audit evidence is weak? | Missing audit logs, no correlation IDs, no signed event trail |
| Information Disclosure | Can sensitive data leak through APIs, logs, prompts, errors, or tools? | Stack traces, exposed tokens, prompt context leakage, overbroad MCP reads |
| Denial of Service | Can endpoints, agents, tools, or LLM calls be exhausted? | No rate limits, expensive unauthenticated endpoints, unbounded prompts |
| Elevation of Privilege | Can a low-privilege user, agent, or tool gain higher access? | Weak RBAC, broad `allowedTools`, admin endpoints without server-side enforcement |

## Demo Target Coverage

The repo includes a full-stack target app for demonstrating this coverage:

```text
demos/atv-security-target
```

It includes:

- Express backend APIs
- SQLite persistence
- Browser frontend
- LLM gateway
- Agent runtime
- MCP-style tools
- Local `.github/agents` and `.github/skills`
- Local MCP config, hook config, and VS Code settings

Run a path-scoped scan from the main repo:

```text
/atv-security demos/atv-security-target
```

For the full config plus source demo, open `demos/atv-security-target` as the VS Code workspace root and run:

```text
/atv-security
```

## Report Output

A normal `/atv-security` report includes:

- Overall grade
- Config grade
- OWASP grade
- STRIDE posture
- Config category breakdown
- Findings grouped by severity
- Evidence and remediation guidance
- STRIDE threat matrix
- Summary counts for files scanned, findings, unmitigated threats, and auto-fixable issues

Reports are persisted under:

```text
docs/security/YYYY-MM-DD-security-report.md
```

The report keeps both `/atv-security` and legacy `/cso` marker blocks for compatibility.
