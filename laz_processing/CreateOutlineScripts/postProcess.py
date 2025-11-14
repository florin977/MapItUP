#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path
import xml.etree.ElementTree as ET

INPUT_DIR = Path("../outlinesPreProcessed")
OUTPUT_DIR = Path("../outlinesFinal_svg")

STROKE_WIDTH = 5  # grosimea noilor linii
BACKGROUND_COLOR = "white"

def process_svg(svg_path: Path):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    # ===== 1) Setare fundal alb =====
    # Adaugăm un <rect> cu fundal alb la începutul SVG-ului
    width = root.attrib.get("width", "100%")
    height = root.attrib.get("height", "100%")

    bg_rect = ET.Element("rect", {
        "x": "0",
        "y": "0",
        "width": width,
        "height": height,
        "fill": BACKGROUND_COLOR
    })

    # Inserăm ca primul element
    root.insert(0, bg_rect)

    # ===== 2) Îngroșăm toate liniile negre =====
    for elem in root.iter():
        stroke = elem.attrib.get("stroke", "").lower()

        # Detectăm linii negre
        if stroke in ("black", "#000", "#000000", "rgb(0,0,0)"):
            elem.set("stroke-width", str(STROKE_WIDTH))

    return tree


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for svg_file in INPUT_DIR.glob("*.svg"):
        print(f"Procesare: {svg_file.name}")
        tree = process_svg(svg_file)
        out_path = OUTPUT_DIR / svg_file.name
        tree.write(out_path, encoding="utf-8", xml_declaration=True)

    print("\n✔️ Gata! SVG-urile sunt îngroșate și au fundal alb.")


if __name__ == "__main__":
    main()
