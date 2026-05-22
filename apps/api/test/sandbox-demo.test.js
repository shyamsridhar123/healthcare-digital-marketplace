const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const {
  CONTAINERS,
  getContainer,
} = require('../dist/src/lib/cosmos/client.js');

const {
  resetImdeDemoScenario,
} = require('../dist/src/lib/sandbox/demo-reset.js');

const {
  IMDE_DEMO_SCENARIO_ID,
  buildImdeDemoPublishArtifacts,
  buildImdeDemoReadySandbox,
  getImdeDemoScenario,
  isCanonicalImdeDemoSandboxRequest,
  validateImdeDemoScenario,
} = require('../dist/src/lib/sandbox/demo-scenario.js');

test('canonical IMDE demo scenario exposes approved synthetic denial-prediction data', () => {
  const scenario = getImdeDemoScenario();

  assert.equal(IMDE_DEMO_SCENARIO_ID, 'imde-rcm-denial-demo');
  assert.equal(scenario.demoScenarioId, IMDE_DEMO_SCENARIO_ID);
  assert.equal(scenario.baseModelId, 'hf-microsoft-biomednlp-pubmedbert-base-uncased-abstract');
  assert.equal(scenario.requestDefaults.workspaceTemplateId, 'aml-team-standard-v1');
  assert.equal(scenario.requestDefaults.computeProfile, 'gpu-small');
  assert.deepEqual(scenario.requestDefaults.dataPackages, ['claims_training', 'denials_gold']);
  assert.ok(scenario.dataPackages.every((pkg) => pkg.demoDataStatement.includes('synthetic')));
  assert.ok(scenario.dataPackages.every((pkg) => pkg.classification !== 'phi'));
});

test('canonical IMDE demo scenario has a lineage-ready winning run', () => {
  const scenario = getImdeDemoScenario();
  const winner = scenario.evaluationRuns.find((run) => run.selectedWinner);

  assert.ok(winner);
  assert.equal(winner.id, scenario.selectedRunId);
  assert.equal(winner.status, 'completed');
  assert.equal(winner.governanceStatus, 'ready-for-publish');
  assert.equal(winner.baseModelId, scenario.baseModelId);
  assert.deepEqual(winner.dataPackages, scenario.requestDefaults.dataPackages);
  assert.ok(winner.metrics.f1 >= 0.8);
  assert.ok(winner.lineage.notebookPath.endsWith('.ipynb'));
});

test('canonical IMDE demo scenario validation rejects PHI in the primary path', () => {
  const scenario = getImdeDemoScenario();

  assert.doesNotThrow(() => validateImdeDemoScenario(scenario));

  assert.throws(
    () => validateImdeDemoScenario({
      ...scenario,
      requestDefaults: {
        ...scenario.requestDefaults,
        dataPackages: ['claims_training', 'clinical_notes_phi'],
      },
    }),
    /must not include restricted or PHI packages/
  );
});

test('canonical IMDE demo activation requires an explicit demo gate and exact request shape', () => {
  const scenario = getImdeDemoScenario();
  const canonicalRequest = {
    ...scenario.requestDefaults,
    demoScenarioId: scenario.demoScenarioId,
    baseModelId: scenario.baseModelId,
    tenantId: 'default',
  };

  assert.equal(isCanonicalImdeDemoSandboxRequest(canonicalRequest, { demoModeEnabled: false }), false);
  assert.equal(isCanonicalImdeDemoSandboxRequest(canonicalRequest, { demoModeEnabled: true }), true);
  assert.equal(
    isCanonicalImdeDemoSandboxRequest(
      { ...canonicalRequest, dataPackages: ['claims_training', 'clinical_notes_phi'] },
      { demoModeEnabled: true }
    ),
    false
  );
  assert.equal(
    isCanonicalImdeDemoSandboxRequest(
      { ...canonicalRequest, computeProfile: 'cpu-small' },
      { demoModeEnabled: true }
    ),
    false
  );
});

