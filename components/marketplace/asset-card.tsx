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
  BadgeCheck
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

export function AssetCard({ asset, variant = "list" }: AssetCardProps) {
  const Icon = iconMap[asset.icon] || Brain

  if (variant === "card") {
    return (
      <Link href={`/asset/${asset.id}`}>
        <div className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/50">
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
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {asset.description}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {asset.publisher}
              {asset.publisherVerified && (
                <BadgeCheck className="h-3 w-3 text-accent" />
              )}
            </span>
            <span className="text-border">|</span>
            <span>{asset.downloads.toLocaleString()} installs</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/50">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href={`/asset/${asset.id}`}
              className="font-medium text-foreground hover:text-accent"
            >
              {asset.name}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{asset.description}</span>
            <Badge 
              variant="outline"
              className="ml-2 text-xs"
            >
              {asset.pricing}
            </Badge>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm">
        Add
      </Button>
    </div>
  )
}
