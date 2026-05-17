import * as vscode from "vscode";
import type { SkillsProvider } from "./skillsProvider";

export const SKILL_DETAIL_SCHEME = "skill-detail";

export class SkillDetailProvider implements vscode.TextDocumentContentProvider {
  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly skills: SkillsProvider) {}

  provideTextDocumentContent(uri: vscode.Uri): string {
    const id = uri.path.replace(/^\//, "");
    const skill = this.skills.getSkillById(id);
    if (!skill) return `# Skill not found\n\nNo skill with id \`${id}\`.`;
    return skill.content ?? `# ${skill.name}\n\n${skill.description}`;
  }

  notifyChanged(id: string): void {
    this._onDidChange.fire(vscode.Uri.parse(`${SKILL_DETAIL_SCHEME}:/${id}`));
  }
}

export function skillDetailUri(id: string): vscode.Uri {
  return vscode.Uri.parse(`${SKILL_DETAIL_SCHEME}:/${encodeURIComponent(id)}`);
}
