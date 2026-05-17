"use client";

import { useState, useEffect, useCallback } from "react";
import type { AuditEntry } from "@/lib/types";

const OUTCOME_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failure: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{
    totalEntries: number;
    failureRate: number;
    avgDurationMs: number;
    topActions: { action: string; count: number }[];
    topActors: { actorId: string; count: number }[];
  } | null>(null);

  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 25;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (action) params.set("action", action);
    if (actorId) params.set("actorId", actorId);
    if (targetType) params.set("targetType", targetType);
    if (outcome) params.set("outcome", outcome);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const [entriesResp, statsResp] = await Promise.all([
      fetch(`/api/audit/entries?${params}`),
      fetch("/api/audit/stats"),
    ]);

    if (entriesResp.ok) {
      const d = await entriesResp.json() as { items: AuditEntry[]; total: number };
      setEntries(d.items ?? []);
      setTotal(d.total ?? 0);
    }
    if (statsResp.ok) setStats(await statsResp.json());
    setLoading(false);
  }, [page, action, actorId, targetType, outcome, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  function exportLog(format: "csv" | "jsonl") {
    const params = new URLSearchParams({ format });
    if (action) params.set("action", action);
    if (actorId) params.set("actorId", actorId);
    if (targetType) params.set("targetType", targetType);
    if (outcome) params.set("outcome", outcome);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/audit/export?${params}`, "_blank");
  }

  function resetFilters() {
    setAction(""); setActorId(""); setTargetType(""); setOutcome(""); setFrom(""); setTo(""); setPage(1);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive event history for all marketplace operations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportLog("csv")} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Export CSV</button>
          <button onClick={() => exportLog("jsonl")} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Export JSONL</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Entries" value={stats.totalEntries.toLocaleString()} />
          <StatCard label="Failure Rate" value={`${(stats.failureRate * 100).toFixed(1)}%`} />
          <StatCard label="Avg Latency" value={`${stats.avgDurationMs}ms`} />
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Top Action</p>
            {stats.topActions[0] ? (
              <p className="text-sm font-semibold text-gray-900 truncate">{stats.topActions[0].action} <span className="text-gray-400 font-normal">({stats.topActions[0].count})</span></p>
            ) : <p className="text-sm text-gray-400">—</p>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Filters</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Action contains"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <input value={actorId} onChange={(e) => { setActorId(e.target.value); setPage(1); }} placeholder="Actor ID"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
            <option value="">All target types</option>
            <option value="mcp-server">MCP Server</option>
            <option value="a2a-agent">A2A Agent</option>
            <option value="skill">Skill</option>
            <option value="iam-group">IAM Group</option>
            <option value="service-account">Service Account</option>
          </select>
          <select value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
            <option value="">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="partial">Partial</option>
          </select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
        </div>
        <button onClick={resetFilters} className="mt-2 text-xs text-blue-600 hover:underline">Reset filters</button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 py-8">No audit entries match your filters.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Latency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Correlation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{entry.action}</td>
                  <td className="px-4 py-2 text-gray-600">{entry.actorId}</td>
                  <td className="px-4 py-2 text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{entry.targetType}</span>
                      <span className="truncate max-w-[120px]">{entry.targetId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OUTCOME_COLORS[entry.outcome] ?? "bg-gray-100 text-gray-600"}`}>
                      {entry.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{entry.durationMs != null ? `${entry.durationMs}ms` : "—"}</td>
                  <td className="px-4 py-2 text-gray-400 font-mono text-xs">{entry.correlationId ? entry.correlationId.slice(0, 8) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40">Previous</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages} ({total.toLocaleString()} total)</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
