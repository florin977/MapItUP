import laspy
import numpy as np
import pyvista as pv
import matplotlib.pyplot as plt
from scipy.spatial import cKDTree
from scipy.ndimage import binary_dilation
import json

# --- Load .laz file ---
file_path = "./room1.laz"
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
print(f"Lowest Z: {z_min:.3f} m")
print(f"Floor band: z ∈ [{floor_z_min:.3f}, {floor_z_max:.3f}]")
print(f"Found {floor_points.shape[0]} floor points in auto-detected floor band.")

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

print(f"Detected {np.sum(has_obstacle_above)} floor points with obstacles above.")

# --- Visualization colors ---
cloud = pv.PolyData(points_centered)
colors = np.zeros_like(points_centered)
colors[:] = [0.5, 0.5, 0.5]  # default gray
floor_idx = np.where(in_floor_band)[0]
colors[floor_idx[~has_obstacle_above]] = [0, 1, 0]  # free floor = green
colors[floor_idx[has_obstacle_above]] = [0, 0, 0]   # blocked floor = black
cloud["colors"] = colors

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

# world coordinates of grid cell (0,0)
x0 = -grid_width / 2
y0 = -grid_height / 2

# --- Updated coordinate transforms ---
def to_grid_idx(x, y):
    """World → Grid (centered grid)"""
    j = int((x - x0) / cell_size)
    i = int((y - y0) / cell_size)
    return i, j

def grid_to_world(i, j):
    """Grid → World (centered grid)"""
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

print(f"Generated connected high-res grid: {grid.shape}")

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
    },
    "note": "Centered grid: (ny/2, nx/2) corresponds to (0,0) in world coords."
}

# --- Test the mapping ---
print("\n--- Testing Grid <-> World Mapping ---")
test_cells = [(0, 0), (ny//2, nx//2), (ny-1, nx-1)]
for i, j in test_cells:
    if 0 <= i < ny and 0 <= j < nx:
        x, y, z = grid_to_world(i, j)
        i_back, j_back = to_grid_idx(x, y)
        print(f"Grid ({i:4d}, {j:4d}) -> World ({x:7.3f}, {y:7.3f}, {z:6.3f}) -> Grid ({i_back:4d}, {j_back:4d})")

# --- 2D top-down visualization ---
scale_factor = 4
color_grid = np.full((ny, nx, 3), 0.5)
color_grid[grid == 0] = [0, 1, 0]   # free = green
color_grid[grid == -1] = [0, 0, 0] # obstacle = black
color_grid_up = np.kron(color_grid, np.ones((scale_factor, scale_factor, 1)))

plt.figure(figsize=(12, 10), dpi=150)
plt.imshow(np.flipud(color_grid_up), origin='upper')
plt.title("Connected Occupancy Grid (centered)")
plt.xlabel("Grid X")
plt.ylabel("Grid Y")

# Add reference points
for i, j in [(ny//2, nx//2)]:
    x, y, _ = grid_to_world(i, j)
    plt.plot(x, y, 'r*', markersize=10)
    plt.text(x, y, " (0,0)", color='red')

plt.show()

# --- PyVista 3D visualization ---
plotter = pv.Plotter()
plotter.add_points(cloud, scalars="colors", rgb=True, point_size=2, render_points_as_spheres=True)

# Add reference markers
test_world_points = []
for i, j in [(ny//2, nx//2), (0,0)]:
    if 0 <= i < ny and 0 <= j < nx:
        x, y, z = grid_to_world(i, j)
        test_world_points.append([x, y, z])

markers = pv.PolyData(np.array(test_world_points))
plotter.add_points(markers, color='red', point_size=15, render_points_as_spheres=True)

plotter.add_axes()
plotter.show()

# --- Save files ---
output_data = {
    "grid": grid.tolist(),
    "transform": transform_data
}

with open("./jsons/occupancy_grid.json", "w") as f:
    json.dump(output_data, f, indent=2)

with open("./jsons/transform.json", "w") as f:
    json.dump(transform_data, f, indent=2)

print("\n--- Saved files ---")
print("✓ occupancy_grid.json - Grid + transform data")
print("✓ transform.json - Transform metadata only")
print("\nGrid is now CENTERED. Use grid_to_world(i, j) for accurate mapping.")
