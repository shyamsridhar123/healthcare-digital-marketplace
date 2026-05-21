import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";
import { provisionSandboxWorkspace } from "../../lib/aml/connector.js";
import {
  buildImdeDemoPublishArtifacts,
  buildImdeDemoReadySandbox,
  IMDE_DEMO_SCENARIO_ID,
  isAllowedImdeDemoTenant,
  isImdeDemoModeEnabled,
  isCanonicalImdeDemoSandboxRequest,
} from "../../lib/sandbox/demo-scenario.js";
import { resetImdeDemoScenario } from "../../lib/sandbox/demo-reset.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateSandboxSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  tenantId: z.string().optional(),
  ownerId: z.string().optional(),
  projectId: z.string().optional(),
  demoScenarioId: z.string().optional(),
  baseModelId: z.string().optional(),
  workspaceTemplateId: z.string(),
  sandboxType: z.enum(["personal", "team", "restricted"]),
  dataPackages: z.array(z.string()).min(1),
  computeProfile: z.enum(["cpu-small", "cpu-medium", "gpu-small"]),
  durationDays: z.number().int().min(1).max(90),
  costCenter: z.string().optional(),
  businessJustification: z.string().optional(),
});

const ExtendSandboxSchema = z.object({
  additionalDays: z.number().int().min(1).max(30),
  justification: z.string().optional(),
});

