const demoAssetReview = {
  assetName: "Claims Triage Agent Bundle",
  publisher: "Contoso Health AI Studio",
  requestedAction: "Publish to enterprise AI Asset Marketplace",
  submittedVersion: "1.4.0-submitted",
  remediatedVersion: "1.4.1-remediated",
  currentState: "needs_remediation",
  labels: ["Submitted AI asset security review", "Local-only demo fixture", "Seeded fallback", "Synthetic data"],
  bundleInventory: [
    ["Application source", "demos/atv-security-target/src"],
    ["Browser UI", "demos/atv-security-target/public"],
    ["MCP config", "demos/atv-security-target/.github/copilot-mcp-config.json"],
    ["Agents and skills", "demos/atv-security-target/.github"],
    ["Editor settings", "demos/atv-security-target/.vscode/settings.json"],
  ],
  requestedPermissions: [
    "Read claims queue and member case payloads",
    "Call LLM gateway for triage summaries",
    "Invoke MCP case-search, web-fetch, and shell-runner tools",
    "Write review recommendations to audit timeline",
  ],
}

const state = { token: "", selectedCase: "case-200" }

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}

function card(content) {
  const element = document.createElement("article")
  element.className = "card"
  element.innerHTML = content
  return element
}

function unavailableCard(message) {
  return card(`<strong>Evidence unavailable</strong><p>${message}</p><span class="badge medium">not approved</span>`)
}

function renderReviewPacket() {
  document.getElementById("reviewStatus").textContent = demoAssetReview.currentState.replace(/_/g, " ")
  document.getElementById("assetSummary").innerHTML = [
    ["Asset", demoAssetReview.assetName],
    ["Publisher", demoAssetReview.publisher],
    ["Requested action", demoAssetReview.requestedAction],
    ["Submitted version", demoAssetReview.submittedVersion],
    ["Remediated version", demoAssetReview.remediatedVersion],
    ["Assurance", demoAssetReview.labels.join(" / ")],
  ].map(([label, value]) => `<div class="packet-card"><span>${label}</span><strong>${value}</strong></div>`).join("")

  document.getElementById("bundleInventory").innerHTML = demoAssetReview.bundleInventory
    .map(([surface, assetPath]) => `<article class="mini-card"><strong>${surface}</strong><p>${assetPath}</p></article>`)
    .join("")

  document.getElementById("requestedPermissions").innerHTML = demoAssetReview.requestedPermissions
    .map((permission) => `<article class="mini-card"><p>${permission}</p></article>`)
    .join("")
}

async function loadCases() {
  const status = document.getElementById("statusFilter").value
  const container = document.getElementById("caseList")
  container.innerHTML = ""

  try {
    const cases = await request(`/api/cases?status=${encodeURIComponent(status)}`)
    document.getElementById("caseCount").textContent = cases.length

    if (!cases.length) {
      container.appendChild(unavailableCard("No synthetic claims payloads matched this filter. The marketplace review packet remains the source of truth."))
      return
    }

    cases.forEach((caseItem) => {
      const element = card(`
        <strong>${caseItem.title}</strong>
        <p>${caseItem.raw_text}</p>
        <span class="badge ${caseItem.severity}">${caseItem.severity}</span>
      `)
      element.addEventListener("click", () => {
        state.selectedCase = caseItem.id
        document.getElementById("promptInput").value = `Summarize ${caseItem.id}: ${caseItem.raw_text}`
      })
      container.appendChild(element)
    })
  } catch (error) {
    document.getElementById("caseCount").textContent = "0"
    container.appendChild(unavailableCard("Case API fetch failed. Do not treat missing evidence as scan approval."))
  }
}

async function loadAgents() {
  const container = document.getElementById("agentList")
  container.innerHTML = ""

  try {
    const agents = await request("/api/agents")
    document.getElementById("agentCount").textContent = agents.length
    agents.forEach((agent) => {
      const element = card(`
        <strong>${agent.name}</strong>
        <p>${agent.system_prompt}</p>
        <button data-agent="${agent.id}">Run on selected synthetic case</button>
      `)
      element.querySelector("button").addEventListener("click", async () => {
        const result = await request(`/api/agents/${agent.id}/run`, {
          method: "POST",
          body: JSON.stringify({ caseId: state.selectedCase, actor: "demo-presenter" }),
        })
        document.getElementById("llmOutput").textContent = JSON.stringify(result, null, 2)
      })
      container.appendChild(element)
    })
  } catch (error) {
    document.getElementById("agentCount").textContent = "0"
    container.appendChild(unavailableCard("Agent evidence could not load from the optional runtime."))
  }
}

async function loadTools() {
  const container = document.getElementById("toolList")
  container.innerHTML = ""

  try {
    const tools = await request("/api/mcp/tools")
    document.getElementById("toolCount").textContent = tools.length
    tools.forEach((tool) => container.appendChild(card(`<strong>${tool.name}</strong><p>${tool.description}</p><span class="badge high">${tool.risk}</span>`)))
  } catch (error) {
    document.getElementById("toolCount").textContent = "0"
    container.appendChild(unavailableCard("MCP tool registry could not load; seeded config evidence remains in .github."))
  }
}

async function loadSkills() {
  const container = document.getElementById("skillList")
  container.innerHTML = ""

  try {
    const skills = await request("/api/skills")
    skills.forEach((skill) => container.appendChild(card(`<strong>${skill.name}</strong><p>${skill.instructions}</p><span class="badge medium">submitted</span>`)))
  } catch (error) {
    container.appendChild(unavailableCard("Skill evidence could not load from the optional runtime; review .github/skills for static evidence."))
  }
}

async function login() {
  const result = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@example.com", password: "Password123!" }),
  })
  state.token = result.token
  document.getElementById("loginButton").textContent = `Logged in as ${result.user.role}`
}

async function runLlm() {
  const output = await request("/api/llm/complete", {
    method: "POST",
    body: JSON.stringify({ prompt: document.getElementById("promptInput").value, context: { caseId: state.selectedCase } }),
  })
  document.getElementById("llmOutput").textContent = JSON.stringify(output, null, 2)
}

document.getElementById("loginButton").addEventListener("click", login)
document.getElementById("refreshCases").addEventListener("click", loadCases)
document.getElementById("runLlm").addEventListener("click", runLlm)

renderReviewPacket()
loadCases()
loadAgents()
loadTools()
loadSkills()