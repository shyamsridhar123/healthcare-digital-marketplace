import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { CONTAINERS, getContainer } from '../../lib/cosmos/client.js';
import {
  buildSha256BodyHash,
  buildSanitizedGitHubWebhookEvent,
  isSupportedGitHubWebhook,
  verifyGitHubWebhookSignature,
} from '../../lib/onboarding/github-webhook.js';
import { trackOnboardingEvent } from '../../lib/telemetry/sensitive-scrubber.js';

app.http('onboardingGitHubWebhook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'onboarding/github/webhook',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      ctx.error('GITHUB_WEBHOOK_SECRET is not configured');
      return { status: 500, jsonBody: { error: 'Webhook secret not configured' } };
    }

    const eventName = req.headers.get('x-github-event') ?? '';
    const deliveryId = req.headers.get('x-github-delivery') ?? '';
    const signature = req.headers.get('x-hub-signature-256') ?? undefined;
    const rawBody = Buffer.from(await req.arrayBuffer());

    if (!eventName || !deliveryId || !verifyGitHubWebhookSignature(secret, rawBody, signature)) {
      return { status: 401, jsonBody: { error: 'Invalid GitHub webhook signature' } };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON payload' } };
    }

    const action = typeof payload.action === 'string' ? payload.action : undefined;
    if (!isSupportedGitHubWebhook(eventName, action)) {
      trackOnboardingEvent('nebula-x.onboarding.github_webhook.ignored', { eventName, action: action ?? 'none' });
      return { status: 202, jsonBody: { status: 'ignored' } };
    }

    const sanitized = buildSanitizedGitHubWebhookEvent(eventName, deliveryId, payload);
    const repositoryPartition = sanitized.repositoryId ?? 'github';
    const bodyHashId = `github-webhook-body-${buildSha256BodyHash(rawBody)}`;
    const deliveries = await getContainer(CONTAINERS.AUDIT_EVENTS);
    const { resource: existingDelivery } = await deliveries.item(deliveryId, repositoryPartition).read<any>();
    const { resource: existingBody } = await deliveries.item(bodyHashId, repositoryPartition).read<any>();
    if (existingDelivery || existingBody) {
      trackOnboardingEvent('nebula-x.onboarding.github_webhook.duplicate', { eventName, deliveryId });
      return { status: 202, jsonBody: { status: 'duplicate' } };
    }

    await deliveries.items.create({
      id: deliveryId,
      tenantId: repositoryPartition,
      type: 'github-webhook-delivery',
      event: sanitized,
      ttl: 604800,
      receivedAt: new Date().toISOString(),
    });
    await deliveries.items.create({
      id: bodyHashId,
      tenantId: repositoryPartition,
      type: 'github-webhook-body-hash',
      deliveryId,
      eventName,
      ttl: 604800,
      receivedAt: new Date().toISOString(),
    });

    trackOnboardingEvent('nebula-x.onboarding.github_webhook.received', {
      eventName,
      action: action ?? 'none',
      deliveryId,
      repositoryId: sanitized.repositoryId ?? 'unknown',
      conclusion: sanitized.conclusion ?? 'none',
    });

    return { status: 202, jsonBody: { status: 'accepted', event: sanitized } };
  },
});