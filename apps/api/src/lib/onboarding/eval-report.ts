import { v4 as uuidv4 } from 'uuid';
import { CONTAINERS, getContainer } from '../cosmos/client.js';

export type IngestOnboardingEvalReportInput = {
  tenantId: string;
  submissionId: string;
  actorId: string;
  passCount: number;
  failCount: number;
  scoreDeltaVsPrior: number;
  reportUrl: string;
};

export type IngestOnboardingEvalReportResult = {
  submissionId: string;
  status: 'testing' | 'failed';
  passed: boolean;
  terminalStatus?: 'failed';
};

export async function ingestOnboardingEvalReport(input: IngestOnboardingEvalReportInput): Promise<IngestOnboardingEvalReportResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();
  if (!submission) {
    throw new Error(`Submission not found: ${input.submissionId}`);
  }
  if (!['provisioning', 'testing'].includes(String(submission.status))) {
    throw new Error('Submission must be provisioning before eval ingestion.');
  }

  const total = input.passCount + input.failCount;
  const passRate = total === 0 ? 0 : input.passCount / total;
  const passed = passRate >= 0.8 && input.scoreDeltaVsPrior >= -0.02;
  const now = new Date().toISOString();
  const status = passed ? 'testing' : 'failed';
  const updated = {
    ...submission,
    status,
    current_stage: status,
    terminal_status: passed ? submission.terminal_status : 'failed',
    eval_results: {
      pass_count: input.passCount,
      fail_count: input.failCount,
      total,
      pass_rate: passRate,
      score_delta_vs_prior: input.scoreDeltaVsPrior,
      report_url: input.reportUrl,
      passed,
      ingested_at: now,
    },
    stage_history: [...(submission.stage_history ?? []), { stage: 'testing', started_at: now, completed_at: now, outcome: passed ? 'success' : 'failed', trace_id: submission.graph_state?.traceId }],
    updatedAt: now,
  };

  await submissions.items.upsert(updated);
  await writeAudit(input.tenantId, input.submissionId, input.actorId, passed, {
    passCount: input.passCount,
    failCount: input.failCount,
    scoreDeltaVsPrior: input.scoreDeltaVsPrior,
    reportUrl: input.reportUrl,
  });

  return {
    submissionId: input.submissionId,
    status,
    passed,
    terminalStatus: passed ? undefined : 'failed',
  };
}

async function writeAudit(tenantId: string, submissionId: string, actorId: string, passed: boolean, details: Record<string, unknown>): Promise<void> {
  const audit = await getContainer(CONTAINERS.AUDIT_LOG);
  await audit.items.create({
    id: uuidv4(),
    tenantId,
    action: passed ? 'onboarding.eval_passed' : 'onboarding.eval_failed',
    targetId: submissionId,
    targetType: 'submission',
    actorId,
    actorType: 'workflow',
    outcome: passed ? 'success' : 'failed',
    timestamp: new Date().toISOString(),
    details,
  });
}