export class GridTransform {
    constructor(transformData) {
        this.cellSize = transformData.cell_size;
        this.gridShape = transformData.grid_shape;
        this.centerOffset = transformData.center_offset || { x: 0, y: 0, z: 0 };

        const bounds = transformData.world_bounds || { x_min: 0, x_max: 0, y_min: 0, y_max: 0, z_floor: 0 };

        this.worldBounds = {
            x_min: bounds.x_min,
            x_max: bounds.x_max,
            y_min: bounds.y_min,
            y_max: bounds.y_max,
            z_floor: bounds.z_floor
        };
    }

    // Convert grid coordinates (i, j) to 3D world coordinates
    gridToWorld(i, j) {
        const x = this.worldBounds.x_min + (j + 0.5) * this.cellSize + this.centerOffset.x;
        const y = this.worldBounds.y_min + (i + 0.5) * this.cellSize + this.centerOffset.y;
        const z = this.worldBounds.z_floor + this.centerOffset.z;
        return { x, y, z };
    }

    // Convert 3D world coordinates to grid coordinates
    worldToGrid(x, y) {
        const i = Math.floor((y - this.worldBounds.y_min - this.centerOffset.y) / this.cellSize);
        const j = Math.floor((x - this.worldBounds.x_min - this.centerOffset.x) / this.cellSize);
        return { i, j };
    }

    // Check if grid cell is within bounds
    isValidCell(i, j) {
        return i >= 0 && i < this.gridShape.rows && j >= 0 && j < this.gridShape.cols;
    }

    // Convert grid direction to world direction
    gridDirToWorld(gridDir) {
        return {
            x: gridDir.x * this.cellSize,
            y: gridDir.y * this.cellSize,
            z: 0
        };
    }
}
