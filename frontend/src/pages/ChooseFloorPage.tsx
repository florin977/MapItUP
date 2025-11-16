import React, { useState, useRef } from "react";
import camera1Outline from "../assets/camera1_alin_buna_outline.svg";
import camera2Outline from "../assets/camera2_alin_buna_outline.svg";

type ChooseFloorPageProps = {
  onBack: () => void;
  onSaveChanges: (data: {
    floorName: string;
    floorNumber: number;
    lazFile: File | null;
    movableOffset: { x: number; y: number };
    zoom: number;
  }) => void;
};

const CANVAS_SIZE = 10000;      // “lumea” albă logică
const SVG_RENDER_SIZE = 1000;   // baza pentru dimensiune
const DRAG_SENSITIVITY = 4;     // 1 = normal, >1 = mai rapid
const EXPORT_PADDING = 50;      // spațiu mic în jur la export
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const HANDLE_SIZE = 80;         // dimensiune handle în coordonate canvas
const RESIZE_SENSITIVITY = 2;   // >1 = mai sensibil la resize

const ChooseFloorPage: React.FC<ChooseFloorPageProps> = ({
  onBack,
  onSaveChanges,
}) => {
  const [floorName, setFloorName] = useState("");
  const [floorNumber, setFloorNumber] = useState<number>(0);
  const [lazFile, setLazFile] = useState<File | null>(null);

  // zoom inițial 300% (3.0), maxim 500% (5.0)
  const [zoom, setZoom] = useState(3);

  // poziția camerei mobile
  const [movablePos, setMovablePos] = useState<{ x: number; y: number }>({
    x: (CANVAS_SIZE - SVG_RENDER_SIZE) / 2,
    y: (CANVAS_SIZE - SVG_RENDER_SIZE) / 2,
  });

  // scale pentru camera mobilă
  const [movableScale, setMovableScale] = useState(1);

  const movableWidth = SVG_RENDER_SIZE * movableScale;
  const movableHeight = SVG_RENDER_SIZE * movableScale;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const svgContainerRef = useRef<SVGSVGElement | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveChanges({
      floorName,
      floorNumber,
      lazFile,
      movableOffset: { x: movablePos.x, y: movablePos.y },
      zoom,
    });
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.1, 5)); // max 500%
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.1, 0.1)); // min 10%
  };

  const handleWheelZoom: React.WheelEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;

    setZoom((z) => {
      let nz = z + delta;
      if (nz < 0.1) nz = 0.1;
      if (nz > 5) nz = 5;
      return nz;
    });
  };

  const handleMovableMouseDown: React.MouseEventHandler<SVGImageElement> = (
    e
  ) => {
    e.preventDefault();
    setIsResizing(false);
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeMouseDown: React.MouseEventHandler<SVGRectElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startWidth: movableWidth,
      startHeight: movableHeight,
    };
  };

  const handleMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    // RESIZE
    if (isResizing && resizeStartRef.current) {
      const { mouseX, mouseY, startWidth } = resizeStartRef.current;

      const dxPixels = e.clientX - mouseX;
      const dyPixels = e.clientY - mouseY;

      // folosim diagonala ca să fie natural
      const deltaPixels = (dxPixels + dyPixels) / 2;
      // mărim sensibilitatea la resize
      const deltaLogical = (deltaPixels / zoom) * RESIZE_SENSITIVITY;

      let newWidth = startWidth + deltaLogical;
      let newScale = newWidth / SVG_RENDER_SIZE;

      // limite de scalare și să nu iasă din canvas
      const maxScaleX = (CANVAS_SIZE - movablePos.x) / SVG_RENDER_SIZE;
      const maxScaleY = (CANVAS_SIZE - movablePos.y) / SVG_RENDER_SIZE;
      const maxAllowedScale = Math.min(maxScaleX, maxScaleY, MAX_SCALE);

      if (newScale < MIN_SCALE) newScale = MIN_SCALE;
      if (newScale > maxAllowedScale) newScale = maxAllowedScale;

      setMovableScale(newScale);
      return;
    }

    // DRAG
    if (!isDragging || !lastMousePos.current) return;

    const dxPixels = e.clientX - lastMousePos.current.x;
    const dyPixels = e.clientY - lastMousePos.current.y;

    const dxLogical = (dxPixels / zoom) * DRAG_SENSITIVITY;
    const dyLogical = (dyPixels / zoom) * DRAG_SENSITIVITY;

    setMovablePos((prev) => {
      let newX = prev.x + dxLogical;
      let newY = prev.y + dyLogical;

      const maxX = CANVAS_SIZE - movableWidth;
      const maxY = CANVAS_SIZE - movableHeight;

      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX > maxX) newX = maxX;
      if (newY > maxY) newY = maxY;

      return { x: newX, y: newY };
    });

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave: React.MouseEventHandler<SVGSVGElement> = () => {
    setIsDragging(false);
    setIsResizing(false);
    lastMousePos.current = null;
    resizeStartRef.current = null;
  };

  // SVG-ul fix este centrat (și nu se scalează)
  const fixedX = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;
  const fixedY = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;

  // helper pt. btoa + unicode safe
  const encodeSvgToBase64 = (svgText: string) => {
    return window.btoa(unescape(encodeURIComponent(svgText)));
  };

  const handleFinish = async () => {
    try {
      setIsExporting(true);

      // 1) Luăm conținutul SVG-urilor originale din assets
      const [svg1Text, svg2Text] = await Promise.all([
        fetch(camera1Outline).then((r) => r.text()),
        fetch(camera2Outline).then((r) => r.text()),
      ]);

      const svg1Base64 = encodeSvgToBase64(svg1Text);
      const svg2Base64 = encodeSvgToBase64(svg2Text);

      const href1 = `data:image/svg+xml;base64,${svg1Base64}`;
      const href2 = `data:image/svg+xml;base64,${svg2Base64}`;

      // 2) Calculăm bounding box comun + padding
      const cam1MinX = fixedX;
      const cam1MinY = fixedY;
      const cam1MaxX = fixedX + SVG_RENDER_SIZE;
      const cam1MaxY = fixedY + SVG_RENDER_SIZE;

      const cam2MinX = movablePos.x;
      const cam2MinY = movablePos.y;
      const cam2MaxX = movablePos.x + movableWidth;
      const cam2MaxY = movablePos.y + movableHeight;

      let minX = Math.min(cam1MinX, cam2MinX);
      let minY = Math.min(cam1MinY, cam2MinY);
      let maxX = Math.max(cam1MaxX, cam2MaxX);
      let maxY = Math.max(cam1MaxY, cam2MaxY);

      // padding
      minX = Math.max(0, minX - EXPORT_PADDING);
      minY = Math.max(0, minY - EXPORT_PADDING);
      maxX = Math.min(CANVAS_SIZE, maxX + EXPORT_PADDING);
      maxY = Math.min(CANVAS_SIZE, maxY + EXPORT_PADDING);

      const croppedWidth = maxX - minX;
      const croppedHeight = maxY - minY;

      // repoziționăm imaginile în noul sistem
      const exportFixedX = fixedX - minX;
      const exportFixedY = fixedY - minY;
      const exportMovableX = movablePos.x - minX;
      const exportMovableY = movablePos.y - minY;

      // 3) Construim SVG-ul exportat tăiat la fix (cu scale la camera2)
      const exportSvg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${croppedWidth}"
     height="${croppedHeight}"
     viewBox="0 0 ${croppedWidth} ${croppedHeight}">
  <rect x="0" y="0" width="${croppedWidth}" height="${croppedHeight}" fill="white" />
  <image href="${href1}"
         x="${exportFixedX}" y="${exportFixedY}"
         width="${SVG_RENDER_SIZE}" height="${SVG_RENDER_SIZE}"
         preserveAspectRatio="xMidYMid meet" />
  <image href="${href2}"
         x="${exportMovableX}" y="${exportMovableY}"
         width="${movableWidth}" height="${movableHeight}"
         preserveAspectRatio="xMidYMid meet" />
</svg>`.trim();

      const blob = new Blob([exportSvg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const baseName = floorName.trim() || "floor";
      a.href = url;
      a.download = `${baseName}_combined_cropped.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting combined SVG:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-slate-900 via-slate-800 to-black p-10 gap-8">

      {/* TITLU */}
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 tracking-tight">
        Floor Configuration
      </h1>

      {/* FORMULAR SUS */}
      <form
        onSubmit={handleSave}
        className="bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-700 space-y-6"
      >
        {/* Floor Name */}
        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">
            Floor Name
          </label>
          <input
            type="text"
            required
            value={floorName}
            onChange={(e) => setFloorName(e.target.value)}
            placeholder="Ex: C119, A101..."
            className="px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>

        {/* Floor Number */}
        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">
            Floor Number
          </label>
          <input
            type="number"
            required
            value={floorNumber}
            onChange={(e) => setFloorNumber(Number(e.target.value))}
            placeholder="Ex: 0, 1, 2, -1"
            className="px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:ring-2 focus:ring-fuchsia-500 outline-none"
          />
        </div>

        {/* LAZ file */}
        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">
            Upload .laz File
          </label>
          <input
            type="file"
            accept=".laz"
            required
            onChange={(e) => setLazFile(e.target.files?.[0] || null)}
            className="cursor-pointer bg-slate-800 text-white rounded-xl p-3 border border-slate-700"
          />
        </div>

        {/* SAVE + FINISH BUTTONS */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl text-white font-bold text-lg hover:scale-[1.02] transition shadow-xl"
          >
            Save Changes
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={isExporting}
            className={`flex-1 py-3 rounded-xl font-bold text-lg transition shadow-xl ${
              isExporting
                ? "bg-slate-700 text-slate-400 cursor-wait"
                : "bg-emerald-500 text-white hover:scale-[1.02]"
            }`}
          >
            {isExporting ? "Exporting..." : "FINISH"}
          </button>
        </div>
      </form>

      {/* CANVAS CU FUNDAL ALB + SVG-URI */}
      <div className="w-full max-w-5xl flex flex-col gap-4">
        {/* Controale zoom */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm shadow hover:bg-slate-700"
            >
              -
            </button>
            <span className="text-slate-200 text-sm">
              Zoom: {(zoom * 100).toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm shadow hover:bg-slate-700"
            >
              +
            </button>
          </div>
        </div>

        {/* Zona albă cu SVG-uri */}
        <div className="w-full aspect-square bg-white rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center">
          <svg
            ref={svgContainerRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheelZoom}
            style={{
              cursor: isDragging || isResizing ? "grabbing" : "default",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {/* fundal alb logic */}
            <rect
              x={0}
              y={0}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              fill="white"
            />

            {/* SVG FIX – centrat */}
            <image
              href={camera1Outline}
              x={fixedX}
              y={fixedY}
              width={SVG_RENDER_SIZE}
              height={SVG_RENDER_SIZE}
              preserveAspectRatio="xMidYMid meet"
              opacity={0.9}
            />

            {/* SVG MOBIL – mutabil cu drag & resize */}
            <image
              href={camera2Outline}
              x={movablePos.x}
              y={movablePos.y}
              width={movableWidth}
              height={movableHeight}
              preserveAspectRatio="xMidYMid meet"
              opacity={0.8}
              style={{ cursor: "grab" }}
              onMouseDown={handleMovableMouseDown}
            />

            {/* HANDLE DE RESIZE – colț dreapta-jos al camerei mobile (invizibil) */}
            <rect
              x={movablePos.x + movableWidth - HANDLE_SIZE}
              y={movablePos.y + movableHeight - HANDLE_SIZE}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
              fill="transparent"
              stroke="transparent"
              strokeWidth={0}
              style={{ cursor: "se-resize" }}
              onMouseDown={handleResizeMouseDown}
            />
          </svg>
        </div>
      </div>

      {/* BACK BUTTON */}
      <button
        onClick={onBack}
        className="mt-4 px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold text-lg shadow-lg hover:bg-slate-700 transition"
      >
        ← Back to Admin
      </button>
    </div>
  );
};

export default ChooseFloorPage;
