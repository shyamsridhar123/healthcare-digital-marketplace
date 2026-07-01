import appInsights = require('applicationinsights');

type SensitiveType = 'ssn' | 'engagement_id' | 'client_id' | 'account_id' | 'dob' | 'email' | 'phone';

type SensitivePattern = {
  type: SensitiveType;
  pattern: RegExp;
  replacement?: string;
};

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    type: 'ssn',
    pattern: /\b((?:SSN|social security(?: number)?)(?:\s*[#:=]?\s*))(\d{3}-\d{2}-\d{4}|\d{9})\b/gi,
    replacement: '$1[REDACTED:ssn]',
  },
  {
    type: 'engagement_id',
    pattern: /\b((?:Engagement ID|engagement record(?: number)?)(?:\s*[:#-]?\s*))(\d{6,10})\b/gi,
    replacement: '$1[REDACTED:engagement_id]',
  },
  {
    type: 'client_id',
    pattern: /\b((?:client identifier|client id)\b(?:\s*[:#-]?\s*))([A-Z0-9-]{4,20})\b/gi,
    replacement: '$1[REDACTED:client_id]',
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

export type SensitiveFindingSummary = {
  total: number;
  byType: Partial<Record<SensitiveType, number>>;
};

export type OnboardingTelemetryEvent = {
  name: string;
  properties: Record<string, unknown>;
};

type OnboardingTelemetrySink = (event: OnboardingTelemetryEvent) => void;
type TelemetryClientLike = {
  trackEvent(event: { name: string; properties: Record<string, string> }): void;
};

export type SensitiveGoldenSetResult = {
  outcome: 'passed' | 'failed';
  sampleCount: number;
  failedCount: number;
};

const SENSITIVE_GOLDEN_SAMPLES: ReadonlyArray<readonly [sample: string, rawSensitiveValue: string]> = [
  ['SSN 123-45-6789', '123-45-6789'],
  ['SSN: 987654321', '987654321'],
  ['social security number 111-22-3333', '111-22-3333'],
  ['social security # 444556666', '444556666'],
  ['Engagement ID 1234567', '1234567'],
  ['Engagement ID: 7654321', '7654321'],
  ['Engagement ID# 222333444', '222333444'],
  ['engagement record number 333444555', '333444555'],
  ['engagement record # 444555666', '444555666'],
  ['client id PAT-12345', 'PAT-12345'],
  ['client id 12345678', '12345678'],
  ['client identifier PX-9090', 'PX-9090'],
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
  ['alternate user+engagement_confidential@advisory.example.net', 'user+engagement_confidential@advisory.example.net'],
  ['phone 212-555-0188', '212-555-0188'],
  ['phone (212) 555-0188', '(212) 555-0188'],
  ['phone +1 212 555 0188', '+1 212 555 0188'],
  ['mobile 415.555.1212', '415.555.1212'],
  ['cell 6175550101', '6175550101'],
  ['requestor SSN 222-33-4444 in prompt', '222-33-4444'],
  ['requestor SSN 222334444 in prompt', '222334444'],
  ['member Engagement ID 10101010 flagged', '10101010'],
  ['member engagement record number 20202020 flagged', '20202020'],
  ['member client id MEMBER-123 flagged', 'MEMBER-123'],
  ['member account number ACCOUNT-321 flagged', 'ACCOUNT-321'],
  ['member DOB 09/09/1999 flagged', '09/09/1999'],
  ['member date of birth 1999-09-09 flagged', '1999-09-09'],
  ['member birthdate 08/08/1988 flagged', '08/08/1988'],
  ['member email engagement_confidential.case@example.org flagged', 'engagement_confidential.case@example.org'],
  ['member phone 303-555-0100 flagged', '303-555-0100'],
  ['SSN=555-66-7777', '555-66-7777'],
  ['SSN 555667777', '555667777'],
  ['Engagement ID-888999000', '888999000'],
  ['DOB-02/03/1970', '02/03/1970'],
  ['date of birth-1970-02-03', '1970-02-03'],
  ['birth date: 03/04/1971', '03/04/1971'],
  ['client identifier 444555666', '444555666'],
  ['account id 777666555', '777666555'],
  ['send to engagement.manager@example.com', 'engagement.manager@example.com'],
  ['callback +1-800-555-0199', '+1-800-555-0199'],
  ['call 800 555 0199 now', '800 555 0199'],
];

let onboardingTelemetryClient: TelemetryClientLike | undefined;
let telemetryProcessorRegistered = false;

export function redactSensitiveData(value: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (currentValue, engagement_confidentialPattern) => currentValue.replace(engagement_confidentialPattern.pattern, engagement_confidentialPattern.replacement ?? `[REDACTED:${engagement_confidentialPattern.type}]`),
    value,
  );
}

export function scrubTelemetryAttributes<T>(value: T): T {
  return scrubTelemetryAttributesInner(value, new WeakSet<object>());
}

function scrubTelemetryAttributesInner<T>(value: T, seen: WeakSet<object>): T {
  if (typeof value === 'string') {
    return redactSensitiveData(value) as T;
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

export function summarizeSensitiveFindings(value: string): SensitiveFindingSummary {
  const byType: Partial<Record<SensitiveType, number>> = {};

  for (const engagement_confidentialPattern of SENSITIVE_PATTERNS) {
    const matches = value.match(engagement_confidentialPattern.pattern) ?? [];
    if (matches.length > 0) {
      byType[engagement_confidentialPattern.type] = matches.length;
    }
  }

  return {
    total: Object.values(byType).reduce((sum, count) => sum + (count ?? 0), 0),
    byType,
  };
}

export function runSensitiveScrubberGoldenSetCheck(): SensitiveGoldenSetResult {
  const failedCount = SENSITIVE_GOLDEN_SAMPLES.filter(([sample, rawSensitiveValue]) => redactSensitiveData(sample).includes(rawSensitiveValue)).length;

  return {
    outcome: failedCount === 0 ? 'passed' : 'failed',
    sampleCount: SENSITIVE_GOLDEN_SAMPLES.length,
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

  registerSensitiveScrubberTelemetryProcessor();
}

function registerSensitiveScrubberTelemetryProcessor(): void {
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
  return redactSensitiveData(key)
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
