# Onboarding Agent Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working foundation slice for the Onboarding Agent: PHI-safe telemetry primitives, onboarding-specific Cosmos containers, and Azure Monitor workbook/alert infrastructure.

**Architecture:** Extend the existing Azure Functions/Bicep monorepo rather than creating a parallel platform. Production code is kept small and testable: PHI scrubbing lives in a focused TypeScript module, infrastructure adds onboarding containers and monitoring modules, and verification uses a local Node test harness because the repo has no working Jest setup yet.

**Tech Stack:** TypeScript 5, Node 20, Azure Functions v4, Azure Cosmos DB NoSQL, Bicep, Azure Monitor/Application Insights, Log Analytics.

---

## Scope

This is Plan 1 of the Onboarding Agent v1 sequence. It implements the platform foundation from the approved design doc at `docs/brainstorms/2026-05-13-onboarding-agent-design.md`:

- PHI scrubber middleware behavior and golden-set tests from §5.3 and §6.5 SEC1
- Cosmos foundation containers from §3.1 and §6.1 deliverable 6
- App Insights workbook + alert rules from §5.4, §5.5, and §6.1 deliverables 8-9
- Bicep deployability for the new foundation resources

It does not implement the Publisher API, MAF Onboarding Agent, GitHub App, Terraform module, approval workflow, or authoring surfaces. Those are subsequent plans.

---

## File Structure

**Create:**
- `apps/api/src/lib/telemetry/phi-scrubber.ts` — deterministic PHI redaction utilities used before telemetry export.
- `apps/api/test/phi-scrubber.test.js` — Node built-in test suite compiled against `dist/src/lib/telemetry/phi-scrubber.js`.
- `infra/modules/onboarding-monitoring.bicep` — App Insights workbook and Azure Monitor scheduled query alerts for onboarding pipeline health.

**Modify:**
- `apps/api/package.json` — add `test:onboarding` script that builds then runs Node tests.
- `apps/api/tsconfig.json` — include no test files in production build; leave test JS outside TS compile.
- `infra/modules/cosmos.bicep` — add `agent-cards`, `repo-bindings`, and `tenant-policies` containers while reusing existing `submissions` and `audit-log` containers.
- `infra/main.bicep` — wire onboarding monitoring module into the existing App Insights/Log Analytics foundation.
- `infra/modules/appinsights.bicep` — output workspace ID for alert queries.

---

## Task 1: PHI Scrubber TDD Harness

**Files:**
- Create: `apps/api/test/phi-scrubber.test.js`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Write the failing test**

Create `apps/api/test/phi-scrubber.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  redactPhi,
  scrubTelemetryAttributes,
  summarizePhiFindings,
} = require('../dist/src/lib/telemetry/phi-scrubber.js');

test('redactPhi redacts common PHI patterns while preserving surrounding telemetry text', () => {
  const input = 'Patient MRN 1234567, SSN 123-45-6789, DOB 05/13/1975, email jane.doe@example.com, phone 212-555-0188';

  const actual = redactPhi(input);

  assert.equal(actual, 'Patient MRN [REDACTED:mrn], SSN [REDACTED:ssn], DOB [REDACTED:dob], email [REDACTED:email], phone [REDACTED:phone]');
});

test('scrubTelemetryAttributes redacts string values recursively and preserves non-string values', () => {
  const input = {
    'uap.submission_id': 'sub-123',
    prompt: 'MRN 7654321 needs review',
    nested: {
      completion: 'Call 415-555-1212 for DOB 1970-01-31',
      count: 2,
      ok: true,
    },
    samples: ['SSN 222-33-4444', 'safe value'],
  };

  const actual = scrubTelemetryAttributes(input);

  assert.deepEqual(actual, {
    'uap.submission_id': 'sub-123',
    prompt: 'MRN [REDACTED:mrn] needs review',
    nested: {
      completion: 'Call [REDACTED:phone] for DOB [REDACTED:dob]',
      count: 2,
      ok: true,
    },
    samples: ['SSN [REDACTED:ssn]', 'safe value'],
  });
});

test('summarizePhiFindings returns counts without leaking matched values', () => {
  const input = 'MRN 1234567 and SSN 123-45-6789 and MRN 7654321';

  const actual = summarizePhiFindings(input);

  assert.deepEqual(actual, {
    total: 3,
    byType: {
      mrn: 2,
      ssn: 1,
    },
  });
  assert.equal(JSON.stringify(actual).includes('1234567'), false);
  assert.equal(JSON.stringify(actual).includes('123-45-6789'), false);
});
```

Modify `apps/api/package.json` scripts:

