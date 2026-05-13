import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { ingestOnboardingScanFindings, verifyOnboardingProvenance } from '../../lib/onboarding/evidence.js';

const ProvenanceSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1).default('github-actions'),
  issuer: z.string().min(1),
  subject: z.string().min(1),
  sourceSha: z.string().min(1),
  builderIdentity: z.string().min(1),
  attestationUrl: z.string().url(),
  sbomUrl: z.string().url(),
});

const ScanFindingSchema = z.object({
  rule_id: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  file_line: z.string().optional(),
  message: z.string().min(1),
  remediation_url: z.string().url().optional(),
});

const ScanSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1).default('github-actions'),
  phiSuspected: z.boolean().default(false),
  findings: z.array(ScanFindingSchema).default([]),
});

app.http('verifyOnboardingProvenance', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/provenance',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = ProvenanceSchema.safeParse(await req.json());
      if (!parsed.success) return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };

      const result = await verifyOnboardingProvenance({ ...parsed.data, submissionId: req.params.id });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('verifyOnboardingProvenance error:', err);
      return toEvidenceErrorResponse(err);
    }
  },
});

app.http('ingestOnboardingScanFindings', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'onboarding/submissions/{id}/scan-findings',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const parsed = ScanSchema.safeParse(await req.json());
      if (!parsed.success) return { status: 400, jsonBody: { error: 'Validation failed', details: parsed.error.flatten() } };

      const result = await ingestOnboardingScanFindings({ ...parsed.data, submissionId: req.params.id });
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error('ingestOnboardingScanFindings error:', err);
      return toEvidenceErrorResponse(err);
    }
  },
});

function toEvidenceErrorResponse(err: unknown): HttpResponseInit {
  const message = (err as Error).message;
  if (message.includes('not found')) return { status: 404, jsonBody: { error: message } };
  if (message.includes('terminal')) return { status: 409, jsonBody: { error: message } };
  return { status: 500, jsonBody: { error: 'Internal server error' } };
}