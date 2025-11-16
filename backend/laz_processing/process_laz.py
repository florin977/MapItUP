#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# process_laz.py - adaptat să meargă cu input .laz
# Rulează așa:
#   python3 process_laz.py input.laz output.svg
#
# Face:
#  - citește un .laz
#  - calculează un concave hull (alpha-shape)
#  - exportă conturul ca SVG
#  - conturul e îngroșat
#  - adaugă padding alb în jurul camerei

import sys
import os
import random
import math
import laspy
import alphashape
from shapely.geometry import Polygon

# ========= CONFIG =========
MAX_POINTS = 40000
SCALE_PX_PER_M = 100.0   # 1 m = 100 px
ALPHA_FACTOR = 3.0

# grosimea conturului în pixeli
STROKE_WIDTH = 5.0

# padding alb în jurul camerei (px)
PADDING_PX = 20.0


def choose_alpha(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]

    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)

    width = maxx - minx
    height = maxy - miny
    diag = math.hypot(width, height)

    if diag == 0:
        return 1.0

    alpha = diag / ALPHA_FACTOR
    return alpha


def compute_concave_hull(xy_points):
    n = len(xy_points)
    if n < 3:
        raise RuntimeError("Prea putine puncte pentru un contur")

    if n > MAX_POINTS:
        xy_points = random.sample(xy_points, MAX_POINTS)

    alpha = choose_alpha(xy_points)
    print(f"    alpha ~ {alpha:.4f}")

    a_shape = alphashape.alphashape(xy_points, alpha)

    if a_shape.geom_type == "MultiPolygon":
        a_shape = max(a_shape.geoms, key=lambda p: p.area)

    if not isinstance(a_shape, Polygon):
        raise RuntimeError(
            f"Alpha-shape nu a produs un Polygon (ci {a_shape.geom_type})"
        )

    return a_shape


def polygon_to_svg(polygon: Polygon, svg_path: str, scale_px_per_m: float):
    # bounds în coordonate "metri" (sau unitățile LAZ)
    minx, miny, maxx, maxy = polygon.bounds
    width_m = maxx - minx
    height_m = maxy - miny

    if width_m <= 0 or height_m <= 0:
        raise RuntimeError("Polygon degenerat")

    # dimensiuni SVG în pixeli pentru camera în sine
    width_px = width_m * scale_px_per_m
    height_px = height_m * scale_px_per_m

    # adăugăm padding în jur
    total_width = width_px + 2 * PADDING_PX
    total_height = height_px + 2 * PADDING_PX

    coords = list(polygon.exterior.coords)

    # construim path SVG cu offset de padding
    path_cmds = []
    for i, (x, y) in enumerate(coords):
        sx = (x - minx) * scale_px_per_m + PADDING_PX
        sy = (maxy - y) * scale_px_per_m + PADDING_PX  # inversare axă Y
        cmd = "M" if i == 0 else "L"
        path_cmds.append(f"{cmd} {sx:.2f} {sy:.2f}")
    path_cmds.append("Z")

    d_attr = " ".join(path_cmds)

    svg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{total_width:.2f}" height="{total_height:.2f}"
     viewBox="0 0 {total_width:.2f} {total_height:.2f}">
  <!-- fundal alb -->
  <rect x="0" y="0" width="{total_width:.2f}" height="{total_height:.2f}" fill="white"/>
  <!-- contur cameră -->
  <path d="{d_attr}"
        fill="none"
        stroke="black"
        stroke-width="{STROKE_WIDTH:.2f}"
        stroke-linejoin="round"
        stroke-linecap="round"/>
</svg>
"""

    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 process_laz.py input.laz output.svg")
        sys.exit(1)

    input_laz = sys.argv[1]
    output_svg = sys.argv[2]

    if not os.path.isfile(input_laz):
        print(f"Input .laz not found: {input_laz}")
        sys.exit(1)

    print("==============================")
    print("Processing single LAZ:")
    print(f"  input  = {input_laz}")
    print(f"  output = {output_svg}")
    print("==============================")

    try:
        las = laspy.read(input_laz)
        xs = las.x
        ys = las.y

        xy_points = list(zip(xs, ys))
        print(f"  {len(xy_points)} points → hull...")

        hull = compute_concave_hull(xy_points)

        print(f"  Hull area = {hull.area:.2f}")
        print(f"  Saving SVG → {output_svg}")

        polygon_to_svg(hull, output_svg, SCALE_PX_PER_M)

        print("  DONE.")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
