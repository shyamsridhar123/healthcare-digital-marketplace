/**
 * MCP Server Registry API
 * Register, discover, update, enable/disable, and version MCP servers.
 * Each server entry tracks its endpoint URL, auth scheme, available tools
 * (cached), health status, and version history.
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

const RegisterServerSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  endpointUrl: z.string().url(),
  transport: z.enum(["streamable-http", "sse", "stdio"]).default("streamable-http"),
  authScheme: z.enum(["none", "bearer", "oauth2", "api-key"]).default("none"),
  authConfig: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
  tenantId: z.string().default("default"),
  visibility: z.enum(["public", "private", "group"]).default("public"),
});

const UpdateServerSchema = RegisterServerSchema.partial().omit({ tenantId: true });

// ── Helper: write audit entry ─────────────────────────────────────────────────

async function audit(
  action: string,
  targetId: string,
  tenantId: string,
  extra?: Record<string, unknown>
): Promise<void> {
  try {
    const c = await getContainer(CONTAINERS.AUDIT_LOG);
    await c.items.create({
      id: uuidv4(),
      action,
      targetId,
      targetType: "mcp-server",
      tenantId,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  } catch { /* fire-and-forget */ }
}

// ── POST /api/registry/servers ────────────────────────────────────────────────

app.http("registerMcpServer", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/servers",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = RegisterServerSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;
      const now = new Date().toISOString();

      const server = {
        id: uuidv4(),
        ...d,
        status: "active" as const,
        activeVersion: d.version,
        versions: [
          {
            version: d.version,
            endpointUrl: d.endpointUrl,
            registeredAt: now,
            active: true,
            deprecated: false,
          },
        ],
        toolsCache: [],          // populated by tool discovery sync
        toolsCachedAt: null,
        healthStatus: "unknown" as const,
        lastHealthCheck: null,
        securityScanStatus: "pending" as const,
        lastSecurityScan: null,
        rating: 0,
        ratingCount: 0,
        registeredAt: now,
        updatedAt: now,
      };

      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resource } = await container.items.create(server);

      // Emit scan-requested event (security scan happens async)
      ctx.log(JSON.stringify({ event: "SECURITY_SCAN_REQUESTED", targetId: server.id, targetType: "mcp-server" }));
      // Emit health-check-requested
      ctx.log(JSON.stringify({ event: "HEALTH_CHECK_REQUESTED", serverId: server.id, endpointUrl: d.endpointUrl }));

      await audit("server.registered", server.id, d.tenantId, { name: d.name });
      return { status: 201, jsonBody: resource };
    } catch (err) {
      ctx.error("registerMcpServer error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/servers ─────────────────────────────────────────────────

app.http("listMcpServers", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/servers",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const search = req.query.get("search") ?? "";
      const status = req.query.get("status"); // active|disabled|all
      const tag = req.query.get("tag");
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "24", 10), 100);
      const offset = (page - 1) * pageSize;

      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const conditions = ["c.tenantId = @tenantId"];
      const parameters: { name: string; value: unknown }[] = [{ name: "@tenantId", value: tenantId }];

      if (status && status !== "all") {
        conditions.push("c.status = @status");
        parameters.push({ name: "@status", value: status });
      } else if (!status) {
        conditions.push("c.status = 'active'");
      }

      if (search) {
        conditions.push("(CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.description), LOWER(@search)))");
        parameters.push({ name: "@search", value: search });
      }

      if (tag) {
        conditions.push("ARRAY_CONTAINS(c.tags, @tag)");
        parameters.push({ name: "@tag", value: tag });
      }

      const where = `WHERE ${conditions.join(" AND ")}`;
      const query = `SELECT * FROM c ${where} ORDER BY c.registeredAt DESC OFFSET ${offset} LIMIT ${pageSize}`;
      const countQ = `SELECT VALUE COUNT(1) FROM c ${where}`;

      const [{ resources: items }, { resources: countRes }] = await Promise.all([
        container.items.query({ query, parameters }).fetchAll(),
        container.items.query({ query: countQ, parameters }).fetchAll(),
      ]);

      return { status: 200, jsonBody: { items, total: countRes[0] ?? 0, page, pageSize } };
    } catch (err) {
      ctx.error("listMcpServers error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/servers/{id} ───────────────────────────────────────────

app.http("getMcpServer", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/servers/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };
      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getMcpServer error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── PATCH /api/registry/servers/{id} ─────────────────────────────────────────

app.http("updateMcpServer", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "registry/servers/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = await req.json();
      const parsed = UpdateServerSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };

      const existing = resources[0];
      const updated = { ...existing, ...parsed.data, id, updatedAt: new Date().toISOString() };
      const { resource } = await container.items.upsert(updated);

      await audit("server.updated", id, existing.tenantId);
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("updateMcpServer error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── DELETE /api/registry/servers/{id} ────────────────────────────────────────

app.http("deleteMcpServer", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "registry/servers/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };

      await container.item(id, resources[0].tenantId).delete();
      await audit("server.deleted", id, resources[0].tenantId, { name: resources[0].name });
      return { status: 204 };
    } catch (err) {
      ctx.error("deleteMcpServer error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/servers/{id}/enable ────────────────────────────────────

app.http("enableMcpServer", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/servers/{id}/enable",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    return toggleServer(id, "active");
  },
});

app.http("disableMcpServer", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/servers/{id}/disable",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    return toggleServer(id, "disabled");
  },
});

async function toggleServer(id: string, status: "active" | "disabled"): Promise<HttpResponseInit> {
  const container = await getContainer(CONTAINERS.MCP_SERVERS);
  const { resources } = await container.items
    .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
    .fetchAll();
  if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };
  const updated = { ...resources[0], status, updatedAt: new Date().toISOString() };
  await container.items.upsert(updated);
  await audit(`server.${status}`, id, resources[0].tenantId);
  return { status: 200, jsonBody: { id, status } };
}

