import { CONTAINERS, getContainer } from "../cosmos/client.js";
import {
  IMDE_DEMO_SCENARIO_ID,
  getImdeDemoScenario,
  isCanonicalImdeDemoSandboxRequest,
} from "./demo-scenario.js";

interface ResetCount {
  sandboxes: number;
  lifecycleEvents: number;
  submissions: number;
  modelExperiences: number;
}

interface TenantRecord {
  id: string;
  tenantId: string;
  demoScenarioId?: string;
  baseModelId?: string;
  workspaceTemplateId?: string;
  sandboxType?: string;
  computeProfile?: string;
  dataPackages?: string[];
  sourceType?: string;
  modelRouteId?: string;
  sandboxId?: string;
  details?: { demoScenarioId?: string };
}

const scenario = getImdeDemoScenario();

async function readTenantRecords(containerName: string, tenantId: string): Promise<TenantRecord[]> {
  const container = await getContainer(containerName);
  const { resources } = await container.items
    .query<TenantRecord>({
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
      parameters: [{ name: "@tenantId", value: tenantId }],
    })
    .fetchAll();
  return resources;
}

async function deleteRecords(containerName: string, records: TenantRecord[]): Promise<number> {
  const container = await getContainer(containerName);
  for (const record of records) {
    await container.item(record.id, record.tenantId).delete();
  }
  return records.length;
}

export async function resetImdeDemoScenario(tenantId = "default"):
  Promise<{ tenantId: string; demoScenarioId: string; deleted: ResetCount }> {
  const sandboxRecords = await readTenantRecords(CONTAINERS.SANDBOXES, tenantId);
  const demoSandboxes = sandboxRecords.filter((record) =>
    isCanonicalImdeDemoSandboxRequest(record, { demoModeEnabled: true })
  );
  const demoSandboxIds = new Set(demoSandboxes.map((record) => record.id));

  const lifecycleRecords = await readTenantRecords(CONTAINERS.SANDBOX_LIFECYCLE_EVENTS, tenantId);
  const demoLifecycleEvents = lifecycleRecords.filter((record) =>
    (record.demoScenarioId === IMDE_DEMO_SCENARIO_ID || record.details?.demoScenarioId === IMDE_DEMO_SCENARIO_ID)
    && (!record.sandboxId || demoSandboxIds.has(record.sandboxId))
  );

  const submissionRecords = await readTenantRecords(CONTAINERS.SUBMISSIONS, tenantId);
  const demoSubmissions = submissionRecords.filter((record) =>
    record.demoScenarioId === IMDE_DEMO_SCENARIO_ID
    && record.sourceType === "sandbox"
    && (record.sandboxId ? demoSandboxIds.has(record.sandboxId) : false)
  );

  const experienceRecords = await readTenantRecords(CONTAINERS.MODEL_EXPERIENCES, tenantId);
  const demoExperiences = experienceRecords.filter((record) =>
    record.demoScenarioId === IMDE_DEMO_SCENARIO_ID
    && record.modelRouteId === scenario.publishedExperience.modelRouteId
  );

  const deleted: ResetCount = {
    lifecycleEvents: await deleteRecords(CONTAINERS.SANDBOX_LIFECYCLE_EVENTS, demoLifecycleEvents),
    submissions: await deleteRecords(CONTAINERS.SUBMISSIONS, demoSubmissions),
    modelExperiences: await deleteRecords(CONTAINERS.MODEL_EXPERIENCES, demoExperiences),
    sandboxes: await deleteRecords(CONTAINERS.SANDBOXES, demoSandboxes),
  };

  return { tenantId, demoScenarioId: IMDE_DEMO_SCENARIO_ID, deleted };
}