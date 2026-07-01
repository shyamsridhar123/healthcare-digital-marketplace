import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Same-origin proxy to the Nebula-X Agent 365 service's real AI-gateway
// telemetry. Keeps the agent URL and shared secret server-side. Read-only.
export async function GET() {
  const agentUrl = process.env.NEBULA_AGENT_URL
  const agentKey = process.env.NEBULA_AGENT_KEY

  if (!agentUrl) {
    return NextResponse.json(
      { error: "The Nebula-X AI gateway telemetry is not configured for this environment." },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${agentUrl.replace(/\/$/, "")}/api/gateway/metrics`, {
      headers: { ...(agentKey ? { "x-nebula-key": agentKey } : {}) },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || `gateway metrics error (${res.status})` },
        { status: 502 }
      )
    }
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "gateway metrics unavailable" }, { status: 502 })
  }
}
