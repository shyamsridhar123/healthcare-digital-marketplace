"""Generate a 10-pattern MAF orchestration presentation for team presentation."""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# ── Brand colours ────────────────────────────────────────────────────────
BG_DARK   = RGBColor(0x0F, 0x17, 0x2A)   # deep navy
BG_CARD   = RGBColor(0x1A, 0x23, 0x3B)   # card navy
ACCENT    = RGBColor(0x00, 0x78, 0xD4)   # Azure blue
ACCENT2   = RGBColor(0x50, 0xE6, 0xC2)   # teal accent
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
GRAY      = RGBColor(0xA0, 0xAE, 0xC0)
LIGHT     = RGBColor(0xE0, 0xE8, 0xF0)
GREEN     = RGBColor(0x10, 0xB9, 0x81)
ORANGE    = RGBColor(0xF5, 0x9E, 0x0B)
PURPLE    = RGBColor(0x8B, 0x5C, 0xF6)
RED       = RGBColor(0xEF, 0x44, 0x44)
CYAN      = RGBColor(0x06, 0xB6, 0xD4)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H

def add_bg(slide, color=BG_DARK):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_box(slide, left, top, width, height, fill_color=BG_CARD, border_color=None, border_width=Pt(1)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = border_width
    else:
        shape.line.fill.background()
    shape.shadow.inherit = False
    return shape

def add_text(slide, left, top, width, height, text, size=14, color=WHITE, bold=False, alignment=PP_ALIGN.LEFT, font_name="Segoe UI"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return tf

def add_para(tf, text, size=14, color=WHITE, bold=False, alignment=PP_ALIGN.LEFT, font_name="Segoe UI", space_before=Pt(4)):
    p = tf.add_paragraph()
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    p.space_before = space_before
    return p

def add_node(slide, left, top, width, height, label, fill_color, text_color=WHITE, font_size=10):
    shape = add_box(slide, left, top, width, height, fill_color, border_color=None)
    shape.text_frame.word_wrap = True
    shape.text_frame.paragraphs[0].text = label
    shape.text_frame.paragraphs[0].font.size = Pt(font_size)
    shape.text_frame.paragraphs[0].font.color.rgb = text_color
    shape.text_frame.paragraphs[0].font.bold = True
    shape.text_frame.paragraphs[0].font.name = "Segoe UI"
    shape.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    shape.text_frame.auto_size = None
    shape.text_frame.paragraphs[0].space_before = Pt(0)
    shape.text_frame.paragraphs[0].space_after = Pt(0)
    return shape

def add_arrow(slide, start_left, start_top, end_left, end_top, color=ACCENT2, width=Pt(2)):
    line = slide.shapes.add_connector(1, start_left, start_top, end_left, end_top)  # 1 = straight
    line.line.color.rgb = color
    line.line.width = width
    return line

def slide_header(slide, number, title, subtitle=""):
    # Pattern number badge
    badge = add_box(slide, Inches(0.6), Inches(0.4), Inches(0.7), Inches(0.7), ACCENT)
    badge.text_frame.paragraphs[0].text = str(number)
    badge.text_frame.paragraphs[0].font.size = Pt(28)
    badge.text_frame.paragraphs[0].font.color.rgb = WHITE
    badge.text_frame.paragraphs[0].font.bold = True
    badge.text_frame.paragraphs[0].font.name = "Segoe UI"
    badge.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    # Title
    add_text(slide, Inches(1.5), Inches(0.35), Inches(8), Inches(0.55), title, size=28, bold=True, color=WHITE)
    if subtitle:
        add_text(slide, Inches(1.5), Inches(0.9), Inches(8), Inches(0.4), subtitle, size=14, color=GRAY)
    # Divider line
    line = slide.shapes.add_connector(1, Inches(0.6), Inches(1.35), Inches(12.7), Inches(1.35))
    line.line.color.rgb = ACCENT
    line.line.width = Pt(1.5)

def add_code_box(slide, left, top, width, height, code_lines, title="MAF Code Pattern"):
    card = add_box(slide, left, top, width, height, RGBColor(0x11, 0x18, 0x27), border_color=RGBColor(0x30, 0x3D, 0x55))
    # Title bar
    add_box(slide, left, top, width, Inches(0.35), RGBColor(0x1E, 0x29, 0x3B))
    add_text(slide, left + Inches(0.15), top + Inches(0.03), width, Inches(0.3), title, size=9, color=GRAY, bold=True, font_name="Segoe UI")
    # Code
    code_text = "\n".join(code_lines)
    tf = add_text(slide, left + Inches(0.2), top + Inches(0.4), width - Inches(0.4), height - Inches(0.5),
                  code_text, size=9, color=ACCENT2, font_name="Cascadia Code")
    return card

def add_bullet_card(slide, left, top, width, height, title, bullets, accent_color=ACCENT):
    card = add_box(slide, left, top, width, height, BG_CARD, border_color=accent_color)
    # Accent top strip inside card
    add_box(slide, left, top, width, Inches(0.06), accent_color)
    tf = add_text(slide, left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), Inches(0.35),
                  title, size=13, bold=True, color=WHITE)
    for b in bullets:
        add_para(tf, f"• {b}", size=10, color=LIGHT, space_before=Pt(3))
    return card

def add_flow_nodes(slide, nodes, y, node_w=Inches(1.3), node_h=Inches(0.55), gap=Inches(0.35), start_x=Inches(0.8)):
    """Draw a horizontal flow of labelled boxes with arrows between them."""
    colors = [ACCENT, PURPLE, GREEN, ORANGE, CYAN, RED, ACCENT2, ACCENT, PURPLE, GREEN]
    shapes = []
    x = start_x
    for i, (label, color_override) in enumerate(nodes):
        c = color_override if color_override else colors[i % len(colors)]
        s = add_node(slide, x, y, node_w, node_h, label, c, font_size=9)
        shapes.append((x, s))
        if i < len(nodes) - 1:
            add_arrow(slide, x + node_w, y + node_h / 2, x + node_w + gap, y + node_h / 2, GRAY, Pt(1.5))
        x += node_w + gap
    return shapes


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 0: TITLE SLIDE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
add_bg(slide)

# Big title
add_text(slide, Inches(1), Inches(1.5), Inches(11), Inches(1.2),
         "10 Orchestration Patterns", size=44, bold=True, color=WHITE)
add_text(slide, Inches(1), Inches(2.6), Inches(11), Inches(0.8),
         "with Microsoft Agent Framework", size=32, color=ACCENT2)
add_text(slide, Inches(1), Inches(3.6), Inches(11), Inches(0.5),
         "AI Marketplace — Architecture & Design Series", size=16, color=GRAY)

# Accent line
line = slide.shapes.add_connector(1, Inches(1), Inches(3.4), Inches(5), Inches(3.4))
line.line.color.rgb = ACCENT
line.line.width = Pt(3)

# Pattern chips
pattern_names = [
    "Sequential", "Fan-Out / Fan-In", "Conditional Router", "Loop / Iteration",
    "Human-in-the-Loop", "Supervisor", "Map-Reduce", "Handoff",
    "Group Chat", "Sub-Workflow"
]
chip_colors = [ACCENT, PURPLE, ORANGE, GREEN, CYAN, RED, ACCENT2, PURPLE, ORANGE, GREEN]
x, y = Inches(1), Inches(4.5)
for i, name in enumerate(pattern_names):
    chip_w = Inches(len(name) * 0.1 + 0.5)
    if x + chip_w > Inches(12):
        x = Inches(1)
        y += Inches(0.55)
    add_node(slide, x, y, chip_w, Inches(0.4), name, chip_colors[i], WHITE, font_size=9)
    x += chip_w + Inches(0.15)

add_text(slide, Inches(1), Inches(6.5), Inches(11), Inches(0.4),
         "Hosted on Azure Container Apps  •  Cosmos DB  •  Azure OpenAI  •  Python + FastAPI",
         size=12, color=GRAY, alignment=PP_ALIGN.LEFT)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 1: SEQUENTIAL PIPELINE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 1, "Sequential Pipeline", "Agents execute in strict order — each output feeds the next")

