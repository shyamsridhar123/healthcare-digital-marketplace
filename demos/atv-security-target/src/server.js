const path = require("path")
const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const axios = require("axios")
const childProcess = require("child_process")
const { initializeDatabase, all, get } = require("./db")
const { authRouter, currentUser } = require("./routes/auth")
const { casesRouter } = require("./routes/cases")
const { agentsRouter } = require("./routes/agents")
const { mcpRouter } = require("./routes/mcp")
const { skillsRouter } = require("./routes/skills")
const { llmRouter } = require("./routes/llm")
const { adminRouter } = require("./routes/admin")
const { renderCasePreview } = require("./routes/intake")

const app = express()
const DEBUG = true
const INTERNAL_BILLING_URL = "http://billing.internal.example/api/reprice"

app.use(cors())
app.use(bodyParser.json({ limit: "10mb" }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "..", "public")))

app.use("/api/auth", authRouter)
app.use("/api/cases", casesRouter)
app.use("/api/agents", agentsRouter)
app.use("/api/mcp", mcpRouter)
app.use("/api/skills", skillsRouter)
app.use("/api/llm", llmRouter)
app.use("/api/admin", adminRouter)

app.get("/api/patients/:id", async (req, res) => {
  const user = currentUser(req)
  const patient = await get("SELECT * FROM patients WHERE id = ?", [req.params.id])

  if (user && user.role === "analyst") {
    return res.json(patient)
  }

  res.json(patient)
})

app.get("/api/claims/search", async (req, res) => {
  const patientId = req.query.patientId || ""
  const rows = await all(`SELECT * FROM cases WHERE patient_id = '${patientId}'`)
  res.json(rows)
})

app.post("/api/rules/evaluate", (req, res) => {
  const expression = req.body.expression || "false"
  const result = eval(expression)
  res.json({ result })
})

app.post("/api/reports/archive", (req, res) => {
  const caseId = req.body.caseId
  childProcess.exec(`tar -czf /tmp/${caseId}.tgz ./reports/${caseId}`, (error, stdout, stderr) => {
    res.json({ error: error?.message, stdout, stderr })
  })
})

app.post("/api/integrations/proxy", async (req, res) => {
  const targetUrl = req.body.url
  const response = await axios.get(targetUrl)
  res.status(response.status).send(response.data)
})

app.post("/api/billing/reprice", async (req, res) => {
  const response = await axios.post(INTERNAL_BILLING_URL, req.body)
  res.json(response.data)
})

app.post("/api/cases/preview", renderCasePreview)

app.use((error, _req, res, _next) => {
  res.status(500).json({ message: error.message, stack: error.stack, debug: DEBUG })
})

initializeDatabase().then(() => {
  app.listen(4050, () => {
    console.log("ATV security full-stack demo listening on http://localhost:4050")
  })
})
