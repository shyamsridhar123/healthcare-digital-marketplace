"""In-place update of Section 12 (Platform AI Agents) in UAP_Architecture_Document.docx.

Rewrites:
  - Section 12 intro paragraph
  - Table 7 (Agents at a glance) — Onboarding, Security & Governance, Observability rows
  - Table 8 (Onboarding 7-stage pipeline) — all 7 data rows
  - Adds a "Boundary summary" paragraph after Table 8

Preserves existing styles by clearing runs in target cells/paragraphs and
adding a single new run with the same formatting as the prior first run.
"""
from copy import deepcopy
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

DOC = "UAP_Architecture_Document.docx"

doc = Document(DOC)


def set_cell_text(cell, text, bold=False):
    """Replace cell content with a single paragraph / single run."""
    # Remove all paragraphs in the cell except the first; clear the first.
    paragraphs = cell.paragraphs
    first = paragraphs[0]
    # Remove extra paragraphs
    for p in paragraphs[1:]:
        p._element.getparent().remove(p._element)
    # Clear runs of the first paragraph
    for r in list(first.runs):
        r._element.getparent().remove(r._element)
    # Also strip any stray w:r left under pPr siblings
    for r in first._element.findall(qn("w:r")):
        first._element.remove(r)
    run = first.add_run(text)
    run.font.name = "Segoe UI"
    if bold:
        run.bold = True


def set_paragraph_text(paragraph, text):
    for r in list(paragraph.runs):
        r._element.getparent().remove(r._element)
    for r in paragraph._element.findall(qn("w:r")):
        paragraph._element.remove(r)
    run = paragraph.add_run(text)
    run.font.name = "Segoe UI"


# --- 1. Replace intro paragraph (the one immediately after the "12. Platform AI Agents" heading) ---
intro_new = (
    "Six specialized agents form the cross-cutting operating system of the platform. "
    "They sit around the developer's source-control and CI/CD boundary — never replacing it — "
    "and add value where deterministic pipelines fall short: scaffolding, policy judgment, "
    "supply-chain verification, governance curation and lifecycle reasoning. The developer "
    "continues to own commits and pushes; GitHub Actions continues to build, sign and emit "
    "SLSA-style provenance. The platform agents make sure what gets pushed is already compliant, "
    "then turn raw CI outputs into governance-ready, marketplace-ready artifacts."
)

intro_para = None
for p in doc.paragraphs:
    if p.text.strip().startswith("Six specialized agents form the cross-cutting"):
        intro_para = p
        break
if intro_para is None:
    raise SystemExit("Could not locate Section 12 intro paragraph")
set_paragraph_text(intro_para, intro_new)


# --- 2. Update Table 7 (Agents at a glance) ---
# Row order in current doc: header, Onboarding, Security & Governance, Observability,
# Evaluation, Discovery, Lifecycle Management.
table7 = doc.tables[7]

agents_updates = {
    "Onboarding Agent": (
        "Co-pilots the publisher before the push (scaffolds agent.yaml / mcp.json / model cards, "
        "infers capabilities from code, lints against tenant policy, generates eval stubs, "
        "opens the initial PR with correct labels and CODEOWNERS). After the push, ingests "
        "GitHub Actions outputs — signed artifact, SLSA provenance attestation, SBOM, scanner "
        "results, eval scores — verifies them against marketplace policy, registers the AgentCard, "
        "and assembles a governance-ready submission record. Reduces onboarding from weeks to "
        "hours by removing paperwork, not by replacing CI."
    ),
    "Security & Governance Agent": (
        "Verifies SLSA provenance (builder identity, source repo + commit, signature) on every "
        "published artifact; scans plans and prompts for PHI / PII and disallowed content; "
        "integrates Azure OpenAI content filters plus Optum baselines; performs audit logging "
        "and Responsible AI board reporting; enforces policy gates (data classification, egress, "
        "capability scopes) at promotion time."
    ),
    "Observability Agent": (
        "Aggregates Azure Monitor and Arize Phoenix telemetry; detects anomalies such as error "
        "spikes, latency regressions and model drift; correlates production behavior with the "
        "agent version + provenance attestation; auto-scales resources on threshold breaches and "
        "surfaces incident context to on-call."
    ),
}

for row in table7.rows:
    name = row.cells[0].text.strip()
    if name in agents_updates:
        set_cell_text(row.cells[0], name, bold=False)
        set_cell_text(row.cells[1], agents_updates[name], bold=False)


# --- 3. Update Table 8 (7-stage pipeline) ---
table8 = doc.tables[8]

