"""
Generate Developer Experience sequence diagrams for the AI Platform.
Shows design-time flows: building agents, registering tools, creating orchestrations,
testing, and deploying — all from VS Code.
"""

from pptx import Presentation
from pptx.util import Inches, Pt
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
VSCODE   = RGBColor(0x00, 0x7A, 0xCC)
LIME     = RGBColor(0x84, 0xCC, 0x16)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H


def add_bg(slide, color=BG_DARK):
    fill = slide.background.fill
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
        cn.line.dash_style = 4
    return cn


class SequenceDiagram:
    def __init__(self, slide, participants, start_y=Inches(1.8), end_y=Inches(7.0),
                 left_margin=Inches(0.3), right_margin=Inches(0.3)):
        self.slide = slide
        self.participants = participants
        self.n = len(participants)
        self.start_y = start_y
        self.end_y = end_y
        self.left_margin = left_margin
        self.right_margin = right_margin
        usable_w = SLIDE_W - left_margin - right_margin
        self.spacing = int(usable_w / self.n)
        self.positions = {}
        box_w = self.spacing - Inches(0.15)
        box_h = Inches(0.55)
        for i, (name, color) in enumerate(participants):
            cx = int(left_margin + self.spacing * i + self.spacing / 2)
            self.positions[name] = cx
            bx = int(cx - box_w / 2)
            shape = add_rect(slide, bx, start_y - Inches(0.05), box_w, box_h, color)
            shape.text_frame.word_wrap = True
            shape.text_frame.paragraphs[0].text = name
            shape.text_frame.paragraphs[0].font.size = Pt(8)
            shape.text_frame.paragraphs[0].font.color.rgb = WHITE
            shape.text_frame.paragraphs[0].font.bold = True
            shape.text_frame.paragraphs[0].font.name = "Segoe UI"
            shape.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
            add_line(slide, cx, start_y + box_h, cx, end_y, RGBColor(0x40, 0x50, 0x70), Pt(1), dash=True)
        self.msg_y = start_y + box_h + Inches(0.15)
        self.step = Inches(0.30)

    def message(self, from_name, to_name, label, color=TEAL, response=False, label_color=None):
        x1 = self.positions[from_name]
        x2 = self.positions[to_name]
        y = self.msg_y
        lc = label_color or (GRAY if response else LIGHT)
        line_color = RGBColor(0x50, 0x60, 0x80) if response else color
        cn = self.slide.shapes.add_connector(1, x1, y, x2, y)
        cn.line.color.rgb = line_color
        cn.line.width = Pt(1.5 if not response else 1)
        if response:
            cn.line.dash_style = 4
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
        y = self.msg_y
        left = self.left_margin + Inches(0.2)
        right = SLIDE_W - self.right_margin - Inches(0.2)
        add_line(self.slide, left, y, right, y, color, Pt(0.5), dash=True)
        add_text(self.slide, left, y - Inches(0.02), Inches(4), Inches(0.2),
                 f"━━ {label} ━━", size=7, color=color, bold=True, font="Segoe UI")
        self.msg_y += Inches(0.22)
        return self


def slide_header(slide, number, title, subtitle="", pattern=""):
    badge = add_box(slide, Inches(0.4), Inches(0.2), Inches(0.55), Inches(0.55), VSCODE)
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
        add_box(slide, Inches(10.2), Inches(0.25), Inches(2.8), Inches(0.35), BG_CARD, border_color=VSCODE)
        add_text(slide, Inches(10.2), Inches(0.27), Inches(2.8), Inches(0.3), pattern, size=9, color=VSCODE, bold=True, align=PP_ALIGN.CENTER)
    line = slide.shapes.add_connector(1, Inches(0.4), Inches(0.95), Inches(12.9), Inches(0.95))
    line.line.color.rgb = VSCODE
    line.line.width = Pt(1)


# ═══════════════════════════════════════════════════════════════════════════
# TITLE SLIDE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)

add_text(slide, Inches(1), Inches(1.0), Inches(11), Inches(1.0),
         "Developer Experience", size=44, bold=True, color=WHITE)
add_text(slide, Inches(1), Inches(2.0), Inches(11), Inches(0.8),
         "Building AI Agents & Orchestrations on the AI Platform", size=28, color=TEAL)
