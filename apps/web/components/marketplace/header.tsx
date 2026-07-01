"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { NebulaLogo } from "@/components/ui/nebula-logo"
import { Bell, HelpCircle, Settings, ChevronDown, Search } from "lucide-react"

const navItems = [
  { label: "Agent Catalog", href: "/" },
  { label: "Orchestration", href: "/orchestration" },
  { label: "Deployments", href: "/deployments" },
  { label: "Governance", href: "/governance" },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-12 items-center px-4">
        {/* Logo and Project Selector */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent-light)]">
              <NebulaLogo className="h-5 w-5 text-[#0C0C0C]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Nebula-X</span>
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                Playground
              </span>
            </div>
          </Link>
          
          <div className="h-4 w-px bg-border" />
          
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <span>Professional Services</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="ml-8 flex items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-3 py-3.5 text-sm transition-colors",
                pathname === item.href || (item.href === "/" && pathname === "/")
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              {(pathname === item.href || (item.href === "/" && pathname === "/")) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--primary)] rounded-t" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
          <ModeToggle />
          
          <div className="ml-2 h-4 w-px bg-border" />
          
          <button className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">
            NX
          </button>
        </div>
      </div>
    </header>
  )
}
