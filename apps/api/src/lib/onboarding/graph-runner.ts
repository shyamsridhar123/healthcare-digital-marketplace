import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { classifyRiskTier, validateAgentManifest, type RiskTier } from './manifest.js';

export type OnboardingGraphSource = 'portal' | 'cli' | 'vscode-skill' | 'github-app-webhook';
export type OnboardingTerminalStatus = 'active' | 'failed' | 'rejected' | 'withdrawn';

export type OnboardingGraphState = {
  tenantId: string;
  submissionId: string;
  traceId: string;
  source: OnboardingGraphSource;
  manifest?: unknown;
  currentStage: string;
  completedStages: string[];
  risk?: {
    tier: RiskTier;
    factors: string[];
  };
  errors: Array<{ stage: string; path?: string; message: string }>;
  terminalStatus?: OnboardingTerminalStatus;
};

export type CreateOnboardingGraphStateInput = {
  tenantId: string;
  submissionId: string;
  source: OnboardingGraphSource;
  manifest?: unknown;
  traceId?: string;
};

const OnboardingState = Annotation.Root({
  tenantId: Annotation<string>,
  submissionId: Annotation<string>,
  traceId: Annotation<string>,
  source: Annotation<OnboardingGraphSource>,
  manifest: Annotation<unknown | undefined>,
  currentStage: Annotation<string>,
  completedStages: Annotation<string[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  risk: Annotation<OnboardingGraphState['risk'] | undefined>,
  errors: Annotation<OnboardingGraphState['errors']>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  terminalStatus: Annotation<OnboardingTerminalStatus | undefined>,
});

export function createOnboardingGraphState(input: CreateOnboardingGraphStateInput): OnboardingGraphState {
  return {
    tenantId: input.tenantId,
    submissionId: input.submissionId,
    traceId: input.traceId ?? `${input.tenantId}:${input.submissionId}`,
    source: input.source,
    manifest: input.manifest,
    currentStage: 'submitted',
    completedStages: [],
    errors: [],
  };
}

export async function runOnboardingGraph(input: OnboardingGraphState): Promise<OnboardingGraphState> {
  const graph = new StateGraph(OnboardingState)
    .addNode('validate_manifest', validateManifestNode)
    .addNode('classify_risk', classifyRiskNode)
    .addEdge(START, 'validate_manifest')
    .addConditionalEdges('validate_manifest', routeAfterValidation, {
      classify_risk: 'classify_risk',
      [END]: END,
    })
    .addEdge('classify_risk', END)
    .compile();

  return graph.invoke(input) as Promise<OnboardingGraphState>;
}

async function validateManifestNode(state: OnboardingGraphState): Promise<Partial<OnboardingGraphState>> {
  const result = validateAgentManifest(state.manifest);
  if (!result.valid) {
    return {
      currentStage: 'failed',
      terminalStatus: 'failed',
      errors: result.errors.map((error) => ({
        stage: 'validate_manifest',
        path: error.path,
        message: error.message,
      })),
    };
  }

  return {
    manifest: result.manifest,
    currentStage: 'validating',
    completedStages: ['validate_manifest'],
  };
}

async function classifyRiskNode(state: OnboardingGraphState): Promise<Partial<OnboardingGraphState>> {
  const manifest = state.manifest as { rai?: { data_categories?: string[] }; network?: { egress?: boolean } };
  const dataCategories = manifest.rai?.data_categories ?? ['none'];
  const tier = classifyRiskTier({
    dataCategories,
    networkEgress: manifest.network?.egress ?? false,
  });

  return {
    risk: {
      tier,
      factors: dataCategories.map((category) => `data:${category}`),
    },
    currentStage: tier === 'low' ? 'approved' : 'approval-pending',
    completedStages: ['validate_manifest', 'classify_risk'],
  };
}

function routeAfterValidation(state: OnboardingGraphState): 'classify_risk' | typeof END {
  return state.terminalStatus === 'failed' ? END : 'classify_risk';
}