add_text(slide, Inches(1), Inches(3.0), Inches(11), Inches(0.5),
         "Design-Time Flows  •  VS Code  •  Microsoft Agent Framework", size=16, color=GRAY)

line = slide.shapes.add_connector(1, Inches(1), Inches(2.85), Inches(5), Inches(2.85))
line.line.color.rgb = VSCODE
line.line.width = Pt(3)

journeys = [
    ("1", "Agent Development Lifecycle",  "Scaffold → Code → Test → Register",         VSCODE),
    ("2", "MCP Tool Development",          "Build tool server → Test → Publish to registry", GREEN),
    ("3", "Orchestration Design",          "Visual builder → Wire agents → Add policies",   ORANGE),
    ("4", "Local Testing & Debugging",     "Emulator → F5 debug → Policy simulation",       CYAN),
    ("5", "CI/CD & Deployment",            "Git push → Pipeline → Container Apps → Verify",  PURPLE),
    ("6", "Day-2 Operations",              "Monitor → Iterate → Version → A/B test",        PINK),
]

y = Inches(3.8)
for num, title, desc, color in journeys:
    add_box(slide, Inches(1), y, Inches(0.5), Inches(0.4), color)
    add_text(slide, Inches(1.05), y + Inches(0.05), Inches(0.4), Inches(0.3), num, size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(1.7), y + Inches(0.02), Inches(4.5), Inches(0.35), title, size=14, bold=True, color=WHITE)
    add_text(slide, Inches(6.5), y + Inches(0.05), Inches(5), Inches(0.3), desc, size=11, color=GRAY)
    y += Inches(0.5)

add_text(slide, Inches(1), Inches(6.9), Inches(11), Inches(0.3),
         "Tools:  VS Code  •  GitHub Copilot  •  Azure CLI  •  azd  •  Cosmos DB Emulator  •  MAF DevUI  •  Docker",
         size=11, color=GRAY)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 1 — AGENT DEVELOPMENT LIFECYCLE
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 1, "Agent Development Lifecycle",
             "From empty folder to a registered, discoverable A2A agent",
             "Scaffold → Code → Test → Register")

participants = [
    ("Developer\n(VS Code)", VSCODE),
    ("GitHub\nCopilot", RGBColor(0x6E, 0x40, 0xC9)),
    ("MAF\nSDK", GREEN),
    ("Local\nFastAPI", CYAN),
    ("Cosmos DB\nEmulator", AMBER),
    ("MAF\nDevUI", PINK),
    ("AI Platform\nAPI", INDIGO),
    ("A2A Agent\nRegistry", PURPLE),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.15), end_y=Inches(7.2),
                     left_margin=Inches(0.1), right_margin=Inches(0.1))

sd.divider("Phase 1: Scaffold Project")
sd.message("Developer\n(VS Code)", "GitHub\nCopilot", "@workspace create MAF agent for denial management with 3 tools", VSCODE)
sd.message("GitHub\nCopilot", "Developer\n(VS Code)", "Generated: main.py, tools.py, agent_card.json, pyproject.toml, Dockerfile", response=True)
sd.note("Developer\n(VS Code)", "VS Code: Open generated project", VSCODE, Inches(2.0))
sd.divider("Phase 2: Develop Agent + Tools")
sd.message("Developer\n(VS Code)", "MAF\nSDK", "pip install agent-framework — import AzureOpenAIResponsesClient", GREEN)
sd.message("Developer\n(VS Code)", "GitHub\nCopilot", "Generate @tool: map_denial_code(denial_code) → category, description", VSCODE)
sd.message("GitHub\nCopilot", "Developer\n(VS Code)", "def map_denial_code(denial_code: Annotated[str, 'CARC code']) → DenialMapping:", response=True)
sd.message("Developer\n(VS Code)", "MAF\nSDK", "agent = client.as_agent(name='DenialAnalyzer', instructions=..., tools=[map_denial_code])", GREEN)
sd.divider("Phase 3: Test Locally")
sd.message("Developer\n(VS Code)", "Local\nFastAPI", "F5 → uvicorn main:app --port 8087 (launch.json)", CYAN)
sd.message("Developer\n(VS Code)", "MAF\nDevUI", "Open DevUI at localhost:8087/devui — interactive chat", PINK)
sd.message("MAF\nDevUI", "Local\nFastAPI", "Test: 'Analyze CO-4 denial from BCBS'", PINK)
sd.message("Local\nFastAPI", "MAF\nDevUI", "Tool called: map_denial_code('CO-4') → modifier error + appeal steps", response=True)
sd.message("Developer\n(VS Code)", "Cosmos DB\nEmulator", "Verify chat history persisted (Cosmos DB provider)", AMBER)
sd.divider("Phase 4: Register in Platform")
sd.message("Developer\n(VS Code)", "AI Platform\nAPI", "POST /api/a2a-agents {agentCard, endpointUrl, skills, tags: ['rcm','denial']}", INDIGO)
sd.message("AI Platform\nAPI", "A2A Agent\nRegistry", "Store AgentCard, health-check endpoint, set status: active", PURPLE)
sd.message("A2A Agent\nRegistry", "Developer\n(VS Code)", "✓ Registered: denial-analyzer (id: agt-001, discoverable by orchestrations)", response=True, label_color=GREEN)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 2 — MCP TOOL DEVELOPMENT
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 2, "MCP Tool Development & Registration",
             "Build an MCP tool server → test schema → publish to registry → agents discover it",
             "Build → Test → Publish → Discover")

