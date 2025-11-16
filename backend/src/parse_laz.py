import sys
import laspy
import numpy as np
from scipy.spatial import cKDTree
from scipy.ndimage import binary_dilation
import json
import os

def process_laz(file_path, output_dir="./jsons"):
    os.makedirs(output_dir, exist_ok=True)
    # --- Load .laz file ---
    las = laspy.read(file_path)
    points = np.vstack((las.x, las.y, las.z)).T

    # --- Downsample for performance ---
    max_points = 5_000_000
    if points.shape[0] > max_points:
        idx = np.random.choice(points.shape[0], max_points, replace=False)
        points = points[idx]

    # --- Center points ---
    center = points.mean(axis=0)
    points_centered = points - center

    # --- Automatically detect floor band ---
    z_min = points_centered[:, 2].min()
    floor_band_thickness = 0.3  # 30 cm above lowest point
    floor_z_min = z_min
    floor_z_max = z_min + floor_band_thickness
    in_floor_band = (points_centered[:, 2] >= floor_z_min) & (points_centered[:, 2] <= floor_z_max)
    floor_points = points_centered[in_floor_band]

    # --- KDTree for neighbor lookup ---
    tree = cKDTree(points_centered[:, :2])

    # --- Detect obstacles above floor ---
    search_radius = 0.1       # 10 cm horizontal radius
    z_check_min = floor_z_max
    z_check_max = floor_z_max + 1.0  # check up to 1 meter above floor
    has_obstacle_above = np.zeros(floor_points.shape[0], dtype=bool)

    for i, p in enumerate(floor_points):
        idxs = tree.query_ball_point(p[:2], r=search_radius)
        if not idxs:
            continue
        neighbors_z = points_centered[idxs, 2]
        above_mask = (neighbors_z > z_check_min) & (neighbors_z <= z_check_max)
        if np.any(above_mask):
            has_obstacle_above[i] = True

    # --- GRID CREATION (5 cm cells) ---
    cell_size = 0.05
    x_min, x_max = points_centered[:, 0].min(), points_centered[:, 0].max()
    y_min, y_max = points_centered[:, 1].min(), points_centered[:, 1].max()

    nx = int(np.ceil((x_max - x_min) / cell_size))
    ny = int(np.ceil((y_max - y_min) / cell_size))
    grid = np.full((ny, nx), -1)  # start all blocked

    # --- CENTERED GRID ORIGIN ---
    grid_width = nx * cell_size
    grid_height = ny * cell_size
    x0 = -grid_width / 2
    y0 = -grid_height / 2

    # --- Coordinate transforms ---
    def to_grid_idx(x, y):
        j = int((x - x0) / cell_size)
        i = int((y - y0) / cell_size)
        return i, j

    def grid_to_world(i, j):
        x = x0 + (j + 0.5) * cell_size
        y = y0 + (i + 0.5) * cell_size
        z = floor_z_max
        return x, y, z

    # Mark free cells under floor points without obstacles
    for p, obstacle in zip(floor_points, has_obstacle_above):
        if not obstacle:
            i, j = to_grid_idx(p[0], p[1])
            if 0 <= i < ny and 0 <= j < nx:
                grid[i, j] = 0  # free

    # Fill small gaps (dilate free areas)
    free_mask = grid == 0
    grid_dilated = binary_dilation(free_mask, iterations=1)
    grid[grid_dilated] = 0

    # --- Save transformation metadata ---
    transform_data = {
        "cell_size": cell_size,
        "grid_shape": {"rows": ny, "cols": nx},
        "grid_origin_centered": True,
        "grid_world_origin": {
            "x0": x0,
            "y0": y0,
            "z_floor": float(floor_z_max)
        },
        "center_offset": {
            "x": float(center[0]),
            "y": float(center[1]),
            "z": float(center[2])
        }
    }

    output_data = {
        "grid": grid.tolist(),
        "transform": transform_data
    }

    base_name = os.path.splitext(os.path.basename(file_path))[0]
    grid_file = os.path.join(output_dir, f"{base_name}_occupancy_grid.json")
    transform_file = os.path.join(output_dir, f"{base_name}_transform.json")

    print(json.dumps(output_data))
    sys.stdout.flush()

if __name__ == "__main__":
    process_laz(sys.argv[1])
