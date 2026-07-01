"use client"

import { NebulaLogo } from "@/components/ui/nebula-logo"

const PILLARS = [
  "Multi-provider AI Gateway",
  "Agent & MCP Registry",
  "Entra Agent ID",
  "FinOps Showback",
  "Trustworthy AI™",
]

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--background)] via-[var(--card)] to-[var(--background)]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(var(--accent), 0.03) 2px,
            rgba(var(--accent), 0.03) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(var(--accent), 0.03) 2px,
            rgba(var(--accent), 0.03) 4px
          )`
        }} />
      </div>
      
      {/* Gradient overlays - Enterprise brand colors */}
      <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-[var(--accent)]/15 via-transparent to-transparent" />
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[var(--brand-primary)]/15 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="relative flex flex-col items-center py-9 px-6 text-center">
        {/* Nebula-X mark */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-light)] shadow-lg shadow-[var(--primary)]/20">
          <NebulaLogo className="h-8 w-8 text-[#0C0C0C]" />
        </div>
        
        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-[2.75rem]">
          Nebula-<span className="text-[var(--primary)]">X</span>
        </h1>

        {/* Platform descriptor */}
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Deloitte · AI Management Platform
        </p>

        {/* Positioning */}
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          The governed platform for the firm&apos;s AI — agents, MCP tools, models, and skills across every org and workspace. Put AI on rails while keeping it self-service.
        </p>

        {/* Tagline */}
        <p className="mt-2.5 text-sm font-medium italic text-[var(--accent-light)]">
          Self-service AI, fully governed.
        </p>
        
        {/* Capability pillars */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {PILLARS.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
