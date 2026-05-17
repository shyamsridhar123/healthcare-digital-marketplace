"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import type { OrchestrationExecution, NodeExecution, NodeExecutionStatus, ExecutionStatus } from "@/lib/types";

const NODE_STATUS_STYLES: Record<NodeExecutionStatus, string> = {
  pending:          "border-gray-200 bg-gray-50",
  running:          "border-blue-300 bg-blue-50",
  completed:        "border-green-300 bg-green-50",
  failed:           "border-red-300 bg-red-50",
  skipped:          "border-gray-200 bg-gray-50 opacity-60",
  "pending-approval": "border-purple-400 bg-purple-50 ring-2 ring-purple-300",
  approved:         "border-green-300 bg-green-50",
  rejected:         "border-red-300 bg-red-50",
  "policy-denied":  "border-red-400 bg-red-50",
};

const NODE_STATUS_DOT: Record<NodeExecutionStatus, string> = {
  pending:          "bg-gray-400",
  running:          "bg-blue-500 animate-pulse",
  completed:        "bg-green-500",
  failed:           "bg-red-500",
  skipped:          "bg-gray-300",
  "pending-approval": "bg-purple-500 animate-pulse",
  approved:         "bg-green-400",
  rejected:         "bg-red-400",
  "policy-denied":  "bg-red-600",
};

const DECISION_BADGE: Record<string, string> = {
  allow:            "bg-green-100 text-green-700",
  deny:             "bg-red-100 text-red-700",
  transform:        "bg-yellow-100 text-yellow-700",
  "pending-approval": "bg-purple-100 text-purple-700",
};

const EXEC_STATUS_STYLES: Record<ExecutionStatus, string> = {
  pending:   "bg-gray-100 text-gray-600",
  running:   "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed:    "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  paused:    "bg-purple-100 text-purple-700",
};

