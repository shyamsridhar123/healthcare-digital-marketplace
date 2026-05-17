/**
 * In-memory store — replaces @azure/cosmos for local/dev usage.
 * Exports the same `getContainer` / `CONTAINERS` interface so call-sites
 * remain unchanged. Data is scoped to the current process lifetime.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { CosmosClient, type Container } from "@azure/cosmos";

// ── types ────────────────────────────────────────────────────────────────────

interface QueryParameter {
  name: string; // e.g. "@tenantId"
  value: unknown;
}

interface QuerySpec {
  query: string;
  parameters?: QueryParameter[];
}

interface MarketplaceContainer {
  readonly items: {
    create: <T = any>(body: T) => Promise<{ resource: T | undefined }>;
    upsert: <T = any>(body: T) => Promise<{ resource: T | undefined }>;
    query: <T = any>(spec: QuerySpec | string) => {
      fetchAll: () => Promise<{ resources: T[] }>;
    };
  };
  item(id: string, partitionKey?: string): {
    delete: () => Promise<any>;
    read: <T = any>() => Promise<{ resource: T | undefined }>;
  };
}

// ── in-memory store ──────────────────────────────────────────────────────────

const store = new Map<string, Map<string, any>>();

function getStore(containerName: string): Map<string, any> {
  if (!store.has(containerName)) store.set(containerName, new Map());
  return store.get(containerName)!;
}

// ── minimal SQL WHERE parser ─────────────────────────────────────────────────

/**
 * Parses a very limited subset of Cosmos SQL used in this codebase:
 *   WHERE c.field = @param
 *   WHERE c.field IN ('a','b','c')
 *   AND  c.field = @param
 * Returns a filter predicate over items.
 */
