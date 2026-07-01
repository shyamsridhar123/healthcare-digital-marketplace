export interface ModelMetrics {
  accuracy: number
  latency: number
  throughput: number
}

export interface ModelData {
  id: string
  name: string
  version: string
  publisher: string
  publisherVerified: boolean
  description: string
  category: string
  type: string
  status: string
  rating: number
  downloads: number
  lastUpdated: string
  compliance: string[]
  metrics: ModelMetrics
  teams: number
  tags?: string[]
  useCases?: string[]
  endpoint?: string
  experienceType?: "published-model-experience"
  preview?: {
    title: string
    description: string
    sampleInput: string
    sampleOutput: string
    scenarios?: Array<{
      id: string
      label: string
      inputText: string
      output: {
        prediction: "High" | "Medium" | "Low"
        rationale: string
        reasonCode?: string
        confidence: number
      }
    }>
  }
  trustStatus?: "governance-passed" | "in-review"
  lineage?: {
    sandboxId: string
    selectedRunId: string
    baseModelId: string
    notebookPath: string
    dataPackages: string[]
    owner: string
    team: string
  }
  reuse?: {
    saves: number
    duplicates: number
    notes: string
  }
}

export const demoPublishedModelExperience: ModelData = {
  "id": "going-concern-analyzer-space",
  "name": "Going Concern Analyzer Space",
  "version": "1.2.0",
  "publisher": "Deloitte Audit",
  "publisherVerified": true,
  "description": "Runnable professional-services model experience published from a governed sandbox with lineage, evaluation summary, and marketplace-safe reuse actions.",
  "category": "Assurance",
  "type": "internal",
  "status": "demo-ready",
  "rating": 4.9,
  "downloads": 640,
  "lastUpdated": "2026-05-20",
  "compliance": [
    "Trustworthy AI certified",
    "Synthetic financial data",
    "Independence review"
  ],
  "metrics": {
    "accuracy": 92.8,
    "latency": 160,
    "throughput": 520
  },
  "teams": 7,
  "tags": [
    "space",
    "audit",
    "going-concern",
    "synthetic-data",
    "trustworthy-ai"
  ],
  "useCases": [
    "Evaluate going-concern indicators for synthetic financial scenarios",
    "Review lineage from sandbox request through selected evaluation run",
    "Compare memo drafts before reuse in a governed engagement sandbox"
  ],
  "endpoint": "https://demo.nebula-x.local/models/going-concern-analyzer-space/invoke",
  "experienceType": "published-model-experience",
  "trustStatus": "governance-passed",
  "preview": {
    "title": "Going concern assessment preview",
    "description": "Try a synthetic liquidity scenario and inspect risk-rating rationale before duplicating the experience.",
    "sampleInput": "Synthetic scenario: declining revenue, covenant headroom under 8%, refinancing not yet committed.",
    "sampleOutput": "Risk rating: High \u00b7 key drivers: liquidity pressure, covenant sensitivity, unresolved refinancing \u00b7 recommended next step: request updated cash-flow forecast and management plans.",
    "scenarios": [
      {
        "id": "covenant-headroom-tight",
        "label": "Tight covenant headroom",
        "inputText": "Synthetic scenario: revenue down 18%, covenant headroom at 6%, management expects refinancing within 90 days but no term sheet is signed.",
        "output": {
          "prediction": "High",
          "rationale": "Liquidity and covenant sensitivity create substantial uncertainty until refinancing evidence is available.",
          "reasonCode": "GC-COV-01",
          "confidence": 0.9
        }
      },
      {
        "id": "seasonal-cash-pressure",
        "label": "Seasonal cash pressure",
        "inputText": "Synthetic scenario: temporary cash drawdown from seasonality, positive operating cash flow expected next quarter, no covenant breach forecast.",
        "output": {
          "prediction": "Medium",
          "rationale": "Short-term pressure warrants additional procedures, but forecast support and covenant headroom moderate the risk.",
          "reasonCode": "GC-LIQ-02",
          "confidence": 0.66
        }
      },
      {
        "id": "stable-cash-flow",
        "label": "Stable cash-flow outlook",
        "inputText": "Synthetic scenario: recurring revenue growth, positive free cash flow, committed revolving facility, and no covenant pressure.",
        "output": {
          "prediction": "Low",
          "rationale": "Available liquidity and operating performance support a low going-concern risk profile for this synthetic scenario.",
          "confidence": 0.18
        }
      }
    ]
  },
  "lineage": {
    "sandboxId": "audit-going-concern-demo",
    "selectedRunId": "run-going-concern-audit-lm-v2",
    "baseModelId": "model-deloitte-audit-lm",
    "notebookPath": "notebooks/going_concern_assessment_eval.ipynb",
    "dataPackages": [
      "synthetic_financials:8",
      "covenant_scenarios:3"
    ],
    "owner": "Maya Desai",
    "team": "Deloitte Audit AI Studio"
  },
  "reuse": {
    "saves": 26,
    "duplicates": 8,
    "notes": "Ready for governed assurance experiments using synthetic financial and covenant scenarios only."
  }
}

