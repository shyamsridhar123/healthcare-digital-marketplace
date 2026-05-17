import type * as vscode from "vscode";
import type { SkillsProvider } from "./skillsProvider";
import type { Installer } from "./installer";

export type Intent =
  | { kind: "list" }
  | { kind: "install"; name: string }
  | { kind: "help"; name: string }
  | { kind: "search"; query: string }
  | { kind: "unknown" };

export function parseIntent(prompt: string): Intent {
  const trimmed = prompt.trim();
  if (!trimmed) return { kind: "unknown" };
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(" ").trim();
  switch (cmd.toLowerCase()) {
    case "list":   return { kind: "list" };
    case "install": return arg ? { kind: "install", name: arg } : { kind: "unknown" };
    case "help":    return arg ? { kind: "help", name: arg }    : { kind: "unknown" };
    case "search":  return arg ? { kind: "search", query: arg } : { kind: "unknown" };
    default: return { kind: "unknown" };
  }
}

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  skills: SkillsProvider,
  installer: Installer,
): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vscode: typeof import("vscode") = require("vscode");
  const handler: vscode.ChatRequestHandler = async (request, _ctx, stream, _token) => {
    const intent = parseIntent(request.prompt);
    switch (intent.kind) {
      case "list": {
        const all = skills.allSkills();
        if (all.length === 0) { stream.markdown("No skills available."); break; }
        stream.markdown(`Found **${all.length} skills** in the AI Marketplace:\n\n`);
        for (const s of all) {
          const flag = installer.isInstalled(s.name) ? " · ✓ installed" : "";
          stream.markdown(`- **${s.name}** v${s.version} — ${s.description}${flag}\n`);
        }
        return { metadata: { command: "list" } };
      }
      case "install": {
        const skill = skills.allSkills().find(s => s.name === intent.name);
        if (!skill) { stream.markdown(`Skill \`${intent.name}\` not found.`); break; }
        try {
          await installer.installSkill(skill);
          stream.markdown(`✓ Installed **${skill.name}** v${skill.version}\n\nReload VS Code to activate.`);
          stream.button({ command: "workbench.action.reloadWindow", title: "Reload VS Code" });
        } catch (err) {
          stream.markdown(`Install failed: ${(err as Error).message}`);
        }
        return { metadata: { command: "install" } };
      }
      case "help": {
        const skill = skills.allSkills().find(s => s.name === intent.name);
        if (!skill) { stream.markdown(`Skill \`${intent.name}\` not found.`); break; }
        stream.markdown(`### ${skill.name}\n\n${skill.description}\n\n**Triggers:** ${skill.triggerPhrases.join(", ") || "—"}\n\n**Tags:** ${skill.tags.join(", ") || "—"}`);
        if (!installer.isInstalled(skill.name)) {
          stream.button({ command: "marketplace.installSkill", title: "Install", arguments: [skill] });
        }
        return { metadata: { command: "help" } };
      }
      case "search": {
        const q = intent.query.toLowerCase();
        const matches = skills.allSkills().filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some(t => t.toLowerCase().includes(q)),
        );
        stream.markdown(`Found **${matches.length}** matching \`${intent.query}\`:\n\n`);
        for (const s of matches) stream.markdown(`- **${s.name}** — ${s.description}\n`);
        return { metadata: { command: "search" } };
      }
      default:
        stream.markdown([
          "Supported commands:",
          "- `@marketplace list` — show all skills",
          "- `@marketplace install <name>` — install a skill",
          "- `@marketplace help <name>` — show details",
          "- `@marketplace search <query>` — filter by name/tag",
        ].join("\n"));
        return { metadata: { command: "unknown" } };
    }
    return { metadata: { command: intent.kind } };
  };

  const participant = vscode.chat.createChatParticipant("ai-marketplace.marketplace", handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "resources", "marketplace-icon.svg");
  context.subscriptions.push(participant);
}
