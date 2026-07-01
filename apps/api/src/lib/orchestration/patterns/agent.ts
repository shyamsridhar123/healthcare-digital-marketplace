import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * AgentHandler — mock LLM/agent node execution.
 *
 * In production this would call the actual agent endpoint (e.g. Azure OpenAI,
 * A2A agent API, etc.) using the node's `agentId`, `modelId`, `systemPrompt`,
 * `selectedToolIds`, `temperature`, and `maxTokens` config.
 *
 * For MVP: simulates 100-400ms latency and returns a deterministic mock output.
 */
export class AgentHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, upstreamOutput } = hctx;
    const config = node.data?.config ?? {};
    const label = node.data?.label ?? node.label ?? node.type ?? "agent";

    // Simulate realistic latency
    await new Promise((res) => setTimeout(res, 100 + Math.random() * 300));

    const systemPrompt = config.systemPrompt as string | undefined;
    const modelId = (config.modelId as string | undefined) ?? "gpt-5.5";
    const maxTokens = (config.maxTokens as number | undefined) ?? 4096;

    // Mock output — in production: call LLM/agent with systemPrompt + upstreamOutput
    const inputPreview = upstreamOutput.slice(0, 120);
    const output = `[${label}] Processed: ${inputPreview}${upstreamOutput.length > 120 ? "…" : ""}`;
    const tokenCount = Math.floor(Math.random() * Math.min(maxTokens, 800)) + 100;

    return { status: "completed", output, tokenCount, modelId };
  }
}
