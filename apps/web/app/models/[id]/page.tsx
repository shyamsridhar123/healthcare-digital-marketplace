"use client"

import { use, useEffect, useState, type ElementType } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { demoPublishedModelExperience, models } from "@/lib/models-data"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Shield,
  Star,
  Users,
  Clock,
  Download,
  ExternalLink,
  Copy,
  Check,
  Zap,
  BarChart3,
  Code2,
  FileText,
  Activity,
  Cpu,
  Globe,
  AlertCircle,
  FlaskConical,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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

type Tab = "overview" | "model-card" | "api" | "changelog"

export default function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [publishedDemoModel, setPublishedDemoModel] = useState<typeof demoPublishedModelExperience | null>(null)
  const [checkedDemoState, setCheckedDemoState] = useState(id !== demoPublishedModelExperience.id)
  const model = models.find((m) => m.id === id) ?? (id === demoPublishedModelExperience.id ? (publishedDemoModel ?? demoPublishedModelExperience) : undefined)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [copied, setCopied] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<
    | {
        scenarioId: string
        output: {
          prediction: "High" | "Medium" | "Low"
          rationale: string
          reasonCode?: string
          confidence: number
        }
        latencyMs: number
      }
    | null
  >(null)

  useEffect(() => {
    if (id === demoPublishedModelExperience.id) {
      let cancelled = false

      async function loadPublishedDemoModel() {
        try {
          const response = await fetch("/api/models?demoScenarioId=imde-engagement-exception-demo&tenantId=default", { cache: "no-store" })
          if (!response.ok) return
          const payload = await response.json() as { models?: Array<typeof demoPublishedModelExperience> }
          const found = (payload.models ?? []).find((item) => item.id === demoPublishedModelExperience.id) ?? null
          if (!cancelled) setPublishedDemoModel(found)
        } finally {
          if (!cancelled) setCheckedDemoState(true)
        }
      }

      void loadPublishedDemoModel()
      return () => { cancelled = true }
    }
  }, [id])

  if (!model && !checkedDemoState) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <main className="app-shell-offset p-6 text-sm text-muted-foreground">Loading model experience...</main>
      </div>
    )
  }

  if (!model) {
    notFound()
  }

  const relatedModels = models
    .filter((m) => m.category === model.category && m.id !== model.id)
    .slice(0, 3)

  const previewScenarios =
    model.experienceType === "published-model-experience" && model.preview?.scenarios?.length
      ? model.preview.scenarios
      : null
  const selectedScenario =
    previewScenarios?.find((s) => s.id === selectedScenarioId) ?? previewScenarios?.[0] ?? null

  const handleRunPreview = () => {
    if (!selectedScenario || running) return
    const scenario = selectedScenario
    const latencyMs = Math.floor(400 + Math.random() * 501)
    setRunning(true)
    setResult(null)
    void fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: model.id,
        sessionType: "preview",
        input: { scenarioId: scenario.id, inputText: scenario.inputText },
        config: { previewType: "classification-playground" },
      }),
    }).catch(() => {
      // Fire-and-forget audit emit; UI must not depend on this succeeding.
    })
    setTimeout(() => {
      setResult({
        scenarioId: scenario.id,
        output: scenario.output,
        latencyMs,
      })
      setRunning(false)
    }, latencyMs)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { id: Tab; label: string; icon: ElementType }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "model-card", label: "Model Card", icon: BarChart3 },
    { id: "api", label: "API / SDK", icon: Code2 },
    { id: "changelog", label: "Changelog", icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <main className="app-shell-offset p-6">
        {/* Breadcrumb */}
        <Link
          href="/models"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Model Marketplace
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--brand-primary)]/20">
                  <Brain className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold text-foreground">{model.name}</h1>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", statusColors[model.status])}>
                      {model.status}
                    </span>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", typeColors[model.type])}>
                      {model.type}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    {model.version} · by{" "}
                    <span className="text-foreground">{model.publisher}</span>
                    {model.publisherVerified && (
                      <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-[var(--accent)]" />
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={cn("h-3.5 w-3.5", i <= Math.floor(model.rating) ? "fill-[var(--warning)] text-[var(--warning)]" : "fill-muted/30 text-muted/30")}
                        />
                      ))}
                      <span className="ml-1">{model.rating}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" />
                      {model.downloads.toLocaleString()} downloads
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {model.teams} teams
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Updated{" "}
                      {new Date(model.lastUpdated).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compliance badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {model.compliance.map((badge) => (
                  <span
                    key={badge}
                    className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-3 py-0.5 text-xs text-muted-foreground"
                  >
                    <Shield className="h-3 w-3" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {model.experienceType === "published-model-experience" && model.preview && (
              <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{model.preview.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{model.preview.description}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--warning)]">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Synthetic data only
                  </span>
                </div>

                {previewScenarios ? (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pick a synthetic engagement scenario
                      </p>
                      <div className="grid gap-2">
                        {previewScenarios.map((s) => {
                          const isSelected = (selectedScenario?.id ?? null) === s.id
                          return (
                            <button
                              type="button"
                              key={s.id}
                              aria-pressed={isSelected}
                              onClick={() => {
                                if (s.id === selectedScenario?.id) return
                                setSelectedScenarioId(s.id)
                                setResult(null)
                              }}
                              disabled={running}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                isSelected
                                  ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-foreground"
                                  : "border-border bg-background/60 text-muted-foreground hover:border-[var(--primary)]/30 hover:text-foreground",
                                running && "cursor-not-allowed opacity-60"
                              )}
                            >
                              <span>{s.label}</span>
                              <span
                                aria-hidden
                                className={cn(
                                  "h-3 w-3 rounded-full border",
                                  isSelected
                                    ? "border-[var(--primary)] bg-[var(--primary)]"
                                    : "border-muted-foreground/40"
                                )}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {selectedScenario && (
                      <div className="rounded-lg border border-border bg-background/60 p-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Synthetic input</p>
                        <p className="text-sm text-foreground">{selectedScenario.inputText}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Outputs are pre-canned for this demo; no real engagement records are ever scored.
                      </p>
                      <Button
                        type="button"
                        onClick={handleRunPreview}
                        disabled={running || !selectedScenario}
                        className="gap-2 self-start bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-60 sm:self-auto"
                      >
                        {running ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Run preview
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                          Preview output
                        </p>
                        {result && (
                          <span className="text-xs text-muted-foreground">{result.latencyMs} ms</span>
                        )}
                      </div>
                      {result ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-sm text-muted-foreground">Exception risk:</span>
                            <span
                              className={cn(
                                "text-base font-semibold",
                                result.output.prediction === "High" && "text-destructive",
                                result.output.prediction === "Medium" && "text-[var(--warning)]",
                                result.output.prediction === "Low" && "text-[var(--primary)]"
                              )}
                            >
                              {result.output.prediction}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              confidence {Math.round(result.output.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{result.output.rationale}</p>
                          {result.output.reasonCode && (
                            <p className="text-xs">
                              <span className="text-muted-foreground">Reason code: </span>
                              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
                                {result.output.reasonCode}
                              </span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {running
                            ? "Scoring synthetic engagement scenario..."
                            : "Pick a synthetic engagement scenario above and click Run preview."}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Synthetic input</p>
                      <p className="text-sm text-foreground">{model.preview.sampleInput}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-3">
                      <p className="mb-2 text-xs font-semibold text-[var(--primary)]">Preview output</p>
                      <p className="text-sm text-foreground">{model.preview.sampleOutput}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex border-b border-border">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                      activeTab === tab.id
                        ? "border-[var(--accent)] text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-2 text-base font-medium text-foreground">Description</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{model.description}</p>
                    </div>

                    {model.useCases && (
                      <div>
                        <h3 className="mb-3 text-base font-medium text-foreground">Use Cases</h3>
                        <ul className="space-y-2">
                          {model.useCases.map((uc) => (
                            <li key={uc} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                              {uc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {model.tags && (
                      <div>
                        <h3 className="mb-3 text-base font-medium text-foreground">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {model.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {model.lineage && (
                      <div>
                        <h3 className="mb-3 text-base font-medium text-foreground">Sandbox Lineage</h3>
                        <div className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-sm md:grid-cols-2">
                          <div><span className="text-muted-foreground">Run:</span> {model.lineage.selectedRunId}</div>
                          <div><span className="text-muted-foreground">Base model:</span> {model.lineage.baseModelId}</div>
                          <div><span className="text-muted-foreground">Notebook:</span> {model.lineage.notebookPath}</div>
                          <div><span className="text-muted-foreground">Team:</span> {model.lineage.team}</div>
                          <div className="md:col-span-2"><span className="text-muted-foreground">Data:</span> {model.lineage.dataPackages.join(" + ")}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Model Card Tab */}
                {activeTab === "model-card" && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
                      <h3 className="mb-1 text-sm font-semibold text-foreground">Model Report Card</h3>
                      <p className="text-xs text-muted-foreground">
                        {model.experienceType === "published-model-experience"
                          ? "Demo governance evidence from a synthetic-data IMDE sandbox run."
                          : "Governance-approved documentation for production use. SOC2 & ISO27001 reviewed."}
                      </p>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <h3 className="mb-3 text-base font-medium text-foreground">Performance Benchmarks</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                          <Zap className="mx-auto mb-1 h-5 w-5 text-[var(--accent)]" />
                          <p className="text-2xl font-bold text-[var(--primary)]">{model.metrics.accuracy}%</p>
                          <p className="text-xs text-muted-foreground">Accuracy</p>
                        </div>
                        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                          <Activity className="mx-auto mb-1 h-5 w-5 text-[var(--brand-secondary-light)]" />
                          <p className="text-2xl font-bold text-foreground">{model.metrics.latency}ms</p>
                          <p className="text-xs text-muted-foreground">P95 Latency</p>
                        </div>
                        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
                          <Cpu className="mx-auto mb-1 h-5 w-5 text-[var(--brand-teal)]" />
                          <p className="text-2xl font-bold text-foreground">{model.metrics.throughput}</p>
                          <p className="text-xs text-muted-foreground">Req/min</p>
                        </div>
                      </div>
                    </div>

                    {/* Compliance */}
                    <div>
                      <h3 className="mb-3 text-base font-medium text-foreground">Compliance & Certifications</h3>
                      <div className="space-y-2">
                        {model.compliance.map((badge) => (
                          <div
                            key={badge}
                            className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-[var(--accent)]" />
                              <span className="text-sm font-medium text-foreground">{badge}</span>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {model.experienceType === "published-model-experience" ? "Recorded" : "Certified"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Intended use */}
                    <div>
                      <h3 className="mb-3 text-base font-medium text-foreground">Intended Use</h3>
                      <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                        <p>
                          This model is designed for use within professional-services engagement delivery workflows. It is NOT intended
                          for use as a standalone audit opinion, tax filing decision, or legal conclusion.
                          All outputs should be reviewed by qualified Deloitte professionals.
                        </p>
                      </div>
                    </div>

                    {model.status !== "production" && (
                      <div className="flex items-start gap-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                        <p className="text-sm text-[var(--warning)]">
                          This model is in <strong>{model.status}</strong> status and has not completed full production certification.
                          Use in non-production environments only.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* API Tab */}
                {activeTab === "api" && (
                  <div className="space-y-6">
                    {model.endpoint && (
                      <div>
                        <h3 className="mb-3 text-base font-medium text-foreground">Endpoint</h3>
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                          <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <code className="flex-1 truncate font-mono text-sm text-foreground">{model.endpoint}</code>
                          <button
                            onClick={() => handleCopy(model.endpoint!)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copied ? <Check className="h-4 w-4 text-[var(--primary)]" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="mb-3 text-base font-medium text-foreground">Python</h3>
                      <div className="rounded-lg bg-secondary p-4 font-mono text-sm">
                        <pre className="text-muted-foreground whitespace-pre-wrap">{`from azure.ai.foundry import FoundryClient

client = FoundryClient(
    endpoint="${model.endpoint ?? "https://aimarket-hub.azure.com"}",
    credential=DefaultAzureCredential()
)

response = client.models.invoke(
    model_id="${model.id}",
    input={"text": "Engagement workpaper excerpt..."},
)
print(response.result)`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-base font-medium text-foreground">TypeScript / Node.js</h3>
                      <div className="rounded-lg bg-secondary p-4 font-mono text-sm">
                        <pre className="text-muted-foreground whitespace-pre-wrap">{`import { FoundryClient } from "@azure/ai-foundry";

const client = new FoundryClient({
  endpoint: "${model.endpoint ?? "https://aimarket-hub.azure.com"}",
});

const response = await client.models.invoke({
  modelId: "${model.id}",
  input: { text: "Engagement workpaper excerpt..." },
});
console.log(response.result);`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-base font-medium text-foreground">cURL</h3>
                      <div className="rounded-lg bg-secondary p-4 font-mono text-sm">
                        <pre className="text-muted-foreground whitespace-pre-wrap">{`curl -X POST \\
  "${model.endpoint ?? "https://aimarket-hub.azure.com"}/invoke" \\
  -H "Authorization: Bearer $AZURE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"text": "Engagement workpaper excerpt..."}}'`}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Changelog Tab */}
                {activeTab === "changelog" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{model.version}</span>
                        <span className="rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">Latest</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(model.lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                          Performance improvements and latency optimization
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                          {model.experienceType === "published-model-experience" ? "Published synthetic-data lineage evidence" : "Updated compliance certifications"}
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                          Bug fixes and stability improvements
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Link href={`/orchestration?add=${model.id}`}>
                <Button className="w-full bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white">
                  Add to Workflow
                </Button>
              </Link>
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View in Azure AI Foundry
              </Button>

              {model.endpoint && (
                <div className="rounded-md bg-secondary p-3">
                  <p className="mb-2 text-xs text-muted-foreground">Quick install</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate font-mono text-xs text-foreground">
                      az ai model install {model.id}
                    </code>
                    <button
                      onClick={() => handleCopy(`az ai model install ${model.id}`)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-[var(--primary)]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">Details</h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="text-foreground">{model.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="capitalize text-foreground">{model.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="text-foreground">{model.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="capitalize text-foreground">{model.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd className="text-foreground">
                    {new Date(model.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Active Teams</dt>
                  <dd className="text-foreground">{model.teams}</dd>
                </div>
              </dl>
            </div>

            {/* Performance summary */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">Performance</h3>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-medium text-[var(--primary)]">{model.metrics.accuracy}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${model.metrics.accuracy}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">P95 Latency</span>
                  <span className="text-foreground">{model.metrics.latency}ms</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Max Throughput</span>
                  <span className="text-foreground">{model.metrics.throughput} req/min</span>
                </div>
              </div>
            </div>

            {/* Related models */}
            {relatedModels.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-medium text-foreground">Related Models</h3>
                <div className="space-y-3">
                  {relatedModels.map((related) => (
                    <Link
                      key={related.id}
                      href={`/models/${related.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{related.name}</p>
                        <p className="text-xs text-muted-foreground">{related.publisher}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
