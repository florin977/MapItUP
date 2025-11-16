// ==============================================
// ChooseFloorPage.tsx - VERSION FINAL FUNCTIONAL
// ==============================================

import React, { useState, useRef } from "react";

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

// ================== CONSTANTE CANVAS ==================
const CANVAS_SIZE = 10000;
const SVG_RENDER_SIZE = 1000;
const DRAG_SENSITIVITY = 4;
const EXPORT_PADDING = 50;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const HANDLE_SIZE = 80;
const RESIZE_SENSITIVITY = 2;

// pentru backend – poți schimba cu env
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

const ChooseFloorPage: React.FC<ChooseFloorPageProps> = ({
  onBack,
  onSaveChanges,
}) => {
  const [floorName, setFloorName] = useState("");
  const [floorNumber, setFloorNumber] = useState<number>(0);
  const [lazFile, setLazFile] = useState<File | null>(null);

  // ⬅️ NOU: SVG upload state
  const [camera1SVG, setCamera1SVG] = useState<string | null>(null);
  const [camera2SVG, setCamera2SVG] = useState<string | null>(null);

  const [zoom, setZoom] = useState(3);

  const [movablePos, setMovablePos] = useState<{ x: number; y: number }>({
    x: (CANVAS_SIZE - SVG_RENDER_SIZE) / 2,
    y: (CANVAS_SIZE - SVG_RENDER_SIZE) / 2,
  });

  const [movableScale, setMovableScale] = useState(1);

  const movableWidth = SVG_RENDER_SIZE * movableScale;
  const movableHeight = SVG_RENDER_SIZE * movableScale;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const svgContainerRef = useRef<SVGSVGElement | null>(null);

  // ================== HANDLER UPLOAD SVG ==================

  const handleUploadCameraSVG = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFn: (svg: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setFn(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ================== HANDLERE FORM ==================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!lazFile) {
      setErrorMsg("Te rog selectează un fișier .laz.");
      return;
    }

    try {
      setIsSaving(true);

      const formData = new FormData();
      formData.append("floorName", floorName);
      formData.append("floorNumber", floorNumber.toString());
      formData.append("lazFile", lazFile);
      formData.append("offsetX", movablePos.x.toString());
      formData.append("offsetY", movablePos.y.toString());
      formData.append("zoom", zoom.toString());

      const res = await fetch(`${API_BASE_URL}/upload-floor`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.msg || "Eroare la upload.");
      } else {
        setSuccessMsg("Floor salvat cu succes!");
        onSaveChanges({
          floorName,
          floorNumber,
          lazFile,
          movableOffset: { x: movablePos.x, y: movablePos.y },
          zoom,
        });
      }
    } catch (err) {
      console.error("Error uploading floor:", err);
      setErrorMsg("Eroare neașteptată la salvare.");
    } finally {
      setIsSaving(false);
    }
  };

  // ================== EXPORT FINAL SVG ==================
  const encodeSvgToBase64 = (svgText: string) => {
    return window.btoa(unescape(encodeURIComponent(svgText)));
  };

  const handleFinish = async () => {
    if (!camera1SVG || !camera2SVG) {
      alert("Te rog încarcă ambele SVG-uri înainte de export.");
      return;
    }

    try {
      setIsExporting(true);

      // Convertim base64 → text SVG
      const svg1Text = atob(camera1SVG.split(",")[1]);
      const svg2Text = atob(camera2SVG.split(",")[1]);

      const svg1Base64 = encodeSvgToBase64(svg1Text);
      const svg2Base64 = encodeSvgToBase64(svg2Text);

      const href1 = `data:image/svg+xml;base64,${svg1Base64}`;
      const href2 = `data:image/svg+xml;base64,${svg2Base64}`;

      const fixedX = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;
      const fixedY = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;

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

      minX = Math.max(0, minX - EXPORT_PADDING);
      minY = Math.max(0, minY - EXPORT_PADDING);
      maxX = Math.min(CANVAS_SIZE, maxX + EXPORT_PADDING);
      maxY = Math.min(CANVAS_SIZE, maxY + EXPORT_PADDING);

      const croppedWidth = maxX - minX;
      const croppedHeight = maxY - minY;

      const exportFixedX = fixedX - minX;
      const exportFixedY = fixedY - minY;
      const exportMovableX = movablePos.x - minX;
      const exportMovableY = movablePos.y - minY;

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

  // ================== DRAG & RESIZE ==================
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
      const deltaPixels = (dxPixels + dyPixels) / 2;
      const deltaLogical = (deltaPixels / zoom) * RESIZE_SENSITIVITY;

      let newWidth = startWidth + deltaLogical;
      let newScale = newWidth / SVG_RENDER_SIZE;

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

  // ================== ZOOM ==================
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.1));

  // ================== RENDER ==================
  const fixedX = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;
  const fixedY = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-slate-900 via-slate-800 to-black p-10 gap-8">

      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 tracking-tight">
        Floor Configuration
      </h1>

      <form
        onSubmit={handleSave}
        className="bg-slate-900/50 p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-700 space-y-6"
      >
        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">Floor Name</label>
          <input
            type="text"
            required
            value={floorName}
            onChange={(e) => setFloorName(e.target.value)}
            className="px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">Floor Number</label>
          <input
            type="number"
            required
            value={floorNumber}
            onChange={(e) => setFloorNumber(Number(e.target.value))}
            className="px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">Upload .laz File</label>
          <input
            type="file"
            accept=".laz"
            required
            onChange={(e) => setLazFile(e.target.files?.[0] || null)}
            className="cursor-pointer bg-slate-800 text-white rounded-xl p-3 border border-slate-700"
          />
        </div>

        {/* NOU - UPLOAD CAMERA1 */}
        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">Upload Camera 1 SVG</label>
          <input
            type="file"
            accept=".svg"
            required
            onChange={(e) => handleUploadCameraSVG(e, setCamera1SVG)}
            className="cursor-pointer bg-slate-800 text-white rounded-xl p-3 border border-slate-700"
          />
        </div>

        {/* NOU - UPLOAD CAMERA2 */}
        <div className="flex flex-col">
          <label className="text-slate-300 font-semibold mb-2">Upload Camera 2 SVG</label>
          <input
            type="file"
            accept=".svg"
            required
            onChange={(e) => handleUploadCameraSVG(e, setCamera2SVG)}
            className="cursor-pointer bg-slate-800 text-white rounded-xl p-3 border border-slate-700"
          />
        </div>

        {errorMsg && <p className="text-sm text-red-400 font-medium">{errorMsg}</p>}
        {successMsg && <p className="text-sm text-emerald-400 font-medium">{successMsg}</p>}

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-bold text-lg"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={isExporting}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-lg"
          >
            {isExporting ? "Exporting..." : "FINISH"}
          </button>
        </div>
      </form>

      <div className="w-full max-w-5xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <button onClick={handleZoomOut} className="px-3 py-1 bg-slate-800 text-white rounded-lg">-</button>
            <span className="text-slate-200">Zoom: {(zoom * 100).toFixed(0)}%</span>
            <button onClick={handleZoomIn} className="px-3 py-1 bg-slate-800 text-white rounded-lg">+</button>
          </div>
        </div>

        <div className="w-full aspect-square bg-white rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center">
          <svg
            ref={svgContainerRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            style={{
              cursor: isDragging || isResizing ? "grabbing" : "default",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fill="white" />

            {/* CAM1 */}
            {camera1SVG && (
              <image
                href={camera1SVG}
                x={fixedX}
                y={fixedY}
                width={SVG_RENDER_SIZE}
                height={SVG_RENDER_SIZE}
                opacity={0.9}
              />
            )}

            {/* CAM2 */}
            {camera2SVG && (
              <image
                href={camera2SVG}
                x={movablePos.x}
                y={movablePos.y}
                width={movableWidth}
                height={movableHeight}
                style={{ cursor: "grab" }}
                opacity={0.8}
                onMouseDown={handleMovableMouseDown}
              />
            )}

            {/* HANDLE */}
            <rect
              x={movablePos.x + movableWidth - HANDLE_SIZE}
              y={movablePos.y + movableHeight - HANDLE_SIZE}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
              fill="transparent"
              style={{ cursor: "se-resize" }}
              onMouseDown={handleResizeMouseDown}
            />
          </svg>
        </div>
      </div>

      <button onClick={onBack} className="mt-4 px-6 py-3 rounded-xl bg-slate-800 text-white">
        ← Back to Admin
      </button>
    </div>
  );
};

export default ChooseFloorPage;
