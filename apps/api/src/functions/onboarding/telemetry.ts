import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { runSensitiveScrubberGoldenSetCheck, trackOnboardingEvent } from '../../lib/telemetry/sensitive-scrubber.js';

app.http('onboardingTelemetryHealth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'onboarding/telemetry/health',
  handler: async (_req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const engagement_confidentialGoldenSet = runSensitiveScrubberGoldenSetCheck();
    const isHealthy = engagement_confidentialGoldenSet.outcome === 'passed';

    trackOnboardingEvent('nebula-x.onboarding.telemetry_health', {
      outcome: isHealthy ? 'healthy' : 'degraded',
      stage: 'foundation',
    });
    trackOnboardingEvent('nebula-x.engagement_confidential_scrubber.golden_set', {
      outcome: engagement_confidentialGoldenSet.outcome,
      sample_count: engagement_confidentialGoldenSet.sampleCount,
      failed_count: engagement_confidentialGoldenSet.failedCount,
    });

    ctx.log('nebula-x.onboarding.telemetry_health emitted');

    return {
      status: isHealthy ? 200 : 500,
      jsonBody: { status: isHealthy ? 'healthy' : 'degraded' },
    };
  },
});