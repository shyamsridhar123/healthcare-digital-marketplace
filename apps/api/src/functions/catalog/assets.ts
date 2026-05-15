import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

const UAP_ONBOARDING_ASSETS = [
  {
    id: "uap-onboarding-agent",
    tenantId: "default",
    name: "UAP Onboarding Agent",
    type: "Agent",
    description: "Governed onboarding agent for publishing domain agents into AI Marketplace from VS Code, GitHub Actions, CLI, or the Publisher Portal.",
    publisher: { id: "ai-marketplace-platform", name: "AI Marketplace Platform", verified: true, contactEmail: "ai-marketplace@example.com" },
    latestVersion: "1.0.0",
    versions: [{ version: "1.0.0", releasedAt: "2026-05-14", notes: "Initial onboarding agent demo release.", isLatest: true }],
    license: "Enterprise",
    deploymentModes: ["PaaS"],
    complianceTier: "Healthcare",
    tags: ["onboarding", "github", "governance", "agent"],
    domains: ["Agent Onboarding", "Governance", "Developer Productivity"],
    dependencies: [],
    evaluations: [],
    rating: 5,
    reviewCount: 1,
    deploymentCount: 1,
    status: "published",
    verified: true,
    riskNotes: "Routes domain agents through approval, provenance, scan, eval, and deployment output gates.",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
  {
    id: "uap-onboarding-vscode-skill",
    tenantId: "default",
    name: "UAP Onboarding VS Code Skill",
    type: "Connector",
    description: "Downloadable SKILL.md package for invoking /uap-onboarding in VS Code and guiding domain engineers through manifest authoring, GitHub submission, evidence gates, and activation checks.",
    publisher: { id: "ai-marketplace-platform", name: "AI Marketplace Platform", verified: true, contactEmail: "ai-marketplace@example.com" },
    latestVersion: "1.0.0",
    versions: [{ version: "1.0.0", releasedAt: "2026-05-14", notes: "VS Code/GHCP skill packaged for local install.", isLatest: true }],
    license: "Enterprise",
    deploymentModes: ["SaaS"],
    complianceTier: "Healthcare",
    tags: ["skill", "vscode", "uap-onboarding", "github"],
    domains: ["Developer Experience", "Agent Onboarding"],
    dependencies: [],
    evaluations: [],
    rating: 5,
    reviewCount: 1,
    deploymentCount: 1,
    status: "published",
    verified: true,
    riskNotes: "Installs locally as .github/skills/uap-onboarding/SKILL.md or in the user Copilot skills folder.",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
];

async function ensureMarketplaceSeeds(): Promise<void> {
  const container = await getContainer(CONTAINERS.ASSETS);
  await Promise.all(UAP_ONBOARDING_ASSETS.map(async (asset) => {
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
