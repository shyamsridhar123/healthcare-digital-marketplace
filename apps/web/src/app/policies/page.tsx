"use client";

import { useState, useEffect, useCallback } from "react";
import type { Policy, PolicyType, PolicyDecisionType } from "@/lib/types";

const TYPE_COLORS: Record<PolicyType, string> = {
  "rate-limit": "bg-blue-100 text-blue-700",
  "model-allowlist": "bg-purple-100 text-purple-700",
  "content-filter": "bg-orange-100 text-orange-700",
  "data-access": "bg-teal-100 text-teal-700",
  compliance: "bg-red-100 text-red-700",
  "cost-budget": "bg-yellow-100 text-yellow-700",
  "human-gate": "bg-pink-100 text-pink-700",
  custom: "bg-gray-100 text-gray-700",
};

const ACTION_COLORS: Record<PolicyDecisionType, string> = {
  deny: "text-red-700 bg-red-50 border-red-200",
  "pending-approval": "text-purple-700 bg-purple-50 border-purple-200",
  transform: "text-yellow-700 bg-yellow-50 border-yellow-200",
  allow: "text-green-700 bg-green-50 border-green-200",
};

const POLICY_TYPES: PolicyType[] = [
  "rate-limit", "model-allowlist", "content-filter", "data-access",
  "compliance", "cost-budget", "human-gate", "custom",
];

const SCOPE_TARGETS = ["all", "agent", "mcp-server", "model", "data-source"] as const;

const EMPTY_RULE: Record<PolicyType, Record<string, unknown>> = {
  "rate-limit": { maxCalls: 100, timeWindowSeconds: 60 },
  "model-allowlist": { allowedModels: [] },
  "content-filter": { patterns: [] },
  "data-access": { allowedSources: [] },
  compliance: { detectPii: true, piiTypes: ["ssn", "creditCard", "email", "phone"] },
  "cost-budget": { maxTokens: 10000 },
  "human-gate": { approvalMessage: "Please review before proceeding" },
  custom: { expression: "" },
};

