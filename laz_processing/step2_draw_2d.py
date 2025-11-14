#ducem linii din margine catre centru
#gasim un punct => ne oprim si punem punct rosu acolo (momentan) :o

from pathlib import Path
import re
import base64
import io as _io
import sys
from collections import deque
from xml.etree import ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw

# ------------------- Căi -------------------
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_PUBLIC = (SCRIPT_DIR.parent / "public" / "laz_results").resolve()
INPUT_DIR   = ROOT_PUBLIC / "step1"
OUT_DIR     = ROOT_PUBLIC / "step2"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ------------------- Parametri -------------------
BLACK_THRESH = 48                 # <=> considerăm “negru” (punct LiDAR)
RAY_COLOR    = (255, 0, 0, 255)   # roșu deplin
POINT_RADIUS = 1                  # 0 = punct 1px; altfel disc
PADDING_PX   = 4                  # margine albă în jurul conținutului
MAX_STEPS_PER_SEED = 200000       # gardă pentru BFS pe contur

# ------------------- Helper parse -------------------
_float_re = re.compile(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?")

def _nums(s: str):
    return [float(x) for x in _float_re.findall(s or "")]

def _parse_length_px(val: str|None):
    if not val: return None
    v = val.strip()
    v = re.sub(r"(px|pt)$", "", v)
    try: return float(v)
    except: return None

def _parse_transform_one(t: str):
    t = t.strip()
    if t.startswith("translate"):
        a = _nums(t)
        if len(a) == 1:  return ("translate", (a[0], 0.0))
        if len(a) >= 2:  return ("translate", (a[0], a[1]))
    if t.startswith("scale"):
        a = _nums(t)
        if len(a) == 1:  return ("scale", (a[0], a[0]))
        if len(a) >= 2:  return ("scale", (a[0], a[1]))
    return (None, None)

def _apply_transform(x, y, transform: str|None):
    if not transform: return x, y
    x2, y2 = x, y
    for chunk in re.findall(r"(translate\([^)]*\)|scale\([^)]*\))", transform):
        kind, args = _parse_transform_one(chunk)
        if kind == "translate":
            dx, dy = args
            x2 += dx; y2 += dy
        elif kind == "scale":
            sx, sy = args
            x2 *= sx; y2 *= sy
    return x2, y2

def _svg_canvas_size(root: ET.Element):
    w = _parse_length_px(root.get("width"))
    h = _parse_length_px(root.get("height"))
    if w and h: return int(round(w)), int(round(h))
    vb = root.get("viewBox") or root.get("viewbox")
    if vb:
        parts = _nums(vb)
        if len(parts) == 4:
            return int(round(parts[2])), int(round(parts[3]))
    return None, None

def _iter_elements(root: ET.Element):
    for el in root.iter():
        tag = el.tag
        if isinstance(tag, str) and tag.startswith("{"):
            tag = tag.split("}", 1)[1]
        yield tag, el

def extract_points(svg_path: Path):
    tree = ET.parse(svg_path)
    root = tree.getroot()
    W, H = _svg_canvas_size(root)
    pts = []
    for tag, el in _iter_elements(root):
        try:
            if tag == "use":
                x = _parse_length_px(el.get("x")) or 0.0
                y = _parse_length_px(el.get("y")) or 0.0
                x, y = _apply_transform(x, y, el.get("transform"))
                pts.append((x, y))
            elif tag == "circle":
                cx = el.get("cx"); cy = el.get("cy")
                if cx is not None and cy is not None:
                    x = float(cx); y = float(cy)
                    x, y = _apply_transform(x, y, el.get("transform"))
                    pts.append((x, y))
            elif tag in ("polyline", "polygon"):
                arr = _nums(el.get("points"))
                for i in range(0, len(arr)-1, 2):
                    x, y = arr[i], arr[i+1]
                    x, y = _apply_transform(x, y, el.get("transform"))
                    pts.append((x, y))
            elif tag == "path":
                arr = _nums(el.get("d"))
                for i in range(0, len(arr)-1, 2):
                    x, y = arr[i], arr[i+1]
                    x, y = _apply_transform(x, y, el.get("transform"))
                    pts.append((x, y))
        except Exception:
            continue
    return pts, (W, H)

# ------------------- Rasterizare -------------------
def build_raster(pts, canvas_WH):
    if not pts:
        return Image.new("RGBA", (256, 256), (255,255,255,255))
    if canvas_WH[0] and canvas_WH[1]:
        W, H = int(canvas_WH[0]), int(canvas_WH[1])
        shift_x = 0; shift_y = 0
    else:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        xmin, xmax = min(xs), max(xs)
        ymin, ymax = min(ys), max(ys)
        W = max(1, int(round(xmax - xmin + 2*PADDING_PX)))
        H = max(1, int(round(ymax - ymin + 2*PADDING_PX)))
        shift_x = -xmin + PADDING_PX
        shift_y = -ymin + PADDING_PX
    img = Image.new("RGBA", (W, H), (255,255,255,255))
    draw = ImageDraw.Draw(img)
    r = max(0, int(POINT_RADIUS))
    for (x, y) in pts:
        xi = int(round(x + shift_x))
        yi = int(round(y + shift_y))
        if 0 <= xi < W and 0 <= yi < H:
            if r == 0:
                img.putpixel((xi, yi), (0,0,0,255))
            else:
                draw.ellipse((xi-r, yi-r, xi+r, yi+r), fill=(0,0,0,255))
    return img

# ------------------- Raycast + conectare pe frontieră -------------------
def _first_true_idx(a: np.ndarray):
    return int(np.argmax(a)) if a.any() else None

def _first_true_idx_from_right(a: np.ndarray):
    if not a.any(): return None
    i = int(np.argmax(a[::-1])); return a.size - 1 - i

def _is_black_rgb(rgb: np.ndarray) -> np.ndarray:
    return (rgb[...,0] < BLACK_THRESH) & (rgb[...,1] < BLACK_THRESH) & (rgb[...,2] < BLACK_THRESH)

def _mask_is_red(arr: np.ndarray) -> np.ndarray:
    return (arr[...,0] == 255) & (arr[...,1] == 0) & (arr[...,2] == 0) & (arr[...,3] > 0)

def _neighbors8(y, x, H, W):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W:
                yield ny, nx

def _compute_boundary(mask_black: np.ndarray) -> np.ndarray:
    """pixeli negri care ating cel puțin un vecin alb (frontieră 4-conexă)."""
    H, W = mask_black.shape
    bg = ~mask_black
    up = np.zeros_like(bg);    up[1:, :]   = bg[:-1, :]
    down = np.zeros_like(bg);  down[:-1, :] = bg[1:,  :]
    left = np.zeros_like(bg);  left[:,1:]  = bg[:, :-1]
    right = np.zeros_like(bg); right[:, :-1] = bg[:, 1:]
    touch_bg_4 = up | down | left | right
    return mask_black & touch_bg_4

def _connect_rays_along_boundary(arr: np.ndarray, mask_black: np.ndarray, max_steps_per_seed: int = MAX_STEPS_PER_SEED):
    """
    Conectează punctele roșii mergând DOAR pe frontieră (8-vecini) până la următorul roșu.
    Colorează traseul cu roșu.
    """
    H, W, _ = arr.shape
    red = _mask_is_red(arr)
    boundary = _compute_boundary(mask_black)

    seeds = np.argwhere(red & boundary)
    if seeds.size == 0:
        return

    visited = np.zeros((H, W), dtype=bool)

    for sy, sx in seeds:
        if visited[sy, sx]:
            continue

        q = deque()
        q.append((sy, sx))
        visited[sy, sx] = True
        prev = { (sy, sx): None }
        target = None
        steps = 0

        while q:
            y, x = q.popleft()
            steps += 1
            if steps > max_steps_per_seed:
                break

            if red[y, x] and not (y == sy and x == sx):
                target = (y, x)
                break

            for ny, nx in _neighbors8(y, x, H, W):
                if not boundary[ny, nx] or visited[ny, nx]:
                    continue
                visited[ny, nx] = True
                prev[(ny, nx)] = (y, x)
                q.append((ny, nx))

        if target is not None:
            cur = target
            while cur is not None:
                cy, cx = cur
                arr[cy, cx, :] = RAY_COLOR
                cur = prev.get(cur, None)

def raycast_and_connect(pil_img: Image.Image) -> Image.Image:
    arr = np.array(pil_img.convert("RGBA"), dtype=np.uint8)
    H, W, _ = arr.shape
    rgb = arr[..., :3]; alpha = arr[..., 3]
    mask_black = _is_black_rgb(rgb) & (alpha > 0)

    # 1) raycast clasic: din toate marginile
    for y in range(H):
        idx = _first_true_idx(mask_black[y, :])
        if idx is not None: arr[y, idx, :] = RAY_COLOR
        idx = _first_true_idx_from_right(mask_black[y, :])
        if idx is not None: arr[y, idx, :] = RAY_COLOR
    for x in range(W):
        idx = _first_true_idx(mask_black[:, x])
        if idx is not None: arr[idx, x, :] = RAY_COLOR
        idx = _first_true_idx_from_right(mask_black[:, x])
        if idx is not None: arr[idx, x, :] = RAY_COLOR

    # 2) conectăm semințele mergând pe frontieră
    _connect_rays_along_boundary(arr, mask_black)

    return Image.fromarray(arr, mode="RGBA")

# ------------------- Curățare padding -------------------
def whiten_padding(pil_img: Image.Image, pad: int = PADDING_PX) -> Image.Image:
    arr = np.array(pil_img.convert("RGBA"), dtype=np.uint8)
    H, W, _ = arr.shape
    arr[:pad, :, :] = (255,255,255,255)
    arr[-pad:, :, :] = (255,255,255,255)
    arr[:, :pad, :] = (255,255,255,255)
    arr[:, -pad:, :] = (255,255,255,255)
    return Image.fromarray(arr, mode="RGBA")

# ------------------- Scriere SVG -------------------
def write_svg_with_image_strict(pil_img: Image.Image, out_svg: Path):
    w, h = pil_img.size
    buf = _io.BytesIO()
    pil_img.save(buf, format="PNG")
    data_uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    ns_svg   = "http://www.w3.org/2000/svg"
    ns_xlink = "http://www.w3.org/1999/xlink"
    root = ET.Element(
        "svg",
        {
            "xmlns": ns_svg,
            "xmlns:xlink": ns_xlink,
            "width": str(w),
            "height": str(h),
            "viewBox": f"0 0 {w} {h}",
        },
    )
    ET.SubElement(root, "rect", {
        "x":"0","y":"0","width":str(w),"height":str(h),"fill":"white"
    })
    img_el = ET.SubElement(root, "image", {
        "x":"0","y":"0","width":str(w),"height":str(h),
    })
    img_el.set("{http://www.w3.org/1999/xlink}href", data_uri)
    ET.ElementTree(root).write(out_svg, encoding="utf-8", xml_declaration=True)

# ------------------- Main -------------------
def main():
    if not INPUT_DIR.exists():
        print(f"[!] Folder inexistent: {INPUT_DIR}")
        sys.exit(1)
    svgs = sorted(INPUT_DIR.glob("*.svg"))
    if not svgs:
        print(f"[!] Nu am găsit .svg în {INPUT_DIR}")
        sys.exit(0)

    print(f"[i] Găsit {len(svgs)} fișiere SVG")
    for svg in svgs:
        try:
            print(f"[+] Procesez {svg.name}")
            pts, (W, H) = extract_points(svg)
            if not pts:
                print(f"    [!] Nu am extras puncte din {svg.name} — sar.")
                continue
            raster = build_raster(pts, (W, H))
            out_img = raycast_and_connect(raster)
            out_img = whiten_padding(out_img, pad=PADDING_PX)
            out_svg = OUT_DIR / f"{svg.stem}_raycast.svg"
            write_svg_with_image_strict(out_img, out_svg)
            print(f"    [✓] Salvat: {out_svg}")
        except Exception as e:
            print(f"    [x] Eroare la {svg.name}: {e}")

if __name__ == "__main__":
    main()
