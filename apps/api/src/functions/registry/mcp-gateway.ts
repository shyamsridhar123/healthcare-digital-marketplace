/**
 * MCP Gateway Proxy
 * Forwards MCP JSON-RPC 2.0 messages (tools/list, tools/call, resources/read,
 * prompts/get, initialize) to registered backend MCP servers. Performs
 * auth injection, TTL caching for tools/list, and writes audit log entries
 * for every tools/call invocation.
 *
 * Virtual servers aggregate tools from multiple backend servers, with routing
 * determined by tool name prefix "serverName::toolName".
 */

import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

// ── In-memory LRU cache for tools/list responses ─────────────────────────────

const toolsListCache = new Map<string, { data: unknown; expiresAt: number }>();
const TOOLS_LIST_TTL_MS = 60_000; // 60 s

function getCachedToolsList(serverId: string): unknown | null {
  const entry = toolsListCache.get(serverId);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  toolsListCache.delete(serverId);
  return null;
}

function setCachedToolsList(serverId: string, data: unknown): void {
  toolsListCache.set(serverId, { data, expiresAt: Date.now() + TOOLS_LIST_TTL_MS });
}

// ── Resolve server record from Cosmos ────────────────────────────────────────

async function resolveServer(serverId: string): Promise<Record<string, unknown> | null> {
  const container = await getContainer(CONTAINERS.MCP_SERVERS);
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.status = 'active'",
      parameters: [{ name: "@id", value: serverId }],
    })
    .fetchAll();
  return resources[0] ?? null;
}

// ── Build Authorization header based on authScheme ───────────────────────────

function buildAuthHeaders(server: Record<string, unknown>): Record<string, string> {
  const scheme = server.authScheme as string;
  const config = (server.authConfig ?? {}) as Record<string, string>;
  if (scheme === "bearer") return { Authorization: `Bearer ${config.token ?? ""}` };
  if (scheme === "api-key") return { [config.headerName ?? "X-API-Key"]: config.key ?? "" };
  return {};
}

// ── Generic proxy helper ──────────────────────────────────────────────────────

async function proxyMcpRequest(
  server: Record<string, unknown>,
  method: string,
  params: unknown,
  requestId: number | string | null = 1
): Promise<Response> {
  const endpointUrl = server.endpointUrl as string;
  const authHeaders = buildAuthHeaders(server);

  const body = JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params });

  return fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...authHeaders,
    },
    body,
  });
}

// ── Write audit log for tool invocations ─────────────────────────────────────

async function auditToolCall(
  serverId: string,
  toolName: string,
  tenantId: string,
  durationMs: number,
  success: boolean
): Promise<void> {
  try {
    const c = await getContainer(CONTAINERS.AUDIT_LOG);
    await c.items.create({
      id: uuidv4(),
      action: "mcp.tools.call",
      targetId: serverId,
      targetType: "mcp-server",
      tenantId,
      toolName,
      durationMs,
      success,
      timestamp: new Date().toISOString(),
    });
  } catch { /* fire-and-forget */ }
}

// ── POST /api/mcp-gateway/{serverId}/tools/list ───────────────────────────────

