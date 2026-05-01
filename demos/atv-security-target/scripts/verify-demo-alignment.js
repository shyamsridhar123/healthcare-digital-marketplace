const fs = require("fs")
const path = require("path")

const fixture = require("../src/demoAssetReviewFixture")

const demoRoot = path.resolve(__dirname, "..")
const repoRoot = path.resolve(demoRoot, "..", "..")
const failures = []

function repoPath(...segments) {
  return path.join(repoRoot, ...segments)
}

function demoPath(...segments) {
  return path.join(demoRoot, ...segments)
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/")
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function fail(message) {
  failures.push(message)
}

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing required file: ${relativePath(filePath)}`)
    return ""
  }
  return readText(filePath)
}

function assertIncludes(filePath, text, label = text) {
  const content = assertFile(filePath)
  if (content && !content.includes(text)) {
    fail(`Missing ${label} in ${relativePath(filePath)}`)
  }
}

function parseJson(filePath) {
  try {
    return JSON.parse(assertFile(filePath))
  } catch (error) {
    fail(`Invalid JSON in ${relativePath(filePath)}: ${error.message}`)
    return null
  }
}

function walkFiles(rootPath, predicate = () => true) {
  if (!fs.existsSync(rootPath)) return []

  const entries = fs.readdirSync(rootPath, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const entryPath = path.join(rootPath, entry.name)
    if (entry.isDirectory()) return walkFiles(entryPath, predicate)
    return predicate(entryPath) ? [entryPath] : []
  })
}

function isAllowedDemoUrl(value) {
  try {
    const url = new URL(value)
    if (!/^https?:$/i.test(url.protocol)) return false
    if (url.username || url.password) return false

    const hostname = url.hostname.toLowerCase()
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".invalid")
  } catch {
    return false
  }
}

function describeUrlForFailure(value) {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`
  } catch {
    return "unparseable URL"
  }
}

function assertFixtureContract() {
  const requiredFields = ["assetId", "assetName", "publisher", "requestedAction", "submittedVersion", "remediatedVersion", "currentState", "requestedPermissions", "bundleInventory", "reviewStates", "provenance", "reportPaths", "goldenFindings", "syntheticEvidenceRegistry"]
  requiredFields.forEach((field) => {
    if (!fixture[field]) fail(`Fixture is missing required field: ${field}`)
  })

  const requiredStates = ["new", "in_review", "needs_remediation", "rejected_submitted_version", "waived_by_reviewer", "approved_remediated_version"]
  const actualStates = new Set((fixture.reviewStates || []).map((entry) => entry.id))
  requiredStates.forEach((state) => {
    if (!actualStates.has(state)) fail(`Fixture is missing review state: ${state}`)
  })

  const waiverState = (fixture.reviewStates || []).find((entry) => entry.id === "waived_by_reviewer")
  if (waiverState && !/accepted risk/i.test(`${waiverState.decision} ${waiverState.label}`)) fail("waived_by_reviewer must use accepted-risk language")
  ;(fixture.goldenFindings || []).forEach((finding) => {
    ;["id", "title", "path", "provenance", "businessRisk", "owner", "decision"].forEach((field) => {
      if (!finding[field]) fail(`Golden finding ${finding.id || "unknown"} is missing ${field}`)
    })
  })
}