participants = [
    ("Developer\n(VS Code)", VSCODE),
    ("GitHub\nCopilot", RGBColor(0x6E, 0x40, 0xC9)),
    ("MCP\nServer (local)", GREEN),
    ("MCP\nInspector", CYAN),
    ("AI Platform\nAPI", INDIGO),
    ("MCP Tool\nRegistry", ORANGE),
    ("Tool\nDiscovery", PURPLE),
    ("Agents\n(consumers)", PINK),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.15), end_y=Inches(7.2),
                     left_margin=Inches(0.1), right_margin=Inches(0.1))

sd.divider("Phase 1: Scaffold MCP Tool Server")
sd.message("Developer\n(VS Code)", "GitHub\nCopilot", "@workspace create MCP server with tools: query_fee_schedule, check_ncci_edits", VSCODE)
sd.message("GitHub\nCopilot", "Developer\n(VS Code)", "Generated: server.py (streamable-http), tool definitions with input schemas", response=True)
sd.divider("Phase 2: Implement Tool Logic")
sd.message("Developer\n(VS Code)", "MCP\nServer (local)", "Implement query_fee_schedule: {CPT, payer, facility} → contracted_rate", GREEN)
sd.message("Developer\n(VS Code)", "MCP\nServer (local)", "Implement check_ncci_edits: {code1, code2} → {bundled, modifier_allowed}", GREEN)
sd.note("MCP\nServer (local)", "Tools expose JSON Schema input/output", TEAL, Inches(2.0))
sd.divider("Phase 3: Test with MCP Inspector")
sd.message("Developer\n(VS Code)", "MCP\nInspector", "npx @modelcontextprotocol/inspector http://localhost:3001", CYAN)
sd.message("MCP\nInspector", "MCP\nServer (local)", "tools/list → discover 2 tools + schemas", CYAN)
sd.message("MCP\nServer (local)", "MCP\nInspector", "[{name: query_fee_schedule, inputSchema: {...}}, {name: check_ncci_edits, ...}]", response=True)
sd.message("MCP\nInspector", "MCP\nServer (local)", "tools/call: query_fee_schedule({CPT: '99213', payer: 'BCBS'})", CYAN)
sd.message("MCP\nServer (local)", "MCP\nInspector", "{contracted_rate: 125.50, effective_date: '2026-01-01'}", response=True)
sd.divider("Phase 4: Register in Platform")
sd.message("Developer\n(VS Code)", "AI Platform\nAPI", "POST /api/mcp-servers {name: fee-schedule-svc, endpointUrl, transport: streamable-http, tags: ['rcm']}", INDIGO)
sd.message("AI Platform\nAPI", "Tool\nDiscovery", "GET /tools/list → auto-discover + cache tool schemas", PURPLE)
sd.message("Tool\nDiscovery", "MCP Tool\nRegistry", "Store 2 tools with input schemas, link to server", ORANGE)
sd.message("MCP Tool\nRegistry", "Developer\n(VS Code)", "✓ Published: fee-schedule-svc (2 tools, health: healthy)", response=True, label_color=GREEN)
sd.divider("Phase 5: Agent Consumption")
sd.message("Agents\n(consumers)", "MCP Tool\nRegistry", "Discovery: GET /api/mcp-tools?tag=rcm → find fee-schedule tools", PINK)
sd.message("Agents\n(consumers)", "MCP\nServer (local)", "tools/call: query_fee_schedule({CPT: '99213', payer: 'AETNA'})", PINK)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 3 — ORCHESTRATION DESIGN (VISUAL BUILDER)
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 3, "Orchestration Template Design",
             "Visual workflow builder → select agents from registry → wire edges → attach policies → save template",
             "Visual Builder in Marketplace Web UI")

