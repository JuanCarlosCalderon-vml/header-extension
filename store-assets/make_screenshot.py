#!/usr/bin/env python3
"""Generate a 1280x800 Chrome Web Store screenshot (24-bit PNG, no alpha)."""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 800
OUT = os.path.join(os.path.dirname(__file__), "screenshot-1.png")

# ---- fonts -------------------------------------------------------------
def font(paths, size):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

BOLD = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc"]
REG = ["/System/Library/Fonts/Supplemental/Arial.ttf",
       "/System/Library/Fonts/Helvetica.ttc"]

f_title = font(BOLD, 66)
f_sub = font(REG, 30)
f_tag = font(BOLD, 22)
f_h = font(BOLD, 22)
f_reg = font(REG, 18)
f_small = font(REG, 16)
f_ph = font(REG, 18)

# ---- helpers -----------------------------------------------------------
def vgrad(w, h, top, bot):
    base = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(base)
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] + (bot[0] - top[0]) * t)
        g = int(top[1] + (bot[1] - top[1]) * t)
        b = int(top[2] + (bot[2] - top[2]) * t)
        d.line([(0, y), (w, y)], fill=(r, g, b))
    return base

def paste_shadow(canvas, box, radius, blur=0):
    x0, y0, x1, y1 = box

# ---- background --------------------------------------------------------
img = vgrad(W, H, (29, 78, 216), (59, 130, 246))  # #1d4ed8 -> #3b82f6
d = ImageDraw.Draw(img)

# left copy
d.text((90, 250), "Header Tool", font=f_title, fill=(255, 255, 255))
d.text((92, 340), "Inject & toggle custom HTTP", font=f_sub, fill=(226, 235, 255))
d.text((92, 380), "request headers on approved", font=f_sub, fill=(226, 235, 255))
d.text((92, 420), "domains.", font=f_sub, fill=(226, 235, 255))
# small feature pills
pills = ["Local only", "No analytics", "Per-header toggles"]
px = 92
for p in pills:
    tw = d.textlength(p, font=f_small)
    d.rounded_rectangle([px, 490, px + tw + 32, 526], radius=18,
                        fill=(255, 255, 255), outline=None)
    d.text((px + 16, 498), p, font=f_small, fill=(37, 99, 246))
    px += tw + 48

# ---- popup card --------------------------------------------------------
CW = 460
CX = W - CW - 90
CY = 150
CH = 500
# soft shadow
sh = Image.new("RGB", (W, H), (0, 0, 0))
# simple offset shadow via rounded rect on a temp
d.rounded_rectangle([CX + 6, CY + 10, CX + CW + 6, CY + CH + 10], radius=20,
                    fill=(23, 55, 150))
# card body
d.rounded_rectangle([CX, CY, CX + CW, CY + CH], radius=20, fill=(247, 249, 252))

# header bar (gradient)
head = vgrad(CW, 74, (29, 78, 216), (59, 130, 246))
mask = Image.new("L", (CW, 74), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, CW, 74], radius=20, fill=255)
ImageDraw.Draw(mask).rectangle([0, 40, CW, 74], fill=255)
img.paste(head, (CX, CY), mask)
d.text((CX + 26, CY + 22), "Header Tool", font=f_h, fill=(255, 255, 255))
d.text((CX + 250, CY + 26), "HEADERS", font=f_small, fill=(226, 235, 255))
# toggle pill (on)
tgx, tgy = CX + 360, CY + 22
d.rounded_rectangle([tgx, tgy, tgx + 62, tgy + 30], radius=15, fill=(37, 99, 246))
d.ellipse([tgx + 34, tgy + 3, tgx + 34 + 24, tgy + 3 + 24], fill=(255, 255, 255))

y = CY + 92
# scope status
d.ellipse([CX + 26, y + 4, CX + 42, y + 20], fill=(22, 163, 74))
d.text((CX + 52, y), "Headers active on this page", font=f_reg, fill=(51, 65, 85))
y += 44

# profile row
d.rounded_rectangle([CX + 26, y, CX + 300, y + 40], radius=8,
                    fill=(255, 255, 255), outline=(203, 213, 225), width=1)
d.text((CX + 40, y + 10), "Default", font=f_h, fill=(15, 23, 42))
d.text((CX + 278, y + 10), "v", font=f_small, fill=(100, 116, 139))
for i, lbl in enumerate(["+", "Aa"]):
    bx = CX + 312 + i * 60
    d.rounded_rectangle([bx, y, bx + 50, y + 40], radius=8,
                        fill=(255, 255, 255), outline=(203, 213, 225), width=1)
    d.text((bx + 18, y + 9), lbl, font=f_reg, fill=(51, 65, 85))
y += 56

# header row card
d.rounded_rectangle([CX + 26, y, CX + CW - 26, y + 58], radius=10,
                    fill=(255, 255, 255), outline=(226, 232, 240), width=1)
# checkbox
d.rounded_rectangle([CX + 40, y + 16, CX + 66, y + 42], radius=6, fill=(37, 99, 246))
d.line([(CX + 46, y + 29), (CX + 52, y + 36)], fill=(255, 255, 255), width=3)
d.line([(CX + 52, y + 36), (CX + 61, y + 22)], fill=(255, 255, 255), width=3)
# name field
d.rounded_rectangle([CX + 78, y + 12, CX + 250, y + 46], radius=6,
                    fill=(248, 250, 252), outline=(226, 232, 240), width=1)
d.text((CX + 90, y + 19), "FutureContentEnabled", font=f_small, fill=(15, 23, 42))
# value field
d.rounded_rectangle([CX + 260, y + 12, CX + CW - 60, y + 46], radius=6,
                    fill=(248, 250, 252), outline=(226, 232, 240), width=1)
d.text((CX + 272, y + 19), "true", font=f_ph, fill=(15, 23, 42))
d.text((CX + CW - 46, y + 17), "x", font=f_h, fill=(148, 163, 184))
y += 74

# add header button (gradient)
btn = vgrad(CW - 52, 46, (29, 78, 216), (59, 130, 246))
bmask = Image.new("L", (CW - 52, 46), 0)
ImageDraw.Draw(bmask).rounded_rectangle([0, 0, CW - 52, 46], radius=10, fill=255)
img.paste(btn, (CX + 26, y), bmask)
d.text((CX + CW // 2 - 66, y + 12), "+ Add header", font=f_h, fill=(255, 255, 255))
y += 66

# divider + domains
d.line([(CX + 26, y), (CX + CW - 26, y)], fill=(226, 232, 240), width=1)
y += 16
d.text((CX + 26, y), "Domains (4)", font=f_h, fill=(51, 65, 85))
y += 44

# footer buttons
labels = ["Export", "Import", "Theme"]
bw = (CW - 52 - 24) // 3
for i, lbl in enumerate(labels):
    bx = CX + 26 + i * (bw + 12)
    d.rounded_rectangle([bx, y, bx + bw, y + 44], radius=8,
                        fill=(255, 255, 255), outline=(203, 213, 225), width=1)
    tw = d.textlength(lbl, font=f_reg)
    d.text((bx + (bw - tw) / 2, y + 12), lbl, font=f_reg, fill=(51, 65, 85))

img.save(OUT, "PNG")
print("Saved", OUT, img.size, img.mode)
