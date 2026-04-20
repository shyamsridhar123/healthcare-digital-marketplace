import axios from "axios";
import type {
  SandboxWorkspace,
  SandboxTemplate,
  DataPackage,
  SandboxLifecycleEvent,
} from "@/lib/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7071/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("msal_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Sandboxes ───────────────────────────────────────────────────────────────

export interface SandboxListParams {
  tenantId?: string;
  status?: string;
  ownerId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export interface SandboxListResponse {
  items: SandboxWorkspace[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSandboxInput {
  name: string;
  description?: string;
  tenantId?: string;
  ownerId?: string;
  projectId?: string;
  workspaceTemplateId: string;
  sandboxType: "personal" | "team" | "restricted";
  dataPackages: string[];
  computeProfile: "cpu-small" | "cpu-medium" | "gpu-small";
  durationDays: number;
  costCenter?: string;
  businessJustification?: string;
}

export async function listSandboxes(params: SandboxListParams = {}): Promise<SandboxListResponse> {
  const { data } = await api.get<SandboxListResponse>("/sandboxes", { params });
  return data;
}

export async function getSandbox(id: string): Promise<SandboxWorkspace> {
  const { data } = await api.get<SandboxWorkspace>(`/sandboxes/${id}`);
  return data;
}

export async function createSandbox(input: CreateSandboxInput): Promise<SandboxWorkspace> {
  const { data } = await api.post<SandboxWorkspace>("/sandboxes", input);
  return data;
}

export async function approveSandbox(id: string, approverId?: string): Promise<SandboxWorkspace> {
  const { data } = await api.post<SandboxWorkspace>(`/sandboxes/${id}/approve`, { approverId });
  return data;
}

export async function rejectSandbox(id: string, reason: string, rejectorId?: string): Promise<SandboxWorkspace> {
  const { data } = await api.post<SandboxWorkspace>(`/sandboxes/${id}/reject`, { reason, rejectorId });
  return data;
}

export async function extendSandbox(id: string, additionalDays: number, actorId?: string): Promise<SandboxWorkspace> {
  const { data } = await api.post<SandboxWorkspace>(`/sandboxes/${id}/extend`, { additionalDays, actorId });
  return data;
}

export async function suspendSandbox(id: string, actorId?: string): Promise<SandboxWorkspace> {
  const { data } = await api.post<SandboxWorkspace>(`/sandboxes/${id}/suspend`, { actorId });
  return data;
}

export async function resumeSandbox(id: string, actorId?: string): Promise<SandboxWorkspace> {
  const { data } = await api.post<SandboxWorkspace>(`/sandboxes/${id}/resume`, { actorId });
  return data;
}

export async function retireSandbox(id: string, actorId?: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/sandboxes/${id}`, { params: { actorId } });
  return data;
}

export async function listSandboxEvents(sandboxId: string): Promise<{ items: SandboxLifecycleEvent[]; total: number }> {
  const { data } = await api.get(`/sandboxes/${sandboxId}/events`);
  return data;
}

export async function publishSandboxModel(
  sandboxId: string,
  input: { amlModelName: string; amlModelVersion: string; trainingRunId?: string; evaluationArtifacts?: string[] }
): Promise<{ submissionId: string; submission: unknown }> {
  const { data } = await api.post(`/sandboxes/${sandboxId}/publish-model`, input);
  return data;
}

// ─── Sandbox Templates ───────────────────────────────────────────────────────

export async function listSandboxTemplates(tenantId?: string): Promise<{ items: SandboxTemplate[]; total: number }> {
  const { data } = await api.get("/sandbox-templates", { params: { tenantId } });
  return data;
}

export async function getSandboxTemplate(id: string): Promise<SandboxTemplate> {
  const { data } = await api.get<SandboxTemplate>(`/sandbox-templates/${id}`);
  return data;
}

// ─── Data Packages ───────────────────────────────────────────────────────────

export async function listDataPackages(
  tenantId?: string,
  sandboxType?: string
): Promise<{ items: DataPackage[]; total: number }> {
  const { data } = await api.get("/data-packages", { params: { tenantId, sandboxType } });
  return data;
}

export async function getDataPackage(id: string): Promise<DataPackage> {
  const { data } = await api.get<DataPackage>(`/data-packages/${id}`);
  return data;
}
