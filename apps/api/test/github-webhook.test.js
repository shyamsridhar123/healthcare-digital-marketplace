const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  buildSha256BodyHash,
  buildSanitizedGitHubWebhookEvent,
  isSupportedGitHubWebhook,
  verifyGitHubWebhookSignature,
} = require('../dist/src/lib/onboarding/github-webhook.js');

function signature(secret, body) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

test('verifyGitHubWebhookSignature accepts valid sha256 HMAC and rejects tampering', () => {
  const secret = 'webhook-secret';
  const body = Buffer.from(JSON.stringify({ action: 'completed' }));

  assert.equal(verifyGitHubWebhookSignature(secret, body, signature(secret, body)), true);
  assert.equal(verifyGitHubWebhookSignature(secret, Buffer.from('{"action":"edited"}'), signature(secret, body)), false);
  assert.equal(verifyGitHubWebhookSignature(secret, body, 'sha1=bad'), false);
});

test('buildSha256BodyHash is stable for identical payloads and changes on replay mutations', () => {
  const body = Buffer.from(JSON.stringify({ action: 'completed', run_id: 123 }));

  assert.equal(buildSha256BodyHash(body), buildSha256BodyHash(Buffer.from(body)));
  assert.notEqual(buildSha256BodyHash(body), buildSha256BodyHash(Buffer.from(JSON.stringify({ action: 'completed', run_id: 456 }))));
});

test('isSupportedGitHubWebhook allows only onboarding events and actions', () => {
  assert.equal(isSupportedGitHubWebhook('workflow_run', 'completed'), true);
  assert.equal(isSupportedGitHubWebhook('pull_request', 'synchronize'), true);
  assert.equal(isSupportedGitHubWebhook('ping', undefined), true);
  assert.equal(isSupportedGitHubWebhook('issues', 'opened'), false);
  assert.equal(isSupportedGitHubWebhook('pull_request', 'labeled'), false);
});

test('buildSanitizedGitHubWebhookEvent keeps routing fields and drops raw PHI-like text', () => {
  const actual = buildSanitizedGitHubWebhookEvent('workflow_run', 'delivery-1', {
    action: 'completed',
    installation: { id: 123 },
    repository: { id: 456, full_name: 'contoso/claims-copilot', html_url: 'https://github.com/contoso/claims-copilot' },
    workflow_run: { id: 789, head_sha: 'abc123', conclusion: 'success', status: 'completed' },
    pull_request: { title: 'Fix MRN 1234567 handling' },
  });

  assert.deepEqual(actual, {
    eventName: 'workflow_run',
    deliveryId: 'delivery-1',
    action: 'completed',
    installationId: '123',
    repositoryId: '456',
    repositoryFullName: 'contoso/claims-copilot',
    repositoryUrl: 'https://github.com/contoso/claims-copilot',
    runId: '789',
    headSha: 'abc123',
    status: 'completed',
    conclusion: 'success',
  });
  assert.equal(JSON.stringify(actual).includes('1234567'), false);
});