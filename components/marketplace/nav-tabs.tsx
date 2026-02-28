"use client"

import { cn } from "@/lib/utils"
import { 
  Puzzle, 
  Zap, 
  Bot, 
  Globe, 
  BarChart3,
  ExternalLink
} from "lucide-react"

interface NavTabsProps {
  selectedTab: string
  onTabChange: (tab: string) => void
  counts: {
    plugins: number
    skills: number
    agents: number
  }
}

export function NavTabs({ selectedTab, onTabChange, counts }: NavTabsProps) {
  const tabs = [
    { id: "plugins", label: "Plugins", icon: Puzzle, count: counts.plugins },
    { id: "skills", label: "Skills", icon: Zap, count: counts.skills },
    { id: "agents", label: "Agents", icon: Bot, count: counts.agents },
    { id: "mcp", label: "MCP", icon: Globe, external: true },
    { id: "stats", label: "Stats", icon: BarChart3 },
  ]

  return (
    <div className="flex items-center justify-between">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/50 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.external && onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              selectedTab === tab.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className={cn(
              "h-4 w-4",
              tab.id === "plugins" && "text-purple-400",
              tab.id === "skills" && "text-yellow-400",
              tab.id === "agents" && "text-cyan-400",
              tab.id === "mcp" && "text-emerald-400",
              tab.id === "stats" && "text-blue-400"
            )} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "rounded-md px-1.5 py-0.5 text-xs",
                selectedTab === tab.id
                  ? "bg-muted text-foreground"
                  : "bg-secondary text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
            {tab.external && (
              <ExternalLink className="h-3 w-3" />
            )}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-foreground">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        <button className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
          US
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-foreground">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
