"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSandbox,
  listSandboxEvents,
  approveSandbox,
  rejectSandbox,
  suspendSandbox,
  resumeSandbox,
  extendSandbox,
} from "@/lib/api/sandboxes";
import { imdeDemoScenario } from "@/lib/imde-demo-data";
import type { SandboxWorkspace, SandboxLifecycleEvent, SandboxStatus } from "@/lib/types";

const STATUS_COLORS: Record<SandboxStatus, string> = {
  requested: "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30",
  approved: "bg-secondary text-muted-foreground border-border",
  provisioning: "bg-secondary text-muted-foreground border-border",
  ready: "bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30",
  suspended: "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  retired: "bg-secondary text-muted-foreground border-border",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
};

const COMPUTE_LABELS: Record<string, string> = {
  "cpu-small": "CPU Small",
  "cpu-medium": "CPU Medium",
  "gpu-small": "GPU Small",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export default function SandboxDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sandbox, setSandbox] = useState<SandboxWorkspace | null>(null);
  const [events, setEvents] = useState<SandboxLifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [publishForm, setPublishForm] = useState({ amlModelName: "", amlModelVersion: "" });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [sbx, evts] = await Promise.all([getSandbox(id), listSandboxEvents(id)]);
      setSandbox(sbx);
      setEvents(evts.items);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(fn: () => Promise<SandboxWorkspace | { message: string }>) {
    setActionLoading(true);
    try {
      const result = await fn();
      if ("status" in result) setSandbox(result as SandboxWorkspace);
      await load();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    );
  }

  if (!sandbox) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="text-sm font-medium text-muted-foreground">Sandbox not found</p>
        <Link href="/sandbox" className="mt-4">
          <Button variant="outline" size="sm">Back to Sandboxes</Button>
        </Link>
      </div>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(sandbox.expiresAt).getTime() - Date.now()) / 86400000)
  );
  const isDemoSandbox = sandbox.demoScenarioId === imdeDemoScenario.demoScenarioId;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/sandbox" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to Sandboxes
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{sandbox.name}</h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[sandbox.status]}`}
              >
                {sandbox.status}
              </span>
            </div>
            {sandbox.description && (
              <p className="mt-1 text-sm text-muted-foreground">{sandbox.description}</p>
            )}
            {isDemoSandbox && (
              <p className="mt-2 text-xs font-medium text-[var(--primary)]">
                Executive demo sandbox · synthetic/de-identified data · base model {sandbox.baseModelId}
              </p>
            )}
          </div>

          {/* Launch buttons */}
          {sandbox.status === "ready" && sandbox.launchUrls && (
            <div className="flex shrink-0 gap-2">
              {sandbox.launchUrls.studio && (
                <a href={sandbox.launchUrls.studio} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">Open AML Studio</Button>
                </a>
              )}
              <Link href={`/imde/notebooks?sandboxId=${sandbox.id}&demo=${sandbox.demoScenarioId ?? ""}`}>
                <Button size="sm">Preview Notebook</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Details card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Workspace Details</h2>
            <div className="divide-y divide-border">
              <InfoRow label="Sandbox ID" value={<code className="text-xs">{sandbox.sandboxId}</code>} />
              <InfoRow label="Type" value={<span className="capitalize">{sandbox.sandboxType}</span>} />
              <InfoRow label="Compute" value={COMPUTE_LABELS[sandbox.computeProfile] ?? sandbox.computeProfile} />
              <InfoRow label="Template" value={sandbox.workspaceTemplateId} />
              {sandbox.demoScenarioId && <InfoRow label="Demo Scenario" value={sandbox.demoScenarioId} />}
              {sandbox.baseModelId && <InfoRow label="Base Model" value={sandbox.baseModelId} />}
              <InfoRow label="Policy Profile" value={<span className="capitalize">{sandbox.policyProfile}</span>} />
              <InfoRow
                label="Expires"
                value={
                  <span className={daysLeft <= 3 ? "text-destructive" : ""}>
                    {new Date(sandbox.expiresAt).toLocaleDateString()} ({daysLeft}d left)
                  </span>
                }
              />
              {sandbox.costCenter && <InfoRow label="Cost Center" value={sandbox.costCenter} />}
              {sandbox.approvedBy && (
                <InfoRow
                  label="Approved by"
                  value={`${sandbox.approvedBy} on ${new Date(sandbox.approvedAt!).toLocaleDateString()}`}
                />
              )}
              {sandbox.approvalReason && <InfoRow label="Approval Reason" value={sandbox.approvalReason} />}
              {sandbox.rejectionReason && (
                <InfoRow label="Rejection reason" value={sandbox.rejectionReason} />
              )}
            </div>
          </div>

          {/* Data Packages */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Approved Data Packages</h2>
            {sandbox.dataPackages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data packages attached.</p>
            ) : (
              <div className="space-y-3">
                {sandbox.demoDataStatement && (
                  <p className="text-xs text-[var(--primary)]">{sandbox.demoDataStatement}</p>
                )}
                <div className="flex flex-wrap gap-2">
                {sandbox.dataPackages.map((pkg) => (
                  <span
                    key={pkg}
                    className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {pkg}
                  </span>
                ))}
                </div>
              </div>
            )}
          </div>

          {sandbox.status === "ready" && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Marketplace-contained next actions</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Link href={`/imde/notebooks?sandboxId=${sandbox.id}&demo=${sandbox.demoScenarioId ?? ""}`}>
                  <Button variant="outline" className="w-full">Notebook</Button>
                </Link>
                <Link href={`/imde/experiments?sandboxId=${sandbox.id}&demo=${sandbox.demoScenarioId ?? ""}`}>
                  <Button variant="outline" className="w-full">Experiments</Button>
                </Link>
                <Link href={`/imde/push?sandboxId=${sandbox.id}&demo=${sandbox.demoScenarioId ?? ""}`}>
                  <Button className="w-full">Publish</Button>
                </Link>
              </div>
            </div>
          )}

          {/* Lifecycle Events */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Lifecycle Events</h2>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">No events yet.</p>
            ) : (
              <ol className="space-y-3">
                {events.map((evt) => (
                  <li key={evt.id} className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${evt.outcome === "success" ? "bg-[var(--primary)]" : "bg-destructive"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{evt.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {evt.actorId} · {new Date(evt.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {/* Admin Actions */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Actions</h2>

            {sandbox.status === "requested" && (
              <>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => runAction(() => approveSandbox(sandbox.id, imdeDemoScenario.actors.approverId))}
                >
                  Approve as Platform Admin
                </Button>
                {!showRejectForm ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => setShowRejectForm(true)}
                  >
                    Reject
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                      rows={2}
                      placeholder="Rejection reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={!rejectReason.trim() || actionLoading}
                        onClick={() => runAction(() => rejectSandbox(sandbox.id, rejectReason))}
                      >
                        Confirm Reject
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {sandbox.status === "ready" && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => runAction(() => suspendSandbox(sandbox.id))}
                >
                  Suspend
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => runAction(() => extendSandbox(sandbox.id, 14))}
                >
                  Extend by 14 days
                </Button>
                {!showPublishForm ? (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => setShowPublishForm(true)}
                  >
                    Publish Model to Marketplace
                  </Button>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <p className="text-xs font-medium text-foreground">Publish Trained Model</p>
                    <input
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                      placeholder="AML model name"
                      value={publishForm.amlModelName}
                      onChange={(e) => setPublishForm((f) => ({ ...f, amlModelName: e.target.value }))}
                    />
                    <input
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                      placeholder="Version (e.g. 1)"
                      value={publishForm.amlModelVersion}
                      onChange={(e) => setPublishForm((f) => ({ ...f, amlModelVersion: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        disabled={!publishForm.amlModelName || !publishForm.amlModelVersion || actionLoading}
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            const res = await fetch(
                              `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7071/api"}/sandboxes/${sandbox.id}/publish-model`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(publishForm),
                              }
                            );
                            if (res.ok) setShowPublishForm(false);
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                      >
                        Submit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowPublishForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {sandbox.status === "suspended" && (
              <Button
                className="w-full"
                size="sm"
                disabled={actionLoading}
                onClick={() => runAction(() => resumeSandbox(sandbox.id))}
              >
                Resume Sandbox
              </Button>
            )}

            {["ready", "suspended", "provisioning"].includes(sandbox.status) && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() =>
                  confirm("Retire this sandbox? This action cannot be undone.") &&
                  fetch(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7071/api"}/sandboxes/${sandbox.id}`,
                    { method: "DELETE" }
                  ).then(() => load())
                }
              >
                Retire Sandbox
              </Button>
            )}

            {["failed", "retired", "expired", "requested", "approved"].includes(sandbox.status) && (
              <p className="text-center text-xs text-muted-foreground">
                No actions available in this state.
              </p>
            )}
          </div>

          {/* Quick info */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Owner</h2>
            <p className="text-xs text-muted-foreground">
              {isDemoSandbox ? `${imdeDemoScenario.actors.ownerName} · ${imdeDemoScenario.actors.teamName}` : sandbox.ownerId}
            </p>
            <h2 className="mt-3 text-sm font-semibold text-foreground">Created</h2>
            <p className="text-xs text-muted-foreground">
              {new Date(sandbox.createdAt).toLocaleString()}
            </p>
            {sandbox.businessJustification && (
              <>
                <h2 className="mt-3 text-sm font-semibold text-foreground">Justification</h2>
                <p className="text-xs text-muted-foreground">{sandbox.businessJustification}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
