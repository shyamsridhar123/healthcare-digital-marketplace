/**
 * ExecutionContext — structured JSON bag shared across all nodes in a workflow execution.
 *
 * Each node reads inputs and writes outputs using dot-path keys:
 *   ctx.set("node1.output.transactionStatus", "clean")
 *   ctx.get("node1.output.transactionStatus") // → "clean"
 *
 * Replaces the previous plain-text `previousOutput` concatenation approach.
 * The context is serializable to Cosmos DB after each node transition.
 */

export interface ContextSnapshot {
  data: Record<string, unknown>;
  metadata: ContextMetadata;
}

export interface ContextMetadata {
  /** Current loop iteration (incremented by LoopHandler) */
  iteration?: number;
  /** Parent execution ID for sub-workflow nesting */
  parentExecutionId?: string;
  /** Node currently executing */
  currentNodeId?: string;
  /** Loop variable accumulator key → values array */
  loopAccumulator?: Record<string, unknown[]>;
  /** Supervisor feedback injected by SupervisorHandler */
  supervisorFeedback?: string;
  /** Round count for supervisor retry loops */
  supervisorRound?: number;
}

/** Whitelisted operators for safe expression evaluation */
const SAFE_OPreconciliationTORS = new Set(["==", "!=", ">", "<", ">=", "<=", "&&", "||", "!"]);

/**
 * Safe expression evaluator — supports:
 *   - Dot-path access:  output.valid.result
 *   - String literals:  "clean" or 'clean'
 *   - Number literals:  3.14
 *   - Boolean literals: true / false
 *   - Comparisons:      ==, !=, >, <, >=, <=
 *   - Logical:          &&, ||, !
 *   - Grouping:         (...)
 *
 * Does NOT support: function calls, assignments, typeof, instanceof,
 * new, prototype access, array constructors, eval, etc.
 */
export function safeEval(expression: string, data: Record<string, unknown>): boolean {
  // Security: reject anything suspicious
  const forbidden = /\b(eval|Function|constructor|prototype|__proto__|window|global|process|require|import)\b/;
  if (forbidden.test(expression)) {
    throw new Error(`Forbidden expression token in: ${expression}`);
  }

  try {
    const result = evalExpr(expression.trim(), data);
    return Boolean(result);
  } catch {
    // On parse error, expression evaluates to false (safe default)
    return false;
  }
}

/** Resolve a dot-path against a data object */
function resolvePath(path: string, data: Record<string, unknown>): unknown {
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Recursive descent expression parser */
function evalExpr(expr: string, data: Record<string, unknown>): unknown {
  expr = expr.trim();

  // Grouped expression
  if (expr.startsWith("(") && expr.endsWith(")")) {
    return evalExpr(expr.slice(1, -1), data);
  }

  // Logical OR (lowest precedence)
  const orIdx = findTopLevelOperator(expr, "||");
  if (orIdx >= 0) {
    const left = evalExpr(expr.slice(0, orIdx), data);
    if (Boolean(left)) return true; // short-circuit
    return Boolean(evalExpr(expr.slice(orIdx + 2), data));
  }

  // Logical AND
  const andIdx = findTopLevelOperator(expr, "&&");
  if (andIdx >= 0) {
    const left = evalExpr(expr.slice(0, andIdx), data);
    if (!Boolean(left)) return false; // short-circuit
    return Boolean(evalExpr(expr.slice(andIdx + 2), data));
  }

  // Logical NOT
  if (expr.startsWith("!")) {
    return !evalExpr(expr.slice(1), data);
  }

  // Comparison operators (try longest first to avoid ambiguity)
  for (const op of [">=", "<=", "!=", "==", ">", "<"]) {
    const idx = findTopLevelOperator(expr, op);
    if (idx >= 0) {
      const left = evalExpr(expr.slice(0, idx), data);
      const right = evalExpr(expr.slice(idx + op.length), data);
      return compare(left, right, op);
    }
  }

  // String literal
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return parseFloat(expr);
  }

  // Boolean literals
  if (expr === "true") return true;
  if (expr === "false") return false;
  if (expr === "null" || expr === "undefined") return null;

  // Dot-path access
  if (/^[a-zA-Z_$][a-zA-Z0-9_.]*$/.test(expr)) {
    return resolvePath(expr, data);
  }

  throw new Error(`Cannot parse expression token: ${expr}`);
}

