const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getAuthorizationContext,
  AuthError,
} = require('../dist/src/lib/auth/context.js');
const { hasPermission, PERMISSIONS } = require('../dist/src/lib/auth/permissions.js');

function requestWith({ headers = {}, query = {}, body = {} } = {}) {
  return {
    headers: new Headers(Object.entries(headers)),
    query: new URLSearchParams(query),
    json: async () => body,
  };
}

test('getAuthorizationContext fails closed without bearer token or explicit local fallback', async () => {
  const req = requestWith({
    headers: {
      'x-marketplace-dev-tenant': 'contoso',
      'x-marketplace-dev-user': 'operator@example.com',
      'x-marketplace-dev-roles': 'platform-operator',
    },
    query: { tenantId: 'contoso' },
  });

  await assert.rejects(
    () => getAuthorizationContext(req, { allowLocalDevFallback: false }),
    (err) => err instanceof AuthError && err.status === 401 && /bearer/i.test(err.message)
  );
});

test('getAuthorizationContext uses explicit local fallback and ignores caller tenant query', async () => {
  const req = requestWith({
    headers: {
      'x-marketplace-dev-tenant': 'contoso',
      'x-marketplace-dev-user': 'operator@example.com',
      'x-marketplace-dev-roles': 'platform-operator,tenant-admin',
      'x-marketplace-dev-owner-team': 'claims-platform',
      'x-marketplace-dev-owner-email': 'claims@example.com',
    },
    query: { tenantId: 'fabrikam' },
  });

  const context = await getAuthorizationContext(req, { allowLocalDevFallback: true });

  assert.equal(context.tenantId, 'contoso');
  assert.equal(context.userId, 'operator@example.com');
  assert.equal(context.ownerTeam, 'claims-platform');
  assert.equal(context.ownerEmail, 'claims@example.com');
  assert.deepEqual(context.roles.sort(), ['platform-operator', 'tenant-admin']);
  assert.equal(hasPermission(context, PERMISSIONS.COCKPIT_READ), true);
});

test('getAuthorizationContext derives context from verified bearer claims instead of spoofable headers', async () => {
  const req = requestWith({
    headers: {
      authorization: 'Bearer verified-token',
      'x-marketplace-dev-tenant': 'evil-tenant',
      'x-marketplace-dev-user': 'mallory@example.com',
      'x-marketplace-dev-roles': 'platform-operator',
    },
    query: { tenantId: 'evil-query' },
  });

  const context = await getAuthorizationContext(req, {
    allowLocalDevFallback: true,
    verifyBearerToken: async (token) => {
      assert.equal(token, 'verified-token');
      return {
        tid: 'contoso',
        oid: 'user-1',
        preferred_username: 'operator@example.com',
        roles: ['GlobalOrchestrator.Operator'],
        owner_team: 'claims-platform',
        owner_email: 'claims@example.com',
      };
    },
  });

  assert.equal(context.tenantId, 'contoso');
  assert.equal(context.userId, 'user-1');
  assert.deepEqual(context.roles, ['platform-operator']);
  assert.equal(context.displayName, 'operator@example.com');
  assert.equal(context.ownerTeam, 'claims-platform');
  assert.equal(context.ownerEmail, 'claims@example.com');
});

test('hasPermission denies ordinary viewers cockpit and handoff permissions', () => {
  const context = {
    tenantId: 'contoso',
    userId: 'viewer-1',
    roles: ['viewer'],
    authType: 'bearer',
  };

  assert.equal(hasPermission(context, PERMISSIONS.COCKPIT_READ), false);
  assert.equal(hasPermission(context, PERMISSIONS.POLICY_LAUNCH), false);
  assert.equal(hasPermission(context, PERMISSIONS.ROUTABILITY_READ), false);
});