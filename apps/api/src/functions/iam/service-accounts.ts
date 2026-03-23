/**
 * IAM Service Accounts API
 * Machine-to-machine (M2M) service accounts for automated tool invocations.
 * Each service account gets a client ID and hashed client secret for credential grant.
 * Scopes mirror IAM Groups — each SA has its own scope list.
 *
 * SECURITY NOTE: Client secrets are hashed with SHA-256 before storage.
 * The raw secret is returned ONLY once at creation time.
 */

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

// ── Schemas ───────────────────────────────────────────────────────────────────

const CreateServiceAccountSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  tenantId: z.string().default("default"),
  scopes: z.array(z.string()).default([]),
  expiresInDays: z.number().min(1).max(365).optional(), // null = no expiry
  metadata: z.record(z.unknown()).optional(),
});

const UpdateServiceAccountSchema = CreateServiceAccountSchema.partial().omit({ tenantId: true });

// ── Hashing helper ────────────────────────────────────────────────────────────

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

// ── POST /api/iam/service-accounts ───────────────────────────────────────────

app.http("createServiceAccount", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "iam/service-accounts",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = CreateServiceAccountSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;
      const now = new Date().toISOString();
      const clientId = uuidv4();
      const rawSecret = generateSecret();
      const secretHash = hashSecret(rawSecret);

      const expiresAt = d.expiresInDays
        ? new Date(Date.now() + d.expiresInDays * 86_400_000).toISOString()
        : null;

      const sa = {
        id: uuidv4(),
        clientId,
        secretHash,
        name: d.name,
        description: d.description ?? "",
        tenantId: d.tenantId,
        scopes: d.scopes,
        expiresAt,
        metadata: d.metadata ?? {},
        status: "active" as const,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const container = await getContainer(CONTAINERS.IAM_SERVICE_ACCOUNTS);
      await container.items.create(sa);

      // Return raw secret ONLY once
      return {
        status: 201,
        jsonBody: {
          id: sa.id,
          clientId: sa.clientId,
          clientSecret: rawSecret, // shown once, never stored in plaintext
          name: sa.name,
          tenantId: sa.tenantId,
          scopes: sa.scopes,
          expiresAt: sa.expiresAt,
          createdAt: sa.createdAt,
          _warning: "Store the clientSecret securely — it will not be shown again.",
        },
      };
    } catch (err) {
      ctx.error("createServiceAccount error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/iam/service-accounts ────────────────────────────────────────────

app.http("listServiceAccounts", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "iam/service-accounts",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "50", 10), 200);
      const offset = (page - 1) * pageSize;

      const container = await getContainer(CONTAINERS.IAM_SERVICE_ACCOUNTS);
      // Never return secretHash to clients
      const query = `SELECT c.id, c.clientId, c.name, c.description, c.tenantId, c.scopes, c.status, c.expiresAt, c.lastUsedAt, c.createdAt, c.updatedAt FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC OFFSET ${offset} LIMIT ${pageSize}`;
      const countQ = "SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId";
      const parameters = [{ name: "@tenantId", value: tenantId }];

      const [{ resources: items }, { resources: countRes }] = await Promise.all([
        container.items.query({ query, parameters }).fetchAll(),
        container.items.query({ query: countQ, parameters }).fetchAll(),
      ]);

      return { status: 200, jsonBody: { items, total: countRes[0] ?? 0, page, pageSize } };
    } catch (err) {
      ctx.error("listServiceAccounts error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/iam/service-accounts/{id} ───────────────────────────────────────

app.http("getServiceAccount", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "iam/service-accounts/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.IAM_SERVICE_ACCOUNTS);
      const { resources } = await container.items
        .query({
          query: "SELECT c.id, c.clientId, c.name, c.description, c.tenantId, c.scopes, c.status, c.expiresAt, c.lastUsedAt, c.createdAt, c.updatedAt FROM c WHERE c.id = @id",
          parameters: [{ name: "@id", value: id }],
        })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Service account not found" } };
      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getServiceAccount error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── PATCH /api/iam/service-accounts/{id} ─────────────────────────────────────

app.http("updateServiceAccount", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "iam/service-accounts/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const body = await req.json();
      const parsed = UpdateServiceAccountSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const container = await getContainer(CONTAINERS.IAM_SERVICE_ACCOUNTS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Service account not found" } };

      const { secretHash: _, ...safeData } = parsed.data as Record<string, unknown> & { secretHash?: unknown };
      const updated = { ...resources[0], ...safeData, id, updatedAt: new Date().toISOString() };
      const { resource } = await container.items.upsert(updated);

      // Strip secret hash from response
      const { secretHash: __, ...safeResource } = resource as Record<string, unknown> & { secretHash?: unknown };
      return { status: 200, jsonBody: safeResource };
    } catch (err) {
      ctx.error("updateServiceAccount error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── DELETE /api/iam/service-accounts/{id} ────────────────────────────────────

app.http("deleteServiceAccount", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "iam/service-accounts/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.IAM_SERVICE_ACCOUNTS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Service account not found" } };
      await container.item(id, resources[0].tenantId).delete();
      return { status: 204 };
    } catch (err) {
      ctx.error("deleteServiceAccount error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/iam/service-accounts/{id}/rotate-secret ────────────────────────

app.http("rotateServiceAccountSecret", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "iam/service-accounts/{id}/rotate-secret",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.IAM_SERVICE_ACCOUNTS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Service account not found" } };

      const rawSecret = generateSecret();
      const updated = {
        ...resources[0],
        secretHash: hashSecret(rawSecret),
        updatedAt: new Date().toISOString(),
      };
      await container.items.upsert(updated);

      return {
        status: 200,
        jsonBody: {
          id,
          clientId: resources[0].clientId,
          clientSecret: rawSecret,
          _warning: "Store the new clientSecret securely — it will not be shown again.",
        },
      };
    } catch (err) {
      ctx.error("rotateServiceAccountSecret error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/iam/service-accounts/authenticate ──────────────────────────────
// Validate client credentials (client_id + client_secret) for M2M auth.
// Returns the SA's resolved scopes if valid.

app.http("authenticateServiceAccount", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "iam/service-accounts/authenticate",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json()) as { clientId?: string; clientSecret?: string };
      if (!body.clientId || !body.clientSecret) {
        return { status: 400, jsonBody: { error: "clientId and clientSecret are required" } };
      }

      const secretHash = hashSecret(body.clientSecret);
      const container = await getContainer(CONTAINERS.IAM_SERVICE_ACCOUNTS);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.clientId = @clientId AND c.secretHash = @secretHash AND c.status = 'active'",
          parameters: [
            { name: "@clientId", value: body.clientId },
            { name: "@secretHash", value: secretHash },
          ],
        })
        .fetchAll();

      if (!resources.length) {
        return { status: 401, jsonBody: { error: "Invalid credentials" } };
      }

      const sa = resources[0];

      // Check expiry
      if (sa.expiresAt && new Date(sa.expiresAt) < new Date()) {
        return { status: 401, jsonBody: { error: "Service account credentials have expired" } };
      }

      // Update lastUsedAt
      container.items.upsert({ ...sa, lastUsedAt: new Date().toISOString() }).catch(() => {});

      return {
        status: 200,
        jsonBody: {
          authenticated: true,
          id: sa.id,
          clientId: sa.clientId,
          name: sa.name,
          tenantId: sa.tenantId,
          scopes: sa.scopes,
        },
      };
    } catch (err) {
      ctx.error("authenticateServiceAccount error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
