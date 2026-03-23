import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";
import type { ExecutionContext } from "../context.js";

/**
 * FanInHandler — collects and merges results from parallel branches.
 *
 * Node config fields:
 *   - joinStrategy: "all" | "any" | "first"
 *       - "all": wait for every incoming branch to complete (default)
 *       - "any": proceed as soon as the first branch completes
 *       - "first": N-of-M quorum (same as "any" for MVP)
 *   - joinTimeout: number  (seconds; not enforced in MVP — reserved for future)
 *
 * Context writes:
 *   - `${nodeId}.output` → { strategy, inputs: [], merged: string }
 *   - `${nodeId}.output.merged` → concatenated text from all branches
 */
export class FanInHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, executionContext, upstreamOutput } = hctx;
    const config = node.data?.config ?? {};

    const strategy = (config.joinStrategy as string | undefined) ?? "all";
    const nodeId = node.id;

    // Collect all upstream node outputs that have been stored in context
    const upstreamBranchOutputs = collectBranchOutputs(executionContext, nodeId);

    // Merge strategy
    let merged: string;
    if (strategy === "any" || strategy === "first") {
      // Use the first non-empty result
      merged = upstreamBranchOutputs.find((s) => s.length > 0) ?? upstreamOutput;
    } else {
      // "all" — concatenate everything
      const parts = upstreamBranchOutputs.filter((s) => s.length > 0);
      merged = parts.length > 0 ? parts.join("\n---\n") : upstreamOutput;
    }

    const output = {
      strategy,
      branchCount: upstreamBranchOutputs.length,
      inputs: upstreamBranchOutputs,
      merged,
    };

    return {
      status: "completed",
      output,
      contextUpdates: {
        [`${nodeId}.output`]: output,
        // Expose the merged text at the top level too for downstream agents
        [`${nodeId}.merged`]: merged,
      },
    };
  }
}

/**
 * Scan context for any keys matching `*.output` that are siblings of this fan-in.
 * In practice the execution engine passes upstream outputs in upstreamOutput,
 * but we also collect structured outputs from named branch nodes via context.
 */
function collectBranchOutputs(ctx: ExecutionContext, _fanInNodeId: string): string[] {
  const data = ctx.snapshot().data;
  const outputs: string[] = [];

  for (const [key, val] of Object.entries(data)) {
    // Skip internal keys and the fan-in node itself
    if (key.startsWith("_") || key === "params" || key === _fanInNodeId) continue;

    const out = (val as any)?.output;
    if (out == null) continue;

    const text = typeof out === "string" ? out : typeof out === "object" && out !== null
      ? JSON.stringify(out)
      : String(out);

    if (text.length > 0) outputs.push(text);
  }

  return outputs;
}
