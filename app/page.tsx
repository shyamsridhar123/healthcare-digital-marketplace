"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/marketplace/header"
import { CategoryTabs } from "@/components/marketplace/category-tabs"
import { AssetCard } from "@/components/marketplace/asset-card"
import { SearchInput } from "@/components/marketplace/search-input"
import { Button } from "@/components/ui/button"
import { assets } from "@/lib/mock-data"
import { Filter, SlidersHorizontal } from "lucide-react"
import Link from "next/link"

export default function MarketplacePage() {
  const [selectedTab, setSelectedTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesTab =
        selectedTab === "all" ||
        asset.type === selectedTab
      const matchesSearch =
        searchQuery === "" ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.summary.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesTab && matchesSearch
    })
  }, [selectedTab, searchQuery])

  // Group assets by type for the "all" view
  const assetsByType = useMemo(() => {
    if (selectedTab !== "all") return null
    
    const groups: Record<string, typeof assets> = {}
    filteredAssets.forEach((asset) => {
      if (!groups[asset.type]) {
        groups[asset.type] = []
      }
      groups[asset.type].push(asset)
    })
    return groups
  }, [filteredAssets, selectedTab])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Sub-header with title and actions */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Agent Catalog</h1>
              <p className="text-sm text-muted-foreground">
                Discover and deploy AI agents, tools, and models for healthcare RCM
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/orchestration">
                <Button variant="outline" size="sm">
                  Open Orchestration Studio
                </Button>
              </Link>
              <Link href="/deployments">
                <Button size="sm">
                  My Deployments
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="bg-card/30">
        <div className="mx-auto max-w-7xl px-6">
          <CategoryTabs
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, capability, or publisher..."
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Sort
          </Button>
        </div>
        
        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredAssets.length} results
        </div>

        {/* Asset Grid */}
        {selectedTab === "all" && assetsByType ? (
          // Grouped view for "All" tab
          <div className="space-y-10">
            {Object.entries(assetsByType).map(([type, typeAssets]) => (
              <section key={type}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground capitalize">
                    {type.replace("-", " ").replace("mcp", "MCP")}s
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedTab(type)}
                  >
                    View all
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {typeAssets.slice(0, 4).map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          // Flat grid for specific type tabs
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
        
        {filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">No assets found</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
