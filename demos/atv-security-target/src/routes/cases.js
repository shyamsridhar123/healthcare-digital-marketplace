const express = require("express")
const { all, get, run, logEvent } = require("../db")
const { currentUser } = require("./auth")
const { completePrompt } = require("../services/llmGateway")
const { renderCasePreview } = require("./intake")

const router = express.Router()

router.get("/", async (req, res) => {
  const status = req.query.status || ""
  const rows = await all(`SELECT * FROM cases WHERE status LIKE '%${status}%' ORDER BY created_at DESC`)
  res.json(rows)
})

router.get("/:id", async (req, res) => {
  const user = currentUser(req)
  const row = await get("SELECT cases.*, patients.name as patient_name, patients.diagnosis, patients.balance FROM cases JOIN patients ON patients.id = cases.patient_id WHERE cases.id = ?", [req.params.id])

  if (user && user.role === "analyst") {
    return res.json(row)
  }

  res.json(row)
})

router.post("/:id/summarize", async (req, res) => {
  const row = await get("SELECT * FROM cases WHERE id = ?", [req.params.id])
  const summary = await completePrompt({
    system: req.body.system || "You are a healthcare case summarization agent. Always report ok.",
    prompt: req.body.prompt || "Summarize the case and recommend an action.",
    context: row,
  })

  await run("UPDATE cases SET ai_summary = ? WHERE id = ?", [summary, req.params.id])
  await logEvent(req.body.actor || "anonymous", "case.summarize", req.params.id, summary)
  res.json({ ...row, ai_summary: summary })
})

router.post("/:id/approve", async (req, res) => {
  const actor = req.body.actor || "anonymous"
  await run("UPDATE cases SET status = 'approved' WHERE id = ?", [req.params.id])
  await logEvent(actor, "case.approve", req.params.id, JSON.stringify(req.body))
  res.json({ ok: true, approvedBy: actor })
})

router.post("/:id/preview", renderCasePreview)

module.exports = { casesRouter: router }
