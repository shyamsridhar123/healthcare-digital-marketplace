import { Asset, SpaceDemo, Workflow } from "./types"

export const assets: Asset[] = [
  {
    "id": "ledgersentinel",
    "name": "LedgerSentinel",
    "description": "Continuously monitors enterprise general ledger entries for statistical anomalies, control gaps, and material misstatement indicators. Delivers risk-ranked findings with workpaper-ready documentation.",
    "summary": "Continuous GL anomaly detection and audit documentation",
    "type": "agent",
    "category": "Audit & Assurance",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "version": "2.4.1",
    "downloads": 7420,
    "rating": 4.9,
    "tags": [
      "Audit",
      "SOX",
      "PCAOB",
      "Anomaly Detection",
      "Audit Trail",
      "Trustworthy AI Certified"
    ],
    "pricing": "Enterprise",
    "icon": "ShieldCheck",
    "lastUpdated": "2026-05-22",
    "publishedDate": "2025-07-14",
    "orchestrationUsage": 118,
    "capabilities": [
      "GL ingestion",
      "Statistical sampling",
      "Variance analysis",
      "GAAP/IFRS rules engine",
      "Exception narrative generation",
      "Workpaper formatting"
    ],
    "installCommand": "/nebula deploy ledgersentinel",
    "invocation": "/ledgersentinel",
    "uiHref": "/marketplace/agents/ledgersentinel",
    "docsHref": "/docs/agents/ledgersentinel"
  },
  {
    "id": "auditscribe",
    "name": "AuditScribe",
    "description": "Transforms testing workpapers and evidence files into polished audit observations, management letter points, and board-ready summaries. Compresses report-writing cycles while preserving review checkpoints.",
    "summary": "Drafts audit observations from workpapers",
    "type": "agent",
    "category": "Audit & Assurance",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "version": "2.2.0",
    "downloads": 5310,
    "rating": 4.8,
    "tags": [
      "Audit",
      "PCAOB",
      "Document Analysis",
      "Report Generation",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "FileSearch",
    "lastUpdated": "2026-04-18",
    "publishedDate": "2025-08-05",
    "orchestrationUsage": 96,
    "capabilities": [
      "Workpaper synthesis",
      "Risk severity scoring",
      "Regulatory language library",
      "PCAOB compliance checks",
      "Draft review loop"
    ],
    "installCommand": "/nebula deploy auditscribe",
    "invocation": "/auditscribe",
    "uiHref": "/marketplace/agents/auditscribe",
    "docsHref": "/docs/agents/auditscribe"
  },
  {
    "id": "goingconcernadvisor",
    "name": "GoingConcernAdvisor",
    "description": "Evaluates going concern indicators from financial data and management representations. Produces a risk-rated assessment and disclosure recommendation memo aligned to assurance standards.",
    "summary": "Creates going concern risk memos",
    "type": "agent",
    "category": "Audit & Assurance",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "version": "1.9.3",
    "downloads": 3880,
    "rating": 4.7,
    "tags": [
      "Audit",
      "IFRS",
      "US GAAP",
      "Financial Modeling",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "Scale",
    "lastUpdated": "2026-03-30",
    "publishedDate": "2025-09-12",
    "orchestrationUsage": 74,
    "capabilities": [
      "Financial ratio computation",
      "Debt covenant review",
      "Liquidity stress testing",
      "Management assessment review",
      "Disclosure template generation"
    ],
    "installCommand": "/nebula deploy goingconcernadvisor",
    "invocation": "/goingconcernadvisor",
    "uiHref": "/marketplace/agents/goingconcernadvisor",
    "docsHref": "/docs/agents/goingconcernadvisor"
  },
  {
    "id": "taxarchitect",
    "name": "TaxArchitect",
    "description": "Models global tax structures for multinational clients, mapping entity hierarchies against BEPS, treaty networks, and local requirements. Quantifies effective tax rate impact with structured assumptions.",
    "summary": "Designs global tax structures and scenarios",
    "type": "agent",
    "category": "Tax & Compliance",
    "publisher": "Deloitte Tax",
    "publisherVerified": true,
    "version": "3.1.2",
    "downloads": 6840,
    "rating": 4.9,
    "tags": [
      "Tax",
      "OECD Pillar Two",
      "Financial Modeling",
      "Regulatory Monitoring",
      "Trustworthy AI Certified"
    ],
    "pricing": "Enterprise",
    "icon": "Landmark",
    "lastUpdated": "2026-06-02",
    "publishedDate": "2025-06-20",
    "orchestrationUsage": 112,
    "capabilities": [
      "Jurisdiction rules engine",
      "Transfer pricing analysis",
      "Effective tax rate modeling",
      "BEPS compliance",
      "Treaty network analysis",
      "Entity structure mapping"
    ],
    "installCommand": "/nebula deploy taxarchitect",
    "invocation": "/taxarchitect",
    "uiHref": "/marketplace/agents/taxarchitect",
    "docsHref": "/docs/agents/taxarchitect"
  },
  {
    "id": "indirecttaxradar",
    "name": "IndirectTaxRadar",
    "description": "Monitors VAT, GST, and sales tax obligations across jurisdictions in real time. Classifies transactions, determines nexus, and flags filing obligations before deadlines.",
    "summary": "Monitors global indirect tax obligations",
    "type": "agent",
    "category": "Tax & Compliance",
    "publisher": "Deloitte Tax",
    "publisherVerified": true,
    "version": "2.7.4",
    "downloads": 4260,
    "rating": 4.8,
    "tags": [
      "Tax",
      "Regulatory Monitoring",
      "Real-Time",
      "Audit Trail",
      "Batch Processing"
    ],
    "pricing": "Enterprise",
    "icon": "Radar",
    "lastUpdated": "2026-05-05",
    "publishedDate": "2025-10-01",
    "orchestrationUsage": 83,
    "capabilities": [
      "Jurisdiction rules monitoring",
      "Invoice classification",
      "Nexus determination",
      "Filing calendar management",
      "Refund opportunity identification"
    ],
    "installCommand": "/nebula deploy indirecttaxradar",
    "invocation": "/indirecttaxradar",
    "uiHref": "/marketplace/agents/indirecttaxradar",
    "docsHref": "/docs/agents/indirecttaxradar"
  },
  {
    "id": "controltester",
    "name": "ControlTester",
    "description": "Automates SOX and ICFR control testing by querying ERP transaction populations, applying sampling, and evaluating design and operating effectiveness. Produces defensible exception reporting.",
    "summary": "Automates SOX control testing",
    "type": "agent",
    "category": "Risk & Regulatory",
    "publisher": "Deloitte Risk",
    "publisherVerified": true,
    "version": "2.8.0",
    "downloads": 6120,
    "rating": 4.9,
    "tags": [
      "Risk Advisory",
      "SOX",
      "COSO",
      "Audit Trail",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "ShieldCheck",
    "lastUpdated": "2026-04-29",
    "publishedDate": "2025-07-30",
    "orchestrationUsage": 105,
    "capabilities": [
      "ERP API connectors",
      "COSO control mapping",
      "Statistical sampling",
      "Exception reporting",
      "Issue classification",
      "Management response workflow"
    ],
    "installCommand": "/nebula deploy controltester",
    "invocation": "/controltester",
    "uiHref": "/marketplace/agents/controltester",
    "docsHref": "/docs/agents/controltester"
  },
  {
    "id": "regradar",
    "name": "RegRadar",
    "description": "Scans the global regulatory horizon, classifies impacted business units, and drafts preliminary impact assessments. Keeps obligation maps current for risk and compliance teams.",
    "summary": "Tracks regulations and drafts impact memos",
    "type": "agent",
    "category": "Risk & Regulatory",
    "publisher": "Deloitte Risk",
    "publisherVerified": true,
    "version": "3.0.1",
    "downloads": 7950,
    "rating": 4.8,
    "tags": [
      "Risk Advisory",
      "DORA",
      "Basel IV",
      "Regulatory Monitoring",
      "Report Generation"
    ],
    "pricing": "Enterprise",
    "icon": "Radar",
    "lastUpdated": "2026-06-12",
    "publishedDate": "2025-05-21",
    "orchestrationUsage": 119,
    "capabilities": [
      "Regulatory feed ingestion",
      "NLP classification",
      "Materiality scoring",
      "Business line mapping",
      "Impact memo generation",
      "Regulatory calendar maintenance"
    ],
    "installCommand": "/nebula deploy regradar",
    "invocation": "/regradar",
    "uiHref": "/marketplace/agents/regradar",
    "docsHref": "/docs/agents/regradar"
  },
  {
    "id": "dealscout",
    "name": "DealScout",
    "description": "Screens acquisition targets against strategic and financial criteria. Scores and ranks candidates with supporting comparable analysis and diligence-ready rationale.",
    "summary": "Ranks acquisition targets by fit",
    "type": "agent",
    "category": "Deal Advisory & M&A",
    "publisher": "Deloitte Deals",
    "publisherVerified": true,
    "version": "1.8.5",
    "downloads": 2980,
    "rating": 4.6,
    "tags": [
      "Deal Advisory",
      "Financial Modeling",
      "Document Analysis",
      "Batch Processing",
      "Audit Trail"
    ],
    "pricing": "Pro",
    "icon": "LineChart",
    "lastUpdated": "2026-02-14",
    "publishedDate": "2025-11-04",
    "orchestrationUsage": 44,
    "capabilities": [
      "Financial database connectors",
      "Company profiling",
      "Comparable analysis",
      "Scoring models",
      "Target ranking"
    ],
    "installCommand": "/nebula deploy dealscout",
    "invocation": "/dealscout",
    "uiHref": "/marketplace/agents/dealscout",
    "docsHref": "/docs/agents/dealscout"
  },
  {
    "id": "ddvault-analyst",
    "name": "DDVault Analyst",
    "description": "Ingests virtual data room documents and surfaces deal-critical findings, red flags, and buyer-focused risk assessments. Outputs a structured diligence tracker for teams.",
    "summary": "Analyzes data room documents at scale",
    "type": "agent",
    "category": "Deal Advisory & M&A",
    "publisher": "Deloitte Deals",
    "publisherVerified": true,
    "version": "2.5.2",
    "downloads": 5840,
    "rating": 4.9,
    "tags": [
      "Deal Advisory",
      "Document Analysis",
      "Confidential-Engagement-Ready",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "Database",
    "lastUpdated": "2026-05-16",
    "publishedDate": "2025-08-18",
    "orchestrationUsage": 101,
    "capabilities": [
      "Document ingestion",
      "Named entity extraction",
      "Contract clause identification",
      "Risk flagging",
      "Issue categorization",
      "Diligence report generation"
    ],
    "installCommand": "/nebula deploy ddvault-analyst",
    "invocation": "/ddvault-analyst",
    "uiHref": "/marketplace/agents/ddvault-analyst",
    "docsHref": "/docs/agents/ddvault-analyst"
  },
  {
    "id": "ma-regulatory-checkpoint",
    "name": "M&A Regulatory Checkpoint",
    "description": "Assesses acquisitions for antitrust, FDI, and sector-specific approval requirements across jurisdictions. Produces an approval roadmap with indicative timelines.",
    "summary": "Maps transaction regulatory approvals",
    "type": "agent",
    "category": "Deal Advisory & M&A",
    "publisher": "Deloitte Deals",
    "publisherVerified": true,
    "version": "1.7.1",
    "downloads": 2140,
    "rating": 4.6,
    "tags": [
      "Deal Advisory",
      "Legal",
      "Regulatory Monitoring",
      "Report Generation",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "Gavel",
    "lastUpdated": "2026-01-29",
    "publishedDate": "2025-09-22",
    "orchestrationUsage": 39,
    "capabilities": [
      "Competition law corpus",
      "Deal structure parsing",
      "FDI rule mapping",
      "Filing threshold analysis",
      "Jurisdictional timeline modeling",
      "Counsel briefing memo"
    ],
    "installCommand": "/nebula deploy ma-regulatory-checkpoint",
    "invocation": "/ma-regulatory-checkpoint",
    "uiHref": "/marketplace/agents/ma-regulatory-checkpoint",
    "docsHref": "/docs/agents/ma-regulatory-checkpoint"
  },
  {
    "id": "valuationengine",
    "name": "ValuationEngine",
    "description": "Performs DCF, comparable company, and precedent transaction valuation analyses from financial inputs. Generates sensitivity tables, football field views, and narrative conclusions.",
    "summary": "Automates valuation analysis packages",
    "type": "agent",
    "category": "Financial Advisory",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "version": "2.3.6",
    "downloads": 6670,
    "rating": 4.8,
    "tags": [
      "Financial Advisory",
      "Financial Modeling",
      "Report Generation",
      "Audit Trail"
    ],
    "pricing": "Enterprise",
    "icon": "BarChart3",
    "lastUpdated": "2026-04-04",
    "publishedDate": "2025-06-28",
    "orchestrationUsage": 91,
    "capabilities": [
      "Capital markets data API",
      "DCF model assembly",
      "Comparable selection",
      "Transaction comparable selection",
      "Football field generation",
      "Valuation memo drafting"
    ],
    "installCommand": "/nebula deploy valuationengine",
    "invocation": "/valuationengine",
    "uiHref": "/marketplace/agents/valuationengine",
    "docsHref": "/docs/agents/valuationengine"
  },
  {
    "id": "restructuringadvisor",
    "name": "RestructuringAdvisor",
    "description": "Models debt restructuring scenarios, creditor recovery, and financing alternatives. Helps advisory teams compare covenant outcomes and cash-flow sensitivities.",
    "summary": "Models restructuring scenarios",
    "type": "agent",
    "category": "Financial Advisory",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "version": "1.6.8",
    "downloads": 1860,
    "rating": 4.5,
    "tags": [
      "Financial Advisory",
      "Financial Modeling",
      "FSI",
      "Scenario Analysis",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "LineChart",
    "lastUpdated": "2026-03-11",
    "publishedDate": "2025-12-03",
    "orchestrationUsage": 31,
    "capabilities": [
      "Debt schedule modeling",
      "Covenant analysis",
      "Cash flow forecasting",
      "Creditor waterfall",
      "Scenario comparison"
    ],
    "installCommand": "/nebula deploy restructuringadvisor",
    "invocation": "/restructuringadvisor",
    "uiHref": "/marketplace/agents/restructuringadvisor",
    "docsHref": "/docs/agents/restructuringadvisor"
  },
  {
    "id": "strategyscribe",
    "name": "StrategyScribe",
    "description": "Synthesizes interviews, market reports, financial data, and internal documents into structured strategic options. Produces evidence-backed recommendations and executive-ready narratives.",
    "summary": "Synthesizes strategy recommendations",
    "type": "agent",
    "category": "Strategy & Consulting",
    "publisher": "Deloitte Consulting",
    "publisherVerified": true,
    "version": "2.6.0",
    "downloads": 7180,
    "rating": 4.8,
    "tags": [
      "Strategy & Ops",
      "Document Analysis",
      "Report Generation",
      "Human-in-the-Loop"
    ],
    "pricing": "Enterprise",
    "icon": "Brain",
    "lastUpdated": "2026-05-28",
    "publishedDate": "2025-07-09",
    "orchestrationUsage": 108,
    "capabilities": [
      "Document synthesis",
      "Options framework structuring",
      "Evidence mapping",
      "Narrative generation",
      "Deck assembly",
      "Scenario comparison"
    ],
    "installCommand": "/nebula deploy strategyscribe",
    "invocation": "/strategyscribe",
    "uiHref": "/marketplace/agents/strategyscribe",
    "docsHref": "/docs/agents/strategyscribe"
  },
  {
    "id": "benchmarkpulse",
    "name": "BenchmarkPulse",
    "description": "Retrieves and synthesizes benchmarking data across KPIs, cost structures, operating models, and digital maturity. Supports peer-group comparisons by sector.",
    "summary": "Builds competitive benchmark views",
    "type": "agent",
    "category": "Strategy & Consulting",
    "publisher": "Deloitte Consulting",
    "publisherVerified": true,
    "version": "2.1.9",
    "downloads": 3620,
    "rating": 4.7,
    "tags": [
      "Strategy & Ops",
      "Real-Time",
      "Financial Modeling",
      "Report Generation"
    ],
    "pricing": "Pro",
    "icon": "Activity",
    "lastUpdated": "2026-04-10",
    "publishedDate": "2025-10-14",
    "orchestrationUsage": 57,
    "capabilities": [
      "External data connectors",
      "Peer group selection",
      "Percentile scoring",
      "Gap-to-median calculation",
      "Benchmark narrative",
      "Visualization package"
    ],
    "installCommand": "/nebula deploy benchmarkpulse",
    "invocation": "/benchmarkpulse",
    "uiHref": "/marketplace/agents/benchmarkpulse",
    "docsHref": "/docs/agents/benchmarkpulse"
  },
  {
    "id": "threatnarrator",
    "name": "ThreatNarrator",
    "description": "Converts SOC alerts and threat intelligence feeds into human-readable incident summaries with recommended responses. Prioritizes findings using MITRE ATT&CK context.",
    "summary": "Narrates incidents and response actions",
    "type": "agent",
    "category": "Cyber & Privacy",
    "publisher": "Deloitte Cyber",
    "publisherVerified": true,
    "version": "2.9.1",
    "downloads": 4930,
    "rating": 4.8,
    "tags": [
      "Cyber",
      "MITRE ATT&CK",
      "Real-Time",
      "Report Generation",
      "Trustworthy AI Certified"
    ],
    "pricing": "Enterprise",
    "icon": "Lock",
    "lastUpdated": "2026-06-08",
    "publishedDate": "2025-06-25",
    "orchestrationUsage": 87,
    "capabilities": [
      "SIEM/SOAR connectors",
      "MITRE ATT&CK mapping",
      "Triage scoring",
      "Threat intel fusion",
      "Incident summary generation",
      "Response playbook selection"
    ],
    "installCommand": "/nebula deploy threatnarrator",
    "invocation": "/threatnarrator",
    "uiHref": "/marketplace/agents/threatnarrator",
    "docsHref": "/docs/agents/threatnarrator"
  },
  {
    "id": "privacymapper",
    "name": "PrivacyMapper",
    "description": "Scans repositories, databases, and data flows to identify personal data assets and regulatory obligations. Generates draft records of processing activity and risk maps.",
    "summary": "Maps privacy obligations to data flows",
    "type": "agent",
    "category": "Cyber & Privacy",
    "publisher": "Deloitte Cyber",
    "publisherVerified": true,
    "version": "2.0.4",
    "downloads": 3290,
    "rating": 4.6,
    "tags": [
      "Cyber",
      "GDPR",
      "CCPA",
      "PII-Safe",
      "Data Lineage"
    ],
    "pricing": "Enterprise",
    "icon": "Network",
    "lastUpdated": "2026-03-25",
    "publishedDate": "2025-08-27",
    "orchestrationUsage": 62,
    "capabilities": [
      "Code repository scanning",
      "Data lineage tracing",
      "PII classification",
      "Obligation mapping",
      "RoPA template generation",
      "Risk scoring"
    ],
    "installCommand": "/nebula deploy privacymapper",
    "invocation": "/privacymapper",
    "uiHref": "/marketplace/agents/privacymapper",
    "docsHref": "/docs/agents/privacymapper"
  },
  {
    "id": "carbonaccountant",
    "name": "CarbonAccountant",
    "description": "Ingests Scope 1, 2, and 3 emissions data, applies GHG Protocol methodologies, and drafts CSRD and TCFD-ready disclosures. Adds assurance-readiness checks for review.",
    "summary": "Prepares governed emissions disclosures",
    "type": "agent",
    "category": "ESG & Sustainability",
    "publisher": "Deloitte ESG",
    "publisherVerified": true,
    "version": "3.2.0",
    "downloads": 4560,
    "rating": 4.9,
    "tags": [
      "ESG",
      "CSRD",
      "GHG Protocol",
      "TCFD",
      "Audit Trail"
    ],
    "pricing": "Enterprise",
    "icon": "Leaf",
    "lastUpdated": "2026-05-31",
    "publishedDate": "2025-06-11",
    "orchestrationUsage": 93,
    "capabilities": [
      "Emissions factor databases",
      "GHG Protocol computation",
      "Supply chain connectors",
      "CSRD templates",
      "Net-zero pathway analysis",
      "Assurance-readiness scoring"
    ],
    "installCommand": "/nebula deploy carbonaccountant",
    "invocation": "/carbonaccountant",
    "uiHref": "/marketplace/agents/carbonaccountant",
    "docsHref": "/docs/agents/carbonaccountant"
  },
  {
    "id": "esgratinganalyzer",
    "name": "ESGRatingAnalyzer",
    "description": "Benchmarks ESG scores and disclosures against peer frameworks including MSCI, Sustainalytics, ISS, and CDP. Identifies rating gaps and multi-year improvement roadmaps.",
    "summary": "Benchmarks ESG ratings and gaps",
    "type": "agent",
    "category": "ESG & Sustainability",
    "publisher": "Deloitte ESG",
    "publisherVerified": true,
    "version": "1.9.0",
    "downloads": 2410,
    "rating": 4.6,
    "tags": [
      "ESG",
      "Benchmarking",
      "Document Analysis",
      "Report Generation"
    ],
    "pricing": "Pro",
    "icon": "Leaf",
    "lastUpdated": "2026-02-26",
    "publishedDate": "2025-09-18",
    "orchestrationUsage": 46,
    "capabilities": [
      "ESG data APIs",
      "Peer group selection",
      "Score normalization",
      "Gap analysis",
      "Roadmap generation",
      "Board narrative drafting"
    ],
    "installCommand": "/nebula deploy esgratinganalyzer",
    "invocation": "/esgratinganalyzer",
    "uiHref": "/marketplace/agents/esgratinganalyzer",
    "docsHref": "/docs/agents/esgratinganalyzer"
  },
  {
    "id": "pcaob-issb-standards-mcp",
    "name": "PCAOB/ISSB Standards MCP",
    "description": "Exposes PCAOB auditing standards, SEC reporting rules, IAASB ISAs, and ISSB assurance guidance as tool-callable APIs. Provides versioned citations for audit agents.",
    "summary": "Tool-callable audit and assurance standards",
    "type": "mcp-server",
    "category": "MCP Servers",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "version": "2.4.0",
    "downloads": 3520,
    "rating": 4.9,
    "tags": [
      "MCP Server",
      "Audit",
      "PCAOB",
      "CSRD",
      "Citation Generation"
    ],
    "pricing": "Enterprise",
    "icon": "Server",
    "lastUpdated": "2026-04-22",
    "publishedDate": "2025-07-01",
    "orchestrationUsage": 77,
    "capabilities": [
      "Standards retrieval",
      "Version management",
      "Citation generation",
      "Cross-standard mapping",
      "Regulatory update ingestion"
    ],
    "installCommand": "/nebula deploy pcaob-issb-standards-mcp",
    "invocation": "/pcaob-issb-standards-mcp",
    "uiHref": "/marketplace/mcp-servers/pcaob-issb-standards-mcp",
    "docsHref": "/docs/mcp-servers/pcaob-issb-standards-mcp"
  },
  {
    "id": "globaltaxcodex-mcp",
    "name": "GlobalTaxCodex MCP",
    "description": "Serves tax legislation, treaties, OECD guidance, and country-specific regulations as structured tool-callable APIs. Enables tax agents to retrieve current context and citations.",
    "summary": "Live tax legislation and treaty context",
    "type": "mcp-server",
    "category": "MCP Servers",
    "publisher": "Deloitte Tax",
    "publisherVerified": true,
    "version": "3.0.0",
    "downloads": 4380,
    "rating": 4.8,
    "tags": [
      "MCP Server",
      "Tax",
      "OECD Pillar Two",
      "Regulatory Monitoring",
      "RAG-Enhanced"
    ],
    "pricing": "Enterprise",
    "icon": "Server",
    "lastUpdated": "2026-05-19",
    "publishedDate": "2025-06-19",
    "orchestrationUsage": 84,
    "capabilities": [
      "Multi-jurisdiction tax corpus",
      "Treaty network graph",
      "Regulatory update feeds",
      "Jurisdiction comparison",
      "Practitioner guidance notes"
    ],
    "installCommand": "/nebula deploy globaltaxcodex-mcp",
    "invocation": "/globaltaxcodex-mcp",
    "uiHref": "/marketplace/mcp-servers/globaltaxcodex-mcp",
    "docsHref": "/docs/mcp-servers/globaltaxcodex-mcp"
  },
  {
    "id": "dora-basel-iv-compliance-mcp",
    "name": "DORA/Basel IV Compliance MCP",
    "description": "Exposes DORA, Basel IV, ECB TRIM, and SR 11-7 supervisory guidance as reference APIs. Supplies Q&A and gap-assessment templates for risk agents.",
    "summary": "Risk regulation reference APIs",
    "type": "mcp-server",
    "category": "MCP Servers",
    "publisher": "Deloitte Risk",
    "publisherVerified": true,
    "version": "2.2.3",
    "downloads": 3180,
    "rating": 4.7,
    "tags": [
      "MCP Server",
      "Risk Advisory",
      "DORA",
      "Basel IV",
      "Policy Mapping"
    ],
    "pricing": "Enterprise",
    "icon": "Server",
    "lastUpdated": "2026-03-17",
    "publishedDate": "2025-10-02",
    "orchestrationUsage": 69,
    "capabilities": [
      "Regulatory text retrieval",
      "Compliance gap templates",
      "Jurisdiction cross-reference",
      "Supervisory expectation mapping",
      "Policy alignment"
    ],
    "installCommand": "/nebula deploy dora-basel-iv-compliance-mcp",
    "invocation": "/dora-basel-iv-compliance-mcp",
    "uiHref": "/marketplace/mcp-servers/dora-basel-iv-compliance-mcp",
    "docsHref": "/docs/mcp-servers/dora-basel-iv-compliance-mcp"
  },
  {
    "id": "csrd-gri-standards-mcp",
    "name": "CSRD/GRI Standards MCP",
    "description": "Serves ISSB, GRI, SASB, and CDP reporting standards as live tool-callable reference for ESG agents. Includes materiality templates and sector guidance.",
    "summary": "Sustainability standards reference APIs",
    "type": "mcp-server",
    "category": "MCP Servers",
    "publisher": "Deloitte ESG",
    "publisherVerified": true,
    "version": "1.8.2",
    "downloads": 2760,
    "rating": 4.7,
    "tags": [
      "MCP Server",
      "ESG",
      "CSRD",
      "GHG Protocol",
      "Double Materiality"
    ],
    "pricing": "Enterprise",
    "icon": "Server",
    "lastUpdated": "2026-04-01",
    "publishedDate": "2025-09-05",
    "orchestrationUsage": 52,
    "capabilities": [
      "Standards corpus",
      "Sector-specific SASB tables",
      "Materiality guidance",
      "Double materiality templates",
      "Regulatory update tracking"
    ],
    "installCommand": "/nebula deploy csrd-gri-standards-mcp",
    "invocation": "/csrd-gri-standards-mcp",
    "uiHref": "/marketplace/mcp-servers/csrd-gri-standards-mcp",
    "docsHref": "/docs/mcp-servers/csrd-gri-standards-mcp"
  },
  {
    "id": "pillar-two-calculator",
    "name": "PillarTwo Calculator",
    "description": "Applies OECD Pillar Two GloBE rules to compute top-up tax exposure per constituent entity. Returns explainable calculations and review-ready tables.",
    "summary": "Calculates Pillar Two tax scenarios",
    "type": "mcp-tool",
    "category": "Tax & Compliance",
    "publisher": "Deloitte Tax",
    "publisherVerified": true,
    "version": "2.1.5",
    "downloads": 3910,
    "rating": 4.8,
    "tags": [
      "Tax",
      "OECD Pillar Two",
      "Financial Modeling",
      "Audit Trail"
    ],
    "pricing": "Enterprise",
    "icon": "Calculator",
    "lastUpdated": "2026-05-06",
    "publishedDate": "2025-08-13",
    "orchestrationUsage": 71,
    "capabilities": [
      "GloBE rules inference",
      "Top-up tax computation",
      "Safe harbor testing",
      "Entity-level allocation",
      "Threshold analysis"
    ],
    "installCommand": "/nebula deploy pillar-two-calculator",
    "invocation": "/pillar-two-calculator",
    "uiHref": "/marketplace/mcp-tools/pillar-two-calculator",
    "docsHref": "/docs/mcp-tools/pillar-two-calculator"
  },
  {
    "id": "clm-reviewer",
    "name": "CLM Reviewer",
    "description": "Reads complex credit agreements, loan documents, and indentures to extract covenants and event triggers. Produces structured covenant summaries for review.",
    "summary": "Extracts covenants from credit documents",
    "type": "mcp-tool",
    "category": "Industry Solutions",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "version": "1.9.7",
    "downloads": 2210,
    "rating": 4.7,
    "tags": [
      "FSI",
      "Legal",
      "Document Analysis",
      "ContractNLI",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "FileText",
    "lastUpdated": "2026-02-20",
    "publishedDate": "2025-10-20",
    "orchestrationUsage": 43,
    "capabilities": [
      "Legal document ingestion",
      "Clause extraction",
      "Covenant classification",
      "Trigger condition modeling",
      "Cross-reference mapping"
    ],
    "installCommand": "/nebula deploy clm-reviewer",
    "invocation": "/clm-reviewer",
    "uiHref": "/marketplace/mcp-tools/clm-reviewer",
    "docsHref": "/docs/mcp-tools/clm-reviewer"
  },
  {
    "id": "clinicaltrialparser",
    "name": "ClinicalTrialParser",
    "description": "Extracts Phase II and III trial data from regulatory filings and synthesizes competitive intelligence for strategy and transaction teams. Built for life sciences advisory work.",
    "summary": "Parses trial filings for advisory insights",
    "type": "mcp-tool",
    "category": "Industry Solutions",
    "publisher": "Deloitte | Alliance",
    "publisherVerified": false,
    "version": "1.4.2",
    "downloads": 1280,
    "rating": 4.4,
    "tags": [
      "Life Sciences",
      "Document Analysis",
      "Competitive Intelligence",
      "Human Review Required"
    ],
    "pricing": "Pro",
    "icon": "FileSearch",
    "lastUpdated": "2026-01-18",
    "publishedDate": "2025-11-12",
    "orchestrationUsage": 24,
    "capabilities": [
      "Filing ingestion",
      "Endpoint extraction",
      "Comparator mapping",
      "Evidence synthesis",
      "Competitive intelligence brief"
    ],
    "installCommand": "/nebula deploy clinicaltrialparser",
    "invocation": "/clinicaltrialparser",
    "uiHref": "/marketplace/mcp-tools/clinicaltrialparser",
    "docsHref": "/docs/mcp-tools/clinicaltrialparser"
  },
  {
    "id": "model-gpt-5-5",
    "name": "GPT-5.5",
    "description": "Flagship multimodal and reasoning foundation model for Nebula-X professional-services agents, document intelligence, tool use, and structured outputs across audit, tax, risk, and advisory workflows.",
    "summary": "Flagship multimodal reasoning model",
    "type": "model",
    "category": "Models",
    "publisher": "OpenAI / Azure OpenAI",
    "publisherVerified": true,
    "version": "2026-06-15",
    "downloads": 10720,
    "rating": 4.9,
    "tags": [
      "Gpt 5.5",
      "Multimodal",
      "Reasoning",
      "Agentic Workflows"
    ],
    "pricing": "Pro",
    "icon": "Brain",
    "lastUpdated": "2026-06-24",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 126,
    "capabilities": [
      "Complex engagement reasoning",
      "Workpaper and memo drafting",
      "Financial document analysis",
      "Structured JSON output generation"
    ],
    "installCommand": "/nebula deploy model-gpt-5-5",
    "invocation": "/model-gpt-5-5",
    "uiHref": "/marketplace/models/model-gpt-5-5",
    "docsHref": "/docs/models/model-gpt-5-5"
  },
  {
    "id": "model-claude-sonnet-4-5",
    "name": "Claude Sonnet 4.5",
    "description": "Balanced frontier workhorse for long-context synthesis, professional drafting, regulatory analysis, and reliable tool-using Nebula-X workflows.",
    "summary": "Balanced long-context workhorse",
    "type": "model",
    "category": "Models",
    "publisher": "Anthropic | Deloitte Alliance",
    "publisherVerified": false,
    "version": "2026-05-30",
    "downloads": 6040,
    "rating": 4.8,
    "tags": [
      "Claude Sonnet 4.5",
      "Long Context",
      "Synthesis",
      "Report Generation"
    ],
    "pricing": "Enterprise",
    "icon": "Brain",
    "lastUpdated": "2026-06-18",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 122,
    "capabilities": [
      "Long-context workpaper synthesis",
      "Management letter drafting",
      "Strategy narrative generation",
      "Regulatory memo drafting"
    ],
    "installCommand": "/nebula deploy model-claude-sonnet-4-5",
    "invocation": "/model-claude-sonnet-4-5",
    "uiHref": "/marketplace/models/model-claude-sonnet-4-5",
    "docsHref": "/docs/models/model-claude-sonnet-4-5"
  },
  {
    "id": "model-claude-opus-4-8",
    "name": "Claude Opus 4.8",
    "description": "Deepest agentic reasoning model for complex diligence, legal-document review, contract clause comparison, and high-stakes advisory analysis.",
    "summary": "Deep agentic reasoning model",
    "type": "model",
    "category": "Models",
    "publisher": "Anthropic | Deloitte Alliance",
    "publisherVerified": false,
    "version": "2026-06-20",
    "downloads": 3760,
    "rating": 4.9,
    "tags": [
      "Claude Opus 4.8",
      "Deep Reasoning",
      "Legal",
      "Diligence"
    ],
    "pricing": "Enterprise",
    "icon": "Brain",
    "lastUpdated": "2026-06-25",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 118,
    "capabilities": [
      "Virtual data room summarization",
      "Contract covenant extraction",
      "Issue tracker generation",
      "Evidence comparison"
    ],
    "installCommand": "/nebula deploy model-claude-opus-4-8",
    "invocation": "/model-claude-opus-4-8",
    "uiHref": "/marketplace/models/model-claude-opus-4-8",
    "docsHref": "/docs/models/model-claude-opus-4-8"
  },
  {
    "id": "model-llama-4-maverick",
    "name": "Llama 4 Maverick",
    "description": "Open-weight foundation model deployable in private environments for confidential engagement workloads, controlled RAG, and cost-efficient professional-services assistants.",
    "summary": "Private open-weight foundation model",
    "type": "model",
    "category": "Models",
    "publisher": "Meta | Deloitte Alliance",
    "publisherVerified": false,
    "version": "4.0-2026-05",
    "downloads": 3320,
    "rating": 4.7,
    "tags": [
      "Llama 4",
      "Open Weights",
      "Private Deployment",
      "Rag"
    ],
    "pricing": "Pro",
    "icon": "Brain",
    "lastUpdated": "2026-06-12",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 114,
    "capabilities": [
      "Private professional-services assistants",
      "Controlled RAG retrieval",
      "Cost-efficient analysis",
      "On-premises prototyping"
    ],
    "installCommand": "/nebula deploy model-llama-4-maverick",
    "invocation": "/model-llama-4-maverick",
    "uiHref": "/marketplace/models/model-llama-4-maverick",
    "docsHref": "/docs/models/model-llama-4-maverick"
  },
  {
    "id": "model-gemini-3-1-pro",
    "name": "Gemini 3.1 Pro",
    "description": "Long-context multimodal model suited to large document sets, spreadsheets, presentations, video, and research-heavy consulting workflows.",
    "summary": "Long-context multimodal consulting model",
    "type": "model",
    "category": "Models",
    "publisher": "Google Cloud | Deloitte Alliance",
    "publisherVerified": false,
    "version": "3.1-2026-06",
    "downloads": 3200,
    "rating": 4.8,
    "tags": [
      "Gemini 3.1",
      "Long Context",
      "Multimodal",
      "Consulting"
    ],
    "pricing": "Enterprise",
    "icon": "Brain",
    "lastUpdated": "2026-06-19",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 110,
    "capabilities": [
      "Spreadsheet reasoning",
      "Market research synthesis",
      "Presentation analysis",
      "Operating-model research"
    ],
    "installCommand": "/nebula deploy model-gemini-3-1-pro",
    "invocation": "/model-gemini-3-1-pro",
    "uiHref": "/marketplace/models/model-gemini-3-1-pro",
    "docsHref": "/docs/models/model-gemini-3-1-pro"
  },
  {
    "id": "model-gpt-5-5-codex",
    "name": "GPT-5.5 Codex",
    "description": "Code and agentic automation model optimized for software modernization, workflow generation, test repair, and governed developer copilots.",
    "summary": "Code and automation specialist",
    "type": "model",
    "category": "Models",
    "publisher": "OpenAI",
    "publisherVerified": true,
    "version": "2026-06-10",
    "downloads": 4480,
    "rating": 4.8,
    "tags": [
      "Gpt 5.5 Codex",
      "Code",
      "Automation",
      "Agents"
    ],
    "pricing": "Pro",
    "icon": "Brain",
    "lastUpdated": "2026-06-22",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 106,
    "capabilities": [
      "Code generation and repair",
      "Workflow automation",
      "Test creation",
      "Developer agent orchestration"
    ],
    "installCommand": "/nebula deploy model-gpt-5-5-codex",
    "invocation": "/model-gpt-5-5-codex",
    "uiHref": "/marketplace/models/model-gpt-5-5-codex",
    "docsHref": "/docs/models/model-gpt-5-5-codex"
  },
  {
    "id": "model-claude-haiku-4-5",
    "name": "Claude Haiku 4.5",
    "description": "Fast, low-cost model for classification, extraction, routing, summarization, and high-volume professional-services automations.",
    "summary": "Fast low-cost classification model",
    "type": "model",
    "category": "Models",
    "publisher": "Anthropic | Deloitte Alliance",
    "publisherVerified": false,
    "version": "2026-05-28",
    "downloads": 3920,
    "rating": 4.7,
    "tags": [
      "Claude Haiku 4.5",
      "Fast",
      "Low Cost",
      "Classification"
    ],
    "pricing": "Starter",
    "icon": "Brain",
    "lastUpdated": "2026-06-14",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 102,
    "capabilities": [
      "Document triage",
      "Entity extraction",
      "Workflow routing",
      "High-volume summaries"
    ],
    "installCommand": "/nebula deploy model-claude-haiku-4-5",
    "invocation": "/model-claude-haiku-4-5",
    "uiHref": "/marketplace/models/model-claude-haiku-4-5",
    "docsHref": "/docs/models/model-claude-haiku-4-5"
  },
  {
    "id": "model-gemini-3-5-flash",
    "name": "Gemini 3.5 Flash",
    "description": "Fast multimodal model for document intake, visual extraction, meeting artifacts, and cost-sensitive consulting research flows.",
    "summary": "Fast multimodal intake model",
    "type": "model",
    "category": "Models",
    "publisher": "Google Cloud | Deloitte Alliance",
    "publisherVerified": false,
    "version": "3.5-2026-06",
    "downloads": 3200,
    "rating": 4.7,
    "tags": [
      "Gemini 3.5 Flash",
      "Fast",
      "Multimodal",
      "Document Intake"
    ],
    "pricing": "Starter",
    "icon": "Brain",
    "lastUpdated": "2026-06-17",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 98,
    "capabilities": [
      "Rapid document classification",
      "Visual extraction",
      "Meeting summary intake",
      "Low-latency research"
    ],
    "installCommand": "/nebula deploy model-gemini-3-5-flash",
    "invocation": "/model-gemini-3-5-flash",
    "uiHref": "/marketplace/models/model-gemini-3-5-flash",
    "docsHref": "/docs/models/model-gemini-3-5-flash"
  },
  {
    "id": "model-deepseek-r1",
    "name": "DeepSeek R1",
    "description": "Open reasoning model for explainable analytical chains, quantitative review, and private reasoning experiments under Deloitte governance.",
    "summary": "Open reasoning model",
    "type": "model",
    "category": "Models",
    "publisher": "DeepSeek",
    "publisherVerified": false,
    "version": "R1-2026-04",
    "downloads": 3200,
    "rating": 4.6,
    "tags": [
      "Deepseek R1",
      "Open Reasoning",
      "Quantitative",
      "Private Deployment"
    ],
    "pricing": "Pro",
    "icon": "Brain",
    "lastUpdated": "2026-06-08",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 94,
    "capabilities": [
      "Quantitative reasoning",
      "Calculation review",
      "Scenario analysis",
      "Explainable decision support"
    ],
    "installCommand": "/nebula deploy model-deepseek-r1",
    "invocation": "/model-deepseek-r1",
    "uiHref": "/marketplace/models/model-deepseek-r1",
    "docsHref": "/docs/models/model-deepseek-r1"
  },
  {
    "id": "model-grok-4",
    "name": "Grok 4",
    "description": "Real-time model for market signals, external-event monitoring, and advisory research where current public context is required.",
    "summary": "Real-time advisory research model",
    "type": "model",
    "category": "Models",
    "publisher": "xAI",
    "publisherVerified": false,
    "version": "4.0-2026-06",
    "downloads": 3200,
    "rating": 4.5,
    "tags": [
      "Grok 4",
      "Real Time",
      "Market Intelligence",
      "Research"
    ],
    "pricing": "Pro",
    "icon": "Brain",
    "lastUpdated": "2026-06-21",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 90,
    "capabilities": [
      "Market signal monitoring",
      "Current-event synthesis",
      "Competitive intelligence",
      "Advisory research"
    ],
    "installCommand": "/nebula deploy model-grok-4",
    "invocation": "/model-grok-4",
    "uiHref": "/marketplace/models/model-grok-4",
    "docsHref": "/docs/models/model-grok-4"
  },
  {
    "id": "model-mistral-large-3",
    "name": "Mistral Large 3",
    "description": "European and private-deployment foundation model for multilingual professional-services workflows, EU data residency, and regulated clients.",
    "summary": "European private foundation model",
    "type": "model",
    "category": "Models",
    "publisher": "Mistral",
    "publisherVerified": false,
    "version": "3.0-2026-05",
    "downloads": 3200,
    "rating": 4.6,
    "tags": [
      "Mistral Large 3",
      "European",
      "Multilingual",
      "Private Deployment"
    ],
    "pricing": "Enterprise",
    "icon": "Brain",
    "lastUpdated": "2026-06-11",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 86,
    "capabilities": [
      "EU-regulated client workflows",
      "Multilingual drafting",
      "Private RAG assistants",
      "Policy summarization"
    ],
    "installCommand": "/nebula deploy model-mistral-large-3",
    "invocation": "/model-mistral-large-3",
    "uiHref": "/marketplace/models/model-mistral-large-3",
    "docsHref": "/docs/models/model-mistral-large-3"
  },
  {
    "id": "model-gpt-5-mini",
    "name": "GPT-5 mini",
    "description": "Efficient general-purpose model for low-latency extraction, transformation, support agents, and cost-sensitive Nebula-X orchestration steps.",
    "summary": "Efficient low-latency model",
    "type": "model",
    "category": "Models",
    "publisher": "OpenAI / Azure OpenAI",
    "publisherVerified": true,
    "version": "2026-06-05",
    "downloads": 5040,
    "rating": 4.7,
    "tags": [
      "Gpt 5 Mini",
      "Efficient",
      "Low Latency",
      "Extraction"
    ],
    "pricing": "Starter",
    "icon": "Brain",
    "lastUpdated": "2026-06-16",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 82,
    "capabilities": [
      "Data extraction",
      "Transformation steps",
      "Support agents",
      "Batch enrichment"
    ],
    "installCommand": "/nebula deploy model-gpt-5-mini",
    "invocation": "/model-gpt-5-mini",
    "uiHref": "/marketplace/models/model-gpt-5-mini",
    "docsHref": "/docs/models/model-gpt-5-mini"
  },
  {
    "id": "model-openai-o4",
    "name": "OpenAI o4",
    "description": "Deep reasoning model for complex planning, mathematical analysis, multi-step evidence review, and high-stakes professional judgment support.",
    "summary": "Deep reasoning and planning model",
    "type": "model",
    "category": "Models",
    "publisher": "OpenAI",
    "publisherVerified": true,
    "version": "2026-06-12",
    "downloads": 3200,
    "rating": 4.8,
    "tags": [
      "Openai O4",
      "Deep Reasoning",
      "Planning",
      "Evidence Review"
    ],
    "pricing": "Enterprise",
    "icon": "Brain",
    "lastUpdated": "2026-06-23",
    "publishedDate": "2026-06-01",
    "orchestrationUsage": 78,
    "capabilities": [
      "Complex planning",
      "Mathematical review",
      "Evidence chain analysis",
      "Judgment support"
    ],
    "installCommand": "/nebula deploy model-openai-o4",
    "invocation": "/model-openai-o4",
    "uiHref": "/marketplace/models/model-openai-o4",
    "docsHref": "/docs/models/model-openai-o4"
  },
  {
    "id": "model-deloitte-audit-lm",
    "name": "Deloitte Audit LM",
    "description": "Deloitte fine-tuned audit language model rebased on Claude Sonnet 4.5 for workpapers, standards citations, risk observations, and exception narratives.",
    "summary": "Fine-tuned audit workpaper model",
    "type": "model",
    "category": "Models",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "version": "2.6.0",
    "downloads": 3200,
    "rating": 4.9,
    "tags": [
      "Deloitte Fine Tuned",
      "Audit",
      "Claude Sonnet 4.5",
      "Workpapers"
    ],
    "pricing": "Enterprise",
    "icon": "ShieldCheck",
    "lastUpdated": "2026-06-20",
    "publishedDate": "2025-06-01",
    "orchestrationUsage": 74,
    "capabilities": [
      "Audit observation drafting",
      "Standards citation support",
      "Exception narrative generation",
      "Review-note response drafting"
    ],
    "installCommand": "/nebula deploy model-deloitte-audit-lm",
    "invocation": "/model-deloitte-audit-lm",
    "uiHref": "/marketplace/models/model-deloitte-audit-lm",
    "docsHref": "/docs/models/model-deloitte-audit-lm"
  },
  {
    "id": "model-deloitte-tax-globe",
    "name": "Deloitte Tax GloBE Model",
    "description": "Deloitte tax model rebased on Llama 4 for OECD Pillar Two interpretation, top-up tax calculations, safe-harbor analysis, and tax memo drafting.",
    "summary": "Fine-tuned Pillar Two tax model",
    "type": "model",
    "category": "Models",
    "publisher": "Deloitte Tax",
    "publisherVerified": true,
    "version": "2.1.0",
    "downloads": 3200,
    "rating": 4.8,
    "tags": [
      "Deloitte Fine Tuned",
      "Tax",
      "Llama 4",
      "Globe"
    ],
    "pricing": "Pro",
    "icon": "ShieldCheck",
    "lastUpdated": "2026-06-18",
    "publishedDate": "2025-06-01",
    "orchestrationUsage": 70,
    "capabilities": [
      "GloBE rule interpretation",
      "Entity-level calculation support",
      "Tax memo drafting",
      "Safe-harbor scenario analysis"
    ],
    "installCommand": "/nebula deploy model-deloitte-tax-globe",
    "invocation": "/model-deloitte-tax-globe",
    "uiHref": "/marketplace/models/model-deloitte-tax-globe",
    "docsHref": "/docs/models/model-deloitte-tax-globe"
  },
  {
    "id": "model-deloitte-risk-regulatory-lm",
    "name": "Deloitte Risk Regulatory LM",
    "description": "Deloitte risk regulatory model rebased on GPT-5.5 for horizon scanning, regulatory classification, control mapping, and supervisory guidance analysis.",
    "summary": "Fine-tuned risk regulation model",
    "type": "model",
    "category": "Models",
    "publisher": "Deloitte Risk",
    "publisherVerified": true,
    "version": "2.3.0",
    "downloads": 3200,
    "rating": 4.8,
    "tags": [
      "Deloitte Fine Tuned",
      "Risk Advisory",
      "Gpt 5.5",
      "Basel Iv"
    ],
    "pricing": "Enterprise",
    "icon": "ShieldCheck",
    "lastUpdated": "2026-06-22",
    "publishedDate": "2025-06-01",
    "orchestrationUsage": 66,
    "capabilities": [
      "Regulatory impact assessment",
      "Control obligation mapping",
      "Policy comparison",
      "Supervisory guidance summarization"
    ],
    "installCommand": "/nebula deploy model-deloitte-risk-regulatory-lm",
    "invocation": "/model-deloitte-risk-regulatory-lm",
    "uiHref": "/marketplace/models/model-deloitte-risk-regulatory-lm",
    "docsHref": "/docs/models/model-deloitte-risk-regulatory-lm"
  },
  {
    "id": "model-deloitte-legal-doc-embeddings",
    "name": "Deloitte Legal-Doc Embeddings",
    "description": "Deloitte embedding model rebased on text-embedding-4-large for contracts, credit agreements, policies, and due-diligence archives.",
    "summary": "Embeddings for legal documents",
    "type": "model",
    "category": "Models",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "version": "4-large-2026",
    "downloads": 3200,
    "rating": 4.7,
    "tags": [
      "Embeddings",
      "Legal",
      "Text Embedding 4 Large",
      "Rag"
    ],
    "pricing": "Enterprise",
    "icon": "Database",
    "lastUpdated": "2026-06-14",
    "publishedDate": "2025-06-01",
    "orchestrationUsage": 62,
    "capabilities": [
      "Contract clause retrieval",
      "Covenant similarity search",
      "Diligence archive indexing",
      "Policy semantic search"
    ],
    "installCommand": "/nebula deploy model-deloitte-legal-doc-embeddings",
    "invocation": "/model-deloitte-legal-doc-embeddings",
    "uiHref": "/marketplace/models/model-deloitte-legal-doc-embeddings",
    "docsHref": "/docs/models/model-deloitte-legal-doc-embeddings"
  },
  {
    "id": "model-financial-statement-vision",
    "name": "Financial Statement Vision",
    "description": "Document vision model rebased on GPT-5.5 Vision for extracting tables, notes, and financial schedules from statements, filings, and diligence PDFs.",
    "summary": "Extracts financial statement tables",
    "type": "model",
    "category": "Models",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "version": "2.0.0",
    "downloads": 3200,
    "rating": 4.8,
    "tags": [
      "Document Ai",
      "Gpt 5.5 Vision",
      "Financial Statements",
      "Table Extraction"
    ],
    "pricing": "Pro",
    "icon": "FileSearch",
    "lastUpdated": "2026-06-17",
    "publishedDate": "2025-06-01",
    "orchestrationUsage": 58,
    "capabilities": [
      "Financial table extraction",
      "Footnote parsing",
      "Schedule normalization",
      "Evidence package preparation"
    ],
    "installCommand": "/nebula deploy model-financial-statement-vision",
    "invocation": "/model-financial-statement-vision",
    "uiHref": "/marketplace/models/model-financial-statement-vision",
    "docsHref": "/docs/models/model-financial-statement-vision"
  },
  {
    "id": "model-strategy-knowledge-embeddings",
    "name": "Strategy Knowledge Embeddings",
    "description": "Modern embeddings model for strategy libraries, market research, operating-model assets, benchmarks, and industry playbooks.",
    "summary": "Semantic search for consulting knowledge",
    "type": "model",
    "category": "Models",
    "publisher": "Deloitte Consulting",
    "publisherVerified": true,
    "version": "3.0.0",
    "downloads": 3200,
    "rating": 4.7,
    "tags": [
      "Embeddings",
      "Strategy",
      "Modern Embeddings",
      "Knowledge Search"
    ],
    "pricing": "Enterprise",
    "icon": "Database",
    "lastUpdated": "2026-06-13",
    "publishedDate": "2025-06-01",
    "orchestrationUsage": 54,
    "capabilities": [
      "Strategy asset retrieval",
      "Benchmark matching",
      "Framework discovery",
      "Market research clustering"
    ],
    "installCommand": "/nebula deploy model-strategy-knowledge-embeddings",
    "invocation": "/model-strategy-knowledge-embeddings",
    "uiHref": "/marketplace/models/model-strategy-knowledge-embeddings",
    "docsHref": "/docs/models/model-strategy-knowledge-embeddings"
  },
  {
    "id": "model-esg-disclosure-lm",
    "name": "ESG Disclosure LM",
    "description": "Deloitte ESG disclosure model rebased on Claude Sonnet 4.5 for CSRD, GRI, ISSB, and GHG Protocol drafting, evidence mapping, and assurance-readiness language.",
    "summary": "Fine-tuned sustainability disclosure model",
    "type": "model",
    "category": "Models",
    "publisher": "Deloitte ESG",
    "publisherVerified": true,
    "version": "2.0.0",
    "downloads": 3200,
    "rating": 4.8,
    "tags": [
      "Deloitte Fine Tuned",
      "Esg",
      "Claude Sonnet 4.5",
      "Ghg Protocol"
    ],
    "pricing": "Enterprise",
    "icon": "ShieldCheck",
    "lastUpdated": "2026-06-21",
    "publishedDate": "2025-06-01",
    "orchestrationUsage": 50,
    "capabilities": [
      "Disclosure drafting",
      "Evidence-to-standard mapping",
      "Materiality narrative generation",
      "Assurance-readiness review"
    ],
    "installCommand": "/nebula deploy model-esg-disclosure-lm",
    "invocation": "/model-esg-disclosure-lm",
    "uiHref": "/marketplace/models/model-esg-disclosure-lm",
    "docsHref": "/docs/models/model-esg-disclosure-lm"
  },
  {
    "id": "confirmationbot",
    "name": "ConfirmationBot",
    "description": "Automates third-party confirmation workflows for banks, receivables, and payables. Reconciles responses and escalates exceptions for auditor review.",
    "summary": "Automates third-party confirmations",
    "type": "workflow-template",
    "category": "Workflow Templates",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "version": "1.8.0",
    "downloads": 2740,
    "rating": 4.7,
    "tags": [
      "Audit",
      "Workflow Orchestration",
      "Human-in-the-Loop",
      "Audit Trail"
    ],
    "pricing": "Enterprise",
    "icon": "Workflow",
    "lastUpdated": "2026-03-08",
    "publishedDate": "2025-11-06",
    "orchestrationUsage": 48,
    "capabilities": [
      "Confirmation API connectors",
      "Email automation",
      "Response reconciliation",
      "Exception flagging",
      "Reviewer handoff"
    ],
    "installCommand": "/nebula deploy confirmationbot",
    "invocation": "/confirmationbot",
    "uiHref": "/marketplace/workflow-templates/confirmationbot",
    "docsHref": "/docs/workflow-templates/confirmationbot"
  },
  {
    "id": "provisioniq",
    "name": "ProvisionIQ",
    "description": "Automates ASC 740 and IAS 12 tax provision calculations with deferred tax rollforward. Connects source data, rate tables, and review outputs.",
    "summary": "Automates tax provision workflows",
    "type": "workflow-template",
    "category": "Workflow Templates",
    "publisher": "Deloitte Tax",
    "publisherVerified": true,
    "version": "2.0.2",
    "downloads": 3320,
    "rating": 4.8,
    "tags": [
      "Tax",
      "IFRS",
      "US GAAP",
      "Workflow Orchestration"
    ],
    "pricing": "Enterprise",
    "icon": "Workflow",
    "lastUpdated": "2026-04-14",
    "publishedDate": "2025-09-09",
    "orchestrationUsage": 56,
    "capabilities": [
      "ERP connectors",
      "Tax rate tables",
      "Deferred rollforward",
      "GAAP/IFRS reconciliation",
      "Review package assembly"
    ],
    "installCommand": "/nebula deploy provisioniq",
    "invocation": "/provisioniq",
    "uiHref": "/marketplace/workflow-templates/provisioniq",
    "docsHref": "/docs/workflow-templates/provisioniq"
  },
  {
    "id": "riskmatrix-builder",
    "name": "RiskMatrix Builder",
    "description": "Generates a structured enterprise risk register from strategy, risk, and policy documents. Produces heatmaps and workshop-ready summaries.",
    "summary": "Builds enterprise risk registers",
    "type": "workflow-template",
    "category": "Workflow Templates",
    "publisher": "Deloitte Risk",
    "publisherVerified": true,
    "version": "1.6.1",
    "downloads": 1990,
    "rating": 4.5,
    "tags": [
      "Risk Advisory",
      "Document Analysis",
      "Workflow Orchestration",
      "Report Generation"
    ],
    "pricing": "Pro",
    "icon": "Workflow",
    "lastUpdated": "2026-02-05",
    "publishedDate": "2025-12-01",
    "orchestrationUsage": 29,
    "capabilities": [
      "Document chunking",
      "Entity extraction",
      "Risk-category mapping",
      "Heatmap generation",
      "Workshop output synthesis"
    ],
    "installCommand": "/nebula deploy riskmatrix-builder",
    "invocation": "/riskmatrix-builder",
    "uiHref": "/marketplace/workflow-templates/riskmatrix-builder",
    "docsHref": "/docs/workflow-templates/riskmatrix-builder"
  },
  {
    "id": "synergymodeler",
    "name": "SynergyModeler",
    "description": "Captures synergy assumptions, builds bottoms-up synergy models, validates assumptions against precedent transactions, and outputs board-ready exhibits.",
    "summary": "Builds M&A synergy models",
    "type": "workflow-template",
    "category": "Workflow Templates",
    "publisher": "Deloitte Deals",
    "publisherVerified": true,
    "version": "2.2.4",
    "downloads": 3090,
    "rating": 4.8,
    "tags": [
      "Deal Advisory",
      "Financial Modeling",
      "Workflow Orchestration",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "GitMerge",
    "lastUpdated": "2026-05-02",
    "publishedDate": "2025-08-16",
    "orchestrationUsage": 65,
    "capabilities": [
      "Assumption capture",
      "Financial model assembly",
      "Precedent benchmarking",
      "Sensitivity analysis",
      "Executive exhibit generation"
    ],
    "installCommand": "/nebula deploy synergymodeler",
    "invocation": "/synergymodeler",
    "uiHref": "/marketplace/workflow-templates/synergymodeler",
    "docsHref": "/docs/workflow-templates/synergymodeler"
  },
  {
    "id": "fpa-copilot",
    "name": "FP&A Copilot",
    "description": "Accelerates close and rolling forecast processes by computing variances, identifying drivers, and assembling CFO management materials.",
    "summary": "Automates FP&A variance commentary",
    "type": "workflow-template",
    "category": "Workflow Templates",
    "publisher": "Deloitte Financial Advisory",
    "publisherVerified": true,
    "version": "2.5.0",
    "downloads": 5470,
    "rating": 4.8,
    "tags": [
      "Financial Advisory",
      "Financial Modeling",
      "Report Generation",
      "Workflow Orchestration"
    ],
    "pricing": "Enterprise",
    "icon": "Workflow",
    "lastUpdated": "2026-04-25",
    "publishedDate": "2025-07-26",
    "orchestrationUsage": 89,
    "capabilities": [
      "ERP/EPM connectors",
      "Variance calculation",
      "Driver analysis",
      "Narrative generation",
      "Management pack assembly"
    ],
    "installCommand": "/nebula deploy fpa-copilot",
    "invocation": "/fpa-copilot",
    "uiHref": "/marketplace/workflow-templates/fpa-copilot",
    "docsHref": "/docs/workflow-templates/fpa-copilot"
  },
  {
    "id": "multi-agent-orchestration-framework",
    "name": "Multi-Agent Orchestration Framework",
    "description": "Pre-configured supervisor-agent scaffold for routing tasks, managing context, enforcing review checkpoints, logging decisions, and aggregating results.",
    "summary": "Governed multi-agent orchestration scaffold",
    "type": "workflow-template",
    "category": "Workflow Templates",
    "publisher": "Deloitte Consulting",
    "publisherVerified": true,
    "version": "3.0.0",
    "downloads": 7680,
    "rating": 4.9,
    "tags": [
      "Multi-Agent",
      "Workflow Orchestration",
      "Human-in-the-Loop",
      "Audit Trail",
      "Trustworthy AI Certified"
    ],
    "pricing": "Enterprise",
    "icon": "Boxes",
    "lastUpdated": "2026-06-18",
    "publishedDate": "2025-06-30",
    "orchestrationUsage": 120,
    "capabilities": [
      "Agent registry",
      "Task routing logic",
      "Context persistence",
      "Human escalation triggers",
      "Audit logging",
      "Failure handling"
    ],
    "installCommand": "/nebula deploy multi-agent-orchestration-framework",
    "invocation": "/multi-agent-orchestration-framework",
    "uiHref": "/marketplace/workflow-templates/multi-agent-orchestration-framework",
    "docsHref": "/docs/workflow-templates/multi-agent-orchestration-framework"
  },
  {
    "id": "going-concern-analyzer-space",
    "name": "Going Concern Analyzer Space",
    "description": "Governed demo space for exploring going-concern analysis with synthetic financial statements and covenant scenarios. Demonstrates human-review controls and audit trail capture.",
    "summary": "Interactive going-concern analysis sandbox",
    "type": "space",
    "category": "Audit & Assurance",
    "publisher": "Deloitte Audit",
    "publisherVerified": true,
    "version": "1.2.0",
    "downloads": 640,
    "rating": 4.8,
    "tags": [
      "Audit",
      "Financial Modeling",
      "Human Review Required",
      "Trustworthy AI Certified"
    ],
    "pricing": "Enterprise",
    "icon": "Bot",
    "lastUpdated": "2026-05-20",
    "publishedDate": "2026-01-17",
    "orchestrationUsage": 22,
    "capabilities": [
      "Scenario prompts",
      "Financial ratio review",
      "Disclosure memo drafting",
      "Review checkpoint",
      "Sandbox reuse"
    ],
    "installCommand": "/nebula deploy going-concern-analyzer-space",
    "invocation": "/going-concern-analyzer-space",
    "uiHref": "/marketplace/spaces/going-concern-analyzer-space",
    "docsHref": "/docs/spaces/going-concern-analyzer-space"
  },
  {
    "id": "ma-diligence-copilot-space",
    "name": "M&A Diligence Copilot Space",
    "description": "Governed diligence demo space for summarizing synthetic data room materials, extracting issues, and drafting buyer-oriented risk summaries.",
    "summary": "Interactive M&A diligence sandbox",
    "type": "space",
    "category": "Deal Advisory & M&A",
    "publisher": "Deloitte Deals",
    "publisherVerified": true,
    "version": "1.1.0",
    "downloads": 520,
    "rating": 4.7,
    "tags": [
      "Deal Advisory",
      "Document Analysis",
      "Confidential-Engagement-Ready",
      "Human Review Required"
    ],
    "pricing": "Enterprise",
    "icon": "Bot",
    "lastUpdated": "2026-05-23",
    "publishedDate": "2026-02-02",
    "orchestrationUsage": 18,
    "capabilities": [
      "Data room Q&A",
      "Issue tracker drafting",
      "Risk summary generation",
      "Citation review",
      "Sandbox reuse"
    ],
    "installCommand": "/nebula deploy ma-diligence-copilot-space",
    "invocation": "/ma-diligence-copilot-space",
    "uiHref": "/marketplace/spaces/ma-diligence-copilot-space",
    "docsHref": "/docs/spaces/ma-diligence-copilot-space"
  }
]

export const spaces: SpaceDemo[] = [
  {
    "id": "going-concern-analyzer",
    "assetId": "going-concern-analyzer-space",
    "name": "Going Concern Analyzer Space",
    "description": "A governed demo space for evaluating liquidity indicators, covenant headroom, and disclosure considerations using synthetic financial statement scenarios.",
    "publisher": "Deloitte Audit",
    "sourceSandbox": "Audit-Going-Concern-Sandbox",
    "snapshotVersion": "snapshot-v1.2.0",
    "snapshotHash": "sha256:a91d4c0e7b6f4a2c",
    "visibility": "Team",
    "runtimeState": "live",
    "runCount": 142,
    "likeCount": 37,
    "dailyTokenBudget": 300000,
    "usedTokens": 121500,
    "model": "Deloitte Audit LM",
    "dataRefs": [
      "synthetic_financials@8",
      "covenant_scenarios@3",
      "assurance_templates@5"
    ],
    "guardrails": [
      "Trustworthy AI review checkpoint required",
      "Synthetic engagement data only",
      "Independence-sensitive prompts logged",
      "Reviewer approval required before memo export"
    ],
    "examplePrompts": [
      "Assess going concern risk for a company with tightening liquidity and a covenant reset due next quarter.",
      "Draft a reviewer-ready memo outline for management assessment evidence and disclosure considerations.",
      "Identify additional audit procedures for a downside cash-flow scenario."
    ],
    "seededSandboxName": "Going Concern Analyzer - Reuse Draft",
    "updatedAt": "2026-05-20T16:30:00Z"
  },
  {
    "id": "ma-diligence-copilot",
    "assetId": "ma-diligence-copilot-space",
    "name": "M&A Diligence Copilot Space",
    "description": "A governed diligence space for exploring synthetic data room summaries, contract issue extraction, and buyer-focused risk narratives.",
    "publisher": "Deloitte Deals",
    "sourceSandbox": "Deals-Diligence-Copilot-Sandbox",
    "snapshotVersion": "snapshot-v1.1.0",
    "snapshotHash": "sha256:b7e1a5c83f0d42aa",
    "visibility": "Org",
    "runtimeState": "live",
    "runCount": 96,
    "likeCount": 28,
    "dailyTokenBudget": 350000,
    "usedTokens": 172200,
    "model": "Claude Opus 4.8",
    "dataRefs": [
      "synthetic_vdr@11",
      "contract_patterns@6",
      "deal_issue_taxonomy@4"
    ],
    "guardrails": [
      "Confidential-engagement mode",
      "Citations required for every extracted issue",
      "Human review before export",
      "No external connector calls in demo mode"
    ],
    "examplePrompts": [
      "Summarize the top commercial and operational issues in this synthetic data room.",
      "Extract covenant and change-of-control provisions from the sample credit agreement.",
      "Create an executive diligence tracker grouped by severity and workstream."
    ],
    "seededSandboxName": "M&A Diligence Copilot - Reuse Draft",
    "updatedAt": "2026-05-23T18:15:00Z"
  }
]

export const sampleWorkflows: Workflow[] = [
  {
    "id": "wf-ma-diligence-pipeline",
    "name": "M&A Due Diligence Pipeline",
    "description": "Multi-agent diligence flow that ingests data room materials, extracts issues, performs regulatory checks, models synergies, and routes outputs through human approval.",
    "nodes": [
      {
        "id": "trigger-1",
        "type": "trigger",
        "position": {
          "x": 80,
          "y": 220
        },
        "data": {
          "label": "Data room ready",
          "description": "New diligence package available",
          "icon": "Database",
          "config": {
            "triggerType": "event",
            "inputSchema": "dataRoomId, dealProfile, workstreams"
          }
        }
      },
      {
        "id": "agent-ddvault",
        "type": "agent",
        "position": {
          "x": 300,
          "y": 120
        },
        "data": {
          "label": "DDVault Analyst",
          "description": "Summarizes documents and flags issues",
          "icon": "FileSearch",
          "config": {
            "agentId": "ddvault-analyst",
            "modelId": "model-claude-opus-4-8",
            "selectedToolIds": [
              "clm-reviewer"
            ],
            "temperature": 0.2,
            "maxTokens": 6000
          }
        }
      },
      {
        "id": "agent-reg",
        "type": "agent",
        "position": {
          "x": 300,
          "y": 320
        },
        "data": {
          "label": "Regulatory Checkpoint",
          "description": "Maps approval requirements",
          "icon": "Gavel",
          "config": {
            "agentId": "ma-regulatory-checkpoint",
            "modelId": "model-gpt-5-5",
            "selectedToolIds": [
              "dora-basel-iv-compliance-mcp"
            ],
            "temperature": 0.1,
            "maxTokens": 4000
          }
        }
      },
      {
        "id": "fan-in-1",
        "type": "fan-in",
        "position": {
          "x": 540,
          "y": 220
        },
        "data": {
          "label": "Consolidate findings",
          "description": "Merge issue and approval workstreams",
          "icon": "GitMerge",
          "config": {
            "joinStrategy": "all",
            "joinTimeout": 45
          }
        }
      },
      {
        "id": "tool-synergy",
        "type": "tool",
        "position": {
          "x": 760,
          "y": 220
        },
        "data": {
          "label": "SynergyModeler",
          "description": "Builds synergy case sensitivities",
          "icon": "LineChart",
          "config": {
            "toolId": "synergymodeler",
            "params": {
              "scenario": "base-downside-upside",
              "currency": "USD"
            }
          }
        }
      },
      {
        "id": "approval-1",
        "type": "approval",
        "position": {
          "x": 980,
          "y": 220
        },
        "data": {
          "label": "Partner review",
          "description": "Human review before client export",
          "icon": "ShieldCheck",
          "config": {
            "approvalMessage": "Review diligence summary, regulatory roadmap, and synergy model before release.",
            "timeoutMinutes": 1440,
            "approverRole": "Engagement Partner",
            "onReject": "retry"
          }
        }
      },
      {
        "id": "output-1",
        "type": "output",
        "position": {
          "x": 1200,
          "y": 220
        },
        "data": {
          "label": "Diligence pack",
          "description": "Approved tracker and executive summary",
          "icon": "FileText",
          "config": {
            "endOutputFormat": "markdown",
            "successMessage": "Diligence package approved and logged."
          }
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "trigger-1",
        "target": "agent-ddvault",
        "edgeType": "fan"
      },
      {
        "id": "e2",
        "source": "trigger-1",
        "target": "agent-reg",
        "edgeType": "fan"
      },
      {
        "id": "e3",
        "source": "agent-ddvault",
        "target": "fan-in-1"
      },
      {
        "id": "e4",
        "source": "agent-reg",
        "target": "fan-in-1"
      },
      {
        "id": "e5",
        "source": "fan-in-1",
        "target": "tool-synergy"
      },
      {
        "id": "e6",
        "source": "tool-synergy",
        "target": "approval-1"
      },
      {
        "id": "e7",
        "source": "approval-1",
        "target": "output-1"
      }
    ],
    "status": "deployed",
    "createdAt": "2026-03-01",
    "updatedAt": "2026-05-23"
  }
]

export const categories = [
  "All Categories",
  "Audit & Assurance",
  "Tax & Compliance",
  "Risk & Regulatory",
  "Deal Advisory & M&A",
  "Financial Advisory",
  "Strategy & Consulting",
  "Cyber & Privacy",
  "ESG & Sustainability",
  "Industry Solutions",
  "MCP Servers",
  "Workflow Templates",
  "Models"
] as const
