import { GridTransform } from './gridTransform.js';
import { runDijkstra } from './dijkstra.js';
import { UIManager } from './uiManager.js';
import { CanvasRenderer } from './canvasRenderer.js';
import { Viewer3D } from './viewer3D.js';

// Application state
const state = {
    gridData: [],
    currentFile: null,
    metadata: [],
    selectedRoom: null,
    lastPath: [],
    currentTransform: null,
    tempEntrance: null,
    selectedDir: { x: 0, y: -1 }
};

// Initialize managers
const ui = new UIManager();
const canvas = new CanvasRenderer();
const viewer3D = new Viewer3D('modelContainer');

// ===== File Upload Handler =====
document.getElementById('roomFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        state.currentFile = file.name;
        const text = await file.text();
        const data = JSON.parse(text);

        // Check format
        if (data.transform) {
            state.gridData = data.grid;
            state.currentTransform = new GridTransform(data.transform);
            ui.showStatus(`Loaded ${state.currentFile} with 3D transform data`);
        } else if (Array.isArray(data)) {
            state.gridData = data;
            state.currentTransform = null;
            ui.showStatus(`Loaded ${state.currentFile} (no transform data)`);
        } else {
            throw new Error('Invalid grid format');
        }

        if (!Array.isArray(state.gridData) || !state.gridData.length || 
            !Array.isArray(state.gridData[0])) {
            throw new Error('Invalid grid format');
        }

        canvas.drawGrid(state.gridData, state.currentFile, state.metadata);
        ui.showMetadataPopup(state.currentFile, state.metadata);
    } catch (err) {
        ui.showStatus(`Error: ${err.message}`, true);
        console.error(err);
    }
});

// ===== Metadata Save Handler =====
document.getElementById('saveBtn').addEventListener('click', async () => {
    const formValues = ui.getMetadataFormValues();

    if (!formValues.name) {
        ui.showStatus('Room name is required', true);
        return;
    }

    // Load model data
    let modelData = null;
    if (formValues.modelFile) {
        modelData = await formValues.modelFile.arrayBuffer();
    }

    // Load transform data
    let transformData = null;
    if (formValues.transformFile) {
        try {
            const text = await formValues.transformFile.text();
            const parsed = JSON.parse(text);
            transformData = new GridTransform(parsed);
            ui.showStatus('Custom transform data loaded successfully');
        } catch (err) {
            ui.showStatus('Invalid transform JSON file', true);
            console.error(err);
        }
    }

    // Update metadata
    state.metadata = state.metadata.filter(r => r.file !== state.currentFile);
    state.metadata.push({
        name: formValues.name,
        floor: formValues.floor,
        file: state.currentFile,
        grid: state.gridData,
        transform: transformData || state.currentTransform,
        entrances: {},
        adjacent: formValues.adjacent,
        modelData
    });

    ui.hideMetadataPopup();
    ui.showStatus(`Saved room: ${formValues.name}`);
    ui.updateRoomList(state.metadata);
    ui.updatePathRoomSelect(state.lastPath);
    canvas.drawGrid(state.gridData, state.currentFile, state.metadata);
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    ui.hideMetadataPopup();
});

// ===== Grid Canvas Mouse Hover =====
canvas.gridCanvas.addEventListener('mousemove', (e) => {
    if (!state.currentTransform || !state.gridData.length) return;

    const cell = canvas.getGridCellFromMouse(e, state.gridData);
    if (cell.isValid) {
        const worldPos = state.currentTransform.gridToWorld(cell.y, cell.x);
        const cellType = state.gridData[cell.y][cell.x] === 0 ? 'FREE' : 'BLOCKED';
        ui.updateCoordInfo(
            `Grid: (i=${cell.y}, j=${cell.x}) → 3D World: ` +
            `(x=${worldPos.x.toFixed(3)}, y=${worldPos.y.toFixed(3)}, ` +
            `z=${worldPos.z.toFixed(3)}) | Cell: ${cellType}`
        );
    }
});

