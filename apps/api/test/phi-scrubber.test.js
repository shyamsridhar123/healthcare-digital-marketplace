const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildOnboardingTelemetryEvent,
  redactPhi,
  runPhiScrubberGoldenSetCheck,
  scrubTelemetryAttributes,
  scrubTelemetryEnvelope,
  setOnboardingTelemetryClient,
  summarizePhiFindings,
  trackOnboardingEvent,
} = require('../dist/src/lib/telemetry/phi-scrubber.js');

test('redactPhi redacts common PHI patterns while preserving surrounding telemetry text', () => {
  const input = 'Patient MRN 1234567, SSN 123-45-6789, DOB 05/13/1975, email jane.doe@example.com, phone 212-555-0188';

  const actual = redactPhi(input);

  assert.equal(actual, 'Patient MRN [REDACTED:mrn], SSN [REDACTED:ssn], DOB [REDACTED:dob], email [REDACTED:email], phone [REDACTED:phone]');
});

test('scrubTelemetryAttributes redacts string values recursively and preserves non-string values', () => {
  const input = {
    'uap.submission_id': 'sub-123',
    prompt: 'MRN 7654321 needs review',
    nested: {
      completion: 'Call 415-555-1212 for DOB 1970-01-31',
      count: 2,
      ok: true,
    },
    samples: ['SSN 222-33-4444', 'safe value'],
  };

  const actual = scrubTelemetryAttributes(input);

  assert.deepEqual(actual, {
    'uap.submission_id': 'sub-123',
    prompt: 'MRN [REDACTED:mrn] needs review',
    nested: {
      completion: 'Call [REDACTED:phone] for DOB [REDACTED:dob]',
      count: 2,
      ok: true,
    },
    samples: ['SSN [REDACTED:ssn]', 'safe value'],
  });
});

test('summarizePhiFindings returns counts without leaking matched values', () => {
  const input = 'MRN 1234567 and SSN 123-45-6789 and MRN 7654321';

  const actual = summarizePhiFindings(input);

  assert.deepEqual(actual, {
    total: 3,
    byType: {
      mrn: 2,
      ssn: 1,
    },
  });
  assert.equal(JSON.stringify(actual).includes('1234567'), false);
  assert.equal(JSON.stringify(actual).includes('123-45-6789'), false);
});

