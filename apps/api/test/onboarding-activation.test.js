const test = require('node:test');
const assert = require('node:assert/strict');
const { activateSubmissionDeployment } = require('../dist/src/lib/onboarding/activation.js');
const { CONTAINERS, getContainer } = require('../dist/src/lib/cosmos/client.js');

test('activateSubmissionDeployment writes active AgentCard projections and updates submission', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}`;
    const submissionId = `sub-${Date.now()}`;
    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    await submissions.items.create({
      id: submissionId,
      tenantId,
      status: 'approved',
      assetName: 'Claims Copilot',
      type: 'Agent',
      description: 'Assists claims analysts with document summarization and routing.',
      version: '1.0.0',
      capabilities: ['claims-summary'],
      rai: { tags: ['human-in-the-loop'], data_categories: ['pii'] },
      submittedAt: new Date().toISOString(),
    });

    const actual = await activateSubmissionDeployment({
      submissionId,
      tenantId,
      deploymentOutputs: {
        endpointUrl: 'https://claims-copilot.example.com/a2a',
        resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.App/containerApps/claims-copilot',
      },
      actorId: 'github-actions',
    });

    assert.equal(actual.status, 'active');
    assert.equal(actual.submissionId, submissionId);
    assert.ok(actual.agentId);

    const agents = await getContainer(CONTAINERS.A2A_AGENTS);
    const { resources: activeAgents } = await agents.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.id = @id',
      parameters: [{ name: '@tenantId', value: tenantId }, { name: '@id', value: actual.agentId }],
    }).fetchAll();
    assert.equal(activeAgents.length, 1);
    assert.equal(activeAgents[0].status, 'active');
    assert.equal(activeAgents[0].agentCard.url, 'https://claims-copilot.example.com/a2a');

    const { resource: updatedSubmission } = await submissions.item(submissionId, tenantId).read();
    assert.equal(updatedSubmission.status, 'active');
    assert.equal(updatedSubmission.agentId, actual.agentId);

    const agentCards = await getContainer(CONTAINERS.AGENT_CARDS);
    const { resource: agentCardProjection } = await agentCards.item(actual.agentId, tenantId).read();
    assert.equal(agentCardProjection.status, 'active');
    assert.equal(agentCardProjection.submissionId, submissionId);
    assert.equal(agentCardProjection.risk_tier, 'medium');
    assert.equal(agentCardProjection.deploymentOutputs.endpointUrl, 'https://claims-copilot.example.com/a2a');
    assert.ok(agentCardProjection.lifecycle.activated_at);

    const reindexRequests = await getContainer(CONTAINERS.SEARCH_REINDEX_REQUESTS);
    const { resource: reindexRequest } = await reindexRequests.item(`reindex-${submissionId}`, tenantId).read();
    assert.equal(reindexRequest.status, 'pending');
    assert.equal(reindexRequest.agentId, actual.agentId);
    assert.equal(reindexRequest.reason, 'agent-activated');

    const audit = await getContainer(CONTAINERS.AUDIT_LOG);
    const { resources: auditEntries } = await audit.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.action = @action AND c.targetId = @targetId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@action', value: 'onboarding.agent_card_activated' },
        { name: '@targetId', value: submissionId },
      ],
    }).fetchAll();
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0].details.agentId, actual.agentId);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('activateSubmissionDeployment is idempotent after a successful activation', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-retry`;
    const submissionId = `sub-${Date.now()}-retry`;
    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    await submissions.items.create({
      id: submissionId,
      tenantId,
      status: 'approved',
      assetName: 'Retry Agent',
      type: 'Agent',
      description: 'A retry-safe agent activation test submission.',
      version: '1.0.0',
      capabilities: ['retry'],
      rai: { tags: [], data_categories: ['none'] },
      network: { egress: true },
      submittedAt: new Date().toISOString(),
    });

    const input = {
      submissionId,
      tenantId,
      deploymentOutputs: { endpointUrl: 'https://retry-agent.example.com/a2a' },
      actorId: 'github-actions',
    };

    const first = await activateSubmissionDeployment(input);
    const second = await activateSubmissionDeployment(input);

    assert.deepEqual(second, first);

    const agents = await getContainer(CONTAINERS.A2A_AGENTS);
    const { resources: activeAgents } = await agents.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.submissionId = @submissionId',
      parameters: [{ name: '@tenantId', value: tenantId }, { name: '@submissionId', value: submissionId }],
    }).fetchAll();
    assert.equal(activeAgents.length, 1);
    assert.equal(activeAgents[0].id, first.agentId);

    const agentCards = await getContainer(CONTAINERS.AGENT_CARDS);
    const { resources: activeCards } = await agentCards.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.submissionId = @submissionId',
      parameters: [{ name: '@tenantId', value: tenantId }, { name: '@submissionId', value: submissionId }],
    }).fetchAll();
    assert.equal(activeCards.length, 1);
    assert.equal(activeCards[0].id, first.agentId);
    assert.equal(activeCards[0].risk_tier, 'medium');

    const audit = await getContainer(CONTAINERS.AUDIT_LOG);
    const { resources: auditEntries } = await audit.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.action = @action AND c.targetId = @targetId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@action', value: 'onboarding.agent_card_activated' },
        { name: '@targetId', value: submissionId },
      ],
    }).fetchAll();
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0].details.agentId, first.agentId);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('activateSubmissionDeployment rejects unapproved submissions', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-blocked`;
    const submissionId = `sub-${Date.now()}-blocked`;
    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    await submissions.items.create({ id: submissionId, tenantId, status: 'submitted', assetName: 'Blocked Agent', type: 'Agent', version: '1.0.0' });

    await assert.rejects(
      () => activateSubmissionDeployment({
        submissionId,
        tenantId,
        deploymentOutputs: { endpointUrl: 'https://blocked.example.com/a2a' },
        actorId: 'github-actions',
      }),
      /approved, provisioning, or testing/
    );

    const { resource: unchangedSubmission } = await submissions.item(submissionId, tenantId).read();
    assert.equal(unchangedSubmission.status, 'submitted');
    assert.equal(unchangedSubmission.agentId, undefined);
    assert.equal(unchangedSubmission.deploymentOutputs, undefined);

    const agents = await getContainer(CONTAINERS.A2A_AGENTS);
    const { resources: activeAgents } = await agents.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.submissionId = @submissionId',
      parameters: [{ name: '@tenantId', value: tenantId }, { name: '@submissionId', value: submissionId }],
    }).fetchAll();
    assert.equal(activeAgents.length, 0);

    const agentCards = await getContainer(CONTAINERS.AGENT_CARDS);
    const { resources: activeCards } = await agentCards.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.submissionId = @submissionId',
      parameters: [{ name: '@tenantId', value: tenantId }, { name: '@submissionId', value: submissionId }],
    }).fetchAll();
    assert.equal(activeCards.length, 0);

    const audit = await getContainer(CONTAINERS.AUDIT_LOG);
    const { resources: auditEntries } = await audit.items.query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.action = @action AND c.targetId = @targetId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@action', value: 'onboarding.agent_card_activated' },
        { name: '@targetId', value: submissionId },
      ],
    }).fetchAll();
    assert.equal(auditEntries.length, 0);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});