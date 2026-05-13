import appInsights = require('applicationinsights');

type PhiType = 'ssn' | 'mrn' | 'patient_id' | 'account_id' | 'dob' | 'email' | 'phone';

type PhiPattern = {
  type: PhiType;
  pattern: RegExp;
  replacement?: string;
};

const PHI_PATTERNS: PhiPattern[] = [
  {
    type: 'ssn',
    pattern: /\b((?:SSN|social security(?: number)?)(?:\s*[#:=]?\s*))(\d{3}-\d{2}-\d{4}|\d{9})\b/gi,
    replacement: '$1[REDACTED:ssn]',
  },
  {
    type: 'mrn',
    pattern: /\b((?:MRN|medical record(?: number)?)(?:\s*[:#-]?\s*))(\d{6,10})\b/gi,
    replacement: '$1[REDACTED:mrn]',
  },
  {
    type: 'patient_id',
    pattern: /\b((?:patient identifier|patient id)\b(?:\s*[:#-]?\s*))([A-Z0-9-]{4,20})\b/gi,
    replacement: '$1[REDACTED:patient_id]',
  },
  {
    type: 'account_id',
    pattern: /\b((?:account number|account id)\b(?:\s*[:#-]?\s*))([A-Z0-9-]{4,20})\b/gi,
    replacement: '$1[REDACTED:account_id]',
  },
  {
    type: 'dob',
    pattern: /\b((?:DOB|date of birth|birthdate|birth date)(?:\s*[:#-]?\s*))(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/gi,
    replacement: '$1[REDACTED:dob]',
  },
  { type: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: 'phone', pattern: /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g },
];

export type PhiFindingSummary = {
  total: number;
  byType: Partial<Record<PhiType, number>>;
};

export type OnboardingTelemetryEvent = {
  name: string;
  properties: Record<string, unknown>;
};

type OnboardingTelemetrySink = (event: OnboardingTelemetryEvent) => void;
type TelemetryClientLike = {
  trackEvent(event: { name: string; properties: Record<string, string> }): void;
};

export type PhiGoldenSetResult = {
  outcome: 'passed' | 'failed';
  sampleCount: number;
  failedCount: number;
};

const PHI_GOLDEN_SAMPLES: ReadonlyArray<readonly [sample: string, rawPhi: string]> = [
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

let onboardingTelemetryClient: TelemetryClientLike | undefined;
let telemetryProcessorRegistered = false;

export function redactPhi(value: string): string {
  return PHI_PATTERNS.reduce(
    (currentValue, phiPattern) => currentValue.replace(phiPattern.pattern, phiPattern.replacement ?? `[REDACTED:${phiPattern.type}]`),
    value,
  );
}

export function scrubTelemetryAttributes<T>(value: T): T {
  return scrubTelemetryAttributesInner(value, new WeakSet<object>());
}

function scrubTelemetryAttributesInner<T>(value: T, seen: WeakSet<object>): T {
  if (typeof value === 'string') {
    return redactPhi(value) as T;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[REDACTED:circular]' as T;
    }
    seen.add(value);

    const scrubbed = value.map((item) => scrubTelemetryAttributesInner(item, seen)) as T;
    seen.delete(value);
    return scrubbed;
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[REDACTED:circular]' as T;
    }
    seen.add(value);

    const scrubbed = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [normalizeTelemetryKey(key), scrubTelemetryAttributesInner(item, seen)]),
    ) as T;
    seen.delete(value);
    return scrubbed;
  }

  return value;
}

export function summarizePhiFindings(value: string): PhiFindingSummary {
  const byType: Partial<Record<PhiType, number>> = {};

  for (const phiPattern of PHI_PATTERNS) {
    const matches = value.match(phiPattern.pattern) ?? [];
    if (matches.length > 0) {
      byType[phiPattern.type] = matches.length;
    }
  }

  return {
    total: Object.values(byType).reduce((sum, count) => sum + (count ?? 0), 0),
    byType,
  };
}

export function runPhiScrubberGoldenSetCheck(): PhiGoldenSetResult {
  const failedCount = PHI_GOLDEN_SAMPLES.filter(([sample, rawPhi]) => redactPhi(sample).includes(rawPhi)).length;

  return {
    outcome: failedCount === 0 ? 'passed' : 'failed',
    sampleCount: PHI_GOLDEN_SAMPLES.length,
    failedCount,
  };
}

export function buildOnboardingTelemetryEvent(
  name: string,
  properties: Record<string, unknown>,
): OnboardingTelemetryEvent {
  return {
    name,
    properties: scrubTelemetryAttributes(properties) as Record<string, unknown>,
  };
}

export function trackOnboardingEvent(
  name: string,
  properties: Record<string, unknown>,
  sink: OnboardingTelemetrySink = defaultOnboardingTelemetrySink,
): void {
  try {
    sink(buildOnboardingTelemetryEvent(name, properties));
  } catch {
    // Telemetry must never fail request processing.
  }
}

export function setOnboardingTelemetryClient(client: TelemetryClientLike | undefined): void {
  onboardingTelemetryClient = client;
}

export function scrubTelemetryEnvelope<T extends Record<string, unknown>>(envelope: T): T {
  const scrubbed = scrubTelemetryAttributes(envelope) as Record<string, unknown>;

  for (const key of Object.keys(envelope)) {
    delete envelope[key];
  }

  Object.assign(envelope, scrubbed);
  return envelope;
}

function defaultOnboardingTelemetrySink(event: OnboardingTelemetryEvent): void {
  ensureApplicationInsightsStarted();

  const client = onboardingTelemetryClient ?? appInsights.defaultClient;

  if (!client) {
    return;
  }

  client.trackEvent({
    name: event.name,
    properties: stringifyTelemetryProperties(event.properties),
  });
}

function ensureApplicationInsightsStarted(): void {
  if (!appInsights.defaultClient && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights
      .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
      .setAutoCollectConsole(false, false)
      .start();
  }

  registerPhiScrubberTelemetryProcessor();
}

function registerPhiScrubberTelemetryProcessor(): void {
  if (telemetryProcessorRegistered || !appInsights.defaultClient) {
    return;
  }

  appInsights.defaultClient.addTelemetryProcessor((envelope) => {
    scrubTelemetryEnvelope(envelope as unknown as Record<string, unknown>);
    return true;
  });
  telemetryProcessorRegistered = true;
}

function normalizeTelemetryKey(key: string): string {
  return redactPhi(key)
    .replace(/\[REDACTED:([^\]]+)\]/g, 'redacted_$1')
    .replace(/[^A-Za-z0-9_.-]/g, '_');
}

function stringifyTelemetryProperties(properties: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : safeStringify(value),
    ]),
  );
}

function safeStringify(value: unknown): string {
  try {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item));
  } catch {
    return '[UNSERIALIZABLE]';
  }
}

ensureApplicationInsightsStarted();
