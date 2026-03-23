/**
 * OTLP Metrics API
 * Accepts OTLP-compatible metrics pushes and tracks per-tool usage,
 * latency histograms, token counts, and error rates.
 * Provides a Prometheus-compatible metrics endpoint and dashboard data.
 */

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

// ── In-memory metrics accumulator (flushed periodically) ─────────────────────
// For production, replace with Azure Monitor + OTLP exporter.

type MetricPoint = {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
};

const metricsBuffer: MetricPoint[] = [];
const BUFFER_FLUSH_SIZE = 100;

async function flushMetrics(): Promise<void> {
  if (metricsBuffer.length < BUFFER_FLUSH_SIZE) return;
  // In a production system this would batch-write to Azure Monitor or ADX
  metricsBuffer.length = 0;
}

// ── OTLP Metric schema ────────────────────────────────────────────────────────

const OtlpMetricSchema = z.object({
  name: z.string().min(1).max(120),
  value: z.number(),
  labels: z.record(z.string()).default({}),
  type: z.enum(["counter", "gauge", "histogram"]).default("gauge"),
  unit: z.string().max(30).optional(),
  description: z.string().max(200).optional(),
  tenantId: z.string().default("default"),
});

const OtlpBatchSchema = z.object({
  metrics: z.array(OtlpMetricSchema).min(1).max(500),
  resourceLabels: z.record(z.string()).default({}),
  timestamp: z.string().optional(),
});

// ── POST /api/metrics/otlp ────────────────────────────────────────────────────
// Accept OTLP-style JSON metric batch

