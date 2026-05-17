const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { createOnboardingSubmission } = require('../dist/src/lib/onboarding/service.js');
const { verifyOnboardingProvenance, ingestOnboardingScanFindings } = require('../dist/src/lib/onboarding/evidence.js');
const { openOnboardingGate, transitionOnboardingGate } = require('../dist/src/lib/onboarding/gate.js');
const { ingestOnboardingEvalReport } = require('../dist/src/lib/onboarding/eval-report.js');
const { activateSubmissionDeployment } = require('../dist/src/lib/onboarding/activation.js');

const manifest = {
  name: 'Bench Agent',
  version: '1.0.0',
  description: 'A complete happy-path onboarding benchmark agent.',
  owner: { team: 'platform', email: 'platform@example.com' },
  runtime: { type: 'aca', image: 'contoso.azurecr.io/bench-agent:1.0.0' },
  capabilities: ['bench'],
  rai: { tags: [], data_categories: ['none'] },
  repository: { url: 'https://github.com/contoso/bench-agent', branch: 'main' },
};

test('onboarding pipeline happy path completes within local bench threshold', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const started = performance.now();
    const tenantId = `tenant-${Date.now()}-bench`;
    const submission = await createOnboardingSubmission({
      tenantId,
      source: 'github-app-webhook',
      manifest,
      repoContext: { url: manifest.repository.url, branch: 'main', commit_sha: 'sha-bench', workflow_run_id: 'run-bench' },
      actorId: 'github-actions',
    });

    assert.equal(submission.status, 'approved');

    await verifyOnboardingProvenance({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      issuer: 'token.actions.githubusercontent.com',
      subject: 'repo:contoso/bench-agent:ref:refs/heads/main',
      sourceSha: 'sha-bench',
      builderIdentity: 'github-actions',
      attestationUrl: 'https://github.com/contoso/bench-agent/actions/runs/1',
      sbomUrl: 'https://github.com/contoso/bench-agent/actions/runs/1/artifacts/sbom',
    });
    await ingestOnboardingScanFindings({ tenantId, submissionId: submission.submissionId, actorId: 'github-actions', phiSuspected: false, findings: [] });
    await openOnboardingGate({ tenantId, submissionId: submission.submissionId, actorId: 'github-actions', checkRunId: 'check-bench' });
    await transitionOnboardingGate({ tenantId, submissionId: submission.submissionId, actorId: 'github-actions', targetStatus: 'success' });
    await ingestOnboardingEvalReport({ tenantId, submissionId: submission.submissionId, actorId: 'github-actions', passCount: 10, failCount: 0, scoreDeltaVsPrior: 0, reportUrl: 'https://github.com/contoso/bench-agent/actions/runs/1/artifacts/eval-report' });

    const activation = await activateSubmissionDeployment({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      deploymentOutputs: { endpointUrl: 'https://bench-agent.example.com/a2a' },
    });

    const elapsedMs = performance.now() - started;
    assert.equal(activation.status, 'active');
    assert.ok(elapsedMs < 1500, `local onboarding pipeline should complete quickly, took ${elapsedMs}ms`);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('onboarding pipeline sad path stops invalid manifests before side effects', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-bench-sad`;
    const submission = await createOnboardingSubmission({
      tenantId,
      source: 'github-app-webhook',
      manifest: { name: 'Invalid Agent' },
      repoContext: { url: 'https://github.com/contoso/invalid-agent', branch: 'main', commit_sha: 'sha-invalid' },
      actorId: 'github-actions',
    });

    assert.equal(submission.terminalStatus, 'failed');
    assert.equal(submission.currentStage, 'failed');
    assert.ok(submission.errors.length > 0);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});