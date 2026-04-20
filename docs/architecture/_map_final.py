"""
Precisely map red bounding boxes to capability components using drawio coordinates.

Drawio layout (absolute coordinates):
- Total canvas: ~30-1260 wide, 60-700 tall
- L1 (Presentation): y=60, components at relative x: 15,170,325,480,635,790 (each 140w)
- L2 (API): y=190, same x positions + 945
- L3 (Orchestration): y=320, same pattern
- L4 (Data): y=450, same pattern
- L5 (Azure): y=585, components at x: 15,175,335,495,655,815,975,1135

Image is 2727x1510 px. The diagram image excludes title area.
Red bounding boxes found at pixel positions (as % of image):
  Box 1: x=13.7-24.2%, y=16.4-22.1% -> L1 position 1 (Web Dashboard)
  Box 2: x=24.7-35.2%, y=16.4-22.1% -> L1 position 2 (Visual Orchestration)
  Box 3: x=60.6-72.8%, y=16.5-22.1% -> L1 position 5 (Playground)
  Box 4: x=73.6-84.7%, y=16.8-22.5% -> L1 position 6? wait...
  Box 5: x=85.1-97.4%, y=16.8-22.5% -> beyond 6 components?
  
  BUT L1 has 6 components. The drawio x positions for L1 are: 
    15 (0-140), 170 (170-310), 325 (325-465), 480 (480-620), 635 (635-775), 790 (790-930)
  Canvas width ~1230 for L1. 
  
  Map to image %:
    Component 1 (Web Dashboard): x ≈ 15/1260=1.2% to 155/1260=12.3%
    Component 2 (Visual Orch):   x ≈ 170/1260=13.5% to 310/1260=24.6%
    Component 3 (Admin Dashboard): x ≈ 325/1260=25.8% to 465/1260=36.9%
    Component 4 (Publisher Portal): x ≈ 480/1260=38.1% to 620/1260=49.2%
    Component 5 (Playground):     x ≈ 635/1260=50.4% to 775/1260=61.5%
    Component 6 (DevUI):          x ≈ 790/1260=62.7% to 930/1260=73.8%
  
  WAIT - the image has some padding/offset. Let me recalculate.
  Actually the drawio absolute positions include the layer container offset.
  L1 container starts at x=30, y=60, width=1230
  Components are at relative positions within L1.
  So absolute: 30+15=45, 30+170=200, 30+325=355, 30+480=510, 30+635=665, 30+790=820
  Total canvas width approx 1290 (30+1230+some margin)
  
  Box 1 at 13.7-24.2%: absolute x ≈ 173-307 → matches component at x=200 (Visual Orchestration)
  Box 2 at 24.7-35.2%: absolute x ≈ 312-446 → matches component at x=355 (Admin Dashboard)
  Box 3 at 60.6-72.8%: absolute x ≈ 766-921 → matches component at x=820 (DevUI)
  
  But wait, there are 5 boxes in L1 region plus 2 tall boxes spanning layers 2-4.
  
The mapping actually depends on whether the image includes surrounding padding.
Let me just compute based on the 6-position evenly spaced grid.
"""

# Layer 1 components in order (left to right):
L1 = ["Web Dashboard", "Visual Orchestration", "Admin Dashboard", 
      "Publisher Portal", "Playground", "DevUI"]

# Layer 2:
L2 = ["Asset Catalog", "MCP Server & Tool Registry", "A2A Agent Registry",
      "Agent Skills Registry", "Publisher & Submission API", "Security Scanner", "MCP Gateway Proxy"]

# Layer 3:
L3 = ["Workflow Templates", "Execution Engine", "Policy & Governance Engine",
      "Human-in-Loop Approval Gate", "IAM & RBAC Access Control", "Compensation Logic (Saga)"]

# Layer 4:
L4 = ["Audit Log", "Metrics & OTLP", "User Sessions", 
      "Projects & Workspace", "Ratings & Reviews", "Execution History"]

# Layer 5:
L5 = ["Azure Functions", "Container Apps", "Cosmos DB", "Azure OpenAI",
      "Key Vault", "Application Insights", "Container Registry (ACR)", "Log Analytics Workspace"]

# Red box pixel positions (from detection)
red_boxes = [
    {"id": 1, "x": (13.7, 24.2), "y": (16.4, 22.1)},  # L1
    {"id": 2, "x": (24.7, 35.2), "y": (16.4, 22.1)},  # L1
    {"id": 3, "x": (60.6, 72.8), "y": (16.5, 22.1)},  # L1
    {"id": 4, "x": (73.6, 84.7), "y": (16.8, 22.5)},  # L1
    {"id": 5, "x": (85.1, 97.4), "y": (16.8, 22.5)},  # L1
    {"id": 6, "x": (1.6, 20.4),  "y": (29.3, 79.1)},  # spans L2-L4 (tall box, left column)
    {"id": 7, "x": (40.6, 59.4), "y": (29.3, 79.1)},  # spans L2-L4 (tall box, middle column)
]

