export const IMDE_DEMO_SCENARIO_ID = "imde-rcm-denial-demo";

export type DemoDataClassification = "synthetic" | "de-identified" | "approved-demo";

export interface ImdeDemoDataPackage {
  id: string;
  displayName: string;
  version: string;
  classification: "internal" | "restricted" | "phi";
  demoDataClassifications: DemoDataClassification[];
  demoDataStatement: string;
}

export type ImdeDemoPlaygroundPrediction = "High" | "Medium" | "Low";

export interface ImdeDemoPlaygroundScenario {
  id: string;
  label: string;
  inputText: string;
  output: {
    prediction: ImdeDemoPlaygroundPrediction;
    rationale: string;
    reasonCode?: string;
    confidence: number;
  };
}

export interface ImdeDemoEvaluationRun {
  id: string;
  name: string;
  status: "completed" | "running" | "failed";
  selectedWinner: boolean;
  governanceStatus: "ready-for-publish" | "blocked" | "in-review";
  baseModelId: string;
  dataPackages: string[];
  metrics: {
    f1: number;
    accuracy: number;
    latencyMs: number;
  };
  lineage: {
    notebookPath: string;
    templateId: string;
    trainingDataVersion: string;
    evaluationDataVersion: string;
  };
}

export interface ImdeDemoScenario {
  demoScenarioId: string;
  title: string;
  baseModelId: string;
  requestDefaults: {
    name: string;
    description: string;
    workspaceTemplateId: string;
    sandboxType: "team";
    dataPackages: string[];
    computeProfile: "gpu-small";
    durationDays: number;
    costCenter: string;
    businessJustification: string;
  };
  actors: {
    ownerId: string;
    ownerName: string;
    approverId: string;
    approverName: string;
    teamName: string;
  };
  dataPackages: ImdeDemoDataPackage[];
  selectedRunId: string;
  evaluationRuns: ImdeDemoEvaluationRun[];
  publishedExperience: {
    modelRouteId: string;
    displayName: string;
    task: string;
    trustStatus: "governance-passed";
    experienceStatus: "published";
    playgroundScenarios: ImdeDemoPlaygroundScenario[];
  };
}

const PRIMARY_PACKAGE_IDS = ["claims_training", "denials_gold"];

