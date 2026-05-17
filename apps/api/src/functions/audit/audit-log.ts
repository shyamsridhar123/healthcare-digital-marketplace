/**
 * Enhanced Audit Log API
 * Searchable, filterable, and exportable audit log for all marketplace operations.
 * Covers MCP tool calls, server registrations, IAM changes, security scans,
 * workflow executions, and submission reviews.
 *
 * All audit records have a configurable TTL (default 90 days).
 * Supports JSONL and CSV export for compliance data requests.
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

const CreateAuditEntrySchema = z.object({
  action: z.string().min(1).max(120),
  targetId: z.string().optional(),
  targetType: z.string().optional(),
  tenantId: z.string().default("default"),
  actorId: z.string().optional(),
  actorType: z.enum(["user", "service-account", "system"]).default("system"),
  details: z.record(z.unknown()).optional(),
  outcome: z.enum(["success", "failure", "partial"]).default("success"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  durationMs: z.number().optional(),
  correlationId: z.string().optional(),
  ttlDays: z.number().min(1).max(3650).default(90),
});

// ── POST /api/audit/entries ───────────────────────────────────────────────────
// Programmatically write an audit entry (for external integrations)

app.http("createAuditEntry", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "audit/entries",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = CreateAuditEntrySchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;
      const entry = {
        id: uuidv4(),
        ...d,
        timestamp: new Date().toISOString(),
        ttl: d.ttlDays * 86400,
      };

      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      const { resource } = await container.items.create(entry);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      ctx.error("createAuditEntry error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/audit/entries ────────────────────────────────────────────────────
// Query audit log with rich filtering

app.http("listAuditEntries", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "audit/entries",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const action = req.query.get("action");
      const actorId = req.query.get("actorId");
      const targetId = req.query.get("targetId");
      const targetType = req.query.get("targetType");
      const outcome = req.query.get("outcome");
      const from = req.query.get("from"); // ISO date string
      const to = req.query.get("to");
      const correlationId = req.query.get("correlationId");
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "50", 10), 200);
      const offset = (page - 1) * pageSize;

      const conditions = ["c.tenantId = @tenantId"];
      const parameters: { name: string; value: unknown }[] = [{ name: "@tenantId", value: tenantId }];

      if (action) { conditions.push("CONTAINS(LOWER(c.action), LOWER(@action))"); parameters.push({ name: "@action", value: action }); }
      if (actorId) { conditions.push("c.actorId = @actorId"); parameters.push({ name: "@actorId", value: actorId }); }
      if (targetId) { conditions.push("c.targetId = @targetId"); parameters.push({ name: "@targetId", value: targetId }); }
      if (targetType) { conditions.push("c.targetType = @targetType"); parameters.push({ name: "@targetType", value: targetType }); }
      if (outcome) { conditions.push("c.outcome = @outcome"); parameters.push({ name: "@outcome", value: outcome }); }
      if (correlationId) { conditions.push("c.correlationId = @correlationId"); parameters.push({ name: "@correlationId", value: correlationId }); }
      if (from) { conditions.push("c.timestamp >= @from"); parameters.push({ name: "@from", value: from }); }
      if (to) { conditions.push("c.timestamp <= @to"); parameters.push({ name: "@to", value: to }); }

      const where = `WHERE ${conditions.join(" AND ")}`;
      const container = await getContainer(CONTAINERS.AUDIT_LOG);

      const [{ resources: items }, { resources: countRes }] = await Promise.all([
        container.items.query({
          query: `SELECT * FROM c ${where} ORDER BY c.timestamp DESC OFFSET ${offset} LIMIT ${pageSize}`,
          parameters,
        }).fetchAll(),
        container.items.query({ query: `SELECT VALUE COUNT(1) FROM c ${where}`, parameters }).fetchAll(),
      ]);

      return { status: 200, jsonBody: { items, total: countRes[0] ?? 0, page, pageSize } };
    } catch (err) {
      ctx.error("listAuditEntries error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/audit/entries/{id} ───────────────────────────────────────────────

app.http("getAuditEntry", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "audit/entries/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Audit entry not found" } };
      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getAuditEntry error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/audit/export ─────────────────────────────────────────────────────
// Export audit log as JSONL or CSV for compliance

app.http("exportAuditLog", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "audit/export",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const format = req.query.get("format") ?? "jsonl"; // jsonl or csv
      const from = req.query.get("from");
      const to = req.query.get("to");
      const targetType = req.query.get("targetType");
      const maxRows = Math.min(parseInt(req.query.get("maxRows") ?? "10000", 10), 50000);

      const conditions = ["c.tenantId = @tenantId"];
      const parameters: { name: string; value: unknown }[] = [{ name: "@tenantId", value: tenantId }];

      if (from) { conditions.push("c.timestamp >= @from"); parameters.push({ name: "@from", value: from }); }
      if (to) { conditions.push("c.timestamp <= @to"); parameters.push({ name: "@to", value: to }); }
      if (targetType) { conditions.push("c.targetType = @targetType"); parameters.push({ name: "@targetType", value: targetType }); }

      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      const { resources } = await container.items
        .query({
          query: `SELECT * FROM c WHERE ${conditions.join(" AND ")} ORDER BY c.timestamp DESC OFFSET 0 LIMIT ${maxRows}`,
          parameters,
        })
        .fetchAll();

      if (format === "csv") {
        const csvFields = ["id", "timestamp", "action", "actorId", "actorType", "targetId", "targetType", "outcome", "durationMs", "ipAddress", "correlationId"];
        const header = csvFields.join(",");
        const rows = resources.map((r: Record<string, unknown>) =>
          csvFields.map((f) => {
            const val = r[f] ?? "";
            const str = String(val);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(",")
        );
        const csv = [header, ...rows].join("\n");

        return {
          status: 200,
          body: csv,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="audit-log-${tenantId}-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        };
      }

      // JSONL format
      const jsonl = resources.map((r: unknown) => JSON.stringify(r)).join("\n");
      return {
        status: 200,
        body: jsonl,
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition": `attachment; filename="audit-log-${tenantId}-${new Date().toISOString().slice(0, 10)}.jsonl"`,
        },
      };
    } catch (err) {
      ctx.error("exportAuditLog error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/audit/stats ──────────────────────────────────────────────────────
// Dashboard statistics: top actions, most active actors, failure rates

app.http("auditStats", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "audit/stats",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const from = req.query.get("from") ?? new Date(Date.now() - 7 * 864e5).toISOString(); // default: last 7 days
      const to = req.query.get("to") ?? new Date().toISOString();

      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      const { resources } = await container.items
        .query({
          query: "SELECT c.action, c.actorId, c.targetType, c.outcome, c.durationMs FROM c WHERE c.tenantId = @tenantId AND c.timestamp >= @from AND c.timestamp <= @to",
          parameters: [
            { name: "@tenantId", value: tenantId },
            { name: "@from", value: from },
            { name: "@to", value: to },
          ],
        })
        .fetchAll();

      const totalEntries = resources.length;
      const successCount = resources.filter((e: { outcome: string }) => e.outcome === "success").length;
      const failureCount = resources.filter((e: { outcome: string }) => e.outcome === "failure").length;

      // Top 10 actions
      const actionCounts: Record<string, number> = {};
      for (const e of resources) {
        actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
      }
      const topActions = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }));

      // Top 10 actors
      const actorCounts: Record<string, number> = {};
      for (const e of resources) {
        if (e.actorId) actorCounts[e.actorId] = (actorCounts[e.actorId] ?? 0) + 1;
      }
      const topActors = Object.entries(actorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([actorId, count]) => ({ actorId, count }));

      // Avg duration
      const withDuration = resources.filter((e: { durationMs?: number }) => e.durationMs != null);
      const avgDurationMs = withDuration.length
        ? Math.round(withDuration.reduce((s: number, e: { durationMs: number }) => s + e.durationMs, 0) / withDuration.length)
        : null;

      // By target type
      const byTargetType: Record<string, number> = {};
      for (const e of resources) {
        if (e.targetType) byTargetType[e.targetType] = (byTargetType[e.targetType] ?? 0) + 1;
      }

      return {
        status: 200,
        jsonBody: {
          tenantId,
          period: { from, to },
          totalEntries,
          successCount,
          failureCount,
          failureRate: totalEntries ? Math.round((failureCount / totalEntries) * 1000) / 10 : 0,
          avgDurationMs,
          topActions,
          topActors,
          byTargetType,
        },
      };
    } catch (err) {
      ctx.error("auditStats error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/audit/entries/{id}/trace ─────────────────────────────────────────
// Get all entries sharing the same correlationId (distributed trace)

app.http("getAuditTrace", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "audit/trace/{correlationId}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { correlationId } = req.params;
    try {
      const container = await getContainer(CONTAINERS.AUDIT_LOG);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.correlationId = @correlationId ORDER BY c.timestamp ASC",
          parameters: [{ name: "@correlationId", value: correlationId }],
        })
        .fetchAll();

      return { status: 200, jsonBody: { correlationId, entries: resources, count: resources.length } };
    } catch (err) {
      ctx.error("getAuditTrace error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
