"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import McpServerCard from "@/components/registry/McpServerCard";
import ToolDiscovery from "@/components/registry/ToolDiscovery";
import type { McpServer } from "@/lib/types";

export default function McpRegistryPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"servers" | "tools">("servers");

  const pageSize = 12;

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status });
      if (search) params.set("search", search);
      const resp = await fetch(`/api/registry/servers?${params}`);
      if (resp.ok) {
        const data = await resp.json() as { items: McpServer[]; total: number };
        setServers(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MCP Server Registry</h1>
          <p className="text-sm text-gray-500 mt-1">Discover and manage registered Model Context Protocol servers</p>
        </div>
        <Link
          href="/registry/register"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Register Server
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["servers", "tools"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "servers" ? `Servers ${total > 0 ? `(${total})` : ""}` : "Tool Discovery"}
          </button>
        ))}
      </div>

      {activeTab === "servers" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search servers..."
              className="flex-1 max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Server Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-48 animate-pulse" />
              ))}
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm mb-3">No MCP servers registered yet.</p>
              <Link href="/registry/register" className="text-blue-600 text-sm hover:underline">
                Register your first server →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                <McpServerCard key={server.id} server={server} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === "tools" && (
        <div className="max-w-2xl">
          <p className="text-sm text-gray-600 mb-4">
            Search across all tools from all registered MCP servers by name, description, or capability.
          </p>
          <ToolDiscovery />
        </div>
      )}
    </div>
  );
}
