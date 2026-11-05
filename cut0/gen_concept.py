#!/usr/bin/env python3
"""Bot Office Cut0 — isometric 3-floor concept SVG (reproducible)."""

from pathlib import Path

OUT = Path(__file__).resolve().parent / "concept-office.svg"
W, H = 1400, 1000
SCALE = 24.0

def iso(x, y, z):
    sx = (x - y) * 0.86602540378 * SCALE
    sy = (x + y) * 0.5 * SCALE - z * SCALE
    return sx, sy

def poly(pts, fill, stroke="#2a2a2a", sw=1.4, opacity=1.0, dash=False):
    d = " ".join(f"{p[0]:.1f},{p[1]:.1f}" for p in pts)
    op = f' fill-opacity="{opacity}"' if opacity < 1 else ""
    da = ' stroke-dasharray="6 4"' if dash else ""
    return f'<polygon points="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{op}{da}/>'

def text(x, y, s, size=14, weight="600", fill="#1a1a1a", anchor="middle"):
    safe = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="Noto Sans SC, PingFang SC, '
        f'DejaVu Sans, Sans-Serif" font-size="{size}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}">{safe}</text>'
    )

WINGS = [
    {"key": "Optics", "label": "Optics", "x0": 0.0, "fill": "#cfe8ff", "wall": "#5a92c4", "accent": "#1e5a8a"},
    {"key": "Painting", "label": "Painting", "x0": 7.2, "fill": "#ffe0cc", "wall": "#c47858", "accent": "#8a3d1e"},
    {"key": "Office", "label": "Office", "x0": 14.4, "fill": "#d4f0d8", "wall": "#5a9d62", "accent": "#1e6a28"},
]

FLOOR_H = 3.8
WING_W = 6.4
WING_D = 5.2

STAFF = {
    2: {"Optics": ("Optics Head", False), "Painting": ("Painting Head", False), "Office": ("Office Head", False)},
    1: {"Optics": ("Optics PM", False), "Painting": ("Painting PM", False), "Office": ("Office PM", False)},
    0: {"Optics": ("待招", True), "Painting": ("Ins Sampler", False), "Office": ("待招", True)},
}
FLOOR_LABELS = {2: "3F Heads", 1: "2F PMs", 0: "1F Workers"}

OX, OY = 520, 620

def S(x, y, z):
    sx, sy = iso(x, y, z)
    return sx + OX, sy + OY

parts = []
parts.append(f'<rect width="{W}" height="{H}" fill="#f4f1ec"/>')
parts.append(text(W/2, 40, "Bot Office · 三层办公楼概念图（Cut 0）", size=24, weight="700", fill="#111"))
parts.append(text(W/2, 66, "等距切开示意 · 一眼三层 · 供确认后再做 3D", size=14, weight="400", fill="#555"))

for fi in range(3):
    z0 = fi * FLOOR_H
    z_ceil = z0 + FLOOR_H

    for wing in WINGS:
        x0 = wing["x0"]
        parts.append(poly([
            S(x0, 0, z0 + 0.12), S(x0 + WING_W, 0, z0 + 0.12),
            S(x0 + WING_W, 0, z_ceil), S(x0, 0, z_ceil),
        ], "#ffffff", wing["wall"], 1.2, opacity=0.2))

        for (cx, cy) in [(x0, 0), (x0 + WING_W, 0), (x0, WING_D), (x0 + WING_W, WING_D)]:
            a, b = S(cx, cy, z0), S(cx, cy, z_ceil)
            parts.append(
                f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" '
                f'stroke="{wing["wall"]}" stroke-width="3.2" stroke-opacity="0.92"/>'
            )

        parts.append(poly([
            S(x0, 0, z0 + 0.12), S(x0 + WING_W, 0, z0 + 0.12),
            S(x0 + WING_W, WING_D, z0 + 0.12), S(x0, WING_D, z0 + 0.12),
        ], wing["fill"], "#333", 1.7))
        parts.append(poly([
            S(x0, WING_D, z0), S(x0 + WING_W, WING_D, z0),
            S(x0 + WING_W, WING_D, z0 + 0.12), S(x0, WING_D, z0 + 0.12),
        ], wing["wall"], "#333", 1.1))
        parts.append(poly([
            S(x0 + WING_W, 0, z0), S(x0 + WING_W, WING_D, z0),
            S(x0 + WING_W, WING_D, z0 + 0.12), S(x0 + WING_W, 0, z0 + 0.12),
        ], wing["wall"], "#333", 1.1))

        wx, wy = S(x0 + WING_W / 2, 0.45, z0 + 0.22)
        parts.append(text(wx, wy, wing["label"], size=14, weight="700", fill=wing["accent"]))

    for wing in WINGS:
        name, dashed = STAFF[fi][wing["key"]]
        z = z0 + 0.12
        dx, dy = wing["x0"] + 2.0, 1.85
        w, d, h = 2.1, 1.25, 0.55
        fill = "#fffaf3" if not dashed else "#f2f2f2"
        stroke = "#333" if not dashed else "#888"

        parts.append(poly([
            S(dx, dy, z + h), S(dx + w, dy, z + h),
            S(dx + w, dy + d, z + h), S(dx, dy + d, z + h),
        ], fill, stroke, 1.5, dash=dashed))
        parts.append(poly([
            S(dx, dy + d, z), S(dx + w, dy + d, z),
            S(dx + w, dy + d, z + h), S(dx, dy + d, z + h),
        ], "#e2d9cb" if not dashed else "#e6e6e6", stroke, 1.1, dash=dashed))
        parts.append(poly([
            S(dx + w, dy, z), S(dx + w, dy + d, z),
            S(dx + w, dy + d, z + h), S(dx + w, dy, z + h),
        ], "#ebe2d4" if not dashed else "#ececec", stroke, 1.1, dash=dashed))

        cx, cy = S(dx + w / 2, dy + d + 0.7, z + 0.15)
        if dashed:
            parts.append(
                f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="9" fill="none" stroke="#999" '
                f'stroke-width="1.5" stroke-dasharray="3 3"/>'
            )
        else:
            parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="9" fill="#444" opacity="0.35"/>')

        lx, ly = S(dx + w / 2, dy + d / 2, z + h + 0.4)
        tw = max(92, len(name) * 11)
        dash_attr = ' stroke-dasharray="5 3"' if dashed else ""
        parts.append(
            f'<rect x="{lx - tw/2:.1f}" y="{ly - 14:.1f}" width="{tw:.1f}" height="22" rx="5" '
            f'fill="#ffffff" stroke="{stroke}" stroke-width="1.3"{dash_attr} opacity="0.97"/>'
        )
        parts.append(text(lx, ly + 3, name, size=13, weight="700", fill="#222" if not dashed else "#777"))

    fl = FLOOR_LABELS[fi]
    bx, by = S(-3.6, WING_D / 2, z0 + FLOOR_H * 0.52)
    parts.append(f'<rect x="{bx-62:.1f}" y="{by-17:.1f}" width="124" height="32" rx="8" fill="#1a1a1a"/>')
    parts.append(text(bx, by + 6, fl, size=15, weight="700", fill="#fff"))

