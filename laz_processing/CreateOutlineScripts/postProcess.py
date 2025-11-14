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
  * Adaugă un dreptunghi de fundal alb cât tot viewBox-ul.
"""

from pathlib import Path
from xml.etree import ElementTree as ET
import re

# ---------- Config ----------

STROKE_EXTRA = 5.0   # +5px grosime => ~2.5 px în fiecare parte
PADDING = 2.0        # 2 px padding pe toate marginile

SVG_NS = "http://www.w3.org/2000/svg"
NSMAP = {"svg": SVG_NS}

ET.register_namespace("", SVG_NS)  # să nu bage prefix-uri ci bare <svg>

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
    # scoatem "px" sau alte unități
    m = re.match(r"([0-9.+-eE]+)", s)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def get_stroke_width(el):
    """
    Caută stroke-width fie ca atribut, fie în style="...".
    """
    # atribut direct
    sw_attr = el.get("stroke-width")
    val = _parse_float(sw_attr)
    if val is not None:
        return val

    # în style
    style = el.get("style")
    if style and "stroke-width" in style:
        # separăm declarațiile CSS
        parts = style.split(";")
        for p in parts:
            if "stroke-width" in p:
                _, v = p.split(":", 1)
                return _parse_float(v)

    return None


def set_stroke_width(el, new_width):
    """
    Setează stroke-width atât în atribut, cât și în style (dacă îl conține).
    """
    new_str = f"{new_width:g}"

    # atribut direct
    el.set("stroke-width", new_str)

    # în style
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
    """
    Îngroașă stroke-ul pentru un element geometric.
    """
    # dacă nu are stroke deloc, nu umblăm (sau am putea adăuga, dar nu e nevoie)
    has_stroke_attr = el.get("stroke") is not None
    style = el.get("style", "")
    has_stroke_in_style = "stroke:" in style

    if not has_stroke_attr and not has_stroke_in_style:
        # probabil e doar fill; îl lăsăm în pace
        return

    current = get_stroke_width(el)
    if current is None:
        current = 1.0  # default
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
    """
    Returnează (minx, miny, width, height) pe baza viewBox sau width/height.
    """
    vb = root.get("viewBox")
    if vb:
        return parse_viewbox(vb)

    # fallback: width/height
    w = _parse_float(root.get("width"))
    h = _parse_float(root.get("height"))
    if w is None or h is None:
        # dacă nici astea nu există, punem ceva default
        return [0.0, 0.0, 100.0, 100.0]
    return [0.0, 0.0, w, h]


def update_svg_size_with_padding(root, padding):
    """
    Mărește viewBox cu padding pe toate marginile.
    Păstrează width/height în px dacă existau.
    """
    minx, miny, w, h = get_svg_size(root)

    # aplicăm padding pe viewBox
    minx_new = minx - padding
    miny_new = miny - padding
    w_new = w + 2 * padding
    h_new = h + 2 * padding

    root.set("viewBox", format_viewbox([minx_new, miny_new, w_new, h_new]))

    # updatăm width/height dacă există
    w_attr = root.get("width")
    h_attr = root.get("height")
    if w_attr is not None:
        root.set("width", f"{w_new:g}")
    if h_attr is not None:
        root.set("height", f"{h_new:g}")

    return minx_new, miny_new, w_new, h_new


def add_white_background(root, minx, miny, w, h):
    """
    Adaugă un <rect> cu fundal alb cât tot viewBox-ul.
    Îl punem ca primul copil al lui <svg>.
    """
    rect = ET.Element(f"{{{SVG_NS}}}rect")
    rect.set("x", f"{minx:g}")
    rect.set("y", f"{miny:g}")
    rect.set("width", f"{w:g}")
    rect.set("height", f"{h:g}")
    rect.set("fill", "white")

    # băgăm rectul în fața celorlalți copii
    root.insert(0, rect)


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
    minx, miny, w, h = update_svg_size_with_padding(root, PADDING)

    # 3) Adăugăm fundal alb
    add_white_background(root, minx, miny, w, h)

    # 4) Salvăm SVG-ul nou
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
