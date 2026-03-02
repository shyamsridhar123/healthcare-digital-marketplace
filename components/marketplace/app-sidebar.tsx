"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  Brain,
  Bot,
  Workflow,
  Shield,
  BarChart3,
  Settings,
  HelpCircle,
  Sparkles,
  Package,
  ChevronRight,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
  badgeColor?: string
  description?: string
}

const mainNavItems: NavItem[] = [
  {
    label: "Agent Marketplace",
    href: "/",
    icon: Bot,
    badge: "New",
    badgeColor: "bg-emerald-500/20 text-emerald-400",
    description: "Discover AI agents and plugins",
  },
  {
    label: "Model Marketplace",
    href: "/models",
    icon: Brain,
    badge: "Beta",
    badgeColor: "bg-purple-500/20 text-purple-400",
    description: "AI models registry and governance",
  },
]

const workspaceNavItems: NavItem[] = [
  {
    label: "Orchestration",
    href: "/orchestration",
    icon: Workflow,
    description: "Build multi-agent workflows",
  },
  {
    label: "Deployments",
    href: "/deployments",
    icon: Package,
    description: "Manage deployed assets",
  },
  {
    label: "Governance",
    href: "/governance",
    icon: Shield,
    description: "Policies and compliance",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Usage and performance metrics",
  },
]

const bottomNavItems: NavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Help & Support",
    href: "/help",
    icon: HelpCircle,
  },
]

function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <div className="mb-6">
      {title && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive 
                    ? "bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-400" 
                    : "bg-secondary/50 text-muted-foreground group-hover:text-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium",
                        item.badgeColor || "bg-secondary text-muted-foreground"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="truncate text-xs text-muted-foreground/70">
                      {item.description}
                    </p>
                  )}
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-cyan-400" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card/50">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">Agency</span>
          <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-400">
            Playground
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <NavSection title="Marketplaces" items={mainNavItems} />
        <NavSection title="Workspace" items={workspaceNavItems} />
      </nav>
      
      {/* Bottom section */}
      <div className="border-t border-border p-4">
        <NavSection items={bottomNavItems} />
        
        {/* Organization Badge */}
        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Healthcare RCM</p>
              <p className="text-xs text-muted-foreground">Enterprise Workspace</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
