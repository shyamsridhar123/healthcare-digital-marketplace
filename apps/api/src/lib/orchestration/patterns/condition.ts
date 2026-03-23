import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * ConditionHandler — evaluates a condition expression and determines which branch to follow.
 *
 * This handler does NOT execute any real work — it evaluates a condition against the
 * current ExecutionContext and writes the branch result so that StateMachine.activateDownstream()
 * can follow the correct edge.
 *
 * Node config fields:
 *   - conditionExpression: string  (evaluated against context data)
 *   - trueBranchLabel: string
 *   - falseBranchLabel: string
 *
 * Writes to context:
 *   - `${nodeId}.output.branch` → "true" | "false"
 *   - `${nodeId}.output.result` → boolean
 */
export class ConditionHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, executionContext } = hctx;
    const config = node.data?.config ?? {};
    const expression = (config.conditionExpression as string | undefined) ?? "true";

    let result: boolean;
    try {
      result = executionContext.evaluate(expression);
    } catch (err: any) {
      // On expression error: route to false branch and surface the error
      return {
        status: "completed",
        output: { branch: "false", result: false, error: err.message },
        contextUpdates: {
          [`${node.id}.output`]: { branch: "false", result: false, error: err.message },
        },
      };
    }

    const branch = result ? "true" : "false";
    return {
      status: "completed",
      output: { branch, result },
      contextUpdates: {
        [`${node.id}.output`]: { branch, result },
      },
    };
  }
}
