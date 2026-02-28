"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/marketplace/header"
import { Sidebar } from "@/components/marketplace/sidebar"
import { AssetCard } from "@/components/marketplace/asset-card"
import { SearchInput } from "@/components/marketplace/search-input"
import { Button } from "@/components/ui/button"
import { assets } from "@/lib/mock-data"
import { ExternalLink, Grid, List } from "lucide-react"
import Link from "next/link"

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCategory =
        selectedCategory === "All Categories" ||
        asset.category === selectedCategory
      const matchesSearch =
        searchQuery === "" ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  const featuredAssets = assets.filter((a) => a.publisherVerified).slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        <Sidebar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        
        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Marketplace</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Installed Assets
              </Button>
              <Link href="/orchestration">
                <Button size="sm" className="gap-2">
                  Open Orchestration
                </Button>
              </Link>
            </div>
          </div>

          <div className="mb-6">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search assets..."
            />
          </div>

          {selectedCategory === "All Categories" && searchQuery === "" && (
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-foreground">Featured Assets</h2>
                  <p className="text-sm text-muted-foreground">
                    Verified integrations you can easily add to your project.{" "}
                    <a href="#" className="text-accent hover:underline inline-flex items-center gap-1">
                      Learn more <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {featuredAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} variant="card" />
                ))}

                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <p className="mb-1 text-sm text-foreground">
                    Join the <strong>Azure AI Marketplace</strong>
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Reach developers in the Azure ecosystem and offer your solution to millions of users.
                  </p>
                  <Button variant="outline" size="sm">
                    Become a Publisher
                  </Button>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-foreground">
                  {selectedCategory === "All Categories" ? "All Assets" : selectedCategory}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {filteredAssets.length} assets available
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-border p-1">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewMode === "list" ? (
              <div className="space-y-2">
                {filteredAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} variant="list" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} variant="card" />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
