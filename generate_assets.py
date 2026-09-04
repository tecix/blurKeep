"""
Generates AMO submission assets:
  - icon-128.jpg  (128x128 addon icon)
  - screenshot.jpg (1280x800 store screenshot)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

OUT = os.path.dirname(__file__)

# ── Colour palette (Google Keep inspired) ──────────────────────────────────
YELLOW      = (251, 188,   4)
YELLOW_DARK = ( 60,  42,   0)
WHITE       = (255, 255, 255)
BG          = (250, 250, 250)
CARD_BG     = (255, 255, 255)
TEXT_DARK   = ( 32,  33,  36)
TEXT_GREY   = ( 95,  99, 104)
SHADOW      = (  0,   0,   0, 30)

# ══════════════════════════════════════════════════════════════════════════════
# 1. ICON  128×128
# ══════════════════════════════════════════════════════════════════════════════
def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + radius*2, y0 + radius*2], fill=fill)
    draw.ellipse([x1 - radius*2, y0, x1, y0 + radius*2], fill=fill)
    draw.ellipse([x0, y1 - radius*2, x0 + radius*2, y1], fill=fill)
    draw.ellipse([x1 - radius*2, y1 - radius*2, x1, y1], fill=fill)

def make_icon():
    S = 256          # work at 2× for anti-aliasing
    img = Image.new("RGB", (S, S), YELLOW)
    d   = ImageDraw.Draw(img, "RGBA")

    # Background note cards (blurred impression)
    ghost = (200, 180, 120)
    for x, y, w, h in [(16,16,80,60),(160,16,80,60),(16,180,80,60),(160,180,80,60)]:
        rounded_rect(d, (x, y, x+w, y+h), 8, ghost)

    # Focused centre note
    cx0, cy0, cx1, cy1 = 56, 72, 200, 184
    rounded_rect(d, (cx0, cy0, cx1, cy1), 12, YELLOW_DARK)

    # Lines inside centre note
    for i, ly in enumerate([110, 130, 150]):
        lw = 100 if i < 2 else 60
        d.rounded_rectangle([cx0+16, ly, cx0+16+lw, ly+8], radius=4, fill=YELLOW)

    # Downscale to 128 × 128 (anti-aliased)
    icon = img.resize((128, 128), Image.LANCZOS)
    path = os.path.join(OUT, "icon-128.jpg")
    icon.save(path, "JPEG", quality=95)
    print(f"Saved {path}")

# ══════════════════════════════════════════════════════════════════════════════
# 2. SCREENSHOT  1280×800
# ══════════════════════════════════════════════════════════════════════════════
def card(draw, x, y, w, h, title, lines, bg_color, blur=False, alpha=255):
    """Draw a note card."""
    r = 12
    col = tuple(int(c * 0.45 + 255 * 0.55) for c in bg_color) if blur else bg_color
    rounded_rect(draw, (x, y, x+w, y+h), r, col)
    # title
    ty = y + 18
    tc = tuple(int(c * 0.45 + 255 * 0.55) for c in TEXT_DARK) if blur else TEXT_DARK
    try:
        fnt_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
        fnt_body  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    except Exception:
        fnt_title = ImageFont.load_default()
        fnt_body  = fnt_title
    draw.text((x + 16, ty), title, font=fnt_title, fill=tc)
    lc = tuple(int(c * 0.45 + 255 * 0.55) for c in TEXT_GREY) if blur else TEXT_GREY
    for i, line in enumerate(lines):
        draw.text((x + 16, ty + 30 + i * 22), line, font=fnt_body, fill=lc)

def make_screenshot():
    W, H = 1280, 800
    img = Image.new("RGB", (W, H), BG)
    d   = ImageDraw.Draw(img)

    try:
        font_sm   = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
        font_med  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        font_lg   = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        font_bold = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    except Exception:
        font_sm = font_med = font_lg = font_bold = ImageFont.load_default()

    # ── Header bar ────────────────────────────────────────────────────────
    d.rectangle([0, 0, W, 64], fill=(255, 255, 255))
    d.rectangle([0, 64, W, 65], fill=(230, 230, 230))
    # Keep logo dot
    d.ellipse([20, 16, 48, 44], fill=YELLOW)
    d.text((58, 20), "Keep", font=font_bold, fill=TEXT_DARK)
    # Search bar
    d.rounded_rectangle([120, 16, 700, 48], radius=24, fill=(241, 243, 244))
    d.text((140, 24), "Search", font=font_med, fill=TEXT_GREY)

    # ── Left sidebar ──────────────────────────────────────────────────────
    d.rectangle([0, 65, 68, H], fill=(255, 255, 255))

    # ── Notes grid (blurred/dimmed) ───────────────────────────────────────
    NOTES_BG = (218, 214, 196)  # warm tinted bg for blurred area
    d.rectangle([68, 65, W, H], fill=NOTES_BG)

    note_data = [
        (90,  100, 220, 140, "fun",           ["add Calisthenics", "excercise"], (255, 255, 255)),
        (330, 100, 220, 140, "Prepare Sales", ["make them proactive", "follow up"], (255, 214, 179)),
        (570, 100, 220, 140, "gym",           ["Full Body 3x / week", "gym.tranchithien"], (182, 220, 182)),
        (810, 100, 220, 140, "2026 Goals",    ["campaign targets", "activities"], (200, 200, 240)),
        (90,  270, 220, 140, "Sales rules",   ["Leonix", "Generic vs Vertical"], (255, 255, 255)),
        (810, 270, 220, 140, "Yellow notes",  ["Tick checkbox", "after calendar"], (255, 255, 220)),
    ]
    for x, y, w, h, title, lines, bg in note_data:
        card(d, x, y, w, h, title, lines, bg, blur=True)

    # ── Dim overlay strip (simulating blur overlay) ───────────────────────
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 90))
    img.paste(Image.new("RGB", (W, H), (0,0,0)),
              mask=overlay.split()[3])

    # Re-draw the header + sidebar on top (they're unaffected)
    d2 = ImageDraw.Draw(img)
    d2.rectangle([0, 0, W, 64], fill=(255, 255, 255))
    d2.rectangle([0, 64, W, 65], fill=(230, 230, 230))
    d2.ellipse([20, 16, 48, 44], fill=YELLOW)
    d2.text((58, 20), "Keep", font=font_bold, fill=TEXT_DARK)
    d2.rounded_rectangle([120, 16, 700, 48], radius=24, fill=(241, 243, 244))
    d2.text((140, 24), "Search", font=font_med, fill=TEXT_GREY)
    d2.rectangle([0, 65, 68, H], fill=(248, 248, 248))

    # ── Active note dialog (sharp, centred) ───────────────────────────────
    dw, dh = 520, 300
    dx = (W - dw) // 2
    dy = (H - dh) // 2 - 20

    # Shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for i in range(16, 0, -1):
        alpha = int(120 * (1 - i / 16))
        sd.rounded_rectangle([dx - i, dy - i, dx + dw + i, dy + dh + i],
                              radius=16 + i, fill=(0, 0, 0, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB"))

    # Dialog card
    d3 = ImageDraw.Draw(img)
    d3.rounded_rectangle([dx, dy, dx + dw, dy + dh], radius=14,
                          fill=(232, 240, 230))   # green-tinted note

    # Dialog content
    d3.text((dx + 20, dy + 20), "ideas prison / activity inventory",
            font=font_bold, fill=TEXT_DARK)

    # Checkbox row
    d3.rounded_rectangle([dx + 20, dy + 70, dx + 34, dy + 84], radius=3,
                          outline=TEXT_GREY, width=2, fill=None)
    d3.text((dx + 44, dy + 68), "sales script for Generic vs. Vertical industrial",
            font=font_sm, fill=TEXT_DARK)

    # + List item
    d3.text((dx + 20, dy + 110), "+ List item", font=font_sm, fill=TEXT_GREY)

    # Edited timestamp
    d3.text((dx + dw - 160, dy + 160), "Edited at 14:25", font=font_sm, fill=TEXT_GREY)

    # Toolbar icons (simplified dots)
    icons_y = dy + dh - 52
    d3.line([(dx + 20, dy + dh - 58), (dx + dw - 20, dy + dh - 58)],
            fill=(200, 200, 200), width=1)
    for ix in range(dx + 24, dx + dw - 60, 42):
        d3.ellipse([ix, icons_y, ix + 18, icons_y + 18], fill=(150, 150, 150))
    # Close button
    d3.rounded_rectangle([dx + dw - 80, icons_y - 4, dx + dw - 16, icons_y + 22],
                          radius=6, fill=TEXT_GREY)
    d3.text((dx + dw - 68, icons_y - 2), "Close", font=font_sm, fill=WHITE)

    # ── BlurKeep badge (bottom right) ────────────────────────────────────
    bx, by = W - 210, H - 54
    d3.rounded_rectangle([bx, by, bx + 190, by + 36], radius=18, fill=YELLOW)
    d3.ellipse([bx + 10, by + 8, bx + 26, by + 28], fill=YELLOW_DARK)
    d3.text((bx + 32, by + 8), "BlurKeep active", font=font_med, fill=YELLOW_DARK)

    path = os.path.join(OUT, "screenshot.jpg")
    img.save(path, "JPEG", quality=95)
    print(f"Saved {path}")


if __name__ == "__main__":
    make_icon()
    make_screenshot()
    print("Done.")
