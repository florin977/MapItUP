#ingrosam liniile rosii si le facem negre
#TO DO: fa sa fie mai ca lumea liniile.

from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image, ImageFilter
import numpy as np
import base64, re, io as _io

# ----- Căi -----
SCRIPT_DIR   = Path(__file__).resolve().parent
INPUT_DIR    = (SCRIPT_DIR.parent / "public" / "laz_results" / "step3").resolve()
OUTPUT_DIR   = (SCRIPT_DIR.parent / "public" / "laz_results" / "step4").resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ----- Parametri -----
GROW_PX = 2  # grosimea suplimentară a conturului
RED_MIN = 200
GREEN_MAX = 70
BLUE_MAX  = 70

# ----- Utilitare data-uri -----
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

# ----- Îngroșare contur roșu (acum devine negru) -----
def thicken_red_outline(pil_img: Image.Image, grow_px: int = 4) -> Image.Image:
    """Îngroașă liniile roșii cu grow_px, fără să modifice rezoluția sau DPI."""
    arr = np.array(pil_img.convert("RGBA"), dtype=np.uint8)
    R, G, B, A = arr[...,0], arr[...,1], arr[...,2], arr[...,3]

    is_red = (R >= RED_MIN) & (G <= GREEN_MAX) & (B <= BLUE_MAX) & (A > 0)

    # mască binară
    mask_img = Image.fromarray((is_red.astype(np.uint8) * 255), mode="L")

    # dilatare (kernel = (2*grow_px+1))
    size = max(1, 2 * int(grow_px) + 1)
    thick_mask = mask_img.filter(ImageFilter.MaxFilter(size=size))

    thick = np.array(thick_mask, dtype=np.uint8) == 255

    # --- MODIFICARE: colorăm în NEGRU în loc de roșu ---
    arr[...,0][thick] = 0   # R
    arr[...,1][thick] = 0   # G
    arr[...,2][thick] = 0   # B
    arr[...,3][thick] = 255 # A

    out_img = Image.fromarray(arr, mode="RGBA")

    # păstrăm DPI-ul original dacă există
    if "dpi" in pil_img.info:
        out_img.info["dpi"] = pil_img.info["dpi"]

    return out_img

# ----- Scriere SVG curat, fără dubluri xmlns -----
def write_svg_with_image(pil_img: Image.Image, out_svg: Path):
    w, h = pil_img.size
    buf = _io.BytesIO()
    pil_img.save(buf, format="PNG")
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

    ET.SubElement(root, "rect", {
        "x": "0", "y": "0",
        "width": str(w), "height": str(h),
        "fill": "white"
    })

    image_el = ET.SubElement(root, "image", {
        "x": "0", "y": "0",
        "width": str(w), "height": str(h)
    })
    image_el.set("{http://www.w3.org/1999/xlink}href", data_uri)

    ET.ElementTree(root).write(out_svg, encoding="utf-8", xml_declaration=True)

# ----- Pipeline -----
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
    pil_img = Image.open(_io.BytesIO(png_bytes)).convert("RGBA")

    # păstrăm DPI-ul original (dacă are)
    original_dpi = pil_img.info.get("dpi", None)

    out_img = thicken_red_outline(pil_img, grow_px=GROW_PX)

    # dacă imaginea originală avea DPI, îl restaurăm
    if original_dpi:
        out_img.info["dpi"] = original_dpi

    out_svg = OUTPUT_DIR / svg_path.name
    write_svg_with_image(out_img, out_svg)
    print(f"[✓] Salvat: {out_svg}")

def main():
    if not INPUT_DIR.exists():
        print(f"[!] Folder inexistent: {INPUT_DIR}")
        return
    svgs = sorted(INPUT_DIR.glob("*.svg"))
    if not svgs:
        print(f"[!] Nu am găsit fișiere .svg în {INPUT_DIR}")
        return

    for svg in svgs:
        try:
            process_one(svg)
        except Exception as e:
            print(f"[x] {svg.name}: {e}")

if __name__ == "__main__":
    main()