function buildPredicate(
  query: string,
  params: QueryParameter[]
): (item: any) => boolean {
  const paramMap = new Map(params.map((p) => [p.name, p.value]));

  // Extract everything after WHERE (case-insensitive)
  const whereMatch = query.match(/WHERE\s+(.+)$/is);
  if (!whereMatch) return () => true;

  const wherePart = whereMatch[1]
    // Strip ORDER BY clause before parsing conditions
    .replace(/ORDER\s+BY\s+.+$/is, "")
    .trim();

  const conditions = wherePart.split(/\bAND\b/i).map((s) => s.trim());

  const checks = conditions.map((cond): ((item: any) => boolean) => {
    // c.field = @param
    const eqMatch = cond.match(/^c\.(\w+)\s*=\s*(@\w+)$/i);
    if (eqMatch) {
      const [, field, paramName] = eqMatch;
      const expected = paramMap.get(paramName);
      return (item) => item[field] === expected;
    }

    // c.field IN ('v1','v2',...)
    const inMatch = cond.match(/^c\.(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const [, field, rawList] = inMatch;
      const values = rawList
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
      return (item) => values.includes(String(item[field] ?? ""));
    }

    // Unknown condition — pass through
    return () => true;
  });

  return (item) => checks.every((fn) => fn(item));
}

// ── fake Container ────────────────────────────────────────────────────────────

class InMemoryContainer implements MarketplaceContainer {
  constructor(private readonly containerName: string) {}

  /** Mimic CosmosDB Container.items */
  readonly items = {
    create: async <T = any>(body: T): Promise<{ resource: T }> => {
      const b = body as any;
      const id = String(b.id ?? Math.random().toString(36).slice(2));
      const record = { ...b, id } as T;
      getStore(this.containerName).set(id, record);
      return { resource: record };
    },

    upsert: async <T = any>(body: T): Promise<{ resource: T }> => {
      const b = body as any;
      const id = String(b.id ?? Math.random().toString(36).slice(2));
      const record = { ...b, id } as T;
      getStore(this.containerName).set(id, record);
      return { resource: record };
    },

    query: <T = any>(spec: QuerySpec | string) => {
      const querySpec: QuerySpec =
        typeof spec === "string" ? { query: spec, parameters: [] } : spec;
      const predicate = buildPredicate(
        querySpec.query,
        querySpec.parameters ?? []
      );
      const name = this.containerName;
      return {
        fetchAll: async (): Promise<{ resources: T[] }> => {
          const all = Array.from(getStore(name).values());
          return { resources: all.filter(predicate) as T[] };
        },
      };
    },
  };

  /** Mimic CosmosDB Container.item(id, partitionKey) */
  item(id: string, _partitionKey?: string) {
    const containerName = this.containerName;
    return {
      delete: async (): Promise<any> => {
        getStore(containerName).delete(id);
        return {};
      },
      read: async <T = any>(): Promise<{ resource: T | undefined }> => {
        const resource = getStore(containerName).get(id) as T | undefined;
        return { resource };
      },
    };
  }
}

class CosmosContainerAdapter implements MarketplaceContainer {
  constructor(private readonly container: Container) {}

  readonly items = {
    create: async <T = any>(body: T): Promise<{ resource: T | undefined }> => {
      const { resource } = await this.container.items.create(body as any);
      return { resource: resource as T | undefined };
    },

    upsert: async <T = any>(body: T): Promise<{ resource: T | undefined }> => {
      const { resource } = await this.container.items.upsert(body as any);
      return { resource: resource as T | undefined };
    },

    query: <T = any>(spec: QuerySpec | string) => {
      const queryIterator = this.container.items.query<T>(spec as any);
      return {
        fetchAll: async (): Promise<{ resources: T[] }> => queryIterator.fetchAll(),
      };
    },
  };

  item(id: string, partitionKey?: string) {
    return {
      delete: async (): Promise<any> => {
        return this.container.item(id, requirePartitionKey(partitionKey)).delete();
      },
      read: async <T = any>(): Promise<{ resource: T | undefined }> => {
        const { resource } = await this.container.item(id, requirePartitionKey(partitionKey)).read<any>();
        return { resource };
      },
    };
  }
}

function requirePartitionKey(partitionKey: string | undefined): string {
  if (!partitionKey) {
    throw new Error('Cosmos item read/delete requires an explicit partitionKey.');
  }

  return partitionKey;
}

// ── public API ────────────────────────────────────────────────────────────────

let cosmosClient: CosmosClient | undefined;

function getCosmosContainer(containerName: string): MarketplaceContainer | null {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseName = process.env.COSMOS_DATABASE ?? "ai-marketplace";

  if (!endpoint || !key) {
    return null;
  }

  cosmosClient ??= new CosmosClient({ endpoint, key });
  return new CosmosContainerAdapter(cosmosClient.database(databaseName).container(containerName));
}

export async function getContainer(
  containerName: string
): Promise<MarketplaceContainer> {
  const cosmosContainer = getCosmosContainer(containerName);
  if (cosmosContainer) {
    return cosmosContainer;
  }

  if (allowsInMemoryCosmos()) {
    return new InMemoryContainer(containerName);
  }

  throw new Error("Cosmos configuration missing. Set COSMOS_ENDPOINT and COSMOS_KEY, or set UAP_USE_IN_MEMORY_COSMOS=true for local development.");
}

function allowsInMemoryCosmos(): boolean {
  return process.env.UAP_USE_IN_MEMORY_COSMOS === "true"
    || process.env.AZURE_FUNCTIONS_ENVIRONMENT === "Development"
    || process.env.NODE_ENV === "test";
}

export const CONTAINERS = {
  ASSETS: "assets",
  PUBLISHERS: "publishers",
  SUBMISSIONS: "submissions",
  AGENT_CARDS: "agent-cards",
  REPO_BINDINGS: "repo-bindings",
  TENANT_POLICIES: "tenant-policies",
  WORKFLOWS: "workflows",
  AUDIT_LOG: "audit-log",
  AUDIT_EVENTS: "audit-events",
  RATINGS: "ratings",
  PROJECTS: "projects",
  VERSION_PINS: "version-pins",
  SESSIONS: "sessions",
  USER_CONFIG: "user-config",
  // MCP Gateway & Registry
  MCP_SERVERS: "mcp-servers",
  MCP_TOOLS: "mcp-tools",
  // A2A Agent Registry
  A2A_AGENTS: "a2a-agents",
  // Agent Skills
  SKILLS: "skills",
  // IAM
  IAM_GROUPS: "iam-groups",
  IAM_SERVICE_ACCOUNTS: "iam-service-accounts",
  // Ops
  SERVER_HEALTH: "server-health",
  SECURITY_SCANS: "security-scans",
  SEARCH_REINDEX_REQUESTS: "search-reindex-requests",
  // Policy & Orchestration
  POLICIES: "policies",
  ORCHESTRATION_TEMPLATES: "orchestration-templates",
  ORCHESTRATION_EXECUTIONS: "orchestration-executions",
  // Sandbox Workspace
  SANDBOXES: "sandboxes",
  SANDBOX_TEMPLATES: "sandbox-templates",
  DATA_PACKAGES: "data-packages",
  SANDBOX_LIFECYCLE_EVENTS: "sandbox-lifecycle-events",
  SANDBOX_COST_USAGE: "sandbox-cost-usage",
} as const;
