"""Move Lifecycle Management out of Section 12 into Section 17 as 17.3.

Operations on UAP_Architecture_Document_formatted.docx:
  1. Update Section 12 intro: "Five specialized agents" → "Four specialized agents".
  2. Append a closing sentence to §12.1 intro and §12.4 intro that cross-references §17.3.
  3. Insert "17.3 Lifecycle Management" with prose + bullets BEFORE Heading "18. Key Architecture Features".
     Reuses the bullets currently under §12.5 plus the expanded framing.
  4. Delete the old §12.5 heading + its 5 list paragraphs.

Implementation notes:
  - Order of operations matters: delete §12.5 LAST so that paragraph indices for
    earlier edits remain valid up to that point.
  - For deletion we operate on the underlying w:p XML elements, not paragraph
    indices, so we capture references first.
  - For inserting §17.3 we clone existing Heading 2 / List Paragraph / Normal
    paragraphs from the doc to inherit numbering and styles, then rewrite their
    text content.
"""
from copy import deepcopy
from docx import Document
from docx.oxml.ns import qn

DOC = "UAP_Architecture_Document_formatted.docx"

doc = Document(DOC)
paragraphs = list(doc.paragraphs)


def find_paragraph(prefix):
    for p in doc.paragraphs:
        if p.text.strip().startswith(prefix):
            return p
    raise SystemExit(f"could not find paragraph starting with {prefix!r}")


def replace_paragraph_text(paragraph, new_text):
    """Replace text of a paragraph while preserving the first run's formatting."""
    runs = paragraph.runs
    if runs:
        first = runs[0]
        font_name = first.font.name
        font_size = first.font.size
        bold = first.bold
        italic = first.italic
        try:
            color = first.font.color.rgb
        except Exception:
            color = None
        for r in list(runs):
            r._element.getparent().remove(r._element)
        for r in paragraph._element.findall(qn("w:r")):
            paragraph._element.remove(r)
        new_run = paragraph.add_run(new_text)
        if font_name:
            new_run.font.name = font_name
        if font_size:
            new_run.font.size = font_size
        if bold is not None:
            new_run.bold = bold
        if italic is not None:
            new_run.italic = italic
        if color is not None:
            try:
                new_run.font.color.rgb = color
            except Exception:
                pass
    else:
        paragraph.add_run(new_text)


# --- Step 1: Section 12 intro -------------------------------------------------
sec12_intro = find_paragraph("Five specialized agents form the cross-cutting")
new_sec12_intro = (
    "Four specialized agents form the cross-cutting operating system of the platform. "
    "They sit around the developer's source-control and CI/CD boundary — never replacing it — "
    "and add value where deterministic pipelines fall short: scaffolding, policy judgment, "
    "supply-chain verification, governance curation and runtime safety. The developer continues "
    "to own commits and pushes; GitHub Actions continues to build, sign and emit SLSA-style "
    "provenance. The platform agents make sure what gets pushed is already compliant, then turn "
    "raw CI outputs into governance-ready, marketplace-ready artifacts. Agents drive — but do "
    "not implement — version promotion, canary rollout and rollback; those release-plane "
    "mechanics are described separately in §17.3 Lifecycle Management."
)
replace_paragraph_text(sec12_intro, new_sec12_intro)

# Update the "What we mean by an agent" paragraph to say "four subsections"
agent_def_para = None
for p in doc.paragraphs:
    if p.text.startswith("What we mean by an agent."):
        agent_def_para = p
        break
if agent_def_para is not None:
    new_def = (
        "What we mean by an agent. Across this section, an \"agent\" is more than a workflow "
        "or REST service: each platform agent is goal-directed, perceives its environment via "
        "telemetry and registries, reasons with an LLM under uncertainty, autonomously chooses "
        "which tools and APIs to invoke, learns from prior episodes, and acts within explicit "
        "policy guardrails — escalating to humans only when its boundary is reached. The four "
        "subsections below state, for each agent, the goal it pursues, the decisions it owns "
        "without human input, where its reasoning surface lives, and the boundary at which it "
        "must hand off to HITL or policy."
    )
    replace_paragraph_text(agent_def_para, new_def)


# --- Step 2: Cross-reference appendices in 12.1 and 12.4 -----------------------
sec121_intro = find_paragraph("The Onboarding Agent automates the seven-stage")
sec121_text = sec121_intro.text
if "§17.3" not in sec121_text:
    replace_paragraph_text(
        sec121_intro,
        sec121_text.rstrip().rstrip(".") + ". "
        "Once verified and approved, the agent hands off to the version-management process "
        "described in §17.3 Lifecycle Management, which executes the canary advancement and "
        "rollback mechanics on Azure Container Apps revisions."
    )

sec124_intro = None
for p in doc.paragraphs:
    if p.text.startswith("The Observability, Security"):
        sec124_intro = p
        break
if sec124_intro is not None and "§17.3" not in sec124_intro.text:
    replace_paragraph_text(
        sec124_intro,
        sec124_intro.text.rstrip().rstrip(".") + ". "
        "Remediation actions (rollback, scale, circuit-break) are dispatched to the "
        "version-management process defined in §17.3 Lifecycle Management."
    )