function RuleForm({ type, rule, onChange }: {
  type: PolicyType;
  rule: Record<string, unknown>;
  onChange: (r: Record<string, unknown>) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...rule, [k]: v });
  const arr = (k: string): string[] => (rule[k] as string[] | undefined) ?? [];

  switch (type) {
    case "rate-limit":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Max calls</label>
            <input type="number" value={String(rule.maxCalls ?? 100)} onChange={(e) => set("maxCalls", parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Time window (seconds)</label>
            <input type="number" value={String(rule.timeWindowSeconds ?? 60)} onChange={(e) => set("timeWindowSeconds", parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
          </div>
        </div>
      );
    case "model-allowlist":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Allowed models (one per line)</label>
          <textarea value={arr("allowedModels").join("\n")} rows={3}
            onChange={(e) => set("allowedModels", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1 font-mono" />
        </div>
      );
    case "content-filter":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Regex patterns (one per line)</label>
          <textarea value={arr("patterns").join("\n")} rows={3}
            onChange={(e) => set("patterns", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1 font-mono" />
        </div>
      );
    case "data-access":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Allowed source IDs (one per line)</label>
          <textarea value={arr("allowedSources").join("\n")} rows={3}
            onChange={(e) => set("allowedSources", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1 font-mono" />
        </div>
      );
    case "compliance":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">PII types to detect</label>
          {["ssn", "creditCard", "email", "phone", "ipAddress"].map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={arr("piiTypes").includes(t)}
                onChange={(e) => {
                  const cur = arr("piiTypes");
                  set("piiTypes", e.target.checked ? [...cur, t] : cur.filter((x: string) => x !== t));
                }} />
              {t}
            </label>
          ))}
        </div>
      );
    case "cost-budget":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Max tokens per execution</label>
          <input type="number" value={String(rule.maxTokens ?? 10000)} onChange={(e) => set("maxTokens", parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
        </div>
      );
    case "human-gate":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Approval message shown to reviewer</label>
          <textarea value={String(rule.approvalMessage ?? "")} rows={2}
            onChange={(e) => set("approvalMessage", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
        </div>
      );
    case "custom":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Expression (e.g. <code>tokenCount &gt; 5000</code>)</label>
          <input type="text" value={String(rule.expression ?? "")} onChange={(e) => set("expression", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1 font-mono"
            placeholder="field operator value" />
          <p className="text-xs text-gray-400 mt-1">Operators: == != &gt; &gt;= &lt; &lt;= contains</p>
        </div>
      );
  }
}

export default function PoliciesPage() {
  const TENANT_ID = "default";
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [summary, setSummary] = useState<{ totalPolicies: number; enabledCount: number; byType: Record<string, number> } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Create panel
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", type: "rate-limit" as PolicyType, enabled: true,
    priority: 50, action: "deny" as PolicyDecisionType,
    scope: { target: "all" as string, resourceId: "" },
    rule: EMPTY_RULE["rate-limit"],
  });
  const [saving, setSaving] = useState(false);

  // Test panel
  const [showTest, setShowTest] = useState(false);
  const [testCtx, setTestCtx] = useState(`{\n  "tenantId": "default",\n  "executionId": "test-1",\n  "nodeId": "node-1",\n  "nodeType": "agent"\n}`);
  const [testPhase, setTestPhase] = useState<"pre" | "post">("pre");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tenantId: TENANT_ID });
    if (typeFilter) params.set("type", typeFilter);
    const [pResp, sResp] = await Promise.all([
      fetch(`/api/policies?${params}`),
      fetch(`/api/policies/summary?tenantId=${TENANT_ID}`),
    ]);
    if (pResp.ok) { const d = await pResp.json(); setPolicies(d.items ?? []); }
    if (sResp.ok) setSummary(await sResp.json());
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleEnabled(policy: Policy) {
    const route = policy.enabled ? "disable" : "enable";
    await fetch(`/api/policies/${policy.id}/${route}?tenantId=${TENANT_ID}`, { method: "POST" });
    fetchData();
  }

  async function deletePolicy(id: string) {
    if (!confirm("Delete this policy?")) return;
    await fetch(`/api/policies/${id}?tenantId=${TENANT_ID}`, { method: "DELETE" });
    fetchData();
  }

  async function savePolicy() {
    setSaving(true);
    const body = {
      ...form,
      tenantId: TENANT_ID,
      scope: { target: form.scope.target, ...(form.scope.resourceId ? { resourceId: form.scope.resourceId } : {}) },
      rules: [form.rule],
    };
    const resp = await fetch("/api/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (resp.ok) { setShowCreate(false); resetForm(); fetchData(); }
  }

  function resetForm() {
    setForm({ name: "", description: "", type: "rate-limit", enabled: true, priority: 50, action: "deny",
      scope: { target: "all", resourceId: "" }, rule: EMPTY_RULE["rate-limit"] });
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const ctx = JSON.parse(testCtx);
      const resp = await fetch("/api/policies/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctx, phase: testPhase }),
      });
      setTestResult(await resp.json());
    } catch (e: any) { setTestResult({ error: e.message }); }
    setTesting(false);
  }

  const decisionBadge = (d: string) => {
    const styles: Record<string, string> = { allow: "bg-green-100 text-green-700", deny: "bg-red-100 text-red-700", transform: "bg-yellow-100 text-yellow-700", "pending-approval": "bg-purple-100 text-purple-700" };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[d] ?? "bg-gray-100 text-gray-600"}`}>{d}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Registry</h1>
          <p className="text-sm text-gray-500 mt-1">Governance policies applied to all agent executions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTest(!showTest)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Test Policy
          </button>
          <button onClick={() => { setShowCreate(true); setShowTest(false); }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + New Policy
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-4"><p className="text-xs text-gray-500">Total Policies</p><p className="text-2xl font-bold">{summary.totalPolicies}</p></div>
          <div className="bg-white border rounded-lg p-4"><p className="text-xs text-gray-500">Enabled</p><p className="text-2xl font-bold text-green-700">{summary.enabledCount}</p></div>
          <div className="bg-white border rounded-lg p-4"><p className="text-xs text-gray-500">Disabled</p><p className="text-2xl font-bold text-gray-400">{summary.totalPolicies - summary.enabledCount}</p></div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Top type</p>
            {Object.entries(summary.byType).sort((a, b) => b[1] - a[1])[0] ? (
              <p className="text-sm font-semibold truncate">{Object.entries(summary.byType).sort((a, b) => b[1] - a[1])[0]![0]}</p>
            ) : <p className="text-sm text-gray-400">—</p>}
          </div>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter("")} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${typeFilter === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>All</button>
        {POLICY_TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${typeFilter === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>{t}</button>
        ))}
      </div>

      {/* Test panel */}
      {showTest && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Test Policy Evaluation</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">PolicyContext (JSON)</label>
              <textarea value={testCtx} onChange={(e) => setTestCtx(e.target.value)} rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono mt-1" />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Phase</label>
                <select value={testPhase} onChange={(e) => setTestPhase(e.target.value as "pre" | "post")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  <option value="pre">pre-execution</option>
                  <option value="post">post-execution</option>
                </select>
              </div>
              <button onClick={runTest} disabled={testing} className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {testing ? "Evaluating…" : "Evaluate"}
              </button>
              {testResult && (
                <div className={`p-3 rounded-lg border text-sm ${ACTION_COLORS[testResult.decision as PolicyDecisionType] ?? "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2 font-semibold mb-1">Decision: {testResult.decision ?? "error"}</div>
                  {testResult.reason && <p className="text-xs">{testResult.reason}</p>}
                  {testResult.error && <p className="text-xs text-red-600">{testResult.error}</p>}
                  <p className="text-xs mt-1 opacity-70">Applied: {testResult.appliedPolicies?.length ?? 0} policies</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create panel */}
      {showCreate && (
        <div className="bg-white border border-blue-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">New Policy</h3>
            <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Policy name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Type *</label>
              <select value={form.type} onChange={(e) => {
                const t = e.target.value as PolicyType;
                setForm({ ...form, type: t, rule: EMPTY_RULE[t] });
              }} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                {POLICY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Action</label>
              <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as PolicyDecisionType })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                <option value="deny">deny</option>
                <option value="pending-approval">pending-approval</option>
                <option value="transform">transform</option>
                <option value="allow">allow</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Priority (0–100, higher = first)</label>
              <input type="number" min={0} max={100} value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Scope target</label>
              <select value={form.scope.target} onChange={(e) => setForm({ ...form, scope: { ...form.scope, target: e.target.value } })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                {SCOPE_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {form.scope.target !== "all" && (
              <div>
                <label className="text-xs font-medium text-gray-600">Resource ID (leave blank for all)</label>
                <input value={form.scope.resourceId} onChange={(e) => setForm({ ...form, scope: { ...form.scope, resourceId: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Optional" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Rule Configuration</label>
            <RuleForm type={form.type} rule={form.rule} onChange={(r) => setForm({ ...form, rule: r })} />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              Enable immediately
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={savePolicy} disabled={saving || !form.name}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create Policy"}
            </button>
          </div>
        </div>
      )}

      {/* Policy table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-1">No policies yet</p>
          <p className="text-sm">Create your first policy to start governing agent executions</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Enabled</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div>{p.name}</div>
                    {p.description && <div className="text-xs text-gray-400 truncate max-w-[200px]">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[p.type]}`}>{p.type}</span></td>
                  <td className="px-4 py-3">{decisionBadge(p.action)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.priority}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.scope.target}{p.scope.resourceId ? ` / ${p.scope.resourceId}` : ""}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleEnabled(p)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.enabled ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${p.enabled ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deletePolicy(p.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
