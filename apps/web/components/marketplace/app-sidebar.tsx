"use client"

import * as React from "react"
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
  Package,
  ChevronRight,
  Rocket,
  Code2,
  Activity,
  Users,
  Building2,
  FlaskConical,
  BookOpen,
  GitBranch,
  RefreshCw,
  Upload,
  Database,
  HardDrive,
  Table2,
  Layers,
  Sparkles,
  Grid3X3,
  CloudCog,
  Server,
  Zap,
  ShieldCheck,
  LogOut,
  Menu,
  PanelLeft,
  X,
} from "lucide-react"
import { useAccount, useMsal } from "@azure/msal-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
  badgeColor?: string
  description?: string
}

const SIDEBAR_STORAGE_KEY = "ai-marketplace.sidebar-collapsed"
const SIDEBAR_EXPANDED_WIDTH = "16rem"
const SIDEBAR_COLLAPSED_WIDTH = "5rem"

// UAP Marketplaces
const marketplaceItems: NavItem[] = [
  {
    label: "Agent Marketplace",
    href: "/",
    icon: Bot,
    description: "Reusable AI agents library",
  },
  {
    label: "Model Marketplace",
    href: "/models",
    icon: Brain,
    badge: "BYOM",
    badgeColor: "bg-[var(--accent)]/20 text-[var(--accent)]",
    description: "Governed AI models registry",
  },
]

// IMDE sub-navigation items
export const imdeSubItems: NavItem[] = [
  {
    label: "Workspace",
    href: "/imde",
    icon: Code2,
    description: "Sandboxes & compute",
  },
  {
    label: "Notebooks",
    href: "/imde/notebooks",
    icon: BookOpen,
    description: "Shared Jupyter notebooks",
  },
  {
    label: "Experiments",
    href: "/imde/experiments",
    icon: FlaskConical,
    description: "Run tracking & comparison",
  },
  {
    label: "Push to Marketplace",
    href: "/imde/push",
    icon: Upload,
    description: "One-command publish",
  },
  {
    label: "Collaboration",
    href: "/imde/collaboration",
    icon: GitBranch,
    description: "Version control & audit",
  },
  {
    label: "Improvement Loop",
    href: "/imde/improvement",
    icon: RefreshCw,
    badge: "Live",
    badgeColor: "bg-emerald-500/20 text-emerald-400",
    description: "Retrain from production",
  },
]

// Data sub-navigation items
export const dataSubItems: NavItem[] = [
  {
    label: "Overview",
    href: "/data",
    icon: Grid3X3,
    description: "All data sources & activity",
  },
  {
    label: "Azure Storage",
    href: "/data/storage",
    icon: HardDrive,
    description: "Blobs, containers & files",
  },
  {
    label: "Azure SQL",
    href: "/data/sql",
    icon: Table2,
    description: "Databases, tables & queries",
  },
  {
    label: "Cosmos DB",
    href: "/data/cosmos",
    icon: Database,
    description: "NoSQL containers & items",
  },
  {
    label: "Microsoft Fabric",
    href: "/data/fabric",
    icon: Layers,
    description: "Lakehouses & warehouses",
  },
  {
    label: "Built-in Datasets",
    href: "/data/datasets",
    icon: Sparkles,
    badge: "Hub",
    badgeColor: "bg-sky-500/20 text-sky-400",
    description: "Curated healthcare datasets",
  },
]

// UAP Development & Deployment
const developmentItems: NavItem[] = [
  {
    label: "Agent Builder",
    href: "/orchestration",
    icon: Workflow,
    description: "Visual workflow designer",
  },
  {
    label: "IMDE",
    href: "/imde",
    icon: Code2,
    badge: "New",
    badgeColor: "bg-violet-500/20 text-violet-400",
    description: "Integrated Model Dev Environment",
  },
  {
    label: "One-Click Deploy",
    href: "/deployments",
    icon: Rocket,
    description: "CI/CD & deployment management",
  },
]

// UAP Governance & Operations
const governanceItems: NavItem[] = [
  {
    label: "Governance",
    href: "/governance",
    icon: Shield,
    description: "Compliance & audit workflows",
  },
  {
    label: "Observability",
    href: "/observability",
    icon: Activity,
    badge: "Live",
    badgeColor: "bg-emerald-500/20 text-emerald-400",
    description: "Run status: models, agents & tools",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Workflow timing, SLA & adoption",
  },
]

const bottomNavItems: NavItem[] = [
  {
    label: "Help & Docs",
    href: "/help",
    icon: HelpCircle,
  },
]

const settingsSubItems = [
  {
    label: "Infrastructure",
    href: "/settings/infrastructure",
    icon: Server,
    color: "text-sky-400",
    activeBg: "bg-sky-500/10",
    activeBorder: "border-sky-500/30",
  },
  {
    label: "Performance",
    href: "/settings/performance",
    icon: Zap,
    color: "text-amber-400",
    activeBg: "bg-amber-500/10",
    activeBorder: "border-amber-500/30",
  },
  {
    label: "Reliability",
    href: "/settings/reliability",
    icon: ShieldCheck,
    color: "text-emerald-400",
    activeBg: "bg-emerald-500/10",
    activeBorder: "border-emerald-500/30",
  },
]

