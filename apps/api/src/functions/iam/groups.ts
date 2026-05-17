/**
 * IAM Groups API
 * Fine-grained access control groups for MCP servers, tools, and A2A agents.
 * Groups contain members (users / service accounts) and permission scopes.
 *
 * Scope format: "<resource_type>:<resource_id>:<permission>"
 * e.g. "mcp-server:abc123:call", "mcp-tool:xyz::read", "a2a-agent:*:invoke"
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

const ScopeSchema = z.string().regex(
  /^(mcp-server|mcp-tool|a2a-agent|skill|\*):[a-zA-Z0-9:_*-]+:(read|call|invoke|admin|\*)$/,
  "Scope must be '<resource_type>:<resource_id>:<permission>'"
);

const CreateGroupSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  tenantId: z.string().default("default"),
  scopes: z.array(ScopeSchema).default([]),
  members: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["user", "service-account"]),
        addedAt: z.string().optional(),
      })
    )
    .default([]),
});

const UpdateGroupSchema = CreateGroupSchema.partial().omit({ tenantId: true });

// ── POST /api/iam/groups ──────────────────────────────────────────────────────

app.http("createIamGroup", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "iam/groups",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = CreateGroupSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;
      const now = new Date().toISOString();

      const group = {
        id: uuidv4(),
        ...d,
        members: d.members.map((m) => ({ ...m, addedAt: m.addedAt ?? now })),
        createdAt: now,
        updatedAt: now,
      };

      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const { resource } = await container.items.create(group);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      ctx.error("createIamGroup error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/iam/groups ───────────────────────────────────────────────────────

app.http("listIamGroups", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "iam/groups",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "50", 10), 200);
      const offset = (page - 1) * pageSize;

      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const query = `SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC OFFSET ${offset} LIMIT ${pageSize}`;
      const countQ = "SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId";
      const parameters = [{ name: "@tenantId", value: tenantId }];

      const [{ resources: items }, { resources: countRes }] = await Promise.all([
        container.items.query({ query, parameters }).fetchAll(),
        container.items.query({ query: countQ, parameters }).fetchAll(),
      ]);

      return { status: 200, jsonBody: { items, total: countRes[0] ?? 0, page, pageSize } };
    } catch (err) {
      ctx.error("listIamGroups error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/iam/groups/{id} ──────────────────────────────────────────────────

app.http("getIamGroup", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "iam/groups/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Group not found" } };
      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getIamGroup error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── PATCH /api/iam/groups/{id} ────────────────────────────────────────────────

app.http("updateIamGroup", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "iam/groups/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const body = await req.json();
      const parsed = UpdateGroupSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Group not found" } };

      const updated = { ...resources[0], ...parsed.data, id, updatedAt: new Date().toISOString() };
      const { resource } = await container.items.upsert(updated);
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("updateIamGroup error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── DELETE /api/iam/groups/{id} ───────────────────────────────────────────────

app.http("deleteIamGroup", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "iam/groups/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Group not found" } };
      await container.item(id, resources[0].tenantId).delete();
      return { status: 204 };
    } catch (err) {
      ctx.error("deleteIamGroup error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/iam/groups/{id}/members ────────────────────────────────────────

app.http("addGroupMember", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "iam/groups/{id}/members",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const body = (await req.json()) as { memberId: string; memberType?: string };
      if (!body.memberId) return { status: 400, jsonBody: { error: "memberId is required" } };

      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Group not found" } };

      const group = resources[0];
      const members = group.members ?? [];
      if (members.find((m: { id: string }) => m.id === body.memberId)) {
        return { status: 409, jsonBody: { error: "Member already in group" } };
      }

      members.push({ id: body.memberId, type: body.memberType ?? "user", addedAt: new Date().toISOString() });
      await container.items.upsert({ ...group, members, updatedAt: new Date().toISOString() });
      return { status: 200, jsonBody: { id, memberCount: members.length } };
    } catch (err) {
      ctx.error("addGroupMember error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── DELETE /api/iam/groups/{id}/members/{memberId} ───────────────────────────

app.http("removeGroupMember", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "iam/groups/{id}/members/{memberId}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id, memberId } = req.params;
    try {
      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Group not found" } };

      const group = resources[0];
      const members = (group.members ?? []).filter((m: { id: string }) => m.id !== memberId);
      await container.items.upsert({ ...group, members, updatedAt: new Date().toISOString() });
      return { status: 200, jsonBody: { id, memberCount: members.length } };
    } catch (err) {
      ctx.error("removeGroupMember error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/iam/groups/{id}/scopes ─────────────────────────────────────────

app.http("addGroupScope", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "iam/groups/{id}/scopes",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const body = (await req.json()) as { scope: string };
      const scope = ScopeSchema.safeParse(body.scope);
      if (!scope.success) {
        return { status: 400, jsonBody: { error: "Invalid scope format. Use '<resource_type>:<resource_id>:<permission>'" } };
      }

      const container = await getContainer(CONTAINERS.IAM_GROUPS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Group not found" } };

      const group = resources[0];
      const scopes: string[] = group.scopes ?? [];
      if (scopes.includes(scope.data)) return { status: 409, jsonBody: { error: "Scope already assigned" } };

      scopes.push(scope.data);
      await container.items.upsert({ ...group, scopes, updatedAt: new Date().toISOString() });
      return { status: 200, jsonBody: { id, scopes } };
    } catch (err) {
      ctx.error("addGroupScope error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/iam/check ───────────────────────────────────────────────────────
// Check if a member has a specific permission scope

app.http("checkIamPermission", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "iam/check",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json()) as {
        memberId: string;
        scope: string;
        tenantId?: string;
      };

      if (!body.memberId || !body.scope) {
        return { status: 400, jsonBody: { error: "memberId and scope are required" } };
      }

      const tenantId = body.tenantId ?? "default";
      const container = await getContainer(CONTAINERS.IAM_GROUPS);

      // Find all groups this member belongs to in this tenant
      const { resources: groups } = await container.items
        .query({
          query: "SELECT c.scopes FROM c WHERE c.tenantId = @tenantId AND EXISTS(SELECT VALUE m FROM m IN c.members WHERE m.id = @memberId)",
          parameters: [
            { name: "@tenantId", value: tenantId },
            { name: "@memberId", value: body.memberId },
          ],
        })
        .fetchAll();

      const allScopes: string[] = groups.flatMap((g: { scopes: string[] }) => g.scopes);

      // Check wildcard admin or exact match
      const allowed =
        allScopes.includes("*:*:admin") ||
        allScopes.includes(body.scope) ||
        allScopes.some((s) => {
          // Wildcard permission: "mcp-server:abc:*" allows "mcp-server:abc:call"
          const parts = s.split(":");
          const reqParts = body.scope.split(":");
          return (
            parts.length === reqParts.length &&
            parts.every((p, i) => p === "*" || p === reqParts[i])
          );
        });

      return { status: 200, jsonBody: { allowed, memberId: body.memberId, scope: body.scope } };
    } catch (err) {
      ctx.error("checkIamPermission error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