app.http("mcpGatewayToolsList", {
  methods: ["POST", "GET"],
  authLevel: "anonymous",
  route: "mcp-gateway/{serverId}/tools/list",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const cached = getCachedToolsList(serverId);
      if (cached) return { status: 200, jsonBody: cached };

      const server = await resolveServer(serverId);
      if (!server) return { status: 404, jsonBody: { error: "Server not found or disabled" } };

      const resp = await proxyMcpRequest(server, "tools/list", {});
      if (!resp.ok) {
        return { status: 502, jsonBody: { error: "Bad gateway", upstream: resp.status } };
      }

      const data = await resp.json();
      setCachedToolsList(serverId, data);

      // Persist tool inventory to Cosmos for discovery
      const tools: Array<{ name: string; description?: string; inputSchema?: unknown }> =
        (data as { result?: { tools?: Array<{ name: string; description?: string; inputSchema?: unknown }> } })?.result?.tools ?? [];
      if (tools.length) {
        const toolsContainer = await getContainer(CONTAINERS.MCP_TOOLS);
        await Promise.all(
          tools.map((t) =>
            toolsContainer.items.upsert({
              id: `${serverId}::${t.name}`,
              serverId,
              name: t.name,
              description: t.description ?? "",
              inputSchema: t.inputSchema ?? {},
              discoveredAt: new Date().toISOString(),
            })
          )
        );
      }

      return { status: 200, jsonBody: data };
    } catch (err) {
      ctx.error("mcpGatewayToolsList error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/mcp-gateway/{serverId}/tools/call ───────────────────────────────

app.http("mcpGatewayToolsCall", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mcp-gateway/{serverId}/tools/call",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const body = (await req.json()) as { name?: string; arguments?: unknown; id?: number | string };
      if (!body.name) {
        return { status: 400, jsonBody: { error: "Tool name is required" } };
      }

      const server = await resolveServer(serverId);
      if (!server) return { status: 404, jsonBody: { error: "Server not found or disabled" } };

      const start = Date.now();
      const resp = await proxyMcpRequest(server, "tools/call", { name: body.name, arguments: body.arguments ?? {} }, body.id ?? 1);
      const durationMs = Date.now() - start;

      let data: unknown;
      const contentType = resp.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        // SSE transport: read stream and collect result events
        const text = await resp.text();
        data = { result: { _raw: text } };
      } else {
        data = await resp.json();
      }

      const success = resp.ok;
      await auditToolCall(serverId, body.name, (server.tenantId as string) ?? "default", durationMs, success);

      if (!resp.ok) {
        return { status: 502, jsonBody: { error: "Upstream error", data } };
      }
      return { status: 200, jsonBody: data };
    } catch (err) {
      ctx.error("mcpGatewayToolsCall error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/mcp-gateway/{serverId}/resources/read ──────────────────────────

app.http("mcpGatewayResourcesRead", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mcp-gateway/{serverId}/resources/read",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const body = (await req.json()) as { uri?: string; id?: number | string };
      const server = await resolveServer(serverId);
      if (!server) return { status: 404, jsonBody: { error: "Server not found or disabled" } };

      const resp = await proxyMcpRequest(server, "resources/read", { uri: body.uri }, body.id ?? 1);
      if (!resp.ok) return { status: 502, jsonBody: { error: "Bad gateway", upstream: resp.status } };

      return { status: 200, jsonBody: await resp.json() };
    } catch (err) {
      ctx.error("mcpGatewayResourcesRead error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/mcp-gateway/{serverId}/resources/list ──────────────────────────

app.http("mcpGatewayResourcesList", {
  methods: ["POST", "GET"],
  authLevel: "anonymous",
  route: "mcp-gateway/{serverId}/resources/list",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const server = await resolveServer(serverId);
      if (!server) return { status: 404, jsonBody: { error: "Server not found or disabled" } };

      const resp = await proxyMcpRequest(server, "resources/list", {});
      if (!resp.ok) return { status: 502, jsonBody: { error: "Bad gateway", upstream: resp.status } };
      return { status: 200, jsonBody: await resp.json() };
    } catch (err) {
      ctx.error("mcpGatewayResourcesList error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/mcp-gateway/{serverId}/prompts/get ──────────────────────────────

app.http("mcpGatewayPromptsGet", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mcp-gateway/{serverId}/prompts/get",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const body = (await req.json()) as { name?: string; arguments?: unknown };
      const server = await resolveServer(serverId);
      if (!server) return { status: 404, jsonBody: { error: "Server not found or disabled" } };

      const resp = await proxyMcpRequest(server, "prompts/get", { name: body.name, arguments: body.arguments ?? {} });
      if (!resp.ok) return { status: 502, jsonBody: { error: "Bad gateway", upstream: resp.status } };
      return { status: 200, jsonBody: await resp.json() };
    } catch (err) {
      ctx.error("mcpGatewayPromptsGet error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/mcp-gateway/{serverId}/initialize ───────────────────────────────

app.http("mcpGatewayInitialize", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mcp-gateway/{serverId}/initialize",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    try {
      const body = await req.json();
      const server = await resolveServer(serverId);
      if (!server) return { status: 404, jsonBody: { error: "Server not found or disabled" } };

      const resp = await proxyMcpRequest(server, "initialize", body);
      if (!resp.ok) return { status: 502, jsonBody: { error: "Bad gateway", upstream: resp.status } };
      return { status: 200, jsonBody: await resp.json() };
    } catch (err) {
      ctx.error("mcpGatewayInitialize error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/mcp-gateway/virtual/{virtualId}/tools/call ──────────────────────
// Virtual servers: aggregate tools from multiple backend servers.
// Tool names follow the "serverName::toolName" routing convention.

app.http("mcpGatewayVirtualToolsCall", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mcp-gateway/virtual/{virtualId}/tools/call",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { virtualId } = req.params;
    try {
      const body = (await req.json()) as { name?: string; arguments?: unknown };
      if (!body.name) return { status: 400, jsonBody: { error: "Tool name is required" } };

      const parts = body.name.split("::");
      if (parts.length < 2) {
        return { status: 400, jsonBody: { error: "Virtual tool name must be 'serverName::toolName'" } };
      }

      const [serverName, toolName] = [parts[0], parts.slice(1).join("::")];

      // Look up server by name
      const container = await getContainer(CONTAINERS.MCP_SERVERS);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.name = @name AND c.status = 'active'",
          parameters: [{ name: "@name", value: serverName }],
        })
        .fetchAll();

      if (!resources.length) {
        return { status: 404, jsonBody: { error: `Server '${serverName}' not found or disabled` } };
      }

      const server = resources[0];
      const start = Date.now();
      const resp = await proxyMcpRequest(server, "tools/call", { name: toolName, arguments: body.arguments ?? {} });
      const durationMs = Date.now() - start;

      await auditToolCall(server.id, toolName, server.tenantId ?? "default", durationMs, resp.ok);

      if (!resp.ok) return { status: 502, jsonBody: { error: "Upstream error", upstream: resp.status } };
      return { status: 200, jsonBody: await resp.json() };
    } catch (err) {
      ctx.error("mcpGatewayVirtualToolsCall error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/mcp-gateway/{serverId}/tools/list/invalidate ───────────────────
// Manually purge cached tools/list for a server

app.http("mcpGatewayInvalidateCache", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mcp-gateway/{serverId}/tools/list/invalidate",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { serverId } = req.params;
    toolsListCache.delete(serverId);
    return { status: 200, jsonBody: { serverId, message: "Cache invalidated" } };
  },
});
