export interface DeadLetterDescriptorInput {
  tenantId: string;
  traceId: string;
  stage: string;
  failureCategory: 'denied' | 'waiting-approval' | 'timeout' | 'binding-failed' | 'transformed' | 'domain-failed';
  retryEligible: boolean;
  expiresAt?: string;
}

export interface DeadLetterDescriptor {
  type: 'dead-letter';
  href: string;
  requiredPermission: 'dead-letter:status';
  state: 'available';
  expiresAt?: string;
  metadata: {
    tenantId: string;
    traceId: string;
    stage: string;
    failureCategory: DeadLetterDescriptorInput['failureCategory'];
    retryEligible: boolean;
  };
}

const disallowedPayloadFields = ['payload', 'rawPayload', 'rawEnvelope', 'envelope'];

export function buildDeadLetterDescriptor(input: DeadLetterDescriptorInput): DeadLetterDescriptor {
  rejectUnsafeFields(input);
  return {
    type: 'dead-letter',
    href: `/global-orchestrator/${encodeURIComponent(input.traceId)}?panel=dead-letter`,
    requiredPermission: 'dead-letter:status',
    state: 'available',
    expiresAt: input.expiresAt,
    metadata: {
      tenantId: input.tenantId,
      traceId: input.traceId,
      stage: input.stage,
      failureCategory: input.failureCategory,
      retryEligible: input.retryEligible,
    },
  };
}

function rejectUnsafeFields(value: object): void {
  for (const field of disallowedPayloadFields) {
    if (field in value) {
      throw new Error(`Dead-letter descriptors cannot include raw payload field: ${field}`);
    }
  }
}