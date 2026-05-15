const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getGlobalExecutionRecord,
  listGlobalExecutionRecords,
  upsertGlobalStageEvent,
} = require('../dist/src/lib/global-orchestrator/execution-records.js');

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

function event(overrides = {}) {
  return {
    tenantId: 'tenant-global-records',
    traceId: `trace-${Date.now()}`,
    stage: 'global-pre-flight',
    status: 'running',
    occurredAt: new Date().toISOString(),
    idempotencyKey: `event-${Math.random()}`,
    writer: { type: 'api', id: 'test-writer' },
    ...overrides,
  };
}

test('upsertGlobalStageEvent builds a tenant-scoped stage projection', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-projection`;
    const traceId = `trace-${Date.now()}-projection`;

    await upsertGlobalStageEvent(event({ tenantId, traceId, stage: 'intake', status: 'completed', idempotencyKey: 'evt-1' }));
    await upsertGlobalStageEvent(event({ tenantId, traceId, stage: 'global-pre-flight', status: 'running', idempotencyKey: 'evt-2' }));

    const record = await getGlobalExecutionRecord({ tenantId, traceId });

    assert.equal(record.tenantId, tenantId);
    assert.equal(record.traceId, traceId);
    assert.equal(record.currentStage, 'global-pre-flight');
    assert.equal(record.stageStatuses.intake.status, 'completed');
    assert.equal(record.stageStatuses['global-pre-flight'].status, 'running');
    assert.equal(record.eventIds.length, 2);
  });
});

test('upsertGlobalStageEvent is idempotent by event key', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-idempotent`;
    const traceId = `trace-${Date.now()}-idempotent`;
    const stageEvent = event({ tenantId, traceId, idempotencyKey: 'same-event' });

    await upsertGlobalStageEvent(stageEvent);
    await upsertGlobalStageEvent({ ...stageEvent, status: 'completed' });

    const record = await getGlobalExecutionRecord({ tenantId, traceId });
    assert.equal(record.eventIds.length, 1);
    assert.equal(record.stageStatuses['global-pre-flight'].status, 'running');
  });
});

test('listGlobalExecutionRecords returns tenant-scoped pages with continuation tokens', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-paging`;
    const otherTenantId = `${tenantId}-other`;

    await upsertGlobalStageEvent(event({ tenantId, traceId: 'trace-a', idempotencyKey: 'page-a', occurredAt: '2026-05-13T00:00:00.000Z' }));
    await upsertGlobalStageEvent(event({ tenantId, traceId: 'trace-b', idempotencyKey: 'page-b', occurredAt: '2026-05-13T00:01:00.000Z' }));
    await upsertGlobalStageEvent(event({ tenantId, traceId: 'trace-c', idempotencyKey: 'page-c', occurredAt: '2026-05-13T00:02:00.000Z' }));
    await upsertGlobalStageEvent(event({ tenantId: otherTenantId, traceId: 'trace-d', idempotencyKey: 'page-d' }));

    const firstPage = await listGlobalExecutionRecords({ tenantId, pageSize: 2 });
    const secondPage = await listGlobalExecutionRecords({ tenantId, pageSize: 2, continuationToken: firstPage.continuationToken });

    assert.equal(firstPage.items.length, 2);
    assert.equal(typeof firstPage.continuationToken, 'string');
    assert.deepEqual(firstPage.items.map((item) => item.traceId), ['trace-c', 'trace-b']);
    assert.deepEqual(secondPage.items.map((item) => item.traceId), ['trace-a']);
  });
});

test('upsertGlobalStageEvent rejects raw payload fields', async () => {
  await withInMemoryCosmos(async () => {
    await assert.rejects(
      () => upsertGlobalStageEvent(event({ rawPayload: { patientName: 'Ada Lovelace' } })),
      /raw payload/i
    );
  });
});

test('upsertGlobalStageEvent does not regress terminal execution state with late events', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-terminal`;
    const traceId = `trace-${Date.now()}-terminal`;

    await upsertGlobalStageEvent(event({ tenantId, traceId, stage: 'completed', status: 'completed', occurredAt: '2026-05-13T00:10:00.000Z', idempotencyKey: 'terminal' }));
    await upsertGlobalStageEvent(event({ tenantId, traceId, stage: 'routing', status: 'running', occurredAt: '2026-05-13T00:02:00.000Z', idempotencyKey: 'late-routing' }));

    const record = await getGlobalExecutionRecord({ tenantId, traceId });
    assert.equal(record.currentStage, 'completed');
    assert.equal(record.updatedAt, '2026-05-13T00:10:00.000Z');
    assert.equal(record.stageStatuses.routing.status, 'running');
  });
});

test('upsertGlobalStageEvent scrubs safe summaries and link metadata before persistence', async () => {
  await withInMemoryCosmos(async () => {
    const tenantId = `tenant-${Date.now()}-scrub`;
    const traceId = `trace-${Date.now()}-scrub`;

    await upsertGlobalStageEvent(event({
      tenantId,
      traceId,
      idempotencyKey: 'scrubbed',
      safeDomainSummary: { note: 'member SSN 123-45-6789', nested: { email: 'phi.case@example.org' } },
      linkDescriptors: [{ type: 'dead-letter', href: `/dead-letter?traceId=${traceId}`, requiredPermission: 'dead-letter:status', metadata: { phone: '212-555-0188' } }],
    }));

    const record = await getGlobalExecutionRecord({ tenantId, traceId });
    assert.equal(record.safeDomainSummary.note.includes('123-45-6789'), false);
    assert.equal(record.safeDomainSummary.nested.email.includes('phi.case@example.org'), false);
    assert.equal(record.linkDescriptors[0].metadata.phone.includes('212-555-0188'), false);
  });
});

test('upsertGlobalStageEvent rejects external follow-through links', async () => {
  await withInMemoryCosmos(async () => {
    await assert.rejects(
      () => upsertGlobalStageEvent(event({ linkDescriptors: [{ type: 'policy', href: 'https://evil.example/policy', requiredPermission: 'policy:launch' }] })),
      /internal routes/i
    );
  });
});