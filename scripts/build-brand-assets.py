# -*- coding: utf-8 -*-
"""Generate high-res PWA icons and Open Graph share image from the logo."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

root = Path(__file__).resolve().parents[1]
src = Image.open(root / "reinodeluzlogo.original.png").convert("RGBA")
icons = root / "icons"
icons.mkdir(exist_ok=True)

BLACK = (10, 10, 10, 255)


def fit_on_canvas(logo, size, pad_ratio=0.08, bg=BLACK):
    canvas = Image.new("RGBA", (size, size), bg)
    max_side = int(size * (1 - 2 * pad_ratio))
    logo_r = logo.copy()
    logo_r.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - logo_r.width) // 2
    y = (size - logo_r.height) // 2
    canvas.paste(logo_r, (x, y), logo_r if logo_r.mode == "RGBA" else None)
    return canvas


# Source is already 1000x1000 — mild sharpen only, no heavy upscale mush
hi = src.copy()
if max(hi.size) < 1024:
    hi = hi.resize((1024, 1024), Image.Resampling.LANCZOS)
hi = ImageEnhance.Sharpness(hi).enhance(1.08)

fit_on_canvas(hi, 192, pad_ratio=0.08).convert("RGB").save(icons / "icon-192.png", optimize=True)
fit_on_canvas(hi, 512, pad_ratio=0.08).convert("RGB").save(icons / "icon-512.png", optimize=True)
fit_on_canvas(hi, 180, pad_ratio=0.08).convert("RGB").save(icons / "apple-touch-icon.png", optimize=True)
# Maskable needs extra safe-zone padding so OS masks don't clip the circle
fit_on_canvas(hi, 512, pad_ratio=0.2).convert("RGB").save(icons / "icon-maskable-512.png", optimize=True)

# Site logo for nav/footer
fit_on_canvas(hi, 512, pad_ratio=0.04).convert("RGB").save(root / "reinodeluzlogo.png", optimize=True)

# Open Graph 1200x630 — logo only on flat black (no glow, no text)
W, H = 1200, 630
og = Image.new("RGB", (W, H), (0, 0, 0))

logo = hi.copy()
logo.thumbnail((500, 500), Image.Resampling.LANCZOS)
lx = (W - logo.width) // 2
ly = (H - logo.height) // 2
if logo.mode == "RGBA":
    og.paste(logo.convert("RGB"), (lx, ly), logo.split()[-1])
else:
    og.paste(logo.convert("RGB"), (lx, ly))

# Distinct filename — Facebook ignores ?v= query busts on og:image
og.save(root / "share.jpg", quality=95, optimize=True, subsampling=0)
og.save(root / "og-image.jpg", quality=95, optimize=True, subsampling=0)

print("OK")
for p in [
    icons / "icon-192.png",
    icons / "icon-512.png",
    icons / "icon-maskable-512.png",
    icons / "apple-touch-icon.png",
    root / "reinodeluzlogo.png",
    root / "share.jpg",
    root / "og-image.jpg",
    root / "reinodeluzlogo.original.png",
]:
    im = Image.open(p)
    print(f"  {p.name}: {im.size[0]}x{im.size[1]} ({p.stat().st_size // 1024} KB)")
