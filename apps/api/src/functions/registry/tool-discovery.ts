/**
 * Tool Discovery API
 * Search and explore all tools across all registered MCP servers.
 * Supports keyword search, tag filtering, and the standard MCP tools/list
 * aggregated endpoint which concatenates tools from all active servers.
 */

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

// ── GET /api/registry/tools ───────────────────────────────────────────────────
// List all tools (with server info) across registered servers.

app.http("listTools", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/tools",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const serverId = req.query.get("serverId");
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "50", 10), 200);
      const offset = (page - 1) * pageSize;

      const toolsContainer = await getContainer(CONTAINERS.MCP_TOOLS);
      const conditions: string[] = [];
      const parameters: { name: string; value: unknown }[] = [];

      if (serverId) {
        conditions.push("c.serverId = @serverId");
        parameters.push({ name: "@serverId", value: serverId });
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const query = `SELECT * FROM c ${where} ORDER BY c.discoveredAt DESC OFFSET ${offset} LIMIT ${pageSize}`;
      const countQ = `SELECT VALUE COUNT(1) FROM c ${where}`;

      const [{ resources: tools }, { resources: countRes }] = await Promise.all([
        toolsContainer.items.query({ query, parameters }).fetchAll(),
        toolsContainer.items.query({ query: countQ, parameters }).fetchAll(),
      ]);

      // Enrich with server info
      const serversContainer = await getContainer(CONTAINERS.MCP_SERVERS);
      const serverIds = [...new Set(tools.map((t: { serverId: string }) => t.serverId))];
      const serverMap: Record<string, { name: string; status: string; rating: number }> = {};

      if (serverIds.length) {
        const srvQuery = `SELECT c.id, c.name, c.status, c.rating FROM c WHERE c.id IN (${serverIds.map((_, i) => `@sid${i}`).join(",")})`;
        const srvParams = serverIds.map((id, i) => ({ name: `@sid${i}`, value: id }));
        const { resources: srvs } = await serversContainer.items.query({ query: srvQuery, parameters: srvParams }).fetchAll();
        for (const s of srvs) serverMap[s.id] = s;
      }

      const enriched = tools.map((t: Record<string, unknown>) => ({
        ...t,
        server: serverMap[t.serverId as string] ?? null,
      }));

      return { status: 200, jsonBody: { items: enriched, total: countRes[0] ?? 0, page, pageSize } };
    } catch (err) {
      ctx.error("listTools error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/tools/search ──────────────────────────────────────────
// Semantic-style keyword search across tool names, descriptions, and schemas.
// Returns relevance-ranked results with score.

app.http("searchTools", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/tools/search",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json()) as {
        query?: string;
        tags?: string[];
        serverId?: string;
        maxResults?: number;
      };

      const searchQuery = (body.query ?? "").toLowerCase().trim();
      const maxResults = Math.min(body.maxResults ?? 20, 100);

      const toolsContainer = await getContainer(CONTAINERS.MCP_TOOLS);
      const conditions: string[] = [];
      const parameters: { name: string; value: unknown }[] = [];

      if (body.serverId) {
        conditions.push("c.serverId = @serverId");
        parameters.push({ name: "@serverId", value: body.serverId });
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const { resources: allTools } = await toolsContainer.items
        .query({ query: `SELECT * FROM c ${where}`, parameters })
        .fetchAll();

      // Client-side ranking (no vector DB required — straightforward keyword scoring)
      type ToolItem = Record<string, unknown> & { name: string; description?: string };
      const scored: Array<{ tool: ToolItem; score: number }> = [];

      for (const tool of allTools as ToolItem[]) {
        let score = 0;
        const name = (tool.name ?? "").toLowerCase();
        const desc = (tool.description ?? "").toLowerCase();
        const schemaStr = JSON.stringify(tool.inputSchema ?? "").toLowerCase();

        if (searchQuery) {
          if (name === searchQuery) score += 100;
          else if (name.startsWith(searchQuery)) score += 60;
          else if (name.includes(searchQuery)) score += 30;
          if (desc.includes(searchQuery)) score += 20;
          if (schemaStr.includes(searchQuery)) score += 5;

          // Partial word matching
          const words = searchQuery.split(/\s+/);
          for (const word of words) {
            if (word.length < 2) continue;
            if (name.includes(word)) score += 10;
            if (desc.includes(word)) score += 5;
          }
        } else {
          score = 1; // no query = return all
        }

        // Tag filter
        if (body.tags?.length) {
          const toolTags: string[] = (tool.tags as string[]) ?? [];
          const matched = body.tags.filter((t) => toolTags.includes(t)).length;
          if (matched === 0) continue;
          score += matched * 15;
        }

        if (score > 0) scored.push({ tool, score });
      }

      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, maxResults).map(({ tool, score }) => ({ ...tool, relevanceScore: score }));

      return { status: 200, jsonBody: { results, total: results.length, query: body.query } };
    } catch (err) {
      ctx.error("searchTools error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/tools/list ──────────────────────────────────────────────
// MCP-format aggregated tools/list from ALL active servers.
// Compatible with MCP clients that need a single aggregated tool registry endpoint.

app.http("aggregatedToolsList", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "registry/tools/list",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const toolsContainer = await getContainer(CONTAINERS.MCP_TOOLS);
      const serversContainer = await getContainer(CONTAINERS.MCP_SERVERS);

      // Only tools from active servers in this tenant
      const { resources: activeServers } = await serversContainer.items
        .query({
          query: "SELECT c.id FROM c WHERE c.tenantId = @tenantId AND c.status = 'active'",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();

      if (!activeServers.length) {
        return { status: 200, jsonBody: { jsonrpc: "2.0", id: 1, result: { tools: [] } } };
      }

      const serverIds = activeServers.map((s: { id: string }) => s.id);
      const inClause = serverIds.map((_: unknown, i: number) => `@sid${i}`).join(",");
      const srvParams = serverIds.map((id: string, i: number) => ({ name: `@sid${i}`, value: id }));

      const { resources: tools } = await toolsContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.serverId IN (${inClause})`,
          parameters: srvParams,
        })
        .fetchAll();

      // Format as MCP tools/list result, with virtual routing prefix
      const mcpTools = tools.map((t: Record<string, unknown>) => ({
        name: t.name,
        description: t.description || "",
        inputSchema: t.inputSchema || { type: "object", properties: {} },
        annotations: {
          serverId: t.serverId,
          virtualName: `${t.serverId}::${t.name}`,
        },
      }));

      return {
        status: 200,
        jsonBody: {
          jsonrpc: "2.0",
          id: 1,
          result: { tools: mcpTools },
        },
      };
    } catch (err) {
      ctx.error("aggregatedToolsList error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/tools/{toolId} ──────────────────────────────────────────

app.http("getTool", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/tools/{toolId}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { toolId } = req.params;
    try {
      const toolsContainer = await getContainer(CONTAINERS.MCP_TOOLS);
      const { resources } = await toolsContainer.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: toolId }] })
        .fetchAll();

      if (!resources.length) return { status: 404, jsonBody: { error: "Tool not found" } };

      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getTool error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
