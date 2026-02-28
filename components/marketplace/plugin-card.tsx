"use client"

import Link from "next/link"
import { Asset } from "@/lib/types"
import { 
  Star,
  Zap,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Copy
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PluginCardProps {
  asset: Asset
}

// Get category badge color
function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    "Developer Tools": "bg-blue-500/20 text-blue-400",
    "Productivity": "bg-purple-500/20 text-purple-400",
    "Devops": "bg-orange-500/20 text-orange-400",
    "Healthcare": "bg-emerald-500/20 text-emerald-400",
    "RCM": "bg-cyan-500/20 text-cyan-400",
    "Fhl": "bg-pink-500/20 text-pink-400",
  }
  return styles[category] || "bg-secondary text-muted-foreground"
}

export function PluginCard({ asset }: PluginCardProps) {
  const skillCount = asset.capabilities.length
  const scriptCount = Math.floor(Math.random() * 6) + 1 // Simulated

  return (
    <Link href={`/asset/${asset.id}`} className="group block">
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-muted-foreground/40">
        {/* Header with name and rating */}
        <div className="mb-1 flex items-start justify-between">
          <h3 className="font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
            {asset.name.toLowerCase().replace(/\s+/g, '-')}
          </h3>
          <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
            <Star className="h-3 w-3 fill-current" />
            {asset.rating.toFixed(1)}
          </span>
        </div>
        
        {/* Version and author */}
        <p className="mb-3 text-xs text-muted-foreground">
          v{asset.version} · by {asset.publisher}
        </p>
        
        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {asset.description}
        </p>
        
        {/* Skills/Scripts and Category */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-400" />
              {skillCount} skill{skillCount !== 1 ? 's' : ''}
            </span>
            {scriptCount > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-amber-500" />
                {scriptCount} scripts
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "rounded px-2 py-0.5 text-xs font-medium",
              getCategoryStyle(asset.tags[0] || "Healthcare")
            )}>
              {asset.tags[0] || "Healthcare"}
            </span>
            <button 
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.preventDefault()
                navigator.clipboard.writeText(asset.name)
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <button 
            className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>0</span>
          </button>
          <button 
            className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span>0</span>
          </button>
          <button 
            className="hover:text-red-400 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Link>
  )
}

export function ContributeCard() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-muted-foreground" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-medium text-foreground">+ Contribute</h3>
      <p className="text-sm text-muted-foreground">
        Share <span className="text-purple-400">plugins</span>, <span className="text-yellow-400">skills</span>, and <span className="text-cyan-400">agents</span>
        <br />inside Microsoft.
      </p>
    </div>
  )
}