// ── POST /api/registry/servers/{id}/versions ─────────────────────────────────
// Register a new version of an MCP server (inactive by default for safe rollout)

app.http("addMcpServerVersion", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/servers/{id}/versions",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = (await req.json()) as { version: string; endpointUrl: string; notes?: string };
      if (!body.version || !body.endpointUrl) {
        return { status: 400, jsonBody: { error: "version and endpointUrl are required" } };
      }

      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };

      const server = resources[0];
      const versions: Array<{ version: string; endpointUrl: string; registeredAt: string; active: boolean; deprecated: boolean; notes?: string }> = server.versions ?? [];

      // Check version doesn't already exist
      if (versions.find((v) => v.version === body.version)) {
        return { status: 409, jsonBody: { error: `Version ${body.version} already exists` } };
      }

      versions.push({
        version: body.version,
        endpointUrl: body.endpointUrl,
        registeredAt: new Date().toISOString(),
        active: false,  // new versions start inactive
        deprecated: false,
        notes: body.notes,
      });

      const updated = { ...server, versions, updatedAt: new Date().toISOString() };
      await container.items.upsert(updated);

      await audit("server.version.added", id, server.tenantId, { version: body.version });
      return { status: 201, jsonBody: { id, version: body.version, active: false } };
    } catch (err) {
      ctx.error("addMcpServerVersion error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/servers/{id}/versions/{version}/promote ───────────────
// Promote a specific version to active (with instant rollback support)

app.http("promoteMcpServerVersion", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/servers/{id}/versions/{version}/promote",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id, version } = req.params;
    try {
      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Server not found" } };

      const server = resources[0];
      const versions: Array<{ version: string; endpointUrl: string; active: boolean; deprecated: boolean }> = server.versions ?? [];
      const target = versions.find((v) => v.version === version);
      if (!target) return { status: 404, jsonBody: { error: `Version ${version} not found` } };

      // Deactivate all, activate target
      const updatedVersions = versions.map((v) => ({ ...v, active: v.version === version }));
      const targetVersion = updatedVersions.find((v) => v.version === version)!;

      const updated = {
        ...server,
        versions: updatedVersions,
        activeVersion: version,
        endpointUrl: targetVersion.endpointUrl,
        updatedAt: new Date().toISOString(),
      };
      await container.items.upsert(updated);

      await audit("server.version.promoted", id, server.tenantId, { version, previousVersion: server.activeVersion });
      return { status: 200, jsonBody: { id, activeVersion: version } };
    } catch (err) {
      ctx.error("promoteMcpServerVersion error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/servers/{id}/ratings ───────────────────────────────────

const ServerRatingSchema = z.object({
  score: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

app.http("rateMcpServer", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/servers/{id}/ratings",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = await req.json();
      const parsed = ServerRatingSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "score must be 1–5" } };
      }

      const ratingsContainer = await getContainer(CONTAINERS.RATINGS);
      await ratingsContainer.items.create({
        id: uuidv4(),
        assetId: id,
        assetType: "mcp-server",
        score: parsed.data.score,
        comment: parsed.data.comment ?? "",
        createdAt: new Date().toISOString(),
      });

      const { resources: allRatings } = await ratingsContainer.items
        .query({ query: "SELECT c.score FROM c WHERE c.assetId = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();

      const avg = allRatings.length
        ? allRatings.reduce((s: number, r: { score: number }) => s + r.score, 0) / allRatings.length
        : 0;

      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (resources.length) {
        await container.items.upsert({ ...resources[0], rating: Math.round(avg * 10) / 10, ratingCount: allRatings.length });
      }

      return { status: 201, jsonBody: { id, rating: Math.round(avg * 10) / 10, ratingCount: allRatings.length } };
    } catch (err) {
      ctx.error("rateMcpServer error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
