"use client";

import { useState, useEffect, useCallback } from "react";

type HealthEntry = {
  id: string;
  serverId: string;
  serverName?: string;
  resourceType: "mcp-server" | "a2a-agent";
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  latencyMs?: number;
  consecutiveFailures: number;
  autoDisabled: boolean;
  lastCheckedAt?: string;
  uptimePercent?: number;
  tenantId: string;
};

const STATUS_STYLES: Record<string, string> = {
  healthy: "bg-green-100 text-green-700 border-green-200",
  degraded: "bg-yellow-100 text-yellow-700 border-yellow-200",
  unhealthy: "bg-red-100 text-red-700 border-red-200",
  unknown: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_DOT: Record<string, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-400",
  unhealthy: "bg-red-500",
  unknown: "bg-gray-400",
};

export default function HealthDashboardPage() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
    autoDisabled: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [batchChecking, setBatchChecking] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const resp = await fetch("/api/health/summary");
    if (resp.ok) {
      const data = await resp.json() as typeof summary & { resources?: HealthEntry[] };
      setSummary({
        total: data?.total ?? 0,
        healthy: data?.healthy ?? 0,
        degraded: data?.degraded ?? 0,
        unhealthy: data?.unhealthy ?? 0,
        unknown: data?.unknown ?? 0,
        autoDisabled: data?.autoDisabled ?? 0,
      });
      if (data?.resources) setEntries(data.resources);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  async function checkServer(serverId: string) {
    setChecking(serverId);
    await fetch(`/api/health/servers/${serverId}/check`, { method: "POST" });
    await fetchSummary();
    setChecking(null);
  }

  async function batchCheck() {
    setBatchChecking(true);
    const serverIds = entries.map((e) => e.serverId);
    await fetch("/api/health/servers/batch-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverIds }),
    });
    await fetchSummary();
    setBatchChecking(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">Live status and uptime for all registered servers and agents</p>
        </div>
        <button onClick={batchCheck} disabled={batchChecking || loading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {batchChecking ? "Checking..." : "Check All Now"}
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(["healthy", "degraded", "unhealthy", "unknown"] as const).map((s) => (
            <div key={s} className={`border rounded-lg p-3 ${STATUS_STYLES[s]}`}>
              <p className="text-xs capitalize">{s}</p>
              <p className="text-xl font-bold">{summary[s]}</p>
            </div>
          ))}
          <div className="border rounded-lg p-3 bg-red-50 text-red-700 border-red-200 col-span-2">
            <p className="text-xs">Auto-disabled</p>
            <p className="text-xl font-bold">{summary.autoDisabled}</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No health records yet</p>
          <p className="text-sm">Register MCP servers or A2A agents to start health monitoring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className={`bg-white border-2 rounded-lg p-4 space-y-3 ${STATUS_STYLES[entry.status]}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${STATUS_DOT[entry.status]}`} />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 leading-tight">{entry.serverName ?? entry.serverId}</p>
                    <p className="text-xs text-gray-500">{entry.resourceType}</p>
                  </div>
                </div>
                {entry.autoDisabled && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded font-medium">Disabled</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Uptime</p>
                  <p className="font-semibold text-gray-900">{entry.uptimePercent != null ? `${entry.uptimePercent.toFixed(1)}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Latency</p>
                  <p className="font-semibold text-gray-900">{entry.latencyMs != null ? `${entry.latencyMs}ms` : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Failures</p>
                  <p className={`font-semibold ${entry.consecutiveFailures > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {entry.consecutiveFailures}
                  </p>
                </div>
              </div>

              {entry.lastCheckedAt && (
                <p className="text-xs text-gray-400">Last checked {new Date(entry.lastCheckedAt).toLocaleString()}</p>
              )}

              <button
                onClick={() => checkServer(entry.serverId)}
                disabled={checking === entry.serverId}
                className="w-full py-1 text-xs border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {checking === entry.serverId ? "Checking..." : "Run Check"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
