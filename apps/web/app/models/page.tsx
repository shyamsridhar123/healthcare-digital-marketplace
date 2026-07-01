"use client"

import { useEffect, useState, useMemo } from "react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { 
  Search, 
  ChevronDown, 
  Brain, 
  Shield, 
  BarChart3, 
  Eye, 
  FileText,
  CheckCircle2,
  Clock,
  Users,
  Star,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Copy,
  ExternalLink,
  Filter,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { demoPublishedModelExperience, models, type ModelData } from "@/lib/models-data"

const categories = ["All Categories", "NLP", "Vision", "Prediction", "Analytics"]
const types = ["All Types", "Internal", "Partner"]
const statuses = ["All Status", "Production", "Beta", "Review", "Demo Ready"]

function ModelCard({ model }: { model: ModelData }) {
  const statusColors: Record<string, string> = {
    production: "bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30",
    "demo-ready": "bg-secondary text-muted-foreground border-border",
    beta: "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30",
    review: "bg-secondary text-muted-foreground border-border",
  }
  
  const typeColors: Record<string, string> = {
    internal: "bg-secondary text-muted-foreground",
    partner: "bg-secondary text-muted-foreground",
  }

  return (
    <Link href={`/models/${model.id}`} className="group block">
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-[var(--accent)]/40 hover:bg-card/80">
        {model.experienceType === "published-model-experience" && model.preview && (
          <div className="mb-4 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--primary)]">Runnable preview</span>
              <span className="rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[10px] text-[var(--primary)]">Ready</span>
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{model.preview.sampleOutput}</p>
          </div>
        )}
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--brand-primary)]/20">
            <Brain className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "rounded px-2 py-0.5 text-xs font-medium",
              typeColors[model.type]
            )}>
              {model.type}
            </span>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              statusColors[model.status]
            )}>
              {model.status}
            </span>
          </div>
        </div>
        
        {/* Title and Version */}
        <div className="mb-2">
          <h3 className="text-base font-semibold text-foreground group-hover:text-[var(--accent)] transition-colors">
            {model.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {model.version} · by {model.publisher}
            {model.publisherVerified && (
              <CheckCircle2 className="ml-1 inline h-3 w-3 text-[var(--accent)]" />
            )}
          </p>
        </div>
        
        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {model.description}
        </p>
        
        {/* Metrics */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/50 p-2 text-center">
            <p className="text-xs text-muted-foreground">Accuracy</p>
            <p className="text-sm font-semibold text-[var(--primary)]">{model.metrics.accuracy}%</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2 text-center">
            <p className="text-xs text-muted-foreground">Latency</p>
            <p className="text-sm font-semibold text-foreground">{model.metrics.latency}ms</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2 text-center">
            <p className="text-xs text-muted-foreground">Teams</p>
            <p className="text-sm font-semibold text-foreground">{model.teams}</p>
          </div>
        </div>
        
        {/* Compliance Badges */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {model.trustStatus && (
            <span className="flex items-center gap-1 rounded bg-[var(--primary)]/15 px-2 py-0.5 text-xs text-[var(--primary)]">
              <CheckCircle2 className="h-3 w-3" />
              Governance passed
            </span>
          )}
          {model.compliance.map((badge) => (
            <span
              key={badge}
              className="flex items-center gap-1 rounded bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground"
            >
              <Shield className="h-3 w-3" />
              {badge}
            </span>
          ))}
        </div>
        
        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={cn(
                  "h-3 w-3",
                  i <= Math.floor(model.rating)
                    ? "fill-[var(--warning)] text-[var(--warning)]"
                    : "fill-muted/30 text-muted/30"
                )}
              />
            ))}
            <span className="ml-1.5 text-xs text-muted-foreground">{model.rating}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {model.experienceType ? <Copy className="h-3 w-3" /> : <Users className="h-3 w-3" />}
              {model.experienceType ? `${model.reuse?.duplicates ?? 0} duplicates` : model.downloads.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(model.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function ModelMarketplacePage() {
  const [publishedDemoModels, setPublishedDemoModels] = useState<ModelData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedType, setSelectedType] = useState("All Types")
  const [selectedStatus, setSelectedStatus] = useState("All Status")

  useEffect(() => {
    let cancelled = false

    async function loadPublishedDemoModels() {
      try {
        const response = await fetch("/api/models?demoScenarioId=imde-engagement-exception-demo&tenantId=default", { cache: "no-store" })
        if (!response.ok) return
        const payload = await response.json() as { models?: ModelData[] }
        const demoModels = (payload.models ?? []).filter((model) => model.id === demoPublishedModelExperience.id)
        if (!cancelled) setPublishedDemoModels(demoModels)
      } catch {
        if (!cancelled) setPublishedDemoModels([])
      }
    }

    void loadPublishedDemoModels()
    return () => { cancelled = true }
  }, [])

  const marketplaceModels = useMemo(
    () => [...publishedDemoModels, ...models],
    [publishedDemoModels]
  )

  const filteredModels = useMemo(() => {
    return marketplaceModels.filter((model) => {
      const matchesSearch =
        searchQuery === "" ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        selectedCategory === "All Categories" || model.category === selectedCategory
      const matchesType =
        selectedType === "All Types" || model.type.toLowerCase() === selectedType.toLowerCase()
      const matchesStatus =
        selectedStatus === "All Status" || model.status.replace(/-/g, " ").toLowerCase() === selectedStatus.toLowerCase()
      return matchesSearch && matchesCategory && matchesType && matchesStatus
    })
  }, [marketplaceModels, searchQuery, selectedCategory, selectedType, selectedStatus])

  // Stats
  const stats = {
    total: marketplaceModels.length,
    production: marketplaceModels.filter(m => m.status === "production").length,
    internal: marketplaceModels.filter(m => m.type === "internal").length,
    partner: marketplaceModels.filter(m => m.type === "partner").length,
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      
      <main className="app-shell-offset p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Model Marketplace</h1>
              <p className="mt-1 text-muted-foreground">
                One-stop registry for AI models — discover, govern, and reuse across teams
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Documentation
              </Button>
              <Link href="/models/register">
                <Button size="sm" className="gap-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white">
                  <Plus className="h-4 w-4" />
                  Register Model (BYOM)
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/20">
                <Brain className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Models</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success)]/20">
                <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.production}</p>
                <p className="text-xs text-muted-foreground">In Production</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary)]/20">
                <Users className="h-5 w-5 text-[var(--brand-secondary-light)]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.internal}</p>
                <p className="text-xs text-muted-foreground">Internal Models</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-teal)]/20">
                <ExternalLink className="h-5 w-5 text-[var(--brand-teal)]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.partner}</p>
                <p className="text-xs text-muted-foreground">Partner/BYOM Models</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Value Proposition - Nebula-X PRD Aligned */}
        <div className="mb-8 rounded-xl border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/5 to-[var(--brand-primary)]/5 p-6">
          <div className="flex items-start gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/20">
              <Shield className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Governed Model Registry with BYOM Support</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every model (internal or from partners) is registered with metadata, documented with Model Report Cards, 
                and monitored centrally. Models move through <span className="text-[var(--accent)]">Draft → Review → Approved</span> before 
                production use. Share innovations so one team's model benefits others, while enforcing SOC2/ISO27001 standards
                and avoiding duplicate development. MCP-Server integration ensures all models are exposed for agentic workflows.
              </p>
            </div>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models by name or description..."
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
            />
          </div>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {selectedCategory}
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {selectedType}
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {selectedStatus}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        
        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredModels.length} models
        </div>
        
        {/* Model Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
        
        {filteredModels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">No models found</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Try adjusting your filters to find what you're looking for.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
