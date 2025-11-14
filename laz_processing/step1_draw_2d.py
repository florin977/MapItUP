# ============================================================
# laz_topdown_points_to_svg.py — .laz -> SVG (puncte din vedere de sus)
# - Fără filtrări pe Z; desenează toate punctele (x,y)
# - Padding mic în jurul bbox-ului
# - Scară fixă: 160 px / metru
# Dep: laspy, numpy, matplotlib
# ============================================================

import os, glob
import laspy
import numpy as np
import matplotlib.pyplot as plt

# ---------- Parametri vizual/scară ----------
DPI = 180                   # rezoluția figurii
POINT_SIZE = 1.2            # mărimea markerului matplotlib (pt)
PIXELS_PER_UNIT = 160.0     # 1 m = 160 px (fix)
DOT_COLOR = "black"         # puncte negre pe fundal alb

# Padding foarte mic
PADDING_PX = 16         # ~8px pe fiecare latură
# Dacă vrei padding în metri, setează de ex. PADDING_M = 0.02 și calculezi din el

# ---------- Căi (din codul tău) ----------
INPUT_DIR = "data"
OUT_BASE = "../public/laz_results"
OUT_SVG = os.path.join(OUT_BASE, "step1")
os.makedirs(OUT_SVG, exist_ok=True)

def process_one(laz_path: str):
    name = os.path.splitext(os.path.basename(laz_path))[0]
    svg_out = os.path.join(OUT_SVG, f"{name}_topdown.svg")

    # --- Citește LAZ ---
    las = laspy.read(laz_path)
    x = np.asarray(las.x, dtype=np.float64)
    y = np.asarray(las.y, dtype=np.float64)

    if x.size == 0:
        print(f"[!] {name}: fișier gol — sar.")
        return

    # --- BBox în metri (XY) ---
    xmin, xmax = float(np.min(x)), float(np.max(x))
    ymin, ymax = float(np.min(y)), float(np.max(y))
    w_units = xmax - xmin
    h_units = ymax - ymin
    if w_units <= 0 or h_units <= 0:
        print(f"[!] {name}: bbox invalid — sar.")
        return

    # --- Padding în METRI (din pixeli) ---
    pad_units = PADDING_PX / PIXELS_PER_UNIT
    xmin_p = xmin - pad_units
    xmax_p = xmax + pad_units
    ymin_p = ymin - pad_units
    ymax_p = ymax + pad_units

    # --- Dimensiuni în pixeli la scara fixă ---
    w_px = (xmax_p - xmin_p) * PIXELS_PER_UNIT
    h_px = (ymax_p - ymin_p) * PIXELS_PER_UNIT
    fig_w_in = w_px / DPI
    fig_h_in = h_px / DPI

    # --- Plot fără margini, fundal alb, puncte negre ---
    fig, ax = plt.subplots(figsize=(fig_w_in, fig_h_in), dpi=DPI)
    ax.set_aspect('equal', 'box')
    ax.set_xlim(xmin_p, xmax_p)
    ax.set_ylim(ymin_p, ymax_p)
    ax.margins(0)
    plt.subplots_adjust(0, 0, 1, 1)
    ax.axis('off')
    ax.set_facecolor("white")

    # Desenare puncte (top-down = (x,y))
    ax.plot(x, y, ".", markersize=POINT_SIZE, color=DOT_COLOR)

    # --- Salvare ---
    plt.savefig(svg_out, format="svg", bbox_inches=None, pad_inches=0, transparent=False)
    plt.close(fig)

    print(f"[✓] {name}: {svg_out} ({int(w_px)}x{int(h_px)} px @ {PIXELS_PER_UNIT} px/m) | pts={x.size}")

def main():
    laz_files = sorted(glob.glob(os.path.join(INPUT_DIR, "*.laz")))
    if not laz_files:
        print(f"[!] Nu există fișiere .laz în {INPUT_DIR}")
        return
    for p in laz_files:
        try:
            process_one(p)
        except Exception as e:
            print(f"[x] {p}: {e}")

if __name__ == "__main__":
    main()
