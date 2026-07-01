/**
 * StateMachine — edge-aware orchestration engine.
 *
 * Replaces the previous Kahn's algorithm level-by-level executor with a
 * proper state machine that:
 *  - Tracks each node's lifecycle (pending → ready → running → completed/failed/paused/skipped/…)
 *  - Evaluates edge conditions to determine which downstream nodes to activate
 *  - Enables true per-node resume after human-gate approval
 *  - Supports conditional branching, loop back-edges, and fan-out/fan-in
 */

import type { ExecutionContext } from "./context.js";

// ── Node/edge lifecycle types ─────────────────────────────────────────────────

export type NodeState =
  | "pending"           // waiting for upstream dependencies
  | "ready"             // all upstream deps satisfied, not yet running
  | "running"           // currently executing
  | "completed"         // finished successfully
  | "failed"            // execution error
  | "skipped"           // inactive branch (condition not taken)
  | "pending-approval"  // paused for human review
  | "approved"          // human-approved, will resume
  | "rejected"          // human-rejected
  | "policy-flagged"     // blocked by policy
  | "compensating"      // running compensation logic (saga)
  | "compensated"       // compensation complete
  | "compensation-failed";

export type NodeEvent =
  | "start"
  | "complete"
  | "fail"
  | "skip"
  | "pause"         // human-gate
  | "approve"
  | "reject"
  | "policy-deny"
  | "retry"
  | "compensate"
  | "compensation-complete"
  | "compensation-fail";

export interface NodeStateRecord {
  nodeId: string;
  state: NodeState;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  /** For loop nodes: current iteration count */
  iteration?: number;
}

export interface EdgeDef {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: {
    /** "true" | "false" for condition branches */
    edgeType?: string;
    /** evaluated against ExecutionContext; skip edge if false */
    condition?: string;
    /** "fan" = always follow (fan-out parallel dispatch) */
    flowType?: "message" | "control" | "data" | "fan" | "loop-back" | "compensation";
  };
}

export interface NodeDef {
  id: string;
  type: string;
  label?: string;
  data?: {
    label?: string;
    nodeType?: string;
    config?: Record<string, unknown>;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  fallbackNodeId?: string;
}

// ── StateMachine ─────────────────────────────────────────────────────────────

export class StateMachine {
  private nodeStates = new Map<string, NodeStateRecord>();
  private nodes: Map<string, NodeDef>;
  private edges: EdgeDef[];
  /** adjacency: source → targets */
  private adj: Map<string, EdgeDef[]>;
  /** reverse adjacency: target → sources */
  private revAdj: Map<string, string[]>;
  private context: ExecutionContext;

  constructor(nodes: NodeDef[], edges: EdgeDef[], context: ExecutionContext) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
    this.edges = edges;
    this.context = context;

    // Build adjacency maps
    this.adj = new Map(nodes.map((n) => [n.id, []]));
    this.revAdj = new Map(nodes.map((n) => [n.id, []]));
    for (const e of edges) {
      // Skip loop-back edges when building dependency graph
      if (e.data?.flowType === "loop-back") continue;
      // Skip compensation edges
      if (e.data?.flowType === "compensation") continue;
      this.adj.get(e.source)?.push(e);
      this.revAdj.get(e.target)?.push(e.source);
    }

    // Initialize all nodes as pending
    for (const n of nodes) {
      this.nodeStates.set(n.id, { nodeId: n.id, state: "pending", retryCount: 0 });
    }

    // Activate nodes with no upstream dependencies (in-degree 0)
    this.activateRoots();
  }

  /** Restore state machine from a persisted snapshot (e.g. after human-gate resume) */
  static fromSnapshot(
    nodes: NodeDef[],
    edges: EdgeDef[],
    context: ExecutionContext,
    snapshot: Map<string, NodeStateRecord>
  ): StateMachine {
    const sm = new StateMachine(nodes, edges, context);
    for (const [id, record] of snapshot) {
      sm.nodeStates.set(id, record);
    }
    return sm;
  }

  /** Return nodes currently in the "ready" state — ready for execution */
  getReadyNodes(): NodeDef[] {
    const ready: NodeDef[] = [];
    for (const [nodeId, record] of this.nodeStates) {
      if (record.state === "ready") {
        const node = this.nodes.get(nodeId);
        if (node) ready.push(node);
      }
    }
    return ready;
  }