const RejectSandboxSchema = z.object({
  reason: z.string().min(5),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function isAuthorizedDemoAdmin(req: HttpRequest, body: Record<string, unknown>): boolean {
  const configuredToken = process.env.UAP_IMDE_DEMO_ADMIN_TOKEN;
  if (configuredToken) {
    return req.headers.get("x-imde-demo-admin-token") === configuredToken;
  }

  const localMode = process.env.AZURE_FUNCTIONS_ENVIRONMENT === "Development" || process.env.NODE_ENV === "test";
  return localMode && body.actorId === "presenter-admin";
}

function isAuthorizedDemoPublisher(req: HttpRequest, body: Record<string, unknown>, sandbox: Record<string, unknown>): boolean {
  const configuredToken = process.env.UAP_IMDE_DEMO_ADMIN_TOKEN;
  if (configuredToken && req.headers.get("x-imde-demo-admin-token") === configuredToken) {
    return true;
  }

  const localMode = process.env.AZURE_FUNCTIONS_ENVIRONMENT === "Development" || process.env.NODE_ENV === "test";
  return localMode && body.actorId === sandbox.ownerId;
}

async function readSandboxById(container: any, id: string): Promise<any | undefined> {
  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  return resources[0];
}

async function emitLifecycleEvent(
  sandboxId: string,
  tenantId: string,
  action: string,
  actorId: string,
  outcome: "success" | "failure" | "partial",
  details?: Record<string, unknown>
) {
  const container = await getContainer(CONTAINERS.SANDBOX_LIFECYCLE_EVENTS);
  const demoScenarioId = typeof details?.demoScenarioId === "string" ? details.demoScenarioId : undefined;
  await container.items.create({
    id: uuidv4(),
    sandboxId,
    tenantId,
    demoScenarioId,
    action,
    actorId,
    actorType: actorId === "system" ? "system" : "user",
    details: details ?? {},
    outcome,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Fire-and-forget: provision a real AML workspace and update sandbox record with results.
 * Called after a sandbox is approved (either auto or manual).
 */
async function triggerProvisioning(sandbox: any, ctx: InvocationContext) {
  const container = await getContainer(CONTAINERS.SANDBOXES);
  try {
    const result = await provisionSandboxWorkspace({
      sandboxId: sandbox.sandboxId,
      sandboxType: sandbox.sandboxType,
      tenantId: sandbox.tenantId,
      ownerId: sandbox.ownerId,
      dataPackages: sandbox.dataPackages,
      computeProfile: sandbox.computeProfile,
    });

    await container.items.upsert({
      ...sandbox,
      status: "ready",
      amlWorkspaceName: result.workspaceName,
      amlWorkspaceId: result.workspaceId,
      mlflowTrackingUri: result.mlflowTrackingUri,
      launchUrls: { studio: result.studioUrl, notebook: result.notebookUrl },
      dataAssetsRegistered: result.dataAssetsRegistered,
      updatedAt: new Date().toISOString(),
    });

    await emitLifecycleEvent(sandbox.sandboxId, sandbox.tenantId, "sandbox.workspace.provisioned", "system", "success", {
      workspaceName: result.workspaceName,
      dataAssetsRegistered: result.dataAssetsRegistered,
    });
  } catch (err: any) {
    ctx.error("AML provisioning failed:", err);
    await container.items.upsert({ ...sandbox, status: "failed", updatedAt: new Date().toISOString() });
    await emitLifecycleEvent(sandbox.sandboxId, sandbox.tenantId, "sandbox.workspace.provision.failed", "system", "failure", {
      error: err?.message ?? String(err),
    });
  }
}

/** Determine whether a sandbox request needs approval based on template + compute */
async function needsApproval(
  tenantId: string,
  workspaceTemplateId: string,
  computeProfile: string,
  sandboxType: string
): Promise<boolean> {
  if (computeProfile === "gpu-small") return true;
  if (sandboxType === "restricted") return true;
  try {
    const tplContainer = await getContainer(CONTAINERS.SANDBOX_TEMPLATES);
    const { resources } = await tplContainer.items
      .query<any>({
        query: "SELECT * FROM c WHERE c.tenantId = @tenantId AND c.id = @id",
        parameters: [
          { name: "@tenantId", value: tenantId },
          { name: "@id", value: workspaceTemplateId },
        ],
      })
      .fetchAll();
    const resource = resources[0];
    return resource?.requiresApproval ?? false;
  } catch {
    return true;
  }
}

// ─── POST /api/sandboxes ─────────────────────────────────────────────────────

app.http("createSandbox", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = CreateSandboxSchema.safeParse(body);
      if (!parsed.success) {
        return {
          status: 400,
          jsonBody: { error: "Validation failed", details: parsed.error.flatten() },
        };
      }

      const data = parsed.data;
      const tenantId = data.tenantId ?? "default";
      const ownerId = data.ownerId ?? "anonymous";
      const canonicalDemoRequest = isCanonicalImdeDemoSandboxRequest({ ...data, tenantId });
      const requiresApproval = await needsApproval(
        tenantId,
        data.workspaceTemplateId,
        data.computeProfile,
        data.sandboxType
      );

      const sandboxId = `sbx-${uuidv4().split("-")[0]}`;
      const now = new Date().toISOString();
      const sandbox = {
        id: sandboxId,
        sandboxId,
        name: data.name,
        description: data.description ?? "",
        tenantId,
        ownerId,
        projectId: data.projectId,
        demoScenarioId: canonicalDemoRequest ? data.demoScenarioId : undefined,
        baseModelId: canonicalDemoRequest ? data.baseModelId : undefined,
        workspaceTemplateId: data.workspaceTemplateId,
        sandboxType: data.sandboxType,
        dataPackages: data.dataPackages,
        computeProfile: data.computeProfile,
        status: requiresApproval ? "requested" : "approved",
        expiresAt: addDays(data.durationDays),
        costCenter: data.costCenter,
        businessJustification: data.businessJustification,
        policyProfile: data.sandboxType === "restricted" ? "restricted" : "standard",
        createdAt: now,
        updatedAt: now,
      };

      const container = await getContainer(CONTAINERS.SANDBOXES);
      await container.items.create(sandbox);

      await emitLifecycleEvent(
        sandboxId,
        tenantId,
        "sandbox.requested",
        ownerId,
        "success",
        { requiresApproval, sandboxType: data.sandboxType, demoScenarioId: canonicalDemoRequest ? data.demoScenarioId : undefined }
      );

      // Auto-start provisioning if no approval needed
      if (!requiresApproval) {
        await emitLifecycleEvent(sandboxId, tenantId, "sandbox.approved", "system", "success", {
          autoApproved: true,
        });
        const provisioningRecord = { ...sandbox, status: "provisioning", updatedAt: new Date().toISOString() };
        await container.items.upsert(provisioningRecord);
        await emitLifecycleEvent(sandboxId, tenantId, "sandbox.provisioning.started", "system", "success");
        // Kick off real AML workspace provisioning asynchronously
        triggerProvisioning(provisioningRecord, ctx).catch(() => {/* handled inside */});
      }

      return { status: 201, jsonBody: sandbox };
    } catch (err) {
      ctx.error("createSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── GET /api/sandboxes ───────────────────────────────────────────────────────

app.http("listSandboxes", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sandboxes",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const status = req.query.get("status");
      const ownerId = req.query.get("ownerId");
      const projectId = req.query.get("projectId");
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(50, parseInt(req.query.get("pageSize") ?? "20", 10));

      const container = await getContainer(CONTAINERS.SANDBOXES);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();

      let filtered = resources as any[];
      if (status) filtered = filtered.filter((s) => s.status === status);
      if (ownerId) filtered = filtered.filter((s) => s.ownerId === ownerId);
      if (projectId) filtered = filtered.filter((s) => s.projectId === projectId);

      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const total = filtered.length;
      const items = filtered.slice((page - 1) * pageSize, page * pageSize);

      return { status: 200, jsonBody: { items, total, page, pageSize } };
    } catch (err) {
      ctx.error("listSandboxes error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── GET /api/sandboxes/{id} ──────────────────────────────────────────────────

app.http("getSandbox", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sandboxes/{id}",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const container = await getContainer(CONTAINERS.SANDBOXES);
      const resource = await readSandboxById(container, id);
      if (!resource) {
        return { status: 404, jsonBody: { error: "Sandbox not found" } };
      }
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("getSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── POST /api/sandboxes/{id}/approve ────────────────────────────────────────

app.http("approveSandbox", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes/{id}/approve",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const approverId = (body.approverId as string) ?? "admin";

      const container = await getContainer(CONTAINERS.SANDBOXES);
      const resource = await readSandboxById(container, id);
      if (!resource) return { status: 404, jsonBody: { error: "Sandbox not found" } };
      if (resource.status !== "requested") {
        return { status: 409, jsonBody: { error: `Cannot approve sandbox in status '${resource.status}'` } };
      }

      const now = new Date().toISOString();
      if (isCanonicalImdeDemoSandboxRequest(resource)) {
        if (!isAuthorizedDemoAdmin(req, body)) {
          return { status: 403, jsonBody: { error: "Presenter/admin authorization is required" } };
        }

        const ready = buildImdeDemoReadySandbox(resource, now);
        await container.items.upsert(ready);

        await emitLifecycleEvent(id, resource.tenantId, "sandbox.approved", ready.approvedBy, "success", {
          reason: ready.approvalReason,
          demoScenarioId: ready.demoScenarioId,
        });
        await emitLifecycleEvent(id, resource.tenantId, "sandbox.provisioning.started", "system", "success", {
          demoScenarioId: ready.demoScenarioId,
          deterministic: true,
        });
        await emitLifecycleEvent(id, resource.tenantId, "sandbox.workspace.provisioned", "system", "success", {
          workspaceName: ready.amlWorkspaceName,
          dataAssetsRegistered: ready.dataAssetsRegistered,
          demoScenarioId: ready.demoScenarioId,
          deterministic: true,
        });

        return { status: 200, jsonBody: ready };
      }

      const updated = {
        ...resource,
        status: "provisioning",
        approvedBy: approverId,
        approvedAt: now,
        updatedAt: now,
      };
      await container.items.upsert(updated);

      await emitLifecycleEvent(id, resource.tenantId, "sandbox.approved", approverId, "success");
      await emitLifecycleEvent(id, resource.tenantId, "sandbox.provisioning.started", "system", "success");

      // Kick off real AML workspace provisioning asynchronously
      triggerProvisioning(updated, ctx).catch(() => {/* handled inside */});

      return { status: 200, jsonBody: updated };
    } catch (err) {
      ctx.error("approveSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── POST /api/sandboxes/{id}/reject ─────────────────────────────────────────

app.http("rejectSandbox", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes/{id}/reject",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = await req.json();
      const parsed = RejectSandboxSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }
      const rejectorId = (body as any).rejectorId ?? "admin";

      const container = await getContainer(CONTAINERS.SANDBOXES);
      const resource = await readSandboxById(container, id);
      if (!resource) return { status: 404, jsonBody: { error: "Sandbox not found" } };
      if (resource.status !== "requested") {
        return { status: 409, jsonBody: { error: `Cannot reject sandbox in status '${resource.status}'` } };
      }

      const now = new Date().toISOString();
      const updated = {
        ...resource,
        status: "failed",
        rejectedBy: rejectorId,
        rejectedAt: now,
        rejectionReason: parsed.data.reason,
        updatedAt: now,
      };
      await container.items.upsert(updated);
      await emitLifecycleEvent(id, resource.tenantId, "sandbox.rejected", rejectorId, "success", {
        reason: parsed.data.reason,
      });

      return { status: 200, jsonBody: updated };
    } catch (err) {
      ctx.error("rejectSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── POST /api/sandboxes/{id}/extend ─────────────────────────────────────────

app.http("extendSandbox", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes/{id}/extend",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = await req.json();
      const parsed = ExtendSandboxSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }
      const actorId = (body as any).actorId ?? "user";

      const container = await getContainer(CONTAINERS.SANDBOXES);
      const resource = await readSandboxById(container, id);
      if (!resource) return { status: 404, jsonBody: { error: "Sandbox not found" } };
      if (!["ready", "suspended"].includes(resource.status)) {
        return { status: 409, jsonBody: { error: `Cannot extend sandbox in status '${resource.status}'` } };
      }

      const newExpiry = new Date(resource.expiresAt);
      newExpiry.setDate(newExpiry.getDate() + parsed.data.additionalDays);
      const updated = {
        ...resource,
        expiresAt: newExpiry.toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await container.items.upsert(updated);
      await emitLifecycleEvent(id, resource.tenantId, "sandbox.extended", actorId, "success", {
        additionalDays: parsed.data.additionalDays,
        newExpiresAt: updated.expiresAt,
      });

      return { status: 200, jsonBody: updated };
    } catch (err) {
      ctx.error("extendSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── POST /api/sandboxes/{id}/suspend ────────────────────────────────────────

app.http("suspendSandbox", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes/{id}/suspend",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const actorId = (body.actorId as string) ?? "admin";

      const container = await getContainer(CONTAINERS.SANDBOXES);
      const resource = await readSandboxById(container, id);
      if (!resource) return { status: 404, jsonBody: { error: "Sandbox not found" } };
      if (resource.status !== "ready") {
        return { status: 409, jsonBody: { error: `Cannot suspend sandbox in status '${resource.status}'` } };
      }

      const updated = { ...resource, status: "suspended", updatedAt: new Date().toISOString() };
      await container.items.upsert(updated);
      await emitLifecycleEvent(id, resource.tenantId, "sandbox.suspended", actorId, "success");

      return { status: 200, jsonBody: updated };
    } catch (err) {
      ctx.error("suspendSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── POST /api/sandboxes/{id}/resume ─────────────────────────────────────────

app.http("resumeSandbox", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes/{id}/resume",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const actorId = (body.actorId as string) ?? "admin";

      const container = await getContainer(CONTAINERS.SANDBOXES);
      const resource = await readSandboxById(container, id);
      if (!resource) return { status: 404, jsonBody: { error: "Sandbox not found" } };
      if (resource.status !== "suspended") {
        return { status: 409, jsonBody: { error: `Cannot resume sandbox in status '${resource.status}'` } };
      }

      const updated = { ...resource, status: "ready", updatedAt: new Date().toISOString() };
      await container.items.upsert(updated);
      await emitLifecycleEvent(id, resource.tenantId, "sandbox.resumed", actorId, "success");

      return { status: 200, jsonBody: updated };
    } catch (err) {
      ctx.error("resumeSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── DELETE /api/sandboxes/{id} ───────────────────────────────────────────────

app.http("retireSandbox", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "sandboxes/{id}",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = req.params.id;
    try {
      const actorId = req.query.get("actorId") ?? "admin";

      const container = await getContainer(CONTAINERS.SANDBOXES);
      const resource = await readSandboxById(container, id);
      if (!resource) return { status: 404, jsonBody: { error: "Sandbox not found" } };

      const updated = { ...resource, status: "retired", updatedAt: new Date().toISOString() };
      await container.items.upsert(updated);
      await emitLifecycleEvent(id, resource.tenantId, "sandbox.retired", actorId, "success");

      return { status: 200, jsonBody: { message: "Sandbox retired successfully" } };
    } catch (err) {
      ctx.error("retireSandbox error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── GET /api/sandboxes/{id}/events ──────────────────────────────────────────

app.http("listSandboxEvents", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sandboxes/{id}/events",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const sandboxId = req.params.id;
    try {
      const container = await getContainer(CONTAINERS.SANDBOX_LIFECYCLE_EVENTS);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.sandboxId = @sandboxId",
          parameters: [{ name: "@sandboxId", value: sandboxId }],
        })
        .fetchAll();

      const sorted = (resources as any[]).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return { status: 200, jsonBody: { items: sorted, total: sorted.length } };
    } catch (err) {
      ctx.error("listSandboxEvents error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── POST /api/sandboxes/demo/reset ─────────────────────────────────────────

app.http("resetImdeDemoScenario", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes/demo/reset",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      if (!isImdeDemoModeEnabled()) {
        return { status: 403, jsonBody: { error: "IMDE demo mode is not enabled" } };
      }

      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      if (!isAuthorizedDemoAdmin(req, body)) {
        return { status: 403, jsonBody: { error: "Presenter/admin authorization is required" } };
      }

      const demoScenarioId = (body.demoScenarioId as string | undefined) ?? IMDE_DEMO_SCENARIO_ID;
      if (demoScenarioId !== IMDE_DEMO_SCENARIO_ID) {
        return { status: 400, jsonBody: { error: "Unsupported demo scenario" } };
      }

      const tenantId = (body.tenantId as string | undefined) ?? "default";
      if (!isAllowedImdeDemoTenant(tenantId)) {
        return { status: 403, jsonBody: { error: "Tenant is not allowed for IMDE demo reset" } };
      }

      const result = await resetImdeDemoScenario(tenantId);
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error("resetImdeDemoScenario error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── POST /api/sandboxes/{id}/publish-model ───────────────────────────────────

app.http("publishSandboxModel", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "sandboxes/{id}/publish-model",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const sandboxId = req.params.id;
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const { amlModelName, amlModelVersion, trainingRunId, evaluationArtifacts } = body;

      if (!amlModelName || !amlModelVersion) {
        return {
          status: 400,
          jsonBody: { error: "amlModelName and amlModelVersion are required" },
        };
      }

      const sandboxContainer = await getContainer(CONTAINERS.SANDBOXES);
      const sandbox = await readSandboxById(sandboxContainer, sandboxId);
      if (!sandbox) return { status: 404, jsonBody: { error: "Sandbox not found" } };
      if (sandbox.status !== "ready") {
        return { status: 409, jsonBody: { error: "Sandbox must be in ready state to publish a model" } };
      }

      if (isCanonicalImdeDemoSandboxRequest(sandbox)) {
        if (!isAuthorizedDemoPublisher(req, body, sandbox)) {
          return { status: 403, jsonBody: { error: "Sandbox owner or presenter/admin authorization is required" } };
        }

        if (!trainingRunId) {
          return { status: 400, jsonBody: { error: "trainingRunId is required for IMDE demo publish" } };
        }

        let artifacts;
        try {
          artifacts = buildImdeDemoPublishArtifacts(
            sandbox,
            {
              amlModelName: String(amlModelName),
              amlModelVersion: String(amlModelVersion),
              trainingRunId: String(trainingRunId),
            }
          );
        } catch (err: any) {
          return { status: 400, jsonBody: { error: err?.message ?? "Invalid demo publish request" } };
        }

        const submissionsContainer = await getContainer(CONTAINERS.SUBMISSIONS);
        await submissionsContainer.items.upsert(artifacts.submission);

        const experiencesContainer = await getContainer(CONTAINERS.MODEL_EXPERIENCES);
        await experiencesContainer.items.upsert(artifacts.experience);

        await emitLifecycleEvent(sandboxId, sandbox.tenantId, "sandbox.model.published", sandbox.ownerId, "success", {
          submissionId: artifacts.submissionId,
          projectionId: artifacts.projectionId,
          modelRouteId: artifacts.modelRouteId,
          demoScenarioId: IMDE_DEMO_SCENARIO_ID,
          deterministic: true,
        });

        return { status: 201, jsonBody: artifacts };
      }

      // Create a publisher submission record with sandbox lineage
      const submissionsContainer = await getContainer(CONTAINERS.SUBMISSIONS);
      const submission = {
        id: uuidv4(),
        tenantId: sandbox.tenantId,
        submittedBy: sandbox.ownerId,
        assetType: "Model",
        name: `${amlModelName} v${amlModelVersion}`,
        status: "pending",
        sourceType: "sandbox",
        sandboxId,
        amlModelName,
        amlModelVersion,
        trainingRunId,
        dataPackages: sandbox.dataPackages,
        evaluationArtifacts: evaluationArtifacts ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await submissionsContainer.items.create(submission);

      await emitLifecycleEvent(sandboxId, sandbox.tenantId, "sandbox.model.published", sandbox.ownerId, "success", {
        submissionId: submission.id,
        amlModelName,
        amlModelVersion,
      });

      return { status: 201, jsonBody: { submissionId: submission.id, submission } };
    } catch (err) {
      ctx.error("publishSandboxModel error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ─── GET /api/model-experiences ─────────────────────────────────────────────

app.http("listModelExperiences", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "model-experiences",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const demoScenarioId = req.query.get("demoScenarioId");
      const modelRouteId = req.query.get("modelRouteId");

      if (demoScenarioId === IMDE_DEMO_SCENARIO_ID && !isAllowedImdeDemoTenant(tenantId)) {
        return { status: 403, jsonBody: { error: "Tenant is not allowed for IMDE demo model experiences" } };
      }

      const filters = ["c.tenantId = @tenantId"];
      const parameters: { name: string; value: string }[] = [{ name: "@tenantId", value: tenantId }];

      if (demoScenarioId) {
        filters.push("c.demoScenarioId = @demoScenarioId");
        parameters.push({ name: "@demoScenarioId", value: demoScenarioId });
      }

      if (modelRouteId) {
        filters.push("c.modelRouteId = @modelRouteId");
        parameters.push({ name: "@modelRouteId", value: modelRouteId });
      }

      const container = await getContainer(CONTAINERS.MODEL_EXPERIENCES);
      const { resources } = await container.items
        .query({
          query: `SELECT * FROM c WHERE ${filters.join(" AND ")}`,
          parameters,
        })
        .fetchAll();

      return { status: 200, jsonBody: { items: resources, total: resources.length } };
    } catch (err) {
      ctx.error("listModelExperiences error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