# Flow diagram
add_flow_nodes(slide, [
    ("📥 Start", ACCENT),
    ("🤖 Agent A\nAnalyze", PURPLE),
    ("🤖 Agent B\nEnrich", GREEN),
    ("🤖 Agent C\nSummarize", ORANGE),
    ("📤 End", ACCENT),
], y=Inches(1.7), node_w=Inches(1.6), node_h=Inches(0.7), gap=Inches(0.5), start_x=Inches(1.2))

# Left card: When to use
add_bullet_card(slide, Inches(0.6), Inches(2.8), Inches(5.5), Inches(2.3), "When to Use", [
    "Step-by-step data processing (ETL, claim workflows)",
    "Each agent needs the previous agent's output",
    "Order matters — can't parallelize",
    "Document review → Extraction → Validation → Enrichment",
], ACCENT)

# Right card: MAF implementation
add_code_box(slide, Inches(6.5), Inches(2.8), Inches(6.2), Inches(2.3), [
    "from agent_framework.orchestrations import SequentialBuilder",
    "",
    "workflow = (",
    "    SequentialBuilder()",
    "    .add_agent(analyzer_agent)",
    "    .add_agent(enricher_agent)",
    "    .add_agent(summarizer_agent)",
    "    .build()",
    ")",
    "result = await workflow.as_agent().run(input_text)",
])