participants = [
    ("Developer\n(Browser)", VSCODE),
    ("Workflow\nBuilder UI", CYAN),
    ("A2A Agent\nRegistry", PURPLE),
    ("MCP Tool\nRegistry", ORANGE),
    ("Policy\nRegistry", RED),
    ("Template\nAPI", INDIGO),
    ("Cosmos\nDB", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.15), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.divider("Phase 1: Open Workflow Builder")
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Navigate to /orchestration/templates → click 'New Template'", VSCODE)
sd.message("Workflow\nBuilder UI", "A2A Agent\nRegistry", "GET /api/a2a-agents → load available agents for palette", CYAN)
sd.message("A2A Agent\nRegistry", "Workflow\nBuilder UI", "12 agents: denial-analyzer, eligibility-verifier, coding-agent, ...", response=True)
sd.message("Workflow\nBuilder UI", "MCP Tool\nRegistry", "GET /api/mcp-tools → load available tools for palette", CYAN)
sd.message("MCP Tool\nRegistry", "Workflow\nBuilder UI", "28 tools: query_fee_schedule, send_270, submit_837p, ...", response=True)
sd.divider("Phase 2: Build the Workflow Graph")
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Drag 'Start' node → Drag 'Eligibility Agent' → Drag 'Coding Agent'", VSCODE)
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Drag 'Condition' node (if eligible) → wire True→Coding, False→End", VSCODE)
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Drag 'Scrub Agent' after Coding → Drag 'End' node", VSCODE)
sd.note("Workflow\nBuilder UI", "Canvas auto-layouts DAG with edges", TEAL, Inches(2.2))
sd.divider("Phase 3: Configure Nodes")
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Select Coding Agent node → PropertiesPanel → pick agent from dropdown", VSCODE)
sd.message("Workflow\nBuilder UI", "A2A Agent\nRegistry", "GET /api/a2a-agents/agt-coding-001 → load skills, tools, config", PURPLE)
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Set model: GPT-4o, temperature: 0, attach tool: code_lookup", VSCODE)
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Select Condition node → set expression: 'output.status === active'", VSCODE)
sd.divider("Phase 4: Attach Policies")
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Open 'Governance' panel → browse available policies", VSCODE)
sd.message("Workflow\nBuilder UI", "Policy\nRegistry", "GET /api/policies?enabled=true → load active policies", RED)
sd.message("Policy\nRegistry", "Workflow\nBuilder UI", "8 policies: HIPAA-compliance, PHI-filter, rate-limit, cost-budget, ...", response=True)
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Bind: HIPAA-compliance (pre), PHI-filter (post), cost-budget (pre)", VSCODE)
sd.divider("Phase 5: Save Template")
sd.message("Developer\n(Browser)", "Workflow\nBuilder UI", "Click 'Save Template' → name: claims-submission, category: rcm", VSCODE)
sd.message("Workflow\nBuilder UI", "Template\nAPI", "POST /api/orchestration/templates {nodes, edges, parameters, defaultPolicyIds}", INDIGO)
sd.message("Template\nAPI", "Cosmos\nDB", "Store template (v1.0.0, tenantId: default)", AMBER)
sd.message("Template\nAPI", "Developer\n(Browser)", "✓ Saved: claims-submission v1.0.0 (5 nodes, 5 edges, 3 policies)", response=True, label_color=GREEN)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 4 — LOCAL TESTING & DEBUGGING
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 4, "Local Testing & Debugging",
             "Cosmos Emulator → F5 debug → test orchestration → inspect policy decisions → iterate",
             "VS Code Debug + Emulators")

