const express = require("express")
const { all } = require("../db")
const { runAgent, listAgentWorkload, runDiagnostic } = require("../services/agentRuntime")

const router = express.Router()

router.get("/", async (_req, res) => {
  res.json(await all("SELECT * FROM agents ORDER BY name"))
})

router.get("/:id/workload", async (req, res) => {
  res.json(await listAgentWorkload(req.params.id))
})

router.post("/:id/run", async (req, res) => {
  const result = await runAgent(req.params.id, req.body.caseId, req.body.actor)
  res.json(result)
})

router.post("/:id/diagnostic", async (req, res) => {
  const result = await runDiagnostic(req.body.command)
  res.json(result)
})

module.exports = { agentsRouter: router }
