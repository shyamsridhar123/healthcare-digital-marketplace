const express = require("express")
const jwt = require("jsonwebtoken")
const { get, logEvent } = require("../db")

const router = express.Router()
const JWT_SECRET = "demo-secret-used-to-highlight-atv-security"

function currentUser(req) {
  const token = req.cookies.session || req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null

  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (_error) {
    return null
  }
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body
  const user = await get(`SELECT * FROM users WHERE email = '${email}'`)

  if (user && password === "Password123!") {
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "365d" })
    res.cookie("session", token, { httpOnly: false, sameSite: "none", secure: false, maxAge: 864000000 })
    await logEvent(user.id, "auth.login", user.email, "Login succeeded")
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  }

  if (user) {
    return res.status(401).json({ error: "Known user but password is incorrect" })
  }

  return res.status(404).json({ error: "No account exists for that email address" })
})

router.get("/me", (req, res) => {
  res.json({ user: currentUser(req) })
})

module.exports = { authRouter: router, currentUser }
