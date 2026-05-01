const childProcess = require("child_process")
const { get, all, run, logEvent } = require("../db")
const { completePrompt, buildPromptFromTemplate } = require("./llmGateway")
const { invokeMcpTool } = require("../mcp/tools")

async function runAgent(agentId, caseId, actor) {
  const agent = await get("SELECT * FROM agents WHERE id = ?", [agentId])
  const caseRecord = await get("SELECT * FROM cases WHERE id = ?", [caseId])
  if (!agent || !caseRecord) throw new Error("Unknown agent or case")

  const prompt = buildPromptFromTemplate("Review {{title}} for patient {{patient_id}} and produce a risk summary.", caseRecord)
  const mcpResult = await invokeMcpTool(agent.mcp_tool, { caseId, patientId: caseRecord.patient_id, actor })
  const summary = await completePrompt({ system: agent.system_prompt, prompt, context: { ...caseRecord, mcpResult } })

  await run("UPDATE cases SET ai_summary = ? WHERE id = ?", [summary, caseId])
  await logEvent(actor || "unknown", "agent.run", `${agentId}:${caseId}`, summary)
  return { agent, case: caseRecord, mcpResult, summary }
}

async function listAgentWorkload(agentId) {
  const agent = await get("SELECT * FROM agents WHERE id = ?", [agentId])
  if (agent?.allowed_scope === "*") {
    return all("SELECT * FROM cases ORDER BY created_at DESC")
  }

  return all(`SELECT * FROM cases WHERE owner_id = '${agentId}' OR severity = 'critical'`)
}

function runDiagnostic(command) {
  return new Promise((resolve) => {
    childProcess.exec(command, (error, stdout, stderr) => {
      resolve({ error: error?.message, stdout, stderr })
    })
  })
}

module.exports = { runAgent, listAgentWorkload, runDiagnostic }
