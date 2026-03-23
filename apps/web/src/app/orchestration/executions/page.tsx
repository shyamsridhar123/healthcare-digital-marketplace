"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ExecutionSummary, ExecutionStatus } from "@/lib/types";

const STATUS_STYLES: Record<ExecutionStatus, string> = {
  pending:   "bg-gray-100 text-gray-600",
  running:   "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed:    "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  paused:    "bg-purple-100 text-purple-700",
};

const STATUS_DOT: Record<ExecutionStatus, string> = {
  pending:   "bg-gray-400",
  running:   "bg-blue-500 animate-pulse",
  completed: "bg-green-500",
  failed:    "bg-red-500",
  cancelled: "bg-gray-400",
  paused:    "bg-purple-500",
};

function durationStr(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function ExecutionsListPage() {
  const router = useRouter();
  const TENANT_ID = "default";
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const STATUS_FILTERS: Array<{ value: ExecutionStatus | ""; label: string }> = [
    { value: "", label: "All" },
    { value: "running", label: "Running" },
    { value: "paused", label: "Paused" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tenantId: TENANT_ID, page: String(page), pageSize: String(pageSize) });
    if (statusFilter) params.set("status", statusFilter);
    const resp = await fetch(`/api/orchestration/executions?${params}`);
    if (resp.ok) { const d = await resp.json(); setExecutions(d.items ?? []); setTotal(d.total ?? 0); }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
          <p className="text-sm text-gray-500 mt-1">All orchestration execution history</p>
        </div>
        <button onClick={() => router.push("/orchestration/templates")} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          New Execution
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : executions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-1">No executions found</p>
          <p className="text-sm">Launch a template to start your first execution</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Template</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Violations</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {executions.map((e) => (
                <tr key={e.id} onClick={() => router.push(`/orchestration/executions/${e.id}?tenantId=${TENANT_ID}`)}
                  className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{e.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.templateName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[e.status]}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status]}`}>{e.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.nodeCount > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full w-20">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(e.completedNodes / e.nodeCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{e.completedNodes}/{e.nodeCount}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{durationStr(e.startedAt, e.completedAt)}</td>
                  <td className="px-4 py-3">
                    {e.policyViolations > 0 ? (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{e.policyViolations} violations</span>
                    ) : <span className="text-xs text-green-600">Clean</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(e.startedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40">Previous</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