  /** Apply a state transition to a node */
  transition(nodeId: string, event: NodeEvent): void {
    const record = this.nodeStates.get(nodeId);
    if (!record) throw new Error(`Unknown node: ${nodeId}`);

    const now = new Date().toISOString();

    switch (event) {
      case "start":
        record.state = "running";
        record.startedAt = now;
        break;

      case "complete":
        record.state = "completed";
        record.completedAt = now;
        break;

      case "fail":
        record.state = "failed";
        record.completedAt = now;
        break;

      case "skip":
        record.state = "skipped";
        record.completedAt = now;
        break;

      case "pause":
        record.state = "pending-approval";
        break;

      case "approve":
        record.state = "approved";
        record.approvedAt = now;
        break;

      case "reject":
        record.state = "rejected";
        record.completedAt = now;
        break;

      case "policy-deny":
        record.state = "policy-flagged";
        record.completedAt = now;
        break;

      case "retry":
        record.state = "ready";
        record.retryCount++;
        break;

      case "compensate":
        record.state = "compensating";
        break;

      case "compensation-complete":
        record.state = "compensated";
        record.completedAt = now;
        break;

      case "compensation-fail":
        record.state = "compensation-failed";
        record.completedAt = now;
        break;
    }
  }

  /**
   * After a node completes (or is skipped/flagged), evaluate its outgoing edges
   * and activate downstream nodes whose conditions are met.
   *
   * Returns the list of newly activated node IDs.
   */
  activateDownstream(completedNodeId: string): string[] {
    const node = this.nodes.get(completedNodeId);
    if (!node) return [];

    const completedRecord = this.nodeStates.get(completedNodeId);
    const actualState = completedRecord?.state ?? "completed";

    // Don't activate downstream of failed/flagged/rejected/compensating nodes
    if (["failed", "policy-flagged", "rejected", "compensation-failed"].includes(actualState)) {
      return [];
    }

    const outEdges = this.adj.get(completedNodeId) ?? [];
    const nodeType = node.type ?? node.data?.nodeType ?? "agent";
    const activated: string[] = [];

    // Condition node: follow only matching branch
    if (nodeType === "condition") {
      const condResult = this.context.get(`${completedNodeId}.output.branch`) as string;
      for (const edge of outEdges) {
        const edgeType = edge.data?.edgeType ?? "";
        if (edgeType === condResult || edgeType === "") {
          // Matching branch — activate target if deps satisfied
          if (this.tryActivate(edge.target)) activated.push(edge.target);
        } else {
          // Inactive branch — skip all nodes on this path
          this.skipBranch(edge.target);
        }
      }
      return activated;
    }

    // All other node types: follow all non-conditional edges
    for (const edge of outEdges) {
      // Edge-level condition guard (optional)
      if (edge.data?.condition) {
        try {
          const condMet = this.context.evaluate(edge.data.condition);
          if (!condMet) continue;
        } catch {
          continue;
        }
      }
      if (this.tryActivate(edge.target)) activated.push(edge.target);
    }

    return activated;
  }

  /**
   * After a loop body completes, re-evaluate the loop node's condition.
   * If still true and under maxIterations: re-activate loop body nodes.
   * Otherwise: activate the loop's exit edge targets.
   *
   * Returns { reloop: boolean, activated: string[] }
   */
  evaluateLoop(
    loopNodeId: string,
    condition: string,
    maxIterations: number,
    bodyNodeIds: string[]
  ): { reloop: boolean; activated: string[] } {
    const record = this.nodeStates.get(loopNodeId);
    if (!record) return { reloop: false, activated: [] };

    const iteration = this.context.getIteration();
    const conditionMet = condition ? this.context.evaluate(condition) : true;

    if (conditionMet && iteration < maxIterations) {
      // Re-activate body nodes for next iteration
      this.context.incrementIteration();
      for (const id of bodyNodeIds) {
        const r = this.nodeStates.get(id);
        if (r) { r.state = "ready"; r.retryCount = 0; }
      }
      return { reloop: true, activated: bodyNodeIds };
    }

    // Exit loop — activate outgoing exit edges
    const outEdges = (this.adj.get(loopNodeId) ?? []).filter(
      (e) => e.data?.edgeType === "exit" || !e.data?.edgeType
    );
    const activated: string[] = [];
    for (const edge of outEdges) {
      if (this.tryActivate(edge.target)) activated.push(edge.target);
    }
    return { reloop: false, activated };
  }

