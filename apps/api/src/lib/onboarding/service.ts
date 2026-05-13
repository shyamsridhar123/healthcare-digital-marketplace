import { v4 as uuidv4 } from 'uuid';
import { CONTAINERS, getContainer } from '../cosmos/client.js';
import {
  createOnboardingGraphState,
  runOnboardingGraph,
  type OnboardingGraphSource,
  type OnboardingGraphState,
  type OnboardingTerminalStatus,
} from './graph-runner.js';
import { validateAgentManifest, type AgentManifest, type RiskTier } from './manifest.js';

type RepoContext = {
  url?: string;
  branch?: string;
  commit_sha?: string;
  pr_number?: string;
  workflow_run_id?: string;
};

export type CreateOnboardingSubmissionInput = {
  tenantId: string;
  source: OnboardingGraphSource;
  manifest: unknown;
  repoContext?: RepoContext;
  actorId: string;
  traceId?: string;
};

export type OnboardingSubmissionResult = {
  submissionId: string;
  agentId: string;
  status: string;
  currentStage: string;
  riskTier?: RiskTier;
  terminalStatus?: OnboardingTerminalStatus;
  errors: Array<{ stage: string; path?: string; message: string }>;
  idempotent?: boolean;
};

export type DecideOnboardingApprovalInput = {
  tenantId: string;
  submissionId: string;
  decision: 'approved' | 'rejected';
  reviewerId: string;
  justification: string;
};

export type WithdrawOnboardingSubmissionInput = {
  tenantId: string;
  submissionId: string;
  actorId: string;
  reason: string;
};

const TERMINAL_STATUSES = new Set(['active', 'failed', 'rejected', 'withdrawn', 'archived']);

export async function createOnboardingSubmission(input: CreateOnboardingSubmissionInput): Promise<OnboardingSubmissionResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const manifestValidation = validateAgentManifest(input.manifest);
  const versionTarget = manifestValidation.valid ? manifestValidation.manifest.version : extractString(input.manifest, 'version') ?? 'invalid';
  const repoUrl = input.repoContext?.url ?? (manifestValidation.valid ? manifestValidation.manifest.repository?.url : undefined) ?? 'unknown';
  const commitSha = input.repoContext?.commit_sha ?? 'manual';

  const existing = await findExistingSubmission(input.tenantId, repoUrl, commitSha, versionTarget);
  if (existing) {
    return toResult(existing, true);
  }

  const submissionId = `sub-${uuidv4()}`;
  const agentId = `agent-${submissionId}`;
  const now = new Date().toISOString();
  const initialState = createOnboardingGraphState({
    tenantId: input.tenantId,
    submissionId,
    source: input.source,
    manifest: input.manifest,
    traceId: input.traceId,
  });
  const graphState = await runOnboardingGraph(initialState);
  const status = graphState.terminalStatus ?? graphState.currentStage;

  const submission = {
    id: submissionId,
    tenantId: input.tenantId,
    agentId,
    status,
    current_stage: graphState.currentStage,
    terminal_status: graphState.terminalStatus,
    source: input.source,
    manifest: manifestValidation.valid ? manifestValidation.manifest : input.manifest,
    version_target: versionTarget,
    repoUrl,
    commitSha,
    repo_context: {
      url: repoUrl,
      branch: input.repoContext?.branch ?? (manifestValidation.valid ? manifestValidation.manifest.repository?.branch : undefined) ?? 'main',
      commit_sha: commitSha,
      pr_number: input.repoContext?.pr_number,
      workflow_run_id: input.repoContext?.workflow_run_id,
    },
    risk_assessment: graphState.risk ? { tier: graphState.risk.tier, factors: graphState.risk.factors, computed_at: now } : undefined,
    approval: graphState.risk && graphState.risk.tier !== 'low'
      ? { required: true, status: 'pending' }
      : graphState.risk
        ? { required: false, decision: 'approved', decided_at: now, justification: 'Low-risk auto approval.' }
        : undefined,
    graph_state: graphState,
    stage_history: buildStageHistory(graphState, now),
    submittedAt: now,
    updatedAt: now,
  };

  await submissions.items.create(submission);
  await writeAuditEvent(input.tenantId, submissionId, 'onboarding.submission_created', input.actorId, {
    source: input.source,
    status,
    repoUrl,
    commitSha,
    versionTarget,
  });

  if (manifestValidation.valid && !graphState.terminalStatus) {
    await stageAgentCard(input.tenantId, submissionId, agentId, manifestValidation.manifest, graphState.risk?.tier ?? manifestValidation.manifest.riskTier, now);
    await writeAuditEvent(input.tenantId, submissionId, 'onboarding.agent_card_staged', 'onboarding-agent', {
      agentId,
      riskTier: graphState.risk?.tier ?? manifestValidation.manifest.riskTier,
    });
  }

  return toResult(submission);
}

