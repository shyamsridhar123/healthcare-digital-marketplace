import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * ApprovalHandler — pauses execution and requires a human decision.
 *
 * When this handler is invoked by the engine, it always returns `paused`.
 * The engine then persists the execution state and waits for the
 * `/approve/{nodeId}` or `/reject/{nodeId}` API calls.
 *
 * Resume logic (in executions.ts):
 *   - On approve: node is transitioned to "approved", then the state machine
 *     re-activates downstream nodes and continues execution.
 *   - On reject: checks `onReject` config:
 *       - "abort" → execution status = failed
 *       - "skip"  → node skipped, continue downstream
 *       - "retry" → route to the node specified by `retryNodeId` config
 *
 * Node config fields:
 *   - approvalMessage: string
 *   - approverRole: string
 *   - timeoutMinutes: number
 *   - onReject: "abort" | "skip" | "retry"
 *   - retryNodeId?: string  (used when onReject === "retry")
 *
 * Context writes:
 *   - `${nodeId}.output.status` → "pending-approval"
 *   - `${nodeId}.output.message` → approvalMessage
 */
export class ApprovalHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, upstreamOutput } = hctx;
    const config = node.data?.config ?? {};

    const message = (config.approvalMessage as string | undefined) ??
      "Please review the output before proceeding.";
    const approverRole = (config.approverRole as string | undefined) ?? "any";
    const timeoutMinutes = (config.timeoutMinutes as number | undefined) ?? 60;

    const output = {
      status: "pending-approval",
      message,
      approverRole,
      timeoutMinutes,
      inputToReview: upstreamOutput.slice(0, 2000),
      requestedAt: new Date().toISOString(),
    };

    return {
      status: "paused",
      pauseReason: message,
      output,
      contextUpdates: {
        [`${node.id}.output`]: output,
      },
    };
  }
}
