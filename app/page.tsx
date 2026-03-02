"use client"

import { useState, useMemo } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { HeroBanner } from "@/components/marketplace/hero-banner"
import { NavTabs } from "@/components/marketplace/nav-tabs"
import { PluginCard, ContributeCard } from "@/components/marketplace/plugin-card"
import { assets } from "@/lib/mock-data"
import { Search, ChevronDown, Copy } from "lucide-react"

export default function MarketplacePage() {
  const [selectedTab, setSelectedTab] = useState("plugins")
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [sortBy, setSortBy] = useState("Name")

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        searchQuery === "" ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.summary.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [searchQuery])

  // Counts for tabs
  const counts = {
    plugins: assets.filter(a => a.type === "mcp-tool" || a.type === "mcp-server").length,
    skills: assets.reduce((acc, a) => acc + a.capabilities.length, 0),
    agents: assets.filter(a => a.type === "agent").length,
  }

  // Get tab title
  const getTabTitle = () => {
    switch (selectedTab) {
      case "plugins": return "Discover Plugins"
      case "skills": return "Discover Skills"
      case "agents": return "Discover Agents"
      case "stats": return "Marketplace Stats"
      default: return "Discover Plugins"
    }
  }

  const getTabDescription = () => {
    switch (selectedTab) {
      case "plugins": return "Browse and install plugins for Copilot and Claude."
      case "skills": return "Explore skills that extend agent capabilities."
      case "agents": return "Find AI agents for healthcare RCM automation."
      case "stats": return "View marketplace analytics and trends."
      default: return "Browse and install plugins for Copilot and Claude."
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      
      <main className="ml-64 p-6">
        {/* Hero Banner */}
        <div className="mb-6">
          <HeroBanner />
        </div>
        
        {/* Navigation Tabs */}
        <div className="mb-8">
          <NavTabs
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
            counts={counts}
          />
        </div>
        
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="mb-2 text-3xl font-light text-cyan-400">
            {getTabTitle()}
          </h2>
          <p className="text-muted-foreground">
            {getTabDescription().split("plugins").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="text-purple-400">plugins</span>}
              </span>
            ))}
          </p>
        </div>
        
        {/* Install Command */}
        <div className="mb-6 inline-flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-2.5">
          <span className="text-sm text-muted-foreground">Install any plugin in one command:</span>
          <code className="text-sm">
            <span className="text-cyan-400">/plugin install</span>
            <span className="text-emerald-400"> {'<name>'}@agency-playground</span>
          </code>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins..."
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {category}
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sort by {sortBy}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        
        {/* Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Contribute Card */}
          <ContributeCard />
          
          {/* Plugin Cards */}
          {filteredAssets.map((asset) => (
            <PluginCard key={asset.id} asset={asset} />
          ))}
        </div>
        
        {filteredAssets.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">No plugins found</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Try adjusting your search to find what you're looking for.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