test('demo ready projection is server-owned and deterministic', () => {
  const requested = {
    id: 'sbx-demo',
    sandboxId: 'sbx-demo',
    tenantId: 'default',
    ownerId: 'caller-owner',
    dataPackages: ['claims_training', 'denials_gold'],
    status: 'requested',
    approvedBy: 'spoofed-approver',
    launchUrls: { studio: 'https://spoofed.example', notebook: 'https://spoofed.example/notebook' },
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
  };

  const ready = buildImdeDemoReadySandbox(requested, '2026-05-20T12:00:00.000Z');

  assert.equal(ready.status, 'ready');
  assert.equal(ready.approvedBy, 'platform-admin-morgan-lee');
  assert.equal(ready.approvalReason, 'Approved for executive demo GPU sandbox with synthetic, de-identified RCM data.');
  assert.equal(ready.demoScenarioId, IMDE_DEMO_SCENARIO_ID);
  assert.equal(ready.baseModelId, 'hf-microsoft-biomednlp-pubmedbert-base-uncased-abstract');
  assert.match(ready.launchUrls.studio, /demo\/imde-rcm-denial-demo\/studio$/);
  assert.deepEqual(ready.dataAssetsRegistered, [
    { name: 'claims_training', version: '12' },
    { name: 'denials_gold', version: '4' },
  ]);
});

test('reset removes only tenant-scoped canonical IMDE demo records', async () => {
  const previousDemoTenants = process.env.UAP_IMDE_DEMO_TENANTS;
  process.env.UAP_IMDE_DEMO_TENANTS = 'default,tenant-reset';

  const sandboxes = await getContainer(CONTAINERS.SANDBOXES);
  const events = await getContainer(CONTAINERS.SANDBOX_LIFECYCLE_EVENTS);
  const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
  const experiences = await getContainer(CONTAINERS.MODEL_EXPERIENCES);
  const scenario = getImdeDemoScenario();

  await sandboxes.items.upsert({
    id: 'demo-sbx',
    tenantId: 'tenant-reset',
    demoScenarioId: IMDE_DEMO_SCENARIO_ID,
    baseModelId: scenario.baseModelId,
    workspaceTemplateId: scenario.requestDefaults.workspaceTemplateId,
    sandboxType: scenario.requestDefaults.sandboxType,
    computeProfile: scenario.requestDefaults.computeProfile,
    dataPackages: scenario.requestDefaults.dataPackages,
  });
  await sandboxes.items.upsert({ id: 'spoofed-sbx', tenantId: 'tenant-reset', demoScenarioId: IMDE_DEMO_SCENARIO_ID });
  await sandboxes.items.upsert({ id: 'other-sbx', tenantId: 'tenant-reset', demoScenarioId: 'other-scenario' });
  await sandboxes.items.upsert({ id: 'other-tenant-sbx', tenantId: 'other-tenant', demoScenarioId: IMDE_DEMO_SCENARIO_ID });
  await events.items.upsert({ id: 'demo-event', sandboxId: 'demo-sbx', tenantId: 'tenant-reset', demoScenarioId: IMDE_DEMO_SCENARIO_ID });
  await events.items.upsert({ id: 'legacy-demo-event', sandboxId: 'missing-sbx', tenantId: 'tenant-reset', details: { demoScenarioId: IMDE_DEMO_SCENARIO_ID } });
  await submissions.items.upsert({ id: 'demo-submission', tenantId: 'tenant-reset', demoScenarioId: IMDE_DEMO_SCENARIO_ID, sourceType: 'sandbox', sandboxId: 'demo-sbx' });
  await experiences.items.upsert({ id: 'demo-experience', tenantId: 'tenant-reset', demoScenarioId: IMDE_DEMO_SCENARIO_ID, modelRouteId: scenario.publishedExperience.modelRouteId });

  const result = await resetImdeDemoScenario('tenant-reset');

  assert.deepEqual(result.deleted, {
    sandboxes: 1,
    lifecycleEvents: 1,
    submissions: 1,
    modelExperiences: 1,
  });
  assert.equal((await sandboxes.item('demo-sbx').read()).resource, undefined);
  assert.ok((await sandboxes.item('spoofed-sbx').read()).resource);
  assert.ok((await sandboxes.item('other-sbx').read()).resource);
  assert.ok((await sandboxes.item('other-tenant-sbx').read()).resource);
  assert.equal((await events.item('demo-event').read()).resource, undefined);
  assert.ok((await events.item('legacy-demo-event').read()).resource);
  assert.equal((await submissions.item('demo-submission').read()).resource, undefined);
  assert.equal((await experiences.item('demo-experience').read()).resource, undefined);

  if (previousDemoTenants === undefined) {
    delete process.env.UAP_IMDE_DEMO_TENANTS;
  } else {
    process.env.UAP_IMDE_DEMO_TENANTS = previousDemoTenants;
  }
});

