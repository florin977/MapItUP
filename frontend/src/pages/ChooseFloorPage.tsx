import React, { useState, useRef } from "react";

const API_BASE = "http://localhost:3000";

type ChooseFloorPageProps = {
  onBack: () => void;
  // îl facem opțional ca să nu mai crape dacă nu e trimis din părinte
  onSaveChanges?: (data: {
    floorName: string;
    floorNumber: number;
    lazFile: File | null;
    movableOffset: { x: number; y: number };
    zoom: number;
  }) => void;
};

const CANVAS_SIZE = 10000;
const SVG_RENDER_SIZE = 1000;
const DRAG_SENSITIVITY = 4;
const EXPORT_PADDING = 50;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const HANDLE_SIZE = 80;
const RESIZE_SENSITIVITY = 2;

const ChooseFloorPage: React.FC<ChooseFloorPageProps> = ({
  onBack,
  onSaveChanges,
}) => {
  const [floorName, setFloorName] = useState("");
  const [floorNumber, setFloorNumber] = useState<number>(0);
  const [lazFile, setLazFile] = useState<File | null>(null);

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

  // SVG-uri din backend
  const [floorSvgText, setFloorSvgText] = useState<string | null>(null);
  const [roomSvgText, setRoomSvgText] = useState<string | null>(null);
  const [floorSvgDataUrl, setFloorSvgDataUrl] = useState<string | null>(null);
  const [roomSvgDataUrl, setRoomSvgDataUrl] = useState<string | null>(null);

  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const svgContainerRef = useRef<SVGSVGElement | null>(null);

  const fixedX = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;
  const fixedY = (CANVAS_SIZE - SVG_RENDER_SIZE) / 2;

  const encodeSvgToBase64 = (svgText: string) =>
    window.btoa(unescape(encodeURIComponent(svgText)));

  const svgTextToDataUrl = (svgText: string) =>
    `data:image/svg+xml;base64,${encodeSvgToBase64(svgText)}`;

  // ======================
  // SAVE (fetch floor + procesare LAZ)
  // ======================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Save clicked", { floorName, floorNumber, lazFile });

    // 1) floor SVG din backend (sau default)
    try {
      const resp = await fetch(`${API_BASE}/floors/${floorNumber}`);
      console.log("GET /floors status:", resp.status);

      if (!resp.ok) {
        const text = await resp.text();
        console.error("GET /floors error body:", text);
      } else {
        const data = await resp.json();
        console.log("GET /floors data:", data);

        if (data.svg) {
          setFloorSvgText(data.svg);
          setFloorSvgDataUrl(svgTextToDataUrl(data.svg));
        }
      }
    } catch (err) {
      console.error("Error fetching floor:", err);
    }

    // 2) procesare .laz -> SVG prin Python
    if (lazFile) {
      try {
        const formData = new FormData();
        formData.append("lazFile", lazFile);

        const resp = await fetch(`${API_BASE}/process-laz`, {
          method: "POST",
          body: formData,
        });

        console.log("POST /process-laz status:", resp.status);

        if (!resp.ok) {
          const text = await resp.text();
          console.error("POST /process-laz error body:", text);
        } else {
          const data = await resp.json();
          console.log("POST /process-laz data:", data);

          if (data.svg) {
            setRoomSvgText(data.svg);
            setRoomSvgDataUrl(svgTextToDataUrl(data.svg));
          }
        }
      } catch (err) {
        console.error("Error processing LAZ:", err);
      }
    }

    // notificăm părintele doar dacă a dat handler
    onSaveChanges?.({
      floorName,
      floorNumber,
      lazFile,
      movableOffset: { x: movablePos.x, y: movablePos.y },
      zoom,
    });
  };

  // ======================
  // ZOOM
  // ======================
  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.1, 5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.1, 0.1));
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

  // ======================
  // DRAG + RESIZE
  // ======================
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

  // ======================
  // FINISH (combină SVG + salvează în DB)
  // ======================
  const handleFinish = async () => {
    if (!floorSvgText || !roomSvgText) {
      console.error("Nu am ambele SVG-uri (floor + room) pentru export.");
      return;
    }

    try {
      setIsExporting(true);

      const href1 = svgTextToDataUrl(floorSvgText);
      const href2 = svgTextToDataUrl(roomSvgText);

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

      // trimitem SVG-ul combinat la backend
      try {
        const resp = await fetch(`${API_BASE}/floors/${floorNumber}/svg`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: floorName || `Floor ${floorNumber}`,
            svg: exportSvg,
          }),
        });
        console.log("POST /floors SVG status:", resp.status);

        if (!resp.ok) {
          const text = await resp.text();
          console.error("POST /floors SVG error body:", text);
        } else {
          const data = await resp.json();
          console.log("POST /floors SVG data:", data);
        }
      } catch (err) {
        console.error("Error saving floor SVG:", err);
      }

      // optional: download local
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

  // ======================
  // RENDER
  // ======================
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-slate-900 via-slate-800 to-black p-10 gap-8">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 tracking-tight">
        Floor Configuration
      </h1>

      <form
        onSubmit={handleSave}
        className="bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-700 space-y-6"
      >
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

      <div className="w-full max-w-5xl flex flex-col gap-4">
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
            <rect
              x={0}
              y={0}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              fill="white"
            />

            {floorSvgDataUrl && (
              <image
                href={floorSvgDataUrl}
                x={fixedX}
                y={fixedY}
                width={SVG_RENDER_SIZE}
                height={SVG_RENDER_SIZE}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.9}
              />
            )}

            {roomSvgDataUrl && (
              <image
                href={roomSvgDataUrl}
                x={movablePos.x}
                y={movablePos.y}
                width={movableWidth}
                height={movableHeight}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.8}
                style={{ cursor: "grab" }}
                onMouseDown={handleMovableMouseDown}
              />
            )}

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