app.http("ingestOtlpMetrics", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "metrics/otlp",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = OtlpBatchSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const { metrics, resourceLabels, timestamp } = parsed.data;
      const ts = timestamp ?? new Date().toISOString();

      for (const m of metrics) {
        metricsBuffer.push({
          name: m.name,
          value: m.value,
          labels: { ...resourceLabels, ...m.labels, tenantId: m.tenantId },
          timestamp: ts,
        });
      }

      await flushMetrics();

      return { status: 200, jsonBody: { accepted: metrics.length, buffered: metricsBuffer.length } };
    } catch (err) {
      ctx.error("ingestOtlpMetrics error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/metrics/tool-usage ──────────────────────────────────────────────
// Record a single tool invocation metric (called by MCP gateway after each tools/call)

const ToolUsageSchema = z.object({
  serverId: z.string(),
  toolName: z.string(),
  tenantId: z.string().default("default"),
  durationMs: z.number().min(0),
  success: z.boolean(),
  inputTokens: z.number().min(0).optional(),
  outputTokens: z.number().min(0).optional(),
  errorCode: z.string().optional(),
  callerType: z.enum(["user", "service-account", "agent"]).optional(),
  callerId: z.string().optional(),
});

app.http("recordToolUsage", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "metrics/tool-usage",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = ToolUsageSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;

      // Store structured usage record in audit log (dual-purpose: audit + metrics)
      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      await container.items.create({
        id: uuidv4(),
        action: "mcp.tools.call",
        targetId: d.serverId,
        targetType: "mcp-server",
        tenantId: d.tenantId,
        toolName: d.toolName,
        durationMs: d.durationMs,
        success: d.success,
        inputTokens: d.inputTokens,
        outputTokens: d.outputTokens,
        errorCode: d.errorCode,
        actorId: d.callerId,
        actorType: d.callerType ?? "system",
        outcome: d.success ? "success" : "failure",
        timestamp: new Date().toISOString(),
        ttl: 7776000, // 90 days
      });

      return { status: 201, jsonBody: { recorded: true } };
    } catch (err) {
      ctx.error("recordToolUsage error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/metrics/tool-usage ───────────────────────────────────────────────
// Aggregated tool usage stats for a tenant

app.http("getToolUsageStats", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "metrics/tool-usage",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const serverId = req.query.get("serverId");
      const from = req.query.get("from") ?? new Date(Date.now() - 864e5).toISOString(); // default 24h
      const to = req.query.get("to") ?? new Date().toISOString();

      const conditions = [
        "c.tenantId = @tenantId",
        "c.action = 'mcp.tools.call'",
        "c.timestamp >= @from",
        "c.timestamp <= @to",
      ];
      const parameters: { name: string; value: unknown }[] = [
        { name: "@tenantId", value: tenantId },
        { name: "@from", value: from },
        { name: "@to", value: to },
      ];

      if (serverId) {
        conditions.push("c.targetId = @serverId");
        parameters.push({ name: "@serverId", value: serverId });
      }

      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      const { resources } = await container.items
        .query({
          query: `SELECT c.toolName, c.targetId, c.durationMs, c.success, c.inputTokens, c.outputTokens FROM c WHERE ${conditions.join(" AND ")}`,
          parameters,
        })
        .fetchAll();

      // Aggregate tool stats
      const toolStats: Record<string, {
        calls: number;
        successes: number;
        failures: number;
        totalDurationMs: number;
        totalInputTokens: number;
        totalOutputTokens: number;
      }> = {};

      for (const r of resources) {
        const key = `${r.targetId}::${r.toolName}`;
        if (!toolStats[key]) {
          toolStats[key] = { calls: 0, successes: 0, failures: 0, totalDurationMs: 0, totalInputTokens: 0, totalOutputTokens: 0 };
        }
        const stat = toolStats[key];
        stat.calls++;
        r.success ? stat.successes++ : stat.failures++;
        stat.totalDurationMs += r.durationMs ?? 0;
        stat.totalInputTokens += r.inputTokens ?? 0;
        stat.totalOutputTokens += r.outputTokens ?? 0;
      }

      const toolMetrics = Object.entries(toolStats)
        .map(([key, stat]) => {
          const [srvId, ...toolParts] = key.split("::");
          return {
            serverId: srvId,
            toolName: toolParts.join("::"),
            calls: stat.calls,
            successRate: stat.calls ? Math.round((stat.successes / stat.calls) * 1000) / 10 : 0,
            avgLatencyMs: stat.calls ? Math.round(stat.totalDurationMs / stat.calls) : 0,
            totalInputTokens: stat.totalInputTokens,
            totalOutputTokens: stat.totalOutputTokens,
          };
        })
        .sort((a, b) => b.calls - a.calls);

      return {
        status: 200,
        jsonBody: {
          tenantId,
          period: { from, to },
          totalCalls: resources.length,
          tools: toolMetrics,
        },
      };
    } catch (err) {
      ctx.error("getToolUsageStats error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/metrics/prometheus ───────────────────────────────────────────────
// Prometheus text format scrape endpoint (for Grafana, Azure Managed Prometheus, etc.)

app.http("prometheusMetrics", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "metrics/prometheus",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const from = new Date(Date.now() - 5 * 60_000).toISOString(); // last 5 min

      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      const { resources } = await container.items
        .query({
          query: "SELECT c.action, c.toolName, c.targetId, c.durationMs, c.success FROM c WHERE c.tenantId = @tenantId AND c.action = 'mcp.tools.call' AND c.timestamp >= @from",
          parameters: [
            { name: "@tenantId", value: tenantId },
            { name: "@from", value: from },
          ],
        })
        .fetchAll();

      const totalCalls = resources.length;
      const successCalls = resources.filter((r: { success: boolean }) => r.success).length;
      const failCalls = totalCalls - successCalls;
      const avgLatency = totalCalls
        ? resources.reduce((s: number, r: { durationMs?: number }) => s + (r.durationMs ?? 0), 0) / totalCalls
        : 0;

      const lines = [
        "# HELP mcp_tool_calls_total Total MCP tool invocations",
        "# TYPE mcp_tool_calls_total counter",
        `mcp_tool_calls_total{tenant="${tenantId}",outcome="success"} ${successCalls}`,
        `mcp_tool_calls_total{tenant="${tenantId}",outcome="failure"} ${failCalls}`,
        "",
        "# HELP mcp_tool_latency_ms_avg Average MCP tool call latency in milliseconds",
        "# TYPE mcp_tool_latency_ms_avg gauge",
        `mcp_tool_latency_ms_avg{tenant="${tenantId}"} ${Math.round(avgLatency)}`,
      ];

      return {
        status: 200,
        body: lines.join("\n") + "\n",
        headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
      };
    } catch (err) {
      ctx.error("prometheusMetrics error:", err);
      return { status: 500, body: "# error fetching metrics\n", headers: { "Content-Type": "text/plain" } };
    }
  },
});

// ── GET /api/metrics/dashboard ────────────────────────────────────────────────
// Unified dashboard metrics: active servers, tool calls/day, top tools, health

app.http("dashboardMetrics", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "metrics/dashboard",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const from24h = new Date(Date.now() - 864e5).toISOString();

      const [serversRes, agentsRes, auditRes] = await Promise.all([
        (await getContainer(CONTAINERS.MCP_SERVERS)).items
          .query({
            query: "SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = 'active'",
            parameters: [{ name: "@tenantId", value: tenantId }],
          })
          .fetchAll(),
        (await getContainer(CONTAINERS.A2A_AGENTS)).items
          .query({
            query: "SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = 'active'",
            parameters: [{ name: "@tenantId", value: tenantId }],
          })
          .fetchAll(),
        (await getContainer(CONTAINERS.AUDIT_LOG)).items
          .query({
            query: "SELECT c.action, c.success, c.toolName FROM c WHERE c.tenantId = @tenantId AND c.timestamp >= @from",
            parameters: [
              { name: "@tenantId", value: tenantId },
              { name: "@from", value: from24h },
            ],
          })
          .fetchAll(),
      ]);

      const toolCallEntries = auditRes.resources.filter((e: { action: string }) => e.action === "mcp.tools.call");
      const toolCallsToday = toolCallEntries.length;
      const successRate = toolCallsToday
        ? Math.round((toolCallEntries.filter((e: { success: boolean }) => e.success).length / toolCallsToday) * 1000) / 10
        : 100;

      const toolNameCounts: Record<string, number> = {};
      for (const e of toolCallEntries) {
        if (e.toolName) toolNameCounts[e.toolName] = (toolNameCounts[e.toolName] ?? 0) + 1;
      }
      const topTools = Object.entries(toolNameCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return {
        status: 200,
        jsonBody: {
          tenantId,
          activeMcpServers: serversRes.resources[0] ?? 0,
          activeA2AAgents: agentsRes.resources[0] ?? 0,
          toolCallsLast24h: toolCallsToday,
          successRateLast24h: successRate,
          topToolsLast24h: topTools,
          totalAuditEntries24h: auditRes.resources.length,
        },
      };
    } catch (err) {
      ctx.error("dashboardMetrics error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
