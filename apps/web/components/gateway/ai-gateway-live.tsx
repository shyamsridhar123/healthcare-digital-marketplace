"use client"

import { useEffect, useState, type ElementType } from "react"
import {
  Activity,
  ArrowLeftRight,
  Coins,
  Gauge,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RecentCall {
  at: string
  model: string
  totalTokens: number
  latencyMs: number
  viaGateway: boolean
  status: string
}

interface GatewayMetrics {
  routing: "apim-gateway" | "direct-aoai"
  gatewayHost: string | null
  deployment: string
  tokensPerMinuteLimit: number
  requests: number
  blocked: number
  errors: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  avgLatencyMs: number
  estCostUsd: number
  usdPer1k: number
  lastModel: string | null
  lastRequestAt: string | null
  startedAt: string
  now: string
  recent: RecentCall[]
}

function fmt(n: number): string {
  return (n ?? 0).toLocaleString()
}

function timeAgo(iso: string, nowIso: string): string {
  const then = new Date(iso).getTime()
  const now = new Date(nowIso).getTime()
  const s = Math.max(0, Math.round((now - then) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return `${h}h ago`
}

function Tile({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
        {label}
      </div>
      <div className="mt-1 truncate text-xl font-semibold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

/**
 * LIVE Azure API Management AI-gateway panel. Unlike the surrounding
 * governance dashboards (illustrative mock data), every number here is
 * counted from real Nebula-X Assistant traffic via /api/gateway-metrics.
 */
export function AiGatewayLive() {
  const [m, setM] = useState<GatewayMetrics | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const r = await fetch("/api/gateway-metrics", { cache: "no-store" })
        if (!r.ok) {
          if (alive) setErr(`unavailable (${r.status})`)
          return
        }
        const d = (await r.json()) as GatewayMetrics
        if (alive) {
          setM(d)
          setErr(null)
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || "unavailable")
      }
    }
    load()
    const t = setInterval(load, 8000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  const viaGw = m?.routing === "apim-gateway"

  return (
    <section className="mb-6 rounded-xl border border-[var(--primary)]/40 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            LIVE · real telemetry
          </div>
          <h2 className="mt-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ArrowLeftRight className="h-5 w-5 text-[var(--primary)]" />
            Azure API Management — AI Gateway
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {viaGw ? (
              <>
                Nebula-X Assistant traffic is routed through Azure API Management{" "}
                <span className="font-mono text-foreground">{m?.gatewayHost}</span> → Azure OpenAI{" "}
                <span className="font-mono text-foreground">{m?.deployment}</span>. The gateway enforces token
                rate-limits, emits token metrics, and applies content safety. Every number below is counted from
                real requests since the service started.
              </>
            ) : (
              <>
                Nebula-X Assistant is calling Azure OpenAI{" "}
                <span className="font-mono text-foreground">{m?.deployment ?? "gpt-5.1"}</span> directly. The
                counters below are real request telemetry; routing flips to the APIM gateway once it is wired in.
              </>
            )}
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            viaGw
              ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
              : "border-border bg-secondary/20 text-muted-foreground"
          )}
        >
          Routing: <span className="font-mono">{viaGw ? "APIM gateway" : "direct AOAI"}</span>
        </div>
      </div>

      {err && (
        <p className="mt-4 text-xs text-muted-foreground">
          Gateway metrics {err}. The assistant service may be waking up — this refreshes automatically.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          Icon={Zap}
          label="Requests"
          value={m ? fmt(m.requests) : "—"}
          sub={m?.lastRequestAt ? `last ${timeAgo(m.lastRequestAt, m.now)}` : "no traffic yet — ask the assistant"}
        />
        <Tile
          Icon={Gauge}
          label="Total tokens"
          value={m ? fmt(m.totalTokens) : "—"}
          sub={m ? `${fmt(m.promptTokens)} in · ${fmt(m.completionTokens)} out` : "prompt + completion"}
        />
        <Tile
          Icon={Timer}
          label="Avg latency"
          value={m ? `${fmt(m.avgLatencyMs)} ms` : "—"}
          sub="per successful call"
        />
        <Tile
          Icon={Coins}
          label="Est. cost"
          value={m ? `$${m.estCostUsd.toFixed(4)}` : "—"}
          sub={m ? `list price · $${m.usdPer1k}/1K tok` : "list-price estimate"}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Tile
          Icon={Activity}
          label="TPM policy limit"
          value={m ? fmt(m.tokensPerMinuteLimit) : "—"}
          sub="azure-openai-token-limit"
        />
        <Tile
          Icon={ShieldCheck}
          label="Blocked / errors"
          value={m ? `${fmt(m.blocked)} / ${fmt(m.errors)}` : "—"}
          sub="rate-limit + content safety"
        />
        <Tile
          Icon={Zap}
          label="Last model"
          value={m?.lastModel ?? m?.deployment ?? "—"}
          sub="most recent inference"
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Wired to <span className="font-mono text-foreground">/api/gateway-metrics</span> — real counts from the
        Nebula-X Assistant. Ask the assistant (bottom-right) and watch these move. The surrounding governance
        dashboards are illustrative; this tile is live.
      </p>
    </section>
  )
}
