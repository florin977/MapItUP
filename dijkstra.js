// Dijkstra's algorithm for room-to-room pathfinding
export function runDijkstra(startName, endName, metadata) {
    if (!metadata.find(r => r.name === startName) || !metadata.find(r => r.name === endName)) {
        return [];
    }

    // Build graph from metadata
    const graph = {};
    metadata.forEach(r => {
        graph[r.name] = {};
        r.adjacent.forEach(a => { 
            graph[r.name][a] = 1; 
        });
    });

    // Initialize distances and previous nodes
    const dist = {};
    const prev = {};
    Object.keys(graph).forEach(n => { 
        dist[n] = Infinity; 
        prev[n] = null; 
    });
    dist[startName] = 0;

    // Priority queue (simple array-based implementation)
    const queue = Object.keys(graph);

    while (queue.length) {
        // Get node with minimum distance
        queue.sort((a, b) => dist[a] - dist[b]);
        const u = queue.shift();
        
        if (u === endName) break;
        if (dist[u] === Infinity) break;

        // Update distances to neighbors
        Object.entries(graph[u]).forEach(([v, weight]) => {
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                prev[v] = u;
            }
        });
    }

    // No path found
    if (dist[endName] === Infinity) {
        return [];
    }

    // Reconstruct path
    const path = [];
    let cur = endName;
    while (cur) {
        path.unshift(cur);
        cur = prev[cur];
    }
    return path;
}

// Dijkstra's algorithm for grid-based pathfinding within a room
export function dijkstraGrid(grid, start, end) {
    const rows = grid.length;
    const cols = grid[0].length;
    const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
    const queue = [];

    dist[start.y][start.x] = 0;
    queue.push({ x: start.x, y: start.y });

    const directions = [
        { x: 1, y: 0 }, 
        { x: -1, y: 0 },
        { x: 0, y: 1 }, 
        { x: 0, y: -1 }
    ];

    while (queue.length) {
        // Get cell with minimum distance
        queue.sort((a, b) => dist[a.y][a.x] - dist[b.y][b.x]);
        const current = queue.shift();
        
        if (current.x === end.x && current.y === end.y) break;

        // Check all neighbors
        for (const dir of directions) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            
            // Check if neighbor is valid and walkable
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
                if (dist[current.y][current.x] + 1 < dist[ny][nx]) {
                    dist[ny][nx] = dist[current.y][current.x] + 1;
                    prev[ny][nx] = current;
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }

    // Reconstruct path
    const path = [];
    let p = end;
    while (p) {
        path.unshift({ x: p.x, y: p.y });
        p = prev[p.y][p.x];
    }
    
    return path.length > 1 ? path : [];
}