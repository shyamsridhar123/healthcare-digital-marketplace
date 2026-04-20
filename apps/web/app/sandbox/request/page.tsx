"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listSandboxTemplates, listDataPackages, createSandbox } from "@/lib/api/sandboxes";
import type { SandboxTemplate, DataPackage } from "@/lib/types";

const COMPUTE_OPTIONS = [
  { value: "cpu-small", label: "CPU Small — notebook exploration, low cost" },
  { value: "cpu-medium", label: "CPU Medium — tabular training workloads" },
  { value: "gpu-small", label: "GPU Small — fine-tuning / deep learning (approval required)" },
];

export default function RequestSandboxPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SandboxTemplate[]>([]);
  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    workspaceTemplateId: "",
    sandboxType: "personal" as "personal" | "team" | "restricted",
    dataPackages: [] as string[],
    computeProfile: "cpu-small" as "cpu-small" | "cpu-medium" | "gpu-small",
    durationDays: 14,
    costCenter: "",
    businessJustification: "",
  });

  useEffect(() => {
    Promise.all([listSandboxTemplates("default"), listDataPackages("default")]).then(
      ([tplRes, pkgRes]) => {
        setTemplates(tplRes.items);
        setPackages(pkgRes.items);
        if (tplRes.items.length > 0) {
          const first = tplRes.items[0];
          setForm((f) => ({
            ...f,
            workspaceTemplateId: first.id,
            sandboxType: first.sandboxType,
            computeProfile: first.defaultComputeProfile,
            durationDays: first.defaultDurationDays,
          }));
        }
      }
    );
  }, []);

  const selectedTemplate = templates.find((t) => t.id === form.workspaceTemplateId);
  const allowedPackages = packages.filter((p) =>
    p.allowedSandboxTypes.includes(form.sandboxType)
  );

  function handleTemplateChange(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      workspaceTemplateId: templateId,
      sandboxType: tpl.sandboxType,
      computeProfile: tpl.defaultComputeProfile,
      durationDays: tpl.defaultDurationDays,
      dataPackages: [],
    }));
  }

  function togglePackage(pkgId: string) {
    setForm((f) => ({
      ...f,
      dataPackages: f.dataPackages.includes(pkgId)
        ? f.dataPackages.filter((id) => id !== pkgId)
        : [...f.dataPackages, pkgId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Sandbox name is required."); return; }
    if (!form.workspaceTemplateId) { setError("Please select a template."); return; }
    if (form.dataPackages.length === 0) { setError("Select at least one data package."); return; }
    if (!form.businessJustification.trim()) { setError("Business justification is required."); return; }

    setError(null);
    setSubmitting(true);
    try {
      const sandbox = await createSandbox({ ...form, tenantId: "default", ownerId: "user" });
      router.push(`/sandbox/${sandbox.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to create sandbox. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const requiresApproval =
    selectedTemplate?.requiresApproval ||
    form.computeProfile === "gpu-small" ||
    form.sandboxType === "restricted";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/sandbox" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to Sandboxes
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
          Request Sandbox Workspace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a template, approved datasets, and compute profile. Your request will be evaluated
          against policy before provisioning.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Template */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Workspace Template</h2>

          <div className="space-y-1.5">
            <Label htmlFor="template">Template *</Label>
            <Select value={form.workspaceTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="computeProfile">Compute Profile *</Label>
            <Select
              value={form.computeProfile}
              onValueChange={(v) => setForm((f) => ({ ...f, computeProfile: v as any }))}
            >
              <SelectTrigger id="computeProfile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(selectedTemplate?.computeProfiles ?? ["cpu-small", "cpu-medium"]).map((cp) => {
                  const opt = COMPUTE_OPTIONS.find((o) => o.value === cp);
                  return (
                    <SelectItem key={cp} value={cp}>
                      {opt?.label ?? cp}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="durationDays">Duration (days) *</Label>
            <Input
              id="durationDays"
              type="number"
              min={1}
              max={selectedTemplate?.maxDurationDays ?? 90}
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: parseInt(e.target.value, 10) || 14 }))}
            />
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">
                Max {selectedTemplate.maxDurationDays} days for this template
              </p>
            )}
          </div>
        </div>

        {/* Identity */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Sandbox Details</h2>

          <div className="space-y-1.5">
            <Label htmlFor="name">Sandbox Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Claims Denial Prediction Q2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the work you'll do in this sandbox..."
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costCenter">Cost Center</Label>
            <Input
              id="costCenter"
              placeholder="e.g. RCM-AI"
              value={form.costCenter}
              onChange={(e) => setForm((f) => ({ ...f, costCenter: e.target.value }))}
            />
          </div>
        </div>

        {/* Data Packages */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Approved Data Packages *</h2>
          <p className="text-xs text-muted-foreground">
            Only approved packages are available for your sandbox type. Restricted datasets trigger
            additional review.
          </p>

          {allowedPackages.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No data packages available for this sandbox type.
            </p>
          ) : (
            <div className="space-y-2">
              {allowedPackages.map((pkg) => {
                const selected = form.dataPackages.includes(pkg.id);
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => togglePackage(pkg.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-[var(--accent)]/60 bg-[var(--accent)]/10"
                        : "border-border bg-secondary/30 hover:border-border/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{pkg.displayName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{pkg.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                          pkg.classification === "phi"
                            ? "bg-red-500/20 text-red-400"
                            : pkg.classification === "restricted"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {pkg.classification}
                        </span>
                        <span className="text-[10px] text-muted-foreground">v{pkg.version}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Justification */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Business Justification *</h2>
          <Textarea
            placeholder="Describe the business need, model objective, and how the data will be used..."
            rows={3}
            value={form.businessJustification}
            onChange={(e) => setForm((f) => ({ ...f, businessJustification: e.target.value }))}
          />
        </div>

        {/* Approval notice */}
        {requiresApproval && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
            This request requires approver review before provisioning begins.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/sandbox">
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : requiresApproval ? "Submit for Approval" : "Request Sandbox"}
          </Button>
        </div>
      </form>
    </div>
  );
}
