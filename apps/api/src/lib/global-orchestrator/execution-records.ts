import { CONTAINERS, getContainer } from '../cosmos/client.js';
import { scrubTelemetryAttributes } from '../telemetry/phi-scrubber.js';

export type GlobalStage =
  | 'intake'
  | 'global-pre-flight'
  | 'routing'
  | 'domain-execution'
  | 'global-post-flight'
  | 'completed'
  | 'failed';

export type GlobalStageStatusValue = 'pending' | 'running' | 'completed' | 'failed' | 'blocked' | 'skipped';

export interface GlobalStageEvent {
  tenantId: string;
  traceId: string;
  stage: GlobalStage;
  status: GlobalStageStatusValue;
  occurredAt: string;
  idempotencyKey: string;
  writer: { type: string; id: string };
  selectedDomain?: string;
  policyDecision?: {
    decision: 'allow' | 'deny' | 'transform' | 'pending-approval';
    decisionId?: string;
    reason?: string;
  };
  safeDomainSummary?: Record<string, unknown>;
  linkDescriptors?: SafeLinkDescriptor[];
}

export interface SafeLinkDescriptor {
  type: 'policy' | 'audit' | 'dead-letter' | 'domain' | 'health' | 'onboarding';
  href: string;
  requiredPermission: string;
  expiresAt?: string;
  state?: 'available' | 'expired' | 'unauthorized' | 'unavailable';
  metadata?: Record<string, unknown>;
}

export interface GlobalExecutionRecord {
  id: string;
  schemaVersion: 1;
  tenantId: string;
  traceId: string;
  currentStage: GlobalStage;
  stageStatuses: Partial<Record<GlobalStage, { status: GlobalStageStatusValue; updatedAt: string; writer: { type: string; id: string } }>>;
  eventIds: string[];
  selectedDomain?: string;
  policyDecision?: GlobalStageEvent['policyDecision'];
  safeDomainSummary?: Record<string, unknown>;
  linkDescriptors: SafeLinkDescriptor[];
  createdAt: string;
  updatedAt: string;
}

export interface ListGlobalExecutionRecordsInput {
  tenantId: string;
  pageSize?: number;
  continuationToken?: string;
}

const disallowedPayloadFields = ['payload', 'rawPayload', 'rawEnvelope', 'envelope', 'policyInput'];

export async function upsertGlobalStageEvent(event: GlobalStageEvent): Promise<GlobalExecutionRecord> {
  rejectUnsafeFields(event);

  const container = await getContainer(CONTAINERS.GLOBAL_EXECUTION_RECORDS);
  const id = recordId(event.tenantId, event.traceId);
  const { resource: existing } = await container.item(id, event.tenantId).read<GlobalExecutionRecord>();
  if (existing?.eventIds.includes(event.idempotencyKey)) {
    return existing;
  }

  const now = event.occurredAt;
  const next: GlobalExecutionRecord = {
    id,
    schemaVersion: 1,
    tenantId: event.tenantId,
    traceId: event.traceId,
    currentStage: nextCurrentStage(existing, event),
    stageStatuses: {
      ...(existing?.stageStatuses ?? {}),
      [event.stage]: { status: event.status, updatedAt: now, writer: event.writer },
    },
    eventIds: [...(existing?.eventIds ?? []), event.idempotencyKey],
    selectedDomain: event.selectedDomain ?? existing?.selectedDomain,
    policyDecision: event.policyDecision ?? existing?.policyDecision,
    safeDomainSummary: event.safeDomainSummary ? scrubTelemetryAttributes(event.safeDomainSummary) : existing?.safeDomainSummary,
    linkDescriptors: mergeLinks(existing?.linkDescriptors ?? [], sanitizeLinks(event.linkDescriptors ?? [])),
    createdAt: existing?.createdAt ?? now,
    updatedAt: nextUpdatedAt(existing, event),
  };

  const { resource } = await container.items.upsert(next);
  return resource ?? next;
}

export async function getGlobalExecutionRecord(input: { tenantId: string; traceId: string }): Promise<GlobalExecutionRecord> {
  const container = await getContainer(CONTAINERS.GLOBAL_EXECUTION_RECORDS);
  const { resource } = await container.item(recordId(input.tenantId, input.traceId), input.tenantId).read<GlobalExecutionRecord>();
  if (!resource) throw new Error('Global execution record not found');
  return resource;
}

export async function listGlobalExecutionRecords(input: ListGlobalExecutionRecordsInput): Promise<{ items: GlobalExecutionRecord[]; continuationToken?: string }> {
  const container = await getContainer(CONTAINERS.GLOBAL_EXECUTION_RECORDS);
  const page = await container.items.query<GlobalExecutionRecord>({
    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.updatedAt DESC',
    parameters: [{ name: '@tenantId', value: input.tenantId }],
  }, {
    partitionKey: input.tenantId,
    maxItemCount: Math.min(Math.max(input.pageSize ?? 50, 1), 200),
    continuationToken: input.continuationToken,
  }).fetchNext();

  return { items: page.resources, continuationToken: page.continuationToken };
}

function recordId(tenantId: string, traceId: string): string {
  return `${tenantId}:${traceId}`;
}

function rejectUnsafeFields(value: object): void {
  for (const field of disallowedPayloadFields) {
    if (field in value) {
      throw new Error(`Global stage events cannot include raw payload field: ${field}`);
    }
  }
}

function mergeLinks(existing: SafeLinkDescriptor[], incoming: SafeLinkDescriptor[]): SafeLinkDescriptor[] {
  const byKey = new Map(existing.map((link) => [`${link.type}:${link.href}`, link]));
  for (const link of incoming) {
    byKey.set(`${link.type}:${link.href}`, link);
  }
  return [...byKey.values()];
}

const stageRank: Record<GlobalStage, number> = {
  intake: 1,
  'global-pre-flight': 2,
  routing: 3,
  'domain-execution': 4,
  'global-post-flight': 5,
  completed: 6,
  failed: 6,
};

function nextCurrentStage(existing: GlobalExecutionRecord | undefined, event: GlobalStageEvent): GlobalStage {
  if (!existing) return event.stage;
  if (existing.currentStage === 'completed' || existing.currentStage === 'failed') return existing.currentStage;
  return stageRank[event.stage] >= stageRank[existing.currentStage] ? event.stage : existing.currentStage;
}

function nextUpdatedAt(existing: GlobalExecutionRecord | undefined, event: GlobalStageEvent): string {
  if (!existing) return event.occurredAt;
  return new Date(event.occurredAt).getTime() >= new Date(existing.updatedAt).getTime() ? event.occurredAt : existing.updatedAt;
}

function sanitizeLinks(links: SafeLinkDescriptor[]): SafeLinkDescriptor[] {
  return links.map((link) => {
    if (!link.href.startsWith('/') || link.href.startsWith('//') || link.href.includes('://')) {
      throw new Error('Global execution links must be internal routes');
    }
    return { ...link, metadata: link.metadata ? scrubTelemetryAttributes(link.metadata) : undefined };
  });
}