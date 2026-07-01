import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";
import { evaluatePolicies, applyTransforms } from "../../lib/policy/engine.js";
import type { PolicyContext } from "../../lib/policy/engine.js";
import { ExecutionContext } from "../../lib/orchestration/context.js";
import { StateMachine } from "../../lib/orchestration/engine.js";
import type { NodeDef, EdgeDef, NodeStateRecord } from "../../lib/orchestration/engine.js";
import { getHandler } from "../../lib/orchestration/patterns/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "paused";
type NodeExecutionStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "pending-approval" | "approved" | "rejected" | "policy-flagged";

interface NodeExecution {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: NodeExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  iteration?: number;
  retryCount?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  preDecision?: { decision: string; reason?: string; appliedPolicies: string[] };
  postDecision?: { decision: string; reason?: string; appliedPolicies: string[] };
  approvedBy?: string;
  approvedAt?: string;
}

interface OrchestrationExecution {
  id: string;
  name: string;
  tenantId: string;
  templateId?: string;
  templateName?: string;
  status: ExecutionStatus;
  parameters: Record<string, unknown>;
  appliedPolicyIds: string[];
  nodeExecutions: NodeExecution[];
  /** Serialized StateMachine node states for resume support */
  _smStates?: NodeStateRecord[];
  /** Serialized ExecutionContext snapshot */
  _context?: { data: Record<string, unknown>; metadata: Record<string, unknown> };
  policyViolations: number;
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  error?: string;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const StartExecutionSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  templateId: z.string().optional(),
  // If no templateId, inline nodes/edges can be provided
  nodes: z.array(z.record(z.unknown())).optional(),
  edges: z.array(z.record(z.unknown())).optional(),
  parameters: z.record(z.unknown()).default({}),
  additionalPolicyIds: z.array(z.string()).default([]),
  tenantId: z.string().min(1),
});

// ── Execution Engine ──────────────────────────────────────────────────────────

/** Topological sort using Kahn's algorithm */
function topoSort(nodes: any[], edges: any[]): any[][] {
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adjList.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    adjList.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  // BFS level by level — same level = parallel candidates
  const levels: any[][] = [];
  let current = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);

  while (current.length > 0) {
    levels.push(current);
    const next: any[] = [];
    for (const node of current) {
      for (const target of adjList.get(node.id) ?? []) {
        const d = (inDegree.get(target) ?? 1) - 1;
        inDegree.set(target, d);
        if (d === 0) {
          const targetNode = nodes.find((n) => n.id === target);
          if (targetNode) next.push(targetNode);
        }
      }
    }
    current = next;
  }

  // Fallback: any nodes not yet scheduled (cycles) — append them
  const scheduled = new Set(levels.flat().map((n) => n.id));
  const remaining = nodes.filter((n) => !scheduled.has(n.id));
  if (remaining.length > 0) levels.push(remaining);

  return levels;
}

/** Substitute {{paramName}} placeholders in node data */
function substituteParameters(nodes: any[], params: Record<string, unknown>): any[] {
  return nodes.map((n) => ({
    ...n,
    data: JSON.parse(
      JSON.stringify(n.data ?? {}).replace(
        /\{\{(\w+)\}\}/g,
        (_: string, key: string) => String(params[key] ?? `{{${key}}}`)
      )
    ),
  }));
}

/** Simulate node execution — in production this would call actual agent/tool endpoints */
async function executeNode(
  node: any,
  inputText: string,
  params: Record<string, unknown>
): Promise<{ output: string; tokenCount: number; modelId?: string }> {
  // Simulate ~100-400ms execution
  await new Promise((res) => setTimeout(res, 100 + Math.random() * 300));

  const nodeType = (node.type ?? node.data?.type ?? "agent") as string;
  const label = node.data?.label ?? node.label ?? nodeType;

  return {
    output: `[${label}] Processed: ${inputText.slice(0, 120)}${inputText.length > 120 ? "…" : ""}`,
    tokenCount: Math.floor(Math.random() * 800) + 100,
    modelId: node.data?.modelId as string | undefined,
  };
}

