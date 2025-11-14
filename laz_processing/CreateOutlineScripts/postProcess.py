#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
postProcess.py

- Input : laz_processing/outlinesPreProcessed/*.svg
- Output: laz_processing/outlinesFinal_svg/*.svg

Ce face:
  * Deschide SVG-uri vectoriale (path, line, polyline, polygon, rect, circle, ellipse).
  * Îngroașă liniile: crește stroke-width cu +5 px (~ 2.5 px în toate direcțiile).
  * Adaugă padding de 2 px în jurul întregului desen (prin viewBox).
"""

from pathlib import Path
from xml.etree import ElementTree as ET
import re

# ---------- Config ----------

STROKE_EXTRA = 5.0   # +5px grosime => ~2.5 px în fiecare parte
PADDING = 2.0        # 2 px padding pe toate marginile

SVG_NS = "http://www.w3.org/2000/svg"
NSMAP = {"svg": SVG_NS}

ET.register_namespace("", SVG_NS)  # evită prefix-uri SVG

# directoare relative față de CreateOutlineScripts/postProcess.py
SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent
INPUT_DIR = BASE_DIR / "outlinesPreProcessed"
OUTPUT_DIR = BASE_DIR / "outlinesFinal_svg"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ---------- Utilitare stroke ----------

def _parse_float(s):
    if s is None:
        return None
    s = s.strip()
    m = re.match(r"([0-9.+-eE]+)", s)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def get_stroke_width(el):
    # atribut direct
    sw_attr = el.get("stroke-width")
    val = _parse_float(sw_attr)
    if val is not None:
        return val

    # în style
    style = el.get("style")
    if style and "stroke-width" in style:
        parts = style.split(";")
        for p in parts:
            if "stroke-width" in p:
                _, v = p.split(":", 1)
                return _parse_float(v)
    return None


def set_stroke_width(el, new_width):
    new_str = f"{new_width:g}"

    el.set("stroke-width", new_str)

    style = el.get("style")
    if style:
        parts = style.split(";")
        new_parts = []
        found = False
        for p in parts:
            if not p.strip():
                continue
            if "stroke-width" in p:
                new_parts.append(f"stroke-width:{new_str}")
                found = True
            else:
                new_parts.append(p)
        if not found:
            new_parts.append(f"stroke-width:{new_str}")
        el.set("style", ";".join(new_parts))
    else:
        el.set("style", f"stroke-width:{new_str}")


def thicken_element(el):
    has_stroke_attr = el.get("stroke") is not None
    style = el.get("style", "")
    has_stroke_in_style = "stroke:" in style

    if not has_stroke_attr and not has_stroke_in_style:
        return

    current = get_stroke_width(el)
    if current is None:
        current = 1.0
    new_w = current + STROKE_EXTRA
    set_stroke_width(el, new_w)


# ---------- Utilitare viewBox / dimensiuni ----------

def parse_viewbox(vb_str):
    parts = vb_str.replace(",", " ").split()
    if len(parts) != 4:
        raise ValueError("viewBox invalid")
    return [float(p) for p in parts]


def format_viewbox(vals):
    return " ".join(f"{v:g}" for v in vals)


def get_svg_size(root):
    vb = root.get("viewBox")
    if vb:
        return parse_viewbox(vb)

    w = _parse_float(root.get("width"))
    h = _parse_float(root.get("height"))
    if w is None or h is None:
        return [0.0, 0.0, 100.0, 100.0]
    return [0.0, 0.0, w, h]


def update_svg_size_with_padding(root, padding):
    minx, miny, w, h = get_svg_size(root)

    minx_new = minx - padding
    miny_new = miny - padding
    w_new = w + 2 * padding
    h_new = h + 2 * padding

    root.set("viewBox", format_viewbox([minx_new, miny_new, w_new, h_new]))

    if root.get("width") is not None:
        root.set("width", f"{w_new:g}")
    if root.get("height") is not None:
        root.set("height", f"{h_new:g}")

    return minx_new, miny_new, w_new, h_new


# ---------- Procesare fișier ----------

GEOM_TAGS = {"path", "line", "polyline", "polygon", "rect", "circle", "ellipse"}


def process_svg_file(svg_path: Path, out_path: Path):
    print(f"Procesez: {svg_path.name}")

    tree = ET.parse(svg_path)
    root = tree.getroot()

    # 1) Îngroșăm elementele geometrice
    for el in root.iter():
        tag_local = el.tag.split("}")[-1]
        if tag_local in GEOM_TAGS:
            thicken_element(el)

    # 2) Mărim viewBox + width/height cu padding
    update_svg_size_with_padding(root, PADDING)

    # NU mai adăugăm fundal alb aici

    # 3) Salvăm SVG-ul
    tree.write(out_path, encoding="utf-8", xml_declaration=True)
    print(f" -> Salvat: {out_path}")


# ---------- main ----------

def main():
    svg_files = sorted(INPUT_DIR.glob("*.svg"))
    if not svg_files:
        print(f"Nu am găsit SVG-uri în {INPUT_DIR}")
        return

    for svg_path in svg_files:
        out_path = OUTPUT_DIR / svg_path.name
        try:
            process_svg_file(svg_path, out_path)
        except Exception as e:
            print(f"[EROARE] {svg_path.name}: {e}")


if __name__ == "__main__":
    main()
