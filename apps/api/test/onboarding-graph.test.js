const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createOnboardingGraphState,
  runOnboardingGraph,
} = require('../dist/src/lib/onboarding/graph-runner.js');

const validManifest = {
  name: 'claims-copilot',
  version: '1.2.3',
  description: 'Assists claims analysts with document summarization and routing.',
  owner: { team: 'claims-platform', email: 'claims-platform@example.com' },
  runtime: { type: 'aca', image: 'contoso.azurecr.io/claims-copilot:1.2.3' },
  capabilities: ['claims-summary', 'routing'],
  rai: { tags: ['human-in-the-loop'], data_categories: ['pii'] },
  repository: { url: 'https://github.com/contoso/claims-copilot', branch: 'main' },
};

test('createOnboardingGraphState creates serializable LangGraph state', () => {
  const state = createOnboardingGraphState({
    tenantId: 'tenant-1',
    submissionId: 'sub-1',
    source: 'github-app-webhook',
    manifest: validManifest,
  });

  assert.equal(JSON.parse(JSON.stringify(state)).submissionId, 'sub-1');
  assert.deepEqual(state.completedStages, []);
  assert.equal(state.currentStage, 'submitted');
});

test('runOnboardingGraph validates manifest and routes medium risk to approval pending', async () => {
  const initial = createOnboardingGraphState({
    tenantId: 'tenant-1',
    submissionId: 'sub-2',
    source: 'github-app-webhook',
    manifest: validManifest,
  });

  const actual = await runOnboardingGraph(initial);

  assert.equal(actual.currentStage, 'approval-pending');
  assert.equal(actual.risk.tier, 'medium');
  assert.deepEqual(actual.completedStages, ['validate_manifest', 'classify_risk']);
  assert.equal(actual.terminalStatus, undefined);
});

test('runOnboardingGraph fails deterministically on invalid manifest', async () => {
  const initial = createOnboardingGraphState({
    tenantId: 'tenant-1',
    submissionId: 'sub-3',
    source: 'github-app-webhook',
    manifest: { name: 'x', version: 'bad' },
  });

  const actual = await runOnboardingGraph(initial);

  assert.equal(actual.currentStage, 'failed');
  assert.equal(actual.terminalStatus, 'failed');
  assert.equal(actual.errors.length > 0, true);
  assert.equal(JSON.stringify(actual.errors).includes('/version'), true);
});

test('runOnboardingGraph auto-approves low-risk manifests', async () => {
  const initial = createOnboardingGraphState({
    tenantId: 'tenant-1',
    submissionId: 'sub-4',
    source: 'github-app-webhook',
    manifest: {
      ...validManifest,
      rai: { tags: [], data_categories: ['none'] },
    },
  });

  const actual = await runOnboardingGraph(initial);

  assert.equal(actual.risk.tier, 'low');
  assert.equal(actual.currentStage, 'approved');
  assert.deepEqual(actual.completedStages, ['validate_manifest', 'classify_risk']);
  assert.equal(actual.terminalStatus, undefined);
});