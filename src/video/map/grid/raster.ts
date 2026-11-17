import type { Grid } from '../../../grid.js';

type Position = [number, number];
type Point = { x: number; y: number };
export type Project = (position: Position) => Point;

const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));

// Invert the plane's perspective transform once, rather than calling the map's
// unproject for every output pixel. Corners are NW, NE, SE, SW in Mercator space.
function inverseProjection([a, b, c, d]: Point[]) {
  const dx = a.x - b.x + c.x - d.x, dy = a.y - b.y + c.y - d.y;
  const bx = b.x - c.x, by = b.y - c.y, cx = d.x - c.x, cy = d.y - c.y;
  const determinant = bx * cy - cx * by;
  if (!Number.isFinite(determinant) || determinant === 0) return null;
  const g = (dx * cy - cx * dy) / determinant;
  const h = (bx * dy - dx * by) / determinant;
  const m = [b.x - a.x + g * b.x, d.x - a.x + h * d.x, a.x,
    b.y - a.y + g * b.y, d.y - a.y + h * d.y, a.y, g, h, 1];
  // Adjugate: the common determinant cancels during homogeneous division.
  return [
    m[4] - m[5] * m[7], m[2] * m[7] - m[1], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3], m[0] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
}

function gridColors(grid: Grid) {
  const colors = new Float64Array(grid.cells.length * grid.cells[0].length * 4);
  let offset = 0;
  for (const row of grid.cells) for (const color of row) {
    if (color !== null) {
      const alpha = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1;
      // Premultiplication keeps transparent cells from introducing dark or
      // invisible RGB fringes into their opaque neighbors.
      for (let channel = 0; channel < 3; channel++)
        colors[offset + channel] = parseInt(color.slice(1 + channel * 2, 3 + channel * 2), 16) * alpha;
      colors[offset + 3] = alpha * 255;
    }
    offset += 4;
  }
  return colors;
}

export function paintGrid(grid: Grid, project: Project, width: number, height: number, pixels: Uint32Array) {
  pixels.fill(0);
  const [west, south, east, north] = grid.bounds;
  const points = ([[west, north], [east, north], [east, south], [west, south]] as Position[]).map(project);
  const inverse = inverseProjection(points);
  if (!inverse) return;
  const colors = gridColors(grid), rows = grid.cells.length, columns = grid.cells[0].length;
  const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  const top = mercatorY(north), bottom = mercatorY(south);
  const firstRow = Math.max(0, Math.ceil(Math.min(...points.map(p => p.y)) - 0.5));
  const lastRow = Math.min(height, Math.ceil(Math.max(...points.map(p => p.y)) - 0.5));

  // One coverage polygon avoids seams. Color is sampled in geographic space,
  // so zoom, rotation and pitch preserve the positions of the cell centers.
  for (let row = firstRow; row < lastRow; row++) {
    const y = row + 0.5, intersections: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a.y <= y && y < b.y) || (b.y <= y && y < a.y))
        intersections.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
    }
    if (intersections.length < 2) continue;
    const left = Math.max(0, Math.ceil(Math.min(...intersections) - 0.5));
    const right = Math.min(width, Math.ceil(Math.max(...intersections) - 0.5));
    for (let column = left; column < right; column++) {
      const x = column + 0.5;
      const divisor = inverse[6] * x + inverse[7] * y + inverse[8];
      const u = (inverse[0] * x + inverse[1] * y + inverse[2]) / divisor;
      const v = (inverse[3] * x + inverse[4] * y + inverse[5]) / divisor;
      const latitude = (2 * Math.atan(Math.exp(top + (bottom - top) * v)) - Math.PI / 2) * 180 / Math.PI;
      // Extend the outermost centers to the authored bounds; do not bleed out.
      const gx = Math.max(0, Math.min(columns - 1, u * columns - 0.5));
      const gy = Math.max(0, Math.min(rows - 1, (north - latitude) / (north - south) * rows - 0.5));
      const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const nw = (y0 * columns + x0) * 4, ne = (y0 * columns + Math.min(x0 + 1, columns - 1)) * 4;
      const sw = (Math.min(y0 + 1, rows - 1) * columns + x0) * 4;
      const se = (Math.min(y0 + 1, rows - 1) * columns + Math.min(x0 + 1, columns - 1)) * 4;
      const wNW = (1 - fx) * (1 - fy), wNE = fx * (1 - fy), wSW = (1 - fx) * fy, wSE = fx * fy;
      const alpha = colors[nw + 3] * wNW + colors[ne + 3] * wNE + colors[sw + 3] * wSW + colors[se + 3] * wSE;
      const offset = (row * width + column) * 4;
      if (alpha < 0.5) continue;
      for (let channel = 0; channel < 3; channel++) {
        const value = colors[nw + channel] * wNW + colors[ne + channel] * wNE + colors[sw + channel] * wSW + colors[se + channel] * wSE;
        bytes[offset + channel] = Math.round(value * 255 / alpha);
      }
      bytes[offset + 3] = Math.round(alpha);
    }
  }
}