# --- Step 3: Insert §17.3 BEFORE the Heading 1 "18. Key Architecture Features" -
heading18 = find_paragraph("18. Key Architecture Features")

# Capture template paragraphs to clone styles from
template_h2 = find_paragraph("17.2 Developer Experience")
# Find a List Paragraph and a Normal style template inside §17
template_list = None
template_normal = None
in_17 = False
for p in doc.paragraphs:
    if p.text.strip().startswith("17."):
        in_17 = True
    if in_17:
        if p.style.name == "List Paragraph" and template_list is None:
            template_list = p
        if p.style.name == "Normal" and p.text.strip() and template_normal is None:
            template_normal = p
    if p.text.strip().startswith("18."):
        break
if template_normal is None:
    # Fallback — use any Normal paragraph
    for p in doc.paragraphs:
        if p.style.name == "Normal" and p.text.strip():
            template_normal = p
            break

assert template_list is not None, "could not find a List Paragraph template in §17"
assert template_normal is not None, "could not find a Normal template"


def insert_clone(template_para, before_para, new_text):
    """Clone a paragraph's pPr/style, set new text, insert before another paragraph."""
    new_p = deepcopy(template_para._element)
    # Clear existing runs
    for r in new_p.findall(qn("w:r")):
        new_p.remove(r)
    # Build a fresh run inheriting the first run's rPr if available
    src_rpr = None
    src_run = template_para._element.find(qn("w:r"))
    if src_run is not None:
        src_rpr = src_run.find(qn("w:rPr"))
    from docx.oxml import OxmlElement
    r = OxmlElement("w:r")
    if src_rpr is not None:
        r.append(deepcopy(src_rpr))
    t = OxmlElement("w:t")
    t.text = new_text
    t.set(qn("xml:space"), "preserve")
    r.append(t)
    new_p.append(r)
    before_para._element.addprevious(new_p)
    return new_p


# Avoid duplicate insertion on rerun
already_present = any(
    p.text.strip().startswith("17.3 Lifecycle Management") for p in doc.paragraphs
)

if not already_present:
    insert_clone(template_h2, heading18, "17.3 Lifecycle Management")
    insert_clone(
        template_normal,
        heading18,
        "Lifecycle Management is the platform's release-plane discipline for safely evolving "
        "Agents, MCP servers, Tools and prompts over time. It is not itself an agent — it is a "
        "set of automated mechanics on Azure Container Apps revisions and the AgentCard / MCP "
        "Registry that the Onboarding Agent and the Observability, Security & Governance Agent "
        "drive on behalf of the platform. The Lifecycle process owns versioning, promotion, "
        "rollback, deprecation and per-version provenance.",
    )
    bullets = [
        "Versioning — semantic versioning (MAJOR.MINOR.PATCH) for every Agent, MCP server, "
        "Tool and prompt; multiple versions run concurrently for backward compatibility.",
        "Promotion — canary releases with orchestrated traffic shifts 5% → 25% → 50% → 100%, "
        "evaluation-gated at each step by the Evaluation Agent (§12.2).",
        "Rollback — automated regression detection by the Observability, Security & Governance "
        "Agent (§12.4) triggers an Azure Container Apps revision swap with sub-minute revert.",
        "Deprecation — 90-day deprecation notices with auto-decommissioning of containers; "
        "consumers receive APIM-mediated notifications and are migrated to the successor "
        "version. The declarative plan-template library grows via contributions and validated "
        "deprecations.",
        "Provenance per version — every release is logged to MongoDB and Arize Phoenix and "
        "linked back to the SLSA-style attestation that promoted it, so any version in production "
        "is traceable to its build, scan, eval and approval evidence.",
    ]
    for b in bullets:
        insert_clone(template_list, heading18, b)


# --- Step 4: Delete §12.5 heading and its 5 list paragraphs --------------------
sec125 = None
for p in doc.paragraphs:
    if p.text.strip().startswith("12.5 Lifecycle Management"):
        sec125 = p
        break

if sec125 is not None:
    # Walk forward and delete until we hit the next Heading 1 ("13. LLM Gateway Capabilities")
    el = sec125._element
    to_delete = []
    cur = el
    while cur is not None:
        next_el = cur.getnext()
        # Stop if we reach the next Heading 1 paragraph
        if next_el is None:
            break
        # Inspect the next element to know whether to stop AFTER deleting current
        to_delete.append(cur)
        # Determine if next is a Heading 1 paragraph -> stop loop
        if next_el.tag == qn("w:p"):
            ppr = next_el.find(qn("w:pPr"))
            if ppr is not None:
                pstyle = ppr.find(qn("w:pStyle"))
                if pstyle is not None:
                    val = pstyle.get(qn("w:val")) or ""
                    if "Heading1" in val or val == "Heading1":
                        break
        cur = next_el
    for el in to_delete:
        el.getparent().remove(el)


doc.save(DOC)
print("Saved", DOC)
