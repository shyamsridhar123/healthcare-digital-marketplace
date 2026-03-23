"use client";

import { useState } from "react";
import type { McpTool } from "@/lib/types";

interface SearchResult extends McpTool {
  relevanceScore?: number;
}

export default function ToolDiscovery() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch("/api/registry/tools/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, maxResults: 20 }),
      });

      if (!resp.ok) throw new Error("Search failed");
      const data = (await resp.json()) as { results: SearchResult[] };
      setResults(data.results ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools by name, description, or capability..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500 text-sm">No tools found for "{query}"</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{results.length} result{results.length !== 1 ? "s" : ""}</p>
          {results.map((tool) => (
            <div key={tool.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{tool.name}</p>
                  {tool.server && (
                    <p className="text-xs text-gray-500 mt-0.5">from {tool.server.name}</p>
                  )}
                </div>
                {tool.relevanceScore !== undefined && (
                  <span className="text-xs text-gray-400 shrink-0">
                    score: {tool.relevanceScore}
                  </span>
                )}
              </div>
              {tool.description && (
                <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{tool.description}</p>
              )}
              {tool.inputSchema && Object.keys(tool.inputSchema).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">Input schema</summary>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-700 overflow-auto max-h-32">
                    {JSON.stringify(tool.inputSchema, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