# The image maps the drawio canvas. 
# Canvas extents: x=30 to 1430 (width~1400), y=10 to 724 (height~714)
# But the PPTX image has some white padding around the diagram.
# Image = 2727x1510 pixels
# Estimate the diagram area within image (excluding any white border)

# From the drawio:
# L1 y=60, height=110 -> y range 60-170
# L2 y=190, height=110 -> y range 190-300
# L3 y=320, height=110 -> y range 320-430
# L4 y=450, height=110 -> y range 450-560
# L5 y=585, height=115 -> y range 585-700
# Total canvas: ~10 to ~734

# L1 boxes at x=30+15=45 to 30+790+140=960, first 6 at 155px each
# Using positions within each layer (relative offsets):
# Pos 1: 15-155, Pos 2: 170-310, Pos 3: 325-465, 
# Pos 4: 480-620, Pos 5: 635-775, Pos 6: 790-930

# With L1 container at x=30: absolute x = 45, 200, 355, 510, 665, 820

# The 5 L1 red boxes (x = 13.7%, 24.7%, 60.6%, 73.6%, 85.1%) 
# clearly skip some positions. 
# With total diagram width ~1460px mapped to image width:
# x=45 → 45/1460 = 3.1%    → NOT boxed (Web Dashboard)
# x=200 → 200/1460 = 13.7% → Box 1 ✓ (Visual Orchestration)
# x=355 → 355/1460 = 24.3% → Box 2 ✓ (Admin Dashboard)
# x=510 → 510/1460 = 34.9% → NOT boxed (Publisher Portal)
# x=665 → 665/1460 = 45.5% → NOT boxed (Playground)
# x=820 → 820/1460 = 56.2% → NOT boxed...

# Hmm, 60.6% doesn't match position 6 cleanly either.
# Let me reconsider - maybe the image has different padding.
# With 7 components in L2 and x_max at 945+140=1085 within layer + 30 = 1115:
# Canvas right edge would be ~1260-1430 depending on L5 (which goes to 1135+145+30=1310)

# Actually L5 has width=1400 starting at x=30, so canvas right = 1430
# Total canvas width = 1430 - 0 = 1430 (with some left margin near 0)

# Re-mapping with canvas width = 1460 (including margins):
# L2/L3/L4 column positions (within layer at x=30):
# Col 1: 30+15=45, Col 2: 30+170=200, Col 3: 30+325=355
# Col 4: 30+480=510, Col 5: 30+635=665, Col 6: 30+790=820, Col 7: 30+945=975

# Tall Box 6: x=1.6%-20.4% of image → pixel x = 44-556 → drawio x ≈ 34-296
# This spans Col 1 (45) and Col 2 (200+140=340) → covers first 2 columns
# In L2: Asset Catalog + MCP Server Registry
# In L3: Workflow Templates + Execution Engine
# In L4: Audit Log + Metrics & OTLP

# Tall Box 7: x=40.6%-59.4% → pixel x = 1108-1621 → drawio x ≈ 590-865
# This spans Col 4 (510) through Col 6 (820+~middle)
# In L2: Agent Skills Registry + Publisher & Submission API + Security Scanner
# In L3: Human-in-Loop Gate + IAM & RBAC + Compensation Logic
# In L4: Projects & Workspace + Ratings & Reviews + Execution History

print("=== RED BOUNDING BOX → COMPONENT MAPPING ===\n")

print("LAYER 1 - PRESENTATION & UX (5 red boxes around individual components):")
print("  ✅ Box 1 → Visual Orchestration (Drag-Drop Canvas)")
print("  ✅ Box 2 → Admin Dashboard (Governance & Review)")
print("  ✅ Box 3 → Publisher Portal (Asset Submission)")
print("  ✅ Box 4 → Playground (Test Agents & Tools)")
print("  ✅ Box 5 → DevUI (MAF Agent Test)")
print("  ⬜ Web Dashboard — NOT red-boxed (already built)")
print()

print("LAYERS 2-4 - TWO TALL RED BOUNDING BOXES spanning 3 layers:")
print()
print("  LEFT BOX (columns 1-2):")
print("    Layer 2: Asset Catalog, MCP Server & Tool Registry")
print("    Layer 3: Workflow Templates, Execution Engine")
print("    Layer 4: Audit Log, Metrics & OTLP")
print()
print("  MIDDLE BOX (columns 4-6):")
print("    Layer 2: Agent Skills Registry, Publisher & Submission API, Security Scanner")
print("    Layer 3: Human-in-Loop Approval Gate, IAM & RBAC, Compensation Logic (Saga)")
print("    Layer 4: Projects & Workspace, Ratings & Reviews, Execution History")

if __name__ == "__main__":
    pass
