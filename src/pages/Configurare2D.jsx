// src/pages/Configurare2D.jsx
import React, { useEffect, useRef, useState } from "react";
import "./Configurare2D.css";

import svg1Url from "../assets/tempSvgs/input/camera1_alin_buna_outline.svg";
import svg2Url from "../assets/tempSvgs/input/camera2_alin_buna_outline.svg";

const WORLD_SIZE = 4000; // 4000 x 4000 fundal alb

const Configurare2D = () => {
  // poziție camera 2 (top-left) în coordonate lume (independente de zoom)
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // dimensiuni SVG-uri
  const [baseSize, setBaseSize] = useState({ width: 1000, height: 1000 }); // camera1
  const [movingSize, setMovingSize] = useState({ width: 1000, height: 1000 }); // camera2

  // poziția de desenare a camerei 1 (top-left)
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);
  const wrapperRef = useRef(null);

  // ──────────────────────────────
  // utilitar: parsează width/height din <svg>
  // ──────────────────────────────
  const parseSvgInfo = (text) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const root = doc.querySelector("svg");
    if (!root) {
      return { width: 1000, height: 1000 };
    }

    let widthAttr = root.getAttribute("width");
    let heightAttr = root.getAttribute("height");

    let width = parseFloat(widthAttr);
    let height = parseFloat(heightAttr);

    const viewBox = root.getAttribute("viewBox");
    if ((!width || !height || isNaN(width) || isNaN(height)) && viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/);
      if (parts.length === 4) {
        const vbW = parseFloat(parts[2]);
        const vbH = parseFloat(parts[3]);
        if (!width || isNaN(width)) width = vbW;
        if (!height || isNaN(height)) height = vbH;
      }
    }

    if (!width || !height || isNaN(width) || isNaN(height)) {
      width = 1000;
      height = 1000;
    }

    return { width, height };
  };

  // ──────────────────────────────
  // încarcă SVG-urile, calculează dimensiuni + poziții inițiale
  // ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [t1, t2] = await Promise.all([
          fetch(svg1Url).then((r) => r.text()),
          fetch(svg2Url).then((r) => r.text()),
        ]);

        const info1 = parseSvgInfo(t1);
        const info2 = parseSvgInfo(t2);

        setBaseSize({ width: info1.width, height: info1.height });
        setMovingSize({ width: info2.width, height: info2.height });

        // camera1 în centru: center = (2000, 2000)
        const baseX = WORLD_SIZE / 2 - info1.width / 2;
        const baseY = WORLD_SIZE / 2 - info1.height / 2;
        setBasePos({ x: baseX, y: baseY });

        // camera2 inițial tot în centru (poți schimba offset-ul dacă vrei)
        const posInit = {
          x: WORLD_SIZE / 2 - info2.width / 2,
          y: WORLD_SIZE / 2 - info2.height / 2,
        };
        setPos(posInit);
      } catch (err) {
        console.error("Eroare la încărcarea SVG-urilor:", err);
      }
    };

    load();
  }, []);

  // centrează scroll-ul pe mijlocul lumii
  useEffect(() => {
    if (wrapperRef.current) {
      const viewW = wrapperRef.current.clientWidth;
      const viewH = wrapperRef.current.clientHeight;
      wrapperRef.current.scrollLeft = Math.max(
        0,
        (WORLD_SIZE - viewW) / 2
      );
      wrapperRef.current.scrollTop = Math.max(
        0,
        (WORLD_SIZE - viewH) / 2
      );
    }
  }, []);

  // ──────────────────────────────
  // ZOOM – scalează contururile
  // ──────────────────────────────
  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.25, z - 0.25));
  const handleZoomReset = () => setZoom(1);

  // ──────────────────────────────
  // DRAG (în coordonate lume, ține cont de zoom)
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
  // SUBMIT – log coordonate centre
  // ──────────────────────────────
  const handleSubmit = () => {
    // Centrul camerei 1
    const center1 = {
      x: basePos.x + baseSize.width / 2,
      y: basePos.y + baseSize.height / 2,
    };

    // Centrul camerei 2 (în poziția curentă)
    const center2 = {
      x: pos.x + movingSize.width / 2,
      y: pos.y + movingSize.height / 2,
    };

    const delta = {
      dx: center2.x - center1.x,
      dy: center2.y - center1.y,
    };

    console.log("=== COORDONATE CENTRE ===");
    console.log("Camera 1 center:", center1);
    console.log("Camera 2 center:", center2);
    console.log("Delta (cam2 - cam1):", delta);

    alert("Coordonatele centrelor au fost afișate în consolă.");
  };

  // ──────────────────────────────

  return (
    <div className="config2d-container">
      <h1 className="config2d-title">Configurare 2D – Lipire SVG-uri</h1>

      <p className="config2d-subtitle">
        Fundal 4000×4000. Camera 1 este fixă în centru (2000, 2000). Mută
        camera 2, apoi apasă Submit pentru a vedea coordonatele centrelor.
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

        <button
          className="btn primary submit-btn-top"
          onClick={handleSubmit}
          style={{ marginLeft: "2rem" }}
        >
          Submit – Log centre
        </button>
      </div>

      <div className="canvas-scroll" ref={wrapperRef}>
        <svg
          ref={svgRef}
          width={WORLD_SIZE}
          height={WORLD_SIZE}
          style={{ background: "white" }}
        >
          <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="white" />

          <g transform={`scale(${zoom})`}>
            {/* Camera 1 fixă, centrată în (2000,2000) */}
            <g transform={`translate(${basePos.x}, ${basePos.y})`}>
              <image href={svg1Url} x="0" y="0" />
            </g>

            {/* Camera 2 mutabilă */}
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
    </div>
  );
};

export default Configurare2D;
