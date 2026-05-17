"""Map red bounding box regions to the capability diagram components on Slide 4."""
from PIL import Image
import numpy as np
from scipy import ndimage

img = Image.open("docs/_tmp_imgs/slide4.png")
arr = np.array(img)
h, w = arr.shape[:2]

r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
red_mask = (r > 180) & (g < 80) & (b < 80)
labeled, num_features = ndimage.label(red_mask)

# Collect significant red boxes (>1000 pixels = actual bounding box lines)
boxes = []
for i in range(1, num_features + 1):
    region = np.where(labeled == i)
    size = len(region[0])
    if size > 1000:
        r_min, r_max = int(region[0].min()), int(region[0].max())
        c_min, c_max = int(region[1].min()), int(region[1].max())
        boxes.append({
            "id": i,
            "y_pct": (r_min/h*100, r_max/h*100),
            "x_pct": (c_min/w*100, c_max/w*100),
            "y_px": (r_min, r_max),
            "x_px": (c_min, c_max),
            "pixels": size,
            "aspect": (c_max - c_min) / max(1, r_max - r_min)
        })

print(f"Found {len(boxes)} significant red bounding boxes:\n")

# The capabilities diagram has 5 layers from top to bottom:
# Layer 1: Presentation & UX (top ~15-25%)
# Layer 2: API & Registries (~25-45%)
# Layer 3: Orchestration & Governance (~45-65%)
# Layer 4: Data & Observability (~65-85%)
# Layer 5: Azure Services (bottom ~85-100%)
#
# Components left-to-right in each layer are known from the drawio/docs

# Known component layout from drawio (5 layers):
layers = {
    "Layer 1 - Presentation & UX": {
        "y_range": (10, 30),
        "components": ["Web Dashboard", "Visual Orchestration", "Admin Dashboard", 
                       "Publisher Portal", "Playground", "DevUI"]
    },
    "Layer 2 - API & Registries": {
        "y_range": (25, 50),
        "components": ["Asset Catalog", "MCP Server Registry", "A2A Agent Registry",
                       "Skills Registry", "Publisher API", "Security Scanner", "MCP Gateway"]
    },
    "Layer 3 - Orchestration & Governance": {
        "y_range": (45, 70),
        "components": ["Workflow Templates", "Execution Engine", "Policy Engine",
                       "HITL Gate", "IAM/RBAC", "Saga/Compensation"]
    },
    "Layer 4 - Data & Observability": {
        "y_range": (65, 85),
        "components": ["Audit Log", "Metrics/OTLP", "Sessions", 
                       "Projects", "Ratings", "Execution History"]
    },
    "Layer 5 - Azure Services": {
        "y_range": (80, 100),
        "components": ["Azure Functions", "Container Apps", "Cosmos DB",
                       "AI Foundry", "OpenAI", "AI Search", "Key Vault"]
    }
}

for box in boxes:
    y_mid = (box["y_pct"][0] + box["y_pct"][1]) / 2
    x_mid = (box["x_pct"][0] + box["x_pct"][1]) / 2
    box_h = box["y_pct"][1] - box["y_pct"][0]
    box_w = box["x_pct"][1] - box["x_pct"][0]
    
    # Determine which layer
    layer_name = "Unknown"
    for lname, linfo in layers.items():
        yr = linfo["y_range"]
        if yr[0] <= y_mid <= yr[1]:
            layer_name = lname
            break
    
    shape = "wide box" if box["aspect"] > 3 else "tall box" if box["aspect"] < 0.5 else "box"
    print(f"Box {box['id']}: {shape}")
    print(f"  Position: x={box['x_pct'][0]:.1f}%-{box['x_pct'][1]:.1f}%, y={box['y_pct'][0]:.1f}%-{box['y_pct'][1]:.1f}%")
    print(f"  Size: {box_w:.1f}% x {box_h:.1f}%  (aspect={box['aspect']:.1f})")
    print(f"  Layer: {layer_name}")
    print()

# Save annotated image for verification
annotated = img.copy()
from PIL import ImageDraw, ImageFont
draw = ImageDraw.Draw(annotated)
for box in boxes:
    x1, x2 = box["x_px"]
    y1, y2 = box["y_px"]
    draw.rectangle([x1-2, y1-2, x2+2, y2+2], outline="lime", width=3)
    draw.text((x1+5, y1+5), f"Box {box['id']}", fill="lime")
annotated.save("docs/_tmp_imgs/slide4_annotated.png")
print("Saved annotated image to docs/_tmp_imgs/slide4_annotated.png")
