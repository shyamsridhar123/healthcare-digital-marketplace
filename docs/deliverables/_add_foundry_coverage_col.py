"""Add a 'Foundry Native Coverage' column to Section 14's table.

The table currently has 4 columns:
  UAP Capability Area | Azure Foundry / Azure Service | GA Status | Notes

We add a 5th column comparing what UAP delivers to what Azure AI Foundry
provides natively today:
  Fully Provided  — Foundry covers this UAP capability end-to-end out of box
  Partially Provided — Foundry covers part; UAP wraps / extends it
  Not Provided — Foundry has no native equivalent; UAP builds it from primitives

The column also carries a one-line justification so a reader does not need to
infer from the prior columns.
"""
from copy import deepcopy
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DOC = "UAP_Architecture_Document_formatted.docx"

doc = Document(DOC)

# Locate the section-14 table by its header signature.
target_table = None
for tb in doc.tables:
    headers = [c.text.strip() for c in tb.rows[0].cells]
    if headers[:2] == ["UAP Capability Area", "Azure Foundry / Azure Service"]:
        target_table = tb
        break
assert target_table is not None, "could not find Section 14 table"

# Each data row keyed by the UAP Capability Area cell text.
COVERAGE = {
    "Model Marketplace — Central Repository": (
        "Fully Provided",
        "Foundry Hub / Projects already provide a model registry with cards and metadata; UAP adds tenant-scoped publishing only.",
    ),
    "Model Marketplace — BYOM": (
        "Fully Provided",
        "Foundry Model Catalog + BYOM onboarding covers OpenAI, OSS and partner models natively.",
    ),
    "Model Marketplace — Approval Workflow": (
        "Partially Provided",
        "Foundry has Responsible AI evaluations and audit, but the multi-stage Draft → Review → Approved publisher workflow with governance tickets is a UAP overlay.",
    ),
    "Model Marketplace — Drift Detection": (
        "Partially Provided",
        "Foundry Evaluations + Azure Monitor cover model drift; UAP extends the same pattern to agents, prompts and embeddings via Arize Phoenix.",
    ),
    "Model Marketplace — Champion/Challenger": (
        "Partially Provided",
        "Foundry Evaluations runs offline A/B; weighted traffic splitting and progressive rollout are delivered by APIM and the Lifecycle Management process (§17.3).",
    ),
    "One-Click Deployment": (
        "Partially Provided",
        "Foundry deploys models one-click; deployment of agents and multi-step workflows to ACA / Functions with canary, MI and APIM wiring is the Onboarding Agent (§12.1).",
    ),
    "RAG Integration": (
        "Fully Provided",
        "Azure AI Search plus Foundry Knowledge / vector stores cover ingestion, hybrid retrieval and grounding end-to-end.",
    ),
    "IMDE — Secure Sandbox": (
        "Fully Provided",
        "Foundry Compute with VNet-integrated notebooks delivers the secure experimentation sandbox natively.",
    ),
    "IMDE — Multi-Modal Pre-loaded Tools": (
        "Fully Provided",
        "Foundry AI-ML / LLM / Multimodal / DL container images ship pre-loaded with the required tooling.",
    ),
    "Dynamic Agent Orchestrator": (
        "Partially Provided",
        "Foundry Agent Service handles single-agent runtime; multi-agent graph orchestration with HITL, policy and saga compensation is delivered by MAF / LangGraph on ACA.",
    ),
    "Visual Agent Builder": (
        "Partially Provided",
        "Foundry Prompt Flow offers a visual designer for prompts; the UAP React Flow canvas with typed Agent / MCP / Tool / HITL / Governance nodes and approval gates is custom.",
    ),
    "Cross-Cutting — Multi-Tenant Isolation": (
        "Partially Provided",
        "Foundry Hub provides project- and workspace-level isolation; tenantId-based row-level isolation across all registries with Entra entitlement enforcement is custom.",
    ),
    "Cross-Cutting — HIPAA / SOC 2": (
        "Fully Provided",
        "Underlying Azure services (Foundry, OpenAI, AI Search, Cosmos, ACA, APIM, Key Vault, Monitor) are HIPAA-covered; UAP inherits the compliance posture and adds policy controls.",
    ),
}


