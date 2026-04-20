import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

// ─── Seed data for approved data packages ────────────────────────────────────

const SEED_PACKAGES = [
  {
    id: "claims_training",
    dataPackageId: "claims_training",
    version: "12",
    displayName: "Claims Training Dataset",
    description:
      "De-identified claims records for RCM model training. Includes diagnosis codes, procedure codes, and payer info.",
    classification: "internal",
    amlDataAsset: { name: "claims_training", version: "12" },
    allowedSandboxTypes: ["personal", "team"],
    approvalPolicy: "auto-approve",
    starterNotebook: "notebooks/claims_baseline_train.ipynb",
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "denials_gold",
    dataPackageId: "denials_gold",
    version: "4",
    displayName: "Denials Gold Dataset",
    description:
      "Curated denial reason codes and appeal outcomes for denial prediction models.",
    classification: "internal",
    amlDataAsset: { name: "denials_gold", version: "4" },
    allowedSandboxTypes: ["personal", "team"],
    approvalPolicy: "standard-review",
    starterNotebook: "notebooks/denials_prediction_baseline.ipynb",
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "clinical_notes_phi",
    dataPackageId: "clinical_notes_phi",
    version: "3",
    displayName: "Clinical Notes (PHI)",
    description:
      "Raw clinical notes for NLP and NER model development. PHI content — restricted access only.",
    classification: "phi",
    amlDataAsset: { name: "clinical_notes_phi", version: "3" },
    allowedSandboxTypes: ["restricted"],
    approvalPolicy: "restricted-review",
    starterNotebook: "notebooks/clinical_ner_starter.ipynb",
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

async function ensureSeeded(tenantId: string) {
  const container = await getContainer(CONTAINERS.DATA_PACKAGES);
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
      parameters: [{ name: "@tenantId", value: tenantId }],
    })
    .fetchAll();
  if (resources.length === 0) {
    for (const pkg of SEED_PACKAGES) {
      await container.items.upsert({ ...pkg, tenantId });
    }
  }
}

// GET /api/data-packages
app.http("listDataPackages", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "data-packages",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const sandboxType = req.query.get("sandboxType");
      await ensureSeeded(tenantId);
      const container = await getContainer(CONTAINERS.DATA_PACKAGES);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();
      const filtered = sandboxType
        ? resources.filter((p: any) =>
            p.allowedSandboxTypes?.includes(sandboxType)
          )
        : resources;
      return { status: 200, jsonBody: { items: filtered, total: filtered.length } };
    } catch (err) {
      ctx.error("listDataPackages error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// GET /api/data-packages/{id}
app.http("getDataPackage", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "data-packages/{id}",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      await ensureSeeded(tenantId);
      const container = await getContainer(CONTAINERS.DATA_PACKAGES);
      const { resource } = await container.item(id).read();
      if (!resource) {
        return { status: 404, jsonBody: { error: "Data package not found" } };
      }
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("getDataPackage error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
