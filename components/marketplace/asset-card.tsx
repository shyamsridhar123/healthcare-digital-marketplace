"use client"

import Link from "next/link"
import { Asset } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Code, 
  Database, 
  GitBranch, 
  Table, 
  FileText, 
  Brain, 
  Eye, 
  Workflow, 
  Shield,
  BarChart,
  MessageCircle,
  BadgeCheck,
  Star,
  Calendar,
  Zap
} from "lucide-react"

const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  Code,
  Database,
  GitBranch,
  Table,
  FileText,
  Brain,
  Eye,
  Workflow,
  Shield,
  BarChart,
  MessageCircle,
}

interface AssetCardProps {
  asset: Asset
  variant?: "list" | "card"
}

// Calculate star rating based on orchestration usage
function getUsageStars(usage: number): number {
  if (usage >= 2000) return 5
  if (usage >= 1000) return 4
  if (usage >= 500) return 3
  if (usage >= 200) return 2
  return 1
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function StarRating({ stars, usage }: { stars: number; usage: number }) {
  return (
    <div className="flex items-center gap-1" title={`Used in ${usage.toLocaleString()} orchestrations`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i <= stars
              ? "fill-yellow-500 text-yellow-500"
              : "fill-muted text-muted"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{usage.toLocaleString()}</span>
    </div>
  )
}

export function AssetCard({ asset, variant = "list" }: AssetCardProps) {
  const Icon = iconMap[asset.icon] || Brain

  if (variant === "card") {
    const usageStars = getUsageStars(asset.orchestrationUsage)
    
    return (
      <Link href={`/asset/${asset.id}`}>
        <div className="group flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/50">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <Badge 
              variant={asset.pricing === "Free" ? "secondary" : "outline"}
              className="text-xs"
            >
              {asset.pricing}
            </Badge>
          </div>
          
          <h3 className="mb-1 font-medium text-foreground group-hover:text-accent">
            {asset.name}
          </h3>
          
          <p className="mb-2 text-sm font-medium text-foreground/80">
            {asset.summary}
          </p>
          
          {/* Capabilities */}
          <div className="mb-3 flex flex-wrap gap-1">
            {asset.capabilities.slice(0, 3).map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                <Zap className="h-2.5 w-2.5" />
                {cap}
              </span>
            ))}
            {asset.capabilities.length > 3 && (
              <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                +{asset.capabilities.length - 3}
              </span>
            )}
          </div>
          
          {/* Star rating based on usage */}
          <div className="mb-3">
            <StarRating stars={usageStars} usage={asset.orchestrationUsage} />
          </div>
          
          {/* Footer with publisher and date */}
          <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {asset.publisher}
              {asset.publisherVerified && (
                <BadgeCheck className="h-3 w-3 text-accent" />
              )}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(asset.publishedDate)}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  const usageStars = getUsageStars(asset.orchestrationUsage)
  
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/50">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-6 w-6 text-foreground" />
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Link 
            href={`/asset/${asset.id}`}
            className="font-medium text-foreground hover:text-accent"
          >
            {asset.name}
          </Link>
          <Badge 
            variant={asset.pricing === "Free" ? "secondary" : "outline"}
            className="text-xs"
          >
            {asset.pricing}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {asset.publisher}
            {asset.publisherVerified && (
              <BadgeCheck className="h-3 w-3 text-accent" />
            )}
          </span>
        </div>
        
        <p className="mb-2 text-sm text-foreground/80">
          {asset.summary}
        </p>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Capabilities */}
          <div className="flex flex-wrap gap-1">
            {asset.capabilities.slice(0, 4).map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                <Zap className="h-2.5 w-2.5" />
                {cap}
              </span>
            ))}
          </div>
          
          <span className="text-border">|</span>
          
          {/* Star rating */}
          <StarRating stars={usageStars} usage={asset.orchestrationUsage} />
          
          <span className="text-border">|</span>
          
          {/* Published date */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(asset.publishedDate)}
          </span>
        </div>
      </div>
      
      <Button variant="outline" size="sm" className="shrink-0">
        Add
      </Button>
    </div>
  )
}