export const models: ModelData[] = [
  {
    "id": "model-gpt-5-5",
    "name": "GPT-5.5",
    "version": "2026-06-15",
    "publisher": "OpenAI / Azure OpenAI",
    "publisherVerified": true,
    "description": "Flagship multimodal and reasoning foundation model for Nebula-X professional-services agents, document intelligence, tool use, and structured outputs across audit, tax, risk, and advisory workflows.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.9,
    "downloads": 268000,
    "lastUpdated": "2026-06-24",
    "compliance": [
      "SOC2",
      "ISO27001",
      "Trustworthy AI reviewed"
    ],
    "metrics": {
      "accuracy": 96.4,
      "latency": 210,
      "throughput": 920
    },
    "teams": 48,
    "tags": [
      "gpt-5.5",
      "multimodal",
      "reasoning",
      "agentic-workflows"
    ],
    "useCases": [
      "Complex engagement reasoning",
      "Workpaper and memo drafting",
      "Financial document analysis",
      "Structured JSON output generation"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/gpt-5-5/professional-services",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-claude-sonnet-4-5",
    "name": "Claude Sonnet 4.5",
    "version": "2026-05-30",
    "publisher": "Anthropic | Deloitte Alliance",
    "publisherVerified": false,
    "description": "Balanced frontier workhorse for long-context synthesis, professional drafting, regulatory analysis, and reliable tool-using Nebula-X workflows.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.8,
    "downloads": 151000,
    "lastUpdated": "2026-06-18",
    "compliance": [
      "SOC2",
      "ISO27001",
      "Alliance governance"
    ],
    "metrics": {
      "accuracy": 95.1,
      "latency": 190,
      "throughput": 820
    },
    "teams": 37,
    "tags": [
      "claude-sonnet-4.5",
      "long-context",
      "synthesis",
      "report-generation"
    ],
    "useCases": [
      "Long-context workpaper synthesis",
      "Management letter drafting",
      "Strategy narrative generation",
      "Regulatory memo drafting"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/claude-sonnet-4-5",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-claude-opus-4-8",
    "name": "Claude Opus 4.8",
    "version": "2026-06-20",
    "publisher": "Anthropic | Deloitte Alliance",
    "publisherVerified": false,
    "description": "Deepest agentic reasoning model for complex diligence, legal-document review, contract clause comparison, and high-stakes advisory analysis.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.9,
    "downloads": 94000,
    "lastUpdated": "2026-06-25",
    "compliance": [
      "SOC2",
      "ISO27001",
      "Human review required"
    ],
    "metrics": {
      "accuracy": 96.8,
      "latency": 320,
      "throughput": 500
    },
    "teams": 25,
    "tags": [
      "claude-opus-4.8",
      "deep-reasoning",
      "legal",
      "diligence"
    ],
    "useCases": [
      "Virtual data room summarization",
      "Contract covenant extraction",
      "Issue tracker generation",
      "Evidence comparison"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/claude-opus-4-8",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-llama-4-maverick",
    "name": "Llama 4 Maverick",
    "version": "4.0-2026-05",
    "publisher": "Meta | Deloitte Alliance",
    "publisherVerified": false,
    "description": "Open-weight foundation model deployable in private environments for confidential engagement workloads, controlled RAG, and cost-efficient professional-services assistants.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.7,
    "downloads": 83000,
    "lastUpdated": "2026-06-12",
    "compliance": [
      "Private deployment",
      "SOC2",
      "Model risk review"
    ],
    "metrics": {
      "accuracy": 91.8,
      "latency": 160,
      "throughput": 1180
    },
    "teams": 23,
    "tags": [
      "llama-4",
      "open-weights",
      "private-deployment",
      "rag"
    ],
    "useCases": [
      "Private professional-services assistants",
      "Controlled RAG retrieval",
      "Cost-efficient analysis",
      "On-premises prototyping"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/llama-4-maverick",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-gemini-3-1-pro",
    "name": "Gemini 3.1 Pro",
    "version": "3.1-2026-06",
    "publisher": "Google Cloud | Deloitte Alliance",
    "publisherVerified": false,
    "description": "Long-context multimodal model suited to large document sets, spreadsheets, presentations, video, and research-heavy consulting workflows.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.8,
    "downloads": 76000,
    "lastUpdated": "2026-06-19",
    "compliance": [
      "SOC2",
      "ISO27001",
      "Alliance governance"
    ],
    "metrics": {
      "accuracy": 94.2,
      "latency": 205,
      "throughput": 860
    },
    "teams": 21,
    "tags": [
      "gemini-3.1",
      "long-context",
      "multimodal",
      "consulting"
    ],
    "useCases": [
      "Spreadsheet reasoning",
      "Market research synthesis",
      "Presentation analysis",
      "Operating-model research"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/gemini-3-1-pro",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-gpt-5-5-codex",
    "name": "GPT-5.5 Codex",
    "version": "2026-06-10",
    "publisher": "OpenAI",
    "publisherVerified": true,
    "description": "Code and agentic automation model optimized for software modernization, workflow generation, test repair, and governed developer copilots.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.8,
    "downloads": 112000,
    "lastUpdated": "2026-06-22",
    "compliance": [
      "SOC2",
      "Secure coding reviewed",
      "Trustworthy AI reviewed"
    ],
    "metrics": {
      "accuracy": 95.7,
      "latency": 180,
      "throughput": 980
    },
    "teams": 34,
    "tags": [
      "gpt-5.5-codex",
      "code",
      "automation",
      "agents"
    ],
    "useCases": [
      "Code generation and repair",
      "Workflow automation",
      "Test creation",
      "Developer agent orchestration"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/gpt-5-5-codex",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-claude-haiku-4-5",
    "name": "Claude Haiku 4.5",
    "version": "2026-05-28",
    "publisher": "Anthropic | Deloitte Alliance",
    "publisherVerified": false,
    "description": "Fast, low-cost model for classification, extraction, routing, summarization, and high-volume professional-services automations.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.7,
    "downloads": 98000,
    "lastUpdated": "2026-06-14",
    "compliance": [
      "SOC2",
      "ISO27001",
      "Alliance governance"
    ],
    "metrics": {
      "accuracy": 90.6,
      "latency": 45,
      "throughput": 2200
    },
    "teams": 29,
    "tags": [
      "claude-haiku-4.5",
      "fast",
      "low-cost",
      "classification"
    ],
    "useCases": [
      "Document triage",
      "Entity extraction",
      "Workflow routing",
      "High-volume summaries"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/claude-haiku-4-5",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-gemini-3-5-flash",
    "name": "Gemini 3.5 Flash",
    "version": "3.5-2026-06",
    "publisher": "Google Cloud | Deloitte Alliance",
    "publisherVerified": false,
    "description": "Fast multimodal model for document intake, visual extraction, meeting artifacts, and cost-sensitive consulting research flows.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.7,
    "downloads": 67000,
    "lastUpdated": "2026-06-17",
    "compliance": [
      "SOC2",
      "ISO27001",
      "Alliance governance"
    ],
    "metrics": {
      "accuracy": 90.1,
      "latency": 55,
      "throughput": 2050
    },
    "teams": 18,
    "tags": [
      "gemini-3.5-flash",
      "fast",
      "multimodal",
      "document-intake"
    ],
    "useCases": [
      "Rapid document classification",
      "Visual extraction",
      "Meeting summary intake",
      "Low-latency research"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/gemini-3-5-flash",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-deepseek-r1",
    "name": "DeepSeek R1",
    "version": "R1-2026-04",
    "publisher": "DeepSeek",
    "publisherVerified": false,
    "description": "Open reasoning model for explainable analytical chains, quantitative review, and private reasoning experiments under Deloitte governance.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.6,
    "downloads": 54000,
    "lastUpdated": "2026-06-08",
    "compliance": [
      "Model risk review",
      "Human review required",
      "Private deployment option"
    ],
    "metrics": {
      "accuracy": 92.4,
      "latency": 260,
      "throughput": 620
    },
    "teams": 14,
    "tags": [
      "deepseek-r1",
      "open-reasoning",
      "quantitative",
      "private-deployment"
    ],
    "useCases": [
      "Quantitative reasoning",
      "Calculation review",
      "Scenario analysis",
      "Explainable decision support"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/deepseek-r1",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-grok-4",
    "name": "Grok 4",
    "version": "4.0-2026-06",
    "publisher": "xAI",
    "publisherVerified": false,
    "description": "Real-time model for market signals, external-event monitoring, and advisory research where current public context is required.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.5,
    "downloads": 41000,
    "lastUpdated": "2026-06-21",
    "compliance": [
      "Human review required",
      "External data controls",
      "Trustworthy AI reviewed"
    ],
    "metrics": {
      "accuracy": 89.4,
      "latency": 150,
      "throughput": 780
    },
    "teams": 11,
    "tags": [
      "grok-4",
      "real-time",
      "market-intelligence",
      "research"
    ],
    "useCases": [
      "Market signal monitoring",
      "Current-event synthesis",
      "Competitive intelligence",
      "Advisory research"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/grok-4",
    "trustStatus": "in-review"
  },
  {
    "id": "model-mistral-large-3",
    "name": "Mistral Large 3",
    "version": "3.0-2026-05",
    "publisher": "Mistral",
    "publisherVerified": false,
    "description": "European and private-deployment foundation model for multilingual professional-services workflows, EU data residency, and regulated clients.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.6,
    "downloads": 47000,
    "lastUpdated": "2026-06-11",
    "compliance": [
      "EU data residency",
      "SOC2",
      "Private deployment"
    ],
    "metrics": {
      "accuracy": 91.6,
      "latency": 170,
      "throughput": 900
    },
    "teams": 16,
    "tags": [
      "mistral-large-3",
      "european",
      "multilingual",
      "private-deployment"
    ],
    "useCases": [
      "EU-regulated client workflows",
      "Multilingual drafting",
      "Private RAG assistants",
      "Policy summarization"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/mistral-large-3",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-gpt-5-mini",
    "name": "GPT-5 mini",
    "version": "2026-06-05",
    "publisher": "OpenAI / Azure OpenAI",
    "publisherVerified": true,
    "description": "Efficient general-purpose model for low-latency extraction, transformation, support agents, and cost-sensitive Nebula-X orchestration steps.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.7,
    "downloads": 126000,
    "lastUpdated": "2026-06-16",
    "compliance": [
      "SOC2",
      "ISO27001",
      "Trustworthy AI reviewed"
    ],
    "metrics": {
      "accuracy": 90.9,
      "latency": 40,
      "throughput": 2400
    },
    "teams": 36,
    "tags": [
      "gpt-5-mini",
      "efficient",
      "low-latency",
      "extraction"
    ],
    "useCases": [
      "Data extraction",
      "Transformation steps",
      "Support agents",
      "Batch enrichment"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/gpt-5-mini",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-openai-o4",
    "name": "OpenAI o4",
    "version": "2026-06-12",
    "publisher": "OpenAI",
    "publisherVerified": true,
    "description": "Deep reasoning model for complex planning, mathematical analysis, multi-step evidence review, and high-stakes professional judgment support.",
    "category": "Foundation Model",
    "type": "partner",
    "status": "production",
    "rating": 4.8,
    "downloads": 72000,
    "lastUpdated": "2026-06-23",
    "compliance": [
      "SOC2",
      "Human review required",
      "Trustworthy AI reviewed"
    ],
    "metrics": {
      "accuracy": 96.1,
      "latency": 300,
      "throughput": 540
    },
    "teams": 24,
    "tags": [
      "openai-o4",
      "deep-reasoning",
      "planning",
      "evidence-review"
    ],
    "useCases": [
      "Complex planning",
      "Mathematical review",
      "Evidence chain analysis",
      "Judgment support"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/openai-o4",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-deloitte-audit-lm",
    "name": "Deloitte Audit LM",
    "version": "2.6.0",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "description": "Deloitte fine-tuned audit language model rebased on Claude Sonnet 4.5 for workpapers, standards citations, risk observations, and exception narratives.",
    "category": "Fine-tuned Model",
    "type": "internal",
    "status": "production",
    "rating": 4.9,
    "downloads": 19800,
    "lastUpdated": "2026-06-20",
    "compliance": [
      "Independence-compliant",
      "Trustworthy AI certified",
      "Audit trail"
    ],
    "metrics": {
      "accuracy": 96.2,
      "latency": 145,
      "throughput": 700
    },
    "teams": 31,
    "tags": [
      "deloitte-fine-tuned",
      "audit",
      "claude-sonnet-4.5",
      "workpapers"
    ],
    "useCases": [
      "Audit observation drafting",
      "Standards citation support",
      "Exception narrative generation",
      "Review-note response drafting"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/deloitte-audit-lm",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-deloitte-tax-globe",
    "name": "Deloitte Tax GloBE Model",
    "version": "2.1.0",
    "publisher": "Deloitte Tax",
    "publisherVerified": true,
    "description": "Deloitte tax model rebased on Llama 4 for OECD Pillar Two interpretation, top-up tax calculations, safe-harbor analysis, and tax memo drafting.",
    "category": "Fine-tuned Model",
    "type": "internal",
    "status": "production",
    "rating": 4.8,
    "downloads": 10400,
    "lastUpdated": "2026-06-18",
    "compliance": [
      "Trustworthy AI certified",
      "Tax review required",
      "Audit trail"
    ],
    "metrics": {
      "accuracy": 94.1,
      "latency": 150,
      "throughput": 660
    },
    "teams": 18,
    "tags": [
      "deloitte-fine-tuned",
      "tax",
      "llama-4",
      "globe"
    ],
    "useCases": [
      "GloBE rule interpretation",
      "Entity-level calculation support",
      "Tax memo drafting",
      "Safe-harbor scenario analysis"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/deloitte-tax-globe",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-deloitte-risk-regulatory-lm",
    "name": "Deloitte Risk Regulatory LM",
    "version": "2.3.0",
    "publisher": "Deloitte Risk",
    "publisherVerified": true,
    "description": "Deloitte risk regulatory model rebased on GPT-5.5 for horizon scanning, regulatory classification, control mapping, and supervisory guidance analysis.",
    "category": "Fine-tuned Model",
    "type": "internal",
    "status": "production",
    "rating": 4.8,
    "downloads": 12100,
    "lastUpdated": "2026-06-22",
    "compliance": [
      "Trustworthy AI certified",
      "Model risk reviewed",
      "Audit trail"
    ],
    "metrics": {
      "accuracy": 94.6,
      "latency": 160,
      "throughput": 650
    },
    "teams": 23,
    "tags": [
      "deloitte-fine-tuned",
      "risk-advisory",
      "gpt-5.5",
      "basel-iv"
    ],
    "useCases": [
      "Regulatory impact assessment",
      "Control obligation mapping",
      "Policy comparison",
      "Supervisory guidance summarization"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/deloitte-risk-regulatory-lm",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-deloitte-legal-doc-embeddings",
    "name": "Deloitte Legal-Doc Embeddings",
    "version": "4-large-2026",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "description": "Deloitte embedding model rebased on text-embedding-4-large for contracts, credit agreements, policies, and due-diligence archives.",
    "category": "Embedding Model",
    "type": "internal",
    "status": "production",
    "rating": 4.7,
    "downloads": 15100,
    "lastUpdated": "2026-06-14",
    "compliance": [
      "PII-safe",
      "Confidential engagement ready",
      "SOC2"
    ],
    "metrics": {
      "accuracy": 92.7,
      "latency": 30,
      "throughput": 2600
    },
    "teams": 26,
    "tags": [
      "embeddings",
      "legal",
      "text-embedding-4-large",
      "rag"
    ],
    "useCases": [
      "Contract clause retrieval",
      "Covenant similarity search",
      "Diligence archive indexing",
      "Policy semantic search"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/deloitte-legal-doc-embeddings",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-financial-statement-vision",
    "name": "Financial Statement Vision",
    "version": "2.0.0",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "description": "Document vision model rebased on GPT-5.5 Vision for extracting tables, notes, and financial schedules from statements, filings, and diligence PDFs.",
    "category": "Document AI",
    "type": "internal",
    "status": "production",
    "rating": 4.8,
    "downloads": 8600,
    "lastUpdated": "2026-06-17",
    "compliance": [
      "SOC2",
      "Human review required",
      "Audit trail"
    ],
    "metrics": {
      "accuracy": 95.6,
      "latency": 230,
      "throughput": 390
    },
    "teams": 15,
    "tags": [
      "document-ai",
      "gpt-5.5-vision",
      "financial-statements",
      "table-extraction"
    ],
    "useCases": [
      "Financial table extraction",
      "Footnote parsing",
      "Schedule normalization",
      "Evidence package preparation"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/financial-statement-vision",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-strategy-knowledge-embeddings",
    "name": "Strategy Knowledge Embeddings",
    "version": "3.0.0",
    "publisher": "Deloitte Consulting",
    "publisherVerified": true,
    "description": "Modern embeddings model for strategy libraries, market research, operating-model assets, benchmarks, and industry playbooks.",
    "category": "Embedding Model",
    "type": "internal",
    "status": "production",
    "rating": 4.7,
    "downloads": 10900,
    "lastUpdated": "2026-06-13",
    "compliance": [
      "Confidential engagement ready",
      "SOC2",
      "Trustworthy AI reviewed"
    ],
    "metrics": {
      "accuracy": 92.0,
      "latency": 32,
      "throughput": 2500
    },
    "teams": 20,
    "tags": [
      "embeddings",
      "strategy",
      "modern-embeddings",
      "knowledge-search"
    ],
    "useCases": [
      "Strategy asset retrieval",
      "Benchmark matching",
      "Framework discovery",
      "Market research clustering"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/strategy-knowledge-embeddings",
    "trustStatus": "governance-passed"
  },
  {
    "id": "model-esg-disclosure-lm",
    "name": "ESG Disclosure LM",
    "version": "2.0.0",
    "publisher": "Deloitte ESG",
    "publisherVerified": true,
    "description": "Deloitte ESG disclosure model rebased on Claude Sonnet 4.5 for CSRD, GRI, ISSB, and GHG Protocol drafting, evidence mapping, and assurance-readiness language.",
    "category": "Fine-tuned Model",
    "type": "internal",
    "status": "production",
    "rating": 4.8,
    "downloads": 9100,
    "lastUpdated": "2026-06-21",
    "compliance": [
      "Trustworthy AI certified",
      "Audit trail",
      "Human review required"
    ],
    "metrics": {
      "accuracy": 94.0,
      "latency": 155,
      "throughput": 630
    },
    "teams": 17,
    "tags": [
      "deloitte-fine-tuned",
      "esg",
      "claude-sonnet-4.5",
      "ghg-protocol"
    ],
    "useCases": [
      "Disclosure drafting",
      "Evidence-to-standard mapping",
      "Materiality narrative generation",
      "Assurance-readiness review"
    ],
    "endpoint": "https://nebula-x.azure.com/endpoints/esg-disclosure-lm",
    "trustStatus": "governance-passed"
  }
]