stages = [
    ("1",
     "Scaffold & Author (pre-push)",
     "Onboarding Agent co-pilots in IDE / Publisher Portal: conversational intake; scaffolds "
     "agent.yaml, mcp.json, model card, eval harness stubs and Dockerfile; infers capabilities, "
     "inputs/outputs, data sensitivity and cost class from code; lints against tenant policy "
     "and SBOM hygiene rules.",
     "Submission-ready repo or PR draft"),
    ("2",
     "Submit (developer-driven)",
     "Developer pushes to GitHub. Agent opens the PR with correct labels, reviewers and "
     "CODEOWNERS — the PR (or workflow_dispatch) is what triggers GitHub Actions. The agent "
     "does not invoke CI directly.",
     "PR opened, CI started"),
    ("3",
     "Build, Sign & Attest (GitHub Actions)",
     "Hardened builder produces container / package; emits SBOM (CycloneDX); generates a "
     "SLSA-style provenance attestation (in-toto, Sigstore-signed via OIDC); runs security "
     "scanners; runs eval harness. All outputs published as workflow artifacts.",
     "Signed artifact + provenance + SBOM + scan reports + eval scores"),
    ("4",
     "Verify & Register (post-push)",
     "Onboarding Agent (subscribed via webhook / Event Grid) cryptographically verifies the "
     "SLSA attestation against marketplace policy (trusted builder, allowed repo, signed "
     "commit); reconciles artifact digest; registers the AgentCard in MongoDB / Cosmos with "
     "status=staging; indexes in AI Search.",
     "AgentCard created, evidence bundle persisted"),
    ("5",
     "Governance & Approval Gate",
     "Onboarding Agent assembles a plain-English governance ticket: provenance summary, "
     "SBOM / CVE highlights, eval deltas vs prior version, declared-vs-observed capability "
     "diffs, risk score, suggested approver. Security & Governance Agent enforces policy. "
     "Routes by risk class; human sign-off for sensitive / production assets only.",
     "Approved / rejected with rationale; audit log entry"),
    ("6",
     "Provisioning",
     "UAP control plane (IaC) allocates ACA / AKS revision, configures Managed Identity, "
     "Key Vault references, APIM route and networking; binds to tenant policy. Agent "
     "coordinates and tracks; it does not execute IaC.",
     "Infrastructure ready, endpoint reserved"),
    ("7",
     "Canary Deployment & Activation",
     "Lifecycle Management Agent drives progressive rollout 5% → 25% → 50% → 100%; Evaluation "
     "Agent watches quality metrics; Observability Agent watches latency / error / drift; "
     "automated rollback on regression. On success, AgentCard flips to status=active and the "
     "Marketplace catalog and Visual Orchestration palette refresh.",
     "Live in production, listing published, changelog drafted"),
]

# Header is row 0; data rows are 1..7. Existing table has 8 rows total (1 header + 7).
data_rows = table8.rows[1:]
assert len(data_rows) == len(stages), (
    f"Expected {len(stages)} data rows, found {len(data_rows)}"
)
for row, (stage, step, actions, gate) in zip(data_rows, stages):
    set_cell_text(row.cells[0], stage)
    set_cell_text(row.cells[1], step)
    set_cell_text(row.cells[2], actions)
    set_cell_text(row.cells[3], gate)


# --- 4. Insert "Boundary summary" paragraph after Table 8 ---
# Locate the "12.2" heading paragraph; insert a new paragraph before it.
boundary_text = (
    "Boundary summary. Stages 1–2 happen with the developer; Stage 3 happens in GitHub Actions "
    "and the agent has no execute role; Stages 4–7 are where the platform agents earn their "
    "keep — verifying provenance, curating evidence, making governance human-actionable and "
    "reasoning about lifecycle. If the agents were removed, the pipeline would still function "
    "— humans would just be copy-pasting JSON between GitHub, ticketing systems and Cosmos DB, "
    "and approvers would be reading raw scanner output instead of a one-screen risk summary."
)

target_heading = None
for p in doc.paragraphs:
    if p.text.strip().startswith("12.2 Evaluation Agent"):
        target_heading = p
        break
if target_heading is None:
    raise SystemExit("Could not find 12.2 heading to anchor boundary paragraph")

# Avoid duplicating on re-runs
prev_el = target_heading._element.getprevious()
prev_text = ""
if prev_el is not None and prev_el.tag == qn("w:p"):
    prev_text = "".join(t.text or "" for t in prev_el.iter(qn("w:t")))

if not prev_text.startswith("Boundary summary"):
    new_p = OxmlElement("w:p")
    # Use Normal style (no pStyle = Normal). Add a run with Segoe UI.
    r = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    rfonts = OxmlElement("w:rFonts")
    rfonts.set(qn("w:ascii"), "Segoe UI")
    rfonts.set(qn("w:hAnsi"), "Segoe UI")
    rpr.append(rfonts)
    r.append(rpr)
    t = OxmlElement("w:t")
    t.text = boundary_text
    t.set(qn("xml:space"), "preserve")
    r.append(t)
    new_p.append(r)
    target_heading._element.addprevious(new_p)


doc.save(DOC)
print("Updated", DOC)
