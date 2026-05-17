const test = require('node:test');
const assert = require('node:assert/strict');
const { createOnboardingSubmission } = require('../dist/src/lib/onboarding/service.js');
const { verifyOnboardingProvenance, ingestOnboardingScanFindings } = require('../dist/src/lib/onboarding/evidence.js');
const { CONTAINERS, getContainer } = require('../dist/src/lib/cosmos/client.js');

const validManifest = {
  name: 'Evidence Agent',
  version: '1.0.0',
  description: 'A low-risk agent used to verify provenance and scan evidence.',
  owner: { team: 'platform', email: 'platform@example.com' },
  runtime: { type: 'aca', image: 'contoso.azurecr.io/evidence-agent:1.0.0' },
  capabilities: ['evidence-test'],
  rai: { tags: [], data_categories: ['none'] },
  repository: { url: 'https://github.com/contoso/evidence-agent', branch: 'main' },
};

async function createSubmission(tenantId, manifest = validManifest) {
  return createOnboardingSubmission({
    tenantId,
    source: 'github-app-webhook',
    manifest,
    repoContext: { url: manifest.repository.url, branch: 'main', commit_sha: 'sha-evidence', workflow_run_id: 'run-1' },
    actorId: 'github-actions',
  });
}

test('verifyOnboardingProvenance records valid SLSA evidence', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-slsa-ok`;
    const submission = await createSubmission(tenantId);

    const actual = await verifyOnboardingProvenance({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      issuer: 'token.actions.githubusercontent.com',
      subject: 'repo:contoso/evidence-agent:ref:refs/heads/main',
      sourceSha: 'sha-evidence',
      builderIdentity: 'github-actions',
      attestationUrl: 'https://github.com/contoso/evidence-agent/attestations/1',
      sbomUrl: 'https://github.com/contoso/evidence-agent/sbom.json',
    });

    assert.equal(actual.status, 'verified');

    const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
    const { resource: persisted } = await submissions.item(submission.submissionId, tenantId).read();
    assert.equal(persisted.provenance.verification_result, 'verified');
    assert.equal(persisted.provenance.builder_identity, 'github-actions');
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('verifyOnboardingProvenance fails wrong issuer or source sha', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-slsa-bad`;
    const submission = await createSubmission(tenantId);

    const actual = await verifyOnboardingProvenance({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      issuer: 'malicious.example.com',
      subject: 'repo:contoso/evidence-agent:ref:refs/heads/main',
      sourceSha: 'wrong-sha',
      builderIdentity: 'github-actions',
      attestationUrl: 'https://github.com/contoso/evidence-agent/attestations/2',
      sbomUrl: 'https://github.com/contoso/evidence-agent/sbom.json',
    });

    assert.equal(actual.status, 'failed');
    assert.equal(actual.terminalStatus, 'failed');
    assert.equal(actual.failures.includes('issuer'), true);
    assert.equal(actual.failures.includes('source_sha'), true);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('ingestOnboardingScanFindings fails critical findings and unattested PHI', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-scan-fail`;
    const submission = await createSubmission(tenantId);

    const actual = await ingestOnboardingScanFindings({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      phiSuspected: true,
      findings: [{ rule_id: 'secret-001', severity: 'critical', file_line: 'src/index.ts:12', message: 'hardcoded secret', remediation_url: 'https://example.com/remediate' }],
    });

    assert.equal(actual.status, 'failed');
    assert.equal(actual.terminalStatus, 'failed');
    assert.equal(actual.failures.includes('critical_findings'), true);
    assert.equal(actual.failures.includes('phi_unattested'), true);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});

test('ingestOnboardingScanFindings accepts clean scans for PHI-attested submissions', async () => {
  const previous = process.env.UAP_USE_IN_MEMORY_COSMOS;
  process.env.UAP_USE_IN_MEMORY_COSMOS = 'true';

  try {
    const tenantId = `tenant-${Date.now()}-scan-ok`;
    const submission = await createSubmission(tenantId, { ...validManifest, rai: { tags: ['phi-handler'], data_categories: ['phi'] } });

    const actual = await ingestOnboardingScanFindings({
      tenantId,
      submissionId: submission.submissionId,
      actorId: 'github-actions',
      phiSuspected: true,
      findings: [{ rule_id: 'dep-001', severity: 'medium', file_line: 'package.json:1', message: 'dependency update available' }],
    });

    assert.equal(actual.status, 'accepted');
    assert.equal(actual.failures.length, 0);
  } finally {
    if (previous === undefined) delete process.env.UAP_USE_IN_MEMORY_COSMOS;
    else process.env.UAP_USE_IN_MEMORY_COSMOS = previous;
  }
});