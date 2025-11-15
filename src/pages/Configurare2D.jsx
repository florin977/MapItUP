import React, { useEffect, useRef, useState } from "react";
import "./Configurare2D.css";

import svg1Url from "../assets/tempSvgs/input/camera1_alin_buna_outline.svg";
import svg2Url from "../assets/tempSvgs/input/camera2_alin_buna_outline.svg";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

const Configurare2D = () => {
  const [pos, setPos] = useState({ x: 300, y: 150 }); // poziția logicală a svg2
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1); // 1 = 100%

  const [svg1Inner, setSvg1Inner] = useState("");
  const [svg2Inner, setSvg2Inner] = useState("");

  const svgRef = useRef(null);

  // ──────────────────────────────
  // Încarcăm conținutul SVG-urilor ca text (pentru export)
  // ──────────────────────────────
  useEffect(() => {
    const extractInner = (text) => {
      const m = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
      return m ? m[1] : text;
    };

    fetch(svg1Url)
      .then((r) => r.text())
      .then((t) => setSvg1Inner(extractInner(t)))
      .catch((e) => console.error("Eroare load svg1", e));

    fetch(svg2Url)
      .then((r) => r.text())
      .then((t) => setSvg2Inner(extractInner(t)))
      .catch((e) => console.error("Eroare load svg2", e));
  }, []);

  // ──────────────────────────────
  // ZOOM – micșorează/mărește TOATE SVG-urile (canvas-ul rămâne la fel)
  // ──────────────────────────────
  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.25, z - 0.25));
  const handleZoomReset = () => setZoom(1);

  // ──────────────────────────────
  // DRAG în coordonate LOGICE (independente de zoom)
  // ──────────────────────────────
  const getSvgCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    const svgPos = getSvgCoords(e);
    setIsDragging(true);
    setOffset({
      x: svgPos.x - pos.x,
      y: svgPos.y - pos.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const svgPos = getSvgCoords(e);
    setPos({
      x: svgPos.x - offset.x,
      y: svgPos.y - offset.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  // ──────────────────────────────
  // MERGE + EXPORT (SVG self-contained, cu zoom și poziția curentă)
  // ──────────────────────────────
  const handleSubmit = () => {
    if (!svg1Inner || !svg2Inner) {
      alert("SVG-urile nu au fost încă încărcate complet. Mai încearcă o dată.");
      return;
    }

    const mergedSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
  <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="white" />

  <g transform="scale(${zoom})">
    <g id="svg1">
      ${svg1Inner}
    </g>

    <g id="svg2" transform="translate(${pos.x}, ${pos.y})">
      ${svg2Inner}
    </g>
  </g>
</svg>
`;

    const blob = new Blob([mergedSVG], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "merged_for_output.svg"; // îl muți în src/assets/tempSvgs/output
    a.click();
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────

  return (
    <div className="config2d-container">
      <h1 className="config2d-title">Configurare 2D – Lipire SVG-uri</h1>

      <p className="config2d-subtitle">
        Mută camera 2 peste camera 1. Zoom-ul micșorează / mărește contururile,
        nu „foaia albă”.
      </p>

      <div className="config2d-toolbar">
        <button onClick={handleZoomOut} className="zoom-btn">
          –
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="zoom-btn">
          +
        </button>
        <button onClick={handleZoomReset} className="zoom-reset">
          Reset
        </button>
      </div>

      <div className="canvas-wrapper">
        <svg
          ref={svgRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            background: "white",
            border: "2px solid #4c4c7a",
            borderRadius: "12px",
          }}
        >
          {/* fundal alb */}
          <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="white" />

          {/* TOT conținutul scalat cu zoom */}
          <g transform={`scale(${zoom})`}>
            {/* SVG FIX */}
            <g>
              <image href={svg1Url} x="0" y="0" />
            </g>

            {/* SVG MUTABIL */}
            <g
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseDown={handleMouseDown}
              style={{ cursor: "grab" }}
            >
              <image href={svg2Url} x="0" y="0" opacity="0.9" />
            </g>
          </g>
        </svg>
      </div>

      <button className="btn primary submit-btn" onClick={handleSubmit}>
        Submit – Download merged_for_output.svg
      </button>
    </div>
  );
};

export default Configurare2D;
