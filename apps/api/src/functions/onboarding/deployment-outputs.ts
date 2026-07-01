import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { activateSubmissionDeployment } from '../../lib/onboarding/activation.js';
import { verifyGitHubWebhookSignature } from '../../lib/onboarding/github-webhook.js';

const DeploymentOutputsSchema = z.object({
  tenantId: z.string().min(1),
  deploymentOutputs: z.object({
    endpointUrl: z.string().url(),
    resourceId: z.string().optional(),
    apimOperationUrl: z.string().url().optional(),
  }),
});

app.http('onboardingDeploymentOutputs', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'submissions/{id}/deployment-outputs',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const secret = process.env.DEPLOYMENT_OUTPUTS_SECRET;
      if (!secret) {
        ctx.error('DEPLOYMENT_OUTPUTS_SECRET is not configured');
        return { status: 500, jsonBody: { error: 'Deployment outputs secret not configured' } };
      }

      const rawBody = Buffer.from(await req.arrayBuffer());
      const signature = req.headers.get('x-nebula-x-signature-256') ?? undefined;
      if (!verifyGitHubWebhookSignature(secret, rawBody, signature)) {
        return { status: 401, jsonBody: { error: 'Invalid deployment outputs signature' } };
      }

      let body: unknown;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return { status: 400, jsonBody: { error: 'Invalid JSON payload' } };
      }

      const parsed = DeploymentOutputsSchema.safeParse(body);
      if (!parsed.success) {
        return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };
      }

      const result = await activateSubmissionDeployment({
        submissionId: req.params.id,
        tenantId: parsed.data.tenantId,
        deploymentOutputs: parsed.data.deploymentOutputs,
        actorId: 'github-actions',
      });

      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('onboardingDeploymentOutputs error:', err);
      return { status: String((err as Error).message).includes('not found') ? 404 : 409, jsonBody: { error: (err as Error).message } };
    }
  },
});