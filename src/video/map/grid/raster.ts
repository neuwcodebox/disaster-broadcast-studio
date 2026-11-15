import type { Grid } from '../../../grid.js';

type Position = [number, number];
type Point = { x: number; y: number };
export type Project = (position: Position) => Point;

// Merge adjacent equal cells; coordinates are shared by both map cameras.
export function* gridRuns(grid: Grid) {
  const [west, south, east, north] = grid.bounds;
  const rows = grid.cells.length;
  const columns = grid.cells[0].length;
  const longitude = (column: number) => west + (east - west) * column / columns;
  const latitude = (row: number) => north - (north - south) * row / rows;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns;) {
      const color = grid.cells[row][column];
      const start = column++;
      while (column < columns && grid.cells[row][column] === color) column++;
      if (color === null) continue;

      yield {
        color,
        points: [
          [longitude(start), latitude(row)],
          [longitude(column), latitude(row)],
          [longitude(column), latitude(row + 1)],
          [longitude(start), latitude(row + 1)],
        ] as Position[],
      };
    }
  }
}

function rgbaPixel(color: string) {
  const bytes = new Uint8Array([
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
    color.length === 9 ? parseInt(color.slice(7, 9), 16) : 255,
  ]);
  // Use the platform's byte order so ImageData always receives RGBA bytes.
  return new Uint32Array(bytes.buffer)[0];
}

// Sample coverage at pixel centers: antialiasing each cell independently leaves
// hairline gaps at shared edges, which look like unintended grid lines.
function fillPolygon(points: Point[], color: number, width: number, height: number, pixels: Uint32Array) {
  const firstRow = Math.max(0, Math.ceil(Math.min(...points.map(p => p.y)) - 0.5));
  const lastRow = Math.min(height, Math.ceil(Math.max(...points.map(p => p.y)) - 0.5));

  for (let row = firstRow; row < lastRow; row++) {
    const y = row + 0.5;
    const intersections: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if ((a.y <= y && y < b.y) || (b.y <= y && y < a.y))
        intersections.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
    }
    if (intersections.length < 2) continue;

    const left = Math.max(0, Math.ceil(Math.min(...intersections) - 0.5));
    const right = Math.min(width, Math.ceil(Math.max(...intersections) - 0.5));
    if (left < right) pixels.fill(color, row * width + left, row * width + right);
  }
}

export function paintGrid(grid: Grid, project: Project, width: number, height: number, pixels: Uint32Array) {
  const colors = new Map<string, number>();
  for (const run of gridRuns(grid)) {
    let color = colors.get(run.color);
    if (color === undefined) {
      color = rgbaPixel(run.color);
      colors.set(run.color, color);
    }
    fillPolygon(run.points.map(project), color, width, height, pixels);
  }
}