export async function decideOnboardingApproval(input: DecideOnboardingApprovalInput): Promise<OnboardingSubmissionResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();
  if (!submission) {
    throw new Error(`Submission not found: ${input.submissionId}`);
  }
  if (TERMINAL_STATUSES.has(String(submission.status))) {
    throw new Error('Cannot decide approval for a terminal submission.');
  }
  if (String(submission.status) !== 'approval-pending') {
    throw new Error('Submission is not waiting for approval.');
  }

  const now = new Date().toISOString();
  const terminalStatus = input.decision === 'rejected' ? 'rejected' : undefined;
  const updated = {
    ...submission,
    status: input.decision,
    current_stage: input.decision,
    terminal_status: terminalStatus,
    approval: {
      ...(submission.approval ?? {}),
      required: true,
      decision: input.decision,
      reviewer_oid: input.reviewerId,
      justification: input.justification,
      decided_at: now,
    },
    stage_history: [...(submission.stage_history ?? []), { stage: input.decision, started_at: now, completed_at: now, outcome: input.decision, trace_id: submission.graph_state?.traceId }],
    updatedAt: now,
  };

  await submissions.items.upsert(updated);
  await writeAuditEvent(input.tenantId, input.submissionId, `onboarding.approval_${input.decision}`, input.reviewerId, {
    justification: input.justification,
  });

  return toResult(updated);
}

export async function withdrawOnboardingSubmission(input: WithdrawOnboardingSubmissionInput): Promise<OnboardingSubmissionResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();
  if (!submission) {
    throw new Error(`Submission not found: ${input.submissionId}`);
  }
  if (TERMINAL_STATUSES.has(String(submission.status))) {
    throw new Error('Cannot withdraw a terminal submission.');
  }

  const now = new Date().toISOString();
  const updated = {
    ...submission,
    status: 'withdrawn',
    current_stage: 'withdrawn',
    terminal_status: 'withdrawn',
    withdrawal: {
      actorId: input.actorId,
      reason: input.reason,
      withdrawn_at: now,
    },
    stage_history: [...(submission.stage_history ?? []), { stage: 'withdrawn', started_at: now, completed_at: now, outcome: 'withdrawn', trace_id: submission.graph_state?.traceId }],
    updatedAt: now,
  };

  await submissions.items.upsert(updated);
  await writeAuditEvent(input.tenantId, input.submissionId, 'onboarding.submission_withdrawn', input.actorId, { reason: input.reason });

  return toResult(updated);
}

async function findExistingSubmission(tenantId: string, repoUrl: string, commitSha: string, versionTarget: string): Promise<any | undefined> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resources } = await submissions.items.query<any>({
    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.repoUrl = @repoUrl AND c.commitSha = @commitSha AND c.version_target = @versionTarget',
    parameters: [
      { name: '@tenantId', value: tenantId },
      { name: '@repoUrl', value: repoUrl },
      { name: '@commitSha', value: commitSha },
      { name: '@versionTarget', value: versionTarget },
    ],
  }).fetchAll();

  return resources[0];
}

async function stageAgentCard(tenantId: string, submissionId: string, agentId: string, manifest: AgentManifest, riskTier: RiskTier, now: string): Promise<void> {
  const agentCards = await getContainer(CONTAINERS.AGENT_CARDS);
  await agentCards.items.upsert({
    id: agentId,
    tenantId,
    submissionId,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    owner: manifest.owner,
    runtime: manifest.runtime,
    capability_tags: manifest.capabilities,
    rai_tags: manifest.rai.tags,
    data_categories: manifest.rai.data_categories,
    risk_tier: riskTier,
    status: 'staging',
    repo: manifest.repository,
    lifecycle: {
      created_at: now,
      last_active_version: undefined,
    },
    updatedAt: now,
  });
}

async function writeAuditEvent(tenantId: string, submissionId: string, action: string, actorId: string, details: Record<string, unknown>): Promise<void> {
  const audit = await getContainer(CONTAINERS.AUDIT_LOG);
  await audit.items.create({
    id: uuidv4(),
    tenantId,
    action,
    targetId: submissionId,
    targetType: 'submission',
    actorId,
    actorType: actorId === 'onboarding-agent' ? 'agent' : 'workflow',
    outcome: 'success',
    timestamp: new Date().toISOString(),
    details,
  });
}

function buildStageHistory(graphState: OnboardingGraphState, now: string): Array<Record<string, string | undefined>> {
  return graphState.completedStages.map((stage) => ({
    stage,
    started_at: now,
    completed_at: now,
    outcome: 'success',
    trace_id: graphState.traceId,
  }));
}

function toResult(submission: any, idempotent?: boolean): OnboardingSubmissionResult {
  return {
    submissionId: String(submission.id),
    agentId: String(submission.agentId),
    status: String(submission.status),
    currentStage: String(submission.current_stage),
    riskTier: submission.risk_assessment?.tier,
    terminalStatus: submission.terminal_status,
    errors: submission.graph_state?.errors ?? [],
    idempotent,
  };
}

function extractString(value: unknown, field: string): string | undefined {
  if (value && typeof value === 'object' && field in value) {
    const candidate = (value as Record<string, unknown>)[field];
    return typeof candidate === 'string' ? candidate : undefined;
  }
  return undefined;
}