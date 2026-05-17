import type { PatternHandler, HandlerContext, HandlerResult } from "./index.js";

/**
 * TransformHandler — applies data transformations between nodes.
 *
 * Node config fields:
 *   - inputFormat: "json" | "text" | "csv" | "xml"
 *   - outputFormat: "json" | "text" | "csv" | "markdown"
 *   - transformExpression: string  (JQ/JSONata-style expression — MVP: evaluated as JS-safe path)
 *
 * For MVP: applies simple JSONPath-like extraction on JSON inputs.
 * Production would integrate a proper JQ/JSONata runtime.
 */
export class TransformHandler implements PatternHandler {
  async handle(hctx: HandlerContext): Promise<HandlerResult> {
    const { node, upstreamOutput, executionContext } = hctx;
    const config = node.data?.config ?? {};

    const inputFormat = (config.inputFormat as string | undefined) ?? "text";
    const outputFormat = (config.outputFormat as string | undefined) ?? "text";
    const expression = (config.transformExpression as string | undefined) ?? "";

    let result: unknown = upstreamOutput;

    // Parse JSON input
    if (inputFormat === "json" && upstreamOutput.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(upstreamOutput);
        if (expression) {
          // Simple dot-path extraction from the parsed object
          result = resolveSimplePath(expression, parsed);
        } else {
          result = parsed;
        }
      } catch {
        // Keep raw text if JSON parse fails
        result = upstreamOutput;
      }
    }

    // Format output
    let output: string;
    switch (outputFormat) {
      case "json":
        output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        break;
      case "markdown":
        output = toMarkdown(result);
        break;
      default:
        output = typeof result === "string" ? result : JSON.stringify(result);
    }

    return {
      status: "completed",
      output,
      contextUpdates: {
        [`${node.id}.output`]: output,
        [`${node.id}.transform`]: {
          inputFormat,
          outputFormat,
          expression,
          charCount: output.length,
        },
      },
    };
  }
}

function resolveSimplePath(path: string, obj: unknown): unknown {
  if (!path || typeof obj !== "object" || obj === null) return obj;
  // Handle leading dot (JQ-style: ".field.subfield")
  const cleanPath = path.startsWith(".") ? path.slice(1) : path;
  if (!cleanPath) return obj;
  const parts = cleanPath.split(".");
  let current = obj as Record<string, unknown>;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part] as Record<string, unknown>;
  }
  return current;
}

function toMarkdown(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item, i) =>
      `### Item ${i + 1}\n${typeof item === "object" ? JSON.stringify(item, null, 2) : String(item)}`
    ).join("\n\n");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `**${k}**: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join("\n");
  }
  return String(value);
}