# Bottom: Key traits
add_bullet_card(slide, Inches(0.6), Inches(5.4), Inches(12.1), Inches(1.6), "Key Characteristics", [
    "MAF Builder: SequentialBuilder — one-liner chaining",
    "Data flow: shared conversation context passed through each agent",
    "State: each agent sees all prior messages; AgentSession persists across turns",
    "Streaming: every agent can stream tokens to the client via event handlers",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 2: FAN-OUT / FAN-IN
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 2, "Parallel Fan-Out / Fan-In", "Dispatch to N agents simultaneously, aggregate results")

# Flow diagram - fan shape
add_node(slide, Inches(1), Inches(2), Inches(1.5), Inches(0.6), "📥 Input", ACCENT, font_size=10)
add_node(slide, Inches(3.2), Inches(2), Inches(1.5), Inches(0.6), "⚡ Dispatch", CYAN, font_size=10)
# Fan-out branches
add_node(slide, Inches(5.5), Inches(1.3), Inches(1.8), Inches(0.55), "🤖 Tech Analysis", PURPLE, font_size=9)
add_node(slide, Inches(5.5), Inches(2.0), Inches(1.8), Inches(0.55), "🤖 Market Analysis", GREEN, font_size=9)
add_node(slide, Inches(5.5), Inches(2.7), Inches(1.8), Inches(0.55), "🤖 Risk Analysis", ORANGE, font_size=9)
# Aggregate
add_node(slide, Inches(8), Inches(2), Inches(1.5), Inches(0.6), "🔀 Aggregate", CYAN, font_size=10)
add_node(slide, Inches(10.2), Inches(2), Inches(1.5), Inches(0.6), "📤 Output", ACCENT, font_size=10)
# Arrows
add_arrow(slide, Inches(2.5), Inches(2.3), Inches(3.2), Inches(2.3), GRAY)
for y_off in [Inches(1.55), Inches(2.25), Inches(2.95)]:
    add_arrow(slide, Inches(4.7), Inches(2.3), Inches(5.5), y_off, GRAY)
    add_arrow(slide, Inches(7.3), y_off, Inches(8), Inches(2.3), GRAY)
add_arrow(slide, Inches(9.5), Inches(2.3), Inches(10.2), Inches(2.3), GRAY)

add_bullet_card(slide, Inches(0.6), Inches(3.6), Inches(5.5), Inches(2.0), "When to Use", [
    "Independent sub-tasks that can run in parallel",
    "Multi-perspective analysis (technical + market + risk)",
    "Latency matters — total time = slowest branch, not sum",
    "Translation to multiple languages simultaneously",
], PURPLE)

add_code_box(slide, Inches(6.5), Inches(3.6), Inches(6.2), Inches(2.0), [
    "from agent_framework.orchestrations import ConcurrentBuilder",
    "",
    "workflow = (",
    "    ConcurrentBuilder()",
    "    .add_agent(tech_agent)",
    "    .add_agent(market_agent)",
    "    .add_agent(risk_agent)",
    "    .with_aggregator(summary_agent)  # optional LLM merge",
    "    .build()",
    ")",
])

add_bullet_card(slide, Inches(0.6), Inches(5.9), Inches(12.1), Inches(1.2), "Key Characteristics", [
    "MAF Builder: ConcurrentBuilder — fan-out with default or custom aggregator",
    "Join strategies: wait-all (default), custom aggregator callback, LLM-based merge",
    "Reduces total latency from O(n) sequential to O(max) parallel",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 3: CONDITIONAL ROUTER
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 3, "Conditional Router", "Dynamic edge routing — branch execution based on data or classifier output")

# Diamond shape flow
add_node(slide, Inches(1), Inches(2.0), Inches(1.5), Inches(0.6), "📥 Input", ACCENT, font_size=10)
add_node(slide, Inches(3.2), Inches(2.0), Inches(1.8), Inches(0.6), "🧠 Classifier", ORANGE, font_size=10)
# Branches
add_node(slide, Inches(6), Inches(1.2), Inches(2.0), Inches(0.55), "🤖 Billing Agent", PURPLE, font_size=9)
add_node(slide, Inches(6), Inches(2.0), Inches(2.0), Inches(0.55), "🤖 Tech Support", GREEN, font_size=9)
add_node(slide, Inches(6), Inches(2.8), Inches(2.0), Inches(0.55), "🤖 General Agent", GRAY, font_size=9)
# Join
add_node(slide, Inches(9), Inches(2.0), Inches(1.5), Inches(0.6), "📤 Output", ACCENT, font_size=10)
# Labels
add_text(slide, Inches(5.2), Inches(1.05), Inches(0.8), Inches(0.3), "billing", size=8, color=PURPLE, bold=True)
add_text(slide, Inches(5.2), Inches(1.85), Inches(0.8), Inches(0.3), "tech", size=8, color=GREEN, bold=True)
add_text(slide, Inches(5.2), Inches(2.65), Inches(0.8), Inches(0.3), "other", size=8, color=GRAY, bold=True)
# Arrows
add_arrow(slide, Inches(2.5), Inches(2.3), Inches(3.2), Inches(2.3), GRAY)
for y_off in [Inches(1.45), Inches(2.25), Inches(3.05)]:
    add_arrow(slide, Inches(5), Inches(2.3), Inches(6), y_off, GRAY)
    add_arrow(slide, Inches(8), y_off, Inches(9), Inches(2.3), GRAY)

add_bullet_card(slide, Inches(0.6), Inches(3.6), Inches(5.5), Inches(2.0), "When to Use", [
    "Intent classification → route to specialist agent",
    "If/else logic based on previous agent output",
    "Switch-case: multiple exclusive branches",
    "Multi-selection: one input triggers multiple targets",
], ORANGE)

add_code_box(slide, Inches(6.5), Inches(3.6), Inches(6.2), Inches(2.0), [
    "# Edge conditions in MAF workflow",
    "wf = Workflow()",
    "wf.add_executor('classifier', classifier_fn)",
    "wf.add_executor('billing', billing_agent)",
    "wf.add_executor('tech', tech_agent)",
    "",
    "wf.add_edge('classifier', 'billing',",
    "    condition=lambda msg: msg.intent == 'billing')",
    "wf.add_edge('classifier', 'tech',",
    "    condition=lambda msg: msg.intent == 'tech')",
])

add_bullet_card(slide, Inches(0.6), Inches(5.9), Inches(12.1), Inches(1.2), "Key Characteristics", [
    "MAF: edge_condition, switch_case_edge_group, multi_selection_edge_group — all built-in",
    "Only matched branch executes (others skipped); supports both function-based and agent-based classifiers",
    "Declarative YAML variant: conditional_workflow with nested if/elif/else blocks",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 4: LOOP / ITERATION
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 4, "Loop / Iteration", "Repeat agent execution until a condition is met or max iterations reached")

# Loop flow
add_node(slide, Inches(1), Inches(2.0), Inches(1.3), Inches(0.6), "📥 Input", ACCENT, font_size=10)
add_node(slide, Inches(3), Inches(2.0), Inches(1.8), Inches(0.6), "🤖 Writer Agent", PURPLE, font_size=10)
add_node(slide, Inches(5.5), Inches(2.0), Inches(1.8), Inches(0.6), "🧠 Judge Agent", ORANGE, font_size=10)
add_node(slide, Inches(8.5), Inches(2.0), Inches(1.3), Inches(0.6), "📤 Output", ACCENT, font_size=10)
# Loop-back arrow label
add_text(slide, Inches(4.0), Inches(1.2), Inches(1.5), Inches(0.3), "↺ not good", size=9, color=RED, bold=True)
add_text(slide, Inches(7.5), Inches(1.85), Inches(1.2), Inches(0.3), "✓ pass", size=9, color=GREEN, bold=True)
# Arrows
add_arrow(slide, Inches(2.3), Inches(2.3), Inches(3), Inches(2.3), GRAY)
add_arrow(slide, Inches(4.8), Inches(2.3), Inches(5.5), Inches(2.3), GRAY)
add_arrow(slide, Inches(7.3), Inches(2.3), Inches(8.5), Inches(2.3), GREEN)
# Feedback loop arrow (simplified as top connection)
add_arrow(slide, Inches(6.4), Inches(2.0), Inches(6.4), Inches(1.5), RED)
add_arrow(slide, Inches(6.4), Inches(1.5), Inches(3.9), Inches(1.5), RED)
add_arrow(slide, Inches(3.9), Inches(1.5), Inches(3.9), Inches(2.0), RED)

add_bullet_card(slide, Inches(0.6), Inches(3.0), Inches(5.5), Inches(2.2), "When to Use", [
    "Writer-Critic pattern: generate → evaluate → refine",
    "Iterative improvement until quality threshold met",
    "Self-correction: agent retries after feedback",
    "Code generation → test → fix → retest loop",
    "Max iterations prevent infinite loops (safety boundary)",
], GREEN)

add_code_box(slide, Inches(6.5), Inches(3.0), Inches(6.2), Inches(2.2), [
    "# Feedback loop with conditional edge",
    "wf = Workflow()",
    "wf.add_executor('writer', writer_agent)",
    "wf.add_executor('judge', judge_fn)",
    "",
    "wf.add_edge('writer', 'judge')",
    "wf.add_edge('judge', 'writer',",
    "    condition=lambda msg: msg.verdict != 'PASS')",
    "wf.add_edge('judge', '__end__',",
    "    condition=lambda msg: msg.verdict == 'PASS')",
])

add_bullet_card(slide, Inches(0.6), Inches(5.5), Inches(12.1), Inches(1.5), "Key Characteristics", [
    "MAF: simple_loop sample — judge agent decides ABOVE / BELOW / MATCHED to control iteration",
    "Writer-Critic in _StartHere samples: iterative refinement with quality gates + max iteration safety",
    "Quality threshold + max iterations prevent infinite loops; each iteration persisted via checkpoints",
    "Supports both agent-based judges and simple function conditions",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 5: HUMAN-IN-THE-LOOP
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 5, "Human-in-the-Loop (Approval Gate)", "Pause execution for human review, resume on approval")

# Flow
add_node(slide, Inches(0.8), Inches(2.0), Inches(1.4), Inches(0.6), "🤖 Agent\nGenerates", PURPLE, font_size=9)
add_node(slide, Inches(3), Inches(2.0), Inches(1.5), Inches(0.6), "📋 Review\nPending", ORANGE, font_size=10)
add_node(slide, Inches(5.3), Inches(1.4), Inches(1.5), Inches(0.55), "✅ Approved", GREEN, font_size=9)
add_node(slide, Inches(5.3), Inches(2.3), Inches(1.5), Inches(0.55), "❌ Rejected", RED, font_size=9)
add_node(slide, Inches(7.5), Inches(1.4), Inches(1.4), Inches(0.55), "🤖 Next Agent", ACCENT, font_size=9)
add_node(slide, Inches(7.5), Inches(2.3), Inches(1.4), Inches(0.55), "🔄 Revise", ORANGE, font_size=9)
# Arrows
add_arrow(slide, Inches(2.2), Inches(2.3), Inches(3), Inches(2.3), GRAY)
add_arrow(slide, Inches(4.5), Inches(2.1), Inches(5.3), Inches(1.65), GREEN)
add_arrow(slide, Inches(4.5), Inches(2.5), Inches(5.3), Inches(2.55), RED)
add_arrow(slide, Inches(6.8), Inches(1.65), Inches(7.5), Inches(1.65), GREEN)
add_arrow(slide, Inches(6.8), Inches(2.55), Inches(7.5), Inches(2.55), RED)

add_bullet_card(slide, Inches(0.6), Inches(3.3), Inches(5.5), Inches(2.2), "When to Use", [
    "Content approval before publishing",
    "Financial transaction review above $ threshold",
    "Tool call approval (sensitive actions)",
    "Medical/legal review before agent proceeds",
    "Compliance gate: human reviews PII detection results",
], CYAN)

add_code_box(slide, Inches(6.5), Inches(3.3), Inches(6.2), Inches(2.2), [
    "# Human-in-the-loop via ctx.request_info()",
    "async def review_executor(ctx, msg):",
    "    result = await ctx.request_info(",
    "        RequestInfoMessage(",
    "            content=f'Approve? {msg.text}',",
    "            request_id='approval-1'",
    "        )",
    "    )",
    "    if result.approved:",
    "        return ApprovedMessage(msg.text)",
    "    return RejectedMessage(result.feedback)",
])

add_bullet_card(slide, Inches(0.6), Inches(5.8), Inches(12.1), Inches(1.3), "Key Characteristics", [
    "MAF: ctx.request_info() pauses workflow, emits request event, resumes when response arrives",
    "Checkpointing: checkpoint_with_human_in_the_loop — save state, shut down, resume later (even days/weeks)",
    "Tool Approval: .with_tool_approval() on builders — auto-gate all tool calls for human review",
    "Zero compute cost during wait (Flex Consumption / Container Apps min-replicas=0)",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 6: SUPERVISOR / HIERARCHICAL
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 6, "Supervisor / Hierarchical", "Manager agent reviews child outputs and re-routes or overrides")

# Supervisor flow
add_node(slide, Inches(3.5), Inches(1.6), Inches(2.2), Inches(0.7), "🧑‍💼 Supervisor Agent\n(Manager / Magentic)", ACCENT, font_size=10)
# Children
add_node(slide, Inches(1), Inches(3.0), Inches(1.8), Inches(0.55), "🤖 Research Agent", PURPLE, font_size=9)
add_node(slide, Inches(3.5), Inches(3.0), Inches(1.8), Inches(0.55), "🤖 Writing Agent", GREEN, font_size=9)
add_node(slide, Inches(6), Inches(3.0), Inches(1.8), Inches(0.55), "🤖 Review Agent", ORANGE, font_size=9)
# Arrows from supervisor to children
for x in [Inches(1.9), Inches(4.4), Inches(6.9)]:
    add_arrow(slide, Inches(4.6), Inches(2.3), x, Inches(3.0), ACCENT2)
    add_arrow(slide, x, Inches(3.55), Inches(4.6), Inches(2.3), GRAY)

# Labels
add_text(slide, Inches(1.0), Inches(2.5), Inches(2), Inches(0.3), "delegates", size=8, color=ACCENT2)
add_text(slide, Inches(6.5), Inches(2.5), Inches(2), Inches(0.3), "reports back", size=8, color=GRAY)

add_bullet_card(slide, Inches(0.6), Inches(3.9), Inches(5.5), Inches(2.0), "When to Use", [
    "Manager agent decides which sub-agent to invoke next",
    "Quality control: supervisor reviews all child outputs",
    "Reflection pattern: agent reviews its own output",
    "Research → Synthesize → Review orchestration",
    "Customer routing: triage → specialist selection",
], RED)

add_code_box(slide, Inches(6.5), Inches(3.9), Inches(6.2), Inches(2.0), [
    "from agent_framework.orchestrations import MagenticBuilder",
    "",
    "workflow = (",
    "    MagenticBuilder()",
    "    .add_agent(research_agent, name='Researcher')",
    "    .add_agent(writer_agent, name='Writer')",
    "    .add_agent(reviewer_agent, name='Reviewer')",
    "    .with_manager(manager_agent)  # decides next",
    "    .build()",
    ")",
])

add_bullet_card(slide, Inches(0.6), Inches(6.2), Inches(12.1), Inches(0.9), "Key Characteristics", [
    "MAF Builder: MagenticBuilder — supervisor agent creates plan, assigns tasks, reviews results",
    "Supports human plan review (magentic_human_plan_review) and checkpoint resume",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 7: MAP-REDUCE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 7, "Map-Reduce", "Apply same agent to each item in a collection, then reduce results")

# Phase boxes
add_node(slide, Inches(0.8), Inches(2.0), Inches(1.3), Inches(0.6), "📄 Collection\n[items]", ACCENT, font_size=9)
add_text(slide, Inches(2.3), Inches(2.15), Inches(0.5), Inches(0.3), "MAP", size=10, color=ORANGE, bold=True)
# Map items
for i, label in enumerate(["Item 1", "Item 2", "Item 3", "Item N"]):
    y = Inches(1.5) + Inches(i * 0.5)
    add_node(slide, Inches(3.0), y, Inches(1.5), Inches(0.4), f"🤖 {label}", PURPLE if i < 3 else GRAY, font_size=8)
    add_arrow(slide, Inches(2.1), Inches(2.3), Inches(3.0), y + Inches(0.2), GRAY)
    add_arrow(slide, Inches(4.5), y + Inches(0.2), Inches(5.5), Inches(2.3), GRAY)

add_text(slide, Inches(4.8), Inches(2.15), Inches(1), Inches(0.3), "REDUCE", size=10, color=GREEN, bold=True)
add_node(slide, Inches(5.5), Inches(2.0), Inches(1.5), Inches(0.6), "🔀 Aggregate", GREEN, font_size=10)
add_node(slide, Inches(7.5), Inches(2.0), Inches(1.3), Inches(0.6), "📤 Output", ACCENT, font_size=10)
add_arrow(slide, Inches(7.0), Inches(2.3), Inches(7.5), Inches(2.3), GRAY)

add_bullet_card(slide, Inches(0.6), Inches(3.7), Inches(5.5), Inches(1.8), "When to Use", [
    "Batch processing: analyze each claim in a batch",
    "Multi-document summarization (1 agent per document)",
    "Process each row of a dataset with same logic",
    "Chunk-by-chunk processing of large documents",
], ACCENT2)

add_code_box(slide, Inches(6.5), Inches(3.7), Inches(6.2), Inches(1.8), [
    "# Map-Reduce via fan_out_fan_in_edges.py",
    "chunks = split_document(large_doc)",
    "",
    "wf = Workflow()",
    "wf.add_executor('splitter', split_fn)",
    "for i in range(len(chunks)):",
    "    wf.add_executor(f'worker_{i}', process_agent)",
    "    wf.add_edge('splitter', f'worker_{i}')",
    "    wf.add_edge(f'worker_{i}', 'reducer')",
    "wf.add_executor('reducer', aggregate_fn)",
])

add_bullet_card(slide, Inches(0.6), Inches(5.8), Inches(12.1), Inches(1.3), "Key Characteristics", [
    "MAF: map_reduce_and_visualization sample — fan-out/fan-in with diagram export",
    "Dynamic fan-out: generate N worker executors at runtime based on collection size",
    "Reduce: custom aggregator function, or LLM-based summarization of parallel results",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 8: HANDOFF (Agent-to-Agent)
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 8, "Handoff (Agent-to-Agent Routing)", "Agents transfer control to specialists via tool-call handoff")

# Flow
add_node(slide, Inches(1), Inches(1.8), Inches(2.0), Inches(0.7), "🧑‍💼 Triage Agent\n(Router)", ACCENT, font_size=10)
# Specialists
add_node(slide, Inches(4.5), Inches(1.3), Inches(2.0), Inches(0.55), "💰 Billing Specialist", PURPLE, font_size=9)
add_node(slide, Inches(4.5), Inches(2.1), Inches(2.0), Inches(0.55), "🔧 Tech Specialist", GREEN, font_size=9)
add_node(slide, Inches(4.5), Inches(2.9), Inches(2.0), Inches(0.55), "📦 Shipping Specialist", ORANGE, font_size=9)
# Return arrows
add_node(slide, Inches(8), Inches(2.1), Inches(1.5), Inches(0.55), "👤 User", CYAN, font_size=10)
# Arrows
for y in [Inches(1.55), Inches(2.35), Inches(3.15)]:
    add_arrow(slide, Inches(3), Inches(2.15), Inches(4.5), y, ACCENT2)
    add_arrow(slide, Inches(6.5), y, Inches(8), Inches(2.35), GRAY)
add_text(slide, Inches(3.2), Inches(1.3), Inches(1.5), Inches(0.3), "handoff()", size=8, color=ACCENT2, bold=True)

add_bullet_card(slide, Inches(0.6), Inches(3.7), Inches(5.5), Inches(2.0), "When to Use", [
    "Customer service: triage → specialist agent routing",
    "Agent realizes it lacks expertise, transfers to another",
    "Autonomous mode: specialists iterate independently",
    "Multi-tier: specialist can handoff to sub-specialists",
], PURPLE)

add_code_box(slide, Inches(6.5), Inches(3.7), Inches(6.2), Inches(2.0), [
    "from agent_framework.orchestrations import HandoffBuilder",
    "",
    "workflow = (",
    "    HandoffBuilder()",
    "    .set_triage_agent(triage_agent)",
    "    .add_agent(billing_agent, name='Billing')",
    "    .add_agent(tech_agent, name='TechSupport')",
    "    .add_handoff('TechSupport', ['Billing'])  # T→B",
    "    .with_autonomous_mode()  # agents iterate",
    "    .build()",
    ")",
])

add_bullet_card(slide, Inches(0.6), Inches(6.0), Inches(12.1), Inches(1.1), "Key Characteristics", [
    "MAF Builder: HandoffBuilder — triage agent routes via tool calls, specialists can cross-handoff",
    "Autonomous mode: specialist runs until done or explicitly invokes handoff tool (no user round-trip)",
    "Full history preserved across handoffs with additional_properties for routing metadata",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 9: GROUP CHAT
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 9, "Group Chat (Multi-Agent Debate)", "Multiple agents discuss in rounds, managed by a moderator")

# Circle of agents
positions = [
    (Inches(4), Inches(1.6)),
    (Inches(6.5), Inches(2.0)),
    (Inches(6.5), Inches(3.0)),
    (Inches(4), Inches(3.4)),
    (Inches(1.5), Inches(3.0)),
    (Inches(1.5), Inches(2.0)),
]
agents = [
    ("🧑‍⚖️ Moderator", ACCENT),
    ("🤖 Pro Agent", GREEN),
    ("🤖 Con Agent", RED),
    ("🤖 Analyst", PURPLE),
    ("🤖 Ethicist", ORANGE),
    ("🤖 Summarizer", CYAN),
]
for (x, y), (label, color) in zip(positions, agents):
    add_node(slide, x, y, Inches(1.6), Inches(0.5), label, color, font_size=9)

# Connecting lines (simplified)
add_text(slide, Inches(3.3), Inches(2.5), Inches(2), Inches(0.4), "🔄 Round-Robin\nor LLM-Selected", size=9, color=GRAY, alignment=PP_ALIGN.CENTER)

add_bullet_card(slide, Inches(0.6), Inches(4.2), Inches(5.5), Inches(2.0), "When to Use", [
    "Multi-perspective debate (ethics, technical, business)",
    "Brainstorming with diverse agent personas",
    "Code review: author + reviewer + security agent",
    "Philosophical debate with structured moderation",
    "Board simulation: CEO, CTO, CFO discuss strategy",
], ORANGE)

add_code_box(slide, Inches(6.5), Inches(4.2), Inches(6.2), Inches(2.0), [
    "from agent_framework.orchestrations import GroupChatBuilder",
    "",
    "workflow = (",
    "    GroupChatBuilder()",
    "    .add_agent(pro_agent, name='Advocate')",
    "    .add_agent(con_agent, name='Critic')",
    "    .add_agent(analyst_agent, name='Analyst')",
    "    .with_orchestrator(agent=moderator_agent)",
    "    .with_max_turns(10)",
    "    .build()",
    ")",
])

add_bullet_card(slide, Inches(0.6), Inches(6.5), Inches(12.1), Inches(0.7), "Key Characteristics", [
    "MAF Builder: GroupChatBuilder — agent manager selects next speaker via LLM or simple function selector",
    "Supports max_turns, tool approval, request_info for human steering mid-debate",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 10: SUB-WORKFLOW / NESTING
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 10, "Sub-Workflow / Nesting", "Compose workflows hierarchically — a workflow as a step in a parent workflow")

# Parent workflow box
parent = add_box(slide, Inches(0.6), Inches(1.5), Inches(11.5), Inches(2.6), BG_CARD, border_color=ACCENT, border_width=Pt(2))
add_text(slide, Inches(0.8), Inches(1.6), Inches(3), Inches(0.3), "Parent Workflow", size=12, bold=True, color=ACCENT)

add_node(slide, Inches(1), Inches(2.2), Inches(1.3), Inches(0.55), "📥 Input", ACCENT, font_size=9)
add_node(slide, Inches(2.8), Inches(2.2), Inches(1.5), Inches(0.55), "🤖 Pre-process", PURPLE, font_size=9)
# Child workflow box
child = add_box(slide, Inches(4.8), Inches(1.9), Inches(4.2), Inches(1.1), RGBColor(0x15, 0x20, 0x35), border_color=PURPLE, border_width=Pt(1.5))
add_text(slide, Inches(5.0), Inches(1.95), Inches(3), Inches(0.25), "Child Workflow (Nested)", size=9, bold=True, color=PURPLE)
add_node(slide, Inches(5.0), Inches(2.35), Inches(1.1), Inches(0.45), "🤖 Step A", GREEN, font_size=8)
add_node(slide, Inches(6.3), Inches(2.35), Inches(1.1), Inches(0.45), "🤖 Step B", GREEN, font_size=8)
add_node(slide, Inches(7.6), Inches(2.35), Inches(1.1), Inches(0.45), "🤖 Step C", GREEN, font_size=8)
add_arrow(slide, Inches(6.1), Inches(2.55), Inches(6.3), Inches(2.55), GRAY)
add_arrow(slide, Inches(7.4), Inches(2.55), Inches(7.6), Inches(2.55), GRAY)

add_node(slide, Inches(9.5), Inches(2.2), Inches(1.5), Inches(0.55), "🤖 Post-process", ORANGE, font_size=9)
add_node(slide, Inches(11.3), Inches(2.2), Inches(0.6), Inches(0.55), "📤", ACCENT, font_size=10)
# Arrows
add_arrow(slide, Inches(2.3), Inches(2.45), Inches(2.8), Inches(2.45), GRAY)
add_arrow(slide, Inches(4.3), Inches(2.45), Inches(4.8), Inches(2.45), GRAY)
add_arrow(slide, Inches(9.0), Inches(2.45), Inches(9.5), Inches(2.45), GRAY)
add_arrow(slide, Inches(11.0), Inches(2.45), Inches(11.3), Inches(2.45), GRAY)

add_bullet_card(slide, Inches(0.6), Inches(4.4), Inches(5.5), Inches(2.0), "When to Use", [
    "Reusable workflow modules (e.g., 'KYC Check' sub-workflow)",
    "Team-owned sub-workflows composed into larger pipelines",
    "Isolate complex logic into testable sub-units",
    "Recursive workflows: a workflow can contain itself",
    "A2A: cross-service workflow composition",
], GREEN)

add_code_box(slide, Inches(6.5), Inches(4.4), Inches(6.2), Inches(2.0), [
    "# Sub-workflow as executor",
    "child_wf = Workflow()",
    "child_wf.add_executor('step_a', agent_a)",
    "child_wf.add_executor('step_b', agent_b)",
    "child_wf.add_edge('step_a', 'step_b')",
    "",
    "parent_wf = Workflow()",
    "parent_wf.add_executor('preprocess', pre_agent)",
    "parent_wf.add_executor('child', child_wf.as_executor())",
    "parent_wf.add_edge('preprocess', 'child')",
])

add_bullet_card(slide, Inches(0.6), Inches(6.7), Inches(12.1), Inches(0.5), "Key Characteristics", [
    "MAF: sub_workflow_basics — wrap Workflow as executor via .as_executor(); supports kwargs propagation, request interception, checkpointing",
], GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 11: SUMMARY MATRIX
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_text(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6), "Pattern Summary — Quick Reference", size=28, bold=True, color=WHITE)

# Table
patterns = [
    ("1", "Sequential Pipeline",      "SequentialBuilder",    "ETL, claim processing",        ACCENT),
    ("2", "Fan-Out / Fan-In",         "ConcurrentBuilder",   "Multi-perspective analysis",    PURPLE),
    ("3", "Conditional Router",       "edge_condition",       "Intent classification",        ORANGE),
    ("4", "Loop / Iteration",         "simple_loop / edges",  "Writer-Critic refinement",     GREEN),
    ("5", "Human-in-the-Loop",        "ctx.request_info()",   "Approval gates, compliance",   CYAN),
    ("6", "Supervisor / Hierarchical","MagenticBuilder",      "Manager-worker delegation",    RED),
    ("7", "Map-Reduce",               "fan_out_fan_in_edges", "Batch / chunk processing",     ACCENT2),
    ("8", "Handoff",                   "HandoffBuilder",       "Customer service routing",     PURPLE),
    ("9", "Group Chat",               "GroupChatBuilder",     "Multi-agent debate",           ORANGE),
    ("10","Sub-Workflow",              "wf.as_executor()",     "Reusable workflow modules",    GREEN),
]

# Header row
row_h = Inches(0.42)
header_y = Inches(1.15)
col_x = [Inches(0.6), Inches(1.1), Inches(4.0), Inches(7.0), Inches(10.0)]
col_w = [Inches(0.5), Inches(2.9), Inches(3.0), Inches(3.0), Inches(2.6)]
headers = ["#", "Pattern", "MAF Primitive", "Use Case", "Status"]
for i, h in enumerate(headers):
    add_box(slide, col_x[i], header_y, col_w[i], row_h, ACCENT)
    add_text(slide, col_x[i] + Inches(0.1), header_y + Inches(0.06), col_w[i] - Inches(0.2), row_h,
             h, size=11, bold=True, color=WHITE, font_name="Segoe UI")

for r, (num, name, builder, usecase, color) in enumerate(patterns):
    y = header_y + row_h + Inches(r * 0.48)
    bg = BG_CARD if r % 2 == 0 else RGBColor(0x16, 0x1F, 0x33)
    for i, text in enumerate([num, name, builder, usecase, "✅ Built-in"]):
        add_box(slide, col_x[i], y, col_w[i], Inches(0.44), bg)
        tc = color if i == 1 else (ACCENT2 if i == 2 else (LIGHT if i == 4 else LIGHT))
        add_text(slide, col_x[i] + Inches(0.1), y + Inches(0.08), col_w[i] - Inches(0.2), Inches(0.3),
                 text, size=10, color=tc, bold=(i <= 1), font_name="Segoe UI")

add_text(slide, Inches(0.6), Inches(6.6), Inches(12), Inches(0.5),
         "All 10 patterns are available today in Microsoft Agent Framework (Python + .NET)  •  Hosted on Azure Container Apps  •  Cosmos DB state  •  Azure OpenAI",
         size=11, color=GRAY, alignment=PP_ALIGN.LEFT)


# ═══════════════════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════════════════
out_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(out_dir, "MAF-10-Orchestration-Patterns.pptx")
prs.save(out_path)
print(f"✅ Saved: {out_path}")
print(f"   Slides: {len(prs.slides)}")
