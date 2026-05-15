const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPolicyLaunchContext,
} = require('../dist/src/lib/policy/launch-context.js');

test('createPolicyLaunchContext derives tenant from auth context and preserves safe Global Orchestrator concern', () => {
  const context = createPolicyLaunchContext({
    auth: { tenantId: 'contoso', userId: 'operator-1', roles: ['platform-operator'], authType: 'bearer' },
    concern: 'global-pre-flight',
    scope: { target: 'tenant' },
    source: { traceId: 'trace-123', decisionId: 'decision-1' },
    returnTo: '/global-orchestrator/trace-123',
  });

  assert.equal(context.tenantId, 'contoso');
  assert.equal(context.concern, 'global-pre-flight');
  assert.equal(context.returnTo, '/global-orchestrator/trace-123');
  assert.equal(context.source.traceId, 'trace-123');
});

test('createPolicyLaunchContext rejects external return URLs', () => {
  assert.throws(
    () => createPolicyLaunchContext({
      auth: { tenantId: 'contoso', userId: 'operator-1', roles: ['platform-operator'], authType: 'bearer' },
      concern: 'global-routing',
      scope: { target: 'domain', domainId: 'claims' },
      returnTo: 'https://evil.example.com/callback',
    }),
    /return/i
  );
});

test('createPolicyLaunchContext rejects caller supplied tenant mismatch', () => {
  assert.throws(
    () => createPolicyLaunchContext({
      auth: { tenantId: 'contoso', userId: 'operator-1', roles: ['platform-operator'], authType: 'bearer' },
      tenantId: 'fabrikam',
      concern: 'asset',
      scope: { target: 'asset', assetId: 'agent-1' },
      returnTo: '/global-orchestrator/agents',
    }),
    /tenant/i
  );
});

test('createPolicyLaunchContext requires policy launch permission', () => {
  assert.throws(
    () => createPolicyLaunchContext({
      auth: { tenantId: 'contoso', userId: 'viewer-1', roles: ['viewer'], authType: 'bearer' },
      concern: 'tenant',
      scope: { target: 'tenant' },
      returnTo: '/global-orchestrator',
    }),
    /permission/i
  );
});