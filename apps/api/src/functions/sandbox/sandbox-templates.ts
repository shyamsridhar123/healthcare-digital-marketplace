import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

// ─── Seed data for sandbox templates ─────────────────────────────────────────

const SEED_TEMPLATES = [
  {
    id: "aml-personal-standard-v1",
    name: "Personal Data Science Workspace",
    description:
      "Individual workspace for notebook exploration and model training on approved low-risk datasets.",
    sandboxType: "personal",
    computeProfiles: ["cpu-small", "cpu-medium"],
    defaultComputeProfile: "cpu-small",
    defaultDurationDays: 14,
    maxDurationDays: 30,
    policyProfile: "standard",
    requiresApproval: false,
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "aml-team-standard-v1",
    name: "Team Collaboration Workspace",
    description:
      "Shared workspace for data science squads with shared compute cluster and collaborative notebooks.",
    sandboxType: "team",
    computeProfiles: ["cpu-small", "cpu-medium", "gpu-small"],
    defaultComputeProfile: "cpu-medium",
    defaultDurationDays: 30,
    maxDurationDays: 90,
    policyProfile: "standard",
    requiresApproval: true,
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "aml-restricted-phi-v1",
    name: "Restricted PHI Workspace",
    description:
      "Isolated workspace for PHI and sensitive datasets with stricter network controls and mandatory approval.",
    sandboxType: "restricted",
    computeProfiles: ["cpu-small", "cpu-medium"],
    defaultComputeProfile: "cpu-medium",
    defaultDurationDays: 14,
    maxDurationDays: 30,
    policyProfile: "restricted",
    requiresApproval: true,
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

async function ensureSeeded(tenantId: string) {
  const container = await getContainer(CONTAINERS.SANDBOX_TEMPLATES);
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
      parameters: [{ name: "@tenantId", value: tenantId }],
    })
    .fetchAll();
  if (resources.length === 0) {
    for (const tpl of SEED_TEMPLATES) {
      await container.items.upsert({ ...tpl, tenantId });
    }
  }
}

// GET /api/sandbox-templates
app.http("listSandboxTemplates", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sandbox-templates",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      await ensureSeeded(tenantId);
      const container = await getContainer(CONTAINERS.SANDBOX_TEMPLATES);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();
      return { status: 200, jsonBody: { items: resources, total: resources.length } };
    } catch (err) {
      ctx.error("listSandboxTemplates error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// GET /api/sandbox-templates/{id}
app.http("getSandboxTemplate", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sandbox-templates/{id}",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      await ensureSeeded(tenantId);
      const container = await getContainer(CONTAINERS.SANDBOX_TEMPLATES);
      const { resource } = await container.item(id).read();
      if (!resource) {
        return { status: 404, jsonBody: { error: "Template not found" } };
      }
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("getSandboxTemplate error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