const scenario: ImdeDemoScenario = {
  demoScenarioId: IMDE_DEMO_SCENARIO_ID,
  title: "RCM Denial Prediction Sandbox",
  baseModelId: "hf-microsoft-biomednlp-pubmedbert-base-uncased-abstract",
  requestDefaults: {
    name: "RCM denial prediction fine-tuning",
    description: "Governed team sandbox for denial prediction model tuning with approved demo claims data.",
    workspaceTemplateId: "aml-team-standard-v1",
    sandboxType: "team",
    dataPackages: PRIMARY_PACKAGE_IDS,
    computeProfile: "gpu-small",
    durationDays: 30,
    costCenter: "RCM-AI-2026",
    businessJustification: "Tune and evaluate a denial prediction model using synthetic, de-identified claims demo data before marketplace publication.",
  },
  actors: {
    ownerId: "ds-priya-shah",
    ownerName: "Priya Shah",
    approverId: "platform-admin-morgan-lee",
    approverName: "Morgan Lee",
    teamName: "Revenue Cycle AI Lab",
  },
  dataPackages: [
    {
      id: "claims_training",
      displayName: "Claims Training Dataset",
      version: "12",
      classification: "internal",
      demoDataClassifications: ["synthetic", "de-identified", "approved-demo"],
      demoDataStatement: "synthetic, de-identified approved demo claims data for RCM model training.",
    },
    {
      id: "denials_gold",
      displayName: "Denials Gold Dataset",
      version: "4",
      classification: "internal",
      demoDataClassifications: ["synthetic", "de-identified", "approved-demo"],
      demoDataStatement: "synthetic, de-identified approved demo denial outcomes for evaluation.",
    },
  ],
  selectedRunId: "run-denial-pubmedbert-v3",
  evaluationRuns: [
    {
      id: "run-denial-pubmedbert-v3",
      name: "PubMedBERT denial classifier v3",
      status: "completed",
      selectedWinner: true,
      governanceStatus: "ready-for-publish",
      baseModelId: "hf-microsoft-biomednlp-pubmedbert-base-uncased-abstract",
      dataPackages: PRIMARY_PACKAGE_IDS,
      metrics: { f1: 0.87, accuracy: 0.91, latencyMs: 142 },
      lineage: {
        notebookPath: "notebooks/denials_prediction_finetune.ipynb",
        templateId: "denials-prediction-finetune-v1",
        trainingDataVersion: "claims_training:12",
        evaluationDataVersion: "denials_gold:4",
      },
    },
    {
      id: "run-denial-baseline-v1",
      name: "Baseline gradient boosted claims classifier",
      status: "completed",
      selectedWinner: false,
      governanceStatus: "in-review",
      baseModelId: "baseline-claims-gbdt",
      dataPackages: PRIMARY_PACKAGE_IDS,
      metrics: { f1: 0.74, accuracy: 0.82, latencyMs: 96 },
      lineage: {
        notebookPath: "notebooks/claims_baseline_train.ipynb",
        templateId: "claims-baseline-v1",
        trainingDataVersion: "claims_training:12",
        evaluationDataVersion: "denials_gold:4",
      },
    },
  ],
  publishedExperience: {
    modelRouteId: "rcm-denial-prediction-space",
    displayName: "RCM Denial Prediction Space",
    task: "Healthcare revenue cycle denial prediction",
    trustStatus: "governance-passed",
    experienceStatus: "published",
    playgroundScenarios: [
      {
        id: "outpatient-mri-no-auth",
        label: "Outpatient MRI, missing prior auth",
        inputText:
          "Synthetic claim: outpatient MRI of lumbar spine for chronic low back pain, payer A commercial plan, no prior authorization on file, billed CPT 72148.",
        output: {
          prediction: "High",
          rationale:
            "Synthetic example: payer A consistently denies advanced imaging without a prior auth record; documentation gap drives high denial risk.",
          reasonCode: "CO-197",
          confidence: 0.92,
        },
      },
      {
        id: "ed-visit-coding-mismatch",
        label: "ED visit, coding mismatch",
        inputText:
          "Synthetic claim: emergency department level 4 visit (CPT 99284) with primary diagnosis of unspecified chest pain (R07.9), no supporting cardiac workup documented.",
        output: {
          prediction: "Medium",
          rationale:
            "Synthetic example: E/M level appears unsupported by documented workup; payer may downcode or request records.",
          reasonCode: "CO-50",
          confidence: 0.68,
        },
      },
      {
        id: "inpatient-stay-complete-docs",
        label: "Inpatient stay, complete documentation",
        inputText:
          "Synthetic claim: 3-day inpatient admission for community-acquired pneumonia, attending notes and discharge summary on file, DRG 193, in-network facility.",
        output: {
          prediction: "Low",
          rationale:
            "Synthetic example: medical necessity well documented and DRG aligns with diagnosis; low likelihood of denial.",
          confidence: 0.12,
        },
      },
    ],
  },
};

export function getImdeDemoScenario(): ImdeDemoScenario {
  return structuredClone(scenario);
}

export function validateImdeDemoScenario(candidate: ImdeDemoScenario): void {
  if (candidate.demoScenarioId !== IMDE_DEMO_SCENARIO_ID) {
    throw new Error(`IMDE demo scenario id must be ${IMDE_DEMO_SCENARIO_ID}`);
  }

  const selectedPackages = new Set(candidate.requestDefaults.dataPackages);
  const packageById = new Map(candidate.dataPackages.map((pkg) => [pkg.id, pkg]));

  for (const packageId of selectedPackages) {
    const dataPackage = packageById.get(packageId);
    if (!dataPackage || dataPackage.classification === "phi" || dataPackage.classification === "restricted") {
      throw new Error("Primary IMDE demo scenario must not include restricted or PHI packages");
    }
    if (!dataPackage.demoDataStatement.toLowerCase().includes("synthetic")) {
      throw new Error(`Demo data package ${packageId} must include a synthetic data statement`);
    }
  }

  const winners = candidate.evaluationRuns.filter((run) => run.selectedWinner);
  if (winners.length !== 1 || winners[0].id !== candidate.selectedRunId) {
    throw new Error("IMDE demo scenario must have exactly one selected winning run");
  }
}

interface DemoActivationOptions {
  demoModeEnabled: boolean;
}

interface DemoSandboxRequest {
  demoScenarioId?: string;
  baseModelId?: string;
  tenantId?: string;
  workspaceTemplateId?: string;
  sandboxType?: string;
  computeProfile?: string;
  dataPackages?: string[];
}

export function isImdeDemoModeEnabled(): boolean {
  return process.env.UAP_ENABLE_IMDE_DEMO === "true";
}