test('demo publish artifacts include approved submission and model experience route', () => {
  const sandbox = buildImdeDemoReadySandbox({
    id: 'sbx-publish',
    sandboxId: 'sbx-publish',
    tenantId: 'default',
    ownerId: 'ds-priya-shah',
    name: 'RCM denial prediction fine-tuning',
    dataPackages: ['claims_training', 'denials_gold'],
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
  }, '2026-05-20T12:00:00.000Z');

  const artifacts = buildImdeDemoPublishArtifacts(
    sandbox,
    {
      amlModelName: 'rcm-denial-prediction-space',
      amlModelVersion: '1.0.0',
      trainingRunId: 'run-denial-pubmedbert-v3',
    },
    '2026-05-20T12:05:00.000Z'
  );

  assert.equal(artifacts.modelRoute, '/models/rcm-denial-prediction-space');
  assert.equal(artifacts.modelRouteId, 'rcm-denial-prediction-space');
  assert.equal(artifacts.submission.status, 'published');
  assert.equal(artifacts.submission.sourceType, 'sandbox');
  assert.equal(artifacts.experience.status, 'published');
  assert.equal(artifacts.experience.trustStatus, 'governance-passed');
  assert.equal(artifacts.experience.lineage.selectedRunId, 'run-denial-pubmedbert-v3');
  assert.deepEqual(artifacts.experience.lineage.dataPackages, ['claims_training', 'denials_gold']);
});

test('demo publish artifacts carry the playground scenarios onto the experience document', () => {
  const sandbox = buildImdeDemoReadySandbox({
    id: 'sbx-playground',
    sandboxId: 'sbx-playground',
    tenantId: 'default',
    ownerId: 'ds-priya-shah',
    dataPackages: ['claims_training', 'denials_gold'],
  });

  const artifacts = buildImdeDemoPublishArtifacts(sandbox, {
    amlModelName: 'rcm-denial-prediction-space',
    amlModelVersion: '1.0.0',
    trainingRunId: 'run-denial-pubmedbert-v3',
  });

  const scenarios = artifacts.experience.playgroundScenarios;
  assert.ok(Array.isArray(scenarios), 'playgroundScenarios should be an array');
  assert.equal(scenarios.length, 3, 'expected exactly 3 playground scenarios');

  const expectedIds = ['outpatient-mri-no-auth', 'ed-visit-coding-mismatch', 'inpatient-stay-complete-docs'];
  assert.deepEqual(scenarios.map((s) => s.id), expectedIds);

  const ids = new Set(scenarios.map((s) => s.id));
  assert.equal(ids.size, scenarios.length, 'playground scenario ids must be unique');

  const allowedPredictions = new Set(['High', 'Medium', 'Low']);
  for (const entry of scenarios) {
    assert.equal(typeof entry.id, 'string');
    assert.ok(entry.label.length > 0);
    assert.ok(entry.inputText.toLowerCase().includes('synthetic'),
      'inputText should advertise synthetic data to reviewers');
    assert.ok(allowedPredictions.has(entry.output.prediction),
      `unexpected prediction value: ${entry.output.prediction}`);
    assert.equal(typeof entry.output.rationale, 'string');
    assert.ok(entry.output.rationale.length > 0);
    assert.equal(typeof entry.output.confidence, 'number');
    assert.ok(entry.output.confidence >= 0 && entry.output.confidence <= 1,
      `confidence out of range: ${entry.output.confidence}`);
    if (entry.output.reasonCode !== undefined) {
      assert.equal(typeof entry.output.reasonCode, 'string');
      assert.ok(entry.output.reasonCode.length > 0);
    }
  }

  const predictions = scenarios.map((s) => s.output.prediction);
  assert.ok(predictions.includes('High'), 'expected at least one High-risk scenario');
  assert.ok(predictions.includes('Medium'), 'expected at least one Medium-risk scenario');
  assert.ok(predictions.includes('Low'), 'expected at least one Low-risk scenario');
});

test('demo publish artifacts reject non-winning runs', () => {
  const sandbox = buildImdeDemoReadySandbox({
    id: 'sbx-publish-invalid',
    sandboxId: 'sbx-publish-invalid',
    tenantId: 'default',
    ownerId: 'ds-priya-shah',
    dataPackages: ['claims_training', 'denials_gold'],
  });

  assert.throws(
    () => buildImdeDemoPublishArtifacts(
      sandbox,
      { amlModelName: 'bad', amlModelVersion: '1', trainingRunId: 'run-denial-baseline-v1' }
    ),
    /selected winning run/
  );

  assert.throws(
    () => buildImdeDemoPublishArtifacts(
      sandbox,
      { amlModelName: 'bad', amlModelVersion: '1' }
    ),
    /selected winning run/
  );
});