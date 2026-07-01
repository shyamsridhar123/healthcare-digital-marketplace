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
    id: "transaction_testing_training",
    dataPackageId: "transaction_testing_training",
    version: "12",
    displayName: "Transaction Testing Dataset",
    description:
      "Synthetic ERP and subledger transactions for audit analytics model training. Includes account mappings, approval workflow metadata, and counterparty attributes for approved demo use.",
    classification: "internal",
    demoDataStatement: "synthetic, de-identified approved demo transactions data for audit analytics model training.",
    demoDataClassifications: ["synthetic", "de-identified", "approved-demo"],
    amlDataAsset: { name: "transaction_testing_training", version: "12" },
    allowedSandboxTypes: ["personal", "team"],
    approvalPolicy: "auto-approve",
    starterNotebook: "notebooks/transaction_testing_baseline.ipynb",
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "control_exceptions_gold",
    dataPackageId: "control_exceptions_gold",
    version: "4",
    displayName: "Control Exceptions Gold Dataset",
    description:
      "Synthetic control exceptions, remediation outcomes, and reviewer decisions for SOX testing model evaluation.",
    classification: "internal",
    demoDataStatement: "synthetic, de-identified approved demo control exception outcomes for evaluation.",
    demoDataClassifications: ["synthetic", "de-identified", "approved-demo"],
    amlDataAsset: { name: "control_exceptions_gold", version: "4" },
    allowedSandboxTypes: ["personal", "team"],
    approvalPolicy: "standard-review",
    starterNotebook: "notebooks/control_exceptions_baseline.ipynb",
    tenantId: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "engagement_workpapers_confidential",
    dataPackageId: "engagement_workpapers_confidential",
    version: "3",
    displayName: "Engagement Workpapers (Confidential)",
    description:
      "Restricted engagement workpaper notes for NLP and named-entity review model development. Engagement-confidential content — restricted access only.",
    classification: "engagement_confidential",
    demoDataStatement: "Restricted engagement-confidential example for approval-gated proof only; excluded from the primary executive demo path.",
    demoDataClassifications: [],
    amlDataAsset: { name: "engagement_workpapers_confidential", version: "3" },
    allowedSandboxTypes: ["restricted"],
    approvalPolicy: "restricted-review",
    starterNotebook: "notebooks/workpaper_ner_starter.ipynb",
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
