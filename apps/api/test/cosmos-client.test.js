const test = require('node:test');
const assert = require('node:assert/strict');
const { getContainer } = require('../dist/src/lib/cosmos/client.js');

function withEnv(values, callback) {
  const previous = {};

  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }

  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('getContainer fails closed when Cosmos settings are missing outside local/test mode', async () => {
  await withEnv({
    COSMOS_ENDPOINT: undefined,
    COSMOS_KEY: undefined,
    UAP_USE_IN_MEMORY_COSMOS: undefined,
    AZURE_FUNCTIONS_ENVIRONMENT: undefined,
    NODE_ENV: 'production',
  }, async () => {
    await assert.rejects(
      () => getContainer('agent-cards'),
      /Cosmos configuration missing/
    );
  });
});

test('getContainer allows in-memory Cosmos only when explicitly enabled for local development', async () => {
  await withEnv({
    COSMOS_ENDPOINT: undefined,
    COSMOS_KEY: undefined,
    UAP_USE_IN_MEMORY_COSMOS: 'true',
    AZURE_FUNCTIONS_ENVIRONMENT: undefined,
    NODE_ENV: 'production',
  }, async () => {
    const container = await getContainer('agent-cards');
    const created = await container.items.create({ id: 'agent-1', tenantId: 'tenant-1' });

    assert.deepEqual(created.resource, { id: 'agent-1', tenantId: 'tenant-1' });
  });
});