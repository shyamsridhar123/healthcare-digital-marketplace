"use client";

import { useState, useEffect, useCallback } from "react";
import type { IamGroup, ServiceAccount } from "@/lib/types";

export default function IamAdminPage() {
  const [activeTab, setActiveTab] = useState<"groups" | "service-accounts">("groups");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Identity & Access Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage groups, service accounts, and fine-grained permissions</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(["groups", "service-accounts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "groups" ? "IAM Groups" : "Service Accounts"}
          </button>
        ))}
      </div>

      {activeTab === "groups" && <GroupsPanel />}
      {activeTab === "service-accounts" && <ServiceAccountsPanel />}
    </div>
  );
}

function GroupsPanel() {
  const [groups, setGroups] = useState<IamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const resp = await fetch("/api/iam/groups");
    if (resp.ok) {
      const d = await resp.json() as { items: IamGroup[] };
      setGroups(d.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const resp = await fetch("/api/iam/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (resp.ok) { setName(""); setDescription(""); fetchGroups(); }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this group?")) return;
    await fetch(`/api/iam/groups/${id}`, { method: "DELETE" });
    fetchGroups();
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Create IAM Group</p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
          <button type="submit" disabled={creating || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500">No groups created yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{group.name}</p>
                {group.description && <p className="text-xs text-gray-500">{group.description}</p>}
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>{group.members?.length ?? 0} members</span>
                  <span>{group.scopes?.length ?? 0} scopes</span>
                </div>
                {group.scopes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.scopes.slice(0, 4).map((scope) => (
                      <code key={scope} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{scope}</code>
                    ))}
                    {group.scopes.length > 4 && <span className="text-xs text-gray-400">+{group.scopes.length - 4} more</span>}
                  </div>
                )}
              </div>
              <button onClick={() => handleDelete(group.id)} className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-4">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceAccountsPanel() {
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newAccountCreds, setNewAccountCreds] = useState<{ clientId: string; clientSecret: string } | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const resp = await fetch("/api/iam/service-accounts");
    if (resp.ok) {
      const d = await resp.json() as { items: ServiceAccount[] };
      setAccounts(d.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const resp = await fetch("/api/iam/service-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (resp.ok) {
      const d = await resp.json() as { clientId: string; clientSecret: string };
      setNewAccountCreds({ clientId: d.clientId, clientSecret: d.clientSecret });
      setName("");
      fetchAccounts();
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service account? This cannot be undone.")) return;
    await fetch(`/api/iam/service-accounts/${id}`, { method: "DELETE" });
    fetchAccounts();
  }

  async function handleRotate(id: string) {
    const resp = await fetch(`/api/iam/service-accounts/${id}/rotate-secret`, { method: "POST" });
    if (resp.ok) {
      const d = await resp.json() as { clientId: string; clientSecret: string };
      setNewAccountCreds({ clientId: d.clientId, clientSecret: d.clientSecret });
    }
  }

  return (
    <div className="space-y-6">
      {newAccountCreds && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Save these credentials — the secret will NOT be shown again</p>
          <div className="space-y-1">
            <p className="text-xs font-mono text-gray-700">Client ID: <span className="select-all">{newAccountCreds.clientId}</span></p>
            <p className="text-xs font-mono text-gray-700">Client Secret: <span className="select-all">{newAccountCreds.clientSecret}</span></p>
          </div>
          <button onClick={() => setNewAccountCreds(null)} className="mt-2 text-xs text-yellow-700 hover:underline">I have saved the credentials</button>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Create Service Account</p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Service account name" required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={creating || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-500">No service accounts created yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Client ID</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Expires</th>
                <th className="pb-2 pr-4">Last Used</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((sa) => (
                <tr key={sa.id}>
                  <td className="py-2 pr-4 font-medium">{sa.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-gray-600">{sa.clientId}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs ${sa.status === "active" ? "text-green-700" : "text-gray-500"}`}>{sa.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-500">{sa.expiresAt ? new Date(sa.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">{sa.lastUsedAt ? new Date(sa.lastUsedAt).toLocaleDateString() : "Never"}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button onClick={() => handleRotate(sa.id)} className="text-xs text-blue-600 hover:underline">Rotate</button>
                      <button onClick={() => handleDelete(sa.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
