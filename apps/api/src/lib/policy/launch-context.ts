import type { AuthorizationContext } from '../auth/context.js';
import { hasPermission, PERMISSIONS } from '../auth/permissions.js';

export type PolicyConcern =
  | 'global-routing'
  | 'global-pre-flight'
  | 'global-post-flight'
  | 'channel-hitl'
  | 'tenant'
  | 'domain'
  | 'asset';

export type PolicyScope =
  | { target: 'tenant' }
  | { target: 'domain'; domainId: string }
  | { target: 'asset'; assetId: string; domainId?: string };

export interface PolicyLaunchContextInput {
  auth: AuthorizationContext;
  tenantId?: string;
  concern: PolicyConcern;
  scope: PolicyScope;
  source?: {
    traceId?: string;
    decisionId?: string;
    gate?: string;
  };
  returnTo: string;
}

export interface PolicyLaunchContext {
  tenantId: string;
  concern: PolicyConcern;
  scope: PolicyScope;
  source: PolicyLaunchContextInput['source'];
  returnTo: string;
  requestedBy: string;
  createdAt: string;
}

export function createPolicyLaunchContext(input: PolicyLaunchContextInput): PolicyLaunchContext {
  if (!hasPermission(input.auth, PERMISSIONS.POLICY_LAUNCH)) {
    throw new Error('Policy launch permission is required');
  }
  if (input.tenantId && input.tenantId !== input.auth.tenantId) {
    throw new Error('Policy launch tenant must match authenticated tenant');
  }
  if (!isInternalReturnPath(input.returnTo)) {
    throw new Error('Policy launch return target must be an internal route');
  }

  return {
    tenantId: input.auth.tenantId,
    concern: input.concern,
    scope: input.scope,
    source: input.source,
    returnTo: input.returnTo,
    requestedBy: input.auth.userId,
    createdAt: new Date().toISOString(),
  };
}

function isInternalReturnPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('://');
}