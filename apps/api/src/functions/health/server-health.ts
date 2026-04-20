/**
 * Server Health Monitoring API
 * Periodic health checks for registered MCP servers and A2A agents.
 * Tracks uptime, response latency, and consecutive failure counts.
 * Auto-disables servers after configurable consecutive failure threshold.
 *
 * Health records have a 7-day TTL (handled by Cosmos TTL setting).
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

// ── Schemas ───────────────────────────────────────────────────────────────────

const HealthCheckSchema = z.object({
  serverId: z.string().min(1),
  targetType: z.enum(["mcp-server", "a2a-agent"]).default("mcp-server"),
  autoDisableAfterFailures: z.number().min(1).max(20).default(5),
});

// ── Perform health check ──────────────────────────────────────────────────────

async function performHealthCheck(
  serverId: string,
  endpointUrl: string,
  targetType: string
): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  httpStatus: number | null;
  error: string | null;
}> {
  const start = Date.now();
  try {
    // For MCP servers, try initialize; for others just HEAD
    const method = targetType === "mcp-server" ? "POST" : "HEAD";
    const body =
      method === "POST"
        ? JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: {} })
        : undefined;

    const resp = await fetch(endpointUrl, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body,
      signal: AbortSignal.timeout(10_000),
    });

    const latencyMs = Date.now() - start;

    if (resp.status >= 500) {
      return { status: "unhealthy", latencyMs, httpStatus: resp.status, error: `HTTP ${resp.status}` };
    }
    if (latencyMs > 5000) {
      return { status: "degraded", latencyMs, httpStatus: resp.status, error: "High latency (>5s)" };
    }
    return { status: "healthy", latencyMs, httpStatus: resp.status, error: null };
  } catch (err) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      httpStatus: null,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

// ── POST /api/health/servers/{serverId}/check ─────────────────────────────────

app.http("checkServerHealth", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "health/servers/{serverId}/check",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const parsed = HealthCheckSchema.safeParse({ serverId, ...body });
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const targetType = parsed.data.targetType;
      const containerName = targetType === "mcp-server" ? CONTAINERS.MCP_SERVERS : CONTAINERS.A2A_AGENTS;
      const resourceContainer = await getContainer(containerName);
      const { resources } = await resourceContainer.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: serverId }] })
        .fetchAll();

      if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };

      const server = resources[0];
      const endpointUrl: string = server.endpointUrl ?? server.agentCard?.url ?? "";

      if (!endpointUrl) {
        return { status: 422, jsonBody: { error: "Server has no endpoint URL configured" } };
      }

      const result = await performHealthCheck(serverId, endpointUrl, targetType);
      const now = new Date().toISOString();

      // Record health entry
      const healthRecord = {
        id: uuidv4(),
        serverId,
        targetType,
        tenantId: server.tenantId ?? "default",
        ...result,
        checkedAt: now,
        ttl: 604800, // 7 days
      };

      const healthContainer = await getContainer(CONTAINERS.SERVER_HEALTH);
      await healthContainer.items.create(healthRecord);

      // Update server healthStatus and consecutive failure count
      const consecutiveFailures =
        result.status === "unhealthy"
          ? (server.consecutiveFailures ?? 0) + 1
          : 0;

      let newServerStatus = server.status;
      const autoDisableThreshold = parsed.data.autoDisableAfterFailures;
      if (consecutiveFailures >= autoDisableThreshold && server.status === "active") {
        newServerStatus = "disabled";
        ctx.log(JSON.stringify({ event: "SERVER_AUTO_DISABLED", serverId, reason: `${consecutiveFailures} consecutive failures`, threshold: autoDisableThreshold }));
      }

      await resourceContainer.items.upsert({
        ...server,
        healthStatus: result.status,
        lastHealthCheck: now,
        consecutiveFailures,
        status: newServerStatus,
        updatedAt: now,
      });

      return {
        status: 200,
        jsonBody: {
          ...healthRecord,
          autoDisabled: newServerStatus === "disabled" && server.status === "active",
          consecutiveFailures,
        },
      };
    } catch (err) {
      ctx.error("checkServerHealth error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/health/servers/{serverId} ────────────────────────────────────────

app.http("getServerHealthStatus", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health/servers/{serverId}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const containerName = req.query.get("targetType") === "a2a-agent" ? CONTAINERS.A2A_AGENTS : CONTAINERS.MCP_SERVERS;
      const resourceContainer = await getContainer(containerName);
      const { resources } = await resourceContainer.items
        .query({ query: "SELECT c.id, c.name, c.healthStatus, c.lastHealthCheck, c.consecutiveFailures, c.status FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: serverId }] })
        .fetchAll();

      if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };

      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getServerHealthStatus error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/health/servers/{serverId}/history ────────────────────────────────

app.http("getServerHealthHistory", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health/servers/{serverId}/history",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const limit = Math.min(parseInt(req.query.get("limit") ?? "100", 10), 500);
      const healthContainer = await getContainer(CONTAINERS.SERVER_HEALTH);

      const { resources } = await healthContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.serverId = @serverId ORDER BY c.checkedAt DESC OFFSET 0 LIMIT ${limit}`,
          parameters: [{ name: "@serverId", value: serverId }],
        })
        .fetchAll();

      // Compute uptime percentage from results
      const total = resources.length;
      const healthy = resources.filter((r: { status: string }) => r.status === "healthy").length;
      const uptimePct = total ? Math.round((healthy / total) * 100 * 10) / 10 : null;
      const avgLatency = total
        ? Math.round(resources.reduce((s: number, r: { latencyMs: number }) => s + (r.latencyMs || 0), 0) / total)
        : null;

      return { status: 200, jsonBody: { serverId, history: resources, uptimePercent: uptimePct, avgLatencyMs: avgLatency, total } };
    } catch (err) {
      ctx.error("getServerHealthHistory error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/health/summary ───────────────────────────────────────────────────
// Health dashboard summary for all servers in a tenant

app.http("healthSummary", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health/summary",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";

      const [serversResp, agentsResp] = await Promise.all([
        (await getContainer(CONTAINERS.MCP_SERVERS)).items
          .query({
            query: "SELECT c.id, c.name, c.healthStatus, c.status, c.lastHealthCheck, c.consecutiveFailures FROM c WHERE c.tenantId = @tenantId",
            parameters: [{ name: "@tenantId", value: tenantId }],
          })
          .fetchAll(),
        (await getContainer(CONTAINERS.A2A_AGENTS)).items
          .query({
            query: "SELECT c.id, c.agentCard.name AS name, c.healthStatus, c.status, c.lastHealthCheck FROM c WHERE c.tenantId = @tenantId",
            parameters: [{ name: "@tenantId", value: tenantId }],
          })
          .fetchAll(),
      ]);

      const allResources: Record<string, unknown>[] = [
        ...serversResp.resources.map((r: Record<string, unknown>) => ({ ...r, resourceType: "mcp-server" })),
        ...agentsResp.resources.map((r: Record<string, unknown>) => ({ ...r, resourceType: "a2a-agent" })),
      ];

      const total = allResources.length;
      const healthy = allResources.filter((r) => r.healthStatus === "healthy").length;
      const degraded = allResources.filter((r) => r.healthStatus === "degraded").length;
      const unhealthy = allResources.filter((r) => r.healthStatus === "unhealthy").length;
      const unknown = allResources.filter((r) => !r.healthStatus || r.healthStatus === "unknown").length;
      const autoDisabled = allResources.filter((r) => r.status === "disabled" && Number(r.consecutiveFailures) > 0).length;

      return {
        status: 200,
        jsonBody: {
          tenantId,
          summary: { total, healthy, degraded, unhealthy, unknown, autoDisabled },
          resources: allResources,
        },
      };
    } catch (err) {
      ctx.error("healthSummary error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/health/servers/batch-check ──────────────────────────────────────
// Trigger health checks for all active servers in a tenant (batch)

app.http("batchHealthCheck", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "health/servers/batch-check",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json().catch(() => ({}))) as { tenantId?: string; maxConcurrent?: number };
      const tenantId = body.tenantId ?? "default";
      const maxConcurrent = Math.min(body.maxConcurrent ?? 5, 20);

      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources: servers } = await container.items
        .query({
          query: "SELECT c.id, c.endpointUrl, c.tenantId FROM c WHERE c.tenantId = @tenantId AND c.status = 'active'",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();

      // Process in batches of maxConcurrent
      const results: Array<{ serverId: string; status: string }> = [];
      for (let i = 0; i < servers.length; i += maxConcurrent) {
        const batch = servers.slice(i, i + maxConcurrent);
        const batchResults = await Promise.allSettled(
          batch.map(async (s: { id: string; endpointUrl: string }) => {
            const r = await performHealthCheck(s.id, s.endpointUrl, "mcp-server");
            return { serverId: s.id, status: r.status };
          })
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled") results.push(result.value);
        }
      }

      return { status: 200, jsonBody: { checked: results.length, results } };
    } catch (err) {
      ctx.error("batchHealthCheck error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
