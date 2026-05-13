import crypto from 'node:crypto';

export type SanitizedGitHubWebhookEvent = {
  eventName: string;
  deliveryId: string;
  action?: string;
  installationId?: string;
  repositoryId?: string;
  repositoryFullName?: string;
  repositoryUrl?: string;
  runId?: string;
  checkSuiteId?: string;
  pullRequestNumber?: string;
  headSha?: string;
  status?: string;
  conclusion?: string;
};

const SUPPORTED_ACTIONS: Record<string, Set<string> | null> = {
  workflow_run: new Set(['completed']),
  check_suite: new Set(['completed']),
  pull_request: new Set(['opened', 'synchronize', 'reopened', 'closed']),
  ping: null,
};

export function verifyGitHubWebhookSignature(secret: string, rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!secret || !signatureHeader?.startsWith('sha256=')) {
    return false;
  }

  const expected = Buffer.from(
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex'),
    'hex',
  );
  const actual = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function buildSha256BodyHash(rawBody: Buffer): string {
  return crypto.createHash('sha256').update(rawBody).digest('hex');
}

export function isSupportedGitHubWebhook(eventName: string, action: string | undefined): boolean {
  const actions = SUPPORTED_ACTIONS[eventName];
  if (actions === undefined) {
    return false;
  }
  if (actions === null) {
    return true;
  }

  return action !== undefined && actions.has(action);
}

export function buildSanitizedGitHubWebhookEvent(
  eventName: string,
  deliveryId: string,
  payload: Record<string, unknown>,
): SanitizedGitHubWebhookEvent {
  const repository = asRecord(payload.repository);
  const installation = asRecord(payload.installation);
  const workflowRun = asRecord(payload.workflow_run);
  const checkSuite = asRecord(payload.check_suite);
  const pullRequest = asRecord(payload.pull_request);

  return dropUndefined({
    eventName,
    deliveryId,
    action: asString(payload.action),
    installationId: stringifyId(installation.id),
    repositoryId: stringifyId(repository.id),
    repositoryFullName: asString(repository.full_name),
    repositoryUrl: asString(repository.html_url),
    runId: stringifyId(workflowRun.id),
    checkSuiteId: stringifyId(checkSuite.id),
    pullRequestNumber: stringifyId(pullRequest.number),
    headSha: asString(workflowRun.head_sha) ?? asString(checkSuite.head_sha) ?? asString(pullRequest.head?.sha),
    status: asString(workflowRun.status) ?? asString(checkSuite.status),
    conclusion: asString(workflowRun.conclusion) ?? asString(checkSuite.conclusion),
  });
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function stringifyId(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}