import type { HttpRequest } from '@azure/functions';

export type MarketplaceRole = 'platform-operator' | 'domain-author' | 'tenant-admin' | 'compliance' | 'viewer';

export interface AuthorizationContext {
  tenantId: string;
  userId: string;
  displayName?: string;
  roles: MarketplaceRole[];
  authType: 'bearer' | 'local-dev';
  ownerTeam?: string;
  ownerEmail?: string;
}

export interface BearerClaims {
  tid?: string;
  tenantId?: string;
  oid?: string;
  sub?: string;
  preferred_username?: string;
  upn?: string;
  name?: string;
  roles?: string[];
  scp?: string;
  owner_team?: string;
  owner_email?: string;
}

export interface AuthorizationOptions {
  allowLocalDevFallback?: boolean;
  verifyBearerToken?: (token: string) => Promise<BearerClaims>;
}

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function getAuthorizationContext(
  req: Pick<HttpRequest, 'headers'>,
  options: AuthorizationOptions = {},
): Promise<AuthorizationContext> {
  const bearerToken = readBearerToken(req);
  if (bearerToken) {
    if (!options.verifyBearerToken) {
      throw new AuthError(401, 'Bearer token verifier is not configured');
    }

    const claims = await options.verifyBearerToken(bearerToken);
    return contextFromClaims(claims);
  }

  if (options.allowLocalDevFallback) {
    return contextFromLocalDevHeaders(req);
  }

  throw new AuthError(401, 'Bearer token is required');
}

function readBearerToken(req: Pick<HttpRequest, 'headers'>): string | undefined {
  const value = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function contextFromClaims(claims: BearerClaims): AuthorizationContext {
  const tenantId = claims.tid ?? claims.tenantId;
  const userId = claims.oid ?? claims.sub;
  if (!tenantId || !userId) {
    throw new AuthError(401, 'Bearer token is missing required tenant or user claims');
  }

  return {
    tenantId,
    userId,
    displayName: claims.preferred_username ?? claims.upn ?? claims.name,
    roles: normalizeRoles([...(claims.roles ?? []), ...(claims.scp?.split(' ') ?? [])]),
    authType: 'bearer',
    ownerTeam: claims.owner_team,
    ownerEmail: claims.owner_email,
  };
}

function contextFromLocalDevHeaders(req: Pick<HttpRequest, 'headers'>): AuthorizationContext {
  const tenantId = req.headers.get('x-marketplace-dev-tenant');
  const userId = req.headers.get('x-marketplace-dev-user');
  if (!tenantId || !userId) {
    throw new AuthError(401, 'Local development auth fallback requires tenant and user headers');
  }

  return {
    tenantId,
    userId,
    displayName: userId,
    roles: normalizeRoles((req.headers.get('x-marketplace-dev-roles') ?? '').split(',')),
    authType: 'local-dev',
    ownerTeam: req.headers.get('x-marketplace-dev-owner-team') ?? undefined,
    ownerEmail: req.headers.get('x-marketplace-dev-owner-email') ?? undefined,
  };
}

export async function verifyConfiguredBearerToken(token: string): Promise<BearerClaims> {
  const tenantId = process.env.UAP_ENTRA_TENANT_ID;
  const audience = process.env.UAP_API_AUDIENCE;
  if (!tenantId || !audience) {
    throw new AuthError(401, 'Bearer token verifier is not configured');
  }

  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  const jwks = createRemoteJWKSet(new URL(`${issuer}/discovery/v2.0/keys`));
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  return payload as BearerClaims;
}

function normalizeRoles(rawRoles: string[]): MarketplaceRole[] {
  const roles = new Set<MarketplaceRole>();

  for (const rawRole of rawRoles) {
    const role = rawRole.trim();
    if (!role) continue;

    switch (role.toLowerCase()) {
      case 'globalorchestrator.operator':
      case 'global-orchestrator-operator':
      case 'platform-operator':
        roles.add('platform-operator');
        break;
      case 'globalorchestrator.domainauthor':
      case 'domain-author':
        roles.add('domain-author');
        break;
      case 'tenant.admin':
      case 'tenant-admin':
        roles.add('tenant-admin');
        break;
      case 'compliance.reader':
      case 'compliance':
        roles.add('compliance');
        break;
      case 'viewer':
        roles.add('viewer');
        break;
    }
  }

  return roles.size ? [...roles] : ['viewer'];
}