participants = [
    ("Developer\n(VS Code)", VSCODE),
    ("Cosmos DB\nEmulator", AMBER),
    ("Local API\n(FastAPI)", INDIGO),
    ("Agent\n(port 8087)", GREEN),
    ("MCP Server\n(port 3001)", ORANGE),
    ("Policy\nEngine", RED),
    ("MAF\nDevUI", PINK),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.15), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.divider("Phase 1: Start Local Stack")
sd.message("Developer\n(VS Code)", "Cosmos DB\nEmulator", "docker run cosmos-emulator → https://localhost:8081", AMBER)
sd.message("Developer\n(VS Code)", "MCP Server\n(port 3001)", "Terminal 1: python mcp_server.py --port 3001", ORANGE)
sd.message("Developer\n(VS Code)", "Agent\n(port 8087)", "Terminal 2: python main.py --port 8087 (Denial Agent)", GREEN)
sd.message("Developer\n(VS Code)", "Local API\n(FastAPI)", "F5 (launch.json) → uvicorn api:app --port 8000 --reload", INDIGO)
sd.note("Developer\n(VS Code)", "VS Code: 4 terminals, breakpoints set", VSCODE, Inches(2.2))
sd.divider("Phase 2: Test Individual Agent")
sd.message("Developer\n(VS Code)", "MAF\nDevUI", "Open localhost:8087/devui → test DenialAnalyzer in chat", PINK)
sd.message("MAF\nDevUI", "Agent\n(port 8087)", "'Analyze CO-4 denial for patient John Doe from BCBS'", GREEN)
sd.message("Agent\n(port 8087)", "MCP Server\n(port 3001)", "tool: map_denial_code('CO-4')", ORANGE)
sd.message("MCP Server\n(port 3001)", "Agent\n(port 8087)", "{category: modifier_error, recommended_action: ...}", response=True)
sd.note("Developer\n(VS Code)", "💡 Breakpoint hit in tool handler → inspect variables", LIME, Inches(2.5))
sd.message("Agent\n(port 8087)", "MAF\nDevUI", "Analysis complete: modifier error, appeal recommended", response=True)
sd.divider("Phase 3: Test Full Orchestration")
sd.message("Developer\n(VS Code)", "Local API\n(FastAPI)", "POST /api/orchestration/executions {template: denial-intelligence, params: ...}", INDIGO)
sd.message("Local API\n(FastAPI)", "Policy\nEngine", "evaluatePolicies(pre, compliance) → ✓ ALLOW", RED)
sd.message("Local API\n(FastAPI)", "Agent\n(port 8087)", "A2A: tasks/send {denial_codes: [CO-4]}", GREEN)
sd.message("Agent\n(port 8087)", "Local API\n(FastAPI)", "result: {root_causes, appeal_strategy}", response=True)
sd.message("Local API\n(FastAPI)", "Policy\nEngine", "evaluatePolicies(post, PII-filter) → TRANSFORM: redact SSN", RED)
sd.message("Local API\n(FastAPI)", "Cosmos DB\nEmulator", "Save execution + audit trail to emulator", AMBER)
sd.message("Local API\n(FastAPI)", "Developer\n(VS Code)", "200 OK — inspect response + policy audit in Cosmos Explorer", response=True, label_color=GREEN)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 5 — CI/CD & DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 5, "CI/CD Pipeline & Deployment",
             "Git push → GitHub Actions → Build container → Deploy to Azure Container Apps → Verify",
             "azd up + GitHub Actions")

participants = [
    ("Developer\n(VS Code)", VSCODE),
    ("Git /\nGitHub", RGBColor(0x6E, 0x40, 0xC9)),
    ("GitHub\nActions", RGBColor(0x23, 0x88, 0xFF)),
    ("Azure\nACR", CYAN),
    ("Azure\nContainer Apps", INDIGO),
    ("Cosmos DB\n(Serverless)", AMBER),
    ("AI Platform\n(Prod)", GREEN),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.15), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.divider("Phase 1: Push Code")
