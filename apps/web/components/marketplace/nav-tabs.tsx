"use client"

import { cn } from "@/lib/utils"
import { 
  Zap,
  Bot,
  Globe,
  BarChart3,
  Brain,
  MessageSquare,
} from "lucide-react"

interface NavTabsProps {
  selectedTab: string
  onTabChange: (tab: string) => void
  counts: {
    agents: number
    mcp: number
    skills: number
    models: number
    spaces: number
  }
}

export function NavTabs({ selectedTab, onTabChange, counts }: NavTabsProps) {
  const tabs = [
    { id: "agents",  label: "Agents",  icon: Bot,      count: counts.agents },
    { id: "spaces",  label: "Spaces",  icon: MessageSquare, count: counts.spaces },
    { id: "tools",   label: "MCP",     icon: Globe,    count: counts.mcp },
    { id: "models",  label: "Models",  icon: Brain,    count: counts.models },
    { id: "skills",  label: "Skills",  icon: Zap,      count: counts.skills },
    { id: "stats",   label: "Stats",   icon: BarChart3 },
  ]

  return (
    <div className="flex items-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/50 p-1.5">
        {tabs.map((tab) => {
          const active = selectedTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-[var(--primary)]/10 text-foreground border border-[var(--primary)]/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <tab.icon className={cn("h-4 w-4", active ? "text-[var(--primary)]" : "text-current")} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                  active ? "bg-muted text-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
