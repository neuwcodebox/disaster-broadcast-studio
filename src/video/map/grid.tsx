import React from 'react';
import type { Grid } from '../../grid.js';
import type { CompiledEvent } from '../../scenario.js';
import { envelope } from '../../timeline.js';

export type GridEvent = Extract<CompiledEvent, { type: 'grid' }>;
type Position = [number, number];
type Project = (position: Position) => { x: number; y: number };

// Merge adjacent equal cells. Cell edges are shared in geographic coordinates,
// so both the main and inset maps can use their own camera projection.
export function* gridRuns(grid: Grid) {
  const [west, south, east, north] = grid.bounds;
  const rows = grid.cells.length, columns = grid.cells[0].length;
  const longitude = (column: number) => west + (east - west) * column / columns;
  const latitude = (row: number) => north - (north - south) * row / rows;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns;) {
      const color = grid.cells[row][column];
      const start = column++;
      while (column < columns && grid.cells[row][column] === color) column++;
      if (color === null) continue;
      yield { color, points: [
        [longitude(start), latitude(row)], [longitude(column), latitude(row)],
        [longitude(column), latitude(row + 1)], [longitude(start), latitude(row + 1)],
      ] as Position[] };
    }
  }
}

// Sample cell coverage at pixel centers. Independently antialiased canvas paths
// leave hairline gaps at shared edges, which look like unintended grid lines.
export function paintGrid(grid: Grid, project: Project, width: number, height: number, pixels: Uint32Array) {
  const colors = new Map<string, number>();
  for (const run of gridRuns(grid)) {
    let color = colors.get(run.color);
    if (color === undefined) {
      const bytes = [1, 3, 5, 7].map((offset) => offset === 7 && run.color.length === 7
        ? 255 : parseInt(run.color.slice(offset, offset + 2), 16));
      color = new Uint32Array(new Uint8Array(bytes).buffer)[0];
      colors.set(run.color, color);
    }
    const points = run.points.map(project);
    const firstRow = Math.max(0, Math.ceil(Math.min(...points.map(p => p.y)) - 0.5));
    const lastRow = Math.min(height, Math.ceil(Math.max(...points.map(p => p.y)) - 0.5));
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
      if (left < right) pixels.fill(color, row * width + left, row * width + right);
    }
  }
}

export function drawGrid(canvas: HTMLCanvasElement, grid: Grid, project: Project,
  width: number, height: number, pixelRatio: number) {
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext('2d');
  if (!context) throw Error('Grid: could not create a 2D canvas');
  const image = context.createImageData(canvas.width, canvas.height);
  paintGrid(grid, position => {
    const p = project(position);
    return { x: p.x * pixelRatio, y: p.y * pixelRatio };
  }, canvas.width, canvas.height, new Uint32Array(image.data.buffer));
  context.putImageData(image, 0, 0);
}

export function MapGrids({ events, frame }: { events: GridEvent[]; frame: number }) {
  return <>{events.map((event) => <canvas key={event.id} data-grid-asset={event.asset}
    aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', opacity: event.opacity * envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut),
    }} />)}</>;
}