sd.message("Developer\n(VS Code)", "Git /\nGitHub", "git add . && git commit -m 'feat: add denial-analyzer agent' && git push", VSCODE)
sd.message("Git /\nGitHub", "GitHub\nActions", "Trigger: on push to main → workflow: deploy-ai-marketplace.yml", RGBColor(0x6E, 0x40, 0xC9))
sd.divider("Phase 2: Build & Test")
sd.message("GitHub\nActions", "GitHub\nActions", "pip install agent-framework && pytest tests/ → ✅ 42 tests pass", RGBColor(0x23, 0x88, 0xFF))
sd.message("GitHub\nActions", "GitHub\nActions", "Lint (ruff) + type check (pyright) + security scan (bandit)", RGBColor(0x23, 0x88, 0xFF))
sd.message("GitHub\nActions", "Azure\nACR", "docker build -t ai-marketplace-api:v1.2.0 → push to ACR", CYAN)
sd.message("Azure\nACR", "GitHub\nActions", "✓ Image pushed: ai-marketplace.azurecr.io/api:v1.2.0", response=True, label_color=GREEN)
sd.divider("Phase 3: Deploy Infrastructure")
sd.message("GitHub\nActions", "Azure\nContainer Apps", "azd deploy → update Container App revision (image: api:v1.2.0)", INDIGO)
sd.message("Azure\nContainer Apps", "Cosmos DB\n(Serverless)", "Verify connection: Cosmos DB endpoint reachable, containers exist", AMBER)
sd.message("Azure\nContainer Apps", "GitHub\nActions", "✓ Revision deployed, health probe: OK, 0→1 replicas", response=True, label_color=GREEN)
sd.divider("Phase 4: Post-Deploy Verification")
sd.message("GitHub\nActions", "AI Platform\n(Prod)", "Smoke test: POST /api/health → 200, GET /api/a2a-agents → 12 agents", GREEN)
sd.message("GitHub\nActions", "AI Platform\n(Prod)", "Smoke test: POST /api/orchestration/executions {template: smoke-test}", GREEN)
sd.message("AI Platform\n(Prod)", "GitHub\nActions", "✅ All smoke tests pass — deployment complete", response=True, label_color=GREEN)
sd.divider("Phase 5: Register Updated Agents")
sd.message("GitHub\nActions", "AI Platform\n(Prod)", "POST /api/a2a-agents/agt-001 → update endpoint URL to prod Container App", GREEN)
sd.message("GitHub\nActions", "AI Platform\n(Prod)", "POST /api/mcp-servers/srv-001 → update endpoint URL to prod", GREEN)
sd.message("AI Platform\n(Prod)", "Developer\n(VS Code)", "✅ Deployment notification: v1.2.0 live, 12 agents, 28 tools", response=True, label_color=GREEN)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 6 — DAY-2 OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
slide_header(slide, 6, "Day-2: Monitor, Iterate & Version",
             "Monitor executions → review policy violations → update agents → version templates → A/B test",
             "Observe → Refine → Ship")

participants = [
    ("Developer\n(VS Code)", VSCODE),
    ("Marketplace\nDashboard", CYAN),
    ("Execution\nDetail Page", GREEN),
    ("Policy\nAudit Trail", RED),
    ("Template\nVersioning", ORANGE),
    ("A2A Agent\nRegistry", PURPLE),
    ("Cosmos DB\n(Analytics)", AMBER),
]

sd = SequenceDiagram(slide, participants, start_y=Inches(1.15), end_y=Inches(7.2),
                     left_margin=Inches(0.15), right_margin=Inches(0.15))