/** Core execution loop — runs nodes level by level, evaluating policies at each step */
async function runExecution(
  execution: OrchestrationExecution,
  nodes: any[],
  edges: any[],
  allPolicyIds: string[]
): Promise<void> {
  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  const levels = topoSort(nodes, edges);

  let previousOutput = "";
  let policyViolations = 0;

  for (const level of levels) {
    // Process nodes in this level in parallel (fan-out pattern)
    const levelOutputs = await Promise.all(
      level.map(async (node: any) => {
        const ne: NodeExecution = {
          nodeId: node.id,
          nodeType: node.type ?? node.data?.type ?? "unknown",
          nodeLabel: node.data?.label ?? node.label ?? node.id,
          status: "running",
          startedAt: new Date().toISOString(),
        };

        const ctx: PolicyContext = {
          executionId: execution.id,
          nodeId: node.id,
          nodeType: ne.nodeType,
          agentId: node.data?.agentId as string | undefined,
          serverId: node.data?.serverId as string | undefined,
          modelId: node.data?.modelId as string | undefined,
          dataSourceIds: node.data?.dataSourceIds as string[] | undefined,
          inputText: previousOutput || "initial input",
          tenantId: execution.tenantId,
        };

        // ── PRE-execution policy check ────────────────────────────────────
        const preDecision = await evaluatePolicies(ctx, "pre", allPolicyIds);
        ne.preDecision = {
          decision: preDecision.decision,
          reason: preDecision.reason,
          appliedPolicies: preDecision.appliedPolicies,
        };

        if (preDecision.decision === "deny") {
          ne.status = "policy-flagged";
          ne.error = preDecision.reason ?? "Denied by policy";
          ne.completedAt = new Date().toISOString();
          policyViolations++;
          return { ne, output: "" };
        }

        if (preDecision.decision === "pending-approval") {
          ne.status = "pending-approval";
          ne.completedAt = new Date().toISOString();
          policyViolations++;
          return { ne, output: "", pause: true };
        }

        // Apply any input transforms
        let inputText = ctx.inputText!;
        if (preDecision.transforms) inputText = applyTransforms(inputText, preDecision.transforms);

        // ── Execute node ──────────────────────────────────────────────────
        const startMs = Date.now();
        let nodeOutput: string;
        let tokenCount = 0;

        try {
          const result = await executeNode(node, inputText, execution.parameters);
          nodeOutput = result.output;
          tokenCount = result.tokenCount;
        } catch (err: any) {
          ne.status = "failed";
          ne.error = err.message ?? "Node execution failed";
          ne.completedAt = new Date().toISOString();
          ne.durationMs = Date.now() - startMs;
          return { ne, output: "" };
        }

        // ── POST-execution policy check ───────────────────────────────────
        const postCtx: PolicyContext = { ...ctx, outputText: nodeOutput, tokenCount };
        const postDecision = await evaluatePolicies(postCtx, "post", allPolicyIds);
        ne.postDecision = {
          decision: postDecision.decision,
          reason: postDecision.reason,
          appliedPolicies: postDecision.appliedPolicies,
        };

        if (postDecision.decision === "deny") {
          ne.status = "policy-flagged";
          ne.error = postDecision.reason ?? "Output flagged by policy";
          ne.completedAt = new Date().toISOString();
          ne.durationMs = Date.now() - startMs;
          policyViolations++;
          return { ne, output: "" };
        }

        // Apply output transforms (content-filter / compliance redaction)
        if (postDecision.transforms) nodeOutput = applyTransforms(nodeOutput, postDecision.transforms);

        ne.status = "completed";
        ne.output = nodeOutput;
        ne.completedAt = new Date().toISOString();
        ne.durationMs = Date.now() - startMs;
        return { ne, output: nodeOutput };
      })
    );

    // Collect level outputs, check for pause
    let shouldPause = false;
    for (const { ne, pause } of levelOutputs) {
      const idx = execution.nodeExecutions.findIndex((n) => n.nodeId === ne.nodeId);
      if (idx >= 0) execution.nodeExecutions[idx] = ne; else execution.nodeExecutions.push(ne);
      if (pause) shouldPause = true;
    }

    execution.policyViolations = policyViolations;

    if (shouldPause) {
      execution.status = "paused";
      await container.items.upsert(execution);
      return; // Stop here — resume via approve endpoint
    }

    // Fan-in: combine non-empty outputs for next level
    const levelOutput = levelOutputs.map((r) => r.output).filter(Boolean).join("\n");
    if (levelOutput) previousOutput = levelOutput;

    // Persist state after each level so polling works
    await container.items.upsert({ ...execution });
  }

  execution.status = "completed";
  execution.completedAt = new Date().toISOString();
  await container.items.upsert(execution);
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function startExecution(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  let body: unknown;
  try { body = await req.json(); } catch { return { status: 400, jsonBody: { error: "Invalid JSON" } }; }

  const parsed = StartExecutionSchema.safeParse(body);
  if (!parsed.success) return { status: 422, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };

  const data = parsed.data;
  let nodes: any[] = data.nodes ?? [];
  let edges: any[] = data.edges ?? [];
  let templateName: string | undefined;

  // Load template if ID provided
  if (data.templateId) {
    const tContainer = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
    const { resource: template } = await tContainer.item(data.templateId, data.tenantId).read<any>();
    if (!template) return { status: 404, jsonBody: { error: "Template not found" } };
    nodes = substituteParameters(template.nodes ?? [], data.parameters);
    edges = template.edges ?? [];
    templateName = template.name;

    // Merge template's default policy IDs + additional
    data.additionalPolicyIds = [
      ...new Set([...(template.defaultPolicyIds ?? []), ...data.additionalPolicyIds]),
    ];

    // Increment template usageCount
    await tContainer.items.upsert({ ...template, usageCount: (template.usageCount ?? 0) + 1 });
  }

  if (nodes.length === 0) return { status: 422, jsonBody: { error: "At least one node is required" } };

  const now = new Date().toISOString();
  const execution: OrchestrationExecution = {
    id: uuidv4(),
    name: data.name ?? `Execution ${new Date().toLocaleString()}`,
    tenantId: data.tenantId,
    templateId: data.templateId,
    templateName,
    status: "running",
    parameters: data.parameters,
    appliedPolicyIds: data.additionalPolicyIds,
    nodeExecutions: nodes.map((n: any) => ({
      nodeId: n.id,
      nodeType: n.type ?? n.data?.type ?? "unknown",
      nodeLabel: n.data?.label ?? n.label ?? n.id,
      status: "pending" as NodeExecutionStatus,
    })),
    policyViolations: 0,
    startedAt: now,
  };

  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  await container.items.create(execution);

  // Run execution synchronously (TODO: migrate to Durable Functions for long-running workflows)
  try {
    await runExecution(execution, nodes, edges, data.additionalPolicyIds);
  } catch (err: any) {
    execution.status = "failed";
    execution.error = err.message ?? "Execution failed";
    execution.completedAt = new Date().toISOString();
    await container.items.upsert(execution);
  }

  // Return final state
  const { resource: final } = await container.item(execution.id, data.tenantId).read<any>();
  return { status: 201, jsonBody: final ?? execution };
}

async function listExecutions(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId") ?? "default";
  const status = url.searchParams.get("status");
  const templateId = url.searchParams.get("templateId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));

  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  const { resources } = await container.items.query<any>({
    query: "SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.startedAt DESC",
    parameters: [{ name: "@tenantId", value: tenantId }],
  }).fetchAll();

  let items = resources ?? [];
  if (status) items = items.filter((e: any) => e.status === status);
  if (templateId) items = items.filter((e: any) => e.templateId === templateId);

  const total = items.length;
  // Return lightweight version for list view (omit nodeExecutions detail)
  const paged = items.slice((page - 1) * pageSize, page * pageSize).map((e: any) => ({
    id: e.id,
    name: e.name,
    tenantId: e.tenantId,
    templateId: e.templateId,
    templateName: e.templateName,
    status: e.status,
    nodeCount: e.nodeExecutions?.length ?? 0,
    completedNodes: e.nodeExecutions?.filter((n: any) => n.status === "completed").length ?? 0,
    policyViolations: e.policyViolations,
    appliedPolicyIds: e.appliedPolicyIds,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
  }));

  return { status: 200, jsonBody: { items: paged, total, page, pageSize } };
}

async function getExecution(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Execution not found" } };
  return { status: 200, jsonBody: resource };
}

async function getExecutionStatus(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Execution not found" } };

  return {
    status: 200,
    jsonBody: {
      id: resource.id,
      status: resource.status,
      policyViolations: resource.policyViolations,
      startedAt: resource.startedAt,
      completedAt: resource.completedAt,
      nodeExecutions: (resource.nodeExecutions ?? []).map((n: any) => ({
        nodeId: n.nodeId,
        nodeLabel: n.nodeLabel,
        nodeType: n.nodeType,
        status: n.status,
        durationMs: n.durationMs,
        preDecision: n.preDecision,
        postDecision: n.postDecision,
        error: n.error,
      })),
    },
  };
}

async function cancelExecution(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Execution not found" } };
  if (resource.status === "completed" || resource.status === "failed") {
    return { status: 409, jsonBody: { error: `Cannot cancel a ${resource.status} execution` } };
  }
  const updated = { ...resource, status: "cancelled", cancelledAt: new Date().toISOString() };
  await container.items.upsert(updated);
  return { status: 200, jsonBody: updated };
}

async function resolveHumanGate(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const nodeId = req.params.nodeId!;
  const isApprove = req.url.includes("/approve/");

  let body: any = {};
  try { body = await req.json(); } catch { /* body optional */ }

  const tenantId = body.tenantId ?? new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Execution not found" } };
  if (resource.status !== "paused") return { status: 409, jsonBody: { error: "Execution is not paused" } };

  const ne = resource.nodeExecutions?.find((n: any) => n.nodeId === nodeId);
  if (!ne) return { status: 404, jsonBody: { error: "Node execution not found" } };
  if (ne.status !== "pending-approval") return { status: 409, jsonBody: { error: "Node is not pending approval" } };

  const now = new Date().toISOString();
  ne.status = isApprove ? "approved" : "rejected";
  ne.approvedBy = body.approvedBy ?? "system";
  ne.approvedAt = now;

  if (!isApprove) {
    resource.status = "failed";
    resource.error = `Node ${nodeId} rejected at human gate`;
    resource.completedAt = now;
  } else {
    // Check if all pending nodes are resolved; resume if so
    const stillPending = resource.nodeExecutions.some((n: any) => n.status === "pending-approval");
    if (!stillPending) {
      resource.status = "running";
      // NOTE: In production with Durable Functions, this would trigger continuation.
      // For MVP, mark as completed since we can't resume mid-execution.
      resource.status = "completed";
      resource.completedAt = now;
    }
  }

  await container.items.upsert(resource);
  return { status: 200, jsonBody: resource };
}

async function getExecutionAudit(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_EXECUTIONS);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Execution not found" } };

  const trail = (resource.nodeExecutions ?? []).flatMap((n: any) => {
    const entries = [];
    if (n.preDecision) entries.push({
      nodeId: n.nodeId,
      nodeLabel: n.nodeLabel,
      phase: "pre",
      timestamp: n.startedAt,
      decision: n.preDecision.decision,
      reason: n.preDecision.reason,
      appliedPolicies: n.preDecision.appliedPolicies,
    });
    if (n.postDecision) entries.push({
      nodeId: n.nodeId,
      nodeLabel: n.nodeLabel,
      phase: "post",
      timestamp: n.completedAt,
      decision: n.postDecision.decision,
      reason: n.postDecision.reason,
      appliedPolicies: n.postDecision.appliedPolicies,
    });
    return entries;
  });

  return { status: 200, jsonBody: { executionId: id, trail } };
}

// ── Registration ──────────────────────────────────────────────────────────────

app.http("startOrchExecution", { methods: ["POST"], authLevel: "anonymous", route: "orchestration/executions", handler: startExecution });
app.http("listOrchExecutions", { methods: ["GET"], authLevel: "anonymous", route: "orchestration/executions", handler: listExecutions });
app.http("getOrchExecution", { methods: ["GET"], authLevel: "anonymous", route: "orchestration/executions/{id}", handler: getExecution });
app.http("getOrchExecutionStatus", { methods: ["GET"], authLevel: "anonymous", route: "orchestration/executions/{id}/status", handler: getExecutionStatus });
app.http("cancelOrchExecution", { methods: ["POST"], authLevel: "anonymous", route: "orchestration/executions/{id}/cancel", handler: cancelExecution });
app.http("approveOrchNode", { methods: ["POST"], authLevel: "anonymous", route: "orchestration/executions/{id}/approve/{nodeId}", handler: resolveHumanGate });
app.http("rejectOrchNode", { methods: ["POST"], authLevel: "anonymous", route: "orchestration/executions/{id}/reject/{nodeId}", handler: resolveHumanGate });
app.http("getOrchExecutionAudit", { methods: ["GET"], authLevel: "anonymous", route: "orchestration/executions/{id}/audit", handler: getExecutionAudit });