// ===== Grid Canvas Click - Set Entrance =====
canvas.gridCanvas.addEventListener('click', (e) => {
    if (!state.currentFile) return;

    const room = state.metadata.find(r => r.file === state.currentFile);
    if (!room) {
        ui.showStatus('Save metadata first', true);
        return;
    }

    const cell = canvas.getGridCellFromMouse(e, state.gridData);
    if (!cell.isValid) return;

    if (state.gridData[cell.y][cell.x] !== 0) {
        ui.showStatus('Cannot place entrance on wall', true);
        return;
    }

    if (room.adjacent.length === 0) {
        ui.showStatus('No adjacent rooms defined', true);
        return;
    }

    state.tempEntrance = { x: cell.x, y: cell.y, roomName: room.name };

    // Show 3D coordinates
    if (room.transform) {
        const worldPos = room.transform.gridToWorld(cell.y, cell.x);
        ui.showStatus(
            `Selected entrance at 3D: (${worldPos.x.toFixed(3)}, ` +
            `${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`
        );
    }

    state.selectedDir = { x: 0, y: -1 };
    ui.showArrowPicker();
    ui.drawArrowPicker(state.selectedDir);
});

// ===== Arrow Picker Mouse Move =====
ui.arrowCanvas.addEventListener('mousemove', (e) => {
    const rect = ui.arrowCanvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - 60;
    const dy = e.clientY - rect.top - 60;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
        state.selectedDir = { x: dx / len, y: dy / len };
        ui.drawArrowPicker(state.selectedDir);
    }
});

// ===== Arrow Save Button =====
document.getElementById('arrowSaveBtn').addEventListener('click', () => {
    const room = state.metadata.find(r => r.name === state.tempEntrance.roomName);
    const adjRoom = prompt(
        `Which adjacent room does this entrance lead to?\nOptions: ${room.adjacent.join(', ')}`
    );

    if (!adjRoom || !room.adjacent.includes(adjRoom)) {
        ui.showStatus('Invalid adjacent room', true);
        return;
    }

    room.entrances[adjRoom] = {
        x: state.tempEntrance.x,
        y: state.tempEntrance.y,
        dir: state.selectedDir
    };

    // Log 3D world position
    if (room.transform) {
        const worldPos = room.transform.gridToWorld(
            state.tempEntrance.y, 
            state.tempEntrance.x
        );
        const worldDir = room.transform.gridDirToWorld(state.selectedDir);
        console.log(`Entrance to ${adjRoom}:`, {
            grid: { i: state.tempEntrance.y, j: state.tempEntrance.x },
            world: worldPos,
            direction: state.selectedDir,
            worldDirection: worldDir
        });
    }

    ui.hideArrowPicker();
    state.tempEntrance = null;
    canvas.drawGrid(state.gridData, state.currentFile, state.metadata);
});

document.getElementById('arrowCancelBtn').addEventListener('click', () => {
    ui.hideArrowPicker();
    state.tempEntrance = null;
});

// ===== Run Dijkstra Button =====
document.getElementById('runDijkstra').addEventListener('click', async () => {
    if (state.metadata.length < 2) {
        ui.showStatus('Need at least 2 rooms', true);
        return;
    }

    const startName = prompt('Enter start room name:');
    if (!startName) return;

    const endName = prompt('Enter end room name:');
    if (!endName) return;

    state.lastPath = runDijkstra(startName, endName, state.metadata);

    if (state.lastPath.length > 0) {
        ui.showStatus(`Path found: ${state.lastPath.join(' → ')}`);
        await viewer3D.drawFullRoomPath3D(state.lastPath, state.metadata);
        ui.updatePathRoomSelect(state.lastPath);
    }
});

// ===== Initialize =====
ui.updateRoomList(state.metadata);
ui.updatePathRoomSelect(state.lastPath);