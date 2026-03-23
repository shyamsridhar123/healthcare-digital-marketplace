# AI Asset Marketplace — Gas Town Rig

## Project Overview
**Azure AI Asset Marketplace + Visual Agent Orchestration** for enterprise agentic AI deployment.

## Mission
Build a secure, enterprise-grade marketplace for AI assets (Agents, MCP servers/tools, Models) with:
- Visual orchestration canvas (React Flow)
- Azure AI Foundry + Microsoft Agent Framework integration
- Publisher workflow + governance approval
- SaaS and PaaS deployment models

## Tech Stack
- **Frontend**: Next.js 15, React Flow, Tailwind CSS, shadcn/ui
- **Backend**: Azure Functions v4 (Node.js/TypeScript)
- **Database**: Azure Cosmos DB (NoSQL, partition by `tenantId`)
- **Auth**: Azure Entra ID (MSAL)
- **AI**: Azure AI Foundry, Azure OpenAI
- **Infra**: Bicep IaC, Azure Container Apps

## Monorepo Structure
```
apps/
  web/     — Next.js frontend
  api/     — Azure Functions backend
infra/     — Bicep modules
packages/
  types/   — Shared TypeScript types
  cosmos/  — Cosmos DB client utilities
```

## Key Work Streams
- **Marketplace**: Asset discovery, catalog, search, detail pages
- **Publisher**: Onboarding, submission pipeline, versioning
- **Orchestrator**: Visual canvas, node types, execution engine
- **Governance**: Approval workflows, audit trail, policy gates
- **Infra**: Cosmos DB provisioning, Functions, AI Foundry project setup

## Active Convoys
See `.beads/` for current bead assignments. Run `gt convoy list` to view active work.

## Mayor Instructions
When orchestrating this project:
1. Prioritize the marketplace catalog and orchestrator canvas for Sprint 1
2. Governance and publisher workflow go to Sprint 2
3. Infra and deployment automation go to Sprint 3
4. Always use Azure Cosmos DB for persistence (tenantId partition key)
5. All agents must log to Application Insights