```json
{
  "build": "tsc -p tsconfig.json",
  "watch": "tsc -p tsconfig.json --watch",
  "start": "func start",
  "dev": "npm run build && func start",
  "test": "jest",
  "test:onboarding": "npm run build && node --test test/*.test.js"
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `apps/api`:

```bash
npm run test:onboarding
```

Expected: FAIL because `dist/src/lib/telemetry/phi-scrubber.js` does not exist.

- [ ] **Step 3: Implement minimal scrubber**

Create `apps/api/src/lib/telemetry/phi-scrubber.ts`:

```typescript
type PhiType = 'ssn' | 'mrn' | 'dob' | 'email' | 'phone';

type PhiPattern = {
  type: PhiType;
  pattern: RegExp;
};

const PHI_PATTERNS: PhiPattern[] = [
  { type: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'mrn', pattern: /\bMRN\s*[:#-]?\s*\d{6,10}\b/gi },
  { type: 'dob', pattern: /\bDOB\s*[:#-]?\s*(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/gi },
  { type: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: 'phone', pattern: /\b(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g },
];

export type PhiFindingSummary = {
  total: number;
  byType: Partial<Record<PhiType, number>>;
};

export function redactPhi(value: string): string {
  return PHI_PATTERNS.reduce(
    (currentValue, phiPattern) => currentValue.replace(phiPattern.pattern, `[REDACTED:${phiPattern.type}]`),
    value,
  );
}

export function scrubTelemetryAttributes<T>(value: T): T {
  if (typeof value === 'string') {
    return redactPhi(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubTelemetryAttributes(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, scrubTelemetryAttributes(item)]),
    ) as T;
  }

  return value;
}

export function summarizePhiFindings(value: string): PhiFindingSummary {
  const byType: Partial<Record<PhiType, number>> = {};

  for (const phiPattern of PHI_PATTERNS) {
    const matches = value.match(phiPattern.pattern) ?? [];
    if (matches.length > 0) {
      byType[phiPattern.type] = matches.length;
    }
  }

  return {
    total: Object.values(byType).reduce((sum, count) => sum + (count ?? 0), 0),
    byType,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run from `apps/api`:

```bash
npm run test:onboarding
```

Expected: PASS with 3 tests passing.

---

## Task 2: Onboarding Cosmos Containers

**Files:**
- Modify: `infra/modules/cosmos.bicep`

- [ ] **Step 1: Write the failing structural check**

Run from repo root:

```bash
powershell -NoProfile -Command "$content = Get-Content infra/modules/cosmos.bicep -Raw; foreach ($name in 'agent-cards','repo-bindings','tenant-policies') { if ($content -notmatch \"id: '$name'\") { throw \"Missing container $name\" } }"
```

Expected: FAIL with `Missing container agent-cards`.

- [ ] **Step 2: Add containers**

Append after the existing `submissionsContainer` in `infra/modules/cosmos.bicep`:

```bicep
resource agentCardsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'agent-cards'
  properties: {
    resource: {
      id: 'agent-cards'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
        compositeIndexes: [
          [
            { path: '/name', order: 'ascending' }
            { path: '/lifecycle/last_active_version', order: 'ascending' }
          ]
          [
            { path: '/risk_tier', order: 'ascending' }
            { path: '/lifecycle/created_at', order: 'descending' }
          ]
        ]
      }
    }
  }
}

resource repoBindingsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'repo-bindings'
  properties: {
    resource: {
      id: 'repo-bindings'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

resource tenantPoliciesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'tenant-policies'
  properties: {
    resource: {
      id: 'tenant-policies'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}
```

- [ ] **Step 3: Verify structural check passes**

Run the same PowerShell command from Step 1.

Expected: exit 0.

---

## Task 3: Onboarding Monitoring Bicep

**Files:**
- Create: `infra/modules/onboarding-monitoring.bicep`
- Modify: `infra/modules/appinsights.bicep`
- Modify: `infra/main.bicep`

- [ ] **Step 1: Write the failing structural check**

Run from repo root:

```bash
powershell -NoProfile -Command "$required = 'Microsoft.Insights/workbooks','Microsoft.Insights/scheduledQueryRules','Onboarding Agent Pipeline'; $path = 'infra/modules/onboarding-monitoring.bicep'; if (!(Test-Path $path)) { throw 'Missing onboarding-monitoring module' }; $content = Get-Content $path -Raw; foreach ($token in $required) { if ($content -notmatch [regex]::Escape($token)) { throw \"Missing $token\" } }"
```

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Add workspace output to App Insights module**

Modify `infra/modules/appinsights.bicep` to include:

```bicep
output workspaceId string = workspace.id
```

- [ ] **Step 3: Create onboarding monitoring module**

Create `infra/modules/onboarding-monitoring.bicep`:

```bicep
param name string
param location string
param appInsightsResourceId string
param workspaceResourceId string

var workbookName = guid(resourceGroup().id, name, 'onboarding-agent-workbook')

resource workbook 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: workbookName
  location: location
  kind: 'shared'
  properties: {
    displayName: 'Onboarding Agent Pipeline'
    category: 'workbook'
    sourceId: appInsightsResourceId
    serializedData: string({
      version: 'Notebook/1.0'
      items: [
        {
          type: 1
          content: {
            json: '# Onboarding Agent Pipeline\nSubmission funnel, stage latency, failures, approval queue health, and agent quality signals.'
          }
          name: 'title'
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'customEvents\n| where name startswith "uap."\n| summarize count() by name, bin(timestamp, 1h)'
            size: 0
            title: 'Submission funnel by stage'
            queryType: 0
            resourceType: 'microsoft.insights/components'
          }
          name: 'submission-funnel'
        }
      ]
      fallbackResourceIds: [appInsightsResourceId]
    })
  }
}

var alertQueries = [
  {
    suffix: 'stage-failure-rate'
    displayName: 'Onboarding stage failure rate spike'
    severity: 3
    query: 'customEvents | where name startswith "uap." and tostring(customDimensions.outcome) == "failed" | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'slsa-failures'
    displayName: 'Onboarding SLSA verification failures'
    severity: 1
    query: 'customEvents | where name == "uap.stage2.verify_slsa" and tostring(customDimensions.outcome) == "failed" | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'phi-unattested'
    displayName: 'Onboarding PHI detected in unattested submission'
    severity: 1
    query: 'customEvents | where name == "uap.stage2.ingest_scans" and tostring(customDimensions.phi_unattested) == "true" | summarize Failures=count()'
    threshold: 0
  }
]

resource scheduledAlerts 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = [for alert in alertQueries: {
  name: '${name}-${alert.suffix}'
  location: location
  properties: {
    displayName: alert.displayName
    severity: alert.severity
    enabled: true
    scopes: [workspaceResourceId]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: alert.query
          timeAggregation: 'Count'
          metricMeasureColumn: 'Failures'
          operator: 'GreaterThan'
          threshold: alert.threshold
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
  }
}]

output workbookId string = workbook.id
```

- [ ] **Step 4: Wire module in `infra/main.bicep`**

Add after the `appInsights` module:

```bicep
module onboardingMonitoring 'modules/onboarding-monitoring.bicep' = {
  name: 'onboardingMonitoring'
  params: {
    name: '${appName}-onboarding-${environment}'
    location: location
    appInsightsResourceId: appInsights.outputs.resourceId
    workspaceResourceId: appInsights.outputs.workspaceId
  }
}
```

Also add to `infra/modules/appinsights.bicep`:

```bicep
output resourceId string = appInsights.id
```

- [ ] **Step 5: Verify structural check passes**

Run Step 1's PowerShell command again.

Expected: exit 0.

---

## Task 4: Full Foundation Verification

**Files:**
- All files from Tasks 1-3

- [ ] **Step 1: Run API onboarding tests**

Run from `apps/api`:

```bash
npm run test:onboarding
```

Expected: PASS with PHI scrubber tests passing.

- [ ] **Step 2: Run API build**

Run from repo root:

```bash
npm run api:build
```

Expected: TypeScript build completes with exit code 0.

- [ ] **Step 3: Run Bicep build**

Run from repo root:

```bash
az bicep build --file infra/main.bicep
```

Expected: Bicep compilation succeeds and writes `infra/main.json`.

- [ ] **Step 4: Check git diff for scope**

Run from repo root:

```bash
git diff -- docs/plans/2026-05-13-001-feat-onboarding-agent-foundation-plan.md apps/api/package.json apps/api/src/lib/telemetry/phi-scrubber.ts apps/api/test/phi-scrubber.test.js infra/main.bicep infra/modules/appinsights.bicep infra/modules/cosmos.bicep infra/modules/onboarding-monitoring.bicep
```

Expected: diff is limited to the files in this plan.

---

## Self-Review Checklist

- [ ] Spec coverage: PHI scrubber, Cosmos containers, monitoring workbook/alerts are covered.
- [ ] Placeholder scan: no `TBD`, `TODO`, `FIXME`, `implement later`, or vague instructions.
- [ ] Type consistency: exported TypeScript names match test imports.
- [ ] Verification: tests/build/Bicep compile run fresh before completion claims.
