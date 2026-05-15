import * as assert from "node:assert";
import * as path from "node:path";
import * as os from "node:os";
import * as vscode from "vscode";
import { createInstaller } from "../../src/installer";
import type { RegistrySkill } from "../../src/types";

const tmpHome = path.join(os.tmpdir(), `vscext-${Date.now()}`);
const skill: RegistrySkill = {
  id: "uap-onboarding",
  name: "uap-onboarding",
  description: "x",
  content: "SKILL BODY",
  version: "1.0.0",
  tags: [],
  triggerPhrases: [],
  license: "MIT",
  tenantId: "default",
  visibility: "public",
  frontmatter: {},
  stars: 0,
  starCount: 0,
  downloadCount: 0,
  registeredAt: "",
  updatedAt: "",
};

suite("installer", () => {
  test("installSkill writes SKILL.md to <home>/.copilot/skills/<name>/", async () => {
    const installer = createInstaller({ homeDir: tmpHome, downloadContent: async () => "SKILL BODY" });
    await installer.installSkill(skill);
    const dest = vscode.Uri.file(path.join(tmpHome, ".copilot", "skills", "uap-onboarding", "SKILL.md"));
    const bytes = await vscode.workspace.fs.readFile(dest);
    assert.strictEqual(Buffer.from(bytes).toString("utf8"), "SKILL BODY");
    assert.strictEqual(installer.isInstalled("uap-onboarding"), true);
  });

  test("uninstallSkill removes the skill directory", async () => {
    const installer = createInstaller({ homeDir: tmpHome, downloadContent: async () => "SKILL BODY" });
    await installer.installSkill(skill);
    await installer.uninstallSkill(skill);
    assert.strictEqual(installer.isInstalled("uap-onboarding"), false);
  });

  test("onDidChangeInstallation fires after install", async () => {
    const installer = createInstaller({ homeDir: tmpHome, downloadContent: async () => "SKILL BODY" });
    let fired = false;
    installer.onDidChangeInstallation(() => {
      fired = true;
    });
    await installer.installSkill(skill);
    assert.strictEqual(fired, true);
  });
});
