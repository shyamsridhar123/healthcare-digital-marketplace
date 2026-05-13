const test = require('node:test');
const assert = require('node:assert/strict');
const { createOnboardingSubmission } = require('../dist/src/lib/onboarding/service.js');
const { openOnboardingGate, transitionOnboardingGate } = require('../dist/src/lib/onboarding/gate.js');
const { CONTAINERS, getContainer } = require('../dist/src/lib/cosmos/client.js');

const validManifest = {
  name: 'Gate Agent',
  version: '1.0.0',
  description: 'A low-risk agent used to verify onboarding gate transitions.',
  owner: { team: 'platform', email: 'platform@example.com' },
  runtime: { type: 'aca', image: 'contoso.azurecr.io/gate-agent:1.0.0' },
  capabilities: ['gate-test'],
  rai: { tags: [], data_categories: ['none'] },
  repository: { url: 'https://github.com/contoso/gate-agent', branch: 'main' },
};

test('openOnboardingGate records a waiting check-run gate for approved submissions', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-gate-open`;
    const submission = await createOnboardingSubmission({ tenantId, source: 'github-app-webhook', manifest: validManifest, actorId: 'github-actions' });

    const actual = await openOnboardingGate({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'onboarding-agent',
      checkRunId: 'check-123',
    });

    assert.equal(actual.status, 'approved');
    assert.equal(actual.gateStatus, 'waiting');
    assert.equal(actual.checkRunId, 'check-123');

    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    const { resource: persisted } = await submissions.item(submission.submissionId, tenantId).read();
    assert.equal(persisted.gate_check_run.status, 'waiting');
    assert.equal(persisted.gate_check_run.github_check_run_id, 'check-123');
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('transitionOnboardingGate moves approved gate to provisioning idempotently', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-gate-transition`;
    const submission = await createOnboardingSubmission({ tenantId, source: 'github-app-webhook', manifest: validManifest, actorId: 'github-actions' });
    await openOnboardingGate({ tenantId, submissionId: submission.submissionId, actorId: 'onboarding-agent', checkRunId: 'check-456' });

    const first = await transitionOnboardingGate({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'onboarding-agent',
      targetStatus: 'success',
    });
    const second = await transitionOnboardingGate({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'onboarding-agent',
      targetStatus: 'success',
    });

    assert.equal(first.status, 'provisioning');
    assert.deepEqual(second, first);

    const audit = await getContainer(CONTAINERS.AUDIT_LOG);
    const { resources } = await audit.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.action = @action AND c.targetId = @targetId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@action', value: 'onboarding.gate_transitioned' },
        { name: '@targetId', value: submission.submissionId },
      ],
    }).fetchAll();
    assert.equal(resources.length, 1);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('openOnboardingGate rejects unapproved submissions', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-gate-blocked`;
    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    await submissions.items.create({ id: 'sub-blocked', tenantId, status: 'approval-pending', current_stage: 'approval-pending' });

    await assert.rejects(
      () => openOnboardingGate({ tenantId, submissionId: 'sub-blocked', actorId: 'onboarding-agent', checkRunId: 'check-789' }),
      /approved/
    );
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});