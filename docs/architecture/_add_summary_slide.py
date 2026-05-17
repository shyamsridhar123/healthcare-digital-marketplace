"""
Add a 180-day capability summary slide (no sprint sequencing) to sequence-diagrams-v3.pptx.
Insert after the existing 180-Day Roadmap slide (Slide 7).
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

SRC = "docs/sequence-diagrams-v3.pptx"
DST = "docs/sequence-diagrams-v3.pptx"

BG_COLOR       = RGBColor(0x1E, 0x1E, 0x2E)
TITLE_COLOR    = RGBColor(0xFF, 0xFF, 0xFF)
SUBTITLE_COLOR = RGBColor(0xA0, 0xA0, 0xB0)
HEADING_COLOR  = RGBColor(0x64, 0xB5, 0xF6)
BODY_COLOR     = RGBColor(0xE0, 0xE0, 0xE0)
RED_ACCENT     = RGBColor(0xFF, 0x52, 0x52)
DIM_COLOR      = RGBColor(0x90, 0x90, 0x9A)


def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_text(slide, left, top, width, height, text,
             size=Pt(14), bold=False, color=BODY_COLOR, align=PP_ALIGN.LEFT):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tb.text_frame.word_wrap = True
    p = tb.text_frame.paragraphs[0]
    p.text = text
    p.alignment = align
    r = p.runs[0]
    r.font.name = "Calibri"
    r.font.size = size
    r.font.bold = bold
    r.font.color.rgb = color
    return tb


def add_layer_block(slide, left, top, width, layer_name, items):
    """Add a layer heading + bullet items. Returns the y after the block."""
    add_text(slide, left, top, width, Pt(16),
             layer_name, size=Pt(11), bold=True, color=HEADING_COLOR)
    y = top + Pt(17)
    for cap, desc in items:
        add_text(slide, left + Inches(0.1), y, width - Inches(0.1), Pt(14),
                 "▸ %s — %s" % (cap, desc), size=Pt(9), bold=False, color=BODY_COLOR)
        y += Pt(13)
    return y + Pt(4)


def main():
    prs = Presentation(SRC)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, BG_COLOR)

    W = prs.slide_width
    M = Inches(0.5)
    CW = W - 2 * M

    # Title
    add_text(slide, M, Inches(0.15), CW, Inches(0.4),
             "Summary of Capabilities — Next 180 Days",
             size=Pt(22), bold=True, color=TITLE_COLOR)
    add_text(slide, M, Inches(0.52), CW, Inches(0.25),
             "22 capabilities across 4 layers targeted for implementation (red-boxed on Slide 4)",
             size=Pt(11), bold=False, color=SUBTITLE_COLOR)

    # Divider
    ln = slide.shapes.add_connector(1, M, Inches(0.82), W - M, Inches(0.82))
    ln.line.color.rgb = RED_ACCENT
    ln.line.width = Pt(1.5)

    # Two columns
    col_w = Inches(5.9)
    col1 = M
    col2 = M + col_w + Inches(0.4)

    # ── LEFT COLUMN ──
    y = Inches(0.95)

    y = add_layer_block(slide, col1, y, col_w,
        "LAYER 1 — Presentation & UX", [
            ("Visual Orchestration Canvas", "Drag-and-drop workflow composition with React Flow"),
            ("Admin Dashboard", "Governance console — health, submissions, approvals, policy violations"),
            ("Publisher Portal", "End-to-end asset submission lifecycle: draft → submit → review → publish"),
            ("Playground", "Interactive sandbox to test agents and tools before deployment"),
            ("DevUI", "Microsoft Agent Framework debugging and prompt tuning surface"),
        ])

    y = add_layer_block(slide, col1, y, col_w,
        "LAYER 2 — API & Registries", [
            ("Asset Catalog", "CRUD + versioning for agents, MCP servers, tools, models, skills"),
            ("MCP Server & Tool Registry", "Register/discover MCP endpoints with auth, schemas, health"),
            ("Agent Skills Registry", "Versioned, governed skill definitions discoverable across workflows"),
            ("Publisher & Submission API", "Validates metadata/packages, drives review queue and approval states"),
            ("Security Scanner", "Static + runtime scanning — risky patterns, missing metadata, dependency checks"),
        ])

    # ── RIGHT COLUMN ──
    y2 = Inches(0.95)

    y2 = add_layer_block(slide, col2, y2, col_w,
        "LAYER 3 — Orchestration & Governance", [
            ("Workflow Templates", "Reusable orchestration blueprints with node structures and approval steps"),
            ("Execution Engine", "Graph interpreter — dispatches to agents/tools/models, retries, fan-out/fan-in"),
            ("Human-in-the-Loop Gate", "Pauses automation for manual review; captures decision provenance"),
            ("IAM & RBAC", "Entra ID + Managed Identity — role-based view/submit/approve/execute/admin access"),
            ("Compensation Logic (Saga)", "Multi-step rollback coordination for distributed workflows"),
        ])

    y2 = add_layer_block(slide, col2, y2, col_w,
        "LAYER 4 — Data & Observability", [
            ("Audit Log", "Immutable records in Cosmos DB with TTL — who did what, when, outcome"),
            ("Metrics & OTLP", "OpenTelemetry → App Insights — counters, latency, failure rates, cost"),
            ("Projects & Workspace", "Team-owned work areas with saved workflows, drafts, collaboration"),
            ("Ratings & Reviews", "Community quality signals for discovery ranking and publisher feedback"),
            ("Execution History", "Run outcomes, inputs/outputs, trace IDs for debugging and audit"),
        ])

    # ── Bottom note ──
    y_bottom = Inches(6.6)
    ln2 = slide.shapes.add_connector(1, M, y_bottom, W - M, y_bottom)
    ln2.line.color.rgb = DIM_COLOR
    ln2.line.width = Pt(1)
    add_text(slide, M, y_bottom + Inches(0.06), CW, Inches(0.25),
             "Not in scope:  Web Dashboard (already shipping)  ·  Layer 5 Azure Services (provisioned via Bicep IaC independently)",
             size=Pt(9), bold=False, color=DIM_COLOR, align=PP_ALIGN.CENTER)

    # Move to after Slide 7 (0-based index 7)
    sld_list = prs.slides._sldIdLst
    el = sld_list[-1]
    sld_list.remove(el)
    sld_list.insert(7, el)

    prs.save(DST)

    # Verify
    prs2 = Presentation(DST)
    print("Total slides:", len(prs2.slides))
    for i, s in enumerate(prs2.slides):
        if i < 12:
            texts = []
            for sh in s.shapes:
                if sh.has_text_frame:
                    for p in sh.text_frame.paragraphs:
                        t = p.text.strip()
                        if t:
                            texts.append(t)
                            break
                    if texts:
                        break
            title = texts[0] if texts else "(no text)"
            marker = " <-- NEW" if "Summary of Capabilities" in title else ""
            print("  Slide %d: %s%s" % (i + 1, title[:75], marker))


if __name__ == "__main__":
    main()
