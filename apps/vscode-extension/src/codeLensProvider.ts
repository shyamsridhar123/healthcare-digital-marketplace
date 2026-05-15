import * as vscode from "vscode";
import type { SkillsProvider } from "./skillsProvider";
import type { Installer } from "./installer";
import { SKILL_DETAIL_SCHEME } from "./skillDetailProvider";

export class SkillCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChange.event;

  constructor(private readonly skills: SkillsProvider, private readonly installer: Installer) {
    installer.onDidChangeInstallation(() => this._onDidChange.fire());
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (document.uri.scheme !== SKILL_DETAIL_SCHEME) return [];
    const id = document.uri.path.replace(/^\//, "");
    const skill = this.skills.getSkillById(decodeURIComponent(id));
    if (!skill) return [];
    const range = new vscode.Range(0, 0, 0, 0);
    if (this.installer.isInstalled(skill.name)) {
      return [new vscode.CodeLens(range, {
        title: `$(check) Installed · Uninstall ${skill.name}?`,
        command: "marketplace.uninstallSkill",
        arguments: [skill],
      })];
    }
    return [new vscode.CodeLens(range, {
      title: `$(cloud-download) Install skill — ${skill.name}`,
      command: "marketplace.installSkill",
      arguments: [skill],
    })];
  }
}