function compare(left: unknown, right: unknown, op: string): boolean {
  switch (op) {
    case "==": return left == right; // intentional loose equality
    case "!=": return left != right;
    case ">":  return (left as number) > (right as number);
    case "<":  return (left as number) < (right as number);
    case ">=": return (left as number) >= (right as number);
    case "<=": return (left as number) <= (right as number);
    default:   return false;
  }
}

/** Find the top-level (not inside parens/quotes) occurrence of an operator */
function findTopLevelOperator(expr: string, op: string): number {
  let depth = 0;
  let inString = false;
  let stringChar = "";

  for (let i = 0; i <= expr.length - op.length; i++) {
    const ch = expr[i];

    if (inString) {
      if (ch === stringChar && expr[i - 1] !== "\\") inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
    if (ch === "(") { depth++; continue; }
    if (ch === ")") { depth--; continue; }

    if (depth === 0 && expr.slice(i, i + op.length) === op) {
      // Avoid matching inside longer operators (e.g. "==" inside "!==")
      const before = i > 0 ? expr[i - 1] : "";
      const after = expr[i + op.length] ?? "";
      if (op === ">" && (before === "<" || after === "=" || before === "=")) continue;
      if (op === "<" && after === "=" ) continue;
      if (op === "=" && (before === "!" || before === ">" || before === "<" || after === "=")) continue;
      return i;
    }
  }
  return -1;
}

// ── ExecutionContext class ────────────────────────────────────────────────────

export class ExecutionContext {
  private data: Record<string, unknown>;
  private metadata: ContextMetadata;

  constructor(initialParams: Record<string, unknown> = {}, snapshot?: ContextSnapshot) {
    if (snapshot) {
      this.data = { ...snapshot.data };
      this.metadata = { ...snapshot.metadata };
    } else {
      this.data = { params: initialParams };
      this.metadata = {};
    }
  }

  /** Read a dot-path from the context */
  get(path: string): unknown {
    return resolvePath(path, this.data);
  }

  /** Write a dot-path into the context */
  set(path: string, value: unknown): void {
    const parts = path.split(".");
    let current = this.data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] == null || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  /** Deep-merge a value at a key (used by FanIn to aggregate parallel outputs) */
  merge(key: string, value: unknown): void {
    const existing = this.get(key);
    if (Array.isArray(existing)) {
      this.set(key, [...existing, value]);
    } else if (existing == null) {
      this.set(key, [value]);
    } else {
      this.set(key, [existing, value]);
    }
  }

  /** Accumulate a value into the loop variable array */
  accumulate(loopVariable: string, value: unknown): void {
    if (!this.metadata.loopAccumulator) this.metadata.loopAccumulator = {};
    if (!Array.isArray(this.metadata.loopAccumulator[loopVariable])) {
      this.metadata.loopAccumulator[loopVariable] = [];
    }
    this.metadata.loopAccumulator[loopVariable].push(value);
    // Also write to the top-level data so conditions can see it
    this.set(loopVariable, this.metadata.loopAccumulator[loopVariable]);
  }

  /** Evaluate a safe expression against the current context data */
  evaluate(expression: string): boolean {
    return safeEval(expression, this.data);
  }

  /** Get/set metadata fields */
  getMetadata(): ContextMetadata { return this.metadata; }
  setMetadata(patch: Partial<ContextMetadata>): void {
    this.metadata = { ...this.metadata, ...patch };
  }
  getIteration(): number { return this.metadata.iteration ?? 0; }
  incrementIteration(): number {
    this.metadata.iteration = (this.metadata.iteration ?? 0) + 1;
    return this.metadata.iteration;
  }
  resetIteration(): void { this.metadata.iteration = 0; }

  /** Return the flat data bag (for backward-compat text output extraction) */
  getNodeOutput(nodeId: string): unknown {
    return this.get(`${nodeId}.output`);
  }

  /** Get all outputs as concatenated text (for backward compat) */
  getTextOutput(nodeIds: string[]): string {
    return nodeIds
      .map((id) => {
        const out = this.getNodeOutput(id);
        if (out == null) return "";
        return typeof out === "string" ? out : JSON.stringify(out);
      })
      .filter(Boolean)
      .join("\n");
  }

  /** Serializable snapshot for Cosmos DB persistence */
  snapshot(): ContextSnapshot {
    return {
      data: JSON.parse(JSON.stringify(this.data)),
      metadata: JSON.parse(JSON.stringify(this.metadata)),
    };
  }

  /** Estimate context size in bytes */
  sizeBytes(): number {
    return JSON.stringify(this.data).length;
  }
}
