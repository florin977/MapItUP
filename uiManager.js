// UI Manager - handles all UI state and interactions
export class UIManager {
    constructor() {
        this.statusDiv = document.getElementById('status');
        this.coordInfo = document.getElementById('coordInfo');
        this.roomListSpan = document.getElementById('roomList');
        this.selectPathRoom = document.getElementById('selectPathRoom');
        
        // Popup elements
        this.popup = document.getElementById('popup');
        this.nameField = document.getElementById('nameField');
        this.floorField = document.getElementById('floorField');
        this.adjacentField = document.getElementById('adjacentField');
        this.modelFileInput = document.getElementById('modelFile');
        this.transformFileInput = document.getElementById('transformFile');
        
        // Arrow picker elements
        this.arrowPicker = document.getElementById('arrowPicker');
        this.arrowCanvas = document.getElementById('arrowCanvas');
        this.arrowCtx = this.arrowCanvas.getContext('2d');
    }

    // Show status message
    showStatus(message, isError = false) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = isError ? 'status error' : 'status';
        this.statusDiv.style.display = 'block';
        setTimeout(() => { 
            this.statusDiv.style.display = 'none'; 
        }, 3000);
    }

    // Update room list display
    updateRoomList(metadata) {
        this.roomListSpan.textContent = metadata.length === 0 
            ? 'None' 
            : metadata.map(r => r.name).join(', ');
    }

    // Update path room selector
    updatePathRoomSelect(lastPath) {
        this.selectPathRoom.innerHTML = '';
        
        if (lastPath.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'No path selected';
            this.selectPathRoom.appendChild(opt);
            return;
        }
        
        lastPath.forEach(roomName => {
            const opt = document.createElement('option');
            opt.value = roomName;
            opt.textContent = roomName;
            this.selectPathRoom.appendChild(opt);
        });
    }

    // Show metadata popup
    showMetadataPopup(currentFile, metadata) {
        this.popup.style.display = 'flex';
        const existingRoom = metadata.find(r => r.file === currentFile);
        
        if (existingRoom) {
            this.nameField.value = existingRoom.name;
            this.floorField.value = existingRoom.floor || 0;
            this.adjacentField.value = existingRoom.adjacent.join(', ');
        } else {
            this.nameField.value = currentFile.split('.')[0];
            this.adjacentField.value = '';
            this.floorField.value = 0;
        }
        
        this.modelFileInput.value = '';
        this.transformFileInput.value = '';
    }

    // Hide metadata popup
    hideMetadataPopup() {
        this.popup.style.display = 'none';
    }

    // Get metadata form values
    getMetadataFormValues() {
        return {
            name: this.nameField.value.trim(),
            floor: parseInt(this.floorField.value) || 0,
            adjacent: this.adjacentField.value
                .split(',')
                .map(s => s.trim())
                .filter(s => s),
            modelFile: this.modelFileInput.files[0],
            transformFile: this.transformFileInput.files[0]
        };
    }

    // Show arrow direction picker
    showArrowPicker() {
        this.arrowPicker.style.display = 'flex';
    }

    // Hide arrow direction picker
    hideArrowPicker() {
        this.arrowPicker.style.display = 'none';
    }

    // Draw arrow on picker canvas
    drawArrowPicker(selectedDir) {
        this.arrowCtx.clearRect(0, 0, 120, 120);
        this.arrowCtx.strokeStyle = '#4f46e5';
        this.arrowCtx.fillStyle = '#4f46e5';
        this.arrowCtx.lineWidth = 3;
        
        const cx = 60;
        const cy = 60;
        
        // Draw arrow line
        this.arrowCtx.beginPath();
        this.arrowCtx.moveTo(cx, cy);
        this.arrowCtx.lineTo(cx + selectedDir.x * 50, cy + selectedDir.y * 50);
        this.arrowCtx.stroke();
        
        // Draw arrow head
        const angle = Math.atan2(selectedDir.y, selectedDir.x);
        this.arrowCtx.beginPath();
        this.arrowCtx.moveTo(cx + selectedDir.x * 50, cy + selectedDir.y * 50);
        this.arrowCtx.lineTo(
            cx + selectedDir.x * 50 - 10 * Math.cos(angle - Math.PI / 6),
            cy + selectedDir.y * 50 - 10 * Math.sin(angle - Math.PI / 6)
        );
        this.arrowCtx.lineTo(
            cx + selectedDir.x * 50 - 10 * Math.cos(angle + Math.PI / 6),
            cy + selectedDir.y * 50 - 10 * Math.sin(angle + Math.PI / 6)
        );
        this.arrowCtx.closePath();
        this.arrowCtx.fill();
    }

    // Update coordinate info display
    updateCoordInfo(text) {
        this.coordInfo.textContent = text;
    }
}