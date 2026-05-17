"""
Add a new architecture v2 slide to sequence-diagrams-v3.pptx
showing the updated architecture with:
  1. User → Web Dashboard (not via LLM Gateway)
  2. API Gateway in front of registries
  3. LLM Gateway → AI Services only
  4. MongoDB replaces Cosmos DB
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

SRC = "docs/sequence-diagrams-v3.pptx"
DST = "docs/sequence-diagrams-v4.pptx"

# Colors
BG         = RGBColor(0x1A, 0x1A, 0x2E)
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)
DIM        = RGBColor(0x90, 0x90, 0x9A)
BLUE_UX    = RGBColor(0x15, 0x65, 0xC0)
GREEN_EDGE = RGBColor(0x2E, 0x7D, 0x32)
ORANGE_API = RGBColor(0xE6, 0x51, 0x00)
ORANGE_GW  = RGBColor(0xFF, 0x6F, 0x00)
PINK_ORCH  = RGBColor(0xAD, 0x14, 0x57)
PURPLE_DAT = RGBColor(0x6A, 0x1B, 0x9A)
NAVY_AI    = RGBColor(0x28, 0x35, 0x93)
ACCENT     = RGBColor(0x42, 0xA5, 0xF5)
BODY       = RGBColor(0xE0, 0xE0, 0xE0)
LIGHT_BG   = RGBColor(0x2A, 0x2A, 0x3E)


def set_bg(slide):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = BG


def box(slide, left, top, w, h, text, fill_color, font_size=Pt(9), bold=True):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    tf = shape.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.CENTER
    r = p.runs[0]
    r.font.name = "Calibri"
    r.font.size = font_size
    r.font.bold = bold
    r.font.color.rgb = WHITE
    return shape


def label(slide, left, top, w, h, text, color=DIM, size=Pt(9), bold=False):
    tb = slide.shapes.add_textbox(left, top, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.LEFT
    r = p.runs[0]
    r.font.name = "Calibri"
    r.font.size = size
    r.font.bold = bold
    r.font.color.rgb = color
    return tb


def section_bg(slide, left, top, w, h, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.fill.fore_color.brightness = 0.85
    shape.line.fill.background()
    # Send to back by re-ordering XML
    sp = shape._element
    sp.getparent().insert(0, sp)
    return shape


def arrow(slide, x1, y1, x2, y2, color=DIM, width=Pt(1.5)):
    connector = slide.shapes.add_connector(1, x1, y1, x2, y2)
    connector.line.color.rgb = color
    connector.line.width = width
    return connector


def main():
    prs = Presentation(SRC)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)

    W = prs.slide_width   # 13.33 in
    M = Inches(0.4)

    # Title
    label(slide, M, Inches(0.15), Inches(10), Inches(0.4),
          "AI Marketplace — Architecture v2", WHITE, Pt(22), True)
    label(slide, M, Inches(0.5), Inches(12), Inches(0.25),
          "User → Web Dashboard (direct)  |  API Gateway (APIM) in front of registries  |  LLM Gateway → AI services only  |  MongoDB replaces Cosmos DB",
          DIM, Pt(10), False)

    # Divider
    ln = slide.shapes.add_connector(1, M, Inches(0.8), W - M, Inches(0.8))
    ln.line.color.rgb = ACCENT
    ln.line.width = Pt(1.5)

    # ── Layout constants ──
    BOX_W = Inches(1.35)
    BOX_H = Inches(0.38)
    GAP = Inches(0.15)

    # ══════════════════════════════════════════════
    # ROW 1: User → Presentation & UX
    # ══════════════════════════════════════════════
    user_x = Inches(0.3)
    user_y = Inches(1.1)
    box(slide, user_x, user_y, Inches(0.8), Inches(0.5), "👤 User",
        RGBColor(0x0D, 0x47, 0xA1), Pt(10))

    ux_x = Inches(1.5)
    ux_y = Inches(0.95)
    label(slide, ux_x, ux_y, Inches(3), Inches(0.2), "Presentation and UX", BLUE_UX, Pt(9), True)
    ux_boxes = ["Web Dashboard", "Visual\nOrchestration", "Admin\nDashboard", "Publisher\nPortal", "Playground"]
    for i, name in enumerate(ux_boxes):
        bx = ux_x + i * (BOX_W + GAP)
        box(slide, bx, ux_y + Inches(0.22), BOX_W, BOX_H, name, BLUE_UX, Pt(8))

    # 1 arrow: User → Web Dashboard
    arrow(slide, user_x + Inches(0.8), user_y + Inches(0.25),
          ux_x, ux_y + Inches(0.4), BLUE_UX, Pt(2))

    # ── Edge and Identity (top right) ──
    edge_x = Inches(10.2)
    edge_y = Inches(0.95)
    label(slide, edge_x, edge_y, Inches(2.5), Inches(0.2), "Edge and Identity", GREEN_EDGE, Pt(9), True)
    for i, name in enumerate(["LLM Gateway", "Entra ID", "Key Vault"]):
        box(slide, edge_x, edge_y + Inches(0.25) + i * (BOX_H + Inches(0.08)),
            Inches(1.6), BOX_H, name, GREEN_EDGE, Pt(9))

    # 1 arrow: User → Entra ID (auth)
    arrow(slide, user_x + Inches(0.4), user_y,
          edge_x + Inches(0.8), edge_y + Inches(0.25) + (BOX_H + Inches(0.08)) + Inches(0.19),
          GREEN_EDGE, Pt(1))

    # ══════════════════════════════════════════════
    # ROW 2: API Gateway
    # ══════════════════════════════════════════════
    gw_x = Inches(3.8)
    gw_y = Inches(1.85)
    label(slide, gw_x, gw_y, Inches(3), Inches(0.18), "API Gateway Layer", ORANGE_GW, Pt(9), True)
    box(slide, gw_x + Inches(0.3), gw_y + Inches(0.2), Inches(2.5), Inches(0.35),
        "Azure API Management", ORANGE_GW, Pt(10))

    # 1 arrow: UX layer → API Gateway (single grouped connector from center of UX row)
    ux_center_x = ux_x + 2 * (BOX_W + GAP) + BOX_W / 2  # center of 5 boxes
    arrow(slide, ux_center_x, ux_y + Inches(0.6),
          gw_x + Inches(1.55), gw_y + Inches(0.2), ORANGE_GW, Pt(2))

    # ══════════════════════════════════════════════
    # ROW 3 LEFT: Orchestration and Governance
    # ══════════════════════════════════════════════
    orch_x = Inches(0.3)
    orch_y = Inches(2.6)
    label(slide, orch_x, orch_y, Inches(4), Inches(0.2), "Orchestration and Governance", PINK_ORCH, Pt(9), True)

    OW = Inches(1.3)
    for i, name in enumerate(["Orchestration API", "Policy Engine"]):
        box(slide, orch_x + i * (OW + GAP), orch_y + Inches(0.25), OW, BOX_H, name, PINK_ORCH, Pt(8))
    for i, name in enumerate(["Event Hubs", "Workflow\nTemplates"]):
        box(slide, orch_x + i * (OW + GAP), orch_y + Inches(0.72), OW, BOX_H, name, PINK_ORCH, Pt(8))
    box(slide, orch_x, orch_y + Inches(1.19), OW, BOX_H, "Execution Engine", PINK_ORCH, Pt(8))
    box(slide, orch_x, orch_y + Inches(1.66), OW, BOX_H, "HITL Approval\nGate", PINK_ORCH, Pt(8))

    # 1 arrow: API Gateway → Orchestration
    arrow(slide, gw_x + Inches(0.3), gw_y + Inches(0.4),
          orch_x + OW / 2, orch_y + Inches(0.25), PINK_ORCH, Pt(1.5))

    # ══════════════════════════════════════════════
    # ROW 3 RIGHT: API and Registries
    # ══════════════════════════════════════════════
    api_x = Inches(3.5)
    api_y = Inches(3.1)
    label(slide, api_x, api_y, Inches(4), Inches(0.2), "API and Registries", ORANGE_API, Pt(9), True)

    RW = Inches(1.15)
    RGAP = Inches(0.1)
    box(slide, api_x, api_y + Inches(0.22), RW, BOX_H, "Publisher API", ORANGE_API, Pt(8))
    for i, name in enumerate(["A2A Agent\nRegistry", "MCP Server\nRegistry", "MCP Gateway\nProxy", "Skills Registry", "Security\nScanner", "Asset Catalog"]):
        box(slide, api_x + i * (RW + RGAP), api_y + Inches(0.68), RW, BOX_H, name, ORANGE_API, Pt(7))

    # 1 arrow: API Gateway → Registries
    arrow(slide, gw_x + Inches(1.55), gw_y + Inches(0.55),
          api_x + Inches(3.5), api_y, ORANGE_API, Pt(2))

    # 1 arrow: Execution Engine → Registries
    arrow(slide, orch_x + OW, orch_y + Inches(1.38),
          api_x, api_y + Inches(0.87), ORANGE_API, Pt(1))

    # ══════════════════════════════════════════════
    # ROW 4: Azure AI Services
    # ══════════════════════════════════════════════
    ai_x = Inches(3.0)
    ai_y = Inches(4.55)
    label(slide, ai_x, ai_y, Inches(4), Inches(0.18), "Azure AI Services", NAVY_AI, Pt(9), True)

    ai_items = ["Azure OpenAI", "Azure Foundry", "AI Search", "Azure ML\nStudio", "Container Apps", "Azure Functions"]
    AW = Inches(1.2)
    AGAP = Inches(0.1)
    for i, name in enumerate(ai_items):
        box(slide, ai_x + i * (AW + AGAP), ai_y + Inches(0.22), AW, BOX_H, name, NAVY_AI, Pt(8))

    # 1 arrow: LLM Gateway → AI Services layer (single line to center of AI row)
    llmgw_x = edge_x
    llmgw_y = edge_y + Inches(0.25)
    ai_center_x = ai_x + 1.5 * (AW + AGAP) + AW / 2
    arrow(slide, llmgw_x, llmgw_y + BOX_H / 2,
          ai_center_x, ai_y + Inches(0.22), GREEN_EDGE, Pt(2))
    label(slide, edge_x - Inches(1.8), Inches(2.8), Inches(1.8), Inches(0.2),
          "AI calls only ↓", GREEN_EDGE, Pt(8), True)

    # 1 arrow: Execution Engine → LLM Gateway (for AI calls)
    arrow(slide, orch_x + OW / 2, orch_y + Inches(1.19),
          llmgw_x, llmgw_y + Inches(0.35), GREEN_EDGE, Pt(1))

    # ══════════════════════════════════════════════
    # ROW 5: Data and Observability
    # ══════════════════════════════════════════════
    dat_x = Inches(1.5)
    dat_y = Inches(5.5)
    label(slide, dat_x, dat_y, Inches(4), Inches(0.18), "Data and Observability", PURPLE_DAT, Pt(9), True)

    dat_items = [
        ("ADLS Gen 2", PURPLE_DAT),
        ("Redis Cache", PURPLE_DAT),
        ("App Insights", PURPLE_DAT),
        ("MongoDB", RGBColor(0x4A, 0x14, 0x8C)),
        ("Azure Monitor", PURPLE_DAT),
    ]
    DW = Inches(1.3)
    DGAP = Inches(0.15)
    for i, (name, color) in enumerate(dat_items):
        bsize = Pt(10) if name == "MongoDB" else Pt(8)
        box(slide, dat_x + i * (DW + DGAP), dat_y + Inches(0.22), DW, Inches(0.45), name, color, bsize)

    # 1 arrow: Registries → MongoDB
    mongo_center_x = dat_x + 3 * (DW + DGAP) + DW / 2
    arrow(slide, api_x + Inches(3.5), api_y + Inches(1.06),
          mongo_center_x, dat_y + Inches(0.22), PURPLE_DAT, Pt(1.5))

    # 1 arrow: AI compute → App Insights
    ai_compute_x = ai_x + 4.5 * (AW + AGAP) + AW / 2
    insights_x = dat_x + 2 * (DW + DGAP) + DW / 2
    arrow(slide, ai_compute_x, ai_y + Inches(0.6),
          insights_x, dat_y + Inches(0.22), PURPLE_DAT, Pt(1))

    # ══════════════════════════════════════════════
    # LEGEND (bottom right)
    # ══════════════════════════════════════════════
    legend_x = Inches(9.0)
    legend_y = Inches(5.85)
    label(slide, legend_x, legend_y, Inches(4), Inches(0.2),
          "Key Changes (v2):", WHITE, Pt(10), True)
    changes = [
        "• User → Web Dashboard directly (no LLM Gateway in path)",
        "• API Gateway (APIM) fronts all registry APIs",
        "• LLM Gateway routes to AI Services only (Foundry, OpenAI, ML Studio)",
        "• MongoDB replaces Cosmos DB for persistence",
    ]
    for i, ch in enumerate(changes):
        label(slide, legend_x, legend_y + Inches(0.22) + i * Inches(0.17),
              Inches(4), Inches(0.18), ch, BODY, Pt(9), False)

    # ── Move slide to after Slide 5 (architecture) ──
    sld_list = prs.slides._sldIdLst
    el = sld_list[-1]
    sld_list.remove(el)
    # Insert as new slide 6 (after current Slide 5 = Summary of Capabilities)
    sld_list.insert(5, el)

    prs.save(DST)

    # Verify
    prs2 = Presentation(DST)
    print("Total slides:", len(prs2.slides))
    for i, s in enumerate(prs2.slides):
        if i < 10:
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
            marker = " <-- NEW" if "v2" in title else ""
            print("  Slide %d: %s%s" % (i + 1, title[:80], marker))


if __name__ == "__main__":
    main()