def set_cell_text(cell, text, bold=False, font_name="Segoe UI"):
    paragraphs = cell.paragraphs
    first = paragraphs[0]
    for p in paragraphs[1:]:
        p._element.getparent().remove(p._element)
    for r in list(first.runs):
        r._element.getparent().remove(r._element)
    for r in first._element.findall(qn("w:r")):
        first._element.remove(r)
    run = first.add_run(text)
    if font_name:
        run.font.name = font_name
    if bold:
        run.bold = True


def add_grid_col(tbl_element):
    """Append a new w:gridCol to w:tblGrid so column widths track the new cell."""
    grid = tbl_element.find(qn("w:tblGrid"))
    if grid is None:
        return
    cols = grid.findall(qn("w:gridCol"))
    if not cols:
        return
    # Use the average existing width for the new column
    widths = [int(c.get(qn("w:w") )) for c in cols if c.get(qn("w:w"))]
    avg = int(sum(widths) / len(widths)) if widths else 1500
    # Make the new column slightly narrower to reduce table overflow risk
    new_w = max(900, int(avg * 0.55))
    new_col = OxmlElement("w:gridCol")
    new_col.set(qn("w:w"), str(new_w))
    grid.append(new_col)


def append_cell(row_element, source_cell_xml, text, bold=False):
    """Append a clone of an existing w:tc to the row, then set its text."""
    new_tc = deepcopy(source_cell_xml)
    # Clear all paragraphs in the cloned cell
    for p in new_tc.findall(qn("w:p")):
        new_tc.remove(p)
    # Build a fresh paragraph
    p = OxmlElement("w:p")
    r = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    rfonts = OxmlElement("w:rFonts")
    rfonts.set(qn("w:ascii"), "Segoe UI")
    rfonts.set(qn("w:hAnsi"), "Segoe UI")
    rpr.append(rfonts)
    if bold:
        b = OxmlElement("w:b")
        rpr.append(b)
    r.append(rpr)
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    r.append(t)
    p.append(r)
    new_tc.append(p)
    # Adjust the cell width if w:tcPr / w:tcW exists
    tcPr = new_tc.find(qn("w:tcPr"))
    if tcPr is not None:
        tcW = tcPr.find(qn("w:tcW"))
        if tcW is not None:
            tcW.set(qn("w:w"), "1500")
    row_element.append(new_tc)


# Idempotency check — do not add the column twice.
header_row = target_table.rows[0]
existing_headers = [c.text.strip() for c in header_row.cells]
if "Foundry Native Coverage" in existing_headers:
    print("Column already exists; nothing to do.")
else:
    # 1. Append the new gridCol
    add_grid_col(target_table._element)

    # 2. Header row — append a new bold cell
    last_header_tc = header_row._element.findall(qn("w:tc"))[-1]
    append_cell(header_row._element, last_header_tc, "Foundry Native Coverage", bold=True)

    # 3. Data rows
    for row in target_table.rows[1:]:
        key = row.cells[0].text.strip()
        verdict, justification = COVERAGE.get(key, ("Partially Provided", ""))
        text = f"{verdict} — {justification}" if justification else verdict
        last_tc = row._element.findall(qn("w:tc"))[-1]
        append_cell(row._element, last_tc, text, bold=False)

doc.save(DOC)
print("Saved", DOC)

# Verify
doc2 = Document(DOC)
for tb in doc2.tables:
    headers = [c.text.strip() for c in tb.rows[0].cells]
    if headers[:2] == ["UAP Capability Area", "Azure Foundry / Azure Service"]:
        print("Header now:", headers)
        for r in tb.rows[1:]:
            print(" ", r.cells[0].text[:35].ljust(35), "|", r.cells[-1].text[:80])
        break
