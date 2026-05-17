import * as vscode from "vscode";
import { createSkillsClient } from "./skillsClient";
import { createInstaller } from "./installer";
import { SkillsProvider } from "./skillsProvider";
import { SkillDetailProvider, SKILL_DETAIL_SCHEME, skillDetailUri } from "./skillDetailProvider";
import { SkillCodeLensProvider } from "./codeLensProvider";
import { registerChatParticipant } from "./chatParticipant";
import type { RegistrySkill } from "./types";

function readConfig() {
  const cfg = vscode.workspace.getConfiguration("aiMarketplace");
  return {
    apiUrl: cfg.get<string>("apiUrl", "http://localhost:7071/api"),
    githubRepo: cfg.get<string>("githubRepo", "rajesh-ms/ai-marketplace"),
  };
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const cfg = readConfig();
  const client = createSkillsClient(cfg);
  const installer = createInstaller({ downloadContent: (id) => client.downloadSkillContent(id) });
  const skillsProvider = new SkillsProvider(client, installer);
  const detailProvider = new SkillDetailProvider(skillsProvider);
  const codeLensProvider = new SkillCodeLensProvider(skillsProvider, installer);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("skillsTreeView", skillsProvider),
    vscode.workspace.registerTextDocumentContentProvider(SKILL_DETAIL_SCHEME, detailProvider),
    vscode.languages.registerCodeLensProvider(
      { scheme: SKILL_DETAIL_SCHEME, language: "markdown" },
      codeLensProvider,
    ),
    vscode.commands.registerCommand("marketplace.refreshSkills", () => skillsProvider.refresh()),
    vscode.commands.registerCommand("marketplace.openSkillDetail", async (id: string) => {
      const uri = skillDetailUri(id);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.languages.setTextDocumentLanguage(doc, "markdown");
      await vscode.commands.executeCommand("markdown.showPreview", uri);
    }),
    vscode.commands.registerCommand("marketplace.installSkill", async (skill: RegistrySkill) => {
      try {
        await installer.installSkill(skill);
        detailProvider.notifyChanged(skill.id);
        const choice = await vscode.window.showInformationMessage(
          `${skill.name} installed. Reload VS Code to activate.`,
          "Reload",
        );
        if (choice === "Reload") await vscode.commands.executeCommand("workbench.action.reloadWindow");
      } catch (err) {
        await vscode.window.showErrorMessage(`Install failed: ${(err as Error).message}`);
      }
    }),
    vscode.commands.registerCommand("marketplace.uninstallSkill", async (skill: RegistrySkill) => {
      await installer.uninstallSkill(skill);
      detailProvider.notifyChanged(skill.id);
      await vscode.window.showInformationMessage(`${skill.name} uninstalled.`);
    }),
    vscode.commands.registerCommand("marketplace.openInBrowser", async (skill: RegistrySkill) => {
      if (!skill?.sourceUrl) { await vscode.window.showWarningMessage("No source URL for this skill."); return; }
      await vscode.env.openExternal(vscode.Uri.parse(skill.sourceUrl));
    }),
  );

  registerChatParticipant(context, skillsProvider, installer);

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("aiMarketplace")) void skillsProvider.refresh();
  }, null, context.subscriptions);

  await skillsProvider.refresh();
}

export function deactivate(): void {}
