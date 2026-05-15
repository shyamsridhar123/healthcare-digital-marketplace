import type { AuthorizationContext, MarketplaceRole } from './context.js';

export const PERMISSIONS = {
  COCKPIT_READ: 'cockpit:read',
  TRACE_LOOKUP: 'trace:lookup',
  AUDIT_PREVIEW: 'audit:preview',
  POLICY_LAUNCH: 'policy:launch',
  DEAD_LETTER_STATUS: 'dead-letter:status',
  ROUTABILITY_READ: 'routability:read',
  REGISTRATION_HANDOFF: 'registration:handoff',
  HEALTH_DETAIL_LINK: 'health:detail-link',
  DOMAIN_DETAIL_LINK: 'domain:detail-link',
  STAGE_EVENT_WRITE: 'stage-event:write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const rolePermissions: Record<MarketplaceRole, Permission[]> = {
  'platform-operator': [
    PERMISSIONS.COCKPIT_READ,
    PERMISSIONS.TRACE_LOOKUP,
    PERMISSIONS.AUDIT_PREVIEW,
    PERMISSIONS.POLICY_LAUNCH,
    PERMISSIONS.DEAD_LETTER_STATUS,
    PERMISSIONS.ROUTABILITY_READ,
    PERMISSIONS.REGISTRATION_HANDOFF,
    PERMISSIONS.HEALTH_DETAIL_LINK,
    PERMISSIONS.DOMAIN_DETAIL_LINK,
    PERMISSIONS.STAGE_EVENT_WRITE,
  ],
  'tenant-admin': [
    PERMISSIONS.COCKPIT_READ,
    PERMISSIONS.TRACE_LOOKUP,
    PERMISSIONS.AUDIT_PREVIEW,
    PERMISSIONS.POLICY_LAUNCH,
    PERMISSIONS.ROUTABILITY_READ,
    PERMISSIONS.REGISTRATION_HANDOFF,
    PERMISSIONS.HEALTH_DETAIL_LINK,
  ],
  compliance: [
    PERMISSIONS.COCKPIT_READ,
    PERMISSIONS.TRACE_LOOKUP,
    PERMISSIONS.AUDIT_PREVIEW,
  ],
  'domain-author': [
    PERMISSIONS.POLICY_LAUNCH,
    PERMISSIONS.ROUTABILITY_READ,
    PERMISSIONS.REGISTRATION_HANDOFF,
    PERMISSIONS.HEALTH_DETAIL_LINK,
  ],
  viewer: [],
};

export function hasPermission(context: Pick<AuthorizationContext, 'roles'>, permission: Permission): boolean {
  return context.roles.some((role) => rolePermissions[role]?.includes(permission));
}

export function requirePermission(context: AuthorizationContext, permission: Permission): void {
  if (!hasPermission(context, permission)) {
    const error = new Error('Forbidden');
    Object.assign(error, { status: 403 });
    throw error;
  }
}