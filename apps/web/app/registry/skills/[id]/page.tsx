"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import type { RegistrySkill } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7071/api";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="rounded-lg bg-gray-900 text-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-xs text-gray-400">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-gray-100 text-xs leading-relaxed">{code}</pre>
    </div>
  );
}

type OsTab = "windows" | "macos";

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [skill, setSkill] = useState<RegistrySkill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [osTab, setOsTab] = useState<OsTab>("windows");

  useEffect(() => {
    fetch(`${API_BASE_URL}/registry/skills/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => setSkill(d as RegistrySkill))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-500 text-sm">{error ?? "Skill not found"}</p>
        <Link href="/registry/skills" className="text-blue-600 text-sm mt-4 inline-block">
          ← Back to registry
        </Link>
      </div>
    );
  }

  const downloadUrl = `${API_BASE_URL}/registry/skills/${skill.id}/download`;
  const skillDir = skill.name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  const windowsDownloadCmd = [
    `$dest = "$env:USERPROFILE\\.copilot\\skills\\${skillDir}"`,
    `New-Item -ItemType Directory -Force $dest | Out-Null`,
    `Invoke-WebRequest -Uri "${downloadUrl}" -OutFile "$dest\\SKILL.md"`,
  ].join("\n");

  const macDownloadCmd = [
    `mkdir -p ~/.copilot/skills/${skillDir}`,
    `curl -fsSL "${downloadUrl}" -o ~/.copilot/skills/${skillDir}/SKILL.md`,
  ].join("\n");

  const windowsLocalCmd = `Copy-Item -Recurse .github/skills/${skillDir} \`\n  "$env:USERPROFILE\\.copilot\\skills\\${skillDir}" -Force`;

  const macLocalCmd = `cp -R .github/skills/${skillDir} ~/.copilot/skills/${skillDir}`;

  const cliCmd = `ai-marketplace install-skill ${skill.id}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <Link href="/registry/skills" className="text-sm text-blue-600 hover:text-blue-700 inline-block">
        ← Agent Skills Registry
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{skill.name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                v{skill.version}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 capitalize">
                {skill.visibility}
              </span>
            </div>
            {skill.author && (
              <p className="text-sm text-gray-500 mt-1">
                Published by <span className="font-medium text-gray-700">{skill.author}</span>
              </p>
            )}
            <p className="text-sm text-gray-700 mt-2">{skill.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4">
          {skill.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
          <span>★ {skill.stars} stars</span>
          <span>{skill.downloadCount} downloads</span>
          {skill.license && <span>{skill.license}</span>}
          {skill.category && (
            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{skill.category}</span>
          )}
          <span className="ml-auto text-gray-400">
            Registered {new Date(skill.registeredAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Install Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Install in VS Code Copilot</h2>
          <a
            href={downloadUrl}
            download="SKILL.md"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Download SKILL.md
          </a>
        </div>

        {/* VS Code Extension download */}
        <div className="mb-5 flex flex-col gap-2">
          <a
            href="/downloads/ai-marketplace-skills-0.1.0.vsix"
            download
            className="inline-flex items-center gap-2 rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 self-start"
          >
            Download VS Code Extension (.vsix)
          </a>
          <p className="text-xs text-muted-foreground">
            After download: Extensions panel → ⋯ → <em>Install from VSIX…</em>, or run
            <code className="ml-1 rounded bg-muted px-1">code --install-extension ai-marketplace-skills-0.1.0.vsix</code>
          </p>
        </div>

        {/* Trust note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 mb-5">
          <strong>Security note:</strong> Skills run as Copilot instructions inside VS Code. Only install
          skills from publishers you trust. This skill is published by{" "}
          <strong>{skill.author ?? "AI Marketplace"}</strong> and is{" "}
          <strong>{skill.license}</strong> licensed.
        </div>

        {/* Required files */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Required folder structure
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-xs text-gray-700 leading-relaxed">
            {`~/.copilot/\n  skills/\n    ${skillDir}/\n      SKILL.md`}
          </div>
        </div>

        {/* OS tabs */}
        <div className="flex gap-1 mb-4">
          {(["windows", "macos"] as OsTab[]).map((os) => (
            <button
              key={os}
              onClick={() => setOsTab(os)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                osTab === os
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {os === "windows" ? "Windows (PowerShell)" : "macOS / Linux"}
            </button>
          ))}
        </div>

        {/* Download from marketplace */}
        <p className="text-xs font-medium text-gray-500 mb-2">Download from marketplace</p>
        <div className="mb-4">
          <CodeBlock
            code={osTab === "windows" ? windowsDownloadCmd : macDownloadCmd}
            lang={osTab === "windows" ? "PowerShell" : "bash"}
          />
        </div>

        {/* Install from local clone */}
        <p className="text-xs font-medium text-gray-500 mb-2">
          Install from local clone (if you cloned this repo)
        </p>
        <CodeBlock
          code={osTab === "windows" ? windowsLocalCmd : macLocalCmd}
          lang={osTab === "windows" ? "PowerShell" : "bash"}
        />

        {/* CLI */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">
            CLI (if ai-marketplace CLI is installed)
          </p>
          <CodeBlock code={cliCmd} lang="shell" />
        </div>

        <p className="text-xs text-gray-400 mt-4">
          After installation, restart or reload VS Code so Copilot discovers the new skill.
        </p>
      </div>

      {/* Trigger phrases */}
      {skill.triggerPhrases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Trigger Phrases</h2>
          <div className="flex flex-wrap gap-2">
            {skill.triggerPhrases.map((phrase) => (
              <span
                key={phrase}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-mono"
              >
                &ldquo;{phrase}&rdquo;
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SKILL.md content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">SKILL.md</h2>
          {skill.sourceUrl && (
            <a
              href={skill.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              View source →
            </a>
          )}
        </div>
        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {skill.content}
        </pre>
      </div>
    </div>
  );
}
