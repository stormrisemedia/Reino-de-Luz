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

# Open Graph 1200x630 — large centered logo; no redundant brand title under it
W, H = 1200, 630
og = Image.new("RGB", (W, H), (8, 8, 8))
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
for r, a in [(520, 22), (360, 38), (240, 55)]:
    gdraw.ellipse([W // 2 - r, H // 2 - r - 20, W // 2 + r, H // 2 + r - 20], fill=(245, 200, 0, a))
glow = glow.filter(ImageFilter.GaussianBlur(80))
og = Image.alpha_composite(og.convert("RGBA"), glow).convert("RGB")
draw = ImageDraw.Draw(og)

logo = hi.copy()
logo.thumbnail((440, 440), Image.Resampling.LANCZOS)
lx = (W - logo.width) // 2
# Leave room for a single tagline under the mark
ly = (H - logo.height) // 2 - 36
if logo.mode == "RGBA":
    og.paste(logo.convert("RGB"), (lx, ly), logo.split()[-1])
else:
    og.paste(logo.convert("RGB"), (lx, ly))


def load_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


sub_font = load_font(28, bold=False)
tagline = "Llevando la Luz de Cristo al Mundo"
bbox = draw.textbbox((0, 0), tagline, font=sub_font)
tw = bbox[2] - bbox[0]
ty = ly + logo.height + 28
draw.text(((W - tw) // 2, ty), tagline, font=sub_font, fill=(245, 200, 0))

og.save(root / "og-image.jpg", quality=95, optimize=True, subsampling=0)

print("OK")
for p in [
    icons / "icon-192.png",
    icons / "icon-512.png",
    icons / "icon-maskable-512.png",
    icons / "apple-touch-icon.png",
    root / "reinodeluzlogo.png",
    root / "og-image.jpg",
    root / "reinodeluzlogo.original.png",
]:
    im = Image.open(p)
    print(f"  {p.name}: {im.size[0]}x{im.size[1]} ({p.stat().st_size // 1024} KB)")