test('redactPhi golden set removes raw PHI values from 50 telemetry samples', () => {
  const samples = [
    ['SSN 123-45-6789', '123-45-6789'],
    ['SSN: 987654321', '987654321'],
    ['social security number 111-22-3333', '111-22-3333'],
    ['social security # 444556666', '444556666'],
    ['MRN 1234567', '1234567'],
    ['MRN: 7654321', '7654321'],
    ['MRN# 222333444', '222333444'],
    ['medical record number 333444555', '333444555'],
    ['medical record # 444555666', '444555666'],
    ['patient id PAT-12345', 'PAT-12345'],
    ['patient id 12345678', '12345678'],
    ['patient identifier PX-9090', 'PX-9090'],
    ['account id ACCT-2222', 'ACCT-2222'],
    ['account number 999888777', '999888777'],
    ['DOB 05/13/1975', '05/13/1975'],
    ['DOB: 1975-05-13', '1975-05-13'],
    ['date of birth 01/31/1980', '01/31/1980'],
    ['date of birth: 1980-01-31', '1980-01-31'],
    ['birthdate 12/01/1965', '12/01/1965'],
    ['birth date 1965-12-01', '1965-12-01'],
    ['email jane.doe@example.com', 'jane.doe@example.com'],
    ['Contact JOHN.SMITH@CONTOSO.ORG', 'JOHN.SMITH@CONTOSO.ORG'],
    ['alternate user+phi@health.example.net', 'user+phi@health.example.net'],
    ['phone 212-555-0188', '212-555-0188'],
    ['phone (212) 555-0188', '(212) 555-0188'],
    ['phone +1 212 555 0188', '+1 212 555 0188'],
    ['mobile 415.555.1212', '415.555.1212'],
    ['cell 6175550101', '6175550101'],
    ['claimant SSN 222-33-4444 in prompt', '222-33-4444'],
    ['claimant SSN 222334444 in prompt', '222334444'],
    ['member MRN 10101010 denied', '10101010'],
    ['member medical record number 20202020 denied', '20202020'],
    ['member patient id MEMBER-123 denied', 'MEMBER-123'],
    ['member account number ACCOUNT-321 denied', 'ACCOUNT-321'],
    ['member DOB 09/09/1999 denied', '09/09/1999'],
    ['member date of birth 1999-09-09 denied', '1999-09-09'],
    ['member birthdate 08/08/1988 denied', '08/08/1988'],
    ['member email phi.case@example.org denied', 'phi.case@example.org'],
    ['member phone 303-555-0100 denied', '303-555-0100'],
    ['SSN=555-66-7777', '555-66-7777'],
    ['SSN 555667777', '555667777'],
    ['MRN-888999000', '888999000'],
    ['DOB-02/03/1970', '02/03/1970'],
    ['date of birth-1970-02-03', '1970-02-03'],
    ['birth date: 03/04/1971', '03/04/1971'],
    ['patient identifier 444555666', '444555666'],
    ['account id 777666555', '777666555'],
    ['send to care.manager@example.com', 'care.manager@example.com'],
    ['callback +1-800-555-0199', '+1-800-555-0199'],
    ['call 800 555 0199 now', '800 555 0199'],
  ];

  assert.equal(samples.length, 50);

  for (const [sample, rawPhi] of samples) {
    const actual = redactPhi(sample);
    assert.equal(actual.includes(rawPhi), false, `leaked ${rawPhi} from ${sample}`);
    assert.match(actual, /\[REDACTED:/);
  }
});

test('runPhiScrubberGoldenSetCheck returns a production-safe health signal', () => {
  assert.deepEqual(runPhiScrubberGoldenSetCheck(), {
    outcome: 'passed',
    sampleCount: 50,
    failedCount: 0,
  });
});

test('buildOnboardingTelemetryEvent scrubs event properties before they reach telemetry sinks', () => {
  const actual = buildOnboardingTelemetryEvent('uap.stage2.ingest_scans', {
    outcome: 'failed',
    prompt: 'MRN 1234567 has SSN 123-45-6789',
  });

  assert.deepEqual(actual, {
    name: 'uap.stage2.ingest_scans',
    properties: {
      outcome: 'failed',
      prompt: 'MRN [REDACTED:mrn] has SSN [REDACTED:ssn]',
    },
  });
});

test('scrubTelemetryAttributes redacts PHI from telemetry property keys', () => {
  const actual = scrubTelemetryAttributes({
    'MRN 1234567': 'safe',
    nested: {
      'SSN 123-45-6789': 'safe',
    },
  });

  assert.deepEqual(actual, {
    MRN_redacted_mrn: 'safe',
    nested: {
      SSN_redacted_ssn: 'safe',
    },
  });
});

test('scrubTelemetryEnvelope redacts direct telemetry envelopes before export', () => {
  const envelope = {
    data: {
      baseData: {
        properties: {
          prompt: 'MRN 1234567',
          'SSN 123-45-6789': 'key leak',
        },
      },
    },
  };

  const actual = scrubTelemetryEnvelope(envelope);

  assert.equal(actual, envelope);

  assert.deepEqual(actual, {
    data: {
      baseData: {
        properties: {
          prompt: 'MRN [REDACTED:mrn]',
          SSN_redacted_ssn: 'key leak',
        },
      },
    },
  });
});

test('trackOnboardingEvent default sink emits scrubbed properties through Application Insights client', () => {
  const emitted = [];

  setOnboardingTelemetryClient({
    trackEvent: (event) => emitted.push(event),
  });

  try {
    trackOnboardingEvent('uap.stage2.ingest_scans', {
      prompt: 'MRN 1234567 and SSN 123-45-6789',
      count: 2,
    });
  } finally {
    setOnboardingTelemetryClient(undefined);
  }

  assert.deepEqual(emitted, [
    {
      name: 'uap.stage2.ingest_scans',
      properties: {
        prompt: 'MRN [REDACTED:mrn] and SSN [REDACTED:ssn]',
        count: '2',
      },
    },
  ]);
});

test('trackOnboardingEvent swallows telemetry sink failures', () => {
  assert.doesNotThrow(() => {
    trackOnboardingEvent('uap.stage2.ingest_scans', { prompt: 'MRN 1234567' }, () => {
      throw new Error('sink down');
    });
  });
});

test('scrubTelemetryAttributes preserves repeated non-cyclic object references', () => {
  const shared = { prompt: 'MRN 1234567' };

  const actual = scrubTelemetryAttributes({ first: shared, second: shared });

  assert.deepEqual(actual, {
    first: { prompt: 'MRN [REDACTED:mrn]' },
    second: { prompt: 'MRN [REDACTED:mrn]' },
  });
});

test('Global Orchestrator cockpit metadata is scrubbed before telemetry export', () => {
  const actual = buildOnboardingTelemetryEvent('global_orchestrator.execution_projection.updated', {
    traceId: 'trace-123',
    safeDomainSummary: {
      stage: 'domain-execution',
      note: 'MRN 1234567 awaiting payer callback 212-555-0188',
    },
  });

  assert.deepEqual(actual, {
    name: 'global_orchestrator.execution_projection.updated',
    properties: {
      traceId: 'trace-123',
      safeDomainSummary: {
        stage: 'domain-execution',
        note: 'MRN [REDACTED:mrn] awaiting payer callback [REDACTED:phone]',
      },
    },
  });
});