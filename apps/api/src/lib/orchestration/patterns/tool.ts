import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * ToolHandler — mock MCP tool / API call execution.
 *
 * In production: invoke the MCP tool endpoint specified by `toolId`,
 * passing `params` from node config.
 */
export class ToolHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, upstreamOutput } = hctx;
    const config = node.data?.config ?? {};
    const label = node.data?.label ?? node.label ?? "tool";

    await new Promise((res) => setTimeout(res, 50 + Math.random() * 150));

    const toolId = config.toolId as string | undefined;
    const params = config.params as Record<string, string> | undefined;
    const paramStr = params ? JSON.stringify(params) : "{}";

    const output = `[${label}${toolId ? ` (${toolId})` : ""}] Tool result for: ${upstreamOutput.slice(0, 80)}… (params: ${paramStr})`;

    return { status: "completed", output, tokenCount: 0 };
  }
}