sd.divider("Phase 1: Monitor Production Executions")
sd.message("Developer\n(VS Code)", "Marketplace\nDashboard", "Open /orchestration/executions → filter: status=failed, last 24h", VSCODE)
sd.message("Marketplace\nDashboard", "Cosmos DB\n(Analytics)", "Query: SELECT * FROM c WHERE c.status='failed' AND c.startedAt > yesterday", AMBER)
sd.message("Cosmos DB\n(Analytics)", "Marketplace\nDashboard", "3 failed executions (2 policy-denied, 1 agent error)", response=True)
sd.message("Developer\n(VS Code)", "Execution\nDetail Page", "Click execution exec-7742 → inspect node-by-node status", GREEN)
sd.message("Execution\nDetail Page", "Developer\n(VS Code)", "Node 'coding-agent': status=policy-denied → pre: model-allowlist violated", response=True, label_color=RED)
sd.divider("Phase 2: Review Policy Audit Trail")
sd.message("Developer\n(VS Code)", "Policy\nAudit Trail", "GET /api/orchestration/executions/exec-7742/audit", RED)
sd.message("Policy\nAudit Trail", "Developer\n(VS Code)", "Node: coding-agent | Phase: pre | Decision: DENY | Reason: model 'gpt-3.5' not in allowlist", response=True, label_color=RED)
sd.note("Developer\n(VS Code)", "Fix: update policy to allow gpt-3.5-turbo for coding", LIME, Inches(2.5))
sd.message("Developer\n(VS Code)", "Marketplace\nDashboard", "PATCH /api/policies/pol-model-02 → add 'gpt-3.5-turbo' to allowedModels", VSCODE)
sd.divider("Phase 3: Iterate on Agent")
sd.message("Developer\n(VS Code)", "A2A Agent\nRegistry", "Review agent metrics: denial-analyzer avg latency 2.1s, success rate 94%", PURPLE)
sd.message("Developer\n(VS Code)", "Developer\n(VS Code)", "VS Code: update system prompt to handle CO-167 denial code", VSCODE)
sd.message("Developer\n(VS Code)", "A2A Agent\nRegistry", "POST /api/a2a-agents/agt-001 → update version to v1.3.0", PURPLE)
sd.divider("Phase 4: Version Orchestration Template")
sd.message("Developer\n(VS Code)", "Template\nVersioning", "PATCH /api/orchestration/templates/tmpl-claims → add Loop node for retry", ORANGE)
sd.message("Template\nVersioning", "Developer\n(VS Code)", "✓ Auto-bumped: claims-submission v1.0.0 → v1.1.0 (nodes changed)", response=True, label_color=GREEN)
sd.message("Developer\n(VS Code)", "Template\nVersioning", "POST /api/orchestration/templates/tmpl-claims/fork → create A/B variant", ORANGE)
sd.message("Template\nVersioning", "Developer\n(VS Code)", "✓ Forked: claims-submission-v2 (experimental, 10% traffic)", response=True, label_color=GREEN)


# ═══════════════════════════════════════════════════════════════════════════
# SLIDE 7 — END-TO-END DEVELOPER JOURNEY MAP
# ═══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_text(slide, Inches(0.6), Inches(0.3), Inches(10), Inches(0.5), "End-to-End Developer Journey Map", size=26, bold=True, color=WHITE)
line = slide.shapes.add_connector(1, Inches(0.6), Inches(0.75), Inches(12.7), Inches(0.75))
line.line.color.rgb = VSCODE
line.line.width = Pt(1)

# Journey phases
phases = [
    ("DESIGN", VSCODE, [
        "Scaffold agent with Copilot",
        "Define tools (@tool decorator)",
        "Write system prompt",
        "Create agent_card.json (A2A)",
        "Define MCP server + tools",
    ]),
    ("BUILD", GREEN, [
        "pip install agent-framework",
        "Implement tool logic",
        "Configure LLM provider",
        "Write Dockerfile",
        "Create pyproject.toml",
    ]),
    ("TEST", CYAN, [
        "F5 debug (VS Code launch.json)",
        "MAF DevUI interactive chat",
        "MCP Inspector tool testing",
        "Cosmos Emulator state check",
        "pytest unit + integration tests",
    ]),
    ("COMPOSE", ORANGE, [
        "Visual workflow builder",
        "Drag agents from registry",
        "Wire conditional edges",
        "Attach governance policies",
        "Define template parameters",
    ]),
    ("DEPLOY", PURPLE, [
        "git push → GitHub Actions",
        "Docker build → ACR push",
        "azd deploy → Container Apps",
        "Register agents + tools in prod",
        "Smoke test executions",
    ]),
    ("OPERATE", PINK, [
        "Monitor execution dashboard",
        "Review policy audit trails",
        "Iterate agent prompts + tools",
        "Version templates (auto-bump)",
        "Fork templates for A/B testing",
    ]),
]

phase_w = Inches(2.0)
gap = Inches(0.05)
start_x = Inches(0.4)
y = Inches(1.0)

