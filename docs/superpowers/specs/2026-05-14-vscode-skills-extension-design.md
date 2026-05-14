# VS Code Skills Extension — Design Spec

**Date:** 2026-05-14
**Status:** Approved
**Location:** `apps/vscode-extension/`

## Problem

Developers working in VS Code have no way to discover, browse, or install AI Marketplace skills without leaving the editor. The web marketplace has a full install panel, but the experience requires a browser, copy-pasting shell commands, and a manual VS Code reload. The goal is to make skill discovery and installation a first-class VS Code experience — matching what Codex offers for its skills.

## Decision Summary

| Question | Decision |
|---|---|
| Integration style | Hybrid: sidebar TreeView + `@marketplace` Copilot chat participant |
| Install mechanism | Direct write via `vscode.workspace.fs` — no terminal, one click |
| Skills data source | Marketplace API first, GitHub repo fallback |
| Distribution | `.vsix` file downloaded from the marketplace web UI |
| Detail view | VS Code native Markdown preview of the skill's `SKILL.md` + CodeLens install button |

---

## Architecture

Four components, all in `apps/vscode-extension/src/`:

### 1. Sidebar TreeView (`skillsProvider.ts`)

A `TreeDataProvider` registered under the `aiMarketplace` view container (Activity Bar). On activation it calls `skillsClient.ts` to fetch the remote catalog, then scans `~/.copilot/skills/` to classify each skill as installed or available.

Tree structure:
```
AI MARKETPLACE
  ▾ INSTALLED (n)
      uap-onboarding  v1.0.0
  ▾ AVAILABLE (n)
      atv-security    v2.1.0
      ce-review       v1.3.0
```

Context menu on each node: **Install**, **Uninstall** (installed only), **Open in Browser**. Panel toolbar: **Refresh**.

Clicking a node opens the Markdown detail view.

### 2. Markdown Detail + CodeLens (`skillDetailProvider.ts`, `codeLensProvider.ts`)

`skillDetailProvider.ts` implements `TextDocumentContentProvider` for the URI scheme `skill-detail:`. When a tree node is clicked, the extension opens a virtual document at `skill-detail:<skill-id>` whose content is the skill's `SKILL.md`. VS Code renders it natively in Markdown preview — no custom WebView required.

`codeLensProvider.ts` injects a CodeLens above the frontmatter block (`---` on line 1):
- **Not installed:** `⬇ Install skill — uap-onboarding`
- **Installed:** `✓ Installed · Uninstall?`

Clicking either CodeLens fires `marketplace.installSkill` or `marketplace.uninstallSkill`.

### 3. `@marketplace` Chat Participant (`chatParticipant.ts`)

Registered as a Copilot chat participant with id `ai-marketplace.marketplace`. Handles four intents parsed from the user's message:

| Command | Response |
|---|---|
| `@marketplace list` | Markdown table of all skills; installed flagged with ✓ |
| `@marketplace install <name>` | Calls installer, replies with success/error + follow-up buttons |
| `@marketplace help <name>` | Inline skill description, triggers, tags + Install button |
| `@marketplace search <query>` | Filtered list by name/tag/description |

All responses include a `vscode.ChatFollowup` where appropriate: **Open in Sidebar**, **Reload VS Code**, **View SKILL.md**.

Unrecognised input: responds with the four supported commands as a help message.

### 4. Data + Install Layer (`skillsClient.ts`, `installer.ts`)

**`skillsClient.ts`** — `fetchSkills()`:
1. GET `${aiMarketplace.apiUrl}/registry/skills` (configurable, defaults to `http://localhost:7071/api`)
2. On network error or non-2xx: fetch `https://api.github.com/repos/${aiMarketplace.githubRepo}/contents/.github/skills` (configurable, defaults to `rajesh-ms/ai-marketplace`)
3. For each directory entry, fetch its `SKILL.md`, parse YAML frontmatter, return `RegistrySkill[]`
4. Cache result in memory for the session; `refreshSkills` command clears the cache