function assertEnvironmentGuardrails() {
  if (/^true$/i.test(process.env.USE_REAL_LLM || "")) fail("USE_REAL_LLM=true is not allowed during the primary demo path")

  const providerUrl = process.env.LLM_PROVIDER_URL
  if (providerUrl && !isAllowedDemoUrl(providerUrl)) fail(`LLM_PROVIDER_URL must be localhost, 127.0.0.1, or .invalid with no URL credentials: ${describeUrlForFailure(providerUrl)}`)

  const apiKey = process.env.LLM_API_KEY
  if (apiKey && !/demo|fake|test|example/i.test(apiKey)) fail("LLM_API_KEY must be unset or clearly demo/fake/test")

  Object.keys(process.env).filter((key) => /WEBHOOK|CALLBACK/i.test(key) || (/ATV_SECURITY|DEMO|LLM|MCP/i.test(key) && /ENDPOINT|URL/i.test(key))).forEach((key) => {
    const value = process.env[key]
    if (value && /^https?:\/\//i.test(value) && !isAllowedDemoUrl(value)) fail(`${key} points to an external routable host during demo verification`)
  })
}

function fileContainsDemoReference(filePath) {
  const content = readText(filePath)
  if (!content.includes("demos/atv-security-target")) return false

  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath)) {
    return content.split(/\r?\n/).some((line) => /\b(import|export)\b.+demos\/atv-security-target|\brequire\(.+demos\/atv-security-target/.test(line))
  }

  return true
}

