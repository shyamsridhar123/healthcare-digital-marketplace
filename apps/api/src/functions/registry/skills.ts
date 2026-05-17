/**
 * Agent Skills Registry API
 * Register and discover reusable AI agent skills. Skills are units of
 * agent capability described by SKILL.md-style frontmatter and markdown.
 * Supports import from GitHub/GitLab URLs, visibility controls, and star ratings.
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

const UAP_ONBOARDING_SKILL_CONTENT = `---
name: uap-onboarding
description: "Use when onboarding, validating, submitting, approving, deploying, or troubleshooting a domain agent for the AI Marketplace from VS Code, GitHub, CLI, or the Publisher Portal."
version: 1.0.0
category: Agent Onboarding
tags: [uap, onboarding, vscode, github, governance]
triggers: [uap-onboarding, onboard domain agent, publish agent to marketplace, validate agent manifest]
---

# UAP Onboarding

Guides a domain engineer from local agent code to a governed AI Marketplace submission. It supports manifest authoring, VS Code submission, GitHub PR validation, evidence ingestion, deployment output activation, and troubleshooting.
`;

const UAP_ONBOARDING_SKILL = {
  id: "uap-onboarding",
  name: "uap-onboarding",
  description: "VS Code/GHCP skill for onboarding domain agents into AI Marketplace through manifest authoring, GitHub evidence gates, eval ingestion, and activation checks.",
  content: UAP_ONBOARDING_SKILL_CONTENT,
  version: "1.0.0",
  tags: ["uap", "onboarding", "vscode", "github", "governance"],
  category: "Agent Onboarding",
  triggerPhrases: ["uap-onboarding", "onboard domain agent", "publish agent to marketplace", "validate agent manifest"],
  sourceUrl: "https://github.com/rajesh-ms/test-onboardingagent/blob/main/.github/skills/uap-onboarding/SKILL.md",
  author: "AI Marketplace Platform",
  license: "Enterprise",
  tenantId: "default",
  visibility: "public",
  frontmatter: {
    name: "uap-onboarding",
    description: "Use when onboarding, validating, submitting, approving, deploying, or troubleshooting a domain agent for the AI Marketplace from VS Code, GitHub, CLI, or the Publisher Portal.",
    version: "1.0.0",
    category: "Agent Onboarding",
    tags: ["uap", "onboarding", "vscode", "github", "governance"],
  },
  stars: 0,
  starCount: 0,
  downloadCount: 1,
  registeredAt: "2026-05-14T00:00:00.000Z",
  updatedAt: "2026-05-14T00:00:00.000Z",
};

async function ensureSkillSeeds(): Promise<void> {
  const container = await getContainer(CONTAINERS.SKILLS);
  const { resource } = await container.item(UAP_ONBOARDING_SKILL.id, UAP_ONBOARDING_SKILL.tenantId).read();
  if (!resource) await container.items.create(UAP_ONBOARDING_SKILL);
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const RegisterSkillSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(500),
  content: z.string().min(10), // Markdown content (SKILL.md body)
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
  tags: z.array(z.string()).default([]),
  category: z.string().max(80).optional(),
  triggerPhrases: z.array(z.string()).default([]),
  sourceUrl: z.string().url().optional(), // GitHub/GitLab URL
  author: z.string().optional(),
  license: z.string().default("MIT"),
  tenantId: z.string().default("default"),
  visibility: z.enum(["public", "private", "group"]).default("public"),
});

const UpdateSkillSchema = RegisterSkillSchema.partial().omit({ tenantId: true });

const ImportSkillSchema = z.object({
  sourceUrl: z.string().url(),
  tenantId: z.string().default("default"),
  visibility: z.enum(["public", "private", "group"]).default("public"),
});

// ── Parse YAML frontmatter from markdown ─────────────────────────────────────

function parseFrontmatter(markdown: string): { meta: Record<string, unknown>; body: string } {
  const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) return { meta: {}, body: markdown };

  const meta: Record<string, unknown> = {};
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!m) continue;
    const val = m[2].trim();
    // Simple YAML: handle arrays like `[a, b, c]` and bare strings
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[m[1]] = val.slice(1, -1).split(",").map((v) => v.trim().replace(/['"]/g, ""));
    } else {
      meta[m[1]] = val.replace(/^['"]|['"]$/g, "");
    }
  }
  return { meta, body: fmMatch[2] };
}

// ── POST /api/registry/skills ─────────────────────────────────────────────────

app.http("registerSkill", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/skills",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = RegisterSkillSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const d = parsed.data;
      const now = new Date().toISOString();
      const { meta } = parseFrontmatter(d.content);

      const skill = {
        id: uuidv4(),
        ...d,
        frontmatter: meta,
        stars: 0,
        starCount: 0,
        downloadCount: 0,
        registeredAt: now,
        updatedAt: now,
      };

      await ensureSkillSeeds();
      const container = await getContainer(CONTAINERS.SKILLS);
      const { resource } = await container.items.create(skill);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      ctx.error("registerSkill error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/skills/import ─────────────────────────────────────────
// Import a SKILL.md from a GitHub/GitLab raw URL

app.http("importSkill", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/skills/import",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json();
      const parsed = ImportSkillSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const { sourceUrl, tenantId, visibility } = parsed.data;

      // Convert GitHub blob URLs to raw content URLs
      const rawUrl = sourceUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/")
        .replace("gitlab.com", "gitlab.com")
        .replace("/-/blob/", "/-/raw/");

      const resp = await fetch(rawUrl, { signal: AbortSignal.timeout(10_000) });
      if (!resp.ok) {
        return { status: 422, jsonBody: { error: `Failed to fetch skill content: ${resp.status} ${resp.statusText}` } };
      }

      const content = await resp.text();
      if (content.length > 200_000) {
        return { status: 413, jsonBody: { error: "Skill content exceeds 200 KB limit" } };
      }

      const { meta, body: markdownBody } = parseFrontmatter(content);

      // Extract metadata from frontmatter
      const name = (meta.name as string) || (meta.title as string) || "Imported Skill";
      const description = (meta.description as string) || markdownBody.split("\n").find((l) => l.trim() && !l.startsWith("#")) || "";
      const tags = (meta.tags as string[]) ?? (meta.keywords as string[]) ?? [];
      const triggerPhrases = (meta.triggers as string[]) ?? [];
      const version = (meta.version as string) ?? "1.0.0";
      const author = (meta.author as string) ?? "";
      const license = (meta.license as string) ?? "MIT";
      const category = (meta.category as string) ?? undefined;

      const now = new Date().toISOString();
      const skill = {
        id: uuidv4(),
        name,
        description: description.slice(0, 500),
        content,
        version,
        tags,
        category,
        triggerPhrases,
        sourceUrl,
        author,
        license,
        tenantId,
        visibility,
        frontmatter: meta,
        stars: 0,
        starCount: 0,
        downloadCount: 0,
        registeredAt: now,
        updatedAt: now,
      };

      await ensureSkillSeeds();
      const container = await getContainer(CONTAINERS.SKILLS);
      const { resource } = await container.items.create(skill);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      ctx.error("importSkill error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/skills ──────────────────────────────────────────────────

app.http("listSkills", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/skills",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get("tenantId") ?? "default";
      const search = req.query.get("search") ?? "";
      const category = req.query.get("category");
      const tag = req.query.get("tag");
      const page = Math.max(1, parseInt(req.query.get("page") ?? "1", 10));
      const pageSize = Math.min(parseInt(req.query.get("pageSize") ?? "24", 10), 100);
      const offset = (page - 1) * pageSize;

      await ensureSkillSeeds();
      const container = await getContainer(CONTAINERS.SKILLS);
      const conditions = ["c.tenantId = @tenantId"];
      const parameters: { name: string; value: unknown }[] = [{ name: "@tenantId", value: tenantId }];

      if (search) {
        conditions.push("(CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.description), LOWER(@search)))");
        parameters.push({ name: "@search", value: search });
      }

      if (category) {
        conditions.push("c.category = @category");
        parameters.push({ name: "@category", value: category });
      }

      if (tag) {
        conditions.push("ARRAY_CONTAINS(c.tags, @tag)");
        parameters.push({ name: "@tag", value: tag });
      }

      const where = `WHERE ${conditions.join(" AND ")}`;
      const query = `SELECT * FROM c ${where} ORDER BY c.stars DESC, c.registeredAt DESC OFFSET ${offset} LIMIT ${pageSize}`;
      const countQ = `SELECT VALUE COUNT(1) FROM c ${where}`;

      const [{ resources: items }, { resources: countRes }] = await Promise.all([
        container.items.query({ query, parameters }).fetchAll(),
        container.items.query({ query: countQ, parameters }).fetchAll(),
      ]);
      const total = typeof countRes[0] === "number" ? countRes[0] : items.length;

      return { status: 200, jsonBody: { items, total, page, pageSize } };
    } catch (err) {
      ctx.error("listSkills error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/skills/{id} ────────────────────────────────────────────

app.http("getSkill", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/skills/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.SKILLS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Skill not found" } };

      // Increment download counter
      const skill = resources[0];
      container.items.upsert({ ...skill, downloadCount: (skill.downloadCount ?? 0) + 1 }).catch(() => {});

      return { status: 200, jsonBody: skill };
    } catch (err) {
      ctx.error("getSkill error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── PATCH /api/registry/skills/{id} ──────────────────────────────────────────

app.http("updateSkill", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "registry/skills/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const body = await req.json();
      const parsed = UpdateSkillSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: "Validation failed", details: parsed.error.flatten() } };
      }

      const container = await getContainer(CONTAINERS.SKILLS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Skill not found" } };

      let updateData = parsed.data;
      if (updateData.content) {
        const { meta } = parseFrontmatter(updateData.content);
        updateData = { ...updateData, frontmatter: meta } as typeof updateData;
      }

      const updated = { ...resources[0], ...updateData, id, updatedAt: new Date().toISOString() };
      const { resource } = await container.items.upsert(updated);
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("updateSkill error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── DELETE /api/registry/skills/{id} ─────────────────────────────────────────

app.http("deleteSkill", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "registry/skills/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.SKILLS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Skill not found" } };
      await container.item(id, resources[0].tenantId).delete();
      return { status: 204 };
    } catch (err) {
      ctx.error("deleteSkill error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── GET /api/registry/skills/{id}/download ───────────────────────────────────

app.http("downloadSkill", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "registry/skills/{id}/download",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      await ensureSkillSeeds();
      const container = await getContainer(CONTAINERS.SKILLS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Skill not found" } };

      const skill = resources[0];
      container.items.upsert({ ...skill, downloadCount: (skill.downloadCount ?? 0) + 1 }).catch(() => {});

      const skillName = (skill.name as string).replace(/[^a-z0-9-]/gi, "-").toLowerCase();

      return {
        status: 200,
        body: skill.content as string,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="SKILL.md"`,
          "X-Skill-Name": skillName,
          "X-Skill-Version": skill.version as string,
          "Access-Control-Expose-Headers": "X-Skill-Name, X-Skill-Version",
        },
      };
    } catch (err) {
      ctx.error("downloadSkill error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/skills/{id}/star ──────────────────────────────────────

app.http("starSkill", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/skills/{id}/star",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const { id } = req.params;
    try {
      const container = await getContainer(CONTAINERS.SKILLS);
      const { resources } = await container.items
        .query({ query: "SELECT * FROM c WHERE c.id = @id", parameters: [{ name: "@id", value: id }] })
        .fetchAll();
      if (!resources.length) return { status: 404, jsonBody: { error: "Skill not found" } };

      const skill = resources[0];
      const updated = {
        ...skill,
        stars: (skill.stars ?? 0) + 1,
        starCount: (skill.starCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      await container.items.upsert(updated);
      return { status: 200, jsonBody: { id, stars: updated.stars } };
    } catch (err) {
      ctx.error("starSkill error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});

// ── POST /api/registry/skills/search ─────────────────────────────────────────

app.http("searchSkills", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "registry/skills/search",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json()) as { query?: string; tags?: string[]; maxResults?: number; tenantId?: string };
      const query = (body.query ?? "").toLowerCase();
      const maxResults = Math.min(body.maxResults ?? 20, 50);
      const tenantId = body.tenantId ?? "default";

      const container = await getContainer(CONTAINERS.SKILLS);
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
          parameters: [{ name: "@tenantId", value: tenantId }],
        })
        .fetchAll();

      type SkillDoc = Record<string, unknown> & { name: string; description?: string; triggerPhrases?: string[]; tags?: string[] };

      const scored: { skill: SkillDoc; score: number }[] = [];
      for (const skill of resources as SkillDoc[]) {
        let score = 0;
        const name = skill.name.toLowerCase();
        const desc = (skill.description ?? "").toLowerCase();
        const triggers = (skill.triggerPhrases ?? []).map((t) => t.toLowerCase());
        const tags = (skill.tags ?? []).map((t) => t.toLowerCase());

        if (!query) { scored.push({ skill, score: 1 }); continue; }

        if (name.includes(query)) score += 40;
        if (desc.includes(query)) score += 20;
        if (triggers.some((t) => t.includes(query))) score += 35; // High: exact trigger phrase match
        if (tags.some((t) => t.includes(query))) score += 25;

        if (body.tags?.length) {
          const matched = body.tags.filter((t) => (skill.tags ?? []).includes(t)).length;
          if (matched === 0) continue;
          score += matched * 20;
        }

        if (score > 0) scored.push({ skill, score });
      }

      scored.sort((a, b) => b.score - a.score);
      const results = scored.slice(0, maxResults).map(({ skill, score }) => ({ ...skill, relevanceScore: score }));
      return { status: 200, jsonBody: { results, total: results.length, query: body.query } };
    } catch (err) {
      ctx.error("searchSkills error:", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
