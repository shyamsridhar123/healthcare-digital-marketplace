const test = require('node:test');
const assert = require('node:assert/strict');
const { createOnboardingSubmission } = require('../dist/src/lib/onboarding/service.js');
const { openOnboardingGate, transitionOnboardingGate } = require('../dist/src/lib/onboarding/gate.js');
const { ingestOnboardingEvalReport } = require('../dist/src/lib/onboarding/eval-report.js');
const { activateSubmissionDeployment } = require('../dist/src/lib/onboarding/activation.js');
const { CONTAINERS, getContainer } = require('../dist/src/lib/cosmos/client.js');

const validManifest = {
  name: 'Eval Agent',
  version: '1.0.0',
  description: 'A low-risk agent used to verify eval report ingestion.',
  owner: { team: 'platform', email: 'platform@example.com' },
  runtime: { type: 'aca', image: 'contoso.azurecr.io/eval-agent:1.0.0' },
  capabilities: ['eval-test'],
  rai: { tags: [], data_categories: ['none'] },
  repository: { url: 'https://github.com/contoso/eval-agent', branch: 'main' },
};

async function createProvisioningSubmission(tenantId) {
  const submission = await createOnboardingSubmission({ tenantId, source: 'github-app-webhook', manifest: validManifest, actorId: 'github-actions' });
  await openOnboardingGate({ tenantId, submissionId: submission.submissionId, actorId: 'onboarding-agent', checkRunId: 'check-eval' });
  await transitionOnboardingGate({ tenantId, submissionId: submission.submissionId, actorId: 'onboarding-agent', targetStatus: 'success' });
  return submission;
}

test('ingestOnboardingEvalReport records passing eval evidence and moves to testing', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-eval-pass`;
    const submission = await createProvisioningSubmission(tenantId);

    const actual = await ingestOnboardingEvalReport({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      passCount: 9,
      failCount: 1,
      scoreDeltaVsPrior: 0,
      reportUrl: 'https://github.com/contoso/eval-agent/actions/runs/1/artifacts/eval-report',
    });

    assert.equal(actual.status, 'testing');
    assert.equal(actual.passed, true);

    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    const { resource: persisted } = await submissions.item(submission.submissionId, tenantId).read();
    assert.equal(persisted.eval_results.pass_count, 9);
    assert.equal(persisted.eval_results.passed, true);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('passing eval can continue to deployment activation', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-eval-activate`;
    const submission = await createProvisioningSubmission(tenantId);
    await ingestOnboardingEvalReport({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      passCount: 10,
      failCount: 0,
      scoreDeltaVsPrior: 0.01,
      reportUrl: 'https://github.com/contoso/eval-agent/actions/runs/3/artifacts/eval-report',
    });

    const actual = await activateSubmissionDeployment({
      tenantId,
      submissionId: submission.submissionId,
      deploymentOutputs: { endpointUrl: 'https://eval-agent.example.com/a2a' },
      actorId: 'github-actions',
    });

    assert.equal(actual.status, 'active');
    assert.equal(actual.submissionId, submission.submissionId);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('ingestOnboardingEvalReport fails submissions that miss thresholds', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-eval-fail`;
    const submission = await createProvisioningSubmission(tenantId);

    const actual = await ingestOnboardingEvalReport({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      passCount: 6,
      failCount: 4,
      scoreDeltaVsPrior: -0.03,
      reportUrl: 'https://github.com/contoso/eval-agent/actions/runs/2/artifacts/eval-report',
    });

    assert.equal(actual.status, 'failed');
    assert.equal(actual.terminalStatus, 'failed');
    assert.equal(actual.passed, false);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});