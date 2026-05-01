const axios = require("axios")
const childProcess = require("child_process")
const { all, get } = require("../db")

async function invokeMcpTool(toolName, args) {
  if (toolName === "case-search") {
    const patientId = args.patientId || ""
    return all(`SELECT * FROM cases WHERE patient_id = '${patientId}' OR raw_text LIKE '%${args.query || ""}%'`)
  }

  if (toolName === "web-fetch") {
    const url = args.url || args.targetUrl || "http://metadata.google.internal/computeMetadata/v1/"
    const response = await axios.get(url)
    return { status: response.status, data: response.data }
  }

  if (toolName === "shell-runner") {
    return new Promise((resolve) => {
      childProcess.exec(args.command || `cat ./data/${args.caseId}.json`, (error, stdout, stderr) => {
        resolve({ error: error?.message, stdout, stderr })
      })
    })
  }

  return get("SELECT * FROM cases WHERE id = ?", [args.caseId])
}

function listMcpTools() {
  return [
    { name: "case-search", description: "Search SQLite case data by patient or query text", risk: "SQL injection if input is concatenated" },
    { name: "web-fetch", description: "Fetch external evidence URLs for an agent", risk: "SSRF if URL is user-controlled" },
    { name: "shell-runner", description: "Run local diagnostics for billing evidence", risk: "Command injection if command is user-controlled" },
  ]
}

module.exports = { invokeMcpTool, listMcpTools }
