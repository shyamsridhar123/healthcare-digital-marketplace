"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { McpServer } from "@/lib/types";

type StatusBadgeProps = { status: McpServer["status"]; healthStatus: McpServer["healthStatus"] };

function StatusBadge({ status, healthStatus }: StatusBadgeProps) {
  if (status !== "active") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Disabled</span>;
  }
  const colors: Record<McpServer["healthStatus"], string> = {
    healthy: "bg-green-100 text-green-700",
    degraded: "bg-yellow-100 text-yellow-700",
    unhealthy: "bg-red-100 text-red-600",
    unknown: "bg-gray-100 text-gray-500",
  };
  const labels: Record<McpServer["healthStatus"], string> = {
    healthy: "Healthy",
    degraded: "Degraded",
    unhealthy: "Unhealthy",
    unknown: "Unknown",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[healthStatus]}`}>
      {labels[healthStatus]}
    </span>
  );
}

function SecurityBadge({ scanStatus }: { scanStatus: McpServer["securityScanStatus"] }) {
  const colors: Record<McpServer["securityScanStatus"], string> = {
    passed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-600",
    running: "bg-blue-100 text-blue-600",
    pending: "bg-gray-100 text-gray-500",
    error: "bg-orange-100 text-orange-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[scanStatus]}`}>
      Scan: {scanStatus}
    </span>
  );
}

export default function McpServerCard({ server }: { server: McpServer }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link href={`/registry/${server.id}`} className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate block">
            {server.name}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{server.endpointUrl}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={server.status} healthStatus={server.healthStatus} />
          <SecurityBadge scanStatus={server.securityScanStatus} />
        </div>
      </div>

      {server.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{server.description}</p>
      )}

      <div className="flex flex-wrap gap-1">
        {server.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <span className="font-medium text-gray-700">{server.toolsCache?.length ?? 0}</span> tools
        </span>
        <span className="flex items-center gap-1">
          <span>v{server.activeVersion}</span>
          <span className="text-gray-300">|</span>
          <span>{server.transport}</span>
        </span>
        {server.rating > 0 && (
          <span className="flex items-center gap-0.5">
            <span className="text-yellow-500">★</span>
            <span>{server.rating.toFixed(1)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
