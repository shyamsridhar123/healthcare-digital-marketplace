import { CONTAINERS, getContainer } from '../cosmos/client.js';

export type OpenOnboardingGateInput = {
  tenantId: string;
  submissionId: string;
  actorId: string;
  checkRunId: string;
};

export type TransitionOnboardingGateInput = {
  tenantId: string;
  submissionId: string;
  actorId: string;
  targetStatus: 'success' | 'failure';
};

export type OnboardingGateResult = {
  submissionId: string;
  status: string;
  gateStatus: string;
  checkRunId?: string;
};

export async function openOnboardingGate(input: OpenOnboardingGateInput): Promise<OnboardingGateResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();
  if (!submission) {
    throw new Error(`Submission not found: ${input.submissionId}`);
  }
  if (submission.status !== 'approved') {
    throw new Error('Submission must be approved before opening the onboarding gate.');
  }

  if (submission.gate_check_run?.status === 'waiting') {
    return toGateResult(submission);
  }

  const now = new Date().toISOString();
  const updated = {
    ...submission,
    gate_check_run: {
      github_check_run_id: input.checkRunId,
      status: 'waiting',
      transitioned_at: now,
    },
    updatedAt: now,
  };

  await submissions.items.upsert(updated);
  await writeGateAudit(input.tenantId, input.submissionId, 'onboarding.gate_opened', input.actorId, {
    checkRunId: input.checkRunId,
    gateStatus: 'waiting',
  });

  return toGateResult(updated);
}

export async function transitionOnboardingGate(input: TransitionOnboardingGateInput): Promise<OnboardingGateResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();
  if (!submission) {
    throw new Error(`Submission not found: ${input.submissionId}`);
  }

  if (submission.gate_check_run?.status === input.targetStatus) {
    return toGateResult(submission);
  }
  if (!['approved', 'provisioning'].includes(String(submission.status))) {
    throw new Error('Submission must be approved before transitioning the onboarding gate.');
  }

  const now = new Date().toISOString();
  const status = input.targetStatus === 'success' ? 'provisioning' : 'failed';
  const terminalStatus = input.targetStatus === 'failure' ? 'failed' : submission.terminal_status;
  const updated = {
    ...submission,
    status,
    current_stage: status,
    terminal_status: terminalStatus,
    gate_check_run: {
      ...(submission.gate_check_run ?? {}),
      status: input.targetStatus,
      transitioned_at: now,
    },
    stage_history: [...(submission.stage_history ?? []), { stage: 'provisioning_gate', started_at: now, completed_at: now, outcome: input.targetStatus, trace_id: submission.graph_state?.traceId }],
    updatedAt: now,
  };

  await submissions.items.upsert(updated);
  await writeGateAudit(input.tenantId, input.submissionId, 'onboarding.gate_transitioned', input.actorId, {
    checkRunId: updated.gate_check_run.github_check_run_id,
    gateStatus: input.targetStatus,
    status,
  });

  return toGateResult(updated);
}

async function writeGateAudit(tenantId: string, submissionId: string, action: string, actorId: string, details: Record<string, unknown>): Promise<void> {
  const audit = await getContainer(CONTAINERS.AUDIT_LOG);
  await audit.items.upsert({
    id: `${action}-${submissionId}`,
    tenantId,
    action,
    targetId: submissionId,
    targetType: 'submission',
    actorId,
    actorType: 'agent',
    outcome: 'success',
    timestamp: new Date().toISOString(),
    details,
  });
}

function toGateResult(submission: any): OnboardingGateResult {
  return {
    submissionId: String(submission.id),
    status: String(submission.status),
    gateStatus: String(submission.gate_check_run?.status ?? 'not-open'),
    checkRunId: submission.gate_check_run?.github_check_run_id,
  };
}