// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// It is important to load environment variables before importing other modules
import { configDotenv } from 'dotenv';

configDotenv();

// Initialize Microsoft OpenTelemetry distro for observability.
// Must be called before importing other modules so instrumentations can patch libraries.
// See: https://github.com/microsoft/opentelemetry-distro-javascript
import { useMicrosoftOpenTelemetry, AgenticTokenCacheInstance } from '@microsoft/opentelemetry';
import { tokenResolver } from './token-cache';

// Console exporters are useful for local development but noisy and potentially
// sensitive (gen-ai content) in production. Enable only outside production.
const enableConsoleExporters = process.env.NODE_ENV !== 'production' && !process.env.WEBSITE_SITE_NAME;

useMicrosoftOpenTelemetry({
  enableConsoleExporters,
  a365: {
    enabled: process.env.ENABLE_A365_OBSERVABILITY_EXPORTER === 'true',
    // When Use_Custom_Resolver is true the sample populates a local token cache;
    // otherwise agent.ts refreshes tokens into AgenticTokenCacheInstance.
    tokenResolver: process.env.Use_Custom_Resolver === 'true'
      ? (agentId: string, tenantId: string) => tokenResolver(agentId, tenantId) ?? ''
      : (agentId: string, tenantId: string) => AgenticTokenCacheInstance.getObservabilityToken(agentId, tenantId) ?? '',
  },
  instrumentationOptions: {
    langchain: {},
  },
});

import { AuthConfiguration, authorizeJWT, CloudAdapter, loadAuthConfigFromEnv, Request } from '@microsoft/agents-hosting';
import express, { Response, Express } from 'express'
import { nebulaChatComplete, ChatTurn } from './nebula';
import { getMetrics, recordTurn, recordError } from './metrics';

// Use request validation middleware only if hosting publicly
const isProduction = Boolean(process.env.WEBSITE_SITE_NAME) || process.env.NODE_ENV === 'production';
const authConfig: AuthConfiguration = isProduction ? loadAuthConfigFromEnv() : {};

const server: Express = express()
server.use(express.json())

// Health endpoint - placed BEFORE auth middleware so it doesn't require authentication
server.get('/api/health', (req, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ── Nebula-X web chat endpoint ────────────────────────────────────────────
// Public JSON endpoint the Nebula-X web app calls (via its own same-origin
// proxy). Optionally gated by a shared secret. Separate from the Bot Framework
// /api/messages path so it does not require Teams/agentic JWT auth.
const chatSecret = process.env.CHAT_SHARED_SECRET;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.1';
server.post('/api/chat', async (req, res: Response) => {
  const started = Date.now();
  try {
    if (chatSecret && req.header('x-nebula-key') !== chatSecret) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const message: string = (req.body?.message ?? '').toString();
    const history: ChatTurn[] = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    const { reply, usage } = await nebulaChatComplete(message, history);
    recordTurn({ usage, latencyMs: Date.now() - started, model: deploymentName });
    return res.status(200).json({ reply, usage });
  } catch (err: unknown) {
    recordError(deploymentName);
    const e = err as any;
    console.error('/api/chat error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'assistant error' });
  }
});

// Real AI-gateway telemetry (in-memory, since process start). Powers the LIVE
// panel in the Nebula-X observability UI. Placed before the Teams JWT auth
// middleware so the web app's same-origin proxy can read it with the shared key.
server.get('/api/gateway/metrics', (req, res: Response) => {
  if (chatSecret && req.header('x-nebula-key') !== chatSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return res.status(200).json(getMetrics());
});

server.use(authorizeJWT(authConfig))

// Teams / Bot Framework path. The Agent 365 agent (with MCP tooling) is loaded
// lazily so a broken optional tooling dependency cannot crash the web-chat path.
server.post('/api/messages', async (req: Request, res: Response) => {
  try {
    const { agentApplication } = await import('./agent.js');
    const adapter = agentApplication.adapter as CloudAdapter;
    await adapter.process(req, res, async (context) => {
      await agentApplication.run(context)
    })
  } catch (err: unknown) {
    const e = err as any;
    console.error('Teams agent path unavailable:', e?.message || e);
    if (!res.headersSent) res.status(503).json({ error: 'Teams agent path unavailable' });
  }
})

const port = Number(process.env.PORT) || 3978
const host = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');
server.listen(port, host, async () => {
  console.log(`\nServer listening on http://${host}:${port} for appId ${authConfig.clientId} debug ${process.env.DEBUG}`)
}).on('error', async (err: unknown) => {
  console.error(err);
  process.exit(1);
}).on('close', async () => {
  console.log('Server closed');
  process.exit(0);
});
