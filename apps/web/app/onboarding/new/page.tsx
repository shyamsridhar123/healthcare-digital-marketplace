"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/marketplace/app-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, CheckCircle2, Clipboard, Code2, ExternalLink, GitBranch, Loader2, Terminal } from "lucide-react"

type SubmissionResult = {
  submissionId?: string
  status?: string
  currentStage?: string
  riskTier?: string
  errors?: Array<{ message: string; path?: string }>
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7071/api"

export default function OnboardingPage() {
  const [tenantId, setTenantId] = useState("contoso")
  const [name, setName] = useState("AuditScribe")
  const [version, setVersion] = useState("1.0.0")
  const [description, setDescription] = useState("Assists engagement teams with workpaper summarization and routing.")
  const [team, setTeam] = useState("engagement-platform")
  const [email, setEmail] = useState("engagement-platform@example.com")
  const [image, setImage] = useState("deloitte.azurecr.io/auditscribe:1.0.0")
  const [capabilities, setCapabilities] = useState("workpaper-summary, regulator-rules")
  const [dataCategories, setDataCategories] = useState("pii")
  const [repoUrl, setRepoUrl] = useState("https://github.com/deloitte/auditscribe")
  const [branch, setBranch] = useState("main")
  const [commitSha, setCommitSha] = useState("local-ui-submit")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const manifest = useMemo(() => ({
    name,
    version,
    description,
    owner: { team, email },
    runtime: { type: "aca", image },
    capabilities: splitList(capabilities),
    rai: { tags: ["human-in-the-loop"], data_categories: splitList(dataCategories) },
    repository: { url: repoUrl, branch },
  }), [branch, capabilities, dataCategories, description, email, image, name, repoUrl, team, version])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${apiBase}/onboarding/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          actorId: "publisher-portal",
          source: "portal",
          manifest,
          repoContext: { url: repoUrl, branch, commit_sha: commitSha },
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Submission failed")
      setResult(payload)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="app-shell-offset p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Onboarding Agent</Badge>
              <Badge className="bg-[var(--primary)]/15 text-[var(--primary)]">VS Code Skill Ready</Badge>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Onboard a Domain Agent</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Submit an ACA-backed agent manifest through the same governed pipeline used by GitHub and the VS Code Nebula-X onboarding skill.
            </p>
          </div>
          <Link href="/asset/nebula-x-onboarding-agent">
            <Button variant="outline" className="gap-2">
              Marketplace asset <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {[
            { icon: Bot, title: "VS Code", text: "Invoke /nebula-x-onboarding after installing the workspace skill." },
            { icon: Terminal, title: "CLI", text: "Use nebula-x validate, nebula-x submit, and nebula-x status when the CLI package is installed." },
            { icon: GitBranch, title: "GitHub", text: "Push code and post CI evidence into the same onboarding API." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-4">
              <Icon className="mb-3 h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-sm font-medium text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-medium text-foreground">Manifest</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tenant" value={tenantId} onChange={setTenantId} />
              <Field label="Version" value={version} onChange={setVersion} />
              <Field label="Agent name" value={name} onChange={setName} />
              <Field label="Owner team" value={team} onChange={setTeam} />
              <Field label="Owner email" value={email} onChange={setEmail} />
              <Field label="ACA image" value={image} onChange={setImage} />
              <Field label="Capabilities" value={capabilities} onChange={setCapabilities} />
              <Field label="Data categories" value={dataCategories} onChange={setDataCategories} />
              <Field label="Repository URL" value={repoUrl} onChange={setRepoUrl} />
              <Field label="Branch" value={branch} onChange={setBranch} />
              <Field label="Commit SHA" value={commitSha} onChange={setCommitSha} />
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Description</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--primary)]/30" />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={submit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit to Onboarding Agent
              </Button>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(manifest, null, 2))} className="gap-2">
                <Clipboard className="h-4 w-4" /> Copy manifest
              </Button>
            </div>

            {error && <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {result && (
              <div className="mt-4 rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-3 text-sm text-[var(--primary)]">
                Submission {result.submissionId} is {result.status} at {result.currentStage}.
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Code2 className="h-4 w-4 text-[var(--primary)]" /> Preview
              </div>
              <pre className="max-h-[34rem] overflow-auto rounded-md bg-background p-3 text-xs text-muted-foreground">{JSON.stringify(manifest, null, 2)}</pre>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground">Install VS Code Skill</h2>
              <code className="mt-3 block rounded-md bg-background p-3 text-xs text-muted-foreground">
                Copy-Item -Recurse .github/skills/nebula-x-onboarding $env:USERPROFILE\.copilot\skills\nebula-x-onboarding -Force
              </code>
              <p className="mt-3 text-xs text-muted-foreground">Then open Copilot Chat and invoke /nebula-x-onboarding.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--primary)]/30" />
    </label>
  )
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}