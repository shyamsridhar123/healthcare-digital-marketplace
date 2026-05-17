"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { OrchestrationTemplate, TemplateParameter, Policy } from "@/lib/types";

export default function ExecuteTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  const TENANT_ID = "default";

  const [template, setTemplate] = useState<OrchestrationTemplate | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [boundPolicies, setBoundPolicies] = useState<Policy[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [extraPolicyIds, setExtraPolicyIds] = useState<string[]>([]);
  const [executionName, setExecutionName] = useState("");
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [tResp, pResp] = await Promise.all([
        fetch(`/api/orchestration/templates/${templateId}?tenantId=${TENANT_ID}`),
        fetch(`/api/policies?tenantId=${TENANT_ID}&pageSize=100`),
      ]);

      if (!tResp.ok) { setError("Template not found"); setLoading(false); return; }
      const tmpl: OrchestrationTemplate = await tResp.json();
      setTemplate(tmpl);
      setExecutionName(`${tmpl.name} — ${new Date().toLocaleString()}`);

      // Pre-fill default param values
      const defaults: Record<string, string> = {};
      for (const p of tmpl.parameters) {
        if (p.default !== undefined) defaults[p.name] = String(p.default);
      }
      setParamValues(defaults);

      if (pResp.ok) {
        const d = await pResp.json();
        const allPolicies: Policy[] = d.items ?? [];
        setPolicies(allPolicies);
        setBoundPolicies(allPolicies.filter((p) => tmpl.defaultPolicyIds.includes(p.id)));
      }

      setLoading(false);
    }
    load();
  }, [templateId]);

  async function launch() {
    if (!template) return;
    setLaunching(true);
    setError("");

    const parameters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(paramValues)) {
      const def = template.parameters.find((p) => p.name === k);
      if (def?.type === "number") parameters[k] = Number(v);
      else if (def?.type === "boolean") parameters[k] = v === "true";
      else parameters[k] = v;
    }

    const resp = await fetch("/api/orchestration/executions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: executionName,
        templateId: template.id,
        parameters,
        additionalPolicyIds: extraPolicyIds,
        tenantId: TENANT_ID,
      }),
    });

    setLaunching(false);
    if (resp.ok) {
      const exec = await resp.json();
      router.push(`/orchestration/executions/${exec.id}?tenantId=${TENANT_ID}`);
    } else {
      const d = await resp.json().catch(() => ({ error: "Launch failed" }));
      setError(d.error ?? "Launch failed");
    }
  }

  function renderParamInput(param: TemplateParameter) {
    const value = paramValues[param.name] ?? "";
    const set = (v: string) => setParamValues({ ...paramValues, [param.name]: v });

    if (param.type === "boolean") {
      return (
        <select value={value} onChange={(e) => set(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Select…</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }
    return (
      <input type={param.type === "number" ? "number" : "text"}
        value={value} onChange={(e) => set(e.target.value)}
        placeholder={param.description ?? `Enter ${param.name}`}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (error && !template) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-red-600">{error}</div>;
  }

  if (!template) return null;

  const availableExtra = policies.filter((p) => !template.defaultPolicyIds.includes(p.id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-xs text-blue-600 hover:underline mb-3 block">← Back to Templates</button>
        <h1 className="text-2xl font-bold text-gray-900">Launch: {template.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
        <div className="flex gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{template.category}</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">v{template.version}</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{template.nodes.length} nodes</span>
        </div>
      </div>

      {/* Execution name */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-1">Execution name</label>
        <input value={executionName} onChange={(e) => setExecutionName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
      </div>

      {/* Parameters */}
      {template.parameters.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Parameters</h2>
          {template.parameters.map((param) => (
            <div key={param.name}>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                {param.name}
                {param.required && <span className="text-red-500">*</span>}
                <span className="text-gray-400 font-normal">({param.type})</span>
              </label>
              {param.description && <p className="text-xs text-gray-400 mb-1">{param.description}</p>}
              {renderParamInput(param)}
            </div>
          ))}
        </div>
      )}

      {/* Bound policies */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Bound Policies</h2>
        {boundPolicies.length === 0 ? (
          <p className="text-xs text-gray-400">No policies bound to this template</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {boundPolicies.map((p) => (
              <div key={p.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${p.enabled ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-green-500" : "bg-gray-400"}`} />
                {p.name}
                <span className="opacity-60">({p.type})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extra policies */}
      {availableExtra.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Add Extra Policies</h2>
          <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {availableExtra.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-gray-50 px-1 rounded">
                <input type="checkbox" checked={extraPolicyIds.includes(p.id)}
                  onChange={(e) => setExtraPolicyIds(e.target.checked ? [...extraPolicyIds, p.id] : extraPolicyIds.filter((id) => id !== p.id))} />
                <span>{p.name}</span>
                <span className="text-xs text-gray-400">({p.type} — {p.action})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* Launch button */}
      <div className="flex gap-3 pt-2">
        <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={launch} disabled={launching || template.parameters.some((p) => p.required && !paramValues[p.name])}
          className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
          {launching ? "Launching…" : "Start Execution"}
        </button>
      </div>
    </div>
  );
}
