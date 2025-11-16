// frontend/src/pages/BuildingsSection.tsx
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import { OrbitControls } from "three-stdlib";

// ================== TYPES ==================

interface RoomEntrance {
  x: number;
  y: number;
  dir: { x: number; y: number };
}

interface TransformData {
  cell_size: number;
  cellSize?: number;
  grid_shape: { rows: number; cols: number };
  grid_world_origin: { x0: number; y0: number; z_floor: number };
  center_offset: { x: number; y: number; z: number };
  grid_origin_centered: boolean;
  note: string;
  gridToWorld: (i: number, j: number) => { x: number; y: number; z: number };
}

interface ComputedWorld {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

interface RoomMetadata {
  name: string;
  grid: number[][];
  transform: TransformData;
  entrances: Record<string, RoomEntrance>;
  modelData?: ArrayBuffer;
  floor?: number;
  adjacent?: string[];
  _computedWorld?: ComputedWorld;
  _computedEntrances?: Record<string, { x: number; y: number; z: number }>;
  worldPosition?: { x: number; y: number; z: number };
  worldRotation?: { x: number; y: number; z: number; w: number };
  computedEntrances?: Record<string, { x: number; y: number; z: number }>;
}

// ============== Helpers ================
function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  return dpr;
}

async function loadGLBFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  return new Promise<THREE.Object3D>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(
      arrayBuffer,
      "",
      (gltf) => resolve(gltf.scene),
      (err) => reject(err)
    );
  });
}

// ============== GridCanvas Component ================
function GridCanvas({
  gridData,
  transformData,
  currentEntrances,
  onCellPick,
}: {
  gridData: number[][];
  transformData: TransformData | null;
  currentEntrances: Record<string, RoomEntrance>;
  onCellPick?: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(
    null
  );
  const cellShrinkFactor = 0.3;
  const basePixelPerCellFor05 = 40; // CSS px for cell when cell_size === 0.05

  // redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !gridData?.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rows = gridData.length;
    const cols = gridData[0].length;

    // compute cell size in CSS pixels from world cell size
    const cellWorld = transformData?.cell_size ?? 0.05;
    const cellSizeCss = Math.max(6, (cellWorld / 0.05) * basePixelPerCellFor05 * cellShrinkFactor);

    // size the canvas' CSS size so it can scroll if large
    if (container) {
      // set CSS size on canvas element
      canvas.style.width = `${cols * cellSizeCss}px`;
      canvas.style.height = `${rows * cellSizeCss}px`;
    }

    const dpr = resizeCanvasToDisplaySize(canvas);

    // draw using CSS pixels; scale by dpr so 1 unit in transform = 1 CSS px
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, (canvas.width / dpr) || 1, (canvas.height / dpr) || 1);

    // draw cells
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = gridData[y][x] === 0 ? "#0b1220" : "#1b1b1b";
        ctx.fillRect(x * cellSizeCss, y * cellSizeCss, cellSizeCss, cellSizeCss);
      }
    }

    // entrances
    ctx.lineJoin = "round";
    Object.entries(currentEntrances || {}).forEach(([k, ent]) => {
      if (!ent) return;
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(ent.x * cellSizeCss, ent.y * cellSizeCss, cellSizeCss, cellSizeCss);

      const cx = ent.x * cellSizeCss + cellSizeCss / 2;
      const cy = ent.y * cellSizeCss + cellSizeCss / 2;
      const len = cellSizeCss * 0.35;
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = Math.max(1, cellSizeCss * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ent.dir.x * len, cy + ent.dir.y * len);
      ctx.stroke();

      // arrow head
      const angle = Math.atan2(ent.dir.y, ent.dir.x);
      ctx.beginPath();
      ctx.moveTo(cx + ent.dir.x * len, cy + ent.dir.y * len);
      ctx.lineTo(cx + ent.dir.x * len - 6 * Math.cos(angle - Math.PI / 6), cy + ent.dir.y * len - 6 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(cx + ent.dir.x * len - 6 * Math.cos(angle + Math.PI / 6), cy + ent.dir.y * len - 6 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    });

    // selection highlight
    if (selected) {
      ctx.strokeStyle = "#55aaff";
      ctx.lineWidth = Math.max(2, cellSizeCss * 0.08);
      ctx.strokeRect(selected.x * cellSizeCss + 1, selected.y * cellSizeCss + 1, cellSizeCss - 2, cellSizeCss - 2);
    }

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;

    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSizeCss + 0.5);
      ctx.lineTo(cols * cellSizeCss, y * cellSizeCss + 0.5);
      ctx.stroke();
    }
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSizeCss + 0.5, 0);
      ctx.lineTo(x * cellSizeCss + 0.5, rows * cellSizeCss);
      ctx.stroke();
    }
  }, [gridData, transformData, currentEntrances, selected]);

  // click handler
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !gridData?.length) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const cellWorld = transformData?.cell_size ?? 0.05;
    const cellSizeCss = Math.max(6, (cellWorld / 0.05) * basePixelPerCellFor05 * cellShrinkFactor);

    const x = Math.floor(((e.clientX - rect.left) * dpr) / (cellSizeCss * dpr));
    const y = Math.floor(((e.clientY - rect.top) * dpr) / (cellSizeCss * dpr));

    if (x >= 0 && y >= 0 && y < gridData.length && x < (gridData[0]?.length || 0)) {
      setSelected({ x, y });
      onCellPick && onCellPick(x, y);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "600px",
        overflow: "auto",
        border: "1px solid #333",
        background: "#050505",
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ display: "block" }}
      />
    </div>
  );
}

