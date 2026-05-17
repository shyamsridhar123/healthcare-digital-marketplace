import { CONTAINERS, getContainer } from '../cosmos/client.js';

export type ProvenanceVerificationInput = {
  tenantId: string;
  submissionId: string;
  actorId: string;
  issuer: string;
  subject: string;
  sourceSha: string;
  builderIdentity: string;
  attestationUrl: string;
  sbomUrl: string;
};

export type ScanFinding = {
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file_line?: string;
  message: string;
  remediation_url?: string;
};

export type ScanFindingsInput = {
  tenantId: string;
  submissionId: string;
  actorId: string;
  phiSuspected: boolean;
  findings: ScanFinding[];
};

export type EvidenceGateResult = {
  submissionId: string;
  status: 'verified' | 'accepted' | 'failed';
  terminalStatus?: 'failed';
  failures: string[];
};

const TERMINAL_STATUSES = new Set(['active', 'failed', 'rejected', 'withdrawn', 'archived']);

export async function verifyOnboardingProvenance(input: ProvenanceVerificationInput): Promise<EvidenceGateResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();
  if (!submission) throw new Error(`Submission not found: ${input.submissionId}`);
  if (TERMINAL_STATUSES.has(String(submission.status))) throw new Error('Cannot verify provenance for a terminal submission.');

  const failures = collectProvenanceFailures(submission, input);
  const now = new Date().toISOString();
  const terminalStatus = failures.length > 0 ? 'failed' : undefined;
  const status = failures.length > 0 ? 'failed' : 'verified';
  const updated = {
    ...submission,
    status: terminalStatus ?? submission.status,
    current_stage: terminalStatus ?? submission.current_stage,
    terminal_status: terminalStatus ?? submission.terminal_status,
    provenance: {
      verification_result: status,
      issuer: input.issuer,
      subject: input.subject,
      source_sha: input.sourceSha,
      builder_identity: input.builderIdentity,
      attestation_url: input.attestationUrl,
      sbom_url: input.sbomUrl,
      failures,
      verified_at: now,
    },
    stage_history: terminalStatus
      ? [...(submission.stage_history ?? []), { stage: 'provenance', started_at: now, completed_at: now, outcome: 'failed', trace_id: submission.graph_state?.traceId }]
      : submission.stage_history,
    updatedAt: now,
  };

  await submissions.items.upsert(updated);
  await writeEvidenceAudit(input.tenantId, input.submissionId, 'onboarding.provenance_verified', input.actorId, status, {
    issuer: input.issuer,
    sourceSha: input.sourceSha,
    failures,
    attestationUrl: input.attestationUrl,
    sbomUrl: input.sbomUrl,
  });

  return { submissionId: input.submissionId, status, terminalStatus, failures };
}

export async function ingestOnboardingScanFindings(input: ScanFindingsInput): Promise<EvidenceGateResult> {
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const { resource: submission } = await submissions.item(input.submissionId, input.tenantId).read<any>();
  if (!submission) throw new Error(`Submission not found: ${input.submissionId}`);
  if (TERMINAL_STATUSES.has(String(submission.status))) throw new Error('Cannot ingest scan findings for a terminal submission.');

  const failures = collectScanFailures(submission, input);
  const now = new Date().toISOString();
  const terminalStatus = failures.length > 0 ? 'failed' : undefined;
  const status = failures.length > 0 ? 'failed' : 'accepted';
  const updated = {
    ...submission,
    status: terminalStatus ?? submission.status,
    current_stage: terminalStatus ?? submission.current_stage,
    terminal_status: terminalStatus ?? submission.terminal_status,
    scan_evidence: {
      status,
      phi_suspected: input.phiSuspected,
      findings: input.findings,
      failures,
      ingested_at: now,
    },
    stage_history: terminalStatus
      ? [...(submission.stage_history ?? []), { stage: 'scan', started_at: now, completed_at: now, outcome: 'failed', trace_id: submission.graph_state?.traceId }]
      : submission.stage_history,
    updatedAt: now,
  };

  await submissions.items.upsert(updated);
  await writeEvidenceAudit(input.tenantId, input.submissionId, 'onboarding.scan_findings_ingested', input.actorId, status, {
    phiSuspected: input.phiSuspected,
    findingCount: input.findings.length,
    criticalCount: input.findings.filter((finding) => finding.severity === 'critical').length,
    failures,
  });

  return { submissionId: input.submissionId, status, terminalStatus, failures };
}

function collectProvenanceFailures(submission: any, input: ProvenanceVerificationInput): string[] {
  const failures: string[] = [];
  if (input.issuer !== 'token.actions.githubusercontent.com') failures.push('issuer');
  if (!input.subject.startsWith(expectedGitHubSubjectPrefix(submission))) failures.push('subject');
  if (String(submission.commitSha ?? submission.repo_context?.commit_sha ?? '') !== input.sourceSha) failures.push('source_sha');
  if (!input.builderIdentity.includes('github-actions')) failures.push('builder_identity');
  return failures;
}

function collectScanFailures(submission: any, input: ScanFindingsInput): string[] {
  const failures: string[] = [];
  if (input.findings.some((finding) => finding.severity === 'critical')) failures.push('critical_findings');

  const dataCategories = Array.isArray(submission.manifest?.rai?.data_categories)
    ? submission.manifest.rai.data_categories.map((category: unknown) => String(category).toLowerCase())
    : [];
  if (input.phiSuspected && !dataCategories.includes('phi')) failures.push('phi_unattested');
  return failures;
}

function expectedGitHubSubjectPrefix(submission: any): string {
  const repoUrl = String(submission.repoUrl ?? submission.repo_context?.url ?? '').replace(/\.git$/i, '');
  const match = repoUrl.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)$/i);
  return match ? `repo:${match[1]}:` : 'repo:';
}

async function writeEvidenceAudit(
  tenantId: string,
  submissionId: string,
  action: string,
  actorId: string,
  outcome: 'verified' | 'accepted' | 'failed',
  details: Record<string, unknown>
): Promise<void> {
  const audit = await getContainer(CONTAINERS.AUDIT_LOG);
  await audit.items.upsert({
    id: `${action}-${submissionId}`,
    tenantId,
    action,
    targetId: submissionId,
    targetType: 'submission',
    actorId,
    actorType: actorId === 'onboarding-agent' ? 'agent' : 'workflow',
    outcome,
    timestamp: new Date().toISOString(),
    details,
  });
}