export function getAllowedImdeDemoTenants(): string[] {
  return (process.env.UAP_IMDE_DEMO_TENANTS ?? "default")
    .split(",")
    .map((tenant) => tenant.trim())
    .filter(Boolean);
}

export function isAllowedImdeDemoTenant(tenantId: string | undefined): boolean {
  return getAllowedImdeDemoTenants().includes(tenantId ?? "default");
}

export interface ImdeDemoAmlWorkspaceConfig {
  workspaceName: string;
  workspaceId: string;
  mlflowTrackingUri: string;
  studioUrl: string;
  notebookUrl: string;
}

/**
 * Resolve the AML workspace metadata the IMDE demo "ready" projection should expose.
 *
 * When UAP_IMDE_DEMO_AML_WORKSPACE_NAME is set (plus the matching subscription/RG/
 * tenant/region env vars), the projection presents a real Azure ML Studio workspace
 * the executive audience can click through to. Otherwise it falls back to the original
 * synthetic placeholder so unit tests and offline demos keep working unchanged.
 */
export function resolveImdeDemoAmlWorkspace(): ImdeDemoAmlWorkspaceConfig {
  const workspaceName = process.env.UAP_IMDE_DEMO_AML_WORKSPACE_NAME?.trim();

  if (!workspaceName) {
    return {
      workspaceName: "demo-imde-rcm-denial-workspace",
      workspaceId: `/demo/workspaces/${scenario.demoScenarioId}`,
      mlflowTrackingUri: `https://demo.ai-marketplace.local/${scenario.demoScenarioId}/mlflow`,
      studioUrl: `https://demo.ai-marketplace.local/demo/${scenario.demoScenarioId}/studio`,
      notebookUrl: `https://demo.ai-marketplace.local/demo/${scenario.demoScenarioId}/notebook`,
    };
  }

  const subscriptionId = (
    process.env.UAP_IMDE_DEMO_AML_SUBSCRIPTION_ID
    ?? process.env.AZURE_SUBSCRIPTION_ID
    ?? ""
  ).trim();
  const resourceGroup = (
    process.env.UAP_IMDE_DEMO_AML_RESOURCE_GROUP
    ?? process.env.AZURE_RESOURCE_GROUP
    ?? ""
  ).trim();
  const tenantId = (
    process.env.UAP_IMDE_DEMO_AML_TENANT_ID
    ?? process.env.AZURE_TENANT_ID
    ?? ""
  ).trim();
  const region = (
    process.env.UAP_IMDE_DEMO_AML_REGION
    ?? process.env.AZURE_LOCATION
    ?? "eastus"
  ).trim();

  const workspaceArmId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.MachineLearningServices/workspaces/${workspaceName}`;
  const encodedArmId = encodeURIComponent(workspaceArmId);

  const mlflowTrackingUri = (
    process.env.UAP_IMDE_DEMO_AML_MLFLOW_URI
    ?? `azureml://${region}.api.azureml.ms/mlflow/v1.0${workspaceArmId}`
  ).trim();

  return {
    workspaceName,
    workspaceId: workspaceArmId,
    mlflowTrackingUri,
    studioUrl: `https://ml.azure.com/?wsid=${encodedArmId}&tid=${tenantId}`,
    notebookUrl: `https://ml.azure.com/fileexplorerAzNB?wsid=${encodedArmId}&tid=${tenantId}`,
  };
}

export function isCanonicalImdeDemoSandboxRequest(
  request: DemoSandboxRequest,
  options: DemoActivationOptions = { demoModeEnabled: isImdeDemoModeEnabled() }
): boolean {
  if (!options.demoModeEnabled) return false;
  if (request.demoScenarioId !== scenario.demoScenarioId) return false;
  if (request.baseModelId !== scenario.baseModelId) return false;
  if (request.workspaceTemplateId !== scenario.requestDefaults.workspaceTemplateId) return false;
  if (request.sandboxType !== scenario.requestDefaults.sandboxType) return false;
  if (request.computeProfile !== scenario.requestDefaults.computeProfile) return false;
  if (!isAllowedImdeDemoTenant(request.tenantId)) return false;

  const requestedPackages = [...(request.dataPackages ?? [])].sort();
  const allowedPackages = [...scenario.requestDefaults.dataPackages].sort();
  return requestedPackages.length === allowedPackages.length
    && requestedPackages.every((packageId, index) => packageId === allowedPackages[index]);
}

