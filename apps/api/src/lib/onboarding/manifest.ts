import { z } from 'zod';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

const SemverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Expected MAJOR.MINOR.PATCH semver');

const AgentManifestSchema = z.object({
  name: z.string().min(3).max(120),
  version: SemverSchema,
  description: z.string().min(30).max(1000),
  owner: z.object({
    team: z.string().min(1),
    email: z.string().email(),
  }),
  runtime: z.object({
    type: z.enum(['aca']),
    image: z.string().min(1),
  }),
  capabilities: z.array(z.string().min(1)).min(1),
  rai: z.object({
    tags: z.array(z.string()).default([]),
    data_categories: z.array(z.string()).default(['none']),
  }),
  repository: z.object({
    url: z.string().url(),
    branch: z.string().min(1).default('main'),
  }).optional(),
  network: z.object({
    egress: z.boolean().default(false),
  }).optional(),
});

export type AgentManifest = z.infer<typeof AgentManifestSchema> & { riskTier: RiskTier };

export type ManifestValidationResult =
  | { valid: true; manifest: AgentManifest; errors: [] }
  | { valid: false; errors: Array<{ path: string; message: string }> };

export function validateAgentManifest(input: unknown): ManifestValidationResult {
  const parsed = AgentManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => ({
        path: `/${issue.path.join('/')}`,
        message: issue.message,
      })),
    };
  }

  return {
    valid: true,
    manifest: {
      ...parsed.data,
      riskTier: classifyRiskTier({
        dataCategories: parsed.data.rai.data_categories,
        networkEgress: parsed.data.network?.egress ?? false,
      }),
    },
    errors: [],
  };
}

export function compareSemver(candidate: string, current: string): -1 | 0 | 1 {
  const candidateParts = parseSemver(candidate);
  const currentParts = parseSemver(current);

  for (let index = 0; index < candidateParts.length; index += 1) {
    if (candidateParts[index] > currentParts[index]) return 1;
    if (candidateParts[index] < currentParts[index]) return -1;
  }

  return 0;
}

export function classifyRiskTier(input: { dataCategories: string[]; networkEgress: boolean }): RiskTier {
  const categories = input.dataCategories.map((category) => category.toLowerCase());
  if (categories.some((category) => ['engagement_confidential', 'hipaa'].includes(category))) {
    return 'high';
  }

  if (categories.some((category) => ['pii', 'confidential'].includes(category)) || input.networkEgress) {
    return 'medium';
  }

  return 'low';
}

function parseSemver(value: string): [number, number, number] {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver: ${value}`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}