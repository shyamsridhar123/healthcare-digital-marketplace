export interface RegistrySkill {
  id: string;
  name: string;
  description: string;
  content: string;
  version: string;
  tags: string[];
  category?: string;
  triggerPhrases: string[];
  sourceUrl?: string;
  author?: string;
  license: string;
  tenantId: string;
  visibility: "public" | "private" | "group";
  frontmatter: Record<string, unknown>;
  stars: number;
  starCount: number;
  downloadCount: number;
  registeredAt: string;
  updatedAt: string;
}

export interface ParsedSkill {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(markdown: string): ParsedSkill {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(markdown);
  if (!match) return { frontmatter: {}, body: markdown };
  const fm: Record<string, unknown> = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value: string = line.slice(colon + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      fm[key] = splitArrayItems(value.slice(1, -1));
      continue;
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fm[key] = value;
  }
  return { frontmatter: fm, body: match[2] ?? "" };
}

function splitArrayItems(inner: string): string[] {
  const items: string[] = [];
  let buf = "";
  let quote: '"' | "'" | null = null;
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      else buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === ",") { const t = buf.trim(); if (t) items.push(t); buf = ""; continue; }
    buf += ch;
  }
  const last = buf.trim();
  if (last) items.push(last);
  return items;
}
