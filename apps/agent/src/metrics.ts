// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
//
// Real, in-memory AI-gateway telemetry for the Nebula-X Assistant path.
// Counts are accumulated from actual Azure OpenAI responses (token usage,
// latency) since the process started, and exposed via /api/gateway/metrics.
// This powers the LIVE panel in the Nebula-X observability UI — the one
// genuinely real signal among the illustrative governance dashboards.

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RecentCall {
  at: string;
  model: string;
  totalTokens: number;
  latencyMs: number;
  viaGateway: boolean;
  status: 'ok' | 'blocked' | 'error';
}

interface State {
  startedAt: string;
  requests: number;
  blocked: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
  lastRequestAt: string | null;
  lastModel: string | null;
  recent: RecentCall[];
}

const state: State = {
  startedAt: new Date().toISOString(),
  requests: 0,
  blocked: 0,
  errors: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  totalLatencyMs: 0,
  lastRequestAt: null,
  lastModel: null,
  recent: [],
};

function pushRecent(c: RecentCall): void {
  state.recent.unshift(c);
  if (state.recent.length > 20) state.recent.pop();
}

/** APIM gateway host when the agent is routed through Azure API Management, else null. */
function gatewayHost(): string | null {
  const ep = process.env.AZURE_OPENAI_ENDPOINT || '';
  try {
    const host = new URL(ep).host;
    return host.includes('azure-api.net') ? host : null;
  } catch {
    return null;
  }
}

export function isViaGateway(): boolean {
  return gatewayHost() !== null;
}

/** Record a successful assistant turn with real token usage + measured latency. */
export function recordTurn(u: { usage: TokenUsage; latencyMs: number; model: string }): void {
  state.requests++;
  state.promptTokens += u.usage.promptTokens || 0;
  state.completionTokens += u.usage.completionTokens || 0;
  state.totalTokens += u.usage.totalTokens || 0;
  state.totalLatencyMs += u.latencyMs;
  state.lastRequestAt = new Date().toISOString();
  state.lastModel = u.model;
  pushRecent({
    at: state.lastRequestAt,
    model: u.model,
    totalTokens: u.usage.totalTokens || 0,
    latencyMs: u.latencyMs,
    viaGateway: isViaGateway(),
    status: 'ok',
  });
}

/** Record a request blocked by a gateway policy (rate limit / content safety). */
export function recordBlocked(model: string): void {
  state.requests++;
  state.blocked++;
  const at = new Date().toISOString();
  state.lastRequestAt = at;
  pushRecent({ at, model, totalTokens: 0, latencyMs: 0, viaGateway: isViaGateway(), status: 'blocked' });
}

export function recordError(model: string): void {
  state.errors++;
  const at = new Date().toISOString();
  pushRecent({ at, model, totalTokens: 0, latencyMs: 0, viaGateway: isViaGateway(), status: 'error' });
}

/** Snapshot of the live gateway metrics for the observability UI. */
export function getMetrics() {
  const usdPer1k = Number(process.env.AI_GATEWAY_USD_PER_1K || 0.005);
  const successful = Math.max(1, state.requests - state.blocked);
  const avgLatencyMs = state.requests ? Math.round(state.totalLatencyMs / successful) : 0;
  return {
    startedAt: state.startedAt,
    routing: isViaGateway() ? 'apim-gateway' : 'direct-aoai',
    gatewayHost: gatewayHost(),
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.1',
    tokensPerMinuteLimit: Number(process.env.AI_GATEWAY_TPM_LIMIT || 30000),
    requests: state.requests,
    blocked: state.blocked,
    errors: state.errors,
    promptTokens: state.promptTokens,
    completionTokens: state.completionTokens,
    totalTokens: state.totalTokens,
    avgLatencyMs,
    estCostUsd: +((state.totalTokens / 1000) * usdPer1k).toFixed(4),
    usdPer1k,
    lastRequestAt: state.lastRequestAt,
    lastModel: state.lastModel,
    recent: state.recent,
    now: new Date().toISOString(),
  };
}
