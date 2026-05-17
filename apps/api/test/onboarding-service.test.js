const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createOnboardingSubmission,
  decideOnboardingApproval,
  withdrawOnboardingSubmission,
} = require('../dist/src/lib/onboarding/service.js');
const { CONTAINERS, getContainer } = require('../dist/src/lib/cosmos/client.js');

const validManifest = {
  name: 'Claims Copilot',
  version: '1.0.0',
  description: 'Assists claims analysts with document summarization and routing.',
  owner: { team: 'claims-platform', email: 'claims-platform@example.com' },
  runtime: { type: 'aca', image: 'contoso.azurecr.io/claims-copilot:1.0.0' },
  capabilities: ['claims-summary'],
  rai: { tags: ['human-in-the-loop'], data_categories: ['none'] },
  repository: { url: 'https://github.com/contoso/claims-copilot', branch: 'main' },
};

test('createOnboardingSubmission persists graph state and staging AgentCard', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-svc`;
    const actual = await createOnboardingSubmission({
      tenantId,
      source: 'github-app-webhook',
      manifest: validManifest,
      repoContext: {
        url: 'https://github.com/contoso/claims-copilot',
        branch: 'main',
        commit_sha: 'abc123',
        workflow_run_id: '987',
      },
      actorId: 'github-actions',
    });

    assert.equal(actual.status, 'approved');
    assert.equal(actual.currentStage, 'approved');
    assert.equal(actual.riskTier, 'low');

    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    const { resource: submission } = await submissions.item(actual.submissionId, tenantId).read();
    assert.equal(submission.status, 'approved');
    assert.equal(submission.current_stage, 'approved');
    assert.equal(submission.graph_state.completedStages.includes('validate_manifest'), true);
    assert.equal(submission.graph_state.completedStages.includes('classify_risk'), true);
    assert.equal(submission.agentId, actual.agentId);

    const agentCards = await getContainer(CONTAINERS.AGENT_CARDS);
    const { resource: agentCard } = await agentCards.item(actual.agentId, tenantId).read();
    assert.equal(agentCard.status, 'staging');
    assert.equal(agentCard.name, validManifest.name);
    assert.equal(agentCard.risk_tier, 'low');

    const audit = await getContainer(CONTAINERS.AUDIT_LOG);
    const { resources: auditEntries } = await audit.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.targetId = @targetId',
      parameters: [{ name: '@tenantId', value: tenantId }, { name: '@targetId', value: actual.submissionId }],
    }).fetchAll();
    assert.equal(auditEntries.some((entry) => entry.action === 'onboarding.submission_created'), true);
    assert.equal(auditEntries.some((entry) => entry.action === 'onboarding.agent_card_staged'), true);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('createOnboardingSubmission is idempotent for repo commit and version', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-idempotent`;
    const input = {
      tenantId,
      source: 'github-app-webhook',
      manifest: validManifest,
      repoContext: {
        url: 'https://github.com/contoso/claims-copilot',
        branch: 'main',
        commit_sha: 'same-sha',
        workflow_run_id: '222',
      },
      actorId: 'github-actions',
    };

    const first = await createOnboardingSubmission(input);
    const second = await createOnboardingSubmission(input);

    assert.equal(second.submissionId, first.submissionId);
    assert.equal(second.agentId, first.agentId);
    assert.equal(second.idempotent, true);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('createOnboardingSubmission records validation failure without staging AgentCard', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-invalid`;
    const actual = await createOnboardingSubmission({
      tenantId,
      source: 'cli',
      manifest: { ...validManifest, version: 'not-semver' },
      actorId: 'engineer-1',
    });

    assert.equal(actual.status, 'failed');
    assert.equal(actual.terminalStatus, 'failed');
    assert.equal(actual.errors.some((error) => error.path === '/version'), true);

    const agentCards = await getContainer(CONTAINERS.AGENT_CARDS);
    const { resources: cards } = await agentCards.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.submissionId = @submissionId',
      parameters: [{ name: '@tenantId', value: tenantId }, { name: '@submissionId', value: actual.submissionId }],
    }).fetchAll();
    assert.equal(cards.length, 0);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('decideOnboardingApproval approves and rejects approval-pending submissions', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-approval`;
    const highRisk = {
      ...validManifest,
      rai: { tags: ['phi-handler'], data_categories: ['phi'] },
    };
    const pending = await createOnboardingSubmission({ tenantId, source: 'portal', manifest: highRisk, actorId: 'engineer-1' });
    assert.equal(pending.status, 'approval-pending');

    const approved = await decideOnboardingApproval({
      tenantId,
      submissionId: pending.submissionId,
      decision: 'approved',
      reviewerId: 'reviewer-1',
      justification: 'PHI attested and controls accepted.',
    });

    assert.equal(approved.status, 'approved');

    const rejectedPending = await createOnboardingSubmission({
      tenantId,
      source: 'portal',
      manifest: { ...highRisk, version: '1.0.1' },
      repoContext: { url: 'https://github.com/contoso/claims-copilot', branch: 'main', commit_sha: 'reject-sha' },
      actorId: 'engineer-1',
    });
    const rejected = await decideOnboardingApproval({
      tenantId,
      submissionId: rejectedPending.submissionId,
      decision: 'rejected',
      reviewerId: 'reviewer-2',
      justification: 'Missing PHI mitigation evidence.',
    });

    assert.equal(rejected.status, 'rejected');
    assert.equal(rejected.terminalStatus, 'rejected');
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('withdrawOnboardingSubmission makes non-terminal submissions immutable terminal withdrawals', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-withdraw`;
    const pending = await createOnboardingSubmission({
      tenantId,
      source: 'portal',
      manifest: { ...validManifest, rai: { tags: [], data_categories: ['pii'] } },
      actorId: 'engineer-1',
    });

    const withdrawn = await withdrawOnboardingSubmission({
      tenantId,
      submissionId: pending.submissionId,
      actorId: 'engineer-1',
      reason: 'Need to update eval set.',
    });

    assert.equal(withdrawn.status, 'withdrawn');
    assert.equal(withdrawn.terminalStatus, 'withdrawn');

    await assert.rejects(
      () => withdrawOnboardingSubmission({ tenantId, submissionId: pending.submissionId, actorId: 'engineer-1', reason: 'again' }),
      /terminal/
    );
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});