const express = require("express")
const { completePrompt } = require("../services/llmGateway")

const router = express.Router()

router.post("/complete", async (req, res) => {
  const output = await completePrompt({
    system: req.body.system || "You are a helpful healthcare RCM assistant.",
    prompt: req.body.prompt || "Summarize the case.",
    context: req.body.context || {},
  })

  res.json({ output })
})

module.exports = { llmRouter: router }
