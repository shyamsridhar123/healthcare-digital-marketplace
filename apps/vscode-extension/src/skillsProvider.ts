import * as vscode from "vscode";
import type { RegistrySkill } from "./types";
import type { Installer } from "./installer";
import type { SkillsClient } from "./skillsClient";

export type SkillNodeKind = "section" | "skill";

export class SkillNode extends vscode.TreeItem {
  constructor(
    public readonly kind: SkillNodeKind,
    public readonly label: string,
    public readonly skill?: RegistrySkill,
    public readonly section?: "installed" | "available",
  ) {
    super(label, kind === "section"
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.None);
    if (kind === "skill" && skill) {
      this.description = `v${skill.version}`;
      this.tooltip = skill.description;
      this.contextValue = section === "installed" ? "skill-installed" : "skill-available";
      this.iconPath = new vscode.ThemeIcon(section === "installed" ? "check" : "cloud-download");
      this.command = {
        command: "marketplace.openSkillDetail",
        title: "Open Skill",
        arguments: [skill.id],
      };
    } else {
      this.contextValue = "section";
    }
  }
}

export class SkillsProvider implements vscode.TreeDataProvider<SkillNode> {
  private readonly _onDidChange = new vscode.EventEmitter<SkillNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private skills: RegistrySkill[] = [];

  constructor(private readonly client: SkillsClient, private readonly installer: Installer) {
    installer.onDidChangeInstallation(() => this._onDidChange.fire());
  }

  async refresh(): Promise<void> {
    await this.installer.refresh();
    try {
      this.skills = await this.client.fetchSkills();
    } catch (err) {
      void vscode.window.showErrorMessage(`AI Marketplace: failed to load skills — ${(err as Error).message}`);
      this.skills = [];
    }
    this._onDidChange.fire();
  }

  getSkillById(id: string): RegistrySkill | undefined {
    return this.skills.find(s => s.id === id);
  }

  allSkills(): RegistrySkill[] {
    return this.skills;
  }

  getTreeItem(element: SkillNode): vscode.TreeItem { return element; }

  getChildren(element?: SkillNode): SkillNode[] {
    if (!element) {
      const installedCount = this.skills.filter(s => this.installer.isInstalled(s.name)).length;
      const availableCount = this.skills.filter(s => !this.installer.isInstalled(s.name)).length;
      return [
        new SkillNode("section", `Installed (${installedCount})`, undefined, "installed"),
        new SkillNode("section", `Available (${availableCount})`, undefined, "available"),
      ];
    }
    if (element.kind === "section" && element.section === "installed") {
      return this.skills
        .filter(s => this.installer.isInstalled(s.name))
        .map(s => new SkillNode("skill", s.name, s, "installed"));
    }
    if (element.kind === "section" && element.section === "available") {
      return this.skills
        .filter(s => !this.installer.isInstalled(s.name))
        .map(s => new SkillNode("skill", s.name, s, "available"));
    }
    return [];
  }
}