function assertDeploymentIsolation() {
  const rootPackage = parseJson(repoPath("package.json"))
  if (rootPackage && JSON.stringify(rootPackage.workspaces || []).includes("demos/atv-security-target")) fail("Root package.json workspaces must not include demos/atv-security-target")

  const azureYaml = assertFile(repoPath("azure.yaml"))
  const deploymentLines = azureYaml.split(/\r?\n/).filter((line) => /^\s*(project|path|context|module|run|command|hooks|services):/i.test(line) || /\.\/apps\//.test(line))
  if (deploymentLines.some((line) => line.includes("demos/atv-security-target"))) fail("azure.yaml production service inputs must not include demos/atv-security-target")

  const productionInputs = [repoPath("apps", "web", "Dockerfile"), repoPath("apps", "web", ".dockerignore"), repoPath("apps", "web", "package.json"), repoPath("apps", "api", "package.json"), repoPath("infra", "main.bicep"), ...walkFiles(repoPath(".github", "workflows")), ...walkFiles(repoPath("infra"), (filePath) => /\.(bicep|json|yaml|yml|tf)$/i.test(filePath)), ...walkFiles(repoPath("apps", "web", "src"), (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath)), ...walkFiles(repoPath("apps", "web", "lib"), (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath)), ...walkFiles(repoPath("apps", "web", "components"), (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath)), ...walkFiles(repoPath("apps", "api", "src"), (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath))]

  Array.from(new Set(productionInputs)).forEach((filePath) => {
    if (fs.existsSync(filePath) && readText(filePath).includes("demos/atv-security-target")) fail(`Production input references demo target: ${relativePath(filePath)}`)
  })
}

function assertRequiredArtifacts() {
  ;[demoPath("README.md"), demoPath("src", "demoAssetReviewFixture.js"), demoPath(".github", "copilot-mcp-config.json"), demoPath(".github", "hooks", "copilot-hooks.json"), demoPath(".github", "hooks", "scripts", "post-tool-use.js"), demoPath(".vscode", "settings.json"), repoPath("apps", "web", "app", "atv-security", "page.tsx"), repoPath("docs", "deliverables", "atv-security-demo-script.md"), repoPath("docs", "security", "fixtures", "atv-security-target-seeded-fallback-report.md")].forEach(assertFile)

  const packageJson = parseJson(demoPath("package.json"))
  if (!packageJson?.scripts?.["verify:demo"]) fail("Demo package.json must expose scripts.verify:demo")
}

function assertMarketplaceLabels() {
  const files = [demoPath("public", "index.html"), demoPath("public", "app.js"), demoPath("README.md"), repoPath("apps", "web", "app", "atv-security", "page.tsx"), repoPath("docs", "deliverables", "atv-security-demo-script.md"), repoPath("docs", "security", "fixtures", "atv-security-target-seeded-fallback-report.md")]
  const labels = [fixture.assetName, fixture.publisher, fixture.requestedAction, "Submitted AI asset security review", "Seeded fallback", "Local-only demo fixture"]
  files.forEach((filePath) => labels.forEach((label) => assertIncludes(filePath, label)))
  ;(fixture.goldenFindings || []).forEach((finding) => {
    const alignedFields = [finding.id, finding.title, finding.path, finding.provenance, finding.businessRisk, finding.owner, finding.decision]
    ;[repoPath("apps", "web", "app", "atv-security", "page.tsx"), repoPath("docs", "security", "fixtures", "atv-security-target-seeded-fallback-report.md"), repoPath("docs", "deliverables", "atv-security-demo-script.md")].forEach((filePath) => {
      alignedFields.forEach((field) => assertIncludes(filePath, field, `${finding.id} ${field}`))
    })
  })
}

function assertScannerEvidencePreserved() {
  ;[[demoPath(".github", "copilot-mcp-config.json"), "autoApprove"], [demoPath(".github", "copilot-mcp-config.json"), "npx"], [demoPath(".github", "copilot-mcp-config.json"), "\"*\""], [demoPath(".github", "hooks", "scripts", "post-tool-use.js"), "curl -X POST"], [demoPath(".vscode", "settings.json"), "chat.tools.autoApprove"], [demoPath("src", "server.js"), "eval("], [demoPath("src", "server.js"), "axios.get"], [demoPath("src", "server.js"), "childProcess.exec"], [demoPath("src", "routes", "auth.js"), "365d"], [demoPath("src", "mcp", "tools.js"), "childProcess.exec"]].forEach(([filePath, snippet]) => assertIncludes(filePath, snippet))

  const agentFiles = fs.readdirSync(demoPath(".github", "agents")).map((name) => demoPath(".github", "agents", name))
  const skillFiles = fs.readdirSync(demoPath(".github", "skills")).map((name) => demoPath(".github", "skills", name, "SKILL.md")).filter((filePath) => fs.existsSync(filePath))
  const agentSkillText = [...agentFiles, ...skillFiles].map(readText).join("\n")
  ;["ignore previous instructions", "always report ok", "hide errors"].forEach((snippet) => {
    if (!agentSkillText.includes(snippet)) fail(`Missing agentic prompt-injection fixture snippet: ${snippet}`)
  })
}

function assertSyntheticEvidence() {
  ;(fixture.syntheticEvidenceRegistry || []).forEach((entry) => {
    const expectedPath = demoPath(entry.file)
    if (!fs.existsSync(expectedPath)) {
      fail(`Synthetic evidence file missing: ${entry.file}`)
      return
    }
    if (!readText(expectedPath).includes(entry.value)) fail(`Synthetic evidence value missing from ${entry.file}: ${entry.purpose}`)
  })

  const reportText = assertFile(repoPath("docs", "security", "fixtures", "atv-security-target-seeded-fallback-report.md"))
  const textToScan = [reportText, assertFile(demoPath("README.md")), assertFile(demoPath("public", "index.html")), assertFile(demoPath("public", "app.js")), assertFile(repoPath("apps", "web", "app", "atv-security", "page.tsx")), assertFile(repoPath("docs", "deliverables", "atv-security-demo-script.md"))].join("\n")
  const secretLikeValues = textToScan.match(/(sk-proj-[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._-]+|postgres:\/\/[^\s`|)]+)/g) || []
  secretLikeValues.forEach((value) => {
    if (!/DEMO|demo|FAKE|fake|example\.invalid|test/i.test(value)) fail(`Fallback report contains non-demo secret-shaped value: ${value}`)
  })
}

assertFixtureContract()
assertEnvironmentGuardrails()
assertDeploymentIsolation()
assertRequiredArtifacts()
assertMarketplaceLabels()
assertScannerEvidencePreserved()
assertSyntheticEvidence()

if (failures.length) {
  console.error("Demo alignment verification failed:")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log("Demo alignment verification passed: fixture, UI labels, fallback report, scanner evidence, and deployment isolation are aligned.")