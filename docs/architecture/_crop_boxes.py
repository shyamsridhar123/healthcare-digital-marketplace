from PIL import Image

img = Image.open("docs/_tmp_imgs/slide4.png")
w, h = img.size

boxes = [
    ("L1-Box1", 13.7, 24.2, 16.4, 22.1),
    ("L1-Box2", 24.7, 35.2, 16.4, 22.1),
    ("L1-Box3", 60.6, 72.8, 16.5, 22.1),
    ("L1-Box4", 73.6, 84.7, 16.8, 22.5),
    ("L1-Box5", 85.1, 97.4, 16.8, 22.5),
    ("Tall-Left", 1.6, 20.4, 29.3, 79.1),
    ("Tall-Mid", 40.6, 59.4, 29.3, 79.1),
]

for name, x1p, x2p, y1p, y2p in boxes:
    x1 = int(x1p / 100 * w)
    x2 = int(x2p / 100 * w)
    y1 = int(y1p / 100 * h)
    y2 = int(y2p / 100 * h)
    crop = img.crop((x1, y1, x2, y2))
    fname = "docs/_tmp_imgs/box_%s.png" % name
    crop.save(fname)
    print("Saved %s (%dx%d px)" % (fname, x2 - x1, y2 - y1))

# Also save full image with grid lines to show layer boundaries
from PIL import ImageDraw
annotated = img.copy()
draw = ImageDraw.Draw(annotated)

# Draw layer boundary lines (estimated from drawio proportions)
# L1: y=60-170 out of 734 total → 8.2%-23.2%
# L2: y=190-300 → 25.9%-40.9%
# L3: y=320-430 → 43.6%-58.6%
# L4: y=450-560 → 61.3%-76.3%
# L5: y=585-700 → 79.7%-95.4%
layer_ys = [
    ("L1", 8.2, 23.2),
    ("L2", 25.9, 40.9),
    ("L3", 43.6, 58.6),
    ("L4", 61.3, 76.3),
    ("L5", 79.7, 95.4),
]
for lname, yp1, yp2 in layer_ys:
    y1 = int(yp1 / 100 * h)
    y2 = int(yp2 / 100 * h)
    draw.line([(0, y1), (w, y1)], fill="cyan", width=2)
    draw.line([(0, y2), (w, y2)], fill="cyan", width=2)
    draw.text((5, y1 + 5), lname, fill="cyan")

annotated.save("docs/_tmp_imgs/slide4_grid.png")
print("\nSaved annotated grid image")
