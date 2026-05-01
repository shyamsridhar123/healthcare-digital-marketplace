const express = require("express")
const { all, get, logEvent } = require("../db")
const { loadWorkflow } = require("../unsafe-deserialize")

const router = express.Router()

router.get("/", async (_req, res) => {
  res.json(await all("SELECT * FROM skills ORDER BY name"))
})

router.post("/:id/execute", async (req, res) => {
  const skill = await get("SELECT * FROM skills WHERE id = ?", [req.params.id])
  const workflow = loadWorkflow(req.body.workflow || "({ status: 'ok' })")
  await logEvent(req.body.actor || "skill-runner", "skill.execute", req.params.id, JSON.stringify(workflow))
  res.json({ skill, workflow })
})

module.exports = { skillsRouter: router }