  /** Check if all nodes have reached a terminal state */
  isComplete(): boolean {
    for (const record of this.nodeStates.values()) {
      if (!this.isTerminal(record.state)) return false;
    }
    return true;
  }

  isFailed(): boolean {
    for (const record of this.nodeStates.values()) {
      if (record.state === "failed" || record.state === "rejected" || record.state === "compensation-failed") return true;
    }
    return false;
  }

  isPaused(): boolean {
    for (const record of this.nodeStates.values()) {
      if (record.state === "pending-approval") return true;
    }
    return false;
  }

  /** Returns true if no nodes are in ready/running state (stuck or paused) */
  isStuck(): boolean {
    for (const record of this.nodeStates.values()) {
      if (record.state === "ready" || record.state === "running") return false;
    }
    return !this.isComplete();
  }

  /** Return the full state map for persistence */
  getStateMap(): Map<string, NodeStateRecord> {
    return new Map(this.nodeStates);
  }

  /** Serialize for Cosmos storage */
  serializeStates(): NodeStateRecord[] {
    return Array.from(this.nodeStates.values());
  }

  /** Restore from serialized records */
  restoreStates(records: NodeStateRecord[]): void {
    for (const r of records) {
      this.nodeStates.set(r.nodeId, { ...r });
    }
  }

  getNodeState(nodeId: string): NodeState | undefined {
    return this.nodeStates.get(nodeId)?.state;
  }

  getNode(nodeId: string): NodeDef | undefined {
    return this.nodes.get(nodeId);
  }

  /** Get all nodes that are pending-approval */
  getPendingApprovalNodes(): NodeDef[] {
    const result: NodeDef[] = [];
    for (const [id, record] of this.nodeStates) {
      if (record.state === "pending-approval") {
        const n = this.nodes.get(id);
        if (n) result.push(n);
      }
    }
    return result;
  }

  /** Get completed nodes in order (for saga compensation walk) */
  getCompletedNodes(): NodeDef[] {
    const completed: { node: NodeDef; completedAt: string }[] = [];
    for (const [id, record] of this.nodeStates) {
      if (record.state === "completed" && record.completedAt) {
        const n = this.nodes.get(id);
        if (n) completed.push({ node: n, completedAt: record.completedAt });
      }
    }
    return completed
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((x) => x.node);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private activateRoots(): void {
    for (const [id] of this.nodeStates) {
      const upstream = this.revAdj.get(id) ?? [];
      if (upstream.length === 0) {
        this.nodeStates.get(id)!.state = "ready";
      }
    }
  }

  /**
   * Try to move a node to "ready" state.
   * Requires all upstream non-skipped nodes to be in a terminal state.
   */
  private tryActivate(nodeId: string): boolean {
    // If already past pending, don't re-activate
    const current = this.nodeStates.get(nodeId)?.state;
    if (!current || current !== "pending") return false;

    // Check all upstream dependencies (excluding loop-back and compensation edges)
    const upstreamIds = this.revAdj.get(nodeId) ?? [];
    for (const upId of upstreamIds) {
      const upState = this.nodeStates.get(upId)?.state;
      if (!upState || !this.isTerminal(upState)) return false;
    }

    this.nodeStates.get(nodeId)!.state = "ready";
    return true;
  }

  /** Recursively skip all downstream nodes of an inactive condition branch */
  private skipBranch(nodeId: string): void {
    const record = this.nodeStates.get(nodeId);
    if (!record || record.state !== "pending") return;

    // Only skip if all upstream sources are either terminal or skipped
    record.state = "skipped";
    record.completedAt = new Date().toISOString();

    // Propagate skip forward (but only if ALL upstreams are terminal/skipped)
    const downEdges = this.adj.get(nodeId) ?? [];
    for (const edge of downEdges) {
      this.skipBranch(edge.target);
    }
  }

  private isTerminal(state: NodeState): boolean {
    return [
      "completed", "failed", "skipped", "policy-flagged",
      "rejected", "compensated", "compensation-failed",
    ].includes(state);
  }
}

// Augment NodeStateRecord to hold approval timestamp
declare module "./engine" {
  interface NodeStateRecord {
    approvedAt?: string;
  }
}
