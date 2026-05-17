import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { runPhiScrubberGoldenSetCheck, trackOnboardingEvent } from '../../lib/telemetry/phi-scrubber.js';

app.http('onboardingTelemetryHealth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'onboarding/telemetry/health',
  handler: async (_req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const phiGoldenSet = runPhiScrubberGoldenSetCheck();
    const isHealthy = phiGoldenSet.outcome === 'passed';

    trackOnboardingEvent('uap.onboarding.telemetry_health', {
      outcome: isHealthy ? 'healthy' : 'degraded',
      stage: 'foundation',
    });
    trackOnboardingEvent('uap.phi_scrubber.golden_set', {
      outcome: phiGoldenSet.outcome,
      sample_count: phiGoldenSet.sampleCount,
      failed_count: phiGoldenSet.failedCount,
    });

    ctx.log('uap.onboarding.telemetry_health emitted');

    return {
      status: isHealthy ? 200 : 500,
      jsonBody: { status: isHealthy ? 'healthy' : 'degraded' },
    };
  },
});