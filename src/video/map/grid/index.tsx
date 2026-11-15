import React, { useLayoutEffect, useRef } from 'react';
import type { Grid } from '../../../grid.js';
import type { CompiledEvent } from '../../../scenario.js';
import { envelope } from '../../../timeline.js';
import { paintGrid, type Project } from './raster.js';

type GridEvent = Extract<CompiledEvent, { type: 'grid' }>;
export type GridProjection = {
  cameraKey: string;
  width: number;
  height: number;
  pixelRatio: number;
  project: Project;
};

function drawGrid(canvas: HTMLCanvasElement, grid: Grid, projection: GridProjection) {
  const { width, height, pixelRatio, project } = projection;
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

function GridCanvas({ event, grid, projection, frame }: {
  event: GridEvent;
  grid: Grid;
  projection: GridProjection | null;
  frame: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<{ key: string; grid: Grid } | null>(null);

  useLayoutEffect(() => {
    if (!canvas.current || !projection) return;
    const { cameraKey, width, height, pixelRatio } = projection;
    const key = JSON.stringify([cameraKey, width, height, pixelRatio]);
    if (drawn.current?.key === key && drawn.current.grid === grid) return;
    drawGrid(canvas.current, grid, projection);
    drawn.current = { key, grid };
  }, [grid, projection]);

  return <canvas ref={canvas} data-grid-asset={event.asset} aria-hidden="true" style={{
    position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
    opacity: event.opacity * envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut),
  }} />;
}

export function MapGrids({ events, grids, projection, frame }: {
  events: GridEvent[];
  grids: Record<string, Grid>;
  projection: GridProjection | null;
  frame: number;
}) {
  return <>{events.map(event => {
    if (!Object.hasOwn(grids, event.asset)) throw Error(`Grid: missing asset ${event.asset}`);
    return <GridCanvas key={event.id} event={event} grid={grids[event.asset]} projection={projection} frame={frame} />;
  })}</>;
}
