"""
Add explanation slides after slides 2, 3, 4, and 5 in sequence-diagrams-v2.pptx.
Each new slide explains the diagram on the preceding slide.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from copy import deepcopy
from lxml import etree
import os

SRC = os.path.join(os.path.dirname(__file__), "sequence-diagrams-v2.pptx")
DST = os.path.join(os.path.dirname(__file__), "sequence-diagrams-v3.pptx")

# ── Explanation content for each diagram slide ────────────────────────────
EXPLANATIONS = {
    2: {
        "title": "Slide 2 Explained — Unified Platform (UAP, UAIS, UDP)",
        "subtitle": "What the diagram shows",
        "bullets": [
            ("Unified AI Platform (UAP)",
             "The overarching platform that ties together all AI capabilities — asset catalog, orchestration, "
             "governance, and developer experience — into a single, cohesive surface for enterprise teams."),
            ("Unified AI Integration Services (UAIS)",
             "A middleware layer that normalises access to Azure AI Foundry, Azure OpenAI, MCP servers, "
             "and A2A agents. It provides consistent authentication (Entra ID), retry/circuit-breaker "
             "policies, and telemetry collection so every upstream consumer sees the same contract."),
            ("Unified Data Platform (UDP)",
             "The persistence and observability backbone. Cosmos DB (partitioned by tenantId) stores catalog "
             "metadata, workflow state, execution history, and audit logs. Application Insights + Azure Monitor "
             "supply real-time metrics, distributed traces, and alerting."),
            ("How they connect",
             "End users interact through the UAP presentation layer → which calls UAIS APIs for AI operations "
             "→ which persist and retrieve data from the UDP. This three-tier split enables independent scaling, "
             "governance boundaries, and team ownership."),
        ],
    },
    3: {
        "title": "Slide 3 Explained — AI Platform Solution Architecture",
        "subtitle": "How the components fit together",
        "bullets": [
            ("Presentation Layer",
             "Next.js 15 frontend served from Azure Container Apps. Includes the Marketplace catalog, "
             "Visual Orchestration canvas (React Flow), Publisher Portal, Admin Dashboard, and Playground. "
             "Azure Front Door provides edge caching and global routing."),
            ("API & Registry Layer",
             "Azure Functions v4 (Node.js/TypeScript) expose RESTful APIs: Asset Catalog CRUD, "
             "MCP Server Registry, A2A Agent Registry, Skills Registry, Publisher Submission API, "
             "and Security Scanner. Each registry stores data in Cosmos DB with tenantId partition key."),
            ("Orchestration & Governance",
             "The Execution Engine interprets workflow graphs — dispatching calls to agents, tools, and models. "
             "The Policy Engine enforces guardrails (entitlements, risk ratings, budget). Human-in-the-Loop "
             "approval gates pause automation for manual review when risk is high."),
            ("Azure AI Services",
             "Azure AI Foundry hosts model deployments and agent runtimes. Azure OpenAI provides GPT endpoints. "
             "Azure AI Search powers semantic discovery across the catalog. All services integrate via "
             "Managed Identity for zero-secret authentication."),
            ("Data & Observability",
             "Cosmos DB is the single NoSQL store (2 MB item limit, hierarchical partition keys). "
             "Application Insights + Log Analytics capture distributed traces, custom metrics, and KQL-queryable "
             "logs. Redis Cache accelerates hot reads (sessions, lookup data)."),
        ],
    },
    4: {
        "title": "Slide 4 Explained — AI Platform Capabilities",
        "subtitle": "Capability map across five layers",
        "bullets": [
            ("Layer 1 — Presentation & UX",
             "Web Dashboard (catalog browse/search), Visual Orchestration (drag-and-drop workflow canvas), "
             "Admin Dashboard (governance & health), Publisher Portal (asset submission lifecycle), "
             "Playground (interactive agent/tool testing), DevUI (MAF agent debugging)."),
            ("Layer 2 — API & Registries",
             "Asset Catalog (CRUD + versioning), MCP Server & Tool Registry, A2A Agent Registry, "
             "Agent Skills Registry, Publisher & Submission API, Security Scanner (static/runtime validation), "
             "MCP Gateway Proxy (auth, policy, throttling for MCP access)."),
            ("Layer 3 — Orchestration & Governance",
             "Workflow Templates (reusable patterns), Execution Engine (graph interpretation, retries, fan-out), "
             "Policy Engine (allow/deny/require-review), HITL Approval Gate, IAM & RBAC (Entra ID + Managed Identity), "
             "Compensation Logic / Saga (multi-step rollback for distributed workflows)."),
            ("Layer 4 — Data & Observability",
             "Audit Log (immutable, TTL-managed in Cosmos DB), Metrics & OTLP (OpenTelemetry → App Insights), "
             "User Sessions, Projects & Workspaces, Ratings & Reviews, Execution History."),
            ("Layer 5 — Azure Services",
             "Azure Functions (serverless APIs + event handlers), Azure Container Apps (frontend + long-running services), "
             "Cosmos DB (tenant-partitioned NoSQL), Azure AI Foundry + OpenAI (model hosting), "
             "AI Search (semantic catalog discovery), Key Vault, Event Hubs, ADLS Gen 2."),
        ],
    },
    5: {
        "title": "Slide 5 Explained — AI Marketplace App Architecture",
        "subtitle": "Enterprise-grade deployment architecture",
        "bullets": [
            ("Edge & Identity",
             "Azure Front Door terminates TLS and routes traffic. Entra ID (via MSAL) authenticates users. "
             "Key Vault stores secrets, certificates, and signing keys. All inter-service auth uses "
             "Managed Identity — no secrets in code."),
            ("Compute Hosting",
             "The Next.js frontend runs on Azure Container Apps with auto-scaling revisions. "
             "Azure Functions v4 host the API layer — each registry and engine endpoint is a separate "
             "function app for independent scaling and deployment."),
            ("Data Tier — Cosmos DB",
             "Single Cosmos DB account, partitioned by tenantId for multi-tenant isolation. "
             "Hierarchical Partition Keys (HPK) prevent the 20 GB logical-partition limit. "
             "Embedded documents for co-accessed data; references for large or independently-updated fields. "
             "TTL policies auto-expire sessions and audit records."),
            ("AI Integration",
             "Azure AI Foundry project hosts agent deployments and model endpoints. "
             "Azure OpenAI provides GPT-4o / GPT-4.1 completions for the Execution Engine and Playground. "
             "Azure AI Search indexes catalog metadata for hybrid (keyword + vector) search."),
            ("Observability",
             "Application Insights captures distributed traces across Functions and Container Apps. "
             "Azure Monitor aggregates metrics and triggers alerts. Log Analytics Workspace stores "
             "KQL-queryable logs for debugging and compliance reporting."),
        ],
    },
}

# ── Colours (dark slide style to match existing deck) ─────────────────────
BG_COLOR = RGBColor(0x1E, 0x1E, 0x2E)       # dark background
TITLE_COLOR = RGBColor(0xFF, 0xFF, 0xFF)     # white
SUBTITLE_COLOR = RGBColor(0xA0, 0xA0, 0xB0)  # muted grey
HEADING_COLOR = RGBColor(0x64, 0xB5, 0xF6)   # light blue accent
BODY_COLOR = RGBColor(0xE0, 0xE0, 0xE0)      # off-white
ACCENT_LINE = RGBColor(0x42, 0xA5, 0xF5)     # blue accent line
NUMBER_BG = RGBColor(0x42, 0xA5, 0xF5)       # blue circle bg


def add_bg(slide, color):
    """Set solid background fill on a slide."""
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_textbox(slide, left, top, width, height, text, font_name="Calibri",
                font_size=Pt(14), bold=False, color=BODY_COLOR, alignment=PP_ALIGN.LEFT):
    """Add a textbox with a single paragraph."""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = alignment
    run = p.runs[0]
    run.font.name = font_name
    run.font.size = font_size
    run.font.bold = bold
    run.font.color.rgb = color
    return txBox


def add_bullet_section(slide, left, top, width, heading, body, idx):
    """Add a heading + body pair for one bullet point."""
    # Heading
    add_textbox(slide, left, top, width, Pt(22),
                heading, font_size=Pt(15), bold=True, color=HEADING_COLOR)
    # Body
    add_textbox(slide, left, top + Pt(24), width, Pt(60),
                body, font_size=Pt(11), bold=False, color=BODY_COLOR)


def create_explanation_slide(prs, layout, info):
    """Build one explanation slide and return it."""
    slide = prs.slides.add_slide(layout)
    add_bg(slide, BG_COLOR)

    W = prs.slide_width
    MARGIN = Inches(0.6)
    CONTENT_W = W - 2 * MARGIN

    # ── Title ──
    add_textbox(slide, MARGIN, Inches(0.3), CONTENT_W, Inches(0.5),
                info["title"], font_size=Pt(24), bold=True, color=TITLE_COLOR)

    # ── Subtitle ──
    add_textbox(slide, MARGIN, Inches(0.75), CONTENT_W, Inches(0.35),
                info["subtitle"], font_size=Pt(14), bold=False, color=SUBTITLE_COLOR)

    # ── Divider line ──
    from pptx.util import Emu
    line = slide.shapes.add_connector(1, MARGIN, Inches(1.15), W - MARGIN, Inches(1.15))  # MSO_CONNECTOR_TYPE.STRAIGHT = 1
    line.line.color.rgb = ACCENT_LINE
    line.line.width = Pt(1.5)

    # ── Bullet sections ──
    bullets = info["bullets"]
    n = len(bullets)
    # Calculate layout: two columns if 4+ items, single column otherwise
    if n >= 4:
        col_w = (CONTENT_W - Inches(0.4)) // 2
        col1_left = MARGIN
        col2_left = MARGIN + col_w + Inches(0.4)
        per_col = (n + 1) // 2
        y_start = Inches(1.35)
        row_h = Inches(1.15)

        for idx, (heading, body) in enumerate(bullets):
            if idx < per_col:
                x = col1_left
                y = y_start + idx * row_h
            else:
                x = col2_left
                y = y_start + (idx - per_col) * row_h
            add_bullet_section(slide, x, y, col_w, heading, body, idx)
    else:
        y_start = Inches(1.35)
        row_h = Inches(1.5)
        for idx, (heading, body) in enumerate(bullets):
            add_bullet_section(slide, MARGIN, y_start + idx * row_h, CONTENT_W, heading, body, idx)

    return slide


def move_slide(prs, slide, new_position):
    """Move a slide to a new 0-based position in the slide list."""
    slide_list = prs.slides._sldIdLst
    slide_id_entry = None
    for sldId in slide_list:
        if sldId.get('id') is not None:
            # Match by rId
            pass
    # Use direct XML manipulation
    el = slide_list[-1]  # just-added slide is last
    slide_list.remove(el)
    slide_list.insert(new_position, el)


def main():
    prs = Presentation(SRC)
    blank_layout = prs.slide_layouts[6]  # Blank layout

    # We insert after slide 5, 4, 3, 2 (reverse order so indices stay stable)
    for slide_num in [5, 4, 3, 2]:
        info = EXPLANATIONS[slide_num]
        create_explanation_slide(prs, blank_layout, info)
        # Move from end to right after the diagram slide
        move_slide(prs, None, slide_num)  # 0-based insert position = slide_num (after slide_num which is 1-based)

    prs.save(DST)
    print(f"Saved {DST} with {len(prs.slides)} slides (was 36, now 40)")
    print("New explanation slides inserted after slides 2, 3, 4, and 5.")


if __name__ == "__main__":
    main()
