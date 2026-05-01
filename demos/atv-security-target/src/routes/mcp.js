const express = require("express")
const { invokeMcpTool, listMcpTools } = require("../mcp/tools")

const router = express.Router()

router.get("/tools", (_req, res) => {
  res.json(listMcpTools())
})

router.post("/tools/:name/invoke", async (req, res) => {
  const result = await invokeMcpTool(req.params.name, req.body)
  res.json({ tool: req.params.name, result })
})

module.exports = { mcpRouter: router }
