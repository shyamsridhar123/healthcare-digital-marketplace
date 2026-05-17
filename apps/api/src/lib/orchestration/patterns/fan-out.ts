import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * FanOutHandler — parallel dispatch to multiple branches.
 *
 * The fan-out node itself does minimal work — it passes its input
 * downstream to all outgoing branches simultaneously. The StateMachine
 * will activate all outgoing edges in parallel since this is not a
 * condition node.
 *
 * Node config fields:
 *   - branches: number         (expected number of branches, 2-10)
 *   - fanOutStrategy: string   ("parallel" | "round-robin") — parallel is the only
 *                               implemented strategy for now; round-robin is UI-only stub
 *
 * Context writes:
 *   - `${nodeId}.output` → { strategy, branches, input }
 */
export class FanOutHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, upstreamOutput } = hctx;
    const config = node.data?.config ?? {};

    const branches = (config.branches as number | undefined) ?? 2;
    const strategy = (config.fanOutStrategy as string | undefined) ?? "parallel";

    const output = {
      strategy,
      branches,
      input: upstreamOutput,
      dispatchedAt: new Date().toISOString(),
    };

    return {
      status: "completed",
      output,
      parallelDispatch: true,
      contextUpdates: {
        [`${node.id}.output`]: output,
      },
    };
  }
}
