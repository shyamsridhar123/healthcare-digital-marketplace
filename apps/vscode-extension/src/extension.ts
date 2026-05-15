import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("marketplace.refreshSkills", () => {
      void vscode.window.showInformationMessage("AI Marketplace: refresh (stub)");
    }),
  );
}

export function deactivate(): void {}
