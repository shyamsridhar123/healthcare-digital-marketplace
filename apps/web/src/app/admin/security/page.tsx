"use client";

import { useState, useEffect, useCallback } from "react";
import type { SecurityScan, ScanFinding } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
  info: "bg-gray-100 text-gray-600 border-gray-200",
};

function ScoreShield({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-700 border-green-400" : score >= 60 ? "text-yellow-700 border-yellow-400" : "text-red-700 border-red-400";
  return (
    <div className={`inline-flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 font-bold ${color}`}>
      <span className="text-xl leading-tight">{score}</span>
      <span className="text-xs font-normal">score</span>
    </div>
  );
}

export default function SecurityAdminPage() {
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{
    totalScans: number;
    passed: number;
    failed: number;
    avgScore: number;
    findingsBySeverity: Record<string, number>;
  } | null>(null);
  const [targetType, setTargetType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (targetType) params.set("targetType", targetType);
    if (statusFilter) params.set("status", statusFilter);

    const [scansResp, summaryResp] = await Promise.all([
      fetch(`/api/security/scans?${params}`),
      fetch("/api/security/summary"),
    ]);

    if (scansResp.ok) {
      const d = await scansResp.json() as { items: SecurityScan[]; total: number };
      setScans(d.items ?? []);
      setTotal(d.total ?? 0);
    }
    if (summaryResp.ok) setSummary(await summaryResp.json());
    setLoading(false);
  }, [page, targetType, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Scans</h1>
        <p className="text-sm text-gray-500 mt-1">Security posture for all registered MCP servers and A2A agents</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Avg Score</p>
            <p className="text-2xl font-bold text-gray-900">{summary.avgScore}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Passed</p>
            <p className="text-2xl font-bold text-green-700">{summary.passed}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Critical Findings</p>
            <p className="text-2xl font-bold text-red-700">{summary.findingsBySeverity?.critical ?? 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
          <option value="">All types</option>
          <option value="mcp-server">MCP Server</option>
          <option value="a2a-agent">A2A Agent</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
          <option value="">All statuses</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Scan list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : scans.length === 0 ? (
        <p className="text-sm text-gray-500 py-8">No scans found.</p>
      ) : (
        <div className="space-y-2">
          {scans.map((scan) => (
            <div key={scan.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <ScoreShield score={scan.score} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{scan.targetId}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{scan.targetType}</span>
                      {scan.autoDisabled && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">Auto-disabled</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(scan.requestedAt).toLocaleString()} ·{" "}
                      <span className={`font-medium ${scan.status === "passed" ? "text-green-700" : scan.status === "failed" ? "text-red-600" : "text-gray-600"}`}>
                        {scan.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex gap-1">
                    {(["critical", "high", "medium", "low"] as const).map((sev) => {
                      const count = scan.findings.filter((f) => f.severity === sev).length;
                      if (!count) return null;
                      return (
                        <span key={sev} className={`text-xs px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[sev]}`}>
                          {count} {sev}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-gray-400 text-xs">{expanded === scan.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded === scan.id && scan.findings.length > 0 && (
                <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50">
                  {scan.findings.map((finding: ScanFinding) => (
                    <div key={finding.id} className={`border rounded-lg p-3 ${SEVERITY_COLORS[finding.severity]}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide">{finding.severity}</span>
                        <span className="text-xs text-gray-500">{finding.category}</span>
                      </div>
                      <p className="text-sm font-medium">{finding.title}</p>
                      <p className="text-xs mt-1 opacity-80">{finding.description}</p>
                      {finding.remediation && (
                        <p className="text-xs mt-1 italic opacity-70">Fix: {finding.remediation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {expanded === scan.id && scan.findings.length === 0 && (
                <div className="border-t border-gray-100 p-4 bg-green-50">
                  <p className="text-sm text-green-700">✓ No findings — all checks passed</p>
                </div>
              )}
            </div>
          ))}
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
