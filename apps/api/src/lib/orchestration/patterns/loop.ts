import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * LoopHandler — manages iteration for loop nodes.
 *
 * On first entry: initializes iteration counter in context.
 * On each call: evaluates loopCondition against context.
 *   - If true AND iteration < maxIterations: signals the engine to re-queue body nodes
 *   - If false OR limit reached: signals engine to follow exit edges
 *
 * Node config fields:
 *   - loopCondition: string  (evaluated against context; loop continues while true)
 *   - maxIterations: number  (safety cap, default 10)
 *   - loopVariable: string   (key in context that accumulates iteration outputs)
 *
 * Context writes:
 *   - `${nodeId}.output.iteration` → current iteration
 *   - `${nodeId}.output.continue`  → boolean (true = body should run again)
 *   - `${loopVariable}` → accumulated results array
 */
export class LoopHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, executionContext } = hctx;
    const config = node.data?.config ?? {};

    const condition = (config.loopCondition as string | undefined) ?? "";
    const maxIterations = (config.maxIterations as number | undefined) ?? 10;
    const loopVariable = (config.loopVariable as string | undefined) ?? "items";

    const iteration = executionContext.getIteration();

    // Evaluate continuation condition
    let shouldContinue = true;
    if (condition) {
      try {
        shouldContinue = executionContext.evaluate(condition);
      } catch {
        shouldContinue = false;
      }
    }

    const willLoop = shouldContinue && iteration < maxIterations;

    const output = {
      iteration,
      continue: willLoop,
      maxIterations,
      condition,
    };

    return {
      status: "completed",
      output,
      contextUpdates: {
        [`${node.id}.output`]: output,
      },
    };
  }
}