// ============== Main Component ================
const BuildingsSection: React.FC = () => {
  // 3D refs
  const modelContainer = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const currentModelObjectsRef = useRef<THREE.Object3D[]>([]);
  const mainRoomNameRef = useRef<string | null>(null);

  // View toggle
  const [view3D, setView3D] = useState(false);

  // Metadata state (array of rooms)
  const [metadata, setMetadata] = useState<RoomMetadata[]>([]);
  const [name, setName] = useState("");
  const [floor, setFloor] = useState(0);
  const [adjacent, setAdjacent] = useState("");
  const [gridData, setGridData] = useState<number[][]>([]);
  const [transformData, setTransformData] = useState<TransformData | null>(null);
  const [glbArrayBuffer, setGlbArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [currentEntrances, setCurrentEntrances] = useState<Record<string, RoomEntrance>>({});

  // Arrow picker
  const [showArrowPopup, setShowArrowPopup] = useState(false);
  const [tempEntrance, setTempEntrance] = useState<{ x: number; y: number } | null>(null);
  const [selectedDir, setSelectedDir] = useState<{ x: number; y: number }>({ x: 0, y: -1 });

  // Canvas refs for arrow preview
  const arrowCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // -------------------------
  // 2D: load .laz result JSON
  // -------------------------
  const handleLoadLaz = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("lazFile", file);

    try {
      const response = await fetch("http://localhost:3000/process-laz", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const parsed: any = await response.json();
      if (parsed.grid && parsed.transform) {
        setGridData(parsed.grid);
        setTransformData(parsed.transform as TransformData);
      } else if (parsed.grid) {
        setGridData(parsed.grid);
      } else {
        alert("Backend did not return valid grid/transform JSON.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process .laz file. Make sure backend script is running and returns valid JSON.");
    }
  };

  // -------------------------
  // 2D: load .glb file
  // -------------------------
  const handleLoadGlb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ab = await file.arrayBuffer();
    setGlbArrayBuffer(ab);
  };

  // -------------------------
  // Grid cell clicked
  // -------------------------
  const handleCellPick = (x: number, y: number) => {
    // open arrow picker
    const adjList = adjacent.split(";").map((s) => s.trim()).filter(Boolean);
    if (adjList.length === 0) {
      alert("Please enter adjacent room names before marking an entrance.");
      return;
    }
    setTempEntrance({ x, y });
    setSelectedDir({ x: 0, y: -1 });
    setShowArrowPopup(true);
  };

  // -------------------------
  // Arrow preview canvas
  // -------------------------
  useEffect(() => {
    const canvas = arrowCanvasRef.current;
    if (!canvas || !showArrowPopup) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#0ea5e9";
      ctx.fillStyle = "#0ea5e9";
      ctx.lineWidth = 3;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + selectedDir.x * 40, cy + selectedDir.y * 40);
      ctx.stroke();

      const angle = Math.atan2(selectedDir.y, selectedDir.x);
      ctx.beginPath();
      ctx.moveTo(cx + selectedDir.x * 40, cy + selectedDir.y * 40);
      ctx.lineTo(
        cx + selectedDir.x * 40 - 8 * Math.cos(angle - Math.PI / 6),
        cy + selectedDir.y * 40 - 8 * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        cx + selectedDir.x * 40 - 8 * Math.cos(angle + Math.PI / 6),
        cy + selectedDir.y * 40 - 8 * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    };
    draw();
  }, [selectedDir, showArrowPopup]);

  useEffect(() => {
    const canvas = arrowCanvasRef.current;
    if (!canvas || !showArrowPopup) return;
    const handler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - rect.left - canvas.width / 2;
      const dy = e.clientY - rect.top - canvas.height / 2;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      setSelectedDir({ x: dx / len, y: dy / len });
    };
    canvas.addEventListener("mousemove", handler);
    return () => canvas.removeEventListener("mousemove", handler);
  }, [showArrowPopup]);

  const handleArrowSave = () => {
    if (!tempEntrance) return;
    const adjList = adjacent.split(";").map((s) => s.trim()).filter(Boolean);
    const adjName = prompt(`Which adjacent room does this entrance lead to?
Options: ${adjList.join(", ")}`);
    if (!adjName || !adjList.includes(adjName)) {
      alert("Invalid adjacent room name.");
      return;
    }
    setCurrentEntrances((prev) => ({
      ...prev,
      [adjName]: {
        x: tempEntrance.x,
        y: tempEntrance.y,
        dir: { x: Number(selectedDir.x), y: Number(selectedDir.y) },
      },
    }));
    setShowArrowPopup(false);
    setTempEntrance(null);
  };

  const handleArrowCancel = () => {
    setShowArrowPopup(false);
    setTempEntrance(null);
  };

  // -------------------------
  // Three.js init
  // -------------------------
  useEffect(() => {
    const container = modelContainer.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(3, 3, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    let renderer = rendererRef.current;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040, 2));
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer!.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      renderer!.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer?.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      gridHelperRef.current = null;
      currentModelObjectsRef.current = [];
    };
  }, []);

  // -------------------------
  // Dijkstra on rooms
  // -------------------------
  function dijkstraRooms(metadataArr: RoomMetadata[], startName: string, endName: string): string[] {
    if (!metadataArr.length) return [];
    const graph: Record<string, Record<string, number>> = {};

    metadataArr.forEach((r) => {
      graph[r.name] = {};
      (r.adjacent || []).forEach((a) => {
        graph[r.name][a] = 1;
      });
    });

    if (!(startName in graph) || !(endName in graph)) return [];

    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    Object.keys(graph).forEach((n) => {
      dist[n] = Infinity;
      prev[n] = null;
    });
    dist[startName] = 0;
    const queue = Object.keys(graph);

    while (queue.length) {
      queue.sort((a, b) => dist[a] - dist[b]);
      const u = queue.shift()!;
      if (u === endName) break;
      if (dist[u] === Infinity) break;
      Object.keys(graph[u]).forEach((v) => {
        if (dist[u] + 1 < dist[v]) {
          dist[v] = dist[u] + 1;
          prev[v] = u;
        }
      });
    }

    if (dist[endName] === Infinity) return [];
    const path: string[] = [];
    let cur: string | null = endName;
    while (cur) {
      path.unshift(cur);
      cur = prev[cur];
    }
    return path;
  }

  // -------------------------
  // placeRoomsFromMain
  // -------------------------
  async function placeRoomsFromMain(targetRoomName: string) {
    const metadataArr: RoomMetadata[] = metadata.map((m) => ({ ...m }));
    if (!metadataArr.length) return;

    if (!mainRoomNameRef.current) {
      mainRoomNameRef.current = metadataArr[0].name;
    }
    const mainName = mainRoomNameRef.current;
    const path = dijkstraRooms(metadataArr, mainName, targetRoomName);
    if (!path.length) {
      console.warn("No path found to", targetRoomName);
      return;
    }

    const scene = sceneRef.current;
    if (!scene) return;

    if (mainName === path[0] && gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current = null;
    }

    const getRoom = (name: string) => metadataArr.find((r) => r.name === name);

    let prevExitWorldPos: THREE.Vector3 | null = null;
    let prevExitDir3D: THREE.Vector3 | null = null;
    let cumulativeRotation = new THREE.Quaternion();

    for (let i = 0; i < path.length; i++) {
      const roomName = path[i];
      const room = getRoom(roomName);
      if (!room) continue;

      let obj: THREE.Object3D | null = null;

      if (room.modelData) {
        try {
          obj = await loadGLBFromArrayBuffer(room.modelData);
        } catch (err) {
          console.warn("Failed parsing GLB for", roomName, err);
          obj = null;
        }
      } else if (glbArrayBuffer && roomName === targetRoomName) {
        try {
          obj = await loadGLBFromArrayBuffer(glbArrayBuffer);
        } catch {
          obj = null;
        }
      }

      if (!obj) {
        if (room.grid && room.transform) {
          const cols = room.grid[0]?.length || 1;
          const rows = room.grid.length || 1;
          const cs = room.transform.cell_size || room.transform.cellSize || 0.05;
          obj = new THREE.Mesh(
            new THREE.BoxGeometry(cols * cs, 0.1, rows * cs),
            new THREE.MeshStandardMaterial({ color: 0x888888, wireframe: true })
          );
        } else {
          obj = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 1),
            new THREE.MeshStandardMaterial({ color: 0x888888, wireframe: true })
          );
        }
      }

      scene.add(obj);
      currentModelObjectsRef.current.push(obj);

      if (i === 0) {
        obj.position.set(0, (room.floor ?? 0) * 5, 0);
        obj.quaternion.identity();
        obj.updateMatrixWorld(true);

        const nextRoomName = path[1];
        if (nextRoomName && room.entrances && room.entrances[nextRoomName] && room.transform) {
          const exit = room.entrances[nextRoomName];
          const wp = room.transform.gridToWorld(exit.y, exit.x);
          prevExitWorldPos = new THREE.Vector3(wp.x, 0, -wp.y);
          prevExitDir3D = new THREE.Vector3(exit.dir?.x || 0, 0, -(exit.dir?.y || 0)).normalize();
        }
        continue;
      }

      const prevRoomName = path[i - 1];
      const curEntrance = room.entrances?.[prevRoomName];

      if (curEntrance && prevExitWorldPos && room.transform) {
        const curDir3D = new THREE.Vector3(curEntrance.dir?.x || 0, 0, -(curEntrance.dir?.y || 0)).normalize();
        const targetDir3D = prevExitDir3D ? prevExitDir3D.clone().multiplyScalar(-1).normalize() : new THREE.Vector3(0, 0, 1);

        const q = new THREE.Quaternion().setFromUnitVectors(curDir3D, targetDir3D);
        q.premultiply(cumulativeRotation);

        obj.applyQuaternion(q);
        obj.updateMatrixWorld(true);

        const wpEnt = room.transform.gridToWorld(curEntrance.y, curEntrance.x);
        const entranceVec = new THREE.Vector3(wpEnt.x, 0, -wpEnt.y);
        const entranceRotated = entranceVec.clone().applyQuaternion(q);
        const offset = new THREE.Vector3().subVectors(prevExitWorldPos, entranceRotated);

        obj.position.add(offset);
        obj.position.y = (room.floor ?? 0) * 5;
        obj.updateMatrixWorld(true);

        cumulativeRotation.copy(q);

        const nextRoomName = path[i + 1];
        if (nextRoomName && room.entrances?.[nextRoomName]) {
          const exit = room.entrances[nextRoomName];
          prevExitDir3D = new THREE.Vector3(exit.dir?.x || 0, 0, -(exit.dir?.y || 0)).normalize();
          const wpExit = room.transform.gridToWorld(exit.y, exit.x);
          const exitVec = new THREE.Vector3(wpExit.x, 0, -wpExit.y).applyQuaternion(q).add(offset);
          prevExitWorldPos = exitVec;
        } else {
          prevExitWorldPos = prevExitWorldPos.clone().add(new THREE.Vector3(1, 0, 0));
        }
      } else {
        if (prevExitWorldPos) {
          obj.position.copy(prevExitWorldPos.clone().add(new THREE.Vector3(1, 0, 0)));
          prevExitWorldPos = obj.position.clone();
          obj.updateMatrixWorld(true);
        }
      }

      const worldPos = obj.getWorldPosition(new THREE.Vector3());
      const worldQuat = obj.getWorldQuaternion(new THREE.Quaternion());
      room._computedWorld = {
        position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
        rotation: { x: worldQuat.x, y: worldQuat.y, z: worldQuat.z, w: worldQuat.w },
      };

      if (room.entrances && room.transform) {
        room._computedEntrances = {};
        for (const [adjName, ent] of Object.entries(room.entrances) as [string, RoomEntrance][]) {
          const wp = room.transform.gridToWorld(ent.y, ent.x);
          const v = new THREE.Vector3(wp.x, 0, -wp.y).applyQuaternion(obj.quaternion).add(obj.position);
          room._computedEntrances[adjName] = { x: v.x, y: v.y, z: v.z };
        }
      }
    }

    const newMeta: RoomMetadata[] = metadataArr.map((m) => {
      const copy: RoomMetadata = { ...m };
      if (m._computedWorld) {
        copy.worldPosition = m._computedWorld.position;
        copy.worldRotation = m._computedWorld.rotation;
      }
      if (m._computedEntrances) {
        copy.computedEntrances = m._computedEntrances;
      }
      delete (copy as any)._computedWorld;
      delete (copy as any)._computedEntrances;
      return copy;
    });

    setMetadata(newMeta);
  }

  // -------------------------
  // Save metadata for current room
  // -------------------------
  const handleSaveMetadata = async () => {
    if (!name || !glbArrayBuffer) {
      alert("Room name and .glb file are required");
      return;
    }

    const room: RoomMetadata = {
      name: name.trim(),
      floor: Number(floor) || 0,
      adjacent: adjacent.split(";").map((s) => s.trim()).filter(Boolean),
      grid: gridData,
      transform: transformData as TransformData,
      entrances: { ...currentEntrances },
      modelData: glbArrayBuffer ? glbArrayBuffer.slice(0) : undefined,
    };

    setMetadata((prev) => [...prev, room]);

    if (!mainRoomNameRef.current) mainRoomNameRef.current = room.name;

    try {
      await placeRoomsFromMain(room.name);
      alert("Room saved and placed in 3D scene.");
    } catch (err) {
      console.error("Placement error:", err);
      alert("Saved metadata but placement failed (see console).");
    }

    // reset
    setName("");
    setFloor(0);
    setAdjacent("");
    setGridData([]);
    setTransformData(null);
    setGlbArrayBuffer(null);
    setCurrentEntrances({});
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="space-y-6 animate-fadeIn" style={{ color: "#fff" }}>
      <div className="twoD-section" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="metadata-fields" style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <input type="text" placeholder="Room Name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: "1 1 200px", color: "#fff", backgroundColor: "#000" }} />
          <input type="number" placeholder="Floor" value={floor} onChange={(e) => setFloor(Number(e.target.value))} style={{ width: "80px", color: "#fff", backgroundColor: "#000" }} />
          <input type="text" placeholder="Adjacent Rooms (; separated)" value={adjacent} onChange={(e) => setAdjacent(e.target.value)} style={{ flex: "1 1 200px", color: "#fff", backgroundColor: "#000" }} />

          <label style={{ color: "#fff" }}>
            Load .laz
            <input type="file" accept=".laz" onChange={handleLoadLaz} style={{ color: "#fff", backgroundColor: "#000" }} />
          </label>

          <label style={{ color: "#fff" }}>
            Load .glb
            <input type="file" accept=".glb" onChange={handleLoadGlb} style={{ color: "#fff", backgroundColor: "#000" }} />
          </label>

          <button onClick={handleSaveMetadata} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Metadata (adds room)</button>

          <button onClick={() => setView3D((v) => !v)} className="px-4 py-2 bg-gray-700 text-white rounded">Toggle 3D</button>
        </div>

        <div className="grid-display" style={{ flex: 1, position: "relative" }}>
          <GridCanvas
            gridData={gridData}
            transformData={transformData}
            currentEntrances={currentEntrances}
            onCellPick={handleCellPick}
          />

          {showArrowPopup && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#111", padding: "1rem", border: "2px solid #fff", borderRadius: 8, zIndex: 9999 }}>
              <h4 style={{ color: "#fff", marginTop: 0 }}>Pick Direction</h4>
              <canvas ref={arrowCanvasRef} width={120} height={120} style={{ border: "1px solid #fff", backgroundColor: "#000" }} />
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={handleArrowSave} className="px-3 py-1 bg-blue-600 text-white rounded">Save Direction</button>
                <button onClick={handleArrowCancel} className="px-3 py-1 bg-gray-400 text-white rounded">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={modelContainer} style={{ width: "100%", height: "400px", marginTop: "1rem", border: "1px solid #444" }} />
    </div>
  );
};

export default BuildingsSection;
