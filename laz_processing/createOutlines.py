#FAC EXACT CE FACE PE CLOUDCOMPARE DAR CU 15000 DE PUNCTE (SAU MAI PUTIN)
#CA SA MEARGA ISRUGIOSURKGHISO

import os
import random
import math
import laspy
import alphashape
from shapely.geometry import Polygon

# ========= CONFIG =========

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_DIR = os.path.join(BASE_DIR, "outlines_svg")

# maximum number of points we keep per cloud (downsample)
MAX_POINTS = 30000

# pixels per meter in SVG
SCALE_PX_PER_M = 100.0  # 1 m = 100 px

# how "detailed" the contour is
# smaller factor -> mai concav / mai detaliat
ALPHA_FACTOR = 5.0

# ========= HELPERI =========

def choose_alpha(points):
    """
    Alege un alpha rezonabil pe baza dimensiunii camerei.
    points: list[(x, y)]
    """
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]

    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)

    width = maxx - minx
    height = maxy - miny
    diag = math.hypot(width, height)

    if diag == 0:
        return 1.0  # fallback

    # un alpha relativ la dimensiunea camerei
    # diag / ALPHA_FACTOR da o raza aproximativa
    alpha = diag / ALPHA_FACTOR

    # alphashape vrea valori mai mici pentru forme mai concave
    # asa ca normalizam un pic
    return alpha


def compute_concave_hull(xy_points):
    """
    Genereaza un concave hull 2D (alpha-shape)
    pe o lista de puncte (x, y).
    """
    n = len(xy_points)
    if n < 3:
        raise RuntimeError("Prea putine puncte pentru un contur")

    # downsample daca avem multe puncte
    if n > MAX_POINTS:
        xy_points = random.sample(xy_points, MAX_POINTS)

    alpha = choose_alpha(xy_points)
    print(f"    alpha ~ {alpha:.4f} (heuristic)")

    a_shape = alphashape.alphashape(xy_points, alpha)

    if a_shape.geom_type == "MultiPolygon":
        a_shape = max(a_shape.geoms, key=lambda p: p.area)

    if not isinstance(a_shape, Polygon):
        raise RuntimeError(f"Alpha-shape nu a produs un Polygon (ci {a_shape.geom_type})")

    return a_shape


def polygon_to_svg(polygon: Polygon, svg_path: str, scale_px_per_m: float):
    """
    Scrie polygonul ca un path SVG, cu origine in coltul stanga-sus,
    Y inversat (stil ecran).
    """
    minx, miny, maxx, maxy = polygon.bounds
    width_m = maxx - minx
    height_m = maxy - miny

    if width_m <= 0 or height_m <= 0:
        raise RuntimeError("Polygon degenerat (latime/inaltime 0)")

    width_px = width_m * scale_px_per_m
    height_px = height_m * scale_px_per_m

    coords = list(polygon.exterior.coords)

    path_cmds = []
    for i, (x, y) in enumerate(coords):
        sx = (x - minx) * scale_px_per_m
        sy = (maxy - y) * scale_px_per_m  # inversam Y
        cmd = "M" if i == 0 else "L"
        path_cmds.append(f"{cmd} {sx:.2f} {sy:.2f}")
    path_cmds.append("Z")
    d_attr = " ".join(path_cmds)

    svg_content = f"""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{width_px:.2f}" height="{height_px:.2f}"
     viewBox="0 0 {width_px:.2f} {height_px:.2f}">
  <path d="{d_attr}"
        fill="none"
        stroke="black"
        stroke-width="2"/>
</svg>
"""
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)


def process_laz_file(laz_path: str, svg_out_path: str):
    print(f"Loading: {laz_path}")
    las = laspy.read(laz_path)

    xs = las.x
    ys = las.y

    xy_points = list(zip(xs, ys))
    print(f"  {len(xy_points)} points → downsample & hull ...")

    hull = compute_concave_hull(xy_points)
    print(f"  Hull area: {hull.area:.2f}")

    print(f"  Saving SVG → {svg_out_path}")
    polygon_to_svg(hull, svg_out_path, SCALE_PX_PER_M)


# ========= MAIN =========

def main():
    if not os.path.isdir(DATA_DIR):
        print("DATA_DIR nu exista:", DATA_DIR)
        return

    os.makedirs(OUT_DIR, exist_ok=True)

    for file in os.listdir(DATA_DIR):
        if not file.lower().endswith(".laz"):
            continue

        input_path = os.path.join(DATA_DIR, file)
        base_name = os.path.splitext(file)[0]
        svg_out = os.path.join(OUT_DIR, base_name + "_outline.svg")

        print("\n==============================")
        print("Processing:", file)
        print("==============================")

        try:
            process_laz_file(input_path, svg_out)
            print("  DONE for", file)
        except Exception as e:
            print(f"  EROARE la {file}: {e}")

    print("\nDONE. SVG-urile sunt in:", OUT_DIR)


if __name__ == "__main__":
    main()
