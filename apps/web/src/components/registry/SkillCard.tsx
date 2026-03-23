"use client";

import Link from "next/link";
import type { RegistrySkill } from "@/lib/types";

export default function SkillCard({ skill, onStar }: { skill: RegistrySkill; onStar?: (id: string) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link href={`/registry/skills/${skill.id}`} className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate block">
            {skill.name}
          </Link>
          {skill.author && <p className="text-xs text-gray-500 mt-0.5">by {skill.author}</p>}
        </div>
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 shrink-0">v{skill.version}</span>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{skill.description}</p>

      {skill.triggerPhrases.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Trigger phrases</p>
          <p className="text-xs text-gray-500 italic line-clamp-1">"{skill.triggerPhrases[0]}"</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {skill.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStar?.(skill.id)}
            className="flex items-center gap-1 hover:text-yellow-500 transition-colors"
            title="Star this skill"
          >
            <span className={skill.stars > 0 ? "text-yellow-500" : ""}>★</span>
            <span>{skill.stars}</span>
          </button>
          <span className="text-gray-300">|</span>
          <span>{skill.downloadCount} downloads</span>
        </div>
        <span className="text-gray-400">{skill.license}</span>
      </div>
    </div>
  );
}
