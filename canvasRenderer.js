// Canvas Renderer - handles all 2D canvas drawing operations
export class CanvasRenderer {
    constructor() {
        this.gridCanvas = document.getElementById('gridCanvas');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.cellSize = 20;
    }

    // Draw the room grid
    drawGrid(gridData, currentFile, metadata) {
        if (!gridData || gridData.length === 0) return;
        
        const rows = gridData.length;
        const cols = gridData[0].length;
        
        this.gridCanvas.width = cols * this.cellSize;
        this.gridCanvas.height = rows * this.cellSize;
        this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);

        // Draw cells
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                this.gridCtx.fillStyle = gridData[y][x] === 0 ? '#fff' : '#333';
                this.gridCtx.fillRect(
                    x * this.cellSize, 
                    y * this.cellSize, 
                    this.cellSize, 
                    this.cellSize
                );
            }
        }

        // Draw entrances
        const room = metadata.find(r => r.file === currentFile);
        if (room) {
            this.gridCtx.fillStyle = '#ef4444';
            Object.values(room.entrances).forEach(entrance => {
                this.gridCtx.fillRect(
                    entrance.x * this.cellSize, 
                    entrance.y * this.cellSize, 
                    this.cellSize, 
                    this.cellSize
                );
                if (entrance.dir) {
                    this.drawArrow2D(entrance.x, entrance.y, entrance.dir);
                }
            });
        }

        // Draw grid lines
        this.gridCtx.strokeStyle = '#ddd';
        this.gridCtx.lineWidth = 0.5;
        
        for (let y = 0; y <= rows; y++) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y * this.cellSize);
            this.gridCtx.lineTo(cols * this.cellSize, y * this.cellSize);
            this.gridCtx.stroke();
        }
        
        for (let x = 0; x <= cols; x++) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x * this.cellSize, 0);
            this.gridCtx.lineTo(x * this.cellSize, rows * this.cellSize);
            this.gridCtx.stroke();
        }
    }

    // Draw an arrow on the 2D grid
    drawArrow2D(cellX, cellY, dir) {
        const cx = cellX * this.cellSize + this.cellSize / 2;
        const cy = cellY * this.cellSize + this.cellSize / 2;
        
        this.gridCtx.strokeStyle = '#4f46e5';
        this.gridCtx.fillStyle = '#4f46e5';
        this.gridCtx.lineWidth = 2;
        
        // Draw arrow line
        this.gridCtx.beginPath();
        this.gridCtx.moveTo(cx, cy);
        this.gridCtx.lineTo(
            cx + dir.x * this.cellSize / 2, 
            cy + dir.y * this.cellSize / 2
        );
        this.gridCtx.stroke();
        
        // Draw arrow head
        const angle = Math.atan2(dir.y, dir.x);
        const size = 5;
        
        this.gridCtx.beginPath();
        this.gridCtx.moveTo(
            cx + dir.x * this.cellSize / 2, 
            cy + dir.y * this.cellSize / 2
        );
        this.gridCtx.lineTo(
            cx + dir.x * this.cellSize / 2 - size * Math.cos(angle - Math.PI / 6),
            cy + dir.y * this.cellSize / 2 - size * Math.sin(angle - Math.PI / 6)
        );
        this.gridCtx.lineTo(
            cx + dir.x * this.cellSize / 2 - size * Math.cos(angle + Math.PI / 6),
            cy + dir.y * this.cellSize / 2 - size * Math.sin(angle + Math.PI / 6)
        );
        this.gridCtx.closePath();
        this.gridCtx.fill();
    }

    // Get grid cell coordinates from mouse event
    getGridCellFromMouse(e, gridData) {
        const rect = this.gridCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        
        if (y >= 0 && y < gridData.length && x >= 0 && x < gridData[0].length) {
            return { x, y, isValid: true };
        }
        
        return { x: -1, y: -1, isValid: false };
    }
}