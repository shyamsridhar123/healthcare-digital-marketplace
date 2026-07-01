import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

const NEBULA_X_ONBOARDING_ASSETS = [
  {
    id: "ledgersentinel-agent",
    tenantId: "default",
    name: "LedgerSentinel",
    type: "Agent",
    description: "Audit analytics agent that tests ERP journal entries for unusual patterns, segregation-of-duties concerns, and period-end exceptions.",
    publisher: { id: "deloitte-audit", name: "Deloitte Audit", verified: true, contactEmail: "nebula-x@example.com" },
    latestVersion: "2.0.0",
    versions: [{ version: "2.0.0", releasedAt: "2026-05-14", notes: "Nebula-X professional services catalog release.", isLatest: true }],
    license: "Enterprise",
    deploymentModes: ["PaaS"],
    complianceTier: "Professional Services",
    tags: ["audit", "erp", "journal-testing", "governance"],
    domains: ["Audit", "Risk", "Financial Controls"],
    dependencies: [],
    evaluations: [],
    rating: 5,
    reviewCount: 18,
    deploymentCount: 42,
    status: "published",
    verified: true,
    riskNotes: "Uses synthetic ERP ledgers and engagement-confidential controls evidence with approval gates.",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
  {
    id: "auditscribe-agent",
    tenantId: "default",
    name: "AuditScribe",
    type: "Agent",
    description: "Generates audit workpaper summaries, evidence request lists, and finding narratives from approved engagement documentation.",
    publisher: { id: "deloitte-audit", name: "Deloitte Audit", verified: true, contactEmail: "nebula-x@example.com" },
    latestVersion: "2.0.0",
    versions: [{ version: "2.0.0", releasedAt: "2026-05-14", notes: "Professional services workpaper automation release.", isLatest: true }],
    license: "Enterprise",
    deploymentModes: ["SaaS"],
    complianceTier: "Professional Services",
    tags: ["audit", "workpapers", "evidence", "summarization"],
    domains: ["Audit", "Assurance"],
    dependencies: [],
    evaluations: [],
    rating: 5,
    reviewCount: 22,
    deploymentCount: 37,
    status: "published",
    verified: true,
    riskNotes: "Summaries retain source traceability and require reviewer approval before release.",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
  {
    id: "taxarchitect-agent",
    tenantId: "default",
    name: "TaxArchitect",
    type: "Agent",
    description: "Tax provision and GloBE planning agent for entity classification, adjustment workflows, and jurisdictional review packs.",
    publisher: { id: "deloitte-tax", name: "Deloitte Tax", verified: true, contactEmail: "nebula-x@example.com" },
    latestVersion: "2.0.0",
    versions: [{ version: "2.0.0", releasedAt: "2026-05-14", notes: "Tax advisory accelerator release.", isLatest: true }],
    license: "Enterprise",
    deploymentModes: ["PaaS"],
    complianceTier: "Professional Services",
    tags: ["tax", "globe", "provision", "classification"],
    domains: ["Tax", "Compliance"],
    dependencies: [],
    evaluations: [],
    rating: 5,
    reviewCount: 15,
    deploymentCount: 29,
    status: "published",
    verified: true,
    riskNotes: "Requires Deloitte Tax reviewer approval for jurisdiction-specific guidance.",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
  {
    id: "controltester-agent",
    tenantId: "default",
    name: "ControlTester",
    type: "Agent",
    description: "SOX and internal-controls testing agent that maps control objectives to samples, evidence, exceptions, and remediation owners.",
    publisher: { id: "deloitte-risk", name: "Deloitte Risk", verified: true, contactEmail: "nebula-x@example.com" },
    latestVersion: "2.0.0",
    versions: [{ version: "2.0.0", releasedAt: "2026-05-14", notes: "Controls testing workflow release.", isLatest: true }],
    license: "Enterprise",
    deploymentModes: ["SaaS"],
    complianceTier: "Professional Services",
    tags: ["risk", "sox", "controls", "testing"],
    domains: ["Risk", "Controls", "Compliance"],
    dependencies: [],
    evaluations: [],
    rating: 5,
    reviewCount: 19,
    deploymentCount: 33,
    status: "published",
    verified: true,
    riskNotes: "Routes exceptions through reviewer, manager, and partner approval workflow gates.",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
];

async function ensureMarketplaceSeeds(): Promise<void> {
  const container = await getContainer(CONTAINERS.ASSETS);
  await Promise.all(NEBULA_X_ONBOARDING_ASSETS.map(async (asset) => {
    const { resource } = await container.item(asset.id, asset.tenantId).read();
    if (!resource) await container.items.create(asset);
  }));
}

// GET /api/assets — list/search assets with optional filters
app.http("getAssets", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "assets",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const { search, type, complianceTier, deploymentMode, tags } = Object.fromEntries(
        req.query.entries()
      );
      const page = parseInt(req.query.get("page") ?? "1", 10);
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "24", 10), 100);
      const offset = (page - 1) * pageSize;

      const container = await getContainer(CONTAINERS.ASSETS);
      await ensureMarketplaceSeeds();

      // Build dynamic query
      const conditions: string[] = ["c.status = 'published'"];
      const parameters: { name: string; value: string }[] = [];

      if (type) {
        conditions.push("c.type = @type");
        parameters.push({ name: "@type", value: type });
      }
      if (complianceTier && complianceTier !== "all") {
        conditions.push("c.complianceTier = @complianceTier");
        parameters.push({ name: "@complianceTier", value: complianceTier });
      }
      if (deploymentMode && deploymentMode !== "all") {
        conditions.push("ARRAY_CONTAINS(c.deploymentModes, @deploymentMode)");
        parameters.push({ name: "@deploymentMode", value: deploymentMode });
      }
      if (search) {
        conditions.push("(CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.description), LOWER(@search)))");
        parameters.push({ name: "@search", value: search });
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const query = `SELECT * FROM c ${where} ORDER BY c.deploymentCount DESC OFFSET ${offset} LIMIT ${pageSize}`;
      const countQuery = `SELECT VALUE COUNT(1) FROM c ${where}`;

      const [{ resources: items }, { resources: countResult }] = await Promise.all([
        container.items.query({ query, parameters }).fetchAll(),
        container.items.query({ query: countQuery, parameters }).fetchAll(),
      ]);
      const total = typeof countResult[0] === "number" ? countResult[0] : items.length;

      return {
        status: 200,
        jsonBody: {
          items,
          total,
          page,
          pageSize,
        },
      };
    } catch (err) {
      ctx.error("getAssets error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// GET /api/assets/{id} — get single asset
app.http("getAsset", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "assets/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const container = await getContainer(CONTAINERS.ASSETS);
      await ensureMarketplaceSeeds();
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();

      if (!resources.length) return { status: 404, jsonBody: { error: "Asset not found" } };
      return { status: 200, jsonBody: resources[0] };
    } catch (err) {
      ctx.error("getAsset error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
