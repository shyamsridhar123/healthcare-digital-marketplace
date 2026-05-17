"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { OrchestrationTemplate } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-gray-100 text-gray-700",
  Healthcare: "bg-blue-100 text-blue-700",
  Finance: "bg-green-100 text-green-700",
  "Customer Support": "bg-purple-100 text-purple-700",
  "Data Processing": "bg-orange-100 text-orange-700",
  Security: "bg-red-100 text-red-700",
  "AI/ML": "bg-indigo-100 text-indigo-700",
};

function TemplateCard({ template, onFork, onLaunch }: {
  template: OrchestrationTemplate;
  onFork: (id: string) => void;
  onLaunch: (id: string) => void;
}) {
  const colorClass = CATEGORY_COLORS[template.category] ?? "bg-gray-100 text-gray-700";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>{template.category}</span>
            <span className="text-xs text-gray-400">v{template.version}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{template.name}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border ml-2 shrink-0 ${template.visibility === "shared" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
          {template.visibility}
        </span>
      </div>

      {template.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        <div className="bg-gray-50 rounded-lg py-1.5"><p className="font-semibold text-gray-900">{template.nodes.length}</p><p className="text-gray-400">nodes</p></div>
        <div className="bg-gray-50 rounded-lg py-1.5"><p className="font-semibold text-gray-900">{template.parameters.length}</p><p className="text-gray-400">params</p></div>
        <div className="bg-gray-50 rounded-lg py-1.5"><p className="font-semibold text-gray-900">{template.defaultPolicyIds.length}</p><p className="text-gray-400">policies</p></div>
      </div>

      {template.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {template.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{tag}</span>
          ))}
          {template.tags.length > 4 && <span className="text-xs text-gray-400">+{template.tags.length - 4}</span>}
        </div>
      )}

      <div className="text-xs text-gray-400">
        Used {template.usageCount}× · {template.forkedFrom ? "Forked" : "Original"}
      </div>

      <div className="flex gap-2 mt-auto pt-1">
        <button onClick={() => onFork(template.id)} className="flex-1 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Fork</button>
        <button onClick={() => onLaunch(template.id)} className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Launch</button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const TENANT_ID = "default";
  const [templates, setTemplates] = useState<OrchestrationTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "General", tags: "", visibility: "private" });
  const [saving, setSaving] = useState(false);

  const pageSize = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tenantId: TENANT_ID, page: String(page), pageSize: String(pageSize) });
    if (categoryFilter) params.set("category", categoryFilter);
    if (visibilityFilter) params.set("visibility", visibilityFilter);
    if (search) params.set("search", search);

    const [tResp, catResp] = await Promise.all([
      fetch(`/api/orchestration/templates?${params}`),
      fetch(`/api/orchestration/templates/categories?tenantId=${TENANT_ID}`),
    ]);
    if (tResp.ok) { const d = await tResp.json(); setTemplates(d.items ?? []); setTotal(d.total ?? 0); }
    if (catResp.ok) { const d = await catResp.json(); setCategories(d.categories ?? []); }
    setLoading(false);
  }, [page, categoryFilter, visibilityFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function forkTemplate(id: string) {
    const resp = await fetch(`/api/orchestration/templates/${id}/fork?tenantId=${TENANT_ID}`, { method: "POST" });
    if (resp.ok) { fetchData(); }
  }

  async function createTemplate() {
    setSaving(true);
    const body = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      nodes: [{ id: "start", type: "trigger", label: "Start", data: { label: "Start" } }],
      edges: [],
      tenantId: TENANT_ID,
    };
    const resp = await fetch("/api/orchestration/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (resp.ok) { setShowCreate(false); fetchData(); }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orchestration Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Reusable workflow definitions with policy bindings</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Template
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-blue-200 rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">New Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Template name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="General" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Tags (comma-separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="ai, healthcare, batch" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Visibility</label>
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="private">private</option>
                <option value="shared">shared (team)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={createTemplate} disabled={saving || !form.name} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search templates…"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-400" />
        <select value={visibilityFilter} onChange={(e) => { setVisibilityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
          <option value="">All visibility</option>
          <option value="private">private</option>
          <option value="shared">shared</option>
        </select>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => { setCategoryFilter(""); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => { setCategoryFilter(c); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-56 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-1">No templates found</p>
          <p className="text-sm">Create a template to define reusable orchestration workflows</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t}
              onFork={forkTemplate}
              onLaunch={(id) => router.push(`/orchestration/execute/${id}`)} />
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
