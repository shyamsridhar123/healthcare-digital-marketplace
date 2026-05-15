import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import type { RegistrySkill } from "./types";

export interface InstallerOptions {
  homeDir?: string;
  downloadContent: (id: string) => Promise<string>;
}

export interface Installer {
  installSkill(skill: RegistrySkill): Promise<void>;
  uninstallSkill(skill: RegistrySkill): Promise<void>;
  isInstalled(name: string): boolean;
  installedNames(): string[];
  refresh(): Promise<void>;
  onDidChangeInstallation: vscode.Event<void>;
  skillUri(name: string): vscode.Uri;
}

export function createInstaller(opts: InstallerOptions): Installer {
  const home = opts.homeDir ?? os.homedir();
  const root = vscode.Uri.file(path.join(home, ".copilot", "skills"));
  const emitter = new vscode.EventEmitter<void>();
  const installed = new Set<string>();

  function safeName(name: string): string {
    return name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }

  function skillDir(name: string): vscode.Uri {
    return vscode.Uri.file(path.join(root.fsPath, safeName(name)));
  }

  async function refresh(): Promise<void> {
    installed.clear();
    try {
      const entries = await vscode.workspace.fs.readDirectory(root);
      for (const [name, type] of entries) {
        if (type === vscode.FileType.Directory) {
          try {
            await vscode.workspace.fs.stat(vscode.Uri.file(path.join(root.fsPath, name, "SKILL.md")));
            installed.add(name);
          } catch {
            /* missing SKILL.md — ignore */
          }
        }
      }
    } catch {
      /* root doesn't exist yet */
    }
  }

  return {
    onDidChangeInstallation: emitter.event,
    isInstalled: (name) => installed.has(safeName(name)),
    installedNames: () => Array.from(installed),
    skillUri: (name) => vscode.Uri.file(path.join(skillDir(name).fsPath, "SKILL.md")),
    refresh,

    async installSkill(skill) {
      const content =
        skill.content && skill.content.length > 0 ? skill.content : await opts.downloadContent(skill.id);
      const dir = skillDir(skill.name);
      await vscode.workspace.fs.createDirectory(dir);
      const file = vscode.Uri.file(path.join(dir.fsPath, "SKILL.md"));
      await vscode.workspace.fs.writeFile(file, Buffer.from(content, "utf8"));
      installed.add(safeName(skill.name));
      emitter.fire();
    },

    async uninstallSkill(skill) {
      const dir = skillDir(skill.name);
      try {
        await vscode.workspace.fs.delete(dir, { recursive: true, useTrash: false });
      } catch {
        /* already gone */
      }
      installed.delete(safeName(skill.name));
      emitter.fire();
    },
  };
}
