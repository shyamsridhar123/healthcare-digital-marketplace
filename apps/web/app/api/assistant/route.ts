import { NextResponse } from "next/server"

export const runtime = "nodejs"

// Same-origin proxy to the Nebula-X Agent 365 service. Keeps the agent URL and
// shared secret server-side so the browser never sees them and there is no CORS.
export async function POST(req: Request) {
  const agentUrl = process.env.NEBULA_AGENT_URL
  const agentKey = process.env.NEBULA_AGENT_KEY

  if (!agentUrl) {
    return NextResponse.json(
      { error: "The Nebula-X Assistant is not configured for this environment." },
      { status: 503 }
    )
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const message = (payload?.message ?? "").toString()
  const history = Array.isArray(payload?.history) ? payload.history : []
  if (!message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  try {
    const res = await fetch(`${agentUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(agentKey ? { "x-nebula-key": agentKey } : {}),
      },
      body: JSON.stringify({ message, history }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || `assistant error (${res.status})` }, { status: 502 })
    }
    return NextResponse.json({ reply: data.reply })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "assistant unavailable" }, { status: 502 })
  }
}
