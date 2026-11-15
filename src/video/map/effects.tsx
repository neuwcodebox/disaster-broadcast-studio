import React from 'react';
import { FPS, type CompiledEvent } from '../../scenario.js';
import { envelope } from '../../timeline.js';

type Circle = Extract<CompiledEvent, { type: 'circle' }>;
type Line = Extract<CompiledEvent, { type: 'line' }>;
type Marker = Extract<CompiledEvent, { type: 'marker' }>;
const radians = Math.PI / 180;
const earthRadiusKm = 6371.0088;
const pulseFrames = 2.4 * FPS;

// Direct geodesic on a sphere. Keep longitudes near the center so a circle
// crossing the date line projects as one local shape rather than a world span.
export function circleGeometry(center: [number, number], radiusKm: number): [number, number][] {
  const [longitude, latitude] = center.map((v) => v * radians);
  const distance = radiusKm / earthRadiusKm;
  const points: [number, number][] = Array.from({ length: 96 }, (_, i) => {
    const bearing = i * Math.PI * 2 / 96;
    const lat = Math.asin(Math.max(-1, Math.min(1,
      Math.sin(latitude) * Math.cos(distance) +
      Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing),
    )));
    const lon = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
      Math.cos(distance) - Math.sin(latitude) * Math.sin(lat),
    );
    return [lon / radians, lat / radians];
  });
  return [...points, [...points[0]]];
}

export function circleAt(event: Circle, frame: number) {
  const phase = Math.max(0, frame - event.start) % pulseFrames / pulseFrames;
  const fade = envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut);
  return {
    points: circleGeometry(event.center, event.radiusKm * (event.pulse ? 0.12 + phase * 0.88 : 1)),
    opacity: fade * (event.pulse ? 1 - phase : 1),
  };
}

export function lineAt(event: Line, frame: number) {
  return {
    progress: event.drawSeconds
      ? Math.max(0, Math.min(1, (frame - event.start) / FPS / event.drawSeconds)) : 1,
    opacity: envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut),
    dashOffset: event.dashed ? -(frame - event.start) / FPS * event.flowSpeed * 15 : 0,
  };
}

export function markerAt(event: Marker, frame: number) {
  const age = Math.max(0, frame - event.start) / FPS;
  const phase = age % 2.4 / 2.4;
  return {
    size: event.effect === 'ring' ? 24 + Math.min(age, 3) * 25 : 13,
    opacity: event.effect === 'ring' ? Math.max(0.3, 1 - age / 4) : 1,
    pulseSize: 20 + phase * 84,
    pulseOpacity: 1 - phase,
  };
}

export function MapShapes({ events, frame, inset = false }: {
  events: CompiledEvent[]; frame: number; inset?: boolean;
}) {
  return <>{events.map((event) => {
    if (event.type === 'circle') {
      const circle = circleAt(event, frame);
      return <polygon key={event.id} data-geometry={JSON.stringify(circle.points)}
        fill={event.color} fillOpacity={event.fillOpacity}
        stroke={event.color} strokeWidth={event.strokeWidth} opacity={circle.opacity} />;
    }
    if (event.type === 'zone') return <polygon key={event.id}
      data-geometry={JSON.stringify(event.points)} fill={event.color}
      fillOpacity={event.opacity} stroke={event.color} strokeWidth={1.5} />;
    if (event.type !== 'line') return null;
    const line = lineAt(event, frame);
    const maskId = `${inset ? 'inset' : 'main'}-${event.id}`;
    return <g key={event.id} opacity={line.opacity}>
      <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
        <polyline data-geometry={JSON.stringify(event.points)} fill="none" stroke="white"
          strokeWidth={event.width + 2} pathLength={1} strokeDasharray={`${line.progress} 2`} />
      </mask></defs>
      <polyline data-geometry={JSON.stringify(event.points)} fill="none" stroke={event.color}
        strokeWidth={event.width} strokeDasharray={event.dashed ? '8 7' : undefined}
        strokeDashoffset={event.dashed ? line.dashOffset : undefined} mask={`url(#${maskId})`} />
    </g>;
  })}</>;
}

export function MarkerGlyph({ event, frame }: { event: Marker; frame: number }) {
  const marker = markerAt(event, frame);
  return <>
    {event.effect === 'pulse' && <div style={{
      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      width: marker.pulseSize, height: marker.pulseSize, border: `2px solid ${event.color}`,
      borderRadius: '50%', opacity: marker.pulseOpacity,
    }} />}
    <div style={{ width: marker.size, height: marker.size, border: `2px solid ${event.color}`,
      background: event.effect === 'ring' ? 'transparent' : event.color,
      borderRadius: '50%', opacity: marker.opacity,
    }} />
  </>;
}
