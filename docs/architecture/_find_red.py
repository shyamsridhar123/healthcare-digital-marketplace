import re

with open("docs/ai-marketplace-capabilities.drawio", "r", encoding="utf-8") as f:
    content = f.read()

# Search for red-ish fill/stroke colors
red_codes = ["FF0000", "ff0000", "E53935", "D32F2F", "F44336", "EF5350",
             "C62828", "B71C1C", "ff4444", "cc0000", "FF3333", "e53935",
             "d32f2f", "f44336", "ef5350", "c62828", "b71c1c",
             "FF1744", "ff1744", "D50000", "d50000", "E57373", "e57373"]

for code in red_codes:
    if code in content:
        # find nearby value attributes
        for m in re.finditer(re.escape(code), content):
            start = max(0, m.start() - 500)
            end = min(len(m.string), m.end() + 200)
            snippet = content[start:end]
            values = re.findall(r'value="([^"]+)"', snippet)
            print(f"Color #{code} near: {values}")

# Also check for strokeColor with any reddish tone
matches = re.findall(r'strokeColor=#([0-9a-fA-F]{6})', content)
unique = set(matches)
print("\nAll stroke colors used:")
for c in sorted(unique):
    r = int(c[0:2], 16)
    g = int(c[2:4], 16)
    b = int(c[4:6], 16)
    if r > 180 and g < 100 and b < 100:
        # Find nearby values
        for m in re.finditer(f"strokeColor=#{c}", content):
            start = max(0, m.start() - 500)
            end = min(len(m.string), m.end() + 200)
            snippet = content[start:end]
            values = re.findall(r'value="([^"]+)"', snippet)
            print(f"  RED stroke #{c}: {values}")

# Check fillColor similarly
matches2 = re.findall(r'fillColor=#([0-9a-fA-F]{6})', content)
unique2 = set(matches2)
print("\nAll fill colors:")
for c in sorted(unique2):
    r = int(c[0:2], 16)
    g = int(c[2:4], 16)
    b = int(c[4:6], 16)
    tag = ""
    if r > 180 and g < 100 and b < 100:
        tag = " *** RED ***"
    elif r > 200 and g < 150 and b < 150:
        tag = " (reddish)"
    print(f"  #{c} (R={r},G={g},B={b}){tag}")
