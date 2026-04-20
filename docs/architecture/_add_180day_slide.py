"""
Add a description slide after Slide 7 (AI Platform Capabilities - Explained)
in sequence-diagrams-v3.pptx. This new slide explains that red bounding boxes
on the capabilities diagram (Slide 6 in v3) indicate 180-day implementation targets.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import os

SRC = os.path.join("docs", "sequence-diagrams-v3.pptx")
DST = os.path.join("docs", "sequence-diagrams-v3.pptx")

# ── Colours (match existing dark slide style) ────────────────────────────
BG_COLOR       = RGBColor(0x1E, 0x1E, 0x2E)
TITLE_COLOR    = RGBColor(0xFF, 0xFF, 0xFF)
SUBTITLE_COLOR = RGBColor(0xA0, 0xA0, 0xB0)
HEADING_COLOR  = RGBColor(0x64, 0xB5, 0xF6)   # blue headings
BODY_COLOR     = RGBColor(0xE0, 0xE0, 0xE0)
ACCENT_LINE    = RGBColor(0x42, 0xA5, 0xF5)
RED_ACCENT     = RGBColor(0xFF, 0x52, 0x52)    # matches the red bounding boxes
SPRINT_GREEN   = RGBColor(0x66, 0xBB, 0x6A)
SPRINT_AMBER   = RGBColor(0xFF, 0xCA, 0x28)
SPRINT_BLUE    = RGBColor(0x42, 0xA5, 0xF5)
DIM_COLOR      = RGBColor(0x90, 0x90, 0x9A)


def set_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_textbox(slide, left, top, width, height, text, font_name="Calibri",
                font_size=Pt(14), bold=False, color=BODY_COLOR, alignment=PP_ALIGN.LEFT):
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


def add_rich_textbox(slide, left, top, width, height, lines):
    """Add a textbox with multiple formatted lines.
    lines: list of (text, font_size, bold, color) tuples
    """
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, (text, font_size, bold, color) in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = text
        p.space_after = Pt(2)
        run = p.runs[0]
        run.font.name = "Calibri"
        run.font.size = font_size
        run.font.bold = bold
        run.font.color.rgb = color
    return txBox


def build_180_day_slide(prs):
    blank_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank_layout)
    set_bg(slide, BG_COLOR)

    W = prs.slide_width
    MARGIN = Inches(0.5)
    CONTENT_W = W - 2 * MARGIN

    # ── Title ──
    add_textbox(slide, MARGIN, Inches(0.2), CONTENT_W, Inches(0.45),
                "180-Day Implementation Roadmap — Red Bounding Boxes",
                font_size=Pt(22), bold=True, color=TITLE_COLOR)

    # ── Subtitle ──
    add_textbox(slide, MARGIN, Inches(0.6), CONTENT_W, Inches(0.35),
                "Slide 4 diagram: Red-outlined components are targeted for the next 180-day implementation cycle",
                font_size=Pt(12), bold=False, color=SUBTITLE_COLOR)

    # ── Divider line ──
    line = slide.shapes.add_connector(1, MARGIN, Inches(0.95), W - MARGIN, Inches(0.95))
    line.line.color.rgb = RED_ACCENT
    line.line.width = Pt(2)

    # ── Legend bar ──
    add_textbox(slide, MARGIN, Inches(1.05), Inches(0.4), Inches(0.25),
                "■", font_size=Pt(16), bold=True, color=RED_ACCENT)
    add_textbox(slide, MARGIN + Inches(0.3), Inches(1.08), Inches(5), Inches(0.25),
                "= Targeted for 180-day implementation      ", 
                font_size=Pt(11), bold=False, color=DIM_COLOR)
    add_textbox(slide, MARGIN + Inches(4.5), Inches(1.05), Inches(0.4), Inches(0.25),
                "□", font_size=Pt(16), bold=True, color=DIM_COLOR)
    add_textbox(slide, MARGIN + Inches(4.8), Inches(1.08), Inches(5), Inches(0.25),
                "= Already built or out of scope for this cycle", 
                font_size=Pt(11), bold=False, color=DIM_COLOR)

    # ── Two column layout ──
    col_w = Inches(5.9)
    col1_left = MARGIN
    col2_left = MARGIN + col_w + Inches(0.4)
    y_start = Inches(1.45)

    # ═══════════════════════════ LEFT COLUMN ═══════════════════════════
    # GROUP 1 — Sprint 1 & 2 Focus (Left red boxes)
    add_textbox(slide, col1_left, y_start, col_w, Inches(0.3),
                "GROUP 1 — Core Platform (Left Red Boxes)",
                font_size=Pt(14), bold=True, color=SPRINT_GREEN)

    y = y_start + Inches(0.35)
    group1_layers = [
        ("Layer 1 — Presentation & UX", [
            "Visual Orchestration Canvas (React Flow drag-drop)",
            "Admin Dashboard (governance, health, approvals)",
        ]),
        ("Layer 2 — API & Registries", [
            "Asset Catalog (CRUD, versioning, search)",
            "MCP Server & Tool Registry",
        ]),
        ("Layer 3 — Orchestration & Governance", [
            "Workflow Templates (reusable patterns)",
            "Execution Engine (graph dispatch, retries, fan-out)",
        ]),
        ("Layer 4 — Data & Observability", [
            "Audit Log (immutable, TTL, Cosmos DB)",
            "Metrics & OTLP (OpenTelemetry → App Insights)",
        ]),
    ]

    for layer_name, items in group1_layers:
        add_textbox(slide, col1_left, y, col_w, Inches(0.22),
                    layer_name, font_size=Pt(11), bold=True, color=HEADING_COLOR)
        y += Inches(0.2)
        for item in items:
            add_textbox(slide, col1_left + Inches(0.15), y, col_w - Inches(0.15), Inches(0.18),
                        "▸ " + item, font_size=Pt(10), bold=False, color=BODY_COLOR)
            y += Inches(0.17)
        y += Inches(0.06)

    # Sprint callout
    add_textbox(slide, col1_left, y + Inches(0.05), col_w, Inches(0.2),
                "Sprint 1 Priority — Marketplace catalog + orchestrator canvas",
                font_size=Pt(10), bold=True, color=SPRINT_GREEN)

    # ═══════════════════════════ RIGHT COLUMN ═══════════════════════════
    # GROUP 2 — Sprint 2 & 3 Focus (Right red boxes)
    add_textbox(slide, col2_left, y_start, col_w, Inches(0.3),
                "GROUP 2 — Governance & Publisher (Right Red Boxes)",
                font_size=Pt(14), bold=True, color=SPRINT_AMBER)

    y = y_start + Inches(0.35)
    group2_layers = [
        ("Layer 1 — Presentation & UX", [
            "Publisher Portal (submission lifecycle)",
            "Playground (interactive agent/tool testing)",
            "DevUI (MAF agent debugging surface)",
        ]),
        ("Layer 2 — API & Registries", [
            "Agent Skills Registry",
            "Publisher & Submission API",
            "Security Scanner (static + runtime validation)",
        ]),
        ("Layer 3 — Orchestration & Governance", [
            "Human-in-the-Loop Approval Gate",
            "IAM & RBAC Access Control (Entra ID)",
            "Compensation Logic / Saga (rollback coordination)",
        ]),
        ("Layer 4 — Data & Observability", [
            "Projects & Workspace (team-owned work areas)",
            "Ratings & Reviews (community feedback)",
            "Execution History (run outcomes, traces)",
        ]),
    ]

    for layer_name, items in group2_layers:
        add_textbox(slide, col2_left, y, col_w, Inches(0.22),
                    layer_name, font_size=Pt(11), bold=True, color=HEADING_COLOR)
        y += Inches(0.2)
        for item in items:
            add_textbox(slide, col2_left + Inches(0.15), y, col_w - Inches(0.15), Inches(0.18),
                        "▸ " + item, font_size=Pt(10), bold=False, color=BODY_COLOR)
            y += Inches(0.17)
        y += Inches(0.06)

    # Sprint callout
    add_textbox(slide, col2_left, y + Inches(0.05), col_w, Inches(0.2),
                "Sprint 2-3 Priority — Governance, publisher workflow, infra",
                font_size=Pt(10), bold=True, color=SPRINT_AMBER)

    # ── Bottom bar — Not red-boxed components ──
    y_bottom = Inches(6.55)
    line2 = slide.shapes.add_connector(1, MARGIN, y_bottom, W - MARGIN, y_bottom)
    line2.line.color.rgb = DIM_COLOR
    line2.line.width = Pt(1)

    add_textbox(slide, MARGIN, y_bottom + Inches(0.08), CONTENT_W, Inches(0.3),
                "Not red-boxed:  Web Dashboard (already shipping)  •  Layer 5 Azure Services (provisioned via Bicep IaC independently)",
                font_size=Pt(10), bold=False, color=DIM_COLOR, alignment=PP_ALIGN.CENTER)

    return slide


def move_slide_to(prs, target_pos):
    """Move the last slide to target_pos (0-based)."""
    slide_list = prs.slides._sldIdLst
    el = slide_list[-1]
    slide_list.remove(el)
    slide_list.insert(target_pos, el)


def main():
    prs = Presentation(SRC)
    print("Before: %d slides" % len(prs.slides))

    # Current v3 layout:
    # Slide 6 = AI Platform Capabilities (diagram with red boxes)
    # Slide 7 = Slide 4 Explained (existing explanation)
    # We want to insert the new "180-day" slide after slide 7, so position 7 (0-based)
    build_180_day_slide(prs)
    move_slide_to(prs, 7)  # Insert after current slide 7 (0-indexed = position 7)

    prs.save(DST)
    print("After: %d slides" % len(prs.slides))

    # Verify slide order
    for i, slide in enumerate(prs.slides):
        if 5 <= i <= 9:
            texts = []
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for para in shape.text_frame.paragraphs:
                        t = para.text.strip()
                        if t:
                            texts.append(t)
                            break
                    if texts:
                        break
            title = texts[0] if texts else "(no text)"
            marker = " <-- NEW" if "180-Day" in title else ""
            print("  Slide %d: %s%s" % (i + 1, title[:70], marker))


if __name__ == "__main__":
    main()
