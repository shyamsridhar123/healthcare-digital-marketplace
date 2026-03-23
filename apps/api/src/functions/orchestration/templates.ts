import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getContainer, CONTAINERS } from "../../lib/cosmos/client.js";

// ── Schemas ───────────────────────────────────────────────────────────────────

const TemplateParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "agent-id", "server-id", "model-id"]),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  description: z.string().optional(),
});

const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  data: z.record(z.unknown()).optional(),
});

const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  category: z.string().default("General"),
  version: z.string().default("1.0.0"),
  nodes: z.array(WorkflowNodeSchema).min(1),
  edges: z.array(WorkflowEdgeSchema),
  parameters: z.array(TemplateParameterSchema).default([]),
  defaultPolicyIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(["private", "shared"]).default("private"),
  tenantId: z.string().min(1),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

async function createTemplate(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  let body: unknown;
  try { body = await req.json(); } catch { return { status: 400, jsonBody: { error: "Invalid JSON" } }; }

  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) return { status: 422, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };

  const now = new Date().toISOString();
  const template = {
    id: uuidv4(),
    ...parsed.data,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const container = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
  await container.items.create(template);
  return { status: 201, jsonBody: template };
}

async function listTemplates(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId") ?? "default";
  const category = url.searchParams.get("category");
  const visibility = url.searchParams.get("visibility");
  const search = url.searchParams.get("search")?.toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));

  const container = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
  const { resources } = await container.items.query<any>({
    query: "SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC",
    parameters: [{ name: "@tenantId", value: tenantId }],
  }).fetchAll();

  let items = resources ?? [];
  if (category) items = items.filter((t: any) => t.category === category);
  if (visibility) items = items.filter((t: any) => t.visibility === visibility);
  if (search) {
    items = items.filter((t: any) =>
      t.name?.toLowerCase().includes(search) ||
      t.description?.toLowerCase().includes(search) ||
      t.tags?.some((tag: string) => tag.toLowerCase().includes(search))
    );
  }

  const total = items.length;
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  return { status: 200, jsonBody: { items: paged, total, page, pageSize } };
}

async function getTemplate(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Template not found" } };
  return { status: 200, jsonBody: resource };
}

async function updateTemplate(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  let body: any;
  try { body = await req.json(); } catch { return { status: 400, jsonBody: { error: "Invalid JSON" } }; }

  const container = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
  const tenantId = body.tenantId ?? new URL(req.url).searchParams.get("tenantId") ?? "default";
  const { resource: existing } = await container.item(id, tenantId).read<any>();
  if (!existing) return { status: 404, jsonBody: { error: "Template not found" } };

  // Bump version if nodes/edges changed
  const bumpVersion = (body.nodes || body.edges) && body.version === undefined;
  const updated = {
    ...existing,
    ...body,
    id,
    tenantId: existing.tenantId,
    updatedAt: new Date().toISOString(),
    ...(bumpVersion ? { version: bumpMinor(existing.version ?? "1.0.0") } : {}),
  };
  await container.items.upsert(updated);
  return { status: 200, jsonBody: updated };
}

function bumpMinor(v: string): string {
  const parts = v.split(".");
  const minor = parseInt(parts[1] ?? "0") + 1;
  return `${parts[0]}.${minor}.${parts[2] ?? "0"}`;
}

async function deleteTemplate(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Template not found" } };
  await container.item(id, tenantId).delete();
  return { status: 204 };
}

async function forkTemplate(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id!;
  let body: any = {};
  try { body = await req.json(); } catch { /* no body OK */ }

  const tenantId = body.tenantId ?? new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
  const { resource } = await container.item(id, tenantId).read<any>();
  if (!resource) return { status: 404, jsonBody: { error: "Template not found" } };

  const now = new Date().toISOString();
  const forked = {
    ...resource,
    id: uuidv4(),
    name: body.name ?? `${resource.name} (Fork)`,
    version: "1.0.0",
    usageCount: 0,
    visibility: "private",
    createdAt: now,
    updatedAt: now,
    forkedFrom: resource.id,
  };
  await container.items.create(forked);

  // Increment original usageCount
  await container.items.upsert({ ...resource, usageCount: (resource.usageCount ?? 0) + 1 });

  return { status: 201, jsonBody: forked };
}

async function listCategories(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "default";
  const container = await getContainer(CONTAINERS.ORCHESTRATION_TEMPLATES);
  const { resources } = await container.items.query<any>({
    query: "SELECT c.category FROM c WHERE c.tenantId = @tenantId",
    parameters: [{ name: "@tenantId", value: tenantId }],
  }).fetchAll();

  const categories = [...new Set((resources ?? []).map((r: any) => r.category).filter(Boolean))] as string[];
  return { status: 200, jsonBody: { categories } };
}

// ── Registration ──────────────────────────────────────────────────────────────

app.http("createOrchTemplate", { methods: ["POST"], authLevel: "anonymous", route: "orchestration/templates", handler: createTemplate });
app.http("listOrchTemplates", { methods: ["GET"], authLevel: "anonymous", route: "orchestration/templates", handler: listTemplates });
app.http("listOrchTemplateCategories", { methods: ["GET"], authLevel: "anonymous", route: "orchestration/templates/categories", handler: listCategories });
app.http("getOrchTemplate", { methods: ["GET"], authLevel: "anonymous", route: "orchestration/templates/{id}", handler: getTemplate });
app.http("updateOrchTemplate", { methods: ["PUT", "PATCH"], authLevel: "anonymous", route: "orchestration/templates/{id}", handler: updateTemplate });
app.http("deleteOrchTemplate", { methods: ["DELETE"], authLevel: "anonymous", route: "orchestration/templates/{id}", handler: deleteTemplate });
app.http("forkOrchTemplate", { methods: ["POST"], authLevel: "anonymous", route: "orchestration/templates/{id}/fork", handler: forkTemplate });
