"use client"

import { Pencil } from "lucide-react"

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(100, 200, 255, 0.03) 2px,
            rgba(100, 200, 255, 0.03) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(100, 200, 255, 0.03) 2px,
            rgba(100, 200, 255, 0.03) 4px
          )`
        }} />
      </div>
      
      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-pink-500/20 via-transparent to-transparent" />
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-cyan-500/20 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center py-12 px-6">
        {/* Logo text */}
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-pink-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent">
            {'>'}agency
          </span>
          <span className="ml-2 text-cyan-400">:D</span>
        </h1>
        
        {/* Subtitle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium uppercase tracking-widest text-cyan-400">
            Global Marketplace
          </span>
          <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
            <Pencil className="h-3 w-3" />
            Playground
          </span>
        </div>
      </div>
    </div>
  )
}
