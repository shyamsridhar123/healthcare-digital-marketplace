import { CONTAINERS, getContainer } from '../cosmos/client.js';

export type RoutabilityStatus =
  | 'not registered'
  | 'registration pending'
  | 'policy pending'
  | 'evaluation pending'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'circuit open';

export interface RoutabilityGate {
  gate: 'ownership' | 'registry' | 'policy' | 'evaluation' | 'health' | 'schema';
  status: 'pass' | 'pending' | 'failed' | 'unknown' | 'not available';
  reason: string;
}

export interface RoutabilityItem {
  agentId: string;
  tenantId: string;
  name: string;
  owner?: { team?: string; email?: string };
  status: RoutabilityStatus;
  blockingGates: RoutabilityGate[];
  nextAction: { type: 'registration' | 'policy' | 'evaluation' | 'health' | 'none'; href?: string; label: string };
  lastUpdated?: string;
}

export interface ListDomainRoutabilityInput {
  tenantId: string;
  ownerTeam?: string;
  ownerEmail?: string;
  includeOwnerless?: boolean;
}

export async function listDomainRoutability(input: ListDomainRoutabilityInput): Promise<{ items: RoutabilityItem[] }> {
  const agents = await getContainer(CONTAINERS.A2A_AGENTS);
  const cards = await getContainer(CONTAINERS.AGENT_CARDS);

  const [{ resources: agentRecords }, { resources: cardRecords }] = await Promise.all([
    agents.items.query<any>({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
      parameters: [{ name: '@tenantId', value: input.tenantId }],
    }, { partitionKey: input.tenantId }).fetchAll(),
    cards.items.query<any>({
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
      parameters: [{ name: '@tenantId', value: input.tenantId }],
    }, { partitionKey: input.tenantId }).fetchAll(),
  ]);

  const cardById = new Map(cardRecords.map((card: any) => [String(card.id), card]));
  const seen = new Set<string>();
  const items: RoutabilityItem[] = [];

  for (const agent of agentRecords) {
    seen.add(String(agent.id));
    const card = cardById.get(String(agent.id));
    const item = toAgentRoutability(input, agent, card);
    if (item) items.push(item);
  }

  for (const card of cardRecords) {
    if (seen.has(String(card.id))) continue;
    const item = toStagedCardRoutability(input, card);
    if (item) items.push(item);
  }

  return { items: items.sort((a, b) => String(b.lastUpdated ?? '').localeCompare(String(a.lastUpdated ?? ''))) };
}

function toAgentRoutability(input: ListDomainRoutabilityInput, agent: any, card: any): RoutabilityItem | undefined {
  const owner = normalizeOwner(agent.owner ?? agent.agentCard?.owner ?? card?.owner);
  if (!matchesOwner(input, owner)) return undefined;

  const blockingGates = evaluateAgentGates(agent, owner);
  const status = statusFromGates(agent, blockingGates);

  return {
    agentId: String(agent.id),
    tenantId: String(agent.tenantId),
    name: String(agent.agentCard?.name ?? card?.name ?? agent.name ?? agent.id),
    owner,
    status,
    blockingGates,
    nextAction: nextActionFor(status, agent.id),
    lastUpdated: agent.updatedAt ?? card?.updatedAt ?? agent.registeredAt,
  };
}

function toStagedCardRoutability(input: ListDomainRoutabilityInput, card: any): RoutabilityItem | undefined {
  const owner = normalizeOwner(card.owner);
  if (!matchesOwner(input, owner)) return undefined;

  return {
    agentId: String(card.id),
    tenantId: String(card.tenantId),
    name: String(card.name ?? card.id),
    owner,
    status: 'not registered',
    blockingGates: [{ gate: 'registry', status: 'pending', reason: 'No active Domain Orchestrator Registry record exists.' }],
    nextAction: { type: 'registration', href: `/onboarding/new?agentId=${encodeURIComponent(String(card.id))}`, label: 'Continue registration' },
    lastUpdated: card.updatedAt,
  };
}

function evaluateAgentGates(agent: any, owner: RoutabilityItem['owner']): RoutabilityGate[] {
  const gates: RoutabilityGate[] = [];
  if (!owner) gates.push({ gate: 'ownership', status: 'unknown', reason: 'Registry record has no owner/team metadata.' });
  if (agent.status !== 'active') gates.push({ gate: 'registry', status: 'pending', reason: `Registry status is ${agent.status ?? 'unknown'}.` });
  if (agent.schemaValidationStatus !== 'passed') gates.push({ gate: 'schema', status: agent.schemaValidationStatus === 'failed' ? 'failed' : 'pending', reason: 'Schema validation has not passed.' });
  if (agent.policyStatus !== 'attached' && agent.policyStatus !== 'passed') gates.push({ gate: 'policy', status: 'pending', reason: 'Required policy attachment is missing.' });
  if (agent.evaluationStatus !== 'passed') gates.push({ gate: 'evaluation', status: 'pending', reason: 'Evaluation gate has not passed.' });
  if (agent.healthStatus !== 'healthy') gates.push({ gate: 'health', status: agent.healthStatus === 'unhealthy' ? 'failed' : 'unknown', reason: 'Health gate is not healthy.' });
  return gates;
}

function statusFromGates(agent: any, gates: RoutabilityGate[]): RoutabilityStatus {
  if (agent.status === 'suspended' || agent.status === 'disabled') return 'suspended';
  if (gates.some((gate) => gate.gate === 'schema' && gate.status === 'failed')) return 'rejected';
  if (gates.some((gate) => gate.gate === 'ownership' || gate.gate === 'registry' || gate.gate === 'schema')) return 'registration pending';
  if (gates.some((gate) => gate.gate === 'policy')) return 'policy pending';
  if (gates.some((gate) => gate.gate === 'evaluation')) return 'evaluation pending';
  if (gates.some((gate) => gate.gate === 'health')) return 'circuit open';
  return 'active';
}

function nextActionFor(status: RoutabilityStatus, agentId: string): RoutabilityItem['nextAction'] {
  switch (status) {
    case 'not registered':
    case 'registration pending':
      return { type: 'registration', href: `/onboarding/new?agentId=${encodeURIComponent(agentId)}`, label: 'Continue registration' };
    case 'policy pending':
      return { type: 'policy', href: `/policies?assetId=${encodeURIComponent(agentId)}`, label: 'Attach policy' };
    case 'evaluation pending':
      return { type: 'evaluation', label: 'Review evaluation gate' };
    case 'circuit open':
      return { type: 'health', href: `/health/servers/${encodeURIComponent(agentId)}?targetType=a2a-agent`, label: 'Review health' };
    default:
      return { type: 'none', label: 'No action required' };
  }
}

function normalizeOwner(owner: unknown): RoutabilityItem['owner'] | undefined {
  if (!owner || typeof owner !== 'object') return undefined;
  const value = owner as { team?: unknown; email?: unknown };
  return {
    team: typeof value.team === 'string' ? value.team : undefined,
    email: typeof value.email === 'string' ? value.email : undefined,
  };
}

function matchesOwner(input: ListDomainRoutabilityInput, owner: RoutabilityItem['owner']): boolean {
  if (!owner) return input.includeOwnerless === true;
  if (!input.ownerTeam && !input.ownerEmail) return true;
  return owner.team === input.ownerTeam || owner.email === input.ownerEmail;
}