function NodeCard({ node, onApprove, onReject, approving }: {
  node: NodeExecution;
  onApprove?: () => void;
  onReject?: () => void;
  approving?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border-2 rounded-xl p-4 space-y-2 transition-all ${NODE_STATUS_STYLES[node.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${NODE_STATUS_DOT[node.status]}`} />
          <span className="font-semibold text-sm text-gray-900">{node.nodeLabel}</span>
          <span className="text-xs text-gray-400">{node.nodeType}</span>
        </div>
        {node.durationMs != null && <span className="text-xs text-gray-400">{node.durationMs}ms</span>}
      </div>

      {/* Policy decisions */}
      <div className="flex gap-1.5 flex-wrap">
        {node.preDecision && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DECISION_BADGE[node.preDecision.decision] ?? "bg-gray-100 text-gray-600"}`}>
            pre: {node.preDecision.decision}
          </span>
        )}
        {node.postDecision && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DECISION_BADGE[node.postDecision.decision] ?? "bg-gray-100 text-gray-600"}`}>
            post: {node.postDecision.decision}
          </span>
        )}
      </div>

      {node.error && <p className="text-xs text-red-700 bg-red-50 rounded px-2 py-1">{node.error}</p>}

      {/* Approval gate controls */}
      {node.status === "pending-approval" && (
        <div className="flex gap-2 mt-1">
          <button onClick={onApprove} disabled={approving} className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {approving ? "…" : "Approve"}
          </button>
          <button onClick={onReject} disabled={approving} className="flex-1 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            Reject
          </button>
        </div>
      )}

      {/* Expand for output / decisions */}
      {(node.output || node.preDecision?.reason || node.postDecision?.reason) && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline">
          {expanded ? "Hide details" : "Show details"}
        </button>
      )}
      {expanded && (
        <div className="space-y-1.5">
          {node.preDecision?.reason && <p className="text-xs text-gray-600"><span className="font-medium">Pre reason:</span> {node.preDecision.reason}</p>}
          {node.postDecision?.reason && <p className="text-xs text-gray-600"><span className="font-medium">Post reason:</span> {node.postDecision.reason}</p>}
          {node.output && (
            <div>
              <p className="text-xs font-medium text-gray-600">Output:</p>
              <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap">
                {typeof node.output === "string" ? node.output : JSON.stringify(node.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExecutionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const TENANT_ID = searchParams.get("tenantId") ?? "default";

  const [execution, setExecution] = useState<OrchestrationExecution | null>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"nodes" | "audit">("nodes");
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchExecution = useCallback(async () => {
    const resp = await fetch(`/api/orchestration/executions/${id}?tenantId=${TENANT_ID}`);
    if (resp.ok) setExecution(await resp.json());
    setLoading(false);
  }, [id, TENANT_ID]);

  const fetchAudit = useCallback(async () => {
    const resp = await fetch(`/api/orchestration/executions/${id}/audit?tenantId=${TENANT_ID}`);
    if (resp.ok) { const d = await resp.json(); setAudit(d.trail ?? []); }
  }, [id, TENANT_ID]);

  useEffect(() => {
    fetchExecution();
  }, [fetchExecution]);

  // Poll while running or paused
  useEffect(() => {
    if (!execution) return;
    if (execution.status === "running" || execution.status === "paused") {
      pollRef.current = setInterval(fetchExecution, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [execution?.status, fetchExecution]);

  useEffect(() => {
    if (activeTab === "audit") fetchAudit();
  }, [activeTab, fetchAudit]);

  async function handleApprove(nodeId: string, approve: boolean) {
    setApproving(nodeId);
    await fetch(`/api/orchestration/executions/${id}/${approve ? "approve" : "reject"}/${nodeId}?tenantId=${TENANT_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedBy: "current-user", tenantId: TENANT_ID }),
    });
    setApproving(null);
    fetchExecution();
  }

  async function cancelExecution() {
    if (!confirm("Cancel this execution?")) return;
    await fetch(`/api/orchestration/executions/${id}/cancel?tenantId=${TENANT_ID}`, { method: "POST" });
    fetchExecution();
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!execution) {
    return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-500">Execution not found</div>;
  }

  const durationMs = execution.completedAt
    ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
    : Date.now() - new Date(execution.startedAt).getTime();

  const pendingApprovalNodes = execution.nodeExecutions.filter((n) => n.status === "pending-approval");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-xs text-blue-600 hover:underline mb-2 block">← Back to Executions</button>
          <h1 className="text-xl font-bold text-gray-900">{execution.name}</h1>
          {execution.templateName && <p className="text-sm text-gray-500">Template: {execution.templateName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${EXEC_STATUS_STYLES[execution.status]}`}>
            {execution.status}
          </span>
          {(execution.status === "running" || execution.status === "paused") && (
            <button onClick={cancelExecution} className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Nodes</p>
          <p className="text-xl font-bold text-gray-900">{execution.nodeExecutions.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-xl font-bold text-green-700">{execution.nodeExecutions.filter((n) => n.status === "completed").length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Policy Violations</p>
          <p className={`text-xl font-bold ${execution.policyViolations > 0 ? "text-red-600" : "text-gray-900"}`}>{execution.policyViolations}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Policies Applied</p>
          <p className="text-xl font-bold text-gray-900">{execution.appliedPolicyIds.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Duration</p>
          <p className="text-xl font-bold text-gray-900">
            {durationMs < 1000 ? `${durationMs}ms` : durationMs < 60000 ? `${(durationMs / 1000).toFixed(1)}s` : `${Math.floor(durationMs / 60000)}m`}
          </p>
        </div>
      </div>

      {/* Paused banner */}
      {pendingApprovalNodes.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
          <p className="text-sm font-semibold text-purple-800 mb-1">⏸ Execution paused — awaiting human approval</p>
          <p className="text-xs text-purple-600">{pendingApprovalNodes.length} node(s) require review before proceeding.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        {(["nodes", "audit"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab === "nodes" ? "Node Executions" : "Policy Audit Trail"}
          </button>
        ))}
      </div>

      {/* Node cards */}
      {activeTab === "nodes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {execution.nodeExecutions.map((node) => (
            <NodeCard key={node.nodeId} node={node}
              approving={approving === node.nodeId}
              onApprove={() => handleApprove(node.nodeId, true)}
              onReject={() => handleApprove(node.nodeId, false)} />
          ))}
        </div>
      )}

      {/* Audit trail */}
      {activeTab === "audit" && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {audit.length === 0 ? (
            <p className="text-sm text-gray-500 p-6 text-center">No policy decisions recorded</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Node</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Phase</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Decision</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Policies Applied</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audit.map((entry, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{entry.nodeLabel}</td>
                    <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{entry.phase}</span></td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DECISION_BADGE[entry.decision] ?? "bg-gray-100 text-gray-600"}`}>{entry.decision}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{entry.reason ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{entry.appliedPolicies?.length ?? 0}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