shaft_x = 13.75
for fi in range(3):
    z0 = fi * FLOOR_H + 0.12
    parts.append(poly([
        S(shaft_x, 1.5, z0), S(shaft_x + 0.9, 1.5, z0),
        S(shaft_x + 0.9, 3.5, z0), S(shaft_x, 3.5, z0),
    ], "#c8ced6", "#555", 1.2))
    a = S(shaft_x + 0.45, 1.5, z0)
    b = S(shaft_x + 0.45, 1.5, z0 + FLOOR_H - 0.12)
    parts.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#666" stroke-width="2.2"/>')

sx, sy = S(shaft_x + 0.45, 2.5, 1.7 * FLOOR_H)
parts.append(f'<rect x="{sx-40:.1f}" y="{sy-11:.1f}" width="80" height="20" rx="4" fill="#fff" stroke="#555"/>')
parts.append(text(sx, sy + 4, "电梯/楼梯", size=12, weight="600", fill="#333"))

# Side legends (right column) — clear of building
LEG_X, LEG_Y = 1120, 120
parts.append(f'<rect x="{LEG_X}" y="{LEG_Y}" width="250" height="200" rx="10" fill="#fff" stroke="#333" stroke-width="1.5"/>')
parts.append(text(LEG_X + 125, LEG_Y + 28, "图例", size=16, weight="700"))
for i, line in enumerate([
    "3F Heads · 负责人层",
    "2F PMs · 项目管理层",
    "1F Workers · 执行层",
    "汇报 = 1:1（无项目群）",
    "跨部门经 Office Head",
]):
    parts.append(text(LEG_X + 16, LEG_Y + 58 + i * 26, "• " + line, size=13, weight="500", fill="#222", anchor="start"))

KEY_X, KEY_Y = 1120, 350
parts.append(f'<rect x="{KEY_X}" y="{KEY_Y}" width="250" height="150" rx="10" fill="#fff" stroke="#333" stroke-width="1.5"/>')
parts.append(text(KEY_X + 125, KEY_Y + 28, "部门分区（三翼）", size=15, weight="700"))
for i, wing in enumerate(WINGS):
    y = KEY_Y + 58 + i * 28
    parts.append(f'<rect x="{KEY_X+18}" y="{y-12}" width="22" height="16" rx="3" fill="{wing["fill"]}" stroke="{wing["wall"]}" stroke-width="1.4"/>')
    parts.append(text(KEY_X + 52, y + 1, wing["label"], size=14, weight="600", fill=wing["accent"], anchor="start"))

parts.append(f'<rect x="{KEY_X}" y="530" width="250" height="70" rx="10" fill="#fff" stroke="#888" stroke-width="1.3" stroke-dasharray="5 3"/>')
parts.append(text(KEY_X + 125, 560, "虚线工位 = 待招", size=14, weight="600", fill="#666"))
parts.append(text(KEY_X + 125, 582, "（尚未配置 bot）", size=12, weight="400", fill="#888"))

svg = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n'
    + "\n".join(parts)
    + "\n</svg>\n"
)
OUT.write_text(svg, encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
samples = [
    ("1F Optics SW", S(0, 0, 0)),
    ("1F Office SE", S(20.8, 5.2, 0)),
    ("3F ceil mid", S(10, 2.5, 3 * FLOOR_H)),
    ("banner 3F", S(-3.6, 2.6, 2 * FLOOR_H + FLOOR_H * 0.52)),
    ("banner 1F", S(-3.6, 2.6, FLOOR_H * 0.52)),
]
for label, p in samples:
    print(f"{label}: ({p[0]:.0f}, {p[1]:.0f})")
