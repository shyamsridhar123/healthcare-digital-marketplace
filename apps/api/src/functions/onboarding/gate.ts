import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { openOnboardingGate, transitionOnboardingGate } from '../../lib/onboarding/gate.js';

const OpenGateSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1).default('onboarding-agent'),
  checkRunId: z.string().min(1),
});

const TransitionGateSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1).default('onboarding-agent'),
  targetStatus: z.enum(['success', 'failure']),
});

app.http('openOnboardingGate', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/gate/open',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = OpenGateSchema.safeParse(await req.json());
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await openOnboardingGate({ ...parsed.data, submissionId: req.params.id });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('openOnboardingGate error:', err);
      return statusFromError(err as Error);
    }
  },
});

app.http('transitionOnboardingGate', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/gate/transition',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = TransitionGateSchema.safeParse(await req.json());
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await transitionOnboardingGate({ ...parsed.data, submissionId: req.params.id });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('transitionOnboardingGate error:', err);
      return statusFromError(err as Error);
    }
  },
});

function statusFromError(err: Error): HttpResponseInit {
  if (err.message.includes('not found')) {
    return { status: 404, jsonBody: { error: err.message } };
  }
  if (err.message.includes('approved')) {
    return { status: 409, jsonBody: { error: err.message } };
  }
  return { status: 500, jsonBody: { error: 'Internal server error' } };
}