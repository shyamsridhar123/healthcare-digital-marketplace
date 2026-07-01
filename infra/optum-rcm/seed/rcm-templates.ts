/**
 * Nebula-X by Deloitte — Professional Services Workflow Templates
 *
 * Loads four professional-services orchestration templates into Cosmos DB via
 * `cosmos-seed.ts`. The exported objects preserve the OrchestrationTemplate
 * shape used by the orchestration template API.
 */

import type { OrchestrationTemplate } from "../../../apps/web/src/lib/types.js";

const TENANT = "optum-rcm-prod";
const now = new Date().toISOString();

// ─── 1. M&A Due Diligence Pipeline ───────────────────────────────────────────

export const maDueDiligencePipeline: Omit<OrchestrationTemplate, "id"> = {
  name: "M&A Due Diligence Pipeline",
  description:
    "Nebula-X diligence workflow that ingests a data room, runs financial, legal, and tax specialist reviews in parallel, consolidates risk findings, and routes the final report for partner approval.",
  category: "Deals",
  version: "1.0.0",
  tags: ["m-and-a", "due-diligence", "data-room", "deals", "risk", "nebula-x"],
  visibility: "shared",
  tenantId: TENANT,
  usageCount: 0,
  defaultPolicyIds: ["policy-confidential-client-data", "policy-human-gate", "policy-rate-limit"],
  parameters: [
    { name: "engagementId", type: "string", required: true, description: "Deloitte engagement identifier" },
    { name: "dataRoomId", type: "string", required: true, description: "Virtual data room or document collection identifier" },
    { name: "targetCompany", type: "string", required: true, description: "Target company legal name" },
    { name: "dealType", type: "string", required: false, description: "Buy-side, sell-side, carve-out, or merger" },
    { name: "partnerApprover", type: "string", required: true, description: "Partner or managing director approver" },
  ],
  nodes: [
    {
      id: "ma-start",
      type: "start",
      position: { x: 40, y: 260 },
      data: {
        label: "Diligence Request",
        description: "Engagement team submits target and data room details",
        config: { triggerType: "http" },
      },
    },
    {
      id: "ma-ingest-tool",
      type: "tool",
      position: { x: 240, y: 260 },
      data: {
        label: "Ingest Data Room",
        description: "Indexes CIM, financials, contracts, tax workpapers, and management uploads",
        config: { toolId: "ingest_data_room", serverId: "nebula-document-hub" },
      },
    },
    {
      id: "ma-fanout",
      type: "fan-out",
      position: { x: 460, y: 260 },
      data: {
        label: "Specialist Review",
        description: "Launch financial, legal, and tax diligence workstreams concurrently",
        config: { branches: 3, fanOutStrategy: "parallel" },
      },
    },
    {
      id: "ma-financial-agent",
      type: "agent",
      position: { x: 700, y: 80 },
      data: {
        label: "DDVault Financial Analyst",
        description: "Analyzes quality of earnings, revenue trends, debt-like items, and working capital",
        config: {
          agentId: "DDVault Analyst",
          systemPrompt:
            "Review the ingested data room for financial diligence. Summarize quality of earnings, recurring revenue, debt-like items, normalized EBITDA, working-capital considerations, and open questions with source citations.",
          tools: ["query_data_room", "analyze_financial_statements", "extract_management_adjustments"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "ma-legal-agent",
      type: "agent",
      position: { x: 700, y: 260 },
      data: {
        label: "DDVault Legal Analyst",
        description: "Reviews contracts, change-of-control clauses, litigation, and compliance obligations",
        config: {
          agentId: "DDVault Analyst",
          systemPrompt:
            "Review material legal documents for diligence. Identify consent requirements, change-of-control provisions, termination rights, litigation exposure, regulatory obligations, and unresolved legal risks.",
          tools: ["query_data_room", "extract_contract_terms", "summarize_legal_risks"],
          modelId: "gpt-5.5",
        },
      },
    },
    {
      id: "ma-tax-agent",
      type: "agent",
      position: { x: 700, y: 440 },
      data: {
        label: "TaxArchitect Diligence Review",
        description: "Assesses tax exposures, NOLs, transfer pricing, sales tax, and transaction structuring issues",
        config: {
          agentId: "TaxArchitect",
          systemPrompt:
            "Assess tax diligence materials for exposure areas, NOL limitations, transfer-pricing risks, sales and use tax issues, transaction structuring considerations, and priority follow-ups.",
          tools: ["query_data_room", "analyze_tax_workpapers", "lookup_tax_rules"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "ma-fanin",
      type: "fan-in",
      position: { x: 960, y: 260 },
      data: {
        label: "Consolidate Workstreams",
        description: "Combines specialist outputs into a unified diligence view",
        config: { joinStrategy: "all", joinTimeout: 600 },
      },
    },
    {
      id: "ma-risk-summary",
      type: "transform",
      position: { x: 1180, y: 260 },
      data: {
        label: "Risk Summary",
        description: "Normalizes findings into executive risk heatmap and report outline",
        config: {
          transformType: "llm-summary",
          outputSchema: "deal_diligence_risk_summary",
          modelId: "gpt-5.5",
        },
      },
    },
    {
      id: "ma-partner-approval",
      type: "approval",
      position: { x: 1400, y: 260 },
      data: {
        label: "Partner Approval",
        description: "Engagement partner approves release of the diligence report",
        config: {
          approvalMessage: "Review the consolidated diligence risk summary and approve report generation.",
          approverRole: "deals-partner",
          timeoutMinutes: 1440,
          onReject: "abort",
        },
      },
    },
    {
      id: "ma-report-agent",
      type: "agent",
      position: { x: 1620, y: 260 },
      data: {
        label: "DDVault Report Builder",
        description: "Drafts client-ready diligence report and executive summary",
        config: {
          agentId: "DDVault Analyst",
          systemPrompt:
            "Draft a client-ready diligence report with executive summary, workstream findings, risk heatmap, financial impacts, recommendations, and appendices from the approved risk summary.",
          tools: ["generate_report", "create_executive_summary"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "ma-end",
      type: "end",
      position: { x: 1840, y: 260 },
      data: {
        label: "Report Ready",
        description: "Approved diligence report is ready for engagement team distribution",
        config: { successMessage: "M&A due diligence report generated and approved." },
      },
    },
  ],
  edges: [
    { id: "mae1", source: "ma-start", target: "ma-ingest-tool" },
    { id: "mae2", source: "ma-ingest-tool", target: "ma-fanout" },
    { id: "mae3", source: "ma-fanout", target: "ma-financial-agent", label: "Financial", data: { edgeType: "fan" } },
    { id: "mae4", source: "ma-fanout", target: "ma-legal-agent", label: "Legal", data: { edgeType: "fan" } },
    { id: "mae5", source: "ma-fanout", target: "ma-tax-agent", label: "Tax", data: { edgeType: "fan" } },
    { id: "mae6", source: "ma-financial-agent", target: "ma-fanin", data: { edgeType: "fan" } },
    { id: "mae7", source: "ma-legal-agent", target: "ma-fanin", data: { edgeType: "fan" } },
    { id: "mae8", source: "ma-tax-agent", target: "ma-fanin", data: { edgeType: "fan" } },
    { id: "mae9", source: "ma-fanin", target: "ma-risk-summary" },
    { id: "mae10", source: "ma-risk-summary", target: "ma-partner-approval" },
    { id: "mae11", source: "ma-partner-approval", target: "ma-report-agent", label: "approved" },
    { id: "mae12", source: "ma-report-agent", target: "ma-end" },
  ],
  createdAt: now,
  updatedAt: now,
};

// ─── 2. SOX Controls Testing ─────────────────────────────────────────────────

export const soxControlsTesting: Omit<OrchestrationTemplate, "id"> = {
  name: "SOX Controls Testing",
  description:
    "Nebula-X audit workflow for pulling ERP populations, selecting samples, testing key controls, routing exceptions, and preparing SOX findings for approval.",
  category: "Audit",
  version: "1.0.0",
  tags: ["sox", "controls", "audit", "erp", "sampling", "nebula-x"],
  visibility: "shared",
  tenantId: TENANT,
  usageCount: 0,
  defaultPolicyIds: ["policy-confidential-client-data", "policy-human-gate", "policy-audit-evidence"],
  parameters: [
    { name: "engagementId", type: "string", required: true, description: "SOX engagement identifier" },
    { name: "controlId", type: "string", required: true, description: "Control or process-level control identifier" },
    { name: "erpSystem", type: "string", required: true, description: "Source ERP, such as SAP or Oracle" },
    { name: "periodStart", type: "string", required: true, description: "Population period start date" },
    { name: "periodEnd", type: "string", required: true, description: "Population period end date" },
  ],
  nodes: [
    {
      id: "sox-start",
      type: "start",
      position: { x: 40, y: 260 },
      data: {
        label: "Control Test Request",
        description: "Audit team initiates testing for a SOX control",
        config: { triggerType: "http" },
      },
    },
    {
      id: "sox-population-tool",
      type: "tool",
      position: { x: 260, y: 260 },
      data: {
        label: "Pull ERP Population",
        description: "Extracts complete transaction or control-operation population",
        config: { toolId: "pull_erp_population", serverId: "ledger-gateway" },
      },
    },
    {
      id: "sox-sampling-tool",
      type: "tool",
      position: { x: 500, y: 260 },
      data: {
        label: "Select Sample",
        description: "Applies approved sampling methodology and retains population completeness evidence",
        config: { toolId: "select_audit_sample", serverId: "audit-workbench" },
      },
    },
    {
      id: "sox-test-agent",
      type: "agent",
      position: { x: 740, y: 260 },
      data: {
        label: "ControlTester",
        description: "Tests control attributes and evidence for selected items",
        config: {
          agentId: "ControlTester",
          systemPrompt:
            "Test the selected sample against the control attributes. Evaluate evidence sufficiency, prepare pass/fail conclusions, identify exceptions, and cite the underlying ERP and workpaper evidence.",
          tools: ["retrieve_audit_evidence", "test_control_attribute", "document_workpaper"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "sox-condition",
      type: "condition",
      position: { x: 980, y: 260 },
      data: {
        label: "Exceptions Found?",
        description: "Routes based on testing results",
        config: {
          conditionExpression: "output.exceptionsCount > 0",
          trueBranchLabel: "Exception Review",
          falseBranchLabel: "No Exceptions",
        },
      },
    },
    {
      id: "sox-exception-agent",
      type: "agent",
      position: { x: 1220, y: 380 },
      data: {
        label: "LedgerSentinel Exception Review",
        description: "Assesses severity, root cause, and potential deficiency classification",
        config: {
          agentId: "LedgerSentinel",
          systemPrompt:
            "Review SOX testing exceptions. Determine root cause, financial statement assertion impact, deficiency severity, remediation recommendations, and whether additional procedures are required.",
          tools: ["analyze_control_exception", "lookup_materiality", "draft_remediation_plan"],
          modelId: "gpt-5.5",
        },
      },
    },
    {
      id: "sox-findings-transform",
      type: "transform",
      position: { x: 1460, y: 260 },
      data: {
        label: "Prepare Findings",
        description: "Formats testing conclusion and exceptions for review",
        config: {
          transformType: "workpaper-summary",
          outputSchema: "sox_control_testing_findings",
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "sox-approval",
      type: "approval",
      position: { x: 1700, y: 260 },
      data: {
        label: "Manager Approval",
        description: "SOX manager reviews workpaper and findings",
        config: {
          approvalMessage: "Review SOX control testing workpaper, exceptions, and findings before release.",
          approverRole: "audit-manager",
          timeoutMinutes: 1440,
          onReject: "abort",
        },
      },
    },
    {
      id: "sox-end",
      type: "end",
      position: { x: 1940, y: 260 },
      data: {
        label: "Findings Finalized",
        description: "Approved SOX testing package is ready for sign-off workflow",
        config: { successMessage: "SOX controls testing findings finalized." },
      },
    },
  ],
  edges: [
    { id: "soxe1", source: "sox-start", target: "sox-population-tool" },
    { id: "soxe2", source: "sox-population-tool", target: "sox-sampling-tool" },
    { id: "soxe3", source: "sox-sampling-tool", target: "sox-test-agent" },
    { id: "soxe4", source: "sox-test-agent", target: "sox-condition" },
    { id: "soxe5", source: "sox-condition", target: "sox-exception-agent", label: "Exception Review", data: { edgeType: "true" } },
    { id: "soxe6", source: "sox-condition", target: "sox-findings-transform", label: "No Exceptions", data: { edgeType: "false" } },
    { id: "soxe7", source: "sox-exception-agent", target: "sox-findings-transform" },
    { id: "soxe8", source: "sox-findings-transform", target: "sox-approval" },
    { id: "soxe9", source: "sox-approval", target: "sox-end", label: "approved" },
  ],
  createdAt: now,
  updatedAt: now,
};

// ─── 3. Tax Provision (ASC 740) Workflow ─────────────────────────────────────

export const taxProvisionAsc740Workflow: Omit<OrchestrationTemplate, "id"> = {
  name: "Tax Provision (ASC 740) Workflow",
  description:
    "Nebula-X tax workflow that gathers trial balance data, computes current and deferred tax provision components, validates results, routes reviewer approval, and drafts disclosure language.",
  category: "Tax",
  version: "1.0.0",
  tags: ["asc-740", "tax-provision", "trial-balance", "deferred-tax", "disclosure", "nebula-x"],
  visibility: "shared",
  tenantId: TENANT,
  usageCount: 0,
  defaultPolicyIds: ["policy-confidential-client-data", "policy-human-gate", "policy-tax-compliance"],
  parameters: [
    { name: "engagementId", type: "string", required: true, description: "Tax engagement identifier" },
    { name: "entityId", type: "string", required: true, description: "Legal entity or consolidated group identifier" },
    { name: "fiscalYear", type: "string", required: true, description: "Fiscal year under provision" },
    { name: "jurisdictions", type: "string", required: false, description: "Comma-separated jurisdiction list" },
  ],
  nodes: [
    {
      id: "tax-start",
      type: "start",
      position: { x: 40, y: 260 },
      data: {
        label: "Provision Request",
        description: "Tax team starts ASC 740 provision workflow",
        config: { triggerType: "http" },
      },
    },
    {
      id: "tax-tb-tool",
      type: "tool",
      position: { x: 260, y: 260 },
      data: {
        label: "Gather Trial Balance",
        description: "Loads trial balance, book income, permanent differences, and rollforward data",
        config: { toolId: "gather_trial_balance", serverId: "tax-data-hub" },
      },
    },
    {
      id: "tax-fanout",
      type: "fan-out",
      position: { x: 500, y: 260 },
      data: {
        label: "Provision Calculations",
        description: "Computes current and deferred tax components concurrently",
        config: { branches: 2, fanOutStrategy: "parallel" },
      },
    },
    {
      id: "tax-current-agent",
      type: "agent",
      position: { x: 740, y: 140 },
      data: {
        label: "TaxArchitect Current Tax",
        description: "Calculates current tax by jurisdiction from taxable income adjustments",
        config: {
          agentId: "TaxArchitect",
          systemPrompt:
            "Compute current tax provision by jurisdiction. Reconcile book-to-tax adjustments, permanent differences, credits, statutory rates, and payable impacts with supporting calculations.",
          tools: ["compute_current_tax", "lookup_tax_rates", "reconcile_book_tax_differences"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "tax-deferred-agent",
      type: "agent",
      position: { x: 740, y: 380 },
      data: {
        label: "TaxArchitect Deferred Tax",
        description: "Computes DTAs, DTLs, valuation allowance, and rate effects",
        config: {
          agentId: "TaxArchitect",
          systemPrompt:
            "Compute deferred tax assets and liabilities under ASC 740. Analyze temporary differences, rate changes, valuation allowance indicators, uncertain tax positions, and rollforward impacts.",
          tools: ["compute_deferred_tax", "analyze_temporary_differences", "evaluate_valuation_allowance"],
          modelId: "gpt-5.5",
        },
      },
    },
    {
      id: "tax-fanin",
      type: "fan-in",
      position: { x: 980, y: 260 },
      data: {
        label: "Merge Provision Components",
        description: "Combines current and deferred outputs into provision package",
        config: { joinStrategy: "all", joinTimeout: 300 },
      },
    },
    {
      id: "tax-validate-agent",
      type: "agent",
      position: { x: 1220, y: 260 },
      data: {
        label: "LedgerSentinel Validation",
        description: "Validates provision calculations, reconciliations, and audit trail",
        config: {
          agentId: "LedgerSentinel",
          systemPrompt:
            "Validate the ASC 740 provision package. Check tie-outs to trial balance, rate reconciliation, current/deferred math, disclosure consistency, and anomalies requiring reviewer attention.",
          tools: ["validate_tax_provision", "tie_out_trial_balance", "check_rate_reconciliation"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "tax-approval",
      type: "approval",
      position: { x: 1460, y: 260 },
      data: {
        label: "Reviewer Approval",
        description: "Tax reviewer approves the provision package before disclosure drafting",
        config: {
          approvalMessage: "Review ASC 740 provision calculations, validations, and exceptions before disclosure drafting.",
          approverRole: "tax-reviewer",
          timeoutMinutes: 1440,
          onReject: "abort",
        },
      },
    },
    {
      id: "tax-disclosure-agent",
      type: "agent",
      position: { x: 1700, y: 260 },
      data: {
        label: "AuditScribe Disclosure Draft",
        description: "Drafts ASC 740 footnote disclosure and reviewer notes",
        config: {
          agentId: "AuditScribe",
          systemPrompt:
            "Draft ASC 740 disclosure language from the approved provision package, including effective tax rate reconciliation, deferred tax table narrative, valuation allowance discussion, and reviewer notes.",
          tools: ["draft_disclosure", "format_financial_statement_note"],
          modelId: "gpt-5.5",
        },
      },
    },
    {
      id: "tax-end",
      type: "end",
      position: { x: 1940, y: 260 },
      data: {
        label: "Disclosure Draft Ready",
        description: "Approved provision package and disclosure draft are ready",
        config: { successMessage: "ASC 740 tax provision workflow complete." },
      },
    },
  ],
  edges: [
    { id: "taxe1", source: "tax-start", target: "tax-tb-tool" },
    { id: "taxe2", source: "tax-tb-tool", target: "tax-fanout" },
    { id: "taxe3", source: "tax-fanout", target: "tax-current-agent", label: "Current", data: { edgeType: "fan" } },
    { id: "taxe4", source: "tax-fanout", target: "tax-deferred-agent", label: "Deferred", data: { edgeType: "fan" } },
    { id: "taxe5", source: "tax-current-agent", target: "tax-fanin", data: { edgeType: "fan" } },
    { id: "taxe6", source: "tax-deferred-agent", target: "tax-fanin", data: { edgeType: "fan" } },
    { id: "taxe7", source: "tax-fanin", target: "tax-validate-agent" },
    { id: "taxe8", source: "tax-validate-agent", target: "tax-approval" },
    { id: "taxe9", source: "tax-approval", target: "tax-disclosure-agent", label: "approved" },
    { id: "taxe10", source: "tax-disclosure-agent", target: "tax-end" },
  ],
  createdAt: now,
  updatedAt: now,
};

// ─── 4. Audit Confirmations Workflow ─────────────────────────────────────────

export const auditConfirmationsWorkflow: Omit<OrchestrationTemplate, "id"> = {
  name: "Audit Confirmations Workflow",
  description:
    "Nebula-X audit workflow that identifies confirmation targets, dispatches requests, tracks responses, reconciles exceptions, and prepares a confirmation workpaper.",
  category: "Audit",
  version: "1.0.0",
  tags: ["confirmations", "audit", "workpaper", "exceptions", "receivables", "nebula-x"],
  visibility: "shared",
  tenantId: TENANT,
  usageCount: 0,
  defaultPolicyIds: ["policy-confidential-client-data", "policy-human-gate", "policy-audit-evidence"],
  parameters: [
    { name: "engagementId", type: "string", required: true, description: "Audit engagement identifier" },
    { name: "confirmationType", type: "string", required: true, description: "Bank, AR, AP, legal, debt, or other confirmation type" },
    { name: "populationId", type: "string", required: true, description: "Population or subledger identifier" },
    { name: "responseDeadline", type: "string", required: true, description: "Requested response deadline" },
  ],
  nodes: [
    {
      id: "conf-start",
      type: "start",
      position: { x: 40, y: 260 },
      data: {
        label: "Confirmation Request",
        description: "Audit team initiates external confirmation workflow",
        config: { triggerType: "http" },
      },
    },
    {
      id: "conf-identify-agent",
      type: "agent",
      position: { x: 260, y: 260 },
      data: {
        label: "LedgerSentinel Targeting",
        description: "Identifies confirmation recipients from the audited population and risk criteria",
        config: {
          agentId: "LedgerSentinel",
          systemPrompt:
            "Identify confirmation targets from the population using materiality, risk criteria, aging, unusual activity, and audit strategy. Produce selected recipients with rationale and evidence references.",
          tools: ["query_subledger", "apply_audit_sampling", "validate_recipient_master"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "conf-approval",
      type: "approval",
      position: { x: 500, y: 260 },
      data: {
        label: "Recipient Approval",
        description: "Audit manager approves confirmation recipient list before dispatch",
        config: {
          approvalMessage: "Review and approve external confirmation recipients before dispatch.",
          approverRole: "audit-manager",
          timeoutMinutes: 480,
          onReject: "abort",
        },
      },
    },
    {
      id: "conf-dispatch-tool",
      type: "tool",
      position: { x: 740, y: 260 },
      data: {
        label: "Dispatch Confirmations",
        description: "Sends approved requests through the confirmation platform",
        config: { toolId: "dispatch_confirmations", serverId: "confirmation-platform" },
      },
    },
    {
      id: "conf-track-agent",
      type: "agent",
      position: { x: 980, y: 260 },
      data: {
        label: "AuditScribe Response Tracking",
        description: "Tracks responses, nonresponses, bounced requests, and follow-ups",
        config: {
          agentId: "AuditScribe",
          systemPrompt:
            "Track confirmation status. Summarize received responses, nonresponses, follow-up needs, bounced contacts, and evidence received from the confirmation platform.",
          tools: ["track_confirmation_responses", "send_confirmation_followup", "retrieve_response_evidence"],
          modelId: "gpt-5.5",
        },
      },
    },
    {
      id: "conf-condition",
      type: "condition",
      position: { x: 1220, y: 260 },
      data: {
        label: "Exceptions or Nonresponses?",
        description: "Determines if reconciliation or alternate procedures are needed",
        config: {
          conditionExpression: "output.exceptionsCount > 0 || output.nonresponseCount > 0",
          trueBranchLabel: "Reconcile Exceptions",
          falseBranchLabel: "Prepare Workpaper",
        },
      },
    },
    {
      id: "conf-reconcile-agent",
      type: "agent",
      position: { x: 1460, y: 380 },
      data: {
        label: "LedgerSentinel Reconciliation",
        description: "Reconciles differences and designs alternate procedures for unresolved items",
        config: {
          agentId: "LedgerSentinel",
          systemPrompt:
            "Reconcile confirmation exceptions to the client ledger and supporting documents. For nonresponses, recommend and document alternate procedures with evidence requirements.",
          tools: ["reconcile_confirmation_exception", "retrieve_supporting_documents", "draft_alternate_procedures"],
          modelId: "claude-sonnet-4.5",
        },
      },
    },
    {
      id: "conf-workpaper-agent",
      type: "agent",
      position: { x: 1700, y: 260 },
      data: {
        label: "AuditScribe Workpaper",
        description: "Creates confirmation workpaper with evidence, status, exceptions, and conclusions",
        config: {
          agentId: "AuditScribe",
          systemPrompt:
            "Prepare the confirmation workpaper. Include scope, recipient selection rationale, dispatch evidence, response status, exception reconciliation, alternate procedures, and audit conclusion.",
          tools: ["document_workpaper", "attach_confirmation_evidence", "generate_audit_conclusion"],
          modelId: "gpt-5.5",
        },
      },
    },
    {
      id: "conf-end",
      type: "end",
      position: { x: 1940, y: 260 },
      data: {
        label: "Workpaper Ready",
        description: "Confirmation workpaper is ready for audit file review",
        config: { successMessage: "Audit confirmations workpaper completed." },
      },
    },
  ],
  edges: [
    { id: "confe1", source: "conf-start", target: "conf-identify-agent" },
    { id: "confe2", source: "conf-identify-agent", target: "conf-approval" },
    { id: "confe3", source: "conf-approval", target: "conf-dispatch-tool", label: "approved" },
    { id: "confe4", source: "conf-dispatch-tool", target: "conf-track-agent" },
    { id: "confe5", source: "conf-track-agent", target: "conf-condition" },
    { id: "confe6", source: "conf-condition", target: "conf-reconcile-agent", label: "Reconcile", data: { edgeType: "true" } },
    { id: "confe7", source: "conf-condition", target: "conf-workpaper-agent", label: "No Exceptions", data: { edgeType: "false" } },
    { id: "confe8", source: "conf-reconcile-agent", target: "conf-workpaper-agent" },
    { id: "confe9", source: "conf-workpaper-agent", target: "conf-end" },
  ],
  createdAt: now,
  updatedAt: now,
};

export const OPTUM_RCM_TEMPLATES = [
  maDueDiligencePipeline,
  soxControlsTesting,
  taxProvisionAsc740Workflow,
  auditConfirmationsWorkflow,
];
