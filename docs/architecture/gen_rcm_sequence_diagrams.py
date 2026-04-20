"""
Generate RCM domain sequence diagrams as a PPTX presentation.
6 use cases showing end-to-end platform interactions:
  1. Denial Intelligence
  2. Automated Medical Coding
  3. Claims Submission Pipeline
  4. Eligibility Verification
  5. Prior Authorization
  6. Payment Posting & Reconciliation
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
import os

# ── Brand colours ────────────────────────────────────────────────────────
BG_DARK  = RGBColor(0x0F, 0x17, 0x2A)
BG_CARD  = RGBColor(0x1A, 0x23, 0x3B)
ACCENT   = RGBColor(0x00, 0x78, 0xD4)
TEAL     = RGBColor(0x50, 0xE6, 0xC2)
WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
GRAY     = RGBColor(0xA0, 0xAE, 0xC0)
LIGHT    = RGBColor(0xE0, 0xE8, 0xF0)
GREEN    = RGBColor(0x10, 0xB9, 0x81)
ORANGE   = RGBColor(0xF5, 0x9E, 0x0B)
PURPLE   = RGBColor(0x8B, 0x5C, 0xF6)
RED      = RGBColor(0xEF, 0x44, 0x44)
CYAN     = RGBColor(0x06, 0xB6, 0xD4)
PINK     = RGBColor(0xEC, 0x48, 0x99)
AMBER    = RGBColor(0xF5, 0x9E, 0x0B)
INDIGO   = RGBColor(0x63, 0x66, 0xF1)

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

def add_box(slide, left, top, width, height, fill_color, border_color=None, border_w=Pt(1)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = border_w
    else:
        shape.line.fill.background()
    shape.shadow.inherit = False
    return shape

def add_rect(slide, left, top, width, height, fill_color, border_color=None, border_w=Pt(1)):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = border_w
    else:
        shape.line.fill.background()
    shape.shadow.inherit = False
    return shape

def add_text(slide, left, top, width, height, text, size=14, color=WHITE, bold=False, align=PP_ALIGN.LEFT, font="Segoe UI"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font
    p.alignment = align
    return tf

def add_line(slide, x1, y1, x2, y2, color=GRAY, width=Pt(1), dash=False):
    cn = slide.shapes.add_connector(1, x1, y1, x2, y2)
    cn.line.color.rgb = color
    cn.line.width = width
    if dash:
        cn.line.dash_style = 4  # dash
    return cn

def add_arrow_line(slide, x1, y1, x2, y2, color=TEAL, width=Pt(1.5)):
    """Arrow using a line + small triangle head drawn manually."""
    cn = slide.shapes.add_connector(1, x1, y1, x2, y2)
    cn.line.color.rgb = color
    cn.line.width = width
    return cn


# ═══════════════════════════════════════════════════════════════════════════
# SEQUENCE DIAGRAM ENGINE
# ═══════════════════════════════════════════════════════════════════════════

class SequenceDiagram:
    """Draws a UML-style sequence diagram on a PPTX slide."""

    def __init__(self, slide, participants, start_y=Inches(1.8), end_y=Inches(7.0),
                 left_margin=Inches(0.3), right_margin=Inches(0.3)):
        self.slide = slide
        self.participants = participants  # list of (name, color)
        self.n = len(participants)
        self.start_y = start_y
        self.end_y = end_y
        self.left_margin = left_margin
        self.right_margin = right_margin

        usable_w = SLIDE_W - left_margin - right_margin
        self.spacing = int(usable_w / self.n)
        self.positions = {}  # name -> center_x

        # Draw participant boxes and lifelines
        box_w = self.spacing - Inches(0.15)
        box_h = Inches(0.55)
        for i, (name, color) in enumerate(participants):
            cx = int(left_margin + self.spacing * i + self.spacing / 2)
            self.positions[name] = cx

            # Box
            bx = int(cx - box_w / 2)
            shape = add_rect(slide, bx, start_y - Inches(0.05), box_w, box_h, color, border_color=None)
            shape.text_frame.word_wrap = True
            shape.text_frame.paragraphs[0].text = name
            shape.text_frame.paragraphs[0].font.size = Pt(8)
            shape.text_frame.paragraphs[0].font.color.rgb = WHITE
            shape.text_frame.paragraphs[0].font.bold = True
            shape.text_frame.paragraphs[0].font.name = "Segoe UI"
            shape.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

            # Lifeline (dashed vertical)
            add_line(slide, cx, start_y + box_h, cx, end_y, RGBColor(0x40, 0x50, 0x70), Pt(1), dash=True)

        self.msg_y = start_y + box_h + Inches(0.15)
        self.step = Inches(0.32)

    def message(self, from_name, to_name, label, color=TEAL, response=False, label_color=None):
        """Draw a message arrow between two participants."""
        x1 = self.positions[from_name]
        x2 = self.positions[to_name]
        y = self.msg_y

        lc = label_color or (GRAY if response else LIGHT)
        line_color = RGBColor(0x50, 0x60, 0x80) if response else color

        # Dashed for responses
        cn = self.slide.shapes.add_connector(1, x1, y, x2, y)
        cn.line.color.rgb = line_color
        cn.line.width = Pt(1.5 if not response else 1)
        if response:
            cn.line.dash_style = 4

        # Label above the arrow
        lx = min(x1, x2) + Inches(0.1)
        lw = abs(x2 - x1) - Inches(0.2)
        if lw < Inches(0.5):
            lw = Inches(1.5)
            lx = min(x1, x2) - Inches(0.2)

        add_text(self.slide, lx, y - Inches(0.22), lw, Inches(0.2),
                 label, size=7, color=lc, bold=False, align=PP_ALIGN.CENTER, font="Segoe UI")

        self.msg_y += self.step
        return self

    def note(self, participant, text, color=AMBER, width=Inches(1.8)):
        """Small note box next to a participant lifeline."""
        cx = self.positions[participant]
        y = self.msg_y - Inches(0.05)
        bx = int(cx - width / 2)
        shape = add_rect(self.slide, bx, y, width, Inches(0.25), BG_CARD, border_color=color, border_w=Pt(1))
        shape.text_frame.paragraphs[0].text = text
        shape.text_frame.paragraphs[0].font.size = Pt(7)
        shape.text_frame.paragraphs[0].font.color.rgb = color
        shape.text_frame.paragraphs[0].font.name = "Segoe UI"
        shape.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
        self.msg_y += Inches(0.3)
        return self

    def divider(self, label, color=ACCENT):
        """Horizontal divider with label (like alt/opt/loop fragment)."""
        y = self.msg_y
        left = self.left_margin + Inches(0.2)
        right = SLIDE_W - self.right_margin - Inches(0.2)
        add_line(self.slide, left, y, right, y, color, Pt(0.5), dash=True)
        add_text(self.slide, left, y - Inches(0.02), Inches(3), Inches(0.2),
                 f"━━ {label} ━━", size=7, color=color, bold=True, font="Segoe UI")
        self.msg_y += Inches(0.22)
        return self


def slide_header(slide, number, title, subtitle="", pattern=""):
    badge = add_box(slide, Inches(0.4), Inches(0.2), Inches(0.55), Inches(0.55), ACCENT)
    badge.text_frame.paragraphs[0].text = str(number)
    badge.text_frame.paragraphs[0].font.size = Pt(22)
    badge.text_frame.paragraphs[0].font.color.rgb = WHITE
    badge.text_frame.paragraphs[0].font.bold = True
    badge.text_frame.paragraphs[0].font.name = "Segoe UI"
    badge.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

    add_text(slide, Inches(1.1), Inches(0.15), Inches(9), Inches(0.45), title, size=22, bold=True, color=WHITE)
    if subtitle:
        add_text(slide, Inches(1.1), Inches(0.55), Inches(9), Inches(0.3), subtitle, size=11, color=GRAY)
    if pattern:
        add_box(slide, Inches(10.5), Inches(0.25), Inches(2.5), Inches(0.35), BG_CARD, border_color=PURPLE)
        add_text(slide, Inches(10.5), Inches(0.27), Inches(2.5), Inches(0.3), pattern, size=9, color=PURPLE, bold=True, align=PP_ALIGN.CENTER)

    line = slide.shapes.add_connector(1, Inches(0.4), Inches(0.95), Inches(12.9), Inches(0.95))
    line.line.color.rgb = ACCENT
    line.line.width = Pt(1)


# ═══════════════════════════════════════════════════════════════════════════
# TITLE SLIDE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)

add_text(slide, Inches(1), Inches(1.2), Inches(11), Inches(1.0),
         "RCM Domain — Platform Sequence Diagrams", size=40, bold=True, color=WHITE)
add_text(slide, Inches(1), Inches(2.2), Inches(11), Inches(0.6),
         "AI Marketplace Orchestration Flows", size=28, color=TEAL)

line = slide.shapes.add_connector(1, Inches(1), Inches(3.0), Inches(5), Inches(3.0))
line.line.color.rgb = ACCENT
line.line.width = Pt(3)

use_cases = [
    ("1", "Denial Intelligence",         "Conditional Router + Supervisor",  PURPLE),
    ("2", "Automated Medical Coding",     "Sequential + Loop",               GREEN),
    ("3", "Claims Submission Pipeline",   "Sub-Workflow + Fan-Out",          ORANGE),
    ("4", "Eligibility Verification",     "Sequential + MCP Tool Call",      CYAN),
    ("5", "Prior Authorization",          "Human-in-the-Loop + Handoff",     PINK),
    ("6", "Payment Posting & Reconciliation", "Map-Reduce + Fan-Out/Fan-In", AMBER),
]

y = Inches(3.5)
for num, title, pattern, color in use_cases:
    add_box(slide, Inches(1), y, Inches(0.5), Inches(0.4), color)
    add_text(slide, Inches(1.05), y + Inches(0.05), Inches(0.4), Inches(0.3), num, size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(1.7), y + Inches(0.02), Inches(4.5), Inches(0.35), title, size=14, bold=True, color=WHITE)
    add_text(slide, Inches(6.5), y + Inches(0.05), Inches(5), Inches(0.3), f"Pattern: {pattern}", size=11, color=GRAY)
    y += Inches(0.52)

add_text(slide, Inches(1), Inches(6.7), Inches(11), Inches(0.4),
         "Platform Components:  Orchestration API  •  Policy Engine  •  A2A Agent Registry  •  MCP Tool Registry  •  Cosmos DB  •  Azure OpenAI",
         size=11, color=GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 1 — DENIAL INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 1, "Denial Intelligence Workflow",
             "Analyze denials → classify root cause → recommend appeal strategy",
             "Conditional Router + Supervisor")

participants = [
    ("Billing\nUser", ACCENT),
    ("Orchestration\nAPI", INDIGO),
    ("Policy\nEngine", RED),
    ("A2A\nRegistry", PURPLE),
    ("Denial\nAnalyzer", GREEN),
    ("MCP: Payer\nPortal", ORANGE),
    ("Azure\nOpenAI", CYAN),
    ("Cosmos\nDB", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.2), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.message("Billing\nUser", "Orchestration\nAPI", "POST /orchestration/executions {template: denial-intelligence, params: {payer: BCBS, codes: [CO-4, CO-11]}}", ACCENT)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(pre, compliance + rate-limit)", INDIGO)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW (HIPAA compliant, rate OK)", response=True)
sd.message("Orchestration\nAPI", "A2A\nRegistry", "GET /a2a-agents?skill=denial-analysis", INDIGO)
sd.message("A2A\nRegistry", "Orchestration\nAPI", "AgentCard {name: denial-analyzer, url: /agents/denial, skills: [map_denial_code, appeal_strategy]}", response=True)
sd.divider("Sequential: Denial Analysis Node")
sd.message("Orchestration\nAPI", "Denial\nAnalyzer", "A2A: tasks/send {denial_codes: [CO-4, CO-11], payer: BCBS}", GREEN)
sd.message("Denial\nAnalyzer", "MCP: Payer\nPortal", "tool: query_denials(payer_id=BCBS, codes=[CO-4,CO-11])", ORANGE)
sd.message("MCP: Payer\nPortal", "Denial\nAnalyzer", "denial records (12 claims, $45K total)", response=True)
sd.message("Denial\nAnalyzer", "Azure\nOpenAI", "Classify root causes + pattern analysis", CYAN)
sd.message("Azure\nOpenAI", "Denial\nAnalyzer", "CO-4: modifier errors (8), CO-11: dx mismatch (4)", response=True)
sd.divider("Conditional: Route by Denial Category")
sd.message("Denial\nAnalyzer", "MCP: Payer\nPortal", "tool: recommend_appeal_strategy(CO-4, BCBS)", ORANGE)
sd.message("MCP: Payer\nPortal", "Denial\nAnalyzer", "appeal strategy + 90-day deadline", response=True)
sd.message("Denial\nAnalyzer", "Orchestration\nAPI", "result: {root_causes, appeal_strategies, draft_letters}", GREEN)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(post, content-filter + PII)", RED)
sd.message("Policy\nEngine", "Orchestration\nAPI", "TRANSFORM: redact SSN/MRN from output", response=True, label_color=AMBER)
sd.message("Orchestration\nAPI", "Cosmos\nDB", "upsert execution + audit trail", AMBER)
sd.message("Orchestration\nAPI", "Billing\nUser", "200 OK: {analysis, appeals, letters, policy_violations: 0}", response=True)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 2 — AUTOMATED MEDICAL CODING
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 2, "Automated Medical Coding",
             "Clinical note → ICD-10/CPT suggestion → validation loop → final codes",
             "Sequential + Loop (Writer-Critic)")

participants = [
    ("Clinical\nUser", ACCENT),
    ("Orchestration\nAPI", INDIGO),
    ("Policy\nEngine", RED),
    ("A2A\nRegistry", PURPLE),
    ("Coding\nAgent", GREEN),
    ("Validator\nAgent", ORANGE),
    ("MCP: Code\nLookup", CYAN),
    ("Cosmos\nDB", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.2), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.message("Clinical\nUser", "Orchestration\nAPI", "POST /executions {template: medical-coding, params: {note: 'Pt presents with chest pain...'}}", ACCENT)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(pre, model-allowlist + compliance)", INDIGO)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW (GPT-4o approved for PHI, BAA in place)", response=True)
sd.message("Orchestration\nAPI", "A2A\nRegistry", "resolve agents: coding-agent, coding-validator", INDIGO)
sd.message("A2A\nRegistry", "Orchestration\nAPI", "2 AgentCards returned", response=True)
sd.divider("Sequential: Code Suggestion")
sd.message("Orchestration\nAPI", "Coding\nAgent", "A2A: analyze clinical note → suggest ICD-10 + CPT", GREEN)
sd.message("Coding\nAgent", "MCP: Code\nLookup", "tool: lookup_icd10('chest pain') + lookup_cpt('ECG')", CYAN)
sd.message("MCP: Code\nLookup", "Coding\nAgent", "ICD-10: R07.9, I20.9 | CPT: 93000, 99213", response=True)
sd.message("Coding\nAgent", "Orchestration\nAPI", "suggested codes: [{R07.9, 0.92}, {I20.9, 0.78}, {93000, 0.95}]", GREEN)
sd.divider("Loop: Validation (max 3 iterations)")
sd.message("Orchestration\nAPI", "Validator\nAgent", "A2A: validate codes vs clinical evidence", ORANGE)
sd.message("Validator\nAgent", "MCP: Code\nLookup", "tool: check_ncci_edits(93000, 99213) + lcd_check(R07.9)", CYAN)
sd.message("Validator\nAgent", "Orchestration\nAPI", "REJECT: I20.9 lacks supporting evidence → retry", response=True, label_color=RED)
sd.message("Orchestration\nAPI", "Coding\nAgent", "A2A: re-code with feedback: 'I20.9 unsupported'", GREEN)
sd.message("Coding\nAgent", "Orchestration\nAPI", "revised: [{R07.9, 0.95}, {R00.0, 0.82}, {93000}]", GREEN)
sd.message("Orchestration\nAPI", "Validator\nAgent", "validate revised codes", ORANGE)
sd.message("Validator\nAgent", "Orchestration\nAPI", "✓ PASS: all codes clinically supported", response=True, label_color=GREEN)
sd.message("Orchestration\nAPI", "Cosmos\nDB", "save coding session + audit (2 iterations)", AMBER)
sd.message("Orchestration\nAPI", "Clinical\nUser", "200 OK: {final_codes, confidence_scores, audit_trail}", response=True)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 3 — CLAIMS SUBMISSION PIPELINE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 3, "Claims Submission Pipeline",
             "Eligibility check → Coding → Scrub → Submit → Track",
             "Sub-Workflow + Fan-Out")

participants = [
    ("Billing\nStaff", ACCENT),
    ("Orchestration\nAPI", INDIGO),
    ("Policy\nEngine", RED),
    ("Eligibility\nSub-WF", CYAN),
    ("Coding\nAgent", GREEN),
    ("Scrub\nAgent", ORANGE),
    ("MCP:\nClearinghouse", PURPLE),
    ("Cosmos\nDB", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.2), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.message("Billing\nStaff", "Orchestration\nAPI", "POST /executions {template: claims-submission, params: {encounter_id, patient, payer}}", ACCENT)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(pre, cost-budget + rate-limit)", INDIGO)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW (within 500 claims/hr budget)", response=True)
sd.divider("Sub-Workflow: Eligibility Verification")
sd.message("Orchestration\nAPI", "Eligibility\nSub-WF", "invoke sub-workflow: verify_eligibility(patient, payer, DOS)", CYAN)
sd.message("Eligibility\nSub-WF", "Orchestration\nAPI", "✓ ACTIVE: PPO, deductible met, copay $30", response=True, label_color=GREEN)
sd.divider("Sequential: Code + Scrub")
sd.message("Orchestration\nAPI", "Coding\nAgent", "A2A: auto-code encounter (ICD-10, CPT, modifiers)", GREEN)
sd.message("Coding\nAgent", "Orchestration\nAPI", "codes: [E11.9, 99214-25, 36415]", GREEN)
sd.message("Orchestration\nAPI", "Scrub\nAgent", "A2A: scrub claim (NCCI edits, LCD/NCD, payer rules)", ORANGE)
sd.message("Scrub\nAgent", "Orchestration\nAPI", "✓ CLEAN: no edits triggered, claim-ready", response=True, label_color=GREEN)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(post, compliance + data-access)", RED)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW", response=True)
sd.divider("Submit to Clearinghouse")
sd.message("Orchestration\nAPI", "MCP:\nClearinghouse", "tool: submit_837p(claim_data, payer_id=BCBS)", PURPLE)
sd.message("MCP:\nClearinghouse", "Orchestration\nAPI", "claim_ref: CLM-2026-44821, status: accepted", response=True)
sd.message("Orchestration\nAPI", "Cosmos\nDB", "save execution {status: completed, claim_ref}", AMBER)
sd.message("Orchestration\nAPI", "Billing\nStaff", "200 OK: {claim_ref, codes, eligibility_summary, scrub_result}", response=True)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 4 — ELIGIBILITY VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 4, "Eligibility Verification",
             "Real-time 270/271 check via registered MCP tool + benefit summary generation",
             "Sequential + MCP Tool Call")

participants = [
    ("Front Desk\nStaff", ACCENT),
    ("Orchestration\nAPI", INDIGO),
    ("Policy\nEngine", RED),
    ("A2A\nRegistry", PURPLE),
    ("Eligibility\nAgent", GREEN),
    ("MCP: 270/271\nGateway", CYAN),
    ("Azure\nOpenAI", PINK),
    ("Cosmos\nDB", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.2), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.message("Front Desk\nStaff", "Orchestration\nAPI", "POST /executions {template: eligibility-check, params: {patient, member_id, payer: BCBS, DOS}}", ACCENT)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(pre, rate-limit + data-access)", INDIGO)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW (data-access: payer-portal source permitted)", response=True)
sd.message("Orchestration\nAPI", "A2A\nRegistry", "GET /a2a-agents?skill=eligibility-verification", INDIGO)
sd.message("A2A\nRegistry", "Orchestration\nAPI", "AgentCard {name: eligibility-verifier, tools: [verify_eligibility]}", response=True)
sd.divider("Agent Execution")
sd.message("Orchestration\nAPI", "Eligibility\nAgent", "A2A: tasks/send {patient, member_id, payer, DOS, provider_npi}", GREEN)
sd.message("Eligibility\nAgent", "MCP: 270/271\nGateway", "tool: send_270(member_id, payer_id, provider_npi, service_type)", CYAN)
sd.message("MCP: 270/271\nGateway", "Eligibility\nAgent", "271 Response: {active, plan: PPO-500, deductible: $1500, met: $1200}", response=True)
sd.message("Eligibility\nAgent", "Azure\nOpenAI", "Generate plain-English benefit summary for front desk", PINK)
sd.message("Azure\nOpenAI", "Eligibility\nAgent", "Patient has active BCBS PPO. $300 remaining on deductible...", response=True)
sd.note("Eligibility\nAgent", "Flag: near deductible limit", AMBER)
sd.message("Eligibility\nAgent", "Orchestration\nAPI", "result: {status: active, benefits_summary, flags: [near_deductible]}", GREEN)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(post, PII compliance)", RED)
sd.message("Policy\nEngine", "Orchestration\nAPI", "TRANSFORM: mask member_id in logs", response=True, label_color=AMBER)
sd.message("Orchestration\nAPI", "Cosmos\nDB", "save verification record + audit", AMBER)
sd.message("Orchestration\nAPI", "Front Desk\nStaff", "200 OK: {plain_english_summary, copay: $30, flags}", response=True)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 5 — PRIOR AUTHORIZATION
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 5, "Prior Authorization Workflow",
             "Auto-generate auth request → submit → pause for payer decision → resume",
             "Human-in-the-Loop + Handoff")

participants = [
    ("Provider\nOffice", ACCENT),
    ("Orchestration\nAPI", INDIGO),
    ("Policy\nEngine", RED),
    ("Prior Auth\nAgent", GREEN),
    ("Clinical\nDoc Agent", PURPLE),
    ("MCP: Payer\nAuth Portal", ORANGE),
    ("⏸ Approval\nGate", PINK),
    ("Cosmos\nDB", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.2), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.message("Provider\nOffice", "Orchestration\nAPI", "POST /executions {template: prior-auth, params: {procedure: MRI-Knee, dx: M23.21, payer: AETNA}}", ACCENT)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(pre, human-gate + compliance)", INDIGO)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW + human-gate attached to submission node", response=True)
sd.divider("Sequential: Gather Clinical Documentation")
sd.message("Orchestration\nAPI", "Clinical\nDoc Agent", "A2A: compile clinical justification for MRI-Knee + M23.21", PURPLE)
sd.message("Clinical\nDoc Agent", "Orchestration\nAPI", "clinical package: {history, imaging_rationale, dx_support}", PURPLE)
sd.divider("Handoff → Prior Auth Agent")
sd.message("Orchestration\nAPI", "Prior Auth\nAgent", "A2A: generate auth request (AETNA format)", GREEN)
sd.message("Prior Auth\nAgent", "MCP: Payer\nAuth Portal", "tool: submit_prior_auth(procedure, dx, clinical_package)", ORANGE)
sd.message("MCP: Payer\nAuth Portal", "Prior Auth\nAgent", "auth_ref: PA-2026-8891, status: PENDING_REVIEW", response=True)
sd.message("Prior Auth\nAgent", "Orchestration\nAPI", "submitted, awaiting payer decision", GREEN)
sd.divider("⏸ Human-in-the-Loop: Payer Decision (hours/days)")
sd.message("Orchestration\nAPI", "⏸ Approval\nGate", "PAUSE execution — waiting for external event", PINK)
sd.message("Orchestration\nAPI", "Cosmos\nDB", "save state (status: paused, auth_ref: PA-2026-8891)", AMBER)
sd.note("⏸ Approval\nGate", "⏸ Zero compute cost during wait", TEAL, Inches(2.2))
sd.message("⏸ Approval\nGate", "Orchestration\nAPI", "EVENT: payer approved (webhook / manual entry)", PINK)
sd.message("Orchestration\nAPI", "Prior Auth\nAgent", "resume: auth approved, generate confirmation", GREEN)
sd.message("Orchestration\nAPI", "Cosmos\nDB", "update execution (status: completed, auth: APPROVED)", AMBER)
sd.message("Orchestration\nAPI", "Provider\nOffice", "200 OK: {auth_number: PA-2026-8891, status: APPROVED, valid_until: ...}", response=True)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 6 — PAYMENT POSTING & RECONCILIATION
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 6, "Payment Posting & Reconciliation",
             "Batch ERA (835) → map each claim line → detect underpayments → reconcile",
             "Map-Reduce + Fan-Out/Fan-In")

participants = [
    ("Finance\nTeam", ACCENT),
    ("Orchestration\nAPI", INDIGO),
    ("Policy\nEngine", RED),
    ("Splitter\nNode", CYAN),
    ("Payment\nAgent ×N", GREEN),
    ("MCP: Fee\nSchedule", ORANGE),
    ("Underpay\nAnalyzer", PURPLE),
    ("Cosmos\nDB", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.2), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.message("Finance\nTeam", "Orchestration\nAPI", "POST /executions {template: payment-reconciliation, params: {era_file: ERA-835-20260317.edi}}", ACCENT)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(pre, cost-budget + data-access)", INDIGO)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW (within daily processing budget)", response=True)
sd.divider("MAP Phase: Split ERA into claim lines")
sd.message("Orchestration\nAPI", "Splitter\nNode", "parse ERA-835 → extract 47 claim line items", CYAN)
sd.message("Splitter\nNode", "Orchestration\nAPI", "47 claim lines ready for parallel processing", response=True)
sd.divider("Fan-Out: Process each claim line (×47 parallel)")
sd.message("Orchestration\nAPI", "Payment\nAgent ×N", "A2A: process_payment(claim_line[0..46]) — 47 parallel tasks", GREEN)
sd.message("Payment\nAgent ×N", "MCP: Fee\nSchedule", "tool: get_contracted_rate(CPT, payer, facility_type) ×47", ORANGE)
sd.message("MCP: Fee\nSchedule", "Payment\nAgent ×N", "contracted rates for all 47 lines", response=True)
sd.note("Payment\nAgent ×N", "Compare: paid vs contracted rate", TEAL, Inches(2.2))
sd.message("Payment\nAgent ×N", "Orchestration\nAPI", "47 results: [{posted, variance, flag}...]", GREEN)
sd.divider("REDUCE Phase: Aggregate + Underpayment Analysis")
sd.message("Orchestration\nAPI", "Underpay\nAnalyzer", "A2A: analyze {5 underpaid, 2 overpaid, 40 matched}", PURPLE)
sd.message("Underpay\nAnalyzer", "Orchestration\nAPI", "recommendations: {appeal 3 claims ($2,400), write-off 2 ($180)}", PURPLE)
sd.message("Orchestration\nAPI", "Policy\nEngine", "evaluatePolicies(post, compliance + audit)", RED)
sd.message("Policy\nEngine", "Orchestration\nAPI", "✓ ALLOW (all amounts within audit thresholds)", response=True)
sd.message("Orchestration\nAPI", "Cosmos\nDB", "save reconciliation {47 lines, 5 variances, actions}", AMBER)
sd.message("Orchestration\nAPI", "Finance\nTeam", "200 OK: {posted: 47, variances: 5, appeal_amount: $2,400, full_report}", response=True)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 7 — PLATFORM FLOW LEGEND
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_text(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.6), "Platform Component Interaction Map", size=26, bold=True, color=WHITE)
line = slide.shapes.add_connector(1, Inches(0.6), Inches(0.85), Inches(12.7), Inches(0.85))
line.line.color.rgb = ACCENT
line.line.width = Pt(1)

# Component legend
components = [
    ("Orchestration API", INDIGO, "FastAPI + MAF Workflows — routes requests, manages execution state, enforces policy gates"),
    ("Policy Engine", RED, "Pre/post enforcement: rate-limit, model-allowlist, content-filter, compliance, human-gate, cost-budget"),
    ("A2A Agent Registry", PURPLE, "Agent discovery via A2A protocol — AgentCards with skills, capabilities, endpoint URLs"),
    ("MCP Tool Registry", ORANGE, "Tool discovery — input schemas, server health, security scans; tools called by agents at runtime"),
    ("Cosmos DB", AMBER, "Execution state, audit trails, agent registry, policy store, sessions (serverless, /tenantId partition)"),
    ("Azure OpenAI", CYAN, "LLM inference — GPT-4o for reasoning, classification, summarization, code generation"),
]

y = Inches(1.1)
for name, color, desc in components:
    add_box(slide, Inches(0.6), y, Inches(0.15), Inches(0.5), color)
    add_text(slide, Inches(0.95), y, Inches(3), Inches(0.3), name, size=13, bold=True, color=WHITE)
    add_text(slide, Inches(0.95), y + Inches(0.28), Inches(11.5), Inches(0.3), desc, size=10, color=GRAY)
    y += Inches(0.65)

# Protocol legend
y += Inches(0.2)
add_text(slide, Inches(0.6), y, Inches(10), Inches(0.4), "Protocol & Pattern Legend", size=16, bold=True, color=WHITE)
y += Inches(0.45)

protocols = [
    ("A2A Protocol", PURPLE, "Agent-to-Agent: tasks/send, tasks/get — standardized agent invocation across services"),
    ("MCP Protocol", ORANGE, "Model Context Protocol: tool discovery + invocation — agents call tools via registered MCP servers"),
    ("Orchestration Patterns Used", TEAL, "Sequential, Fan-Out/Fan-In, Conditional Router, Loop, Human-in-the-Loop, Sub-Workflow, Map-Reduce, Handoff, Supervisor"),
    ("Policy Types Enforced", RED, "rate-limit, model-allowlist, content-filter, data-access, compliance (PII/PHI), cost-budget, human-gate, custom"),
]

for name, color, desc in protocols:
    add_box(slide, Inches(0.6), y, Inches(0.15), Inches(0.45), color)
    add_text(slide, Inches(0.95), y, Inches(3), Inches(0.25), name, size=12, bold=True, color=color)
    add_text(slide, Inches(0.95), y + Inches(0.23), Inches(11.5), Inches(0.25), desc, size=10, color=LIGHT)
    y += Inches(0.6)

# Bottom note
add_text(slide, Inches(0.6), Inches(6.8), Inches(12), Inches(0.4),
         "All flows use Microsoft Agent Framework on Azure Container Apps  •  Cosmos DB (serverless)  •  Azure OpenAI (GPT-4o)  •  Policy enforcement on every node",
         size=10, color=GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════════════════
out_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(out_dir, "RCM-Platform-Sequence-Diagrams.pptx")
prs.save(out_path)
print(f"✅ Saved: {out_path}")
print(f"   Slides: {len(prs.slides)}")