**`installer.ts`** — `installSkill(skill)`:
1. Fetch SKILL.md content from `${apiUrl}/registry/skills/${skill.id}/download` (or use cached `skill.content`)
2. Resolve destination: `os.homedir()/.copilot/skills/<skill.name>/SKILL.md`
3. `vscode.workspace.fs.createDirectory(uri)` then `writeFile(uri, content)`
4. Fire `onDidChangeInstallation` event — tree provider listens and calls `refresh()`
5. Show `vscode.window.showInformationMessage("uap-onboarding installed. Reload VS Code to activate.")` with **Reload** action

**`installer.ts`** — `uninstallSkill(skill)`:
1. Delete `~/.copilot/skills/<skill.name>/SKILL.md` and the parent directory if empty
2. Fire `onDidChangeInstallation` to refresh tree

---

## Extension Manifest (`package.json`)

```jsonc
{
  "name": "ai-marketplace-skills",
  "displayName": "AI Marketplace Skills",
  "publisher": "ai-marketplace",
  "version": "0.1.0",
  "engines": { "vscode": "^1.95.0" },
  "contributes": {
    "viewsContainers": {
      "activitybar": [{ "id": "aiMarketplace", "title": "AI Marketplace", "icon": "resources/marketplace-icon.svg" }]
    },
    "views": {
      "aiMarketplace": [{ "id": "skillsTreeView", "name": "Skills" }]
    },
    "commands": [
      { "command": "marketplace.installSkill",   "title": "Install Skill" },
      { "command": "marketplace.uninstallSkill", "title": "Uninstall Skill" },
      { "command": "marketplace.refreshSkills",  "title": "Refresh", "icon": "$(refresh)" },
      { "command": "marketplace.openInBrowser",  "title": "Open in Browser" }
    ],
    "configuration": {
      "properties": {
        "aiMarketplace.apiUrl":     { "type": "string", "default": "http://localhost:7071/api" },
        "aiMarketplace.githubRepo": { "type": "string", "default": "rajesh-ms/ai-marketplace" }
      }
    },
    "chatParticipants": [
      { "id": "ai-marketplace.marketplace", "name": "marketplace", "description": "Browse and install AI Marketplace skills" }
    ]
  }
}
```

---

## File Structure

```
apps/vscode-extension/
  package.json
  tsconfig.json
  .vscodeignore
  src/
    extension.ts          — activate(): register all providers + commands
    skillsProvider.ts     — TreeDataProvider
    skillDetailProvider.ts — TextDocumentContentProvider (skill-detail: scheme)
    codeLensProvider.ts   — CodeLensProvider for SKILL.md frontmatter
    chatParticipant.ts    — vscode.chat.createChatParticipant handler
    skillsClient.ts       — fetchSkills() with API + GitHub fallback
    installer.ts          — installSkill() / uninstallSkill()
    types.ts              — RegistrySkill interface + parseFrontmatter() utility (mirrors apps/web)
  resources/
    marketplace-icon.svg
```

---

## Data Flow

### Fetch on activation / refresh
```
activate()
  → skillsClient.fetchSkills()
      → GET /api/registry/skills          (primary)
      → GitHub API .github/skills/        (fallback)
  → scan ~/.copilot/skills/
  → skillsProvider.refresh()             → tree renders
```

> `skillsClient.ts` reuses the same `parseFrontmatter()` YAML parser already in `types.ts` — no external YAML dependency needed.

### Install (CodeLens or chat)
```
user clicks "⬇ Install skill" or @marketplace install <name>
  → installer.installSkill(skill)
      → GET /api/registry/skills/{id}/download  (SKILL.md content)
      → vscode.workspace.fs.createDirectory
      → vscode.workspace.fs.writeFile
  → onDidInstall.fire()
  → skillsProvider.refresh()
  → showInformationMessage("Installed. Reload VS Code.")
```

---

## Distribution

The extension is packaged as a `.vsix` file via `vsce package`. The marketplace web UI exposes a **Download Extension (.vsix)** link on the Skills Registry page (to be added alongside the existing "Install in VS Code" panel). Developers install it via:

```
Extensions panel → ⋯ → Install from VSIX…
```

Or via the command line:
```bash
code --install-extension ai-marketplace-skills-0.1.0.vsix
```

---

## Out of Scope

- Publishing to the public VS Code Marketplace
- Multi-file skill packages (current skills are single `SKILL.md` files)
- Skill authoring / publishing from within VS Code
- Authentication / per-tenant skill visibility (all public skills for now)
- Auto-update of installed skills