export function buildImdeDemoReadySandbox<T extends Record<string, any>>(
  sandbox: T,
  now = new Date().toISOString()
): T & {
  status: "ready";
  approvedBy: string;
  approvedAt: string;
  approvalReason: string;
  demoScenarioId: string;
  baseModelId: string;
  amlWorkspaceName: string;
  amlWorkspaceId: string;
  mlflowTrackingUri: string;
  launchUrls: { studio: string; notebook: string };
  dataAssetsRegistered: { name: string; version: string }[];
  demoDataStatement: string;
  updatedAt: string;
} {
  const aml = resolveImdeDemoAmlWorkspace();
  return {
    ...sandbox,
    status: "ready",
    approvedBy: scenario.actors.approverId,
    approvedAt: now,
    approvalReason: "Approved for executive demo GPU sandbox with synthetic, de-identified RCM data.",
    demoScenarioId: scenario.demoScenarioId,
    baseModelId: scenario.baseModelId,
    amlWorkspaceName: aml.workspaceName,
    amlWorkspaceId: aml.workspaceId,
    mlflowTrackingUri: aml.mlflowTrackingUri,
    launchUrls: {
      studio: aml.studioUrl,
      notebook: aml.notebookUrl,
    },
    dataAssetsRegistered: scenario.dataPackages.map((dataPackage) => ({
      name: dataPackage.id,
      version: dataPackage.version,
    })),
    demoDataStatement: "All visible data is synthetic, de-identified, simulated, or approved demo data.",
    updatedAt: now,
  };
}

interface DemoPublishInput {
  amlModelName: string;
  amlModelVersion: string;
  trainingRunId: string;
}

export function buildImdeDemoPublishArtifacts(
  sandbox: Record<string, any>,
  input: DemoPublishInput,
  now = new Date().toISOString()
) {
  const selectedRunId = input.trainingRunId;
  const selectedRun = scenario.evaluationRuns.find((run) => run.id === selectedRunId && run.selectedWinner);
  if (!selectedRun) {
    throw new Error("IMDE demo publish requires the selected winning run");
  }

  const modelRouteId = scenario.publishedExperience.modelRouteId;
  const projectionId = `pme-${modelRouteId}`;
  const submissionId = `sub-${sandbox.id ?? sandbox.sandboxId}-${selectedRun.id}`;
  const lineage = {
    sandboxId: sandbox.sandboxId ?? sandbox.id,
    demoScenarioId: scenario.demoScenarioId,
    selectedRunId: selectedRun.id,
    baseModelId: scenario.baseModelId,
    notebookPath: selectedRun.lineage.notebookPath,
    templateId: selectedRun.lineage.templateId,
    dataPackages: scenario.requestDefaults.dataPackages,
    trainingDataVersion: selectedRun.lineage.trainingDataVersion,
    evaluationDataVersion: selectedRun.lineage.evaluationDataVersion,
    metrics: selectedRun.metrics,
    approvedBy: scenario.actors.approverId,
    ownerId: sandbox.ownerId ?? scenario.actors.ownerId,
    teamName: scenario.actors.teamName,
  };

  const submission = {
    id: submissionId,
    tenantId: sandbox.tenantId ?? "default",
    submittedBy: sandbox.ownerId ?? scenario.actors.ownerId,
    assetType: "Model",
    name: `${input.amlModelName} v${input.amlModelVersion}`,
    status: "published",
    sourceType: "sandbox",
    sandboxId: sandbox.sandboxId ?? sandbox.id,
    demoScenarioId: scenario.demoScenarioId,
    amlModelName: input.amlModelName,
    amlModelVersion: input.amlModelVersion,
    trainingRunId: selectedRun.id,
    lineage,
    createdAt: now,
    updatedAt: now,
  };

  const experience = {
    id: projectionId,
    projectionId,
    modelRouteId,
    tenantId: sandbox.tenantId ?? "default",
    demoScenarioId: scenario.demoScenarioId,
    sourceSubmissionId: submissionId,
    name: scenario.publishedExperience.displayName,
    version: input.amlModelVersion,
    publisher: scenario.actors.teamName,
    status: scenario.publishedExperience.experienceStatus,
    trustStatus: scenario.publishedExperience.trustStatus,
    task: scenario.publishedExperience.task,
    previewType: "classification-playground",
    playgroundScenarios: scenario.publishedExperience.playgroundScenarios.map((entry) => ({
      id: entry.id,
      label: entry.label,
      inputText: entry.inputText,
      output: { ...entry.output },
    })),
    lineage,
    createdAt: now,
    updatedAt: now,
  };

  return {
    submissionId,
    projectionId,
    modelRouteId,
    modelRoute: `/models/${modelRouteId}`,
    submission,
    experience,
  };
}