for i, (title, color, items) in enumerate(phases):
    x = start_x + (phase_w + gap) * i
    # Phase header
    add_rect(slide, x, y, phase_w, Inches(0.4), color)
    add_text(slide, x, y + Inches(0.05), phase_w, Inches(0.3), title, size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    # Arrow between phases
    if i < len(phases) - 1:
        ax = x + phase_w
        add_text(slide, ax - Inches(0.05), y + Inches(0.05), Inches(0.2), Inches(0.3), "→", size=16, color=GRAY, align=PP_ALIGN.CENTER)
    # Items card
    card = add_box(slide, x, y + Inches(0.5), phase_w, Inches(2.2), BG_CARD, border_color=color, border_w=Pt(1))
    tf = add_text(slide, x + Inches(0.15), y + Inches(0.6), phase_w - Inches(0.3), Inches(0.2),
                  items[0], size=9, color=LIGHT)
    for item in items[1:]:
        p = tf.add_paragraph()
        p.text = f"• {item}"
        p.font.size = Pt(9)
        p.font.color.rgb = LIGHT
        p.font.name = "Segoe UI"
        p.space_before = Pt(5)

# Tools row
y2 = Inches(3.9)
add_text(slide, Inches(0.6), y2, Inches(10), Inches(0.4), "Developer Tooling", size=16, bold=True, color=WHITE)
y2 += Inches(0.45)

tools_row = [
    ("VS Code + Extensions", VSCODE, "Editor, debugger, terminals, Copilot, Azure extensions"),
    ("GitHub Copilot", RGBColor(0x6E, 0x40, 0xC9), "Agent scaffolding, tool generation, prompt engineering"),
    ("MAF SDK", GREEN, "agent-framework pip package, AzureOpenAIResponsesClient, @tool"),
    ("MAF DevUI", PINK, "Interactive agent chat UI, tool call visualization"),
    ("MCP Inspector", CYAN, "Tool discovery + testing, schema validation"),
    ("Cosmos DB Emulator", AMBER, "Local state persistence, Cosmos Explorer UI"),
]

for i, (name, color, desc) in enumerate(tools_row):
    x = Inches(0.4) + Inches(i * 2.1)
    add_box(slide, x, y2, Inches(2.0), Inches(0.35), color)
    add_text(slide, x + Inches(0.1), y2 + Inches(0.05), Inches(1.8), Inches(0.25), name, size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide, x, y2 + Inches(0.4), Inches(2.0), Inches(0.5), desc, size=8, color=GRAY, align=PP_ALIGN.CENTER)

# Platform components
y3 = Inches(5.2)
add_text(slide, Inches(0.6), y3, Inches(10), Inches(0.4), "AI Platform Components", size=16, bold=True, color=WHITE)
y3 += Inches(0.45)

platform = [
    ("Orchestration API", INDIGO, "FastAPI + MAF Workflows\nTemplate CRUD, execution engine"),
    ("A2A Agent Registry", PURPLE, "Agent discovery via A2A protocol\nAgentCards, skills, health"),
    ("MCP Tool Registry", ORANGE, "Tool discovery + schemas\nServer health, security scans"),
    ("Policy Engine", RED, "Pre/post enforcement\n8 policy types, audit trail"),
    ("Workflow Builder", CYAN, "Visual DAG editor\nDrag-drop agents + tools"),
    ("Cosmos DB", AMBER, "State persistence\nExecutions, agents, policies"),
]

for i, (name, color, desc) in enumerate(platform):
    x = Inches(0.4) + Inches(i * 2.1)
    add_box(slide, x, y3, Inches(2.0), Inches(0.35), BG_CARD, border_color=color)
    add_text(slide, x + Inches(0.1), y3 + Inches(0.05), Inches(1.8), Inches(0.25), name, size=9, bold=True, color=color, align=PP_ALIGN.CENTER)
    add_text(slide, x, y3 + Inches(0.4), Inches(2.0), Inches(0.65), desc, size=8, color=GRAY, align=PP_ALIGN.CENTER)

add_text(slide, Inches(0.6), Inches(6.9), Inches(12), Inches(0.3),
         "Time to first agent: ~15 minutes  •  Time to first orchestration: ~30 minutes  •  Time to production: same day",
         size=11, color=TEAL, bold=True, align=PP_ALIGN.LEFT)


# ═══════════════════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════════════════
out_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(out_dir, "DevEx-AI-Platform-Sequence-Diagrams.pptx")
prs.save(out_path)
print(f"✅ Saved: {out_path}")
print(f"   Slides: {len(prs.slides)}")
