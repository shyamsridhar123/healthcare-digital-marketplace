const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compareSemver,
  classifyRiskTier,
  validateAgentManifest,
} = require('../dist/src/lib/onboarding/manifest.js');

test('validateAgentManifest accepts a governed MVP agent manifest', () => {
  const actual = validateAgentManifest({
    name: 'claims-copilot',
    version: '1.2.3',
    description: 'Assists claims analysts with document summarization and routing.',
    owner: { team: 'claims-platform', email: 'claims-platform@example.com' },
    runtime: { type: 'aca', image: 'contoso.azurecr.io/claims-copilot:1.2.3' },
    capabilities: ['claims-summary', 'routing'],
    rai: { tags: ['human-in-the-loop'], data_categories: ['pii'] },
    repository: { url: 'https://github.com/contoso/claims-copilot', branch: 'main' },
  });

  assert.equal(actual.valid, true);
  assert.equal(actual.manifest.riskTier, 'medium');
  assert.deepEqual(actual.manifest.capabilities, ['claims-summary', 'routing']);
});

test('validateAgentManifest returns JSON-pointer style errors for invalid manifests', () => {
  const actual = validateAgentManifest({
    name: 'x',
    version: '1.2',
    description: 'too short',
    owner: { team: '', email: 'not-email' },
    runtime: { type: 'vm' },
    capabilities: [],
    rai: { tags: [], data_categories: ['phi'] },
  });

  assert.equal(actual.valid, false);
  assert.match(JSON.stringify(actual.errors), /\/version/);
  assert.match(JSON.stringify(actual.errors), /\/runtime\/type/);
});

test('compareSemver enforces strictly higher versions', () => {
  assert.equal(compareSemver('1.2.4', '1.2.3'), 1);
  assert.equal(compareSemver('1.2.3', '1.2.3'), 0);
  assert.equal(compareSemver('1.2.2', '1.2.3'), -1);
});

test('classifyRiskTier escalates PHI and production egress risks', () => {
  assert.equal(classifyRiskTier({ dataCategories: ['phi'], networkEgress: false }), 'high');
  assert.equal(classifyRiskTier({ dataCategories: ['none'], networkEgress: true }), 'medium');
  assert.equal(classifyRiskTier({ dataCategories: ['none'], networkEgress: false }), 'low');
});