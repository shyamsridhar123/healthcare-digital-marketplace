"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listSandboxes, type SandboxListResponse } from "@/lib/api/sandboxes";
import { imdeDemoScenario } from "@/lib/imde-demo-data";
import type { SandboxWorkspace, SandboxStatus } from "@/lib/types";

const STATUS_COLORS: Record<SandboxStatus, string> = {
  requested: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  provisioning: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  ready: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  retired: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
};

const COMPUTE_LABELS: Record<string, string> = {
  "cpu-small": "CPU Small",
  "cpu-medium": "CPU Medium",
  "gpu-small": "GPU Small",
};

function SandboxCard({ sandbox }: { sandbox: SandboxWorkspace }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(sandbox.expiresAt).getTime() - Date.now()) / 86400000)
  );

  // The whole card is clickable via the <Link>, but the optional "Open in Azure
  // ML Studio" external <a> must NOT be a descendant of that <Link> (HTML
  // forbids nested <a> and React 19 / Next 16 throws a hydration error). We
  // render the external link as a sibling inside the same card frame.
  return (
    <div className="group rounded-xl border border-border bg-card transition-all hover:border-[var(--accent)]/40 hover:shadow-md hover:shadow-[var(--accent)]/5">
      <Link href={`/sandbox/${sandbox.id}`} className="block p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{sandbox.name}</h3>
            {sandbox.description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{sandbox.description}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[sandbox.status]}`}
          >
            {sandbox.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <span className="rounded bg-secondary px-2 py-0.5 capitalize">{sandbox.sandboxType}</span>
          <span className="rounded bg-secondary px-2 py-0.5">
            {COMPUTE_LABELS[sandbox.computeProfile] ?? sandbox.computeProfile}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5">
            {sandbox.dataPackages.length} dataset{sandbox.dataPackages.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Expires in {daysLeft}d</span>
          <span>{new Date(sandbox.createdAt).toLocaleDateString()}</span>
        </div>
      </Link>

      {sandbox.status === "ready" && sandbox.launchUrls?.studio && (
        <div className="border-t border-border px-5 py-3">
          <a
            href={sandbox.launchUrls.studio}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Open in Azure ML Studio →
          </a>
        </div>
      )}
    </div>
  );
}

export default function SandboxPage() {
  const [data, setData] = useState<SandboxListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSandboxes({
        tenantId: "default",
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setData(result);
    } catch {
      setData({ items: [], total: 0, page: 1, pageSize: 20 });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const displayed = (data?.items ?? []).filter((s) => {
    const matchType = typeFilter === "all" || s.sandboxType === typeFilter;
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const pendingApproval = (data?.items ?? []).filter((s) => s.status === "requested").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sandbox Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Governed Azure ML environments for data science teams
          </p>
        </div>
        <Link href="/sandbox/request">
          <Button size="sm" className="gap-2">
            <span>+</span> Request Sandbox
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <Badge className="mb-2 border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
              Executive demo path
            </Badge>
            <h2 className="text-lg font-semibold text-foreground">{imdeDemoScenario.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Request a governed GPU sandbox with synthetic, de-identified RCM data, route it through approval, and publish the winning model into Models.
            </p>
          </div>
          <Link href={`/sandbox/request?demo=${imdeDemoScenario.demoScenarioId}`}>
            <Button className="w-full md:w-auto">Start demo sandbox</Button>
          </Link>
        </div>
      </div>

      {/* Alert for pending approvals (admin view) */}
      {pendingApproval > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <span className="font-semibold">{pendingApproval} sandbox{pendingApproval > 1 ? "es" : ""} awaiting approval</span>
          <button
            type="button"
            onClick={() => setStatusFilter("requested")}
            className="ml-auto underline"
          >
            View
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          className="h-9 w-56 text-sm"
          placeholder="Search sandboxes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="provisioning">Provisioning</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || typeFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setSearch(""); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No sandboxes found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.total === 0
              ? "Request your first sandbox to get started."
              : "Try adjusting your filters."}
          </p>
          {data?.total === 0 && (
            <Link href="/sandbox/request" className="mt-4">
              <Button size="sm">Request Sandbox</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((s) => (
            <SandboxCard key={s.id} sandbox={s} />
          ))}
        </div>
      )}

      {/* Stats footer */}
      {data && data.total > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {displayed.length} of {data.total} sandbox{data.total !== 1 ? "es" : ""}
        </p>
      )}
    </div>
  );
}
