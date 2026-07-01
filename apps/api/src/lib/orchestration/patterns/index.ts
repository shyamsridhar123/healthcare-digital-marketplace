/**
 * Pattern handler interface and registry.
 *
 * Each node type has a dedicated handler. The execution engine dispatches
 * to the correct handler based on node.type.
 */

import type { NodeDef } from "../engine.js";
import type { ExecutionContext } from "../context.js";
import type { PolicyContext } from "../../policy/engine.js";

export interface HandlerResult {
  /** Terminal status for this node */
  status: "completed" | "failed" | "skipped" | "paused" | "policy-flagged";
  /** Primary output value — written to context at `${nodeId}.output` */
  output?: unknown;
  /** Additional context key-value pairs to set */
  contextUpdates?: Record<string, unknown>;
  /** Error message if status === "failed" */
  error?: string;
  /** Pause reason (approval gate) */
  pauseReason?: string;
  /** Token usage for cost tracking */
  tokenCount?: number;
  /** Model ID used */
  modelId?: string;
  /**
   * For loop nodes only: the IDs of nodes that form the loop body,
   * to be re-queued on the next iteration.
   */
  loopBodyNodeIds?: string[];
  /**
   * For fan-out / scatter-gather: signals that the engine should
   * treat all outgoing edges as parallel dispatches rather than
   * evaluating conditions.
   */
  parallelDispatch?: boolean;
}

export interface HandlerContext {
  node: NodeDef;
  executionContext: ExecutionContext;
  /** Text output from all immediately upstream nodes */
  upstreamOutput: string;
  /** The full execution parameters ({{param}} substitution values) */
  params: Record<string, unknown>;
  policyContext: PolicyContext;
}

export interface PatternHandler {
  handle(hctx: HandlerContext): Promise<HandlerResult>;
}

// ── Handler registry ──────────────────────────────────────────────────────────

import { AgentHandler } from "./agent.js";
import { ToolHandler } from "./tool.js";
import { ConditionHandler } from "./condition.js";
import { LoopHandler } from "./loop.js";
import { FanOutHandler } from "./fan-out.js";
import { FanInHandler } from "./fan-in.js";
import { ApprovalHandler } from "./approval.js";
import { TransformHandler } from "./transform.js";
import { StartHandler, EndHandler } from "./start-end.js";

const HANDLER_REGISTRY: Record<string, PatternHandler> = {
  agent:      new AgentHandler(),
  tool:       new ToolHandler(),
  condition:  new ConditionHandler(),
  loop:       new LoopHandler(),
  "fan-out":  new FanOutHandler(),
  "fan-in":   new FanInHandler(),
  approval:   new ApprovalHandler(),
  transform:  new TransformHandler(),
  start:      new StartHandler(),
  trigger:    new StartHandler(),
  end:        new EndHandler(),
  output:     new EndHandler(),
  // Core types from the original schema
  model:      new AgentHandler(),
  knowledge:  new ToolHandler(),
  evaluator:  new AgentHandler(),
  guard:      new AgentHandler(),
  human:      new ApprovalHandler(),
  // Phase 2 stubs — handlers will be filled in when implemented
  "map-reduce":   new AgentHandler(),  // temporary stub
  "sub-workflow": new AgentHandler(),  // temporary stub
  supervisor:     new AgentHandler(),  // temporary stub
  saga:           new AgentHandler(),  // temporary stub
  consensus:      new AgentHandler(),  // temporary stub
};

const DEFAULT_HANDLER = new AgentHandler();

export function getHandler(nodeType: string): PatternHandler {
  return HANDLER_REGISTRY[nodeType] ?? DEFAULT_HANDLER;
}
