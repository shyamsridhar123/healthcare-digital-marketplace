"use client"

import Link from "next/link"
import { Asset } from "@/lib/types"
import { Star, Blocks, FileCode2, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface AssetCardProps {
  asset: Asset
}

export function AssetCard({ asset }: AssetCardProps) {
  const skillCount = asset.capabilities.length
  // Derive script count deterministically from asset id to avoid hydration mismatch
  const scriptCount = (asset.id.charCodeAt(asset.id.length - 1) % 6) + 1
  const href = asset.uiHref && asset.type === "space" ? asset.uiHref : `/asset/${asset.id}`
  const category = asset.tags[0] || "Professional Services"

  return (
    <Link href={href} className="group block">
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--primary)]/50 hover:shadow-[0_1px_0_0_var(--primary)]">
        {/* Header: name + rating */}
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground transition-colors duration-150 group-hover:text-[var(--primary)]">
            {asset.name.toLowerCase().replace(/\s+/g, '-')}
          </h3>
          <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums">
            <Star className="h-3 w-3 fill-[var(--primary)] text-[var(--primary)]" />
            {asset.rating.toFixed(1)}
          </span>
        </div>

        {/* Version + author */}
        <p className="mb-3 text-xs text-muted-foreground">
          v{asset.version} · {asset.publisher}
        </p>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {asset.description}
        </p>

        {/* Footer: metadata + category */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span className="flex items-center gap-1">
              <Blocks className="h-3.5 w-3.5" />
              {skillCount}
            </span>
            <span className="flex items-center gap-1">
              <FileCode2 className="h-3.5 w-3.5" />
              {scriptCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="max-w-[110px] truncate whitespace-nowrap rounded bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {category}
            </span>
            <button
              aria-label="Copy asset name"
              className="press rounded p-0.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
              onClick={(e) => {
                e.preventDefault()
                navigator.clipboard.writeText(asset.name)
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ContributeCard() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-6 text-center transition-colors duration-150 hover:border-[var(--primary)]/50">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)]/10">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--primary)]" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-foreground">Contribute an asset</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Publish agents, skills, and models to the firm&apos;s governed registry.
      </p>
    </div>
  )
}
