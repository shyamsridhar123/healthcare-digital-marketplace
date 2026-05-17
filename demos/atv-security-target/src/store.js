const crypto = require("crypto")

const password = "Password123!"
const adminPasswordHash = crypto.createHash("md5").update(password).digest("hex")

const db = {
  users: [
    { id: "u-admin", email: "admin@example.com", role: "admin", passwordHash: adminPasswordHash },
    { id: "u-analyst", email: "analyst@example.com", role: "analyst", patientIds: ["p-100"] },
  ],
  patients: [
    { id: "p-100", name: "Alex Morgan", memberId: "M-100", balance: 140.55, diagnosis: "cardiology follow-up" },
    { id: "p-200", name: "Sam Rivera", memberId: "M-200", balance: 2280.1, diagnosis: "oncology review" },
  ],
  claims: [
    { id: "c-100", patientId: "p-100", amount: 140.55, status: "denied" },
    { id: "c-200", patientId: "p-200", amount: 2280.1, status: "appealed" },
  ],
  query(sql, callback) {
    callback(null, [{ sql, note: "mock database echoed query for demo" }])
  },
}

function findPatientById(id) {
  return db.patients.find((patient) => patient.id === id) || null
}

function findClaimsByPatient(patientId) {
  return db.claims.filter((claim) => claim.patientId === patientId)
}

module.exports = { db, findPatientById, findClaimsByPatient }
