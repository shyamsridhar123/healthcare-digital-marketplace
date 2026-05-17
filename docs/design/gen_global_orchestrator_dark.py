"""
Generate Global Agentic Orchestrator Design slides – DARK THEME.

Creates a standalone widescreen (13.33×7.5) PPTX with a dark Microsoft-style
theme.  No dependency on the Draft_UAP template; all 12 slides are self-contained.
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
import os, copy

OUTPUT = os.path.join(os.path.dirname(__file__),
                      "Global_Agentic_Orchestrator_Design.pptx")

# ── Dark colour palette ─────────────────────────────────────────
BG_DARK       = RGBColor(0x1B, 0x1B, 0x1B)   # slide background
BG_CARD       = RGBColor(0x25, 0x25, 0x2B)   # card / section bg
ACCENT_BLUE   = RGBColor(0x00, 0x78, 0xD4)   # Microsoft blue
ACCENT_CYAN   = RGBColor(0x00, 0xBC, 0xD4)   # secondary accent
WHITE         = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY    = RGBColor(0xC0, 0xC0, 0xC0)
MED_GRAY      = RGBColor(0x99, 0x99, 0x99)
DIM_GRAY      = RGBColor(0x60, 0x60, 0x60)
TABLE_HDR_BG  = RGBColor(0x00, 0x5A, 0x9E)   # darker header blue
ROW_EVEN      = RGBColor(0x22, 0x22, 0x2A)
ROW_ODD       = RGBColor(0x2C, 0x2C, 0x36)
GREEN         = RGBColor(0x4E, 0xC9, 0xB0)
ORANGE        = RGBColor(0xFF, 0xA5, 0x00)
ACCENT_LINE   = RGBColor(0x00, 0x78, 0xD4)

# ── layout constants (EMU) ──────────────────────────────────────
LEFT_MARGIN  = Inches(0.6)
RIGHT_EDGE   = Inches(12.7)
BODY_WIDTH   = Inches(12.1)
TITLE_TOP    = Inches(0.15)
SUBTITLE_TOP = Inches(0.65)
LINE_TOP     = Inches(1.0)
CONTENT_TOP  = Inches(1.2)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


# ── helpers ──────────────────────────────────────────────────────

def _set_font(run, size=11, bold=False, color=LIGHT_GRAY, name="Segoe UI"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name


def _dark_bg(slide):
    """Set slide background to dark."""
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = BG_DARK


def _add_accent_line(slide, y=None):
    y = y or LINE_TOP
    connector = slide.shapes.add_connector(1, LEFT_MARGIN, y, RIGHT_EDGE, y)
    # style the line
    ln = connector.line
    ln.color.rgb = ACCENT_BLUE
    ln.width = Pt(1.5)


def _add_title(slide, text, subtitle=None):
    _dark_bg(slide)
    tb = slide.shapes.add_textbox(LEFT_MARGIN, TITLE_TOP, BODY_WIDTH, Inches(0.5))
    tf = tb.text_frame; tf.word_wrap = True
    r = tf.paragraphs[0].add_run()
    r.text = text
    _set_font(r, size=24, bold=True, color=WHITE)

    if subtitle:
        tb2 = slide.shapes.add_textbox(LEFT_MARGIN, SUBTITLE_TOP, BODY_WIDTH, Inches(0.28))
        tf2 = tb2.text_frame; tf2.word_wrap = True
        r2 = tf2.paragraphs[0].add_run()
        r2.text = subtitle
        _set_font(r2, size=12, color=MED_GRAY)

    _add_accent_line(slide)


def _add_body_text(slide, lines, top=None, left=None, width=None, font_size=11,
                   text_color=LIGHT_GRAY, bold_color=WHITE, bullet_color=ACCENT_CYAN):
    top   = top   or CONTENT_TOP
    left  = left  or LEFT_MARGIN
    width = width or BODY_WIDTH
    tb = slide.shapes.add_textbox(left, top, width, Inches(5.8))
    tf = tb.text_frame; tf.word_wrap = True
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        if line == "":
            r = p.add_run(); r.text = " "
            _set_font(r, size=4, color=text_color)
        elif ": " in line and not line.startswith("▸"):
            prefix, rest = line.split(": ", 1)
            r1 = p.add_run(); r1.text = prefix + ": "
            _set_font(r1, size=font_size, bold=True, color=bold_color)
            r2 = p.add_run(); r2.text = rest
            _set_font(r2, size=font_size, color=text_color)
        elif line.startswith("▸"):
            r = p.add_run(); r.text = line
            _set_font(r, size=font_size, color=text_color)
        else:
            r = p.add_run(); r.text = line
            _set_font(r, size=font_size, color=text_color)
        p.space_after = Pt(3)
    return tb


def _add_table_rows(slide, headers, rows, start_top=None, start_left=None,
                    col_widths=None, header_h=None, row_h=None):
    start_top  = start_top  or Inches(1.15)
    start_left = start_left or LEFT_MARGIN
    col_count  = len(headers)
    total_w    = Inches(12.1)
    if col_widths is None:
        col_widths = [int(total_w / col_count)] * col_count
    header_h = header_h or Inches(0.38)
    row_h    = row_h    or Inches(0.48)

    # Header
    x = start_left
    for ci, hdr in enumerate(headers):
        shp = slide.shapes.add_shape(1, x, start_top, col_widths[ci], header_h)
        shp.fill.solid(); shp.fill.fore_color.rgb = TABLE_HDR_BG
        shp.line.fill.background()
        tf = shp.text_frame; tf.word_wrap = True
        tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        r = tf.paragraphs[0].add_run(); r.text = hdr
        _set_font(r, size=10, bold=True, color=WHITE)
        x += col_widths[ci]

    # Data
    for ri, row in enumerate(rows):
        y = start_top + header_h + ri * row_h
        x = start_left
        bg = ROW_EVEN if ri % 2 == 0 else ROW_ODD
        for ci, cell in enumerate(row):
            shp = slide.shapes.add_shape(1, x, y, col_widths[ci], row_h)
            shp.fill.solid(); shp.fill.fore_color.rgb = bg
            shp.line.fill.background()
            tf = shp.text_frame; tf.word_wrap = True
            tf.paragraphs[0].alignment = PP_ALIGN.LEFT
            cell_text = str(cell)
            # Colour ✓ green and ✗ red
            r = tf.paragraphs[0].add_run(); r.text = cell_text
            if cell_text.endswith("✓"):
                _set_font(r, size=9, color=GREEN)
            elif cell_text.startswith("MAF ✓"):
                _set_font(r, size=9, color=ACCENT_CYAN)
            else:
                _set_font(r, size=9, color=LIGHT_GRAY)
            x += col_widths[ci]

    return start_top + header_h + len(rows) * row_h


def _footer(slide, text, y=None):
    y = y or Inches(6.9)
    tb = slide.shapes.add_textbox(LEFT_MARGIN, y, BODY_WIDTH, Inches(0.25))
    tf = tb.text_frame; tf.word_wrap = True
    r = tf.paragraphs[0].add_run(); r.text = text
    _set_font(r, size=9, color=DIM_GRAY)


def _notes(slide, text):
    ns = slide.notes_slide
    ns.notes_text_frame.text = text


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════
def main():
    prs = Presentation()
    prs.slide_width  = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]  # Blank

    # ────────────────────────────────────────────────────────────
    # SLIDE 1  — Title
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _dark_bg(sl)

    # top accent stripe
    bar = sl.shapes.add_shape(1, 0, Inches(0.0), SLIDE_W, Inches(0.05))
    bar.fill.solid(); bar.fill.fore_color.rgb = ACCENT_BLUE
    bar.line.fill.background()

    # title
    tb = sl.shapes.add_textbox(LEFT_MARGIN, Inches(1.8), Inches(12), Inches(0.8))
    tf = tb.text_frame
    r = tf.paragraphs[0].add_run()
    r.text = "Global Agentic Orchestrator"
    _set_font(r, size=36, bold=True, color=WHITE)
    p2 = tf.add_paragraph()
    r2 = p2.add_run()
    r2.text = "RCM AI Platform Architecture Design"
    _set_font(r2, size=28, bold=False, color=ACCENT_CYAN)

    # mid line
    bar2 = sl.shapes.add_shape(1, LEFT_MARGIN, Inches(3.4), Inches(3), Inches(0.04))
    bar2.fill.solid(); bar2.fill.fore_color.rgb = ACCENT_BLUE
    bar2.line.fill.background()

    # subtitle
    tb3 = sl.shapes.add_textbox(LEFT_MARGIN, Inches(3.7), Inches(11), Inches(0.4))
    tf3 = tb3.text_frame
    r3 = tf3.paragraphs[0].add_run()
    r3.text = "LangGraph  •  Azure AI Foundry  •  A2A Protocol  •  MCP  •  MongoDB  •  Azure OpenAI"
    _set_font(r3, size=13, color=MED_GRAY)

    # executive bullets
    _add_body_text(sl, [
        "▸ Unified AI Orchestration — LangGraph-powered Global Orchestrator manages domain-specific AI agents for RCM",
        "▸ Automated Onboarding — Days-to-hours agent/tool deployment with validation, approvals, canary releases & rollback",
        "▸ Trust & Quality by Design — HIPAA compliance, Responsible AI checks, Arize Phoenix for LLM tracing & evaluation",
    ], top=Inches(4.6), font_size=12, text_color=LIGHT_GRAY)

    # bottom bar
    bar3 = sl.shapes.add_shape(1, 0, Inches(7.35), SLIDE_W, Inches(0.15))
    bar3.fill.solid(); bar3.fill.fore_color.rgb = ACCENT_BLUE
    bar3.line.fill.background()

    _notes(sl, "Title slide. Revenue Cycle Management in healthcare is complex and costly, consuming ~25% of total spend (>$200B/year in US admin costs). UnitedHealth Group is investing $3B in AI to transform healthcare administration with 1,000+ AI applications already in production. This deck presents the Global Agentic Orchestrator architecture for the RCM AI Platform.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 2  — RCM Business Context
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "RCM Business Context & AI Platform Vision",
               "Revenue Cycle Management challenges and the AI Platform opportunity")

    # Three card columns
    card_w = Inches(3.8)
    card_h = Inches(5.2)
    gap    = Inches(0.35)
    cy     = Inches(1.3)
    cards  = [
        ("The Problem", ACCENT_BLUE, [
            "▸ RCM admin tasks consume ~25% of total healthcare spend",
            "▸ >$200B/year in US admin costs",
            "▸ 7 days of paperwork for a 45-min procedure",
            "▸ Initial claim denial rates ~12%",
            "▸ ~85% of claim denials are avoidable with proper info upfront",
        ]),
        ("Enterprise AI Investment", ACCENT_CYAN, [
            "▸ UnitedHealth investing $3B in AI",
            "▸ 22,000 engineers; 20,000 using AI in development",
            "▸ 1,000+ AI applications in production",
            "▸ Largest AI initiative in healthcare",
            "▸ Optum Real pilot: reduces claim denials, speeds prior auth",
        ]),
        ("Vision — AI Platform", GREEN, [
            "▸ Global Agentic Orchestrator as intelligent hub",
            "▸ Coordinates specialized AI agents across RCM domains",
            "▸ Eligibility, billing, claims, denials automation",
            "▸ Promotes reuse of AI agents across teams",
            "▸ Aligns with top RCM automation priorities",
        ]),
    ]
    for ci, (label, accent, bullets) in enumerate(cards):
        cx = LEFT_MARGIN + ci * (card_w + gap)
        # card bg
        card = sl.shapes.add_shape(1, cx, cy, card_w, card_h)
        card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
        # accent strip top of card
        strip = sl.shapes.add_shape(1, cx, cy, card_w, Inches(0.04))
        strip.fill.solid(); strip.fill.fore_color.rgb = accent
        strip.line.fill.background()
        # card title
        tb = sl.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.15), card_w - Inches(0.4), Inches(0.35))
        tf = tb.text_frame
        r = tf.paragraphs[0].add_run(); r.text = label
        _set_font(r, size=14, bold=True, color=accent)
        # card bullets
        _add_body_text(sl, bullets,
                       top=cy + Inches(0.55), left=cx + Inches(0.2),
                       width=card_w - Inches(0.4), font_size=10)

    _notes(sl, "RCM processes like patient eligibility verification, claims processing, billing, and denial management involve complex rules and massive transaction volumes. Optum Real pilot showed how AI can streamline RCM tasks. The platform aims to consolidate and coordinate domain-specific AI agents across the RCM spectrum under a unified hub-and-spoke multi-agent architecture.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 3  — Key Requirements
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Key Requirements & Design Goals",
               "Five pillars guiding the Global Orchestrator architecture")

    pillars = [
        ("01", "Orchestrate Complex Workflows", ACCENT_BLUE,
         "Multi-step, multi-agent RCM processes with conditional logic, parallel execution, and seamless result integration"),
        ("02", "Cross-Domain Reuse", ACCENT_CYAN,
         "Capability-based routing — agents discoverable and reusable across all RCM teams; no redundant development"),
        ("03", "Enterprise Integration", GREEN,
         "UAIS model hosting, MongoDB NoSQL, MCP tool servers for enterprise APIs, Event Grid for async integrations"),
        ("04", "Robustness & Scaling", ORANGE,
         "Stateful long-running workflows with checkpointing; auto-scaling for billions of claims/year; resilience to failures"),
        ("05", "Security & Compliance", RGBColor(0xE0, 0x60, 0x60),
         "Zero-trust Entra ID auth; Key Vault secrets; HIPAA compliance; PHI/PII redaction; human oversight for denials"),
    ]
    pw = Inches(2.25)
    ph = Inches(4.8)
    pgap = Inches(0.2)
    py = Inches(1.4)
    for i, (num, title, accent, desc) in enumerate(pillars):
        px = LEFT_MARGIN + i * (pw + pgap)
        # card
        card = sl.shapes.add_shape(1, px, py, pw, ph)
        card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
        # top accent
        strip = sl.shapes.add_shape(1, px, py, pw, Inches(0.04))
        strip.fill.solid(); strip.fill.fore_color.rgb = accent
        strip.line.fill.background()
        # number
        tb = sl.shapes.add_textbox(px + Inches(0.15), py + Inches(0.15), Inches(0.5), Inches(0.4))
        r = tb.text_frame.paragraphs[0].add_run(); r.text = num
        _set_font(r, size=22, bold=True, color=accent)
        # pillar title
        tb2 = sl.shapes.add_textbox(px + Inches(0.15), py + Inches(0.6), pw - Inches(0.3), Inches(0.5))
        tf2 = tb2.text_frame; tf2.word_wrap = True
        r2 = tf2.paragraphs[0].add_run(); r2.text = title
        _set_font(r2, size=12, bold=True, color=WHITE)
        # desc
        tb3 = sl.shapes.add_textbox(px + Inches(0.15), py + Inches(1.2), pw - Inches(0.3), Inches(3.0))
        tf3 = tb3.text_frame; tf3.word_wrap = True
        r3 = tf3.paragraphs[0].add_run(); r3.text = desc
        _set_font(r3, size=10, color=LIGHT_GRAY)

    _notes(sl, "These five requirements guided architecture choices. The orchestrator acts as a conductor that breaks down requests into tasks and delegates to the right agents. We standardize on MongoDB (Optum enterprise standard) and UAIS for model access. UnitedHealth processes over 5 billion claims/year. A Responsible AI Board (20-25 members) defines policies enforced in code.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 4  — Architecture Overview
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Global Orchestrator Architecture — Overview",
               "Two-tier orchestration with three logical planes")

    _add_body_text(sl, [
        "Two-Tier Orchestration:",
        "▸ Global Orchestrator (central brain) + Domain Agents/Orchestrators (specialists)",
        "▸ Global layer: cross-domain workflows & policies; Domain: specialized tasks",
        "",
        "LangGraph Orchestration Engine:",
        "▸ Graph-based framework — stateful, multi-agent with custom control flows",
        "▸ Dynamic branching, parallel execution, durable state, fault recovery",
        "",
        "Agent-to-Agent (A2A) Protocol:",
        "▸ Common HTTP interface with self-describing Agent Card",
        "▸ Dynamic discovery via capability matching + confidence scoring",
    ], top=CONTENT_TOP, left=LEFT_MARGIN, width=Inches(5.5))

    # Right side — three planes as stacked cards
    planes = [
        ("Model Plane", ACCENT_BLUE, "LLM access via UAIS (Azure OpenAI)\nContent filtering • cost-aware routing"),
        ("Tool Plane", ACCENT_CYAN, "Enterprise APIs via MCP connectors\nStandard interface for DBs, SaaS, services"),
        ("Agent Plane", GREEN, "Domain + Platform Agents in containers\nCommunicating via A2A through orchestrator"),
    ]
    ry = Inches(1.3)
    for label, accent, desc in planes:
        card = sl.shapes.add_shape(1, Inches(6.5), ry, Inches(6.0), Inches(1.2))
        card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
        strip = sl.shapes.add_shape(1, Inches(6.5), ry, Inches(0.06), Inches(1.2))
        strip.fill.solid(); strip.fill.fore_color.rgb = accent
        strip.line.fill.background()
        tb = sl.shapes.add_textbox(Inches(6.75), ry + Inches(0.08), Inches(5.5), Inches(0.3))
        r = tb.text_frame.paragraphs[0].add_run(); r.text = label
        _set_font(r, size=13, bold=True, color=accent)
        tb2 = sl.shapes.add_textbox(Inches(6.75), ry + Inches(0.42), Inches(5.5), Inches(0.7))
        tf2 = tb2.text_frame; tf2.word_wrap = True
        r2 = tf2.paragraphs[0].add_run(); r2.text = desc
        _set_font(r2, size=10, color=LIGHT_GRAY)
        ry += Inches(1.4)

    # Memory card
    card = sl.shapes.add_shape(1, Inches(6.5), ry, Inches(6.0), Inches(1.4))
    card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
    card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
    strip = sl.shapes.add_shape(1, Inches(6.5), ry, Inches(0.06), Inches(1.4))
    strip.fill.solid(); strip.fill.fore_color.rgb = ORANGE
    strip.line.fill.background()
    tb = sl.shapes.add_textbox(Inches(6.75), ry + Inches(0.08), Inches(5.5), Inches(0.3))
    r = tb.text_frame.paragraphs[0].add_run(); r.text = "Unified Memory Store"
    _set_font(r, size=13, bold=True, color=ORANGE)
    tb2 = sl.shapes.add_textbox(Inches(6.75), ry + Inches(0.42), Inches(5.5), Inches(0.9))
    tf2 = tb2.text_frame; tf2.word_wrap = True
    r2 = tf2.paragraphs[0].add_run()
    r2.text = "Redis for sub-ms working memory\nMongoDB for persistent state & Agent Registry\nVector DB / MongoDB vector indexing for RAG"
    _set_font(r2, size=10, color=LIGHT_GRAY)

    _notes(sl, "The Global Orchestrator is the 'air traffic controller' for all agent activities. LangGraph represents the workflow as a directed graph. A2A communication is standardized via AgentCards. The orchestrator contains an Agent Registry backed by MongoDB. Dynamic discovery means new agents can be plugged in at any time.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 5  — Azure Integration
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Azure Integration & Cloud Services",
               "Mapping architecture to Azure and enterprise technologies")

    headers = ["Service Area", "Technology", "Purpose"]
    rows = [
        ["Orchestrator Hosting", "AKS / Azure Container Apps", "Auto-scaling, HA, isolation for LangGraph orchestrator & agents"],
        ["Data & State", "MongoDB (Atlas / Cosmos MongoAPI)", "Agent/Tool Registry, conversation logs, long-term memory"],
        ["Fast Memory", "Azure Cache for Redis", "Sub-ms in-memory session context, ephemeral state"],
        ["Model Serving", "Azure OpenAI via UAIS", "GPT-4, GPT-3.5 with Managed Identity, content filters"],
        ["Enterprise Tools", "MCP Servers on Functions/ACA", "Wrap enterprise APIs (claims, EHR, billing) via APIM gateway"],
        ["Event Processing", "Azure Event Grid / Service Bus", "Async triggers (New Claim, Lab Results, Discharge events)"],
        ["Security & Secrets", "Azure Key Vault + Entra ID", "Managed identities, least-privilege secrets, zero-trust"],
        ["Observability", "Azure Monitor + App Insights", "OpenTelemetry tracing; Arize Phoenix for LLM monitoring"],
    ]
    cw = [Inches(2.2), Inches(3.5), Inches(6.4)]
    _add_table_rows(sl, headers, rows, col_widths=cw)
    _footer(sl, "All infrastructure aligned with Optum enterprise standards  •  MongoDB replaces Cosmos DB for NoSQL workloads")
    _notes(sl, "MongoDB aligns with Optum's enterprise practice. UAIS integrates Azure OpenAI with consistent policy enforcement. MCP servers are deployed as microservice connectors fronted by APIM. Event Grid enables reactive agent workflows. All service-to-service calls use Entra ID tokens.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 6  — LangGraph vs MAF
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "LangGraph vs Microsoft Agent Framework (MAF)",
               "Framework selection rationale for the Global Orchestrator engine")

    headers = ["Dimension", "LangGraph", "MAF (v1.0)", "Decision"]
    rows = [
        ["Maturity", "Mature, MIT-licensed, production-proven", "New v1.0 — improving rapidly", "LangGraph ✓"],
        ["Control Granularity", "Custom graph: nodes, branches, parallel", "WorkflowBuilder DAG", "LangGraph ✓"],
        ["Durable Execution", "Built-in checkpointing & recovery", "Workflow checkpoints", "Comparable"],
        ["Human-in-the-Loop", "Native interrupts + state edits", "First-class support", "Comparable"],
        ["Enterprise Observability", "Requires LangSmith / custom", "Native OTel + Azure Monitor", "MAF ✓"],
        ["Managed Identity / RBAC", "Manual integration", "Native platform-level", "MAF ✓"],
        ["A2A Interoperability", "Framework-agnostic, open protocols", "Best with MS agents (v1.0)", "LangGraph ✓"],
        ["Foundry Hosting", "Runs natively alongside MAF", "Native Foundry support", "Both ✓"],
        ["Compliance Logging", "Custom-built audit trail", "Native workflow hooks", "MAF ✓"],
        ["Multi-Agent Flexibility", "Low friction for complex scenarios", "More boilerplate in v1.0", "LangGraph ✓"],
    ]
    cw = [Inches(2.4), Inches(3.6), Inches(3.2), Inches(2.9)]
    _add_table_rows(sl, headers, rows, row_h=Inches(0.44), col_widths=cw)
    _footer(sl, "LangGraph selected for flexibility & maturity  •  MAF enterprise strengths rebuilt as platform capabilities  •  Both run on Azure Foundry")
    _notes(sl, "We evaluated MAF and LangGraph. MAF merges Semantic Kernel and AutoGen but requires significant setup ceremony for multi-agent scenarios. LangGraph is more mature, open-source (MIT), and offers fine-grained control. Choosing LangGraph doesn't sacrifice Azure compatibility — Foundry supports multiple frameworks. MAF's strengths are rebuilt as platform capabilities.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 7  — Platform AI Agents
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Platform AI Agents — Cross-Cutting Services",
               "Six specialized agents forming the platform operating system")

    agents_left = [
        ("Onboarding Agent", ACCENT_BLUE, [
            "▸ Automates agent/tool intake: validation, metadata, registry",
            "▸ Triggers infra provisioning, credentials, CI/CD templates",
            "▸ Reduces onboarding from weeks → hours",
        ]),
        ("Security & Governance", RGBColor(0xE0, 0x60, 0x60), [
            "▸ Scans plans/prompts for PHI, PII, disallowed content",
            "▸ Integrates Azure OpenAI content filters + Optum baselines",
            "▸ Audit logging and Responsible AI board reporting",
        ]),
        ("Observability Agent", ORANGE, [
            "▸ Aggregates Azure Monitor + Arize Phoenix telemetry",
            "▸ Detects anomalies (error spikes, model drift)",
            "▸ Auto-scales resources on threshold breaches",
        ]),
    ]
    agents_right = [
        ("Evaluation Agent", GREEN, [
            "▸ Continuous quality assessment with configurable metrics",
            "▸ LLM-as-a-judge (accuracy, relevance, toxicity, bias)",
            "▸ A/B tests, regression tests on new versions",
        ]),
        ("Developer Productivity", ACCENT_CYAN, [
            "▸ AI pair-programmer: templates, troubleshooting, Q&A",
            "▸ Reviews PRs for coding/security standards",
            "▸ Aligned with 20K UHG engineers using AI assistance",
        ]),
        ("Lifecycle Management", RGBColor(0xBB, 0x86, 0xFC), [
            "▸ Semantic versioning, canary deployments, rollbacks",
            "▸ Traffic routing: 5% → 25% → 50% → 100%",
            "▸ 90-day deprecation notices, auto-decommissioning",
        ]),
    ]

    for col, agents in enumerate([agents_left, agents_right]):
        cx = LEFT_MARGIN if col == 0 else Inches(6.7)
        cw_card = Inches(5.7)
        cy = Inches(1.3)
        for name, accent, bullets in agents:
            card = sl.shapes.add_shape(1, cx, cy, cw_card, Inches(1.7))
            card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
            card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
            strip = sl.shapes.add_shape(1, cx, cy, cw_card, Inches(0.04))
            strip.fill.solid(); strip.fill.fore_color.rgb = accent
            strip.line.fill.background()
            tb = sl.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.12), cw_card - Inches(0.4), Inches(0.3))
            r = tb.text_frame.paragraphs[0].add_run(); r.text = name
            _set_font(r, size=13, bold=True, color=accent)
            _add_body_text(sl, bullets,
                           top=cy + Inches(0.48), left=cx + Inches(0.2),
                           width=cw_card - Inches(0.4), font_size=10)
            cy += Inches(1.9)

    _notes(sl, "The platform provides six platform-focused AI agents that act as the 'operating system'. Onboarding Agent orchestrates deployment. Security & Governance Agent enforces compliance. Observability Agent monitors telemetry. Evaluation Agent assesses quality. Developer Productivity Agent boosts adoption. Lifecycle Management Agent coordinates versioning.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 8  — Onboarding Workflow
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Automated Onboarding Workflow",
               "7-stage pipeline: submission to production in hours, not weeks")

    headers = ["Stage", "Step", "Actions", "Gate / Output"]
    rows = [
        ["1", "Submission", "Developer submits code + metadata via portal/CLI/CI", "Package received"],
        ["2", "Validation", "Schema checks, dependency audit, security scanning", "Pass/Fail + feedback"],
        ["3", "Registration", "Register in Agent/Tool Registry (MongoDB)", "AgentCard created"],
        ["4", "Approval Gate", "Route to Security / Responsible AI reviewers", "Human sign-off"],
        ["5", "Provisioning", "Allocate AKS/ACA, configure Key Vault, APIM routing", "Infrastructure ready"],
        ["6", "Integration Test", "Automated test suite + Evaluation Agent checks", "Test report"],
        ["7", "Deployment", "Canary rollout (5% → 25% → 100%); mark active", "Live in production"],
    ]
    cw = [Inches(0.8), Inches(1.7), Inches(5.3), Inches(4.3)]
    _add_table_rows(sl, headers, rows, row_h=Inches(0.62), col_widths=cw)
    _footer(sl, "Onboarding Agent provides real-time status updates  •  Human approval gates only for sensitive/production agents")
    _notes(sl, "The Onboarding Agent orchestrates the entire pipeline. Step 1: Developer submits via web portal or CI/CD trigger. Step 2: Automated validation. Step 3: Registration in MongoDB. Step 4: Human approval via LangGraph HITL. Step 5: Infrastructure provisioning via IaC. Step 6: Integration testing. Step 7: Canary deployment with progressive traffic increase.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 9  — Lifecycle Management
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Ongoing Lifecycle Management",
               "Versioning, canary releases, rollback, and retirement")

    _add_body_text(sl, [
        "Versioning & Coexistence:",
        "▸ Semantic versioning (MAJOR.MINOR.PATCH) for every agent and tool",
        "▸ Multiple versions run concurrently for backward compatibility",
        "▸ Agent Registry tracks version metadata and allowed contract changes",
        "",
        "Canary Releases:",
        "▸ New versions deployed as parallel instances with limited traffic",
        "▸ Orchestrator + Lifecycle Agent direct traffic: 5% → 25% → 50% → 100%",
        "▸ Evaluation Agent monitors quality metrics throughout rollout",
        "",
        "Automated Rollback:",
        "▸ Regressions detected → instant rollback to stable version",
        "▸ Azure Container Apps revision management enables near-instant swap",
    ], top=CONTENT_TOP, left=LEFT_MARGIN, width=Inches(5.5))

    _add_body_text(sl, [
        "Audit Trails & Logging:",
        "▸ Every action logged: timestamps, I/O, model versions, tool calls",
        "▸ Stored to MongoDB + Arize Phoenix for compliance & debugging",
        "▸ Complete provenance for each version of each agent",
        "",
        "Retirement & Reuse:",
        "▸ 90-day deprecation notices to dependent teams",
        "▸ Auto-decommissioning of containers after sunset period",
        "▸ Library of Declarative Plan Templates for cloning/extending",
        "",
        "Continuous Evolution:",
        "▸ Knowledge from one team's innovation shared across platform",
        "▸ Template library grows via contributions and validations",
        "▸ Network effect: each new agent makes the next project faster",
    ], top=CONTENT_TOP, left=Inches(6.5), width=Inches(6.0))

    _notes(sl, "We require semver for every update. Agent Registry stores backward-compatibility info. Canary deployments route small percentage of traffic initially. Lifecycle Agent leverages Evaluation Agent signals. Azure Container Apps supports instant revision switching. 90-day deprecation windows give teams time to migrate.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 10 — Observability & Evaluation
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Observability & Evaluation — Arize Phoenix",
               "LLM-specific monitoring, tracing, and automated quality measures")

    quads = [
        ("Arize Phoenix for LLM Ops", ACCENT_BLUE, [
            "▸ Open-source AI observability (2.5M+ monthly downloads)",
            "▸ Self-hosted on Azure — HIPAA compliant, data stays internal",
            "▸ Rich LLM tracing and evaluation capabilities",
        ]),
        ("OpenTelemetry Tracing", ACCENT_CYAN, [
            "▸ Every agent/tool instrumented with OTel",
            "▸ Phoenix reconstructs decision paths: prompts → tools → responses",
            "▸ 'Flight recorder' for every AI interaction",
        ]),
        ("Automated Quality Measures", GREEN, [
            "▸ LLM-as-a-judge: GPT-4 scores accuracy, relevance, toxicity",
            "▸ Embedding-based drift detection for concept shifts",
            "▸ Evaluation templates for clinical accuracy, retrieval consistency",
        ]),
        ("Real-Time Dashboards & Alerts", ORANGE, [
            "▸ Live metrics: success rate, latency, token usage",
            "▸ Correlates Phoenix LLM + Azure Monitor infra metrics",
            "▸ Auto-alerts on threshold breaches and anomalies",
        ]),
    ]
    positions = [
        (LEFT_MARGIN, Inches(1.3)),
        (Inches(6.7), Inches(1.3)),
        (LEFT_MARGIN, Inches(4.3)),
        (Inches(6.7), Inches(4.3)),
    ]
    for (label, accent, bullets), (qx, qy) in zip(quads, positions):
        qw = Inches(5.7)
        qh = Inches(2.6)
        card = sl.shapes.add_shape(1, qx, qy, qw, qh)
        card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
        strip = sl.shapes.add_shape(1, qx, qy, qw, Inches(0.04))
        strip.fill.solid(); strip.fill.fore_color.rgb = accent
        strip.line.fill.background()
        tb = sl.shapes.add_textbox(qx + Inches(0.2), qy + Inches(0.12), qw - Inches(0.4), Inches(0.3))
        r = tb.text_frame.paragraphs[0].add_run(); r.text = label
        _set_font(r, size=13, bold=True, color=accent)
        _add_body_text(sl, bullets,
                       top=qy + Inches(0.5), left=qx + Inches(0.2),
                       width=qw - Inches(0.4), font_size=10)

    _notes(sl, "Arize Phoenix is our AI-focused observability platform. Self-hosted on Azure for data privacy. Integrates with OpenTelemetry to capture model prompts, tool invocations, and agent decisions. LLM-as-a-judge uses models to score outputs. Embedding analysis detects concept drift. Observability Agent compiles metrics and auto-alerts on anomalies.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 11 — Discoverability & Compliance
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Agent Discoverability, Reuse & Compliance",
               "Registry, dynamic routing, plan templates, and governance metadata")

    items = [
        ("Agent Registry (Meta-Store)", ACCENT_BLUE,
         "Centralized MongoDB store of AgentCards — name, version, owner, endpoint, capability tags. "
         "Single source of truth; enables discovery by capability."),
        ("Dynamic Routing by Capability", ACCENT_CYAN,
         "Dynamic Skill Resolver queries registry at runtime. Capability-based routing with confidence scoring. "
         "Cross-domain reuse: 'translate text' agent built for billing used by prior-auth workflow."),
        ("Declarative Plan Templates", GREEN,
         "Pre-defined YAML/JSON workflow blueprints for common RCM processes. "
         "Sharable, version-controlled, customizable. Orchestrator loads and executes directly as LangGraph workflows."),
        ("Governance & Compliance Tagging", ORANGE,
         "Agents carry metadata: data categories, Responsible AI policies. "
         "Security Agent cross-references tags with organizational policies. Compliance is declarative."),
        ("AI Marketplace Portal", RGBColor(0xBB, 0x86, 0xFC),
         "Search Agent/Tool Registry by keywords and filters. Shows lineage, audit info, evaluation scores, "
         "certification status. Transparency drives trust and adoption."),
    ]
    iy = Inches(1.3)
    for label, accent, desc in items:
        card = sl.shapes.add_shape(1, LEFT_MARGIN, iy, BODY_WIDTH, Inches(1.05))
        card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
        strip = sl.shapes.add_shape(1, LEFT_MARGIN, iy, Inches(0.06), Inches(1.05))
        strip.fill.solid(); strip.fill.fore_color.rgb = accent
        strip.line.fill.background()
        tb = sl.shapes.add_textbox(LEFT_MARGIN + Inches(0.25), iy + Inches(0.08), Inches(11), Inches(0.3))
        r = tb.text_frame.paragraphs[0].add_run(); r.text = label
        _set_font(r, size=13, bold=True, color=accent)
        tb2 = sl.shapes.add_textbox(LEFT_MARGIN + Inches(0.25), iy + Inches(0.42), Inches(11.5), Inches(0.55))
        tf2 = tb2.text_frame; tf2.word_wrap = True
        r2 = tf2.paragraphs[0].add_run(); r2.text = desc
        _set_font(r2, size=10, color=LIGHT_GRAY)
        iy += Inches(1.2)

    _notes(sl, "The Agent Registry is a central catalog. Each AgentCard includes declared capabilities for smart routing. Orchestrator queries 'Who can handle task X?' and uses confidence scoring. Declarative Plan Templates can be executed directly by the orchestrator. Compliance metadata makes governance declarative. AI Marketplace portal enables discovery.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 12 — Expected Impact & Benefits
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Expected Impact & Benefits",
               "Technical and business outcomes from the Global Orchestrator platform")

    headers = ["Benefit Area", "Impact", "Supporting Evidence"]
    rows = [
        ["Faster Deployment", "Agent onboarding: weeks → hours", "Automated 7-stage pipeline replaces manual coordination"],
        ["Increased Reuse", "40–50% of new projects leverage existing agents", "Shared registries + plan templates create network effect"],
        ["Operational Efficiency", "20%+ productivity gains in claims processing", "Optum pilot data; AI catches errors and denials upfront"],
        ["Denial Reduction", "Significant reduction in avoidable denials", "~85% of claim denials preventable with right info"],
        ["Quality Assurance", "All agents vetted for fairness, bias, performance", "Continuous evaluation via Phoenix + LLM-as-a-judge"],
        ["Compliance", "Full audit trail; HIPAA-ready by design", "Every action logged with provenance; Responsible AI board"],
        ["Developer Productivity", "AI pair-programming for 20K+ engineers", "Developer Productivity Agent + platform templates"],
        ["Risk Mitigation", "Canary releases + instant rollback", "Lifecycle Agent monitors quality; auto-revert on regression"],
    ]
    cw = [Inches(2.4), Inches(4.0), Inches(5.7)]
    _add_table_rows(sl, headers, rows, row_h=Inches(0.56), col_widths=cw)
    _footer(sl, "The Global Orchestrator drives faster time-to-market, higher efficiency, better compliance, and an intelligent revenue cycle")
    _notes(sl, "Faster deployment — automated onboarding slashes timelines from 2-3 weeks to hours. Reuse creates network effects. AI-driven claim processing shows 20%+ productivity gains. No agent deploys without fairness, bias, and performance checks. 20,000 UHG engineers already using AI coding assistance; platform amplifies that.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 13 — Communication Design: Direct Calls vs Event Hub
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Communication Design — Direct Calls vs Event Hub",
               "How the Global Orchestrator communicates with Domain Orchestrators")

    # Left card — Direct Calls (Default)
    dc_x = LEFT_MARGIN; dc_y = Inches(1.3)
    dc_w = Inches(5.7); dc_h = Inches(5.5)
    card = sl.shapes.add_shape(1, dc_x, dc_y, dc_w, dc_h)
    card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
    card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
    strip = sl.shapes.add_shape(1, dc_x, dc_y, dc_w, Inches(0.04))
    strip.fill.solid(); strip.fill.fore_color.rgb = GREEN
    strip.line.fill.background()
    # Badge
    badge = sl.shapes.add_shape(1, dc_x + Inches(0.15), dc_y + Inches(0.15), Inches(1.2), Inches(0.3))
    badge.fill.solid(); badge.fill.fore_color.rgb = GREEN
    badge.line.fill.background()
    rb = badge.text_frame.paragraphs[0].add_run(); rb.text = "DEFAULT"
    _set_font(rb, size=9, bold=True, color=RGBColor(0x1B, 0x1B, 0x1B))
    badge.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    tb = sl.shapes.add_textbox(dc_x + Inches(1.5), dc_y + Inches(0.12), Inches(4), Inches(0.35))
    r = tb.text_frame.paragraphs[0].add_run(); r.text = "Direct Orchestrator-to-Orchestrator Calls"
    _set_font(r, size=14, bold=True, color=GREEN)
    _add_body_text(sl, [
        "Synchronous API, Asynchronous Behavior:",
        "▸ Global Orchestrator packages delegation envelope and invokes Domain endpoint",
        "▸ LangGraph's durable execution pauses global workflow while domain runs",
        "▸ No CPU consumed during wait — resumes on callback/completion",
        "",
        "Efficiency & Low Latency:",
        "▸ No extra hop or queuing overhead — near real-time for fast domains",
        "▸ Best for interactive processes or tight SLAs",
        "",
        "Non-Blocking & Durable:",
        "▸ State checkpointed to MongoDB; orchestrator can scale down during waits",
        "▸ Supports waits of hours/days (e.g., human approvals) without thread blocking",
        "",
        "Immediate Error Handling:",
        "▸ Error propagation is straightforward — synchronous feedback loop",
        "▸ Retry, fallback, escalation applied immediately in workflow logic",
    ], top=dc_y + Inches(0.55), left=dc_x + Inches(0.15), width=dc_w - Inches(0.3), font_size=10)

    # Right card — Event Hub (Optional)
    eh_x = Inches(6.7); eh_y = Inches(1.3)
    eh_w = Inches(5.7); eh_h = Inches(5.5)
    card2 = sl.shapes.add_shape(1, eh_x, eh_y, eh_w, eh_h)
    card2.fill.solid(); card2.fill.fore_color.rgb = BG_CARD
    card2.line.color.rgb = DIM_GRAY; card2.line.width = Pt(0.5)
    strip2 = sl.shapes.add_shape(1, eh_x, eh_y, eh_w, Inches(0.04))
    strip2.fill.solid(); strip2.fill.fore_color.rgb = ORANGE
    strip2.line.fill.background()
    badge2 = sl.shapes.add_shape(1, eh_x + Inches(0.15), eh_y + Inches(0.15), Inches(1.2), Inches(0.3))
    badge2.fill.solid(); badge2.fill.fore_color.rgb = ORANGE
    badge2.line.fill.background()
    rb2 = badge2.text_frame.paragraphs[0].add_run(); rb2.text = "OPTIONAL"
    _set_font(rb2, size=9, bold=True, color=RGBColor(0x1B, 0x1B, 0x1B))
    badge2.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    tb2 = sl.shapes.add_textbox(eh_x + Inches(1.5), eh_y + Inches(0.12), Inches(4), Inches(0.35))
    r2 = tb2.text_frame.paragraphs[0].add_run(); r2.text = "Azure Event Hub for Bursty Workloads"
    _set_font(r2, size=14, bold=True, color=ORANGE)
    _add_body_text(sl, [
        "Traffic Spikes & Burstiness:",
        "▸ Event Hub buffers domain task events durably during surges",
        "▸ Domain Orchestrators pull at own pace — absorbs thousands/min spikes",
        "▸ Global Orchestrator stays responsive, offloads work immediately",
        "",
        "Maximizing Parallelism:",
        "▸ Scalable fan-out via Event Hub partitions (millions of events/sec)",
        "▸ Domain instances auto-scale via KEDA, consuming partitions in parallel",
        "▸ Effectively unbounded horizontal scaling for domain processing",
        "",
        "Loose Coupling:",
        "▸ Fire-and-forget — Global doesn't need domain addresses or availability",
        "▸ Domain outage queues events instead of failing; independent scaling",
        "",
        "Trade-offs:",
        "▸ At-least-once delivery → requires idempotent domain handlers",
        "▸ Slightly higher latency; event-driven error handling adds complexity",
    ], top=eh_y + Inches(0.55), left=eh_x + Inches(0.15), width=eh_w - Inches(0.3), font_size=10)

    _notes(sl, "Direct orchestrator-to-orchestrator calls are the default and recommended pattern. LangGraph's durable execution allows the Global Orchestrator to call domain services without blocking. The state is persisted and paused while the domain workflow runs. Event Hub is an optional enhancement for scenarios with extreme concurrency or temporal decoupling. Event Hubs are designed for millions of events per second. The decision to add Event Hub should be made judiciously since it adds complexity.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 14 — Scaling to 100K Encounters — Decision Framework
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Scaling to 100K+ Daily Encounters",
               "When to use Direct Calls vs Event Hub — decision framework")

    headers = ["Dimension", "Direct Calls (Default)", "Event Hub (Optional)"]
    rows = [
        ["Latency", "Low — no queuing overhead", "Slightly higher — publish/consume cycle"],
        ["Throughput", "100K+/day via async I/O + scaling", "Unbounded — millions/sec via partitions"],
        ["Error Handling", "Synchronous — immediate feedback", "Event-driven — dead-letter + timeout logic"],
        ["Ordering", "Fully controlled by orchestrator", "Per-partition only; cross-partition unordered"],
        ["Coupling", "Orchestrator knows domain endpoints", "Fire-and-forget; loose coupling"],
        ["Complexity", "Simpler — fewer moving parts", "Higher — idempotency, correlation, DLQ"],
        ["Burst Absorption", "Scale-out domain instances", "Hub buffers spikes; KEDA auto-scales consumers"],
        ["Fault Tolerance", "Errors propagate immediately", "Events queue during domain downtime"],
    ]
    cw = [Inches(2.0), Inches(5.0), Inches(5.1)]
    bottom_y = _add_table_rows(sl, headers, rows, row_h=Inches(0.52), col_widths=cw)

    # Decision rule box
    box_y = bottom_y + Inches(0.2)
    box = sl.shapes.add_shape(1, LEFT_MARGIN, box_y, BODY_WIDTH, Inches(1.3))
    box.fill.solid(); box.fill.fore_color.rgb = BG_CARD
    box.line.color.rgb = ACCENT_BLUE; box.line.width = Pt(1)
    tb = sl.shapes.add_textbox(LEFT_MARGIN + Inches(0.2), box_y + Inches(0.08), BODY_WIDTH - Inches(0.4), Inches(0.3))
    r = tb.text_frame.paragraphs[0].add_run(); r.text = "Decision Rule"
    _set_font(r, size=12, bold=True, color=ACCENT_BLUE)
    _add_body_text(sl, [
        "▸ Start with direct calls — simpler, lower latency, sufficient for 100K+/day with auto-scaling instances",
        "▸ Add Event Hub only when: traffic spikes exceed instant processing capacity, or massive parallel fan-out is required",
        "▸ LangGraph's checkpointing + Redis/MongoDB state management ensures both modes are durable and non-blocking",
    ], top=box_y + Inches(0.38), left=LEFT_MARGIN + Inches(0.2), width=BODY_WIDTH - Inches(0.4), font_size=10)

    _notes(sl, "The platform can handle 100K+ daily encounters via direct calls because each orchestrator scales out with more instances under load, and each instance juggles many concurrent workflows through async I/O and state management. Event Hub remains an optional enhancement — deploy with the simpler direct model first, and only add messaging when it becomes necessary. This balanced approach meets current requirements while keeping the door open for future scalability refinements.")

    # ────────────────────────────────────────────────────────────
    # SLIDE 15 — Cross-Cutting: Error Handling, Observability, Ordering
    # ────────────────────────────────────────────────────────────
    sl = prs.slides.add_slide(blank)
    _add_title(sl, "Error Handling, Observability & Ordering",
               "Cross-cutting considerations for both communication patterns")

    # Three horizontal cards
    sections = [
        ("Error Handling", ACCENT_BLUE, RGBColor(0xE0, 0x60, 0x60), [
            ("Direct Calls", "Errors propagate naturally in call stack. Global Orchestrator has immediate awareness — "
             "can retry, fallback, or escalate to human intervention as part of workflow logic."),
            ("Event Hub", "Domain Orchestrator emits completion event with result or error status. Global workflow "
             "must handle 'failure' messages or timeouts. Domain services are designed highly reliable with "
             "internal retries — critical failures surface via 'failure result' events."),
        ]),
        ("Observability & Trace IDs", ACCENT_CYAN, ACCENT_CYAN, [
            ("Direct Calls", "Trace context flows with HTTP/gRPC request via standard distributed tracing. "
             "Unified timeline in Application Insights or Arize Phoenix across all steps."),
            ("Event Hub", "Trace ID propagated within event payload/headers. OTel libraries handle correlation. "
             "Azure tooling monitors queue length, ingestion rate, and processing lag with auto-alerts."),
        ]),
        ("Message Ordering", GREEN, ORANGE, [
            ("Direct Calls", "Fully controlled — Global Orchestrator enforces strict sequential flow "
             "among domains when needed (e.g., call Domain A then Domain B)."),
            ("Event Hub", "Per-partition ordering only; cross-partition is async and out-of-order. "
             "In RCM context, most encounters route to one primary domain — inter-domain ordering typically not a concern."),
        ]),
    ]
    sy = Inches(1.25)
    for title_text, accent, _, items in sections:
        card = sl.shapes.add_shape(1, LEFT_MARGIN, sy, BODY_WIDTH, Inches(1.75))
        card.fill.solid(); card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = DIM_GRAY; card.line.width = Pt(0.5)
        strip = sl.shapes.add_shape(1, LEFT_MARGIN, sy, BODY_WIDTH, Inches(0.04))
        strip.fill.solid(); strip.fill.fore_color.rgb = accent
        strip.line.fill.background()
        tb = sl.shapes.add_textbox(LEFT_MARGIN + Inches(0.2), sy + Inches(0.1), Inches(4), Inches(0.3))
        r = tb.text_frame.paragraphs[0].add_run(); r.text = title_text
        _set_font(r, size=13, bold=True, color=accent)
        # Two sub-sections side by side
        for si, (sub_label, sub_desc) in enumerate(items):
            sx = LEFT_MARGIN + Inches(0.2) + si * Inches(6.0)
            sw = Inches(5.6)
            tb_l = sl.shapes.add_textbox(sx, sy + Inches(0.45), sw, Inches(0.25))
            rl = tb_l.text_frame.paragraphs[0].add_run(); rl.text = sub_label
            _set_font(rl, size=10, bold=True, color=WHITE)
            tb_d = sl.shapes.add_textbox(sx, sy + Inches(0.7), sw, Inches(0.9))
            tf_d = tb_d.text_frame; tf_d.word_wrap = True
            rd = tf_d.paragraphs[0].add_run(); rd.text = sub_desc
            _set_font(rd, size=9, color=LIGHT_GRAY)
        sy += Inches(2.0)

    _footer(sl, "Both patterns maintain end-to-end traceability via OpenTelemetry trace_id propagation  •  A2A framework supports direct calls and message-based invocation")
    _notes(sl, "Error handling: direct calls give synchronous feedback; Event Hub requires event-driven handling with failure events. Observability: trace IDs propagate in both models — direct via HTTP headers, Event Hub via event payload/headers. Ordering: direct calls give full control; Event Hub provides per-partition ordering only, but most RCM encounters route to a single domain orchestrator so cross-domain ordering is rarely needed.")

    # ── save ────────────────────────────────────────────────────
    prs.save(OUTPUT)
    print(f"✓ Created {len(prs.slides)} slides (dark theme) → {OUTPUT}")


if __name__ == "__main__":
    main()
