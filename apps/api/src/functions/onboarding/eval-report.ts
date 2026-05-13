import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { ingestOnboardingEvalReport } from '../../lib/onboarding/eval-report.js';

const EvalReportSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1).default('github-actions'),
  passCount: z.number().int().min(0),
  failCount: z.number().int().min(0),
  scoreDeltaVsPrior: z.number(),
  reportUrl: z.string().url(),
});

app.http('ingestOnboardingEvalReport', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/eval-report',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = EvalReportSchema.safeParse(await req.json());
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await ingestOnboardingEvalReport({ ...parsed.data, submissionId: req.params.id });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('ingestOnboardingEvalReport error:', err);
      const message = (err as Error).message;
      if (message.includes('not found')) return { status: 404, jsonBody: { error: message } };
      if (message.includes('provisioning')) return { status: 409, jsonBody: { error: message } };
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  },
});