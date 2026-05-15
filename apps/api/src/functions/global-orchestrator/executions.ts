import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { AuthError, getAuthorizationContext, verifyConfiguredBearerToken } from '../../lib/auth/context.js';
import { hasPermission, PERMISSIONS } from '../../lib/auth/permissions.js';
import {
  getGlobalExecutionRecord,
  listGlobalExecutionRecords,
  upsertGlobalStageEvent,
} from '../../lib/global-orchestrator/execution-records.js';

const StageEventSchema = z.object({
  tenantId: z.string().min(1),
  traceId: z.string().min(1),
  stage: z.enum(['intake', 'global-pre-flight', 'routing', 'domain-execution', 'global-post-flight', 'completed', 'failed']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'blocked', 'skipped']),
  occurredAt: z.string().datetime(),
  idempotencyKey: z.string().min(1),
  writer: z.object({ type: z.string().min(1), id: z.string().min(1) }),
  selectedDomain: z.string().min(1).optional(),
  policyDecision: z.object({
    decision: z.enum(['allow', 'deny', 'transform', 'pending-approval']),
    decisionId: z.string().min(1).optional(),
    reason: z.string().optional(),
  }).optional(),
  safeDomainSummary: z.record(z.unknown()).optional(),
  linkDescriptors: z.array(z.object({
    type: z.enum(['policy', 'audit', 'dead-letter', 'domain', 'health', 'onboarding']),
    href: z.string().min(1),
    requiredPermission: z.string().min(1),
    expiresAt: z.string().datetime().optional(),
    state: z.enum(['available', 'expired', 'unauthorized', 'unavailable']).optional(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
}).strict();

async function listExecutions(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await getRequestContext(req);
    if (!hasPermission(auth, PERMISSIONS.COCKPIT_READ)) return forbidden();

    const pageSize = Number(req.query.get('pageSize') ?? '50');
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) {
      return { status: 400, jsonBody: { error: 'pageSize must be an integer between 1 and 200' } };
    }
    const continuationToken = req.query.get('continuationToken') ?? undefined;
    const result = await listGlobalExecutionRecords({ tenantId: auth.tenantId, pageSize, continuationToken });
    return { status: 200, jsonBody: result };
  } catch (err) {
    return handleError(err, ctx, 'listGlobalOrchestratorExecutions');
  }
}

async function getExecution(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await getRequestContext(req);
    if (!hasPermission(auth, PERMISSIONS.COCKPIT_READ)) return forbidden();

    const record = await getGlobalExecutionRecord({ tenantId: auth.tenantId, traceId: req.params.traceId });
    return { status: 200, jsonBody: record };
  } catch (err) {
    return handleError(err, ctx, 'getGlobalOrchestratorExecution');
  }
}

async function createDevStageEvent(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await getRequestContext(req);
    if (!hasPermission(auth, PERMISSIONS.STAGE_EVENT_WRITE)) return forbidden();

    const parsed = StageEventSchema.safeParse(await req.json());
    if (!parsed.success) {
      return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
    }
    if (parsed.data.tenantId !== auth.tenantId) {
      return forbidden();
    }

    const record = await upsertGlobalStageEvent(parsed.data);
    return { status: 202, jsonBody: record };
  } catch (err) {
    return handleError(err, ctx, 'createGlobalOrchestratorDevStageEvent');
  }
}

function getRequestContext(req: HttpRequest) {
  return getAuthorizationContext(req, {
    allowLocalDevFallback: process.env.UAP_AUTH_LOCAL_DEV_BYPASS === 'true'
      && process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development',
    verifyBearerToken: verifyConfiguredBearerToken,
  });
}

function forbidden(): HttpResponseInit {
  return { status: 403, jsonBody: { error: 'Forbidden' } };
}

function handleError(err: unknown, ctx: InvocationContext, operation: string): HttpResponseInit {
  if (err instanceof AuthError) {
    return { status: err.status, jsonBody: { error: err.message } };
  }
  if (err instanceof Error && /not found/i.test(err.message)) {
    return { status: 404, jsonBody: { error: 'Execution not found' } };
  }

  ctx.error(`${operation} error:`, err);
  return { status: 500, jsonBody: { error: 'Internal server error' } };
}

app.http('listGlobalOrchestratorExecutions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'global-orchestrator/executions',
  handler: listExecutions,
});

app.http('getGlobalOrchestratorExecution', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'global-orchestrator/executions/{traceId}',
  handler: getExecution,
});

if (process.env.UAP_ENABLE_GLOBAL_ORCHESTRATOR_DEV_EVENTS === 'true' && process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development') {
  app.http('createGlobalOrchestratorDevStageEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'global-orchestrator/executions/events',
    handler: createDevStageEvent,
  });
}