"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { imdeDemoScenario } from "@/lib/imde-demo-data"
import {
  ArrowLeft,
  Clock,
  User,
  GitBranch,
  Star,
  Share2,
  Download,
  Globe,
  FileCode,
  X,
} from "lucide-react"
import Link from "next/link"

// Only the starter notebook ships as a real JupyterLite-backed editor today.
// Other notebooks render preview-only; their Open Editor button is disabled
// with a "Coming soon" tooltip until they each get a corresponding .ipynb.
const STARTER_NOTEBOOK_ID = "starter"
const JUPYTERLITE_NOTEBOOK_URL =
  "/jupyterlite/notebooks/index.html?path=starter.ipynb"

// Mock notebook data - replace with API call when backend is ready
const mockNotebooks = [
  {
    id: "starter",
    name: "RCM Denial Prediction Starter",
    description: "Get started with denial prediction using Revenue Cycle data",
    author: "Priya Shah",
    team: "Revenue Cycle AI Lab",
    tags: ["rcm", "denial", "classification"],
    lastModified: "2024-12-15",
    version: "1.0.0",
    status: "active" as const,
    visibility: "org" as const,
    stars: 45,
    forks: 12,
    commits: 23,
    sandbox: imdeDemoScenario.id,
    runTime: "5 min",
    content: `# Revenue Cycle Denial Prediction

## Objective
Build a classifier to predict claim denials based on historical patterns.

## Data Overview
- **Training Set**: 10K+ claims with outcomes
- **Features**: Claim details, provider info, patient demographics
- **Target**: Binary (Approved/Denied)

## Quick Start
1. Load the training data
2. Explore patterns
3. Train a baseline model
4. Evaluate performance

## Next Steps
- Feature engineering
- Model tuning
- Production deployment`,
  },
  {
    id: "advanced-feature-engineering",
    name: "Advanced Feature Engineering for RCM",
    description: "Deep dive into feature engineering techniques for denial prediction",
    author: "Morgan Lee",
    team: "Revenue Cycle AI Lab",
    tags: ["rcm", "features", "engineering"],
    lastModified: "2024-12-10",
    version: "2.1.0",
    status: "active" as const,
    visibility: "team" as const,
    stars: 28,
    forks: 8,
    commits: 15,
    sandbox: imdeDemoScenario.id,
    runTime: "12 min",
    content: `# Advanced Feature Engineering for RCM

## Feature Categories
1. **Temporal Features**: Claim timing, seasonal patterns
2. **Provider Features**: Historical rejection rates, specialty
3. **Patient Features**: Demographics, risk profiles
4. **Clinical Features**: Diagnosis codes, procedure types

## Engineering Techniques
- Aggregations by provider
- Rolling window statistics
- Interaction terms
- Encoding categorical variables

## Validation
- Cross-validation strategy
- Holdout test set
- Feature importance analysis`,
  },
]

export default function NotebookDetailPage() {
  const params = useParams()
  const notebookId = params.id as string
  const [editorOpen, setEditorOpen] = useState(false)

  const notebook = mockNotebooks.find((n) => n.id === notebookId)
  const hasEditor = notebook?.id === STARTER_NOTEBOOK_ID

  if (!notebook) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <div className="app-shell-offset flex-1 p-6">
          <div className="mx-auto w-full max-w-7xl">
            <Link href="/imde/notebooks">
              <Button variant="ghost" size="sm" className="gap-2 mb-6">
                <ArrowLeft className="h-4 w-4" />
                Back to Notebooks
              </Button>
            </Link>
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Notebook not found</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="app-shell-offset flex-1 p-6">
        <div className="mx-auto w-full max-w-7xl">
          {/* Header */}
          <Link href="/imde/notebooks">
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Notebooks
            </Button>
          </Link>

          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{notebook.name}</h1>
                <p className="text-muted-foreground">{notebook.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  disabled={!hasEditor}
                  title={hasEditor ? undefined : "Coming soon"}
                  onClick={hasEditor ? () => setEditorOpen((prev) => !prev) : undefined}
                  className="gap-2 bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60"
                >
                  {editorOpen && hasEditor ? (
                    <>
                      <X className="h-4 w-4" />
                      Close Editor
                    </>
                  ) : (
                    <>
                      <FileCode className="h-4 w-4" />
                      Open Editor
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {notebook.author} · {notebook.team}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Modified {notebook.lastModified}
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                v{notebook.version}
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                {notebook.stars} stars
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex gap-2 mt-4">
              <Badge variant="outline" className="gap-1.5">
                <Globe className="h-3 w-3" />
                {notebook.visibility}
              </Badge>
              <Badge
                variant="outline"
                className={
                  notebook.status === "active" ? "bg-green-500/10 text-green-700" : ""
                }
              >
                {notebook.status}
              </Badge>
            </div>
          </div>

          <Separator className="mb-8" />

          {/* Notebook Preview / Editor */}
          <div className="grid grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="col-span-3">
              {editorOpen && hasEditor ? (
                <Card className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">JupyterLite Editor</CardTitle>
                      <CardDescription>
                        Outputs are pre-baked so the demo always renders · live kernel execution via Pyodide is optional
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-300">
                      live
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Cross-origin isolation is provided by COOP/COEP headers
                        scoped to /jupyterlite/:path* in next.config.ts. */}
                    <iframe
                      src={JUPYTERLITE_NOTEBOOK_URL}
                      title="JupyterLite starter notebook"
                      className="w-full h-[80vh] border-0"
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notebook Preview</CardTitle>
                    <CardDescription>
                      {hasEditor
                        ? 'Full notebook editor will open when you click "Open Editor"'
                        : "Editor coming soon for this notebook"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap break-words">
                      {notebook.content}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sandbox</p>
                    <p className="text-sm font-mono">{notebook.sandbox}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Runtime</p>
                    <p className="text-sm">{notebook.runTime}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Commits</p>
                    <p className="text-sm">{notebook.commits}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Forks</p>
                    <p className="text-sm">{notebook.forks}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {notebook.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
