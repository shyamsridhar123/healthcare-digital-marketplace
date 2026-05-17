"use client";

import Link from "next/link";
import type { A2AAgent } from "@/lib/types";

function HealthBadge({ status }: { status: A2AAgent["healthStatus"] }) {
  const colors: Record<A2AAgent["healthStatus"], string> = {
    healthy: "bg-green-100 text-green-700",
    degraded: "bg-yellow-100 text-yellow-700",
    unhealthy: "bg-red-100 text-red-600",
    unknown: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

export default function AgentCard({ agent }: { agent: A2AAgent }) {
  const card = agent.agentCard;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link href={`/registry/agents/${agent.id}`} className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate block">
            {card.name}
          </Link>
          {card.provider?.organization && (
            <p className="text-xs text-gray-500 mt-0.5">{card.provider.organization}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <HealthBadge status={agent.healthStatus} />
          {agent.status !== "active" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Disabled</span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{card.description}</p>

      {card.skills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {card.skills.slice(0, 3).map((skill) => (
              <span key={skill.id} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{skill.name}</span>
            ))}
            {card.skills.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-xs">+{card.skills.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {agent.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <span className="font-medium text-gray-700">{card.skills.length}</span> skill{card.skills.length !== 1 ? "s" : ""}
        </span>
        <span>v{card.version ?? "1.0.0"}</span>
        {agent.rating > 0 && (
          <span className="flex items-center gap-0.5">
            <span className="text-yellow-500">★</span>
            <span>{agent.rating.toFixed(1)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
