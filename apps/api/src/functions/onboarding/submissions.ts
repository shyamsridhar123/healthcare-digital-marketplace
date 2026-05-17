import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { CONTAINERS, getContainer } from '../../lib/cosmos/client.js';
import {
  createOnboardingSubmission,
  decideOnboardingApproval,
  withdrawOnboardingSubmission,
} from '../../lib/onboarding/service.js';

const SourceSchema = z.enum(['portal', 'cli', 'vscode-skill', 'github-app-webhook']);

const CreateOnboardingSubmissionSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1).default('system'),
  source: SourceSchema.default('portal'),
  manifest: z.any(),
  repoContext: z.object({
    url: z.string().url().optional(),
    branch: z.string().min(1).optional(),
    commit_sha: z.string().min(1).optional(),
    pr_number: z.string().min(1).optional(),
    workflow_run_id: z.string().min(1).optional(),
  }).optional(),
  traceId: z.string().min(1).optional(),
});

const DecisionSchema = z.object({
  tenantId: z.string().min(1),
  reviewerId: z.string().min(1),
  justification: z.string().min(1),
});

const WithdrawSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  reason: z.string().min(1),
});

app.http('createOnboardingSubmission', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = CreateOnboardingSubmissionSchema.safeParse(await req.json());
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await createOnboardingSubmission({
        tenantId: parsed.data.tenantId,
        actorId: parsed.data.actorId,
        source: parsed.data.source,
        manifest: parsed.data.manifest,
        repoContext: parsed.data.repoContext,
        traceId: parsed.data.traceId,
      });
      return { status: result.idempotent ? 200 : 201, jsonBody: result };
    } catch (err) {
      ctx.error('createOnboardingSubmission error:', err);
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  },
});

app.http('getOnboardingSubmission', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const tenantId = req.query.get('tenantId');
      if (!tenantId) {
        return { status: 400, jsonBody: { error: 'tenantId is required' } };
      }

      const submissions = await getContainer(CONTAINERS.SUBMISSIONS);
      const { resource } = await submissions.item(req.params.id, tenantId).read();
      if (!resource) {
        return { status: 404, jsonBody: { error: 'Submission not found' } };
      }

      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error('getOnboardingSubmission error:', err);
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  },
});

app.http('approveOnboardingSubmission', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/approve',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = DecisionSchema.safeParse(await req.json());
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await decideOnboardingApproval({ ...parsed.data, submissionId: req.params.id, decision: 'approved' });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('approveOnboardingSubmission error:', err);
      return statusFromError(err as Error);
    }
  },
});

app.http('rejectOnboardingSubmission', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/reject',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = DecisionSchema.safeParse(await req.json());
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await decideOnboardingApproval({ ...parsed.data, submissionId: req.params.id, decision: 'rejected' });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('rejectOnboardingSubmission error:', err);
      return statusFromError(err as Error);
    }
  },
});

app.http('withdrawOnboardingSubmission', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/withdraw',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = WithdrawSchema.safeParse(await req.json());
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await withdrawOnboardingSubmission({ ...parsed.data, submissionId: req.params.id });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('withdrawOnboardingSubmission error:', err);
      return statusFromError(err as Error);
    }
  },
});

function statusFromError(err: Error): HttpResponseInit {
  if (err.message.includes('not found')) {
    return { status: 404, jsonBody: { error: err.message } };
  }
  if (err.message.includes('terminal') || err.message.includes('not waiting')) {
    return { status: 409, jsonBody: { error: err.message } };
  }
  return { status: 500, jsonBody: { error: 'Internal server error' } };
}