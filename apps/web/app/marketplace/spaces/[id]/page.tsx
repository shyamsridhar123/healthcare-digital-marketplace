"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  GitFork,
  Heart,
  MessageSquare,
  Play,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { spaces } from "@/lib/mock-data"

interface ChatMessage {
  role: "visitor" | "space"
  content: string
}

function spaceReply(prompt: string) {
  const normalized = prompt.toLowerCase()
  if (normalized.includes("carc") || normalized.includes("197")) {
    return "Control exception EX-197 usually points to missing or invalid approval evidence. For this engagement-confidential scenario, the Space estimates high exception risk and recommends checking approval workflow evidence, regulator-specific policy, and submission timing before remediation."
  }
  if (normalized.includes("appeal") || normalized.includes("evidence")) {
    return "Recommended remediation package: approval confirmation, regulatory rationale summary, original transaction timeline, regulator policy excerpt, and exception-code mapping. This response is generated from the published snapshot only; no source data or credentials are copied to the visitor."
  }
  return "Estimated exception risk: 72% high. Top drivers are approval-workflow mismatch, regulator-policy variance, and historical finding patterns for the transaction group. Try seeding a sandbox to inspect the immutable agent definition and adapt it for your team."
}

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const space = spaces.find((item) => item.id === id)
  const [prompt, setPrompt] = useState(space?.examplePrompts[0] ?? "")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "space",
      content:
        "Hi, I am the Audit Exception Copilot Space. Enter an engagement-confidential transaction scenario and I will explain exception risk drivers from the published snapshot.",
    },
  ])
  const [seeded, setSeeded] = useState(false)
  const [toast, setToast] = useState(false)

  if (!space) {
    notFound()
  }

  const budgetPercent = Math.round((space.usedTokens / space.dailyTokenBudget) * 100)

  const statusCopy = useMemo(() => {
    switch (space.runtimeState) {
      case "live":
        return "Live and ready"
      case "sleeping":
        return "Sleeping; first message wakes runtime"
      case "waking":
        return "Waking runtime"
      case "budget-exhausted":
        return "Daily budget exhausted"
      case "capacity-unavailable":
        return "Capacity unavailable"
      case "access-revoked":
        return "Access revoked"
      default:
        return "Unavailable"
    }
  }, [space.runtimeState])

  const sendMessage = () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    setMessages((current) => [
      ...current,
      { role: "visitor", content: trimmed },
      { role: "space", content: spaceReply(trimmed) },
    ])
    setPrompt("")
  }

  const seedSandbox = () => {
    setSeeded(true)
    setToast(true)
    setTimeout(() => setToast(false), 3500)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="app-shell-offset p-6">
        {toast && (
          <div className="fixed right-6 top-6 z-50 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-3 text-sm text-[var(--primary)] shadow-lg">
            Sandbox draft seeded from {space.snapshotVersion}. No source data or secrets were copied.
          </div>
        )}

        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <Card className="border-border bg-secondary/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-secondary text-muted-foreground border-border">IMDE Space</Badge>
                      <Badge variant="outline" className="gap-1">
                        <BadgeCheck className="h-3 w-3 text-[var(--primary)]" />
                        {space.visibility} visible
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Play className="h-3 w-3 text-[var(--primary)]" />
                        {statusCopy}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-3xl">{space.name}</CardTitle>
                      <CardDescription className="mt-2 max-w-2xl text-sm">{space.description}</CardDescription>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-right">
                    <div className="text-2xl font-semibold text-foreground">{space.runCount}</div>
                    <div className="text-xs text-muted-foreground">teammate runs</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  Try the Space
                </CardTitle>
                <CardDescription>
                  Chat-only v1: no visitor file uploads. Use engagement-confidential scenarios only.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3 text-xs text-[var(--warning)]">
                  Engagement-confidential warning: do not paste client names, engagement IDs, source documents, or credentials. This demo stores no raw visitor transcript.
                </div>

                <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-lg border border-border bg-background/60 p-4">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === "visitor" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-lg px-3 py-2 text-sm ${
                          message.role === "visitor"
                            ? "bg-[var(--primary)] text-white"
                            : "border border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2">
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Enter an engagement-confidential transaction scenario..."
                    className="min-h-24"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {space.examplePrompts.slice(0, 2).map((example) => (
                        <Button key={example} variant="outline" size="sm" onClick={() => setPrompt(example)}>
                          Example
                        </Button>
                      ))}
                    </div>
                    <Button onClick={sendMessage} className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90">
                      <Sparkles className="h-4 w-4" />
                      Run Space
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitFork className="h-4 w-4 text-[var(--primary)]" />
                  Use this agent
                </CardTitle>
                <CardDescription>Seed your own sandbox from the sanitized snapshot.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={seedSandbox} className="w-full gap-2" variant={seeded ? "secondary" : "default"}>
                  {seeded ? <CheckCircle2 className="h-4 w-4" /> : <GitFork className="h-4 w-4" />}
                  {seeded ? "Sandbox draft seeded" : "Use this agent"}
                </Button>
                <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                  Draft name: <span className="font-medium text-foreground">{space.seededSandboxName}</span>
                  <br />
                  Copies: instructions, model settings, schema, and safe tool references.
                  <br />
                  Does not copy: source data, notebooks, credentials, runtime threads, or chat logs.
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Snapshot provenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Publisher</span>
                  <span className="text-right text-foreground">{space.publisher}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Source sandbox</span>
                  <span className="text-right text-foreground">{space.sourceSandbox}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Snapshot</span>
                  <span className="text-right font-mono text-xs text-foreground">{space.snapshotVersion}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Hash</span>
                  <span className="text-right font-mono text-xs text-foreground">{space.snapshotHash}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Model</span>
                  <span className="text-right text-foreground">{space.model}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-[var(--warning)]" />
                  Daily budget
                </CardTitle>
                <CardDescription>Demo token proxy from the Spaces plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{space.usedTokens.toLocaleString()} used</span>
                  <span className="text-foreground">{budgetPercent}%</span>
                </div>
                <Progress value={budgetPercent} className="h-2" />
                <div className="text-xs text-muted-foreground">{space.dailyTokenBudget.toLocaleString()} token daily cap</div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-[var(--primary)]" />
                  Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {space.guardrails.map((guardrail) => (
                  <div key={guardrail} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--primary)]" />
                    {guardrail}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Data references
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {space.dataRefs.map((dataRef) => (
                  <Badge key={dataRef} variant="outline" className="mr-2">
                    {dataRef}
                  </Badge>
                ))}
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Updated {new Date(space.updatedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
