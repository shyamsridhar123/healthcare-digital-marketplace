const test = require('node:test');
const assert = require('node:assert/strict');
const { CONTAINERS, getContainer } = require('../dist/src/lib/cosmos/client.js');
const { listDomainRoutability } = require('../dist/src/lib/global-orchestrator/routability.js');

async function withInMemoryCosmos(callback) {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    await callback();
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
}

async function upsertAgent(agent) {
  const agents = await getContainer(CONTAINERS.A2A_AGENTS);
  await agents.items.upsert({
    id: agent.id,
    tenantId: agent.tenantId,
    agentCard: { name: agent.name ?? agent.id, description: 'Test agent', version: '1.0.0', url: 'https://example.com/a2a' },
    status: 'active',
    healthStatus: 'healthy',
    policyStatus: 'attached',
    evaluationStatus: 'passed',
    schemaValidationStatus: 'passed',
    owner: { team: 'claims-platform', email: 'claims@example.com' },
    updatedAt: '2026-05-13T00:00:00.000Z',
    ...agent,
  });
}

test('listDomainRoutability marks owned agents active only when required gates pass', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-routability-active`;
    await upsertAgent({ tenantId, id: 'agent-active' });

    const result = await listDomainRoutability({ tenantId, ownerTeam: 'claims-platform' });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].agentId, 'agent-active');
    assert.equal(result.items[0].status, 'active');
    assert.deepEqual(result.items[0].blockingGates, []);
  });
});

test('listDomainRoutability exposes owned staged AgentCards as not registered', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-routability-staged`;
    const cards = await getContainer(CONTAINERS.AGENT_CARDS);
    await cards.items.upsert({
      id: 'agent-staged',
      tenantId,
      name: 'Staged Agent',
      status: 'staging',
      owner: { team: 'claims-platform', email: 'claims@example.com' },
      updatedAt: '2026-05-13T00:00:00.000Z',
    });

    const result = await listDomainRoutability({ tenantId, ownerTeam: 'claims-platform' });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].agentId, 'agent-staged');
    assert.equal(result.items[0].status, 'not registered');
    assert.equal(result.items[0].nextAction.type, 'registration');
  });
});

test('listDomainRoutability does not assign ownerless direct registrations to domain authors', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-routability-ownerless`;
    await upsertAgent({ tenantId, id: 'agent-ownerless', owner: undefined });

    const authorResult = await listDomainRoutability({ tenantId, ownerTeam: 'claims-platform' });
    const operatorResult = await listDomainRoutability({ tenantId, includeOwnerless: true });

    assert.equal(authorResult.items.length, 0);
    assert.equal(operatorResult.items.length, 1);
    assert.equal(operatorResult.items[0].status, 'registration pending');
    assert.equal(operatorResult.items[0].blockingGates[0].gate, 'ownership');
  });
});

test('listDomainRoutability fails closed when health is unknown or unhealthy', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-routability-health`;
    await upsertAgent({ tenantId, id: 'agent-unhealthy', healthStatus: 'unhealthy' });

    const result = await listDomainRoutability({ tenantId, ownerTeam: 'claims-platform' });

    assert.equal(result.items[0].status, 'circuit open');
    assert.equal(result.items[0].blockingGates[0].gate, 'health');
  });
});