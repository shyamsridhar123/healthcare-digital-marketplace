"""
Generate Global Agentic Orchestrator slides aligned to
Draft_UAP_AI_Marketplace_Architecture_v1.pptx style.

Reads the existing pptx as a template (for slide dimensions & master),
then appends 11 new slides matching its visual language:
  - Blank layout
  - Widescreen 13.33×7.5 in
  - Consistent title/subtitle/body text boxes
  - Feature-comparison tables using auto-shapes
  - Accent line separators
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
import os

TEMPLATE = os.path.join(os.path.dirname(__file__), "Draft_UAP_AI_Marketplace_Architecture_v1.pptx")
OUTPUT = os.path.join(os.path.dirname(__file__), "Global_Agentic_Orchestrator_Design.pptx")

# ── colour palette (matched from template) ──────────────────────────
DARK = RGBColor(0x1A, 0x1A, 0x2E)
ACCENT = RGBColor(0x00, 0x78, 0xD4)      # Microsoft blue
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xF2, 0xF2, 0xF2)
MED_GRAY = RGBColor(0x66, 0x66, 0x66)
HEADER_BG = RGBColor(0x00, 0x78, 0xD4)
ROW_ALT = RGBColor(0xE8, 0xF0, 0xFE)
GREEN = RGBColor(0x10, 0x7C, 0x10)
RED_ACCENT = RGBColor(0xD1, 0x34, 0x38)

# ── layout constants (EMU) ──────────────────────────────────────────
LEFT_MARGIN = Inches(0.5)
RIGHT_EDGE = Inches(12.8)
BODY_WIDTH = Inches(12.3)
TITLE_TOP = Inches(0.12)
SUBTITLE_TOP = Inches(0.6)
LINE_TOP = Inches(0.95)
CONTENT_TOP = Inches(1.1)


def _set_font(run, size=11, bold=False, color=DARK, name="Segoe UI"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name


def _add_title(slide, text, subtitle=None):
    """Add a consistent title bar matching template style."""
    tb = slide.shapes.add_textbox(LEFT_MARGIN, TITLE_TOP, BODY_WIDTH, Inches(0.45))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = text
    _set_font(r, size=22, bold=True, color=DARK)

    if subtitle:
        tb2 = slide.shapes.add_textbox(LEFT_MARGIN, SUBTITLE_TOP, BODY_WIDTH, Inches(0.25))
        tf2 = tb2.text_frame
        tf2.word_wrap = True
        p2 = tf2.paragraphs[0]
        r2 = p2.add_run()
        r2.text = subtitle
        _set_font(r2, size=12, color=MED_GRAY)

    # accent line
    slide.shapes.add_connector(
        1, LEFT_MARGIN, LINE_TOP, RIGHT_EDGE, LINE_TOP
    )


def _add_body_text(slide, lines, top=None, left=None, width=None, font_size=11):
    """Add body text as bullet lines."""
    top = top or CONTENT_TOP
    left = left or LEFT_MARGIN
    width = width or BODY_WIDTH
    tb = slide.shapes.add_textbox(left, top, width, Inches(5.8))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        # Handle bold prefix (before colon)
        if ": " in line and not line.startswith("▸"):
            prefix, rest = line.split(": ", 1)
            r1 = p.add_run()
            r1.text = prefix + ": "
            _set_font(r1, size=font_size, bold=True)
            r2 = p.add_run()
            r2.text = rest
            _set_font(r2, size=font_size)
        else:
            r = p.add_run()
            r.text = line
            _set_font(r, size=font_size)
        p.space_after = Pt(4)
    return tb


def _add_table_slide(slide, title, subtitle, headers, rows, footer=None):
    """Add a feature-comparison table using auto-shapes (matching template pattern)."""
    _add_title(slide, title, subtitle)

    col_count = len(headers)
    # Calculate column widths
    total_w = Inches(11.7)
    col_widths = [total_w / col_count] * col_count

    row_h = Inches(0.45)
    header_h = Inches(0.35)
    start_top = Inches(1.15)
    start_left = LEFT_MARGIN

    # Header row
    x = start_left
    for ci, hdr in enumerate(headers):
        shp = slide.shapes.add_shape(
            1, x, start_top, col_widths[ci], header_h
        )
        shp.fill.solid()
        shp.fill.fore_color.rgb = HEADER_BG
        shp.line.fill.background()
        tf = shp.text_frame
        tf.word_wrap = True
        tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        r = tf.paragraphs[0].add_run()
        r.text = hdr
        _set_font(r, size=10, bold=True, color=WHITE)
        x += col_widths[ci]

    # Data rows
    for ri, row in enumerate(rows):
        y = start_top + header_h + ri * row_h
        x = start_left
        for ci, cell in enumerate(row):
            shp = slide.shapes.add_shape(
                1, x, y, col_widths[ci], row_h
            )
            bg = ROW_ALT if ri % 2 == 0 else WHITE
            shp.fill.solid()
            shp.fill.fore_color.rgb = bg
            shp.line.fill.background()
            tf = shp.text_frame
            tf.word_wrap = True
            tf.paragraphs[0].alignment = PP_ALIGN.LEFT
            r = tf.paragraphs[0].add_run()
            r.text = str(cell)
            _set_font(r, size=9)
            x += col_widths[ci]

    if footer:
        tb = slide.shapes.add_textbox(LEFT_MARGIN, Inches(6.8), BODY_WIDTH, Inches(0.3))
        tf = tb.text_frame
        r = tf.paragraphs[0].add_run()
        r.text = footer
        _set_font(r, size=9, color=MED_GRAY)


def _add_speaker_notes(slide, text):
    notes_slide = slide.notes_slide
    notes_slide.notes_text_frame.text = text


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════
def main():
    prs = Presentation(TEMPLATE)
    blank_layout = prs.slide_layouts[6]  # Blank

    # ── Slide 1: Title Slide ────────────────────────────────────
    sl = prs.slides.add_slide(blank_layout)
    # Accent bar
    bar = sl.shapes.add_shape(1, 0, Inches(3.3), Inches(13.3), Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = ACCENT
    bar.line.fill.background()
    # Title
    tb = sl.shapes.add_textbox(LEFT_MARGIN, Inches(1.5), Inches(11), Inches(0.7))
    tf = tb.text_frame
    r = tf.paragraphs[0].add_run()
    r.text = "Global Agentic Orchestrator — RCM AI Platform Architecture"
    _set_font(r, size=28, bold=True, color=DARK)
    # Subtitle
    tb2 = sl.shapes.add_textbox(LEFT_MARGIN, Inches(2.3), Inches(11), Inches(0.5))
    tf2 = tb2.text_frame
    r2 = tf2.paragraphs[0].add_run()
    r2.text = "LangGraph-Powered Multi-Agent Orchestration for Revenue Cycle Management"
    _set_font(r2, size=16, color=MED_GRAY)
    # Tech strip
    tb3 = sl.shapes.add_textbox(LEFT_MARGIN, Inches(4.0), Inches(11), Inches(0.4))
    tf3 = tb3.text_frame
    r3 = tf3.paragraphs[0].add_run()
    r3.text = "LangGraph  •  Azure AI Foundry  •  A2A Protocol  •  MCP  •  MongoDB  •  Azure OpenAI"
    _set_font(r3, size=12, color=MED_GRAY)
    # Executive summary box
    _add_body_text(sl, [
        "▸ Unified AI Orchestration — LangGraph-powered Global Orchestrator manages domain-specific AI agents for RCM",
        "▸ Automated Onboarding — Days-to-hours agent/tool deployment with validation, approvals, canary releases & rollback",
        "▸ Trust & Quality by Design — HIPAA compliance, Responsible AI checks, Arize Phoenix for LLM tracing & evaluation",
    ], top=Inches(4.8), font_size=11)
    _add_speaker_notes(sl, "Title slide. Revenue Cycle Management in healthcare is complex and costly, consuming ~25% of total spend (>$200B/year in US admin costs). UnitedHealth Group is investing $3B in AI to transform healthcare administration with 1,000+ AI applications already in production. This deck presents the Global Agentic Orchestrator architecture for the RCM AI Platform.")

    # ── Slide 2: RCM Business Context & AI Platform Vision ──────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "RCM Business Context & AI Platform Vision", "Revenue Cycle Management challenges and the AI Platform opportunity")
    _add_body_text(sl, [
        "The Problem:",
        "▸ RCM admin tasks consume ~25% of total healthcare spend — >$200B/year in US admin costs",
        "▸ 7 days of paperwork for a 45-min procedure; initial claim denial rates hover around 12%",
        "▸ ~85% of claim denials are avoidable with proper info and processes upfront",
        "",
        "Enterprise AI Investment:",
        "▸ UnitedHealth investing $3B in AI — 22,000 engineers, 20,000 using AI in development",
        "▸ 1,000+ AI applications already in production — largest AI initiative in healthcare",
        "▸ Optum Real pilot: AI reduces claim denials, speeds prior authorizations in hospital pilots",
        "",
        "Vision — AI Platform for RCM:",
        "▸ Unified AI Platform with Global Agentic Orchestrator — intelligent hub coordinating specialized AI agents",
        "▸ Covers eligibility, billing, claims, denials with end-to-end workflow automation",
        "▸ Promotes reuse of AI agents across teams; aligns with top RCM automation priorities",
    ])
    _add_speaker_notes(sl, "RCM processes like patient eligibility verification, claims processing, billing, and denial management involve complex rules and massive transaction volumes. Optum Real pilot showed how AI can streamline RCM tasks — providing real-time guidance on claim approval likelihood, reducing denials and prior auth delays at a 12-hospital system. The platform aims to consolidate and coordinate domain-specific AI agents across the RCM spectrum under a unified hub-and-spoke multi-agent architecture.")

    # ── Slide 3: Key Requirements & Design Goals ────────────────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Key Requirements & Design Goals", "Five pillars guiding the Global Orchestrator architecture")
    _add_body_text(sl, [
        "1. Orchestrate Complex Workflows:",
        "▸ Handle multi-step, multi-agent RCM processes (coverage check → denial prediction → claim update)",
        "▸ Delegate tasks to specialized agents; integrate results seamlessly with conditional logic",
        "",
        "2. Cross-Domain Reuse:",
        "▸ Discoverability and reuse of agents across RCM teams via capability-based routing",
        "▸ Eligibility-checking agent serves any application needing that skill — no redundant development",
        "",
        "3. Enterprise Integration:",
        "▸ UAIS for model hosting, MongoDB for NoSQL; MCP tool servers for enterprise APIs & data",
        "▸ Connectors for internal APIs, cloud services, and on-prem systems (Event Grid / ESB)",
        "",
        "4. Robustness & Scaling:",
        "▸ Stateful long-running workflows with checkpointing; auto-scaling for billions of claims/year",
        "▸ Resilience to partial failures with automatic retries and event-driven triggers",
        "",
        "5. Security, Compliance & Audit:",
        "▸ Zero-trust: Entra ID auth for every agent/tool call; Key Vault for secrets; HIPAA compliance",
        "▸ PHI/PII redaction, fairness/bias checks; human oversight for coverage denials",
    ])
    _add_speaker_notes(sl, "These five requirements guided architecture choices. The orchestrator acts as a conductor that breaks down requests into tasks and delegates to the right agents. We standardize on MongoDB (Optum enterprise standard) and UAIS for model access. UnitedHealth processes over 5 billion claims/year — any AI-driven orchestration must be efficient and scalable. A Responsible AI Board (20-25 members) defines policies enforced in code.")

    # ── Slide 4: Global Orchestrator Architecture — Overview ────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Global Orchestrator Architecture — Overview", "Two-tier orchestration with three logical planes")

    # Left column
    _add_body_text(sl, [
        "Two-Tier Orchestration:",
        "▸ Global Orchestrator (central brain) + Domain Agents/Orchestrators (specialists)",
        "▸ Global layer handles cross-domain workflows & policies; domain layer handles specialized tasks",
        "",
        "LangGraph Orchestration Engine:",
        "▸ Low-level graph-based framework — stateful, multi-agent workflows with custom control flows",
        "▸ Dynamic branching, parallel execution, durable state persistence, fault recovery",
        "",
        "Agent-to-Agent (A2A) Protocol:",
        "▸ Common HTTP interface with self-describing Agent Card (name, skills, endpoint)",
        "▸ Dynamic discovery via capability matching with confidence scoring",
    ], top=CONTENT_TOP, left=LEFT_MARGIN, width=Inches(5.8))

    # Right column — three planes
    _add_body_text(sl, [
        "Three Logical Planes:",
        "",
        "Model Plane:",
        "▸ LLM access via UAIS (Azure OpenAI) with content filtering & cost-aware routing",
        "",
        "Tool Plane:",
        "▸ Enterprise APIs via MCP connectors — standard interface for DBs, SaaS, services",
        "",
        "Agent Plane:",
        "▸ Domain + Platform Agents in containers, communicating via A2A through orchestrator",
        "",
        "Memory Store:",
        "▸ Redis for sub-ms working memory; MongoDB for persistent state & Agent Registry",
        "▸ Vector DB / MongoDB vector indexing for embeddings & RAG",
    ], top=CONTENT_TOP, left=Inches(6.5), width=Inches(6.0))
    _add_speaker_notes(sl, "The Global Orchestrator is like the 'air traffic controller' for all agent activities. LangGraph represents the workflow as a directed graph of nodes and edges. Each node can be a call to a model, a tool, or another agent. A2A communication is standardized — each agent is described by an AgentCard. The orchestrator contains an Agent Registry backed by MongoDB where all AgentCards are stored and indexed by capabilities. Dynamic discovery means new agents can be plugged in at any time.")

    # ── Slide 5: Azure Integration & Cloud Services ─────────────
    sl = prs.slides.add_slide(blank_layout)
    _add_table_slide(sl,
        "Azure Integration & Cloud Services",
        "Mapping architecture to Azure and enterprise technologies",
        ["Service Area", "Technology", "Purpose"],
        [
            ["Orchestrator Hosting", "AKS / Azure Container Apps", "Auto-scaling, HA, isolation for LangGraph-based orchestrator & domain agents"],
            ["Data & State", "MongoDB (Atlas / Cosmos MongoAPI)", "Persistent Agent/Tool Registry, conversation logs, long-term memory (Optum standard)"],
            ["Fast Memory", "Azure Cache for Redis", "Sub-ms in-memory session context, ephemeral state, working memory"],
            ["Model Serving", "Azure OpenAI via UAIS", "GPT-4, GPT-3.5 with Managed Identity, content filters, rate limits"],
            ["Enterprise Tools", "MCP Servers on Functions/ACA", "Wrap enterprise APIs (claims, EHR, billing) fronted by APIM gateway"],
            ["Event Processing", "Azure Event Grid / Service Bus", "Async triggers from domain systems (New Claim, Lab Results, Discharge)"],
            ["Security & Secrets", "Azure Key Vault + Entra ID", "Managed identities, least-privilege secrets, zero-trust auth"],
            ["Observability", "Azure Monitor + App Insights", "OpenTelemetry tracing, distributed traces; Arize Phoenix for LLM-specific monitoring"],
        ],
        footer="All infrastructure aligned with Optum enterprise standards • MongoDB replaces Cosmos DB for NoSQL workloads"
    )
    _add_speaker_notes(sl, "The Global Orchestrator and agents are containerized. MongoDB aligns with Optum's enterprise practice (MongoDB x UHG Developer Day). UAIS integrates Azure OpenAI with consistent policy enforcement. MCP servers are deployed as microservice connectors, all fronted by Azure API Management. Event Grid enables reactive agent workflows. All service-to-service calls use Entra ID tokens for zero-trust auth.")

    # ── Slide 6: LangGraph vs MAF Comparison ─────────────────────
    sl = prs.slides.add_slide(blank_layout)
    _add_table_slide(sl,
        "LangGraph vs Microsoft Agent Framework (MAF)",
        "Framework selection rationale for the Global Orchestrator engine",
        ["Dimension", "LangGraph", "MAF (v1.0, Apr 2026)", "Decision"],
        [
            ["Maturity", "Mature, MIT-licensed, production-proven", "New v1.0 — improving rapidly", "LangGraph ✓"],
            ["Control Granularity", "Full custom graph: nodes, conditional branches, parallel", "WorkflowBuilder DAG with ceremony", "LangGraph ✓"],
            ["Durable Execution", "Built-in checkpointing, long-running, fault recovery", "Workflow checkpoints available", "Comparable"],
            ["Human-in-the-Loop", "Native interrupts + state edits", "First-class support", "Comparable"],
            ["Enterprise Observability", "Requires LangSmith / custom", "Native OTel + Azure Monitor", "MAF ✓"],
            ["Managed Identity / RBAC", "Manual integration", "Native platform-level", "MAF ✓"],
            ["A2A Interoperability", "Framework-agnostic, open protocols", "Best with MS-based agents (v1.0)", "LangGraph ✓"],
            ["Azure Foundry Hosting", "Runs natively on Foundry alongside MAF", "Native Foundry support", "Both supported"],
            ["Compliance Logging", "Custom-built audit trail", "Native workflow events + hooks", "MAF ✓"],
            ["Multi-Agent Flexibility", "Low friction for complex multi-agent scenarios", "More setup boilerplate in v1.0", "LangGraph ✓"],
        ],
        footer="LangGraph selected for flexibility & maturity • MAF strengths (compliance, identity) rebuilt as platform capabilities • Both run on Azure Foundry"
    )
    _add_speaker_notes(sl, "We evaluated Microsoft Agent Framework (MAF) and LangGraph. MAF merges Semantic Kernel and AutoGen capabilities but requires significant setup ceremony for multi-agent scenarios compared to LangGraph. LangGraph is more mature, open-source (MIT-licensed), and offers fine-grained control. Choosing LangGraph does not sacrifice Azure compatibility — Foundry supports multiple frameworks in parallel. MAF's enterprise strengths (compliance, identity, observability) are rebuilt as platform capabilities.")

    # ── Slide 7: Platform AI Agents — Cross-Cutting Services ────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Platform AI Agents — Cross-Cutting Services", "Six specialized agents forming the platform operating system")

    _add_body_text(sl, [
        "Onboarding Agent:",
        "▸ Automates agent/tool intake: validation, metadata collection, registry registration",
        "▸ Triggers infra provisioning, configures credentials, generates CI/CD templates",
        "▸ Reduces onboarding time from weeks to hours",
        "",
        "Security & Governance Agent:",
        "▸ Monitors compliance policies; scans plans/prompts for PHI, PII, disallowed content",
        "▸ Integrates Azure OpenAI content filters + Optum security baselines",
        "▸ Facilitates audit logging and Responsible AI board reporting",
        "",
        "Observability Agent:",
        "▸ Aggregates logs/metrics from Azure Monitor + Arize Phoenix",
        "▸ Detects anomalies (error spikes, model performance drift); auto-scales resources",
    ], top=CONTENT_TOP, left=LEFT_MARGIN, width=Inches(5.8))

    _add_body_text(sl, [
        "Evaluation Agent:",
        "▸ Continuous agent/model quality assessment with configurable metrics",
        "▸ LLM-as-a-judge scoring (accuracy, relevance, toxicity) via Phoenix eval harness",
        "▸ A/B tests between models/prompts; regression tests on new agent versions",
        "",
        "Developer Productivity Agent:",
        "▸ AI helper for devs: answers questions, generates templates, troubleshoots errors",
        "▸ Reviews PRs for coding/security standards; serves as AI pair-programmer",
        "▸ Aligned with 20,000 UHG engineers already using AI coding assistance",
        "",
        "Lifecycle Management Agent:",
        "▸ Tracks versioning (semver), coordinates canary deployments & rollbacks",
        "▸ Routes traffic progressively: 5% → 25% → 50% → 100% if metrics pass",
        "▸ Manages deprecation: 90-day sunset notices, auto-decommissioning old versions",
    ], top=CONTENT_TOP, left=Inches(6.5), width=Inches(6.0))
    _add_speaker_notes(sl, "In addition to domain-specific RCM agents, the platform provides a suite of platform-focused AI agents that act as the 'operating system' for the AI Platform. The Onboarding Agent orchestrates the entire onboarding workflow. The Security & Governance Agent is the AI security guard and compliance officer. The Observability Agent is mission control. The Evaluation Agent systematically evaluates transcripts and outputs. The Developer Productivity Agent boosts developer adoption. The Lifecycle Management Agent coordinates versioning and deployment strategies.")

    # ── Slide 8: Automated Onboarding Workflow ──────────────────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Automated Onboarding Workflow", "7-stage pipeline: submission to production in hours, not weeks")

    _add_table_slide(sl,
        "Automated Onboarding Workflow",
        "7-stage pipeline: submission to production in hours, not weeks",
        ["Stage", "Step", "Actions", "Gate / Output"],
        [
            ["1", "Submission", "Developer submits code + metadata via portal/CLI/CI", "Agent/tool package received"],
            ["2", "Validation", "Schema checks, dependency audit, security scanning, policy compliance", "Pass/Fail with feedback"],
            ["3", "Registration", "Register in Agent/Tool Registry (MongoDB), assign staging status", "AgentCard created"],
            ["4", "Approval Gate", "Route to Security / Responsible AI reviewers; workflow pauses", "Human sign-off (if required)"],
            ["5", "Provisioning", "Allocate AKS/ACA resources, configure Key Vault secrets, APIM routing", "Infrastructure ready"],
            ["6", "Integration Test", "Automated test suite + Evaluation Agent sanity checks", "Test report"],
            ["7", "Deployment", "Canary rollout (5% → 25% → 100%); mark AgentCard active", "Live in production"],
        ],
        footer="Onboarding Agent provides real-time status updates • Human approval gates only for sensitive/production agents"
    )
    _add_speaker_notes(sl, "The Onboarding Agent orchestrates the entire pipeline. Step 1: Developer submits via web portal or CI/CD trigger. Step 2: Automated validation — syntactic, semantic, and security scans. Step 3: Registration in MongoDB with staging status. Step 4: Human approval for sensitive agents (LangGraph's human-in-the-loop feature). Step 5: Infrastructure provisioning via IaC. Step 6: Integration testing with automated test suite. Step 7: Canary deployment with progressive traffic increase.")

    # ── Slide 9: Lifecycle Management ────────────────────────────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Ongoing Lifecycle Management", "Versioning, canary releases, rollback, and retirement")
    _add_body_text(sl, [
        "Versioning & Coexistence:",
        "▸ Semantic versioning (MAJOR.MINOR.PATCH) for every agent and tool",
        "▸ Multiple versions run concurrently for backward compatibility",
        "▸ Agent Registry tracks version metadata and allowed contract changes",
        "",
        "Canary Releases:",
        "▸ New versions deployed as parallel instances under limited rollout",
        "▸ Orchestrator + Lifecycle Agent direct traffic: 5% → 25% → 50% → 100%",
        "▸ Evaluation Agent continuously monitors quality metrics during rollout",
        "",
        "Automated Rollback:",
        "▸ If Evaluation/Observability detects regressions → instant rollback to stable version",
        "▸ Azure Container Apps revision management enables near-instant swap",
        "",
        "Audit Trails & Logging:",
        "▸ Every action logged with timestamps, I/O, model versions, tool calls to MongoDB + Arize",
        "▸ Complete provenance for each version — supports debugging and compliance audits",
        "",
        "Retirement & Reuse:",
        "▸ 90-day deprecation notices to dependent teams; auto-decommissioning after sunset",
        "▸ Library of Declarative Plan Templates enables cloning/extending proven agents",
        "▸ Knowledge from one team's innovation is shared and adapted across the platform",
    ])
    _add_speaker_notes(sl, "We require every agent and tool update use semantic versioning. The Agent Registry stores backward-compatibility info. Canary deployments route small percentage of traffic to new versions initially. The Lifecycle Agent leverages signals from the Evaluation Agent — if metrics are good, traffic increases; if severe regression detected, immediate rollback. Azure Container Apps supports instant revision switching. Deprecation notices give teams 90-day windows to migrate.")

    # ── Slide 10: Observability & Evaluation (Arize Phoenix) ────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Observability & Evaluation — Arize Phoenix Integration", "LLM-specific monitoring, tracing, and automated quality measures")

    _add_body_text(sl, [
        "Arize Phoenix for LLM Ops:",
        "▸ Open-source AI observability tool (2.5M+ monthly downloads, 9K+ GitHub stars)",
        "▸ Self-hosted on Azure for HIPAA compliance — all data stays internal",
        "▸ Rich LLM tracing and evaluation capabilities",
        "",
        "OpenTelemetry Tracing:",
        "▸ Every agent/tool instrumented with OTel — detailed traces of all requests",
        "▸ Phoenix reconstructs every decision path: prompts → tool calls → model responses",
        "▸ 'Flight recorder' for every AI-driven interaction for debugging and analysis",
        "",
        "Automated Quality Measures:",
        "▸ LLM-as-a-judge: GPT-4 scores agent outputs on accuracy, relevance, toxicity, bias",
        "▸ Embedding-based drift detection — surfaces concept drift or topic shifts",
        "▸ Evaluation templates for common tasks (retrieval consistency, clinical accuracy)",
        "",
        "Real-Time Dashboards & Alerts:",
        "▸ Live metrics: success rate, latency distribution, token usage per request",
        "▸ Correlates Phoenix LLM metrics with Azure Monitor infrastructure metrics",
        "▸ Auto-alerts on threshold breaches (error rate, token spikes, unsafe output rates)",
    ])
    _add_speaker_notes(sl, "Arize Phoenix is our AI-focused observability platform. Self-hosted on Azure for data privacy. Phoenix integrates with OpenTelemetry — captures model prompts, tool invocations, and agent decisions. LLM-as-a-judge capability uses models to score other agent outputs. Embedding-based analysis detects concept drift. The Observability Agent compiles key metrics and can auto-alert or preemptively scale resources when anomalies are detected.")

    # ── Slide 11: Agent Discoverability, Reuse & Compliance ─────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Agent Discoverability, Reuse & Compliance", "Registry, dynamic routing, plan templates, and governance metadata")

    _add_body_text(sl, [
        "Agent Registry (Meta-Store):",
        "▸ Centralized MongoDB store of AgentCards — name, version, owner, endpoint, capability tags",
        "▸ Single source of truth for agent configurations; enables discovery by capability",
        "",
        "Dynamic Routing by Capability:",
        "▸ Dynamic Skill Resolver queries registry at runtime for best agent per task",
        "▸ Capability-based routing with confidence scoring — not hardwired to specific agents",
        "▸ Cross-domain reuse: e.g., 'translate text' agent built for billing used by prior-auth workflow",
    ], top=CONTENT_TOP, left=LEFT_MARGIN, width=Inches(5.8))

    _add_body_text(sl, [
        "Declarative Plan Templates:",
        "▸ Pre-defined YAML/JSON workflow blueprints for common RCM processes",
        "▸ Sharable, version-controlled, customizable — lowers barrier for non-coders",
        "▸ Orchestrator loads and executes templates directly as LangGraph workflows",
        "",
        "Governance & Compliance Tagging:",
        "▸ Agents carry metadata: data categories accessed, Responsible AI policies adhered to",
        "▸ Security/Governance Agent cross-references tags with organizational policies",
        "▸ Compliance is declarative and verifiable — 'right thing by default'",
        "",
        "AI Marketplace Portal:",
        "▸ Search Agent/Tool Registry by keywords, filters, domains",
        "▸ Shows lineage, audit info, evaluation scores, certification status",
        "▸ Transparency drives trust and adoption across RCM teams",
    ], top=CONTENT_TOP, left=Inches(6.5), width=Inches(6.0))
    _add_speaker_notes(sl, "The Agent Registry is a central catalog. Each AgentCard includes declared capabilities that the orchestrator uses for smart routing. When a request comes in, the orchestrator queries the registry: 'Who can handle a task about X?' If multiple agents have the skill, it computes a confidence score. Declarative Plan Templates — like ready-made workflow designs in YAML/JSON — can be executed directly by the orchestrator. Compliance metadata on agents and tools makes governance declarative.")

    # ── Slide 12: Expected Impact & Benefits ─────────────────────
    sl = prs.slides.add_slide(blank_layout)
    _add_title(sl, "Expected Impact & Benefits", "Technical and business outcomes from the Global Orchestrator platform")

    _add_table_slide(sl,
        "Expected Impact & Benefits",
        "Technical and business outcomes from the Global Orchestrator platform",
        ["Benefit Area", "Impact", "Supporting Evidence"],
        [
            ["Faster Deployment", "Agent onboarding: weeks → hours", "Automated 7-stage pipeline replaces manual coordination"],
            ["Increased Reuse", "40–50% of new projects leverage existing agents/templates", "Shared registries + plan templates create network effect"],
            ["Operational Efficiency", "20%+ productivity gains in claims processing", "Optum pilot data; AI catches errors and denials upfront"],
            ["Denial Reduction", "Target: significant reduction in avoidable denials", "~85% of claim denials are preventable with right info"],
            ["Quality Assurance", "All agents vetted for fairness, bias, performance", "Continuous evaluation via Phoenix + LLM-as-a-judge"],
            ["Compliance", "Full audit trail; HIPAA-ready by design", "Every action logged with provenance; Responsible AI board"],
            ["Developer Productivity", "AI pair-programming for 20K+ engineers", "Developer Productivity Agent + platform templates"],
            ["Risk Mitigation", "Canary releases + instant rollback", "Lifecycle Agent monitors quality; auto-revert on regression"],
        ],
        footer="The Global Orchestrator drives faster time-to-market, higher efficiency, better compliance, and an intelligent, responsive revenue cycle"
    )
    _add_speaker_notes(sl, "The platform delivers substantial benefits. Faster deployment — automated onboarding slashes timelines from 2-3 weeks to hours. Reuse and collaboration — shared platform with registries and templates creates network effects. Operational efficiency — AI-driven claim processing shows 20%+ productivity gains. Quality and compliance — no agent deploys without fairness, bias, and performance checks. Developer productivity — 20,000 UHG engineers already using AI coding assistance; platform amplifies that.")

    prs.save(OUTPUT)
    print(f"✓ Saved {len(prs.slides) - 24} new slides → {OUTPUT}")


if __name__ == "__main__":
    main()
