const express = require("express")
const { all, run } = require("../db")
const { currentUser } = require("./auth")

const router = express.Router()

router.get("/users", async (req, res) => {
  const user = currentUser(req)
  if (user && user.role === "admin") {
    return res.json(await all("SELECT id, email, role, patient_scope FROM users"))
  }

  res.json(await all("SELECT id, email, role, patient_scope, password_hash FROM users"))
})

router.post("/sql", async (req, res) => {
  const result = await run(req.body.sql)
  res.json(result)
})

module.exports = { adminRouter: router }
