"use client"

import { cn } from "@/lib/utils"
import { categories } from "@/lib/mock-data"
import {
  LayoutGrid,
  Bot,
  Server,
  Wrench,
  Brain,
  Workflow,
  FileText,
  ShieldAlert,
  Wallet,
  ClipboardCheck,
  Code2,
  CreditCard,
} from "lucide-react"

interface SidebarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

// Category configuration with colors and icons
const categoryConfig: Record<string, { 
  icon: React.ElementType
  color: string
  bgColor: string
  activeColor: string
  activeBg: string
}> = {
  "All Categories": {
    icon: LayoutGrid,
    color: "text-muted-foreground",
    bgColor: "bg-transparent",
    activeColor: "text-foreground",
    activeBg: "bg-secondary",
  },
  "AI Agents": {
    icon: Bot,
    color: "text-cat-agents",
    bgColor: "hover:bg-cat-agents-bg",
    activeColor: "text-cat-agents",
    activeBg: "bg-cat-agents-bg",
  },
  "MCP Servers": {
    icon: Server,
    color: "text-cat-mcp-servers",
    bgColor: "hover:bg-cat-mcp-servers-bg",
    activeColor: "text-cat-mcp-servers",
    activeBg: "bg-cat-mcp-servers-bg",
  },
  "MCP Tools": {
    icon: Wrench,
    color: "text-cat-mcp-tools",
    bgColor: "hover:bg-cat-mcp-tools-bg",
    activeColor: "text-cat-mcp-tools",
    activeBg: "bg-cat-mcp-tools-bg",
  },
  "Models": {
    icon: Brain,
    color: "text-cat-models",
    bgColor: "hover:bg-cat-models-bg",
    activeColor: "text-cat-models",
    activeBg: "bg-cat-models-bg",
  },
  "Workflow Templates": {
    icon: Workflow,
    color: "text-cat-workflows",
    bgColor: "hover:bg-cat-workflows-bg",
    activeColor: "text-cat-workflows",
    activeBg: "bg-cat-workflows-bg",
  },
  "Transaction Testing": {
    icon: FileText,
    color: "text-cat-transactions",
    bgColor: "hover:bg-cat-transactions-bg",
    activeColor: "text-cat-transactions",
    activeBg: "bg-cat-transactions-bg",
  },
  "Findings Management": {
    icon: ShieldAlert,
    color: "text-cat-findings",
    bgColor: "hover:bg-cat-findings-bg",
    activeColor: "text-cat-findings",
    activeBg: "bg-cat-findings-bg",
  },
  "Client Collections": {
    icon: Wallet,
    color: "text-cat-collections",
    bgColor: "hover:bg-cat-collections-bg",
    activeColor: "text-cat-collections",
    activeBg: "bg-cat-collections-bg",
  },
  "Compliance & Approval": {
    icon: ClipboardCheck,
    color: "text-cat-compliance",
    bgColor: "hover:bg-cat-compliance-bg",
    activeColor: "text-cat-compliance",
    activeBg: "bg-cat-compliance-bg",
  },
  "Tax & Cost Classification": {
    icon: Code2,
    color: "text-cat-coding",
    bgColor: "hover:bg-cat-coding-bg",
    activeColor: "text-cat-coding",
    activeBg: "bg-cat-coding-bg",
  },
  "Engagement Billing": {
    icon: CreditCard,
    color: "text-cat-payments",
    bgColor: "hover:bg-cat-payments-bg",
    activeColor: "text-cat-payments",
    activeBg: "bg-cat-payments-bg",
  },
}

export function Sidebar({ selectedCategory, onCategoryChange }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar">
      <nav className="sticky top-14 p-4">
        <div className="mb-4">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </h3>
        </div>
        <ul className="space-y-1">
          {categories.map((category) => {
            const config = categoryConfig[category] || categoryConfig["All Categories"]
            const Icon = config.icon
            const isSelected = selectedCategory === category
            
            return (
              <li key={category}>
                <button
                  onClick={() => onCategoryChange(category)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150",
                    isSelected
                      ? cn(config.activeBg, config.activeColor, "shadow-sm")
                      : cn("text-muted-foreground", config.bgColor, "hover:text-foreground")
                  )}
                >
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                    isSelected ? config.activeBg : "bg-secondary/50"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      isSelected ? config.activeColor : config.color
                    )} />
                  </span>
                  <span className="truncate">{category}</span>
                  {isSelected && (
                    <span className={cn(
                      "ml-auto h-1.5 w-1.5 rounded-full",
                      config.activeColor.replace("text-", "bg-")
                    )} />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        
        <div className="mt-6 border-t border-border pt-4">
          <div className="rounded-lg bg-secondary/30 p-3">
            <p className="text-xs font-medium text-foreground">Professional Services</p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI-powered engagement delivery for professional-services teams
            </p>
          </div>
        </div>
      </nav>
    </aside>
  )
}
