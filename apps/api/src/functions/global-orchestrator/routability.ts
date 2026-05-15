import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { AuthError, getAuthorizationContext, verifyConfiguredBearerToken } from '../../lib/auth/context.js';
import { hasPermission, PERMISSIONS } from '../../lib/auth/permissions.js';
import { listDomainRoutability } from '../../lib/global-orchestrator/routability.js';

async function listRoutability(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await getAuthorizationContext(req, {
      allowLocalDevFallback: process.env.UAP_AUTH_LOCAL_DEV_BYPASS === 'true'
        && process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development',
      verifyBearerToken: verifyConfiguredBearerToken,
    });
    if (!hasPermission(auth, PERMISSIONS.ROUTABILITY_READ)) {
      return { status: 403, jsonBody: { error: 'Forbidden' } };
    }

    const isOperator = hasPermission(auth, PERMISSIONS.COCKPIT_READ);
    const ownerTeam = isOperator ? req.query.get('ownerTeam') ?? undefined : auth.ownerTeam;
    const ownerEmail = isOperator ? req.query.get('ownerEmail') ?? undefined : auth.ownerEmail;
    const result = await listDomainRoutability({
      tenantId: auth.tenantId,
      ownerTeam,
      ownerEmail,
      includeOwnerless: isOperator && req.query.get('includeOwnerless') === 'true',
    });

    return { status: 200, jsonBody: result };
  } catch (err) {
    if (err instanceof AuthError) return { status: err.status, jsonBody: { error: err.message } };
    ctx.error('listGlobalOrchestratorRoutability error:', err);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('listGlobalOrchestratorRoutability', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'global-orchestrator/routability',
  handler: listRoutability,
});