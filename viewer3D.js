import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { dijkstraGrid } from './dijkstra.js';

// 3D Viewer - handles Three.js scene and rendering
export class Viewer3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentModelObjects = [];
        this.pathLineObject = null;
        this.floorHeight = 5;
        
        this.init();
    }

    // Initialize Three.js scene
    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e293b);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);
        
        // GLTF Loader
        this.loader = new GLTFLoader();
        
        // Lighting
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7.5);
        this.scene.add(dirLight);
        
        const ambLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambLight);
        
        // Grid helper
        this.gridHelper = new THREE.GridHelper(10, 10, 0x475569, 0x334155);
        this.scene.add(this.gridHelper);
        
        // Camera position
        this.camera.position.set(3, 3, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        this.animate();
    }

    // Animation loop
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Load GLB model from ArrayBuffer
    async loadGLBFromArrayBuffer(arrayBuffer) {
        return new Promise((resolve, reject) => {
            this.loader.parse(
                arrayBuffer, 
                '', 
                (gltf) => resolve(gltf.scene), 
                (err) => reject(err)
            );
        });
    }

    // Clear all scene objects
    clearScene() {
        this.currentModelObjects.forEach(obj => this.scene.remove(obj));
        this.currentModelObjects = [];
        
        if (this.pathLineObject) {
            this.scene.remove(this.pathLineObject);
            this.pathLineObject = null;
        }
    }

    // Draw full 3D path with room models
    async drawFullRoomPath3D(lastPath, metadata) {
        this.clearScene();

        if (lastPath.length < 2) return;

        const pathPositions = [];
        let prevExitWorldPos = null;
        let prevExitDir3D = null;
        let cumulativeRotation = new THREE.Quaternion();

        // Process each room in the path
        for (let i = 0; i < lastPath.length; i++) {
            const roomName = lastPath[i];
            const room = metadata.find(r => r.name === roomName);
            if (!room) continue;

            // Load room model or create fallback
            let obj;
            if (room.modelData) {
                obj = await this.loadGLBFromArrayBuffer(room.modelData);
            } else {
                // Fallback: wireframe box
                const cols = room.grid[0].length;
                const rows = room.grid.length;
                const cs = room.transform ? room.transform.cellSize : 0.1;
                
                obj = new THREE.Mesh(
                    new THREE.BoxGeometry(cols * cs, 0.1, rows * cs),
                    new THREE.MeshStandardMaterial({ 
                        color: 0x64748b, 
                        wireframe: true 
                    })
                );
            }

            this.scene.add(obj);
            this.currentModelObjects.push(obj);

            if (i === 0) {
                // First room at origin
                this.scene.remove(this.gridHelper);
                obj.position.set(0, (room.floor || 0) * this.floorHeight, 0);
                obj.rotation.set(0, 0, 0);
                obj.updateMatrixWorld(true);

                // Prepare exit for next room
                const nextRoomName = lastPath[1];
                if (nextRoomName && room.entrances[nextRoomName]) {
                    const exit = room.entrances[nextRoomName];
                    prevExitDir3D = new THREE.Vector3(exit.dir.x, 0, -exit.dir.y).normalize();
                    
                    const wp = room.transform.gridToWorld(exit.y, exit.x);
                    prevExitWorldPos = new THREE.Vector3(wp.x, 0, -wp.y);

                    // Grid path for first room
                    const entranceGrid = { x: 0, y: 0 };
                    const pathGrid = dijkstraGrid(room.grid, entranceGrid, exit);
                    
                    pathGrid.forEach(p => {
                        const wp2 = room.transform.gridToWorld(p.y, p.x);
                        pathPositions.push(
                            new THREE.Vector3(
                                wp2.x, 
                                0.1 + (room.floor || 0) * this.floorHeight, 
                                -wp2.y
                            )
                        );
                    });
                }
                continue;
            }

            // Align entrance to previous exit
            const prevRoom = metadata.find(r => r.name === lastPath[i - 1]);
            const curEntrance = room.entrances?.[prevRoom.name];

            if (curEntrance && prevExitWorldPos && room.transform) {
                const curDir3D = new THREE.Vector3(
                    curEntrance.dir.x, 
                    0, 
                    -curEntrance.dir.y
                ).normalize();
                
                const targetDir3D = prevExitDir3D.clone()
                    .multiplyScalar(-1)
                    .normalize();

                const q = new THREE.Quaternion().setFromUnitVectors(curDir3D, targetDir3D);
                q.premultiply(cumulativeRotation);

                obj.applyQuaternion(q);
                obj.updateMatrixWorld(true);
                cumulativeRotation.copy(q);

                const wpEntrance = room.transform.gridToWorld(
                    curEntrance.y, 
                    curEntrance.x
                );
                const entranceRotated = new THREE.Vector3(
                    wpEntrance.x, 
                    0, 
                    -wpEntrance.y
                ).applyQuaternion(q);
                
                const offset = new THREE.Vector3().subVectors(
                    prevExitWorldPos, 
                    entranceRotated
                );
                
                obj.position.add(offset);
                obj.position.y = (room.floor || 0) * this.floorHeight;
                obj.updateMatrixWorld(true);

                // Calculate next exit
                const nextRoomName = lastPath[i + 1];
                if (nextRoomName && room.entrances[nextRoomName]) {
                    const exit = room.entrances[nextRoomName];
                    prevExitDir3D = new THREE.Vector3(
                        exit.dir.x, 
                        0, 
                        -exit.dir.y
                    ).normalize();
                    
                    const wpExit = room.transform.gridToWorld(exit.y, exit.x);
                    const exitRotated = new THREE.Vector3(
                        wpExit.x, 
                        0, 
                        -wpExit.y
                    ).applyQuaternion(q).add(offset);
                    
                    prevExitWorldPos = exitRotated;

                    // Grid path
                    const pathGrid = dijkstraGrid(room.grid, curEntrance, exit);
                    pathGrid.forEach(p => {
                        const wp2 = room.transform.gridToWorld(p.y, p.x);
                        const pos3D = new THREE.Vector3(
                            wp2.x, 
                            0.1 + (room.floor || 0) * this.floorHeight, 
                            -wp2.y
                        ).applyQuaternion(q).add(offset);
                        
                        pathPositions.push(pos3D);
                    });
                }
            } else {
                // Fallback: offset slightly
                obj.position.copy(
                    prevExitWorldPos.clone().add(new THREE.Vector3(1, 0, 0))
                );
                prevExitWorldPos = obj.position.clone();
            }
        }

        // Draw global path line
        if (pathPositions.length >= 2) {
            const lineMat = new THREE.LineBasicMaterial({ color: 0x4f46e5 });
            const geom = new THREE.BufferGeometry().setFromPoints(pathPositions);
            this.pathLineObject = new THREE.Line(geom, lineMat);
            this.scene.add(this.pathLineObject);
        }

        // Auto-fit camera
        this.fitCameraToObjects();
    }

    // Fit camera to view all objects
    fitCameraToObjects() {
        if (this.currentModelObjects.length === 0) return;

        const box = new THREE.Box3();
        this.currentModelObjects.forEach(obj => {
            if (obj.isMesh || obj.isLine || obj.isGroup) {
                box.expandByObject(obj);
            }
        });

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.z);
        const fov = this.camera.fov * Math.PI / 180;
        let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

        this.camera.position.set(
            center.x + dist, 
            center.y + dist, 
            center.z + dist
        );
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
        this.controls.enabled = true;
    }
}