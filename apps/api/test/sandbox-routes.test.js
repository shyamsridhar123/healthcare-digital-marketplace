/**
 * Handler-level integration tests for the IMDE demo sandbox routes.
 *
 * Stubs the @azure/functions module so we can intercept `app.http(name, opts)`
 * registrations and invoke each handler directly with a mocked HttpRequest,
 * without standing up the Azure Functions host.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

// ── env gates required by the IMDE demo code paths ────────────────────────────
process.env.NODE_ENV = "test";
process.env.UAP_ENABLE_IMDE_DEMO = "true";
process.env.UAP_USE_IN_MEMORY_COSMOS = "true";
process.env.UAP_IMDE_DEMO_TENANTS = "default,tenant-routes";
delete process.env.UAP_IMDE_DEMO_ADMIN_TOKEN; // force local-mode auth path

// ── stub @azure/functions before requiring the compiled handler module ───────
const registeredHandlers = {};
const azureFunctionsStub = {
  app: {
    http: (name, opts) => {
      registeredHandlers[name] = opts.handler;
    },
  },
};

const STUB_ID = "__stub_at_azure_functions__";
require.cache[STUB_ID] = {
  id: STUB_ID,
  filename: STUB_ID,
  loaded: true,
  exports: azureFunctionsStub,
  children: [],
  paths: [],
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, ...rest) {
  if (request === "@azure/functions") return STUB_ID;
  return originalResolveFilename.call(this, request, parent, ...rest);
};

// ── load the compiled handler module so app.http() runs against the stub ─────
require("../dist/src/functions/sandbox/sandboxes.js");

const {
  CONTAINERS,
  getContainer,
} = require("../dist/src/lib/cosmos/client.js");

const {
  IMDE_DEMO_SCENARIO_ID,
  getImdeDemoScenario,
} = require("../dist/src/lib/sandbox/demo-scenario.js");

const scenario = getImdeDemoScenario();
const TENANT = "tenant-routes";

// ── HttpRequest mock helpers ─────────────────────────────────────────────────
function makeRequest({ params = {}, query = {}, headers = {}, body = undefined } = {}) {
  const queryParams = new URLSearchParams(query);
  const headerMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));

  return {
    params,
    query: {
      get: (key) => queryParams.get(key),
    },
    headers: {
      get: (key) => headerMap.get(String(key).toLowerCase()) ?? null,
    },
    json: async () => {
      if (body === undefined) {
        throw new Error("No body provided");
      }
      return body;
    },
  };
}

function ctx() {
  return { log: () => {}, error: () => {}, warn: () => {}, info: () => {} };
}

function canonicalDemoBody(overrides = {}) {
  return {
    name: scenario.requestDefaults.name,
    description: scenario.requestDefaults.description,
    tenantId: TENANT,
    ownerId: scenario.actors.ownerId,
    demoScenarioId: scenario.demoScenarioId,
    baseModelId: scenario.baseModelId,
    workspaceTemplateId: scenario.requestDefaults.workspaceTemplateId,
    sandboxType: scenario.requestDefaults.sandboxType,
    dataPackages: scenario.requestDefaults.dataPackages,
    computeProfile: scenario.requestDefaults.computeProfile,
    durationDays: scenario.requestDefaults.durationDays,
    ...overrides,
  };
}

async function cleanupTenant(tenantId) {
  const containerNames = [
    CONTAINERS.SANDBOXES,
    CONTAINERS.SANDBOX_LIFECYCLE_EVENTS,
    CONTAINERS.SUBMISSIONS,
    CONTAINERS.MODEL_EXPERIENCES,
    CONTAINERS.SANDBOX_TEMPLATES,
  ];
  for (const name of containerNames) {
    const c = await getContainer(name);
    const { resources } = await c.items
      .query({
        query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
        parameters: [{ name: "@tenantId", value: tenantId }],
      })
      .fetchAll();
    for (const item of resources) {
      const partitionKey = item.tenantId ?? "default";
      try {
        await c.item(item.id, partitionKey).delete();
      } catch {
        // in-memory adapter is tolerant; ignore
      }
    }
  }
}

test.beforeEach(async () => {
  await cleanupTenant(TENANT);
});

// ── happy-path lifecycle ─────────────────────────────────────────────────────
test("handlers expose every IMDE demo route", () => {
  for (const name of [
    "createSandbox",
    "approveSandbox",
    "publishSandboxModel",
    "resetImdeDemoScenario",
    "listModelExperiences",
  ]) {
    assert.equal(typeof registeredHandlers[name], "function", `missing handler: ${name}`);
  }
});

test("full canonical lifecycle: create → approve → publish → projection → reset", async () => {
  // 1) create a canonical IMDE demo sandbox
  const createRes = await registeredHandlers.createSandbox(
    makeRequest({ body: canonicalDemoBody() }),
    ctx()
  );
  assert.equal(createRes.status, 201);
  const sandboxId = createRes.jsonBody.sandboxId;
  assert.equal(createRes.jsonBody.status, "requested");
  assert.equal(createRes.jsonBody.demoScenarioId, IMDE_DEMO_SCENARIO_ID);

  // 2) anonymous approve must be rejected (canonical demo gate)
  const anonApprove = await registeredHandlers.approveSandbox(
    makeRequest({ params: { id: sandboxId }, body: {} }),
    ctx()
  );
  assert.equal(anonApprove.status, 403);

  // 3) presenter-admin approve in local mode succeeds with deterministic projection
  const approveRes = await registeredHandlers.approveSandbox(
    makeRequest({
      params: { id: sandboxId },
      body: { actorId: "presenter-admin", approverId: "presenter-admin" },
    }),
    ctx()
  );
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.jsonBody.status, "ready");
  assert.equal(approveRes.jsonBody.approvedBy, "platform-admin-morgan-lee");
  assert.match(approveRes.jsonBody.launchUrls.studio, /imde-rcm-denial-demo\/studio$/);

  // 4) publish without trainingRunId → 400
  const noRunPublish = await registeredHandlers.publishSandboxModel(
    makeRequest({
      params: { id: sandboxId },
      body: {
        actorId: scenario.actors.ownerId,
        amlModelName: "rcm-denial-prediction-space",
        amlModelVersion: "1.0.0",
      },
    }),
    ctx()
  );
  assert.equal(noRunPublish.status, 400);
  assert.match(noRunPublish.jsonBody.error, /trainingRunId/);

  // 5) publish with non-winning run → 400
  const nonWinnerPublish = await registeredHandlers.publishSandboxModel(
    makeRequest({
      params: { id: sandboxId },
      body: {
        actorId: scenario.actors.ownerId,
        amlModelName: "rcm-denial-prediction-space",
        amlModelVersion: "1.0.0",
        trainingRunId: "run-denial-baseline-v1",
      },
    }),
    ctx()
  );
  assert.equal(nonWinnerPublish.status, 400);

  // 6) publish by unauthorized actor → 403
  const unauthorizedPublish = await registeredHandlers.publishSandboxModel(
    makeRequest({
      params: { id: sandboxId },
      body: {
        actorId: "drive-by-attacker",
        amlModelName: "rcm-denial-prediction-space",
        amlModelVersion: "1.0.0",
        trainingRunId: scenario.selectedRunId,
      },
    }),
    ctx()
  );
  assert.equal(unauthorizedPublish.status, 403);

  // 7) publish by sandbox owner in local-mode succeeds
  const publishRes = await registeredHandlers.publishSandboxModel(
    makeRequest({
      params: { id: sandboxId },
      body: {
        actorId: scenario.actors.ownerId,
        amlModelName: "rcm-denial-prediction-space",
        amlModelVersion: "1.0.0",
        trainingRunId: scenario.selectedRunId,
      },
    }),
    ctx()
  );
  assert.equal(publishRes.status, 201);
  assert.equal(publishRes.jsonBody.modelRoute, "/models/rcm-denial-prediction-space");
  assert.equal(publishRes.jsonBody.modelRouteId, "rcm-denial-prediction-space");
  assert.equal(publishRes.jsonBody.experience.trustStatus, "governance-passed");

  // 8) projection appears via GET /api/model-experiences
  const listRes = await registeredHandlers.listModelExperiences(
    makeRequest({
      query: {
        tenantId: TENANT,
        demoScenarioId: IMDE_DEMO_SCENARIO_ID,
        modelRouteId: "rcm-denial-prediction-space",
      },
    }),
    ctx()
  );
  assert.equal(listRes.status, 200);
  assert.equal(listRes.jsonBody.total, 1);
  assert.equal(listRes.jsonBody.items[0].modelRouteId, "rcm-denial-prediction-space");

  // 9) reset clears the demo projection
  const resetRes = await registeredHandlers.resetImdeDemoScenario(
    makeRequest({
      body: { actorId: "presenter-admin", tenantId: TENANT },
    }),
    ctx()
  );
  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.jsonBody.deleted.sandboxes, 1);
  assert.equal(resetRes.jsonBody.deleted.modelExperiences, 1);
  assert.equal(resetRes.jsonBody.deleted.submissions, 1);

  // 10) projection disappears after reset
  const postResetList = await registeredHandlers.listModelExperiences(
    makeRequest({
      query: {
        tenantId: TENANT,
        demoScenarioId: IMDE_DEMO_SCENARIO_ID,
        modelRouteId: "rcm-denial-prediction-space",
      },
    }),
    ctx()
  );
  assert.equal(postResetList.status, 200);
  assert.equal(postResetList.jsonBody.total, 0);
});

// ── publish negative paths ───────────────────────────────────────────────────
test("publish requires the sandbox to be in 'ready' state", async () => {
  // create canonical demo sandbox (status=requested, not ready)
  const createRes = await registeredHandlers.createSandbox(
    makeRequest({ body: canonicalDemoBody() }),
    ctx()
  );
  const sandboxId = createRes.jsonBody.sandboxId;

  const res = await registeredHandlers.publishSandboxModel(
    makeRequest({
      params: { id: sandboxId },
      body: {
        actorId: scenario.actors.ownerId,
        amlModelName: "rcm-denial-prediction-space",
        amlModelVersion: "1.0.0",
        trainingRunId: scenario.selectedRunId,
      },
    }),
    ctx()
  );
  assert.equal(res.status, 409);
});

test("publish returns 400 when amlModelName or amlModelVersion is missing", async () => {
  const createRes = await registeredHandlers.createSandbox(
    makeRequest({ body: canonicalDemoBody() }),
    ctx()
  );
  const sandboxId = createRes.jsonBody.sandboxId;

  const res = await registeredHandlers.publishSandboxModel(
    makeRequest({
      params: { id: sandboxId },
      body: { actorId: scenario.actors.ownerId, trainingRunId: scenario.selectedRunId },
    }),
    ctx()
  );
  assert.equal(res.status, 400);
});

test("publish returns 404 for unknown sandbox id", async () => {
  const res = await registeredHandlers.publishSandboxModel(
    makeRequest({
      params: { id: "sbx-does-not-exist" },
      body: {
        actorId: scenario.actors.ownerId,
        amlModelName: "rcm-denial-prediction-space",
        amlModelVersion: "1.0.0",
        trainingRunId: scenario.selectedRunId,
      },
    }),
    ctx()
  );
  assert.equal(res.status, 404);
});

// ── reset negative paths ─────────────────────────────────────────────────────
test("reset rejects anonymous callers", async () => {
  const res = await registeredHandlers.resetImdeDemoScenario(
    makeRequest({ body: { tenantId: TENANT } }),
    ctx()
  );
  assert.equal(res.status, 403);
});

test("reset rejects unsupported demo scenarios", async () => {
  const res = await registeredHandlers.resetImdeDemoScenario(
    makeRequest({
      body: { actorId: "presenter-admin", tenantId: TENANT, demoScenarioId: "other-scenario" },
    }),
    ctx()
  );
  assert.equal(res.status, 400);
});

test("reset rejects tenants not in the demo allowlist", async () => {
  const res = await registeredHandlers.resetImdeDemoScenario(
    makeRequest({
      body: { actorId: "presenter-admin", tenantId: "tenant-not-in-allowlist" },
    }),
    ctx()
  );
  assert.equal(res.status, 403);
});

test("reset returns 403 when IMDE demo mode is disabled", async () => {
  const original = process.env.UAP_ENABLE_IMDE_DEMO;
  process.env.UAP_ENABLE_IMDE_DEMO = "false";
  try {
    const res = await registeredHandlers.resetImdeDemoScenario(
      makeRequest({ body: { actorId: "presenter-admin", tenantId: TENANT } }),
      ctx()
    );
    assert.equal(res.status, 403);
  } finally {
    process.env.UAP_ENABLE_IMDE_DEMO = original;
  }
});

// ── approve negative paths ──────────────────────────────────────────────────
test("approve returns 404 for unknown sandbox id", async () => {
  const res = await registeredHandlers.approveSandbox(
    makeRequest({
      params: { id: "sbx-missing" },
      body: { actorId: "presenter-admin", approverId: "presenter-admin" },
    }),
    ctx()
  );
  assert.equal(res.status, 404);
});

test("approve returns 409 when sandbox is not in 'requested' state", async () => {
  // first approve transitions to ready (canonical demo); second approve must 409
  const createRes = await registeredHandlers.createSandbox(
    makeRequest({ body: canonicalDemoBody() }),
    ctx()
  );
  const sandboxId = createRes.jsonBody.sandboxId;

  await registeredHandlers.approveSandbox(
    makeRequest({
      params: { id: sandboxId },
      body: { actorId: "presenter-admin", approverId: "presenter-admin" },
    }),
    ctx()
  );

  const second = await registeredHandlers.approveSandbox(
    makeRequest({
      params: { id: sandboxId },
      body: { actorId: "presenter-admin", approverId: "presenter-admin" },
    }),
    ctx()
  );
  assert.equal(second.status, 409);
});

// ── model-experiences route gates ────────────────────────────────────────────
test("listModelExperiences rejects disallowed tenant for IMDE demo scope", async () => {
  const res = await registeredHandlers.listModelExperiences(
    makeRequest({
      query: { tenantId: "tenant-not-in-allowlist", demoScenarioId: IMDE_DEMO_SCENARIO_ID },
    }),
    ctx()
  );
  assert.equal(res.status, 403);
});

test("listModelExperiences returns empty list when no projection exists", async () => {
  const res = await registeredHandlers.listModelExperiences(
    makeRequest({
      query: {
        tenantId: TENANT,
        demoScenarioId: IMDE_DEMO_SCENARIO_ID,
        modelRouteId: "rcm-denial-prediction-space",
      },
    }),
    ctx()
  );
  assert.equal(res.status, 200);
  assert.equal(res.jsonBody.total, 0);
  assert.deepEqual(res.jsonBody.items, []);
});
