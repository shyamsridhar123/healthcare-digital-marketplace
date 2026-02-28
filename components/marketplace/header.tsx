"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Bell, HelpCircle, Settings, ChevronDown, Search } from "lucide-react"

const navItems = [
  { label: "Model catalog", href: "/" },
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
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-500" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5z" opacity="0.8" />
                <path d="M2 17l10 5 10-5" opacity="0.6" />
                <path d="M2 12l10 5 10-5" opacity="0.4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-foreground">Azure AI Foundry</span>
          </Link>
          
          <div className="h-4 w-px bg-border" />
          
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <span>Healthcare RCM</span>
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
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-t" />
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
          
          <div className="ml-2 h-4 w-px bg-border" />
          
          <button className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            HC
          </button>
        </div>
      </div>
    </header>
  )
}
