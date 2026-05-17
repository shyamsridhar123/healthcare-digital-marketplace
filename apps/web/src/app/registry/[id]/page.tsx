"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { McpServer, McpTool } from "@/lib/types";

function HealthDot({ status }: { status: McpServer["healthStatus"] }) {
  const colors: Record<McpServer["healthStatus"], string> = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    unhealthy: "bg-red-500",
    unknown: "bg-gray-400",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]}`} />;
}

export default function McpServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [server, setServer] = useState<McpServer | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "tools" | "versions" | "health">("overview");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [srvResp, toolsResp] = await Promise.all([
        fetch(`/api/registry/servers/${id}`),
        fetch(`/api/registry/tools?serverId=${id}&pageSize=200`),
      ]);
      if (srvResp.ok) setServer(await srvResp.json());
      if (toolsResp.ok) {
        const d = await toolsResp.json() as { items: McpTool[] };
        setTools(d.items ?? []);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleToggle() {
    if (!server) return;
    setActionLoading(true);
    const action = server.status === "active" ? "disable" : "enable";
    const resp = await fetch(`/api/registry/servers/${id}/${action}`, { method: "POST" });
    if (resp.ok) {
      const d = await resp.json() as { status: McpServer["status"] };
      setServer((s) => s ? { ...s, status: d.status } : s);
    }
    setActionLoading(false);
  }

  async function handleScan() {
    setActionLoading(true);
    await fetch("/api/security/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: id, targetType: "mcp-server" }),
    });
    // Refresh server to get updated scan status
    const r = await fetch(`/api/registry/servers/${id}`);
    if (r.ok) setServer(await r.json());
    setActionLoading(false);
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-96 bg-gray-100 rounded" />
    </div>;
  }

  if (!server) {
    return <div className="max-w-5xl mx-auto px-4 py-8">
      <p className="text-gray-500">Server not found.</p>
      <Link href="/registry" className="text-blue-600 text-sm hover:underline mt-2 inline-block">← Back to registry</Link>
    </div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/registry" className="hover:text-blue-600">Registry</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{server.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <HealthDot status={server.healthStatus} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{server.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{server.endpointUrl}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleScan}
            disabled={actionLoading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Run Security Scan
          </button>
          <button
            onClick={handleToggle}
            disabled={actionLoading}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors ${
              server.status === "active"
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
            }`}
          >
            {server.status === "active" ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">v{server.activeVersion}</span>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{server.transport}</span>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">auth: {server.authScheme}</span>
        <span className={`px-2 py-1 rounded text-xs ${server.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {server.status}
        </span>
        {server.securityScanStatus && (
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">scan: {server.securityScanStatus}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["overview", "tools", "versions", "health"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "tools" ? `Tools (${tools.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          {server.description && <p className="text-sm text-gray-600">{server.description}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Tools", value: tools.length },
              { label: "Rating", value: server.rating > 0 ? `${server.rating.toFixed(1)} (${server.ratingCount})` : "No ratings" },
              { label: "Health", value: server.healthStatus },
              { label: "Registered", value: new Date(server.registeredAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>
          {server.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {server.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tools" && (
        <div className="space-y-2">
          {tools.length === 0 ? (
            <p className="text-sm text-gray-500">No tools discovered yet. Trigger a tools/list call to populate.</p>
          ) : (
            tools.map((tool) => (
              <div key={tool.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900">{tool.name}</p>
                {tool.description && <p className="text-xs text-gray-600 mt-1">{tool.description}</p>}
                {tool.inputSchema && Object.keys(tool.inputSchema).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer">Input schema</summary>
                    <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "versions" && (
        <div className="space-y-2">
          {server.versions.map((v) => (
            <div key={v.version} className={`border rounded-lg p-4 flex items-center justify-between ${v.active ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">v{v.version}</span>
                  {v.active && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Active</span>}
                  {v.deprecated && <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded">Deprecated</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{v.endpointUrl}</p>
                {v.notes && <p className="text-xs text-gray-600 mt-0.5">{v.notes}</p>}
              </div>
              <p className="text-xs text-gray-400">{new Date(v.registeredAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "health" && (
        <HealthHistoryPanel serverId={id} />
      )}
    </div>
  );
}

function HealthHistoryPanel({ serverId }: { serverId: string }) {
  const [history, setHistory] = useState<{
    status: string;
    latencyMs: number;
    checkedAt: string;
    error?: string;
  }[]>([]);
  const [uptimePct, setUptimePct] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/health/servers/${serverId}/history?limit=50`)
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.history ?? []);
        setUptimePct(d.uptimePercent);
      });
  }, [serverId]);

  return (
    <div className="space-y-4">
      {uptimePct !== null && (
        <div className="flex gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Uptime (last 50 checks)</p>
            <p className="text-lg font-bold text-gray-900">{uptimePct}%</p>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Latency</th>
              <th className="pb-2">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.map((h, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-4 text-gray-600 text-xs">{new Date(h.checkedAt).toLocaleString()}</td>
                <td className="py-1.5 pr-4">
                  <span className={`text-xs font-medium ${h.status === "healthy" ? "text-green-700" : h.status === "degraded" ? "text-yellow-700" : "text-red-600"}`}>
                    {h.status}
                  </span>
                </td>
                <td className="py-1.5 pr-4 text-xs text-gray-600">{h.latencyMs}ms</td>
                <td className="py-1.5 text-xs text-red-500">{h.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <p className="text-sm text-gray-500 mt-4">No health check history yet.</p>}
      </div>
    </div>
  );
}
