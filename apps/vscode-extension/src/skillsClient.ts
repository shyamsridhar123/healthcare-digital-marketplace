import { parseFrontmatter, type RegistrySkill } from "./types";

export interface SkillsClientOptions {
  apiUrl: string;
  githubRepo: string;
  fetch?: typeof fetch;
}

export interface SkillsClient {
  fetchSkills(): Promise<RegistrySkill[]>;
  downloadSkillContent(id: string): Promise<string>;
}

export function createSkillsClient(opts: SkillsClientOptions): SkillsClient {
  const f = opts.fetch ?? fetch;

  async function tryApi(): Promise<RegistrySkill[] | null> {
    try {
      const res = await f(`${opts.apiUrl.replace(/\/$/, "")}/registry/skills`, { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const body = await res.json() as { items?: RegistrySkill[] } | RegistrySkill[];
      return Array.isArray(body) ? body : (body.items ?? []);
    } catch {
      return null;
    }
  }

  async function tryGithub(): Promise<RegistrySkill[]> {
    const listUrl = `https://api.github.com/repos/${opts.githubRepo}/contents/.github/skills`;
    const res = await f(listUrl, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return [];
    const entries = await res.json() as Array<{ name: string; type: string; path: string }>;
    const dirs = entries.filter(e => e.type === "dir");
    const skills: RegistrySkill[] = [];
    for (const dir of dirs) {
      const rawUrl = `https://raw.githubusercontent.com/${opts.githubRepo}/main/${dir.path}/SKILL.md`;
      const md = await f(rawUrl, { headers: { Accept: "text/plain" } });
      if (!md.ok) continue;
      const content = await md.text();
      const { frontmatter } = parseFrontmatter(content);
      skills.push(toSkill(dir.name, content, frontmatter));
    }
    return skills;
  }

  return {
    async fetchSkills() {
      const api = await tryApi();
      if (api !== null) return api;
      return tryGithub();
    },
    async downloadSkillContent(id: string) {
      const url = `${opts.apiUrl.replace(/\/$/, "")}/registry/skills/${encodeURIComponent(id)}/download`;
      const res = await f(url, { headers: { Accept: "text/plain" } });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      return res.text();
    },
  };
}

function toSkill(name: string, content: string, fm: Record<string, unknown>): RegistrySkill {
  const tags = Array.isArray(fm.tags) ? fm.tags as string[] : [];
  const triggers = Array.isArray(fm.triggers) ? fm.triggers as string[] : [];
  return {
    id: name,
    name,
    description: typeof fm.description === "string" ? fm.description : "",
    content,
    version: typeof fm.version === "string" ? fm.version : "0.0.0",
    tags,
    category: typeof fm.category === "string" ? fm.category : undefined,
    triggerPhrases: triggers,
    license: "Unknown",
    tenantId: "default",
    visibility: "public",
    frontmatter: fm,
    stars: 0,
    starCount: 0,
    downloadCount: 0,
    registeredAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}
