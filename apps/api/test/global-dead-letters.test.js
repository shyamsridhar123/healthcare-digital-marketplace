const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDeadLetterDescriptor } = require('../dist/src/lib/global-orchestrator/dead-letters.js');

test('buildDeadLetterDescriptor creates minimized internal follow-through links', () => {
  const descriptor = buildDeadLetterDescriptor({
    tenantId: 'contoso',
    traceId: 'trace-123',
    stage: 'global-pre-flight',
    failureCategory: 'timeout',
    retryEligible: false,
    expiresAt: '2026-05-14T00:00:00.000Z',
  });

  assert.equal(descriptor.type, 'dead-letter');
  assert.equal(descriptor.href, '/global-orchestrator/trace-123?panel=dead-letter');
  assert.equal(descriptor.requiredPermission, 'dead-letter:status');
  assert.equal(descriptor.state, 'available');
  assert.equal(descriptor.metadata.failureCategory, 'timeout');
  assert.equal(descriptor.metadata.retryEligible, false);
});

test('buildDeadLetterDescriptor rejects raw envelope and payload fields', () => {
  assert.throws(
    () => buildDeadLetterDescriptor({
      tenantId: 'contoso',
      traceId: 'trace-123',
      stage: 'routing',
      failureCategory: 'binding-failed',
      retryEligible: true,
      rawEnvelope: { secret: 'nope' },
    }),
    /raw/i
  );
});