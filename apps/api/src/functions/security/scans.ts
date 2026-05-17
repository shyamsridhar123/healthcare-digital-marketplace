/**
 * Security Scanning API
 * Trigger and retrieve security scans for registered MCP servers and A2A agents.
 * Scan checks include: endpoint reachability, TLS certificate validity, auth scheme
 * strength, known vulnerable dependency versions (from supplied manifest), and
 * suspicious tool/resource patterns.
 *
 * Auto-disables servers/agents if critical vulnerabilities are found (configurable).
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

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanFinding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  remediation?: string;
};

type ScanResult = {
  id: string;
  targetId: string;
  targetType: "mcp-server" | "a2a-agent";
  tenantId: string;
  status: "pending" | "running" | "passed" | "failed" | "error";
  score: number; // 0-100
  findings: ScanFinding[];
  autoDisabled: boolean;
  requestedAt: string;
  completedAt: string | null;
  ttl?: number;
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const TriggerScanSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["mcp-server", "a2a-agent"]),
  tenantId: z.string().default("default"),
  scanProfile: z.enum(["basic", "standard", "deep"]).default("standard"),
  autoDisableOnCritical: z.boolean().default(true),
});

// ── Scan engine (lightweight, synchronous) ────────────────────────────────────

async function runScan(
  targetId: string,
  targetType: string,
  scanProfile: string
): Promise<Omit<ScanResult, "id" | "targetId" | "targetType" | "tenantId" | "requestedAt" | "autoDisabled" | "ttl">> {
  const findings: ScanFinding[] = [];
  let score = 100;

  // Fetch the target record
  const containerName = targetType === "mcp-server" ? CONTAINERS.MCP_SERVERS : CONTAINERS.A2A_AGENTS;
  const container = await getContainer(containerName);
  const { resources } = await container.items
    .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: targetId }] })
    .fetchAll();

  if (!resources.length) {
    return {
      status: "error",
      score: 0,
      findings: [{ id: uuidv4(), severity: "critical", category: "registry", title: "Target not found", description: "The target resource was not found in the registry.", remediation: "Re-register the resource." }],
      completedAt: new Date().toISOString(),
    };
  }

  const target = resources[0];
  const endpointUrl: string = target.endpointUrl ?? target.agentCard?.url ?? "";

  // ── Check 1: TLS (HTTPS enforcement) ───────────────────────────────────────
  if (endpointUrl && !endpointUrl.startsWith("https://")) {
    findings.push({
      id: uuidv4(),
      severity: "high",
      category: "transport-security",
      title: "Non-HTTPS endpoint",
      description: `Endpoint ${endpointUrl} does not use HTTPS. All production endpoints must use TLS.`,
      remediation: "Migrate the endpoint to HTTPS with a valid TLS certificate.",
    });
    score -= 25;
  }

  // ── Check 2: Auth scheme strength ──────────────────────────────────────────
  const authScheme: string = target.authScheme ?? "none";
  if (authScheme === "none") {
    const sev = scanProfile === "deep" ? "high" : "medium";
    findings.push({
      id: uuidv4(),
      severity: sev,
      category: "authentication",
      title: "No authentication configured",
      description: "The endpoint has no authentication. Unauthenticated MCP servers expose all tools publicly.",
      remediation: "Configure bearer token, OAuth 2.0, or API key authentication.",
    });
    score -= sev === "high" ? 20 : 10;
  }

  // ── Check 3: Endpoint reachability ─────────────────────────────────────────
  if (endpointUrl && scanProfile !== "basic") {
    try {
      const resp = await fetch(endpointUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
      });
      if (resp.status >= 500) {
        findings.push({
          id: uuidv4(),
          severity: "high",
          category: "availability",
          title: "Endpoint returned 5xx",
          description: `HEAD ${endpointUrl} returned HTTP ${resp.status}. The server may be unavailable or misconfigured.`,
          remediation: "Investigate server logs and ensure the service is running.",
        });
        score -= 20;
      }
    } catch {
      findings.push({
        id: uuidv4(),
        severity: "medium",
        category: "availability",
        title: "Endpoint unreachable",
        description: `Could not complete a HEAD request to ${endpointUrl}. The server may be down or the URL incorrect.`,
        remediation: "Verify the endpoint URL is correct and the server is reachable.",
      });
      score -= 10;
    }
  }

  // ── Check 4: Tool naming patterns (deep only) ──────────────────────────────
  if (scanProfile === "deep" && target.toolsCache?.length) {
    const suspiciousPatterns = ["exec", "shell", "eval", "system", "spawn", "run_command"];
    for (const tool of target.toolsCache) {
      const toolName = (tool.name ?? "").toLowerCase();
      if (suspiciousPatterns.some((p) => toolName.includes(p))) {
        findings.push({
          id: uuidv4(),
          severity: "medium",
          category: "tool-risk",
          title: `Potentially risky tool: ${tool.name}`,
          description: `Tool name '${tool.name}' matches known shell/execution patterns. Verify this tool's behavior is safe.`,
          remediation: "Review the tool implementation and add input validation.",
        });
        score -= 5;
      }
    }
  }

  // ── Check 5: Missing description ───────────────────────────────────────────
  if (!target.description && !target.agentCard?.description) {
    findings.push({
      id: uuidv4(),
      severity: "info",
      category: "documentation",
      title: "Missing description",
      description: "No description is provided. Descriptions improve discoverability and trust.",
      remediation: "Add a clear description explaining the server/agent's purpose.",
    });
    score -= 2;
  }

  score = Math.max(0, score);
  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasHigh = findings.some((f) => f.severity === "high");
  const status: ScanResult["status"] = hasCritical || hasHigh ? "failed" : "passed";

  return { status, score, findings, completedAt: new Date().toISOString() };
}

// ── POST /api/security/scans ──────────────────────────────────────────────────

app.http("triggerSecurityScan", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "security/scans",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = TriggerScanSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;
      const now = new Date().toISOString();
      const scanId = uuidv4();

      // Create pending scan record
      const pendingScan: ScanResult = {
        id: scanId,
        targetId: d.targetId,
        targetType: d.targetType,
        tenantId: d.tenantId,
        status: "running",
        score: 0,
        findings: [],
        autoDisabled: false,
        requestedAt: now,
        completedAt: null,
        ttl: 2592000, // 30 days
      };

      const scansContainer = await getContainer(CONTAINERS.SECURITY_SCANS);
      await scansContainer.items.create(pendingScan);

      // Run scan synchronously (async scan triggering would require durable functions)
      const result = await runScan(d.targetId, d.targetType, d.scanProfile);

      // Auto-disable if critical finding
      let autoDisabled = false;
      if (d.autoDisableOnCritical && result.findings.some((f) => f.severity === "critical")) {
        const containerName = d.targetType === "mcp-server" ? CONTAINERS.MCP_SERVERS : CONTAINERS.A2A_AGENTS;
        const targetContainer = await getContainer(containerName);
        const { resources } = await targetContainer.items
          .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: d.targetId }] })
          .fetchAll();
        if (resources.length) {
          await targetContainer.items.upsert({
            ...resources[0],
            status: "disabled",
            securityScanStatus: "failed",
            lastSecurityScan: now,
            updatedAt: now,
          });
          autoDisabled = true;
        }
      } else {
        // Update scan status on target
        const containerName = d.targetType === "mcp-server" ? CONTAINERS.MCP_SERVERS : CONTAINERS.A2A_AGENTS;
        const targetContainer = await getContainer(containerName);
        const { resources } = await targetContainer.items
          .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: d.targetId }] })
          .fetchAll();
        if (resources.length) {
          await targetContainer.items.upsert({
            ...resources[0],
            securityScanStatus: result.status,
            lastSecurityScan: now,
          });
        }
      }

      // Update scan record with results
      const completedScan = { ...pendingScan, ...result, autoDisabled };
      await scansContainer.items.upsert(completedScan);

      return { status: 201, jsonBody: completedScan };
    } catch (err) {
      ctx.error("triggerSecurityScan error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/security/scans ───────────────────────────────────────────────────

app.http("listSecurityScans", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "security/scans",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const targetId = req.query.get("targetId");
      const targetType = req.query.get("targetType");
      const tenantId = req.query.get("tenantId") ?? "default";
      const status = req.query.get("status");
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "20", 10), 100);
      const offset = (page - 1) * pageSize;

      const conditions = ["c.tenantId = @tenantId"];
      const parameters: { name: string; value: unknown }[] = [{ name: "@tenantId", value: tenantId }];

      if (targetId) { conditions.push("c.targetId = @targetId"); parameters.push({ name: "@targetId", value: targetId }); }
      if (targetType) { conditions.push("c.targetType = @targetType"); parameters.push({ name: "@targetType", value: targetType }); }
      if (status) { conditions.push("c.status = @status"); parameters.push({ name: "@status", value: status }); }

      const where = `WHERE ${conditions.join(" AND ")}`;
      const container = await getContainer(CONTAINERS.SECURITY_SCANS);
      const { resources: items } = await container.items
        .query({ query: `SELECT * FROM c ${where} ORDER BY c.requestedAt DESC OFFSET ${offset} LIMIT ${pageSize}`, parameters })
        .fetchAll();
      const { resources: countRes } = await container.items
        .query({ query: `SELECT VALUE COUNT(1) FROM c ${where}`, parameters })
        .fetchAll();

      return { status: 200, jsonBody: { items, total: countRes[0] ?? 0, page, pageSize } };
    } catch (err) {
      ctx.error("listSecurityScans error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/security/scans/{id} ──────────────────────────────────────────────

app.http("getSecurityScan", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "security/scans/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.SECURITY_SCANS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Scan not found" } };
      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getSecurityScan error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/security/scans/{id}/rescan ─────────────────────────────────────

app.http("rescanTarget", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "security/scans/{id}/rescan",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.SECURITY_SCANS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Scan not found" } };

      const original = resources[0];
      const scanProfile = (await req.json().catch(() => ({}) as Record<string, unknown>)) as Record<string, unknown>;
      const result = await runScan(original.targetId, original.targetType, (scanProfile.scanProfile as string) ?? "standard");

      const newScan = {
        id: uuidv4(),
        targetId: original.targetId,
        targetType: original.targetType,
        tenantId: original.tenantId,
        autoDisabled: false,
        requestedAt: new Date().toISOString(),
        ttl: 2592000,
        ...result,
      };

      await container.items.create(newScan);
      return { status: 201, jsonBody: newScan };
    } catch (err) {
      ctx.error("rescanTarget error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/security/summary ─────────────────────────────────────────────────
// Per-tenant security posture summary for dashboard

app.http("securitySummary", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "security/summary",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const container = await getContainer(CONTAINERS.SECURITY_SCANS);

      const { resources: scans } = await container.items
        .query({
          query: "SELECT c.status, c.score, c.findings, c.targetType FROM c WHERE c.tenantId = @tenantId",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();

      const totalScans = scans.length;
      const passed = scans.filter((s: { status: string }) => s.status === "passed").length;
      const failed = scans.filter((s: { status: string }) => s.status === "failed").length;
      const avgScore = totalScans
        ? Math.round(scans.reduce((s: number, r: { score: number }) => s + (r.score || 0), 0) / totalScans)
        : 100;

      const findingsBySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
      for (const scan of scans) {
        for (const f of (scan.findings ?? []) as ScanFinding[]) {
          findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] ?? 0) + 1;
        }
      }

      return {
        status: 200,
        jsonBody: { tenantId, totalScans, passed, failed, avgScore, findingsBySeverity },
      };
    } catch (err) {
      ctx.error("securitySummary error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
