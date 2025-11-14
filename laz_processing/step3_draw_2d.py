#AICI DAM REMOVE LA PUNCTELE NEGRE DIN PRIMUL
#poate il facem step4 si mai adaug unul intermediar.

# ============================================================
# remove_black_points_svg_step2.py
# Intrare : public/laz_results/outlines_svg/*.svg
# Ieșire  : public/laz_results/outlines_step2_svg/<același_nume>.svg
# Dep: pillow, numpy  ->  pip install pillow numpy
# ============================================================

from pathlib import Path
from xml.etree import ElementTree as ET
import numpy as np
from PIL import Image
import base64, re, io as _io

# ---- Căi ----
SCRIPT_DIR   = Path(__file__).resolve().parent
INPUT_DIR    = (SCRIPT_DIR.parent / "public" / "laz_results" / "step2").resolve()
OUTPUT_DIR   = (SCRIPT_DIR.parent / "public" / "laz_results" / "step3").resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---- Parametri ----
BLACK_THRESH = 50          # <50 pe R,G,B => considerat negru (crește la 64–80 dacă mai rămân “gri”)
RED_MIN, GREEN_MAX, BLUE_MAX = 200, 70, 70   # roșul de păstrat

# ---- Utilitare data-uri ----
def _decode_data_uri_png(data_uri: str) -> bytes:
    m = re.match(r"^data:image/(png|jpeg);base64,(.+)$", data_uri, re.IGNORECASE)
    if not m:
        raise ValueError("SVG <image> nu conține un data URI PNG/JPEG base64.")
    return base64.b64decode(m.group(2))

def _encode_png_to_data_uri(png_bytes: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")

def _get_image_href_attr(img_el):
    XLINK = "{http://www.w3.org/1999/xlink}href"
    if XLINK in img_el.attrib:
        return XLINK, img_el.attrib[XLINK]
    if "href" in img_el.attrib:
        return "href", img_el.attrib["href"]
    return None, None

# ---- Procesare imagine ----
def remove_black_pixels(pil_img: Image.Image) -> Image.Image:
    arr = np.array(pil_img.convert("RGBA"), dtype=np.uint8)
    R, G, B, A = arr[...,0], arr[...,1], arr[...,2], arr[...,3]

    is_red   = (R >= RED_MIN) & (G <= GREEN_MAX) & (B <= BLUE_MAX) & (A > 0)
    is_black = (R < BLACK_THRESH) & (G < BLACK_THRESH) & (B < BLACK_THRESH) & (A > 0)
    mask     = is_black & (~is_red)

    arr[...,0][mask] = 255
    arr[...,1][mask] = 255
    arr[...,2][mask] = 255
    arr[...,3][mask] = 255
    return Image.fromarray(arr, mode="RGBA")

# ---- Scriere SVG curat (fără dubluri xmlns) ----
def write_svg_with_image(pil_img: Image.Image, out_svg: Path):
    w, h = pil_img.size
    buf = _io.BytesIO(); pil_img.save(buf, format="PNG")
    data_uri = _encode_png_to_data_uri(buf.getvalue())

    ns_svg   = "http://www.w3.org/2000/svg"
    ns_xlink = "http://www.w3.org/1999/xlink"

    root = ET.Element("svg", {
        "xmlns": ns_svg,
        "xmlns:xlink": ns_xlink,
        "width": str(w),
        "height": str(h),
        "viewBox": f"0 0 {w} {h}",
    })
    ET.SubElement(root, "rect", {"x":"0","y":"0","width":str(w),"height":str(h),"fill":"white"})
    img_el = ET.SubElement(root, "image", {"x":"0","y":"0","width":str(w),"height":str(h)})
    img_el.set("{http://www.w3.org/1999/xlink}href", data_uri)

    ET.ElementTree(root).write(out_svg, encoding="utf-8", xml_declaration=True)

# ---- Pipeline ----
def process_one(svg_path: Path):
    print(f"[+] Procesez: {svg_path.name}")
    tree = ET.parse(svg_path)
    root = tree.getroot()
    ns = {"svg": "http://www.w3.org/2000/svg"}

    img_el = root.find(".//svg:image", ns)
    if img_el is None:
        raise RuntimeError("SVG nu conține <image> cu PNG embed-uit.")

    href_attr, href_val = _get_image_href_attr(img_el)
    if not href_attr or not href_val:
        raise RuntimeError("<image> fără href/xlink:href.")

    png_bytes = _decode_data_uri_png(href_val)
    pil_img   = Image.open(_io.BytesIO(png_bytes)).convert("RGBA")

    out_img = remove_black_pixels(pil_img)

    out_svg = OUTPUT_DIR / svg_path.name    # păstrăm același nume de fișier
    write_svg_with_image(out_img, out_svg)
    print(f"[✓] Salvat: {out_svg}")

def main():
    if not INPUT_DIR.exists():
        print(f"[!] Folder inexistent: {INPUT_DIR}"); return
    svgs = sorted(INPUT_DIR.glob("*.svg"))
    if not svgs:
        print(f"[!] Nu am găsit fișiere .svg în {INPUT_DIR}"); return
    for svg in svgs:
        try:
            process_one(svg)
        except Exception as e:
            print(f"[x] {svg.name}: {e}")

if __name__ == "__main__":
    main()
