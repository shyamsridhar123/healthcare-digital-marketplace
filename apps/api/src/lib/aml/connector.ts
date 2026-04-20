/**
 * Azure Machine Learning Connector
 *
 * Handles real AML workspace provisioning, data asset registration,
 * compute creation, and launch URL generation for sandbox workspaces.
 * Uses DefaultAzureCredential — works with az login in dev, managed identity in prod.
 */

import { DefaultAzureCredential } from "@azure/identity";
import { AzureMachineLearningServicesManagementClient } from "@azure/arm-machinelearning";

// ─── Config (read from env, fall back to dev defaults) ───────────────────────

export const AML_CONFIG = {
  subscriptionId:
    process.env.AZURE_SUBSCRIPTION_ID ??
    "a7fecb91-4553-4aca-976e-274add998c8d",
  resourceGroup:
    process.env.AZURE_RESOURCE_GROUP ?? "rg-ai-marketplace-dev",
  location: process.env.AZURE_LOCATION ?? "eastus",
  storageAccountId:
    process.env.AML_STORAGE_ACCOUNT_ID ??
    "/subscriptions/a7fecb91-4553-4aca-976e-274add998c8d/resourceGroups/rg-ai-marketplace-dev/providers/Microsoft.Storage/storageAccounts/aimarketstorp7a65r22uhdx",
  keyVaultId:
    process.env.AML_KEY_VAULT_ID ??
    "/subscriptions/a7fecb91-4553-4aca-976e-274add998c8d/resourceGroups/rg-ai-marketplace-dev/providers/Microsoft.KeyVault/vaults/aimarket-kv-p7a65r22uhdx",
  appInsightsId:
    process.env.AML_APP_INSIGHTS_ID ??
    "/subscriptions/a7fecb91-4553-4aca-976e-274add998c8d/resourceGroups/rg-ai-marketplace-dev/providers/microsoft.insights/components/aimarket-appins",
};

// ─── Data package → AML data asset mapping ───────────────────────────────────

const DATA_PACKAGE_MAP: Record<string, { name: string; version: string }> = {
  claims_training: { name: "claims_training", version: "12" },
  denials_gold: { name: "denials_gold", version: "4" },
  clinical_notes_phi: { name: "clinical_notes_phi", version: "3" },
};

// ─── Client factory ───────────────────────────────────────────────────────────

function getAmlClient(): AzureMachineLearningServicesManagementClient {
  const credential = new DefaultAzureCredential();
  return new AzureMachineLearningServicesManagementClient(
    credential,
    AML_CONFIG.subscriptionId
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProvisionResult {
  workspaceName: string;
  workspaceId: string;
  mlflowTrackingUri: string;
  studioUrl: string;
  notebookUrl: string;
  dataAssetsRegistered: string[];
}

// ─── Workspace provisioning ───────────────────────────────────────────────────

export async function provisionSandboxWorkspace(opts: {
  sandboxId: string;
  sandboxType: "personal" | "team" | "restricted";
  tenantId: string;
  ownerId: string;
  dataPackages: string[];
  computeProfile: string;
}): Promise<ProvisionResult> {
  const client = getAmlClient();
  const workspaceName = `sbx-${opts.sandboxId.replace("sbx-", "")}-${opts.sandboxType.slice(0, 1)}`;

  // ── 1. Create AML workspace ───────────────────────────────────────────────
  const poller = await client.workspaces.beginCreateOrUpdate(
    AML_CONFIG.resourceGroup,
    workspaceName,
    {
      location: AML_CONFIG.location,
      description: `Sandbox workspace for ${opts.ownerId} — type: ${opts.sandboxType}`,
      storageAccount: AML_CONFIG.storageAccountId,
      keyVault: AML_CONFIG.keyVaultId,
      applicationInsights: AML_CONFIG.appInsightsId,
      identity: { type: "SystemAssigned" },
      tags: {
        "sandbox-id": opts.sandboxId,
        "sandbox-type": opts.sandboxType,
        "tenant-id": opts.tenantId,
        "owner-id": opts.ownerId,
        "managed-by": "ai-marketplace-platform",
      },
    }
  );

  const workspace = await poller.pollUntilDone();

  const workspaceId = workspace.id ?? "";
  const mlflowTrackingUri = workspace.mlFlowTrackingUri ?? "";

  // ── 2. Register data assets referenced by selected data packages ──────────
  const dataAssetsRegistered: string[] = [];

  for (const pkgId of opts.dataPackages) {
    const assetDef = DATA_PACKAGE_MAP[pkgId];
    if (!assetDef) continue;

    try {
      await client.dataVersions.createOrUpdate(
        AML_CONFIG.resourceGroup,
        workspaceName,
        assetDef.name,
        assetDef.version,
        {
          properties: {
            dataType: "uri_folder",
            dataUri: `azureml://datastores/workspaceblobstore/paths/datasets/${assetDef.name}/v${assetDef.version}/`,
            description: `Data package: ${pkgId} v${assetDef.version}`,
            tags: {
              "data-package-id": pkgId,
              "managed-by": "ai-marketplace-platform",
            },
          },
        }
      );
      dataAssetsRegistered.push(`${assetDef.name}:${assetDef.version}`);
    } catch (err: any) {
      // Asset may already exist in workspace — that's fine
      if (!err?.message?.includes("already exists")) throw err;
      dataAssetsRegistered.push(`${assetDef.name}:${assetDef.version} (existing)`);
    }
  }

  // ── 3. Build launch URLs ──────────────────────────────────────────────────
  const encodedWsId = encodeURIComponent(workspaceId);
  const studioUrl = `https://ml.azure.com/workspaceoverview?wsid=${encodedWsId}&tid=${AML_CONFIG.subscriptionId}`;
  const notebookUrl = `https://ml.azure.com/fileexplorerAzNB?wsid=${encodedWsId}&tid=${AML_CONFIG.subscriptionId}`;

  return {
    workspaceName,
    workspaceId,
    mlflowTrackingUri,
    studioUrl,
    notebookUrl,
    dataAssetsRegistered,
  };
}

// ─── Workspace teardown ───────────────────────────────────────────────────────

export async function deleteWorkspace(workspaceName: string): Promise<void> {
  const client = getAmlClient();
  await client.workspaces.beginDeleteAndWait(
    AML_CONFIG.resourceGroup,
    workspaceName
  );
}

// ─── List data assets in a workspace ─────────────────────────────────────────

export async function listWorkspaceDataAssets(
  workspaceName: string
): Promise<Array<{ name: string; version: string; uri: string }>> {
  const client = getAmlClient();
  const results: Array<{ name: string; version: string; uri: string }> = [];

  for await (const container of client.dataContainers.list(
    AML_CONFIG.resourceGroup,
    workspaceName
  )) {
    const containerName = container.name ?? "";
    for await (const version of client.dataVersions.list(
      AML_CONFIG.resourceGroup,
      workspaceName,
      containerName
    )) {
      results.push({
        name: containerName,
        version: version.name ?? "",
        uri: (version.properties as any)?.dataUri ?? "",
      });
    }
  }

  return results;
}