function NavSection({
  title,
  items,
  indent,
  collapsed = false,
  onNavigate,
}: {
  title?: string
  items: NavItem[]
  indent?: boolean
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="mb-6">
      {title && !collapsed && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = indent
            ? pathname === item.href || (item.href !== "/imde" && pathname.startsWith(item.href))
            : pathname === item.href

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  collapsed ? "justify-center px-2.5" : "",
                  indent ? "pl-6" : "",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <span className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg transition-colors",
                  indent ? "h-6 w-6" : "h-8 w-8",
                  isActive
                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "bg-secondary/50 text-muted-foreground group-hover:text-foreground"
                )}>
                  <Icon className={indent ? "h-3.5 w-3.5" : "h-4 w-4"} />
                </span>
                <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
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
                    {!indent && item.description && (
                    <p className="truncate text-xs text-muted-foreground/70">
                      {item.description}
                    </p>
                  )}
                </div>
                  {isActive && !collapsed && (
                  <ChevronRight className="h-4 w-4 text-[var(--accent)]" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ImdeSection({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const isImde = pathname === "/imde" || pathname.startsWith("/imde/")
  const Icon = Code2
  const isMainActive = pathname === "/imde"

  return (
    <div className="mb-1">
      <Link
        href="/imde"
        onClick={onNavigate}
        title={collapsed ? "IMDE" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          collapsed ? "justify-center px-2.5" : "",
          isMainActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          isImde
            ? "bg-violet-500/20 text-violet-400"
            : "bg-secondary/50 text-muted-foreground group-hover:text-foreground"
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <div className="flex items-center gap-2">
            <span className="truncate">IMDE</span>
            <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400">New</span>
          </div>
          <p className="truncate text-xs text-muted-foreground/70">Integrated Model Dev Environment</p>
        </div>
        {!collapsed && (
          <ChevronRight className={cn("h-4 w-4 transition-transform", isImde ? "rotate-90 text-violet-400" : "text-muted-foreground/40")} />
        )}
      </Link>
      {isImde && !collapsed && (
        <ul className="mt-0.5 space-y-0.5 pl-2">
          {imdeSubItems.map((item) => {
            const SubIcon = item.icon
            const isActive = pathname === item.href || (item.href !== "/imde" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-violet-500/10 text-violet-300"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
                    isActive ? "text-violet-400" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <SubIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={cn("rounded px-1 py-0.5 text-[10px] font-medium", item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DataSection({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const isData = pathname === "/data" || pathname.startsWith("/data/")
  const Icon = Database
  const isMainActive = pathname === "/data"

  return (
    <div className="mb-1">
      <Link
        href="/data"
        onClick={onNavigate}
        title={collapsed ? "Data" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          collapsed ? "justify-center px-2.5" : "",
          isMainActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          isData
            ? "bg-sky-500/20 text-sky-400"
            : "bg-secondary/50 text-muted-foreground group-hover:text-foreground"
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <div className="flex items-center gap-2">
            <span className="truncate">Data</span>
            <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400">New</span>
          </div>
          <p className="truncate text-xs text-muted-foreground/70">Storage, SQL, Cosmos & Fabric</p>
        </div>
        {!collapsed && (
          <ChevronRight className={cn("h-4 w-4 transition-transform", isData ? "rotate-90 text-sky-400" : "text-muted-foreground/40")} />
        )}
      </Link>
      {isData && !collapsed && (
        <ul className="mt-0.5 space-y-0.5 pl-2">
          {dataSubItems.map((item) => {
            const SubIcon = item.icon
            const isActive = item.href === "/data"
              ? pathname === "/data"
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-sky-500/10 text-sky-300"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
                    isActive ? "text-sky-400" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <SubIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={cn("rounded px-1 py-0.5 text-[10px] font-medium", item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function UserSection({ collapsed = false }: { collapsed?: boolean }) {
  const { instance } = useMsal()
  const account = useAccount()

  if (!account) return null

  const initials = account.name
    ? account.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : account.username[0]?.toUpperCase() ?? "?"

  const handleSignOut = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/" }).catch(console.error)
  }

  return (
    <div className={cn("rounded-lg border border-border bg-secondary/30 p-3", collapsed && "p-2")}>
      <div className={cn("flex items-center gap-2.5", collapsed && "flex-col gap-2") }>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/20 text-xs font-bold text-[var(--accent)]">
          {collapsed ? initials.slice(0, 1) : initials}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs leading-tight font-semibold text-foreground">
              {account.name ?? account.username}
            </p>
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {account.username}
            </p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? `${account.name ?? account.username} • Sign out` : "Sign out"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function SettingsSection({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const isSettings = pathname.startsWith("/settings")

  return (
    <div className="mb-1">
      <Link
        href="/settings/infrastructure"
        onClick={onNavigate}
        title={collapsed ? "Settings" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          collapsed ? "justify-center px-2.5" : "",
          isSettings
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          isSettings
            ? "bg-slate-500/20 text-slate-300"
            : "bg-secondary/50 text-muted-foreground group-hover:text-foreground"
        )}>
          <Settings className="h-4 w-4" />
        </span>
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <span className="truncate">Settings</span>
          <p className="truncate text-xs text-muted-foreground/70">Persona-based configuration</p>
        </div>
        {!collapsed && (
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform",
            isSettings ? "rotate-90 text-slate-400" : "text-muted-foreground/40"
          )} />
        )}
      </Link>

      {isSettings && !collapsed && (
        <ul className="mt-0.5 space-y-0.5 pl-2">
          {settingsSubItems.map((item) => {
            const SubIcon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                    isActive
                      ? cn(item.activeBg, "border", item.activeBorder, item.color)
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
                    isActive ? item.color : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <SubIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DevelopmentSection({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <div className="mb-6">
      {!collapsed && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Development
        </h3>
      )}
      <ul className="space-y-1">
        <li>
          <NavSection collapsed={collapsed} onNavigate={onNavigate} items={[{ label: "Agent Builder", href: "/orchestration", icon: Workflow, description: "Visual workflow designer" }]} />
        </li>
        <li>
          <ImdeSection collapsed={collapsed} onNavigate={onNavigate} />
        </li>
        <li>
          <NavSection collapsed={collapsed} onNavigate={onNavigate} items={[{ label: "One-Click Deploy", href: "/deployments", icon: Rocket, description: "CI/CD & deployment management" }]} />
        </li>
      </ul>
    </div>
  )
}

export function AppSidebar() {
  const isMobile = useIsMobile()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  React.useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === "true")
    }
  }, [])

  React.useEffect(() => {
    const sidebarWidth = isMobile
      ? "0rem"
      : isCollapsed
        ? SIDEBAR_COLLAPSED_WIDTH
        : SIDEBAR_EXPANDED_WIDTH

    document.documentElement.style.setProperty("--app-sidebar-width", sidebarWidth)

    return () => {
      document.documentElement.style.setProperty("--app-sidebar-width", SIDEBAR_EXPANDED_WIDTH)
    }
  }, [isCollapsed, isMobile])

  const toggleSidebar = () => {
    const nextValue = !isCollapsed
    setIsCollapsed(nextValue)
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextValue))
  }

  const closeMobileSidebar = () => setIsMobileOpen(false)

  const sidebarContent = (collapsed: boolean, mobile = false) => (
    <>
      <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground">AI Asset Marketplace</span>
              <span className="text-xs text-muted-foreground">AI Marketplace Platform</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <ModeToggle />
            {mobile && (
              <Button variant="ghost" size="icon" onClick={closeMobileSidebar} aria-label="Close sidebar" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            )}
            {!mobile && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Collapse sidebar" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        {collapsed && !mobile && (
          <div className="absolute inset-x-0 top-16 flex justify-center pt-2">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Expand sidebar" className="h-8 w-8 rounded-full border border-border bg-sidebar text-muted-foreground shadow-sm hover:text-foreground">
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {collapsed && !mobile && (
        <div className="flex justify-center border-b border-border/80 px-2 py-3">
          <ModeToggle />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3">
        <NavSection title="Marketplaces" items={marketplaceItems} collapsed={collapsed} onNavigate={mobile ? closeMobileSidebar : undefined} />
        <DevelopmentSection collapsed={collapsed} onNavigate={mobile ? closeMobileSidebar : undefined} />
        <div className="mb-6">
          {!collapsed && (
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data
            </h3>
          )}
          <ul className="space-y-1">
            <li><DataSection collapsed={collapsed} onNavigate={mobile ? closeMobileSidebar : undefined} /></li>
          </ul>
        </div>
        <NavSection title="Operations" items={governanceItems} collapsed={collapsed} onNavigate={mobile ? closeMobileSidebar : undefined} />
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-1"><SettingsSection collapsed={collapsed} onNavigate={mobile ? closeMobileSidebar : undefined} /></div>
        <NavSection items={bottomNavItems} collapsed={collapsed} onNavigate={mobile ? closeMobileSidebar : undefined} />
        <div className="mt-3">
          <UserSection collapsed={collapsed} />
        </div>
      </div>
    </>
  )

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open sidebar"
        className="fixed left-4 top-4 z-50 h-10 w-10 rounded-full border border-border shadow-lg md:hidden"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-72 border-r border-border bg-sidebar p-0 md:hidden [&>button]:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <aside className="flex h-full flex-col">{sidebarContent(false, true)}</aside>
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out md:flex",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent(isCollapsed)}
      </aside>
    </>
  )
}
