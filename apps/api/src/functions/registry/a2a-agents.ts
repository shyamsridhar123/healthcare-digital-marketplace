/**
 * A2A (Agent-to-Agent) Registry API
 * Register, discover, and manage agents that expose Google A2A Protocol
 * agent cards. Supports semantic discovery by capability and skill keywords.
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

const AgentSkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
  inputModes: z.array(z.string()).default(["text"]),
  outputModes: z.array(z.string()).default(["text"]),
});

const AgentCardSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500),
  version: z.string().default("1.0.0"),
  url: z.string().url(),
  documentationUrl: z.string().url().optional(),
  provider: z
    .object({ organization: z.string(), url: z.string().url().optional() })
    .optional(),
  capabilities: z
    .object({
      streaming: z.boolean().default(false),
      pushNotifications: z.boolean().default(false),
      stateTransitionHistory: z.boolean().default(false),
    })
    .default({}),
  authentication: z
    .object({
      schemes: z.array(z.string()).default(["none"]),
      credentials: z.string().optional(),
    })
    .default({}),
  defaultInputModes: z.array(z.string()).default(["text"]),
  defaultOutputModes: z.array(z.string()).default(["text"]),
  skills: z.array(AgentSkillSchema).default([]),
});

const RegisterAgentSchema = z.object({
  agentCard: AgentCardSchema,
  tags: z.array(z.string()).default([]),
  tenantId: z.string().default("default"),
  visibility: z.enum(["public", "private", "group"]).default("public"),
  endpointUrl: z.string().url(),
  authScheme: z.enum(["none", "bearer", "oauth2", "api-key", "jwt"]).default("none"),
  authConfig: z.record(z.unknown()).optional(),
  category: z.string().max(80).optional(),
});

const UpdateAgentSchema = RegisterAgentSchema.partial().omit({ tenantId: true });

// ── POST /api/registry/agents ─────────────────────────────────────────────────

app.http("registerA2AAgent", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/agents",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = RegisterAgentSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;
      const now = new Date().toISOString();

      const agent = {
        id: uuidv4(),
        ...d,
        status: "active" as const,
        versions: [
          {
            version: d.agentCard.version,
            endpointUrl: d.endpointUrl,
            registeredAt: now,
            active: true,
          },
        ],
        healthStatus: "unknown" as const,
        lastHealthCheck: null,
        rating: 0,
        ratingCount: 0,
        registeredAt: now,
        updatedAt: now,
      };

      const container = await getContainer(CONTAINERS.A2A_AGENTS);
      const { resource } = await container.items.create(agent);

      return { status: 201, jsonBody: resource };
    } catch (err) {
      ctx.error("registerA2AAgent error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/agents ──────────────────────────────────────────────────

app.http("listA2AAgents", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/agents",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const status = req.query.get("status");
      const search = req.query.get("search") ?? "";
      const category = req.query.get("category");
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "24", 10), 100);
      const offset = (page - 1) * pageSize;

      const container = await getContainer(CONTAINERS.A2A_AGENTS);
      const conditions = ["c.tenantId = @tenantId"];
      const parameters: { name: string; value: unknown }[] = [{ name: "@tenantId", value: tenantId }];

      if (status && status !== "all") {
        conditions.push("c.status = @status");
        parameters.push({ name: "@status", value: status });
      } else if (!status) {
        conditions.push("c.status = 'active'");
      }

      if (search) {
        conditions.push("(CONTAINS(LOWER(c.agentCard.name), LOWER(@search)) OR CONTAINS(LOWER(c.agentCard.description), LOWER(@search)))");
        parameters.push({ name: "@search", value: search });
      }

      if (category) {
        conditions.push("c.category = @category");
        parameters.push({ name: "@category", value: category });
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
      ctx.error("listA2AAgents error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/agents/{id} ────────────────────────────────────────────

app.http("getA2AAgent", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/agents/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.A2A_AGENTS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Agent not found" } };
      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getA2AAgent error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/agents/{id}/card ───────────────────────────────────────
// Returns the agent card in standard A2A Protocol JSON format (/.well-known/agent.json compatible)

app.http("getA2AAgentCard", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/agents/{id}/card",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.A2A_AGENTS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Agent not found" } };
      return { status: 200, jsonBody: resources[0].agentCard };
    } catch (err) {
      ctx.error("getA2AAgentCard error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── PATCH /api/registry/agents/{id} ──────────────────────────────────────────

app.http("updateA2AAgent", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "registry/agents/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const body = await req.json();
      const parsed = UpdateAgentSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const container = await getContainer(CONTAINERS.A2A_AGENTS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Agent not found" } };

      const updated = { ...resources[0], ...parsed.data, id, updatedAt: new Date().toISOString() };
      const { resource } = await container.items.upsert(updated);
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("updateA2AAgent error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── DELETE /api/registry/agents/{id} ─────────────────────────────────────────

app.http("deleteA2AAgent", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "registry/agents/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.A2A_AGENTS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Agent not found" } };
      await container.item(id, resources[0].tenantId).delete();
      return { status: 204 };
    } catch (err) {
      ctx.error("deleteA2AAgent error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/agents/{id}/enable|disable ────────────────────────────

app.http("enableA2AAgent", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/agents/{id}/enable",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    return toggleAgent(req.params.id, "active");
  },
});

app.http("disableA2AAgent", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/agents/{id}/disable",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    return toggleAgent(req.params.id, "disabled");
  },
});

async function toggleAgent(id: string, status: "active" | "disabled"): Promise<HttpResponseInit> {
  const container = await getContainer(CONTAINERS.A2A_AGENTS);
  const { resources } = await container.items
    .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
    .fetchAll();
  if (!resources.length) return { status: 404, jsonBody: { error: "Agent not found" } };
  await container.items.upsert({ ...resources[0], status, updatedAt: new Date().toISOString() });
  return { status: 200, jsonBody: { id, status } };
}

// ── POST /api/registry/agents/discover ───────────────────────────────────────
// Semantic skill discovery — find agents matching a natural language task description.

app.http("discoverA2AAgents", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/agents/discover",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json()) as { query?: string; maxResults?: number; tenantId?: string };
      const query = (body.query ?? "").toLowerCase();
      const maxResults = Math.min(body.maxResults ?? 10, 50);
      const tenantId = body.tenantId ?? "default";

      const container = await getContainer(CONTAINERS.A2A_AGENTS);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = 'active'",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();

      // Rank agents by relevance to the query
      type AgentDoc = Record<string, unknown> & {
        agentCard: { name: string; description?: string; skills?: Array<{ name: string; description?: string; tags: string[]; examples: string[] }> };
        tags: string[];
      };

      const scored: { agent: AgentDoc; score: number }[] = [];

      for (const agent of resources as AgentDoc[]) {
        let score = 0;
        if (!query) { scored.push({ agent, score: 1 }); continue; }

        const name = agent.agentCard.name.toLowerCase();
        const desc = (agent.agentCard.description ?? "").toLowerCase();
        if (name.includes(query)) score += 40;
        if (desc.includes(query)) score += 20;

        // Score by skills
        for (const skill of agent.agentCard.skills ?? []) {
          const sName = skill.name.toLowerCase();
          const sDesc = (skill.description ?? "").toLowerCase();
          const sTags = skill.tags.map((t) => t.toLowerCase());
          const sExamples = skill.examples.map((e) => e.toLowerCase());

          if (sName.includes(query)) score += 30;
          if (sDesc.includes(query)) score += 15;
          if (sTags.some((t) => t.includes(query))) score += 20;
          if (sExamples.some((e) => e.includes(query))) score += 10;
        }

        // Score by agent-level tags
        for (const tag of agent.tags ?? []) {
          if (tag.toLowerCase().includes(query)) score += 15;
        }

        const words = query.split(/\s+/);
        for (const word of words) {
          if (word.length < 3) continue;
          if (name.includes(word)) score += 10;
          if (desc.includes(word)) score += 5;
        }

        if (score > 0) scored.push({ agent, score });
      }

      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, maxResults).map(({ agent, score }) => ({
        ...agent,
        relevanceScore: score,
      }));

      return { status: 200, jsonBody: { results, total: results.length, query: body.query } };
    } catch (err) {
      ctx.error("discoverA2AAgents error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
