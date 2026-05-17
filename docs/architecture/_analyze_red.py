from PIL import Image
import numpy as np
from scipy import ndimage

img = Image.open("docs/_tmp_imgs/slide4.png")
arr = np.array(img)
print("Image size:", img.size)

# Find red pixels (high R, low G, low B)
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
red_mask = (r > 180) & (g < 80) & (b < 80)
red_count = int(red_mask.sum())
print(f"Red pixels: {red_count}")

if red_count > 0:
    labeled, num_features = ndimage.label(red_mask)
    print(f"Distinct red regions: {num_features}")

    big_regions = []
    for i in range(1, num_features + 1):
        region = np.where(labeled == i)
        size = len(region[0])
        if size > 100:
            r_min, r_max = int(region[0].min()), int(region[0].max())
            c_min, c_max = int(region[1].min()), int(region[1].max())
            big_regions.append((i, r_min, r_max, c_min, c_max, size))
            print(f"  Region {i}: y={r_min}-{r_max}, x={c_min}-{c_max}, pixels={size}")

    # Now try to match regions to boxes by grouping nearby lines
    # Red bounding boxes typically form rectangles
    h, w = arr.shape[:2]
    print(f"\nImage dimensions: {w}x{h}")
    print(f"Regions as % of image:")
    for _, r_min, r_max, c_min, c_max, sz in big_regions:
        pct_y = (r_min/h*100, r_max/h*100)
        pct_x = (c_min/w*100, c_max/w*100)
        print(f"  y: {pct_y[0]:.1f}%-{pct_y[1]:.1f}%, x: {pct_x[0]:.1f}%-{pct_x[1]:.1f}%")
else:
    # Try broader red detection
    print("Trying broader red detection...")
    red_mask2 = (r > 150) & (g < 100) & (b < 100)
    print(f"Broader red pixels: {int(red_mask2.sum())}")
    
    # Try detecting any strong red channel dominance
    red_mask3 = (r.astype(int) - g.astype(int) > 100) & (r.astype(int) - b.astype(int) > 100) & (r > 150)
    print(f"Red-dominant pixels: {int(red_mask3.sum())}")
