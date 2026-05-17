"use client";

import { useState, useEffect, useCallback } from "react";
import AgentCard from "@/components/registry/AgentCard";
import type { A2AAgent } from "@/lib/types";

export default function A2AAgentsPage() {
  const [agents, setAgents] = useState<A2AAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<A2AAgent[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "discover">("browse");

  const pageSize = 12;

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    const resp = await fetch(`/api/registry/agents?${params}`);
    if (resp.ok) {
      const d = await resp.json() as { items: A2AAgent[]; total: number };
      setAgents(d.items ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  async function handleDiscover(e: React.FormEvent) {
    e.preventDefault();
    if (!discoverQuery.trim()) return;
    setDiscovering(true);
    const resp = await fetch("/api/registry/agents/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: discoverQuery, maxResults: 10 }),
    });
    if (resp.ok) {
      const d = await resp.json() as { results: A2AAgent[] };
      setDiscoverResults(d.results ?? []);
    }
    setDiscovering(false);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">A2A Agent Registry</h1>
          <p className="text-sm text-gray-500 mt-1">Discover agents using the Google Agent-to-Agent Protocol</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["browse", "discover"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "browse" ? `Browse (${total})` : "Semantic Discovery"}
          </button>
        ))}
      </div>

      {activeTab === "browse" && (
        <>
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search agents by name or description..."
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-48 animate-pulse" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No A2A agents registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40">Previous</button>
              <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {activeTab === "discover" && (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm text-gray-600">
            Describe a capability or task in natural language to find matching agents using semantic skill matching.
          </p>
          <form onSubmit={handleDiscover} className="flex gap-2">
            <input
              value={discoverQuery}
              onChange={(e) => setDiscoverQuery(e.target.value)}
              placeholder="e.g. 'summarize documents', 'book a flight', 'analyze code'..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={discovering || !discoverQuery.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {discovering ? "Searching..." : "Discover"}
            </button>
          </form>

          {discoverResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">{discoverResults.length} agents found</p>
              <div className="grid gap-3">
                {discoverResults.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
