"use client"

import { Sparkles } from "lucide-react"
import { NebulaLogo } from "@/components/ui/nebula-logo"

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
      <div className="relative flex flex-col items-center justify-center py-10 px-6">
        {/* Nebula-X Logo */}
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-light)] shadow-lg shadow-[var(--primary)]/20">
            <NebulaLogo className="h-7 w-7 text-[#0C0C0C]" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">
          Nebula-X <span className="text-[var(--primary)]">by Deloitte</span>
        </h1>
        <p className="mb-4 text-sm text-muted-foreground text-center max-w-lg">
          The governed AI marketplace for professional services — audit-grade agents, tax-certified models, and governance-first workflows. Intelligence, governed.
        </p>
        
        {/* Badges */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--primary)]">
            Professional Services AI
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--primary)]/15 px-3 py-1 text-xs font-medium text-[var(--accent-light)]">
            <Sparkles className="h-3 w-3" />
            Trustworthy AI™ Certified
          </span>
        </div>
      </div>
    </div>
  )
}
