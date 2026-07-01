"use client";

import { useState, useEffect, useCallback } from "react";
import SkillCard from "@/components/registry/SkillCard";
import type { RegistrySkill } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7071/api";

export default function SkillsRegistryPage() {
  const [skills, setSkills] = useState<RegistrySkill[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pageSize = 12;

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const resp = await fetch(`${API_BASE_URL}/registry/skills?${params}`);
    if (resp.ok) {
      const d = await resp.json() as { items: RegistrySkill[]; total: number };
      setSkills(d.items ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportMsg(null);
    const resp = await fetch(`${API_BASE_URL}/registry/skills/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: importUrl }),
    });
    if (resp.ok) {
      setImportMsg({ type: "success", text: "Skill imported successfully!" });
      setImportUrl("");
      fetchSkills();
    } else {
      const err = await resp.json() as { error: string };
      setImportMsg({ type: "error", text: err.error ?? "Import failed" });
    }
    setImporting(false);
  }

  async function handleStar(id: string) {
    await fetch(`${API_BASE_URL}/registry/skills/${id}/star`, { method: "POST" });
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, stars: s.stars + 1 } : s));
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Skills Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Reusable SKILL.md agent skills — import from GitHub or GitLab</p>
        </div>
      </div>

      {/* Import from URL */}
      <div className="bg-secondary border border-border rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-foreground mb-2">Import SKILL.md from GitHub / GitLab</p>
        <form onSubmit={handleImport} className="flex gap-2">
          <input
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/blob/main/.claude/skills/my-skill/SKILL.md"
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
          />
          <button
            type="submit"
            disabled={importing || !importUrl.trim()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors shrink-0"
          >
            {importing ? "Importing..." : "Import"}
          </button>
        </form>
        {importMsg && (
          <p className={`mt-2 text-sm ${importMsg.type === "success" ? "text-[var(--primary)]" : "text-destructive"}`}>
            {importMsg.text}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search skills..."
          className="flex-1 max-w-sm px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <input
          type="text"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          placeholder="Category..."
          className="w-40 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-secondary rounded-lg h-44 animate-pulse" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No skills registered yet. Import one from GitHub!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onStar={handleStar} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40">Previous</button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
