import { CONTAINERS, getContainer } from '../cosmos/client.js';
import { classifyRiskTier } from './manifest.js';

export type DeploymentOutputs = {
  endpointUrl: string;
  resourceId?: string;
  apimOperationUrl?: string;
};

export type ActivateSubmissionDeploymentInput = {
  submissionId: string;
  tenantId: string;
  deploymentOutputs: DeploymentOutputs;
  actorId: string;
};

export type ActivationResult = {
  submissionId: string;
  agentId: string;
  status: 'active';
};

export async function activateSubmissionDeployment(input: ActivateSubmissionDeploymentInput): Promise<ActivationResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();

  if (!submission) {
    throw new Error(`Submission not found: ${input.submissionId}`);
  }

  if (submission.status === 'active' && submission.agentId) {
    return { submissionId: input.submissionId, agentId: String(submission.agentId), status: 'active' };
  }

  if (!['approved', 'provisioning', 'testing'].includes(String(submission.status))) {
    throw new Error('Submission must be approved, provisioning, or testing before activation.');
  }

  const now = new Date().toISOString();
  const agentId = String(submission.agentId ?? `agent-${input.submissionId}`);
  const manifest = submission.manifest && typeof submission.manifest === 'object' ? submission.manifest : {};
  const version = String(submission.version ?? manifest.version ?? '1.0.0');
  const name = String(submission.assetName ?? submission.name ?? manifest.name ?? 'Onboarded Agent');
  const description = String(submission.description ?? manifest.description ?? 'Onboarded marketplace agent.');
  const dataCategories = Array.isArray(submission.rai?.data_categories)
    ? submission.rai.data_categories
    : Array.isArray(manifest.rai?.data_categories)
      ? manifest.rai.data_categories
    : Array.isArray(submission.dataCategories)
      ? submission.dataCategories
      : ['none'];
  const capabilities: string[] = Array.isArray(submission.capabilities)
    ? submission.capabilities.map(String)
    : Array.isArray(manifest.capabilities)
      ? manifest.capabilities.map(String)
      : [];
  const networkEgress = submission.network?.egress === true || manifest.network?.egress === true;
  const riskTier = classifyRiskTier({ dataCategories: dataCategories.map(String), networkEgress });

  const agentCard = {
    name,
    description,
    version,
    url: input.deploymentOutputs.endpointUrl,
    provider: { organization: String(submission.publisherId ?? submission.ownerId ?? input.tenantId) },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    authentication: { schemes: ['bearer'] },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: capabilities.map((capability) => ({
      id: capability,
      name: capability,
      tags: [capability],
      examples: [],
      inputModes: ['text'],
      outputModes: ['text'],
    })),
  };

  const agentDocument = {
    id: agentId,
    tenantId: input.tenantId,
    submissionId: input.submissionId,
    agentCard,
    endpointUrl: input.deploymentOutputs.endpointUrl,
    authScheme: 'bearer',
    tags: capabilities,
    visibility: 'private',
    category: 'onboarded-agent',
    status: 'active',
    versions: [{ version, endpointUrl: input.deploymentOutputs.endpointUrl, registeredAt: now, active: true }],
    healthStatus: 'unknown',
    securityScanStatus: 'pending',
    rating: 0,
    ratingCount: 0,
    registeredAt: submission.registeredAt ?? now,
    updatedAt: now,
  };

  const agents = await getContainer(CONTAINERS.A2A_AGENTS);
  await agents.items.upsert(agentDocument);

  const agentCards = await getContainer(CONTAINERS.AGENT_CARDS);
  await agentCards.items.upsert({
    id: agentId,
    tenantId: input.tenantId,
    submissionId: input.submissionId,
    name,
    version,
    risk_tier: riskTier,
    status: 'active',
    endpointUrl: input.deploymentOutputs.endpointUrl,
    deploymentOutputs: input.deploymentOutputs,
    lifecycle: {
      last_active_version: version,
      created_at: submission.submittedAt ?? now,
      activated_at: now,
    },
    agentCard,
    updatedAt: now,
  });

  await submissions.items.upsert({
    ...submission,
    status: 'active',
    agentId,
    activatedAt: now,
    deploymentOutputs: input.deploymentOutputs,
    updatedAt: now,
  });

  const reindexRequests = await getContainer(CONTAINERS.SEARCH_REINDEX_REQUESTS);
  await reindexRequests.items.upsert({
    id: `reindex-${input.submissionId}`,
    tenantId: input.tenantId,
    submissionId: input.submissionId,
    agentId,
    assetType: 'a2a-agent',
    reason: 'agent-activated',
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
  });

  const audit = await getContainer(CONTAINERS.AUDIT_LOG);
  await audit.items.upsert({
    id: `activation-${input.submissionId}`,
    action: 'onboarding.agent_card_activated',
    targetId: input.submissionId,
    targetType: 'submission',
    tenantId: input.tenantId,
    actorId: input.actorId,
    actorType: 'service-account',
    outcome: 'success',
    timestamp: now,
    details: { agentId, endpointUrl: input.deploymentOutputs.endpointUrl, resourceId: input.deploymentOutputs.resourceId },
  });

  return { submissionId: input.submissionId, agentId, status: 'active' };
}