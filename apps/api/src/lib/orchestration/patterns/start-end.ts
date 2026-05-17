import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * StartHandler — initializes the execution context with workflow parameters.
 *
 * Node config fields:
 *   - triggerType: "manual" | "http" | "schedule" | "event"
 *   - inputSchema: string (optional JSON schema for validation)
 *
 * Context writes:
 *   - `${nodeId}.output` → { triggered: true, triggerType, startedAt }
 *   - `workflow.input` → copy of params (for downstream node access)
 */
export class StartHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, params, executionContext } = hctx;
    const config = node.data?.config ?? {};
    const triggerType = (config.triggerType as string | undefined) ?? "manual";

    const output = {
      triggered: true,
      triggerType,
      startedAt: new Date().toISOString(),
      params: Object.keys(params).length > 0 ? params : undefined,
    };

    // Make params available at workflow.input for downstream nodes
    executionContext.set("workflow.input", params);

    return {
      status: "completed",
      output,
      contextUpdates: {
        [`${node.id}.output`]: output,
      },
    };
  }
}

/**
 * EndHandler — finalizes the execution and formats the final output.
 *
 * Node config fields:
 *   - endOutputFormat: "json" | "text" | "markdown"
 *   - successMessage: string
 *
 * Context writes:
 *   - `${nodeId}.output` → { format, message, completedAt, finalOutput }
 *   - `workflow.output` → final result for external consumers
 */
export class EndHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, upstreamOutput, executionContext } = hctx;
    const config = node.data?.config ?? {};

    const format = (config.endOutputFormat as string | undefined) ?? "text";
    const successMessage = (config.successMessage as string | undefined) ??
      "Workflow completed successfully.";

    let finalOutput: unknown = upstreamOutput;
    if (format === "json" && upstreamOutput.trim().startsWith("{")) {
      try { finalOutput = JSON.parse(upstreamOutput); } catch { /* keep string */ }
    }

    const output = {
      format,
      message: successMessage,
      completedAt: new Date().toISOString(),
      finalOutput,
    };

    executionContext.set("workflow.output", finalOutput);

    return {
      status: "completed",
      output,
      contextUpdates: {
        [`${node.id}.output`]: output,
        "workflow.output": finalOutput,
      },
    };
  }
}
