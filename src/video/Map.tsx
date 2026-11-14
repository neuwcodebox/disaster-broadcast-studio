import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapInstance, GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import { useDelayRender, cancelRender, staticFile } from 'remotion';
import type { FeatureCollection } from 'geojson';
import type { Camera, CompiledEvent } from '../scenario.js';
import type { Regions } from '../load.js';

const style = (
  countries: FeatureCollection,
  regions: Regions,
  provinces: FeatureCollection,
): StyleSpecification => ({
  version: 8,
  sources: {
    land: { type: 'geojson', data: countries, tolerance: 0 },
    regions: { type: 'geojson', data: regions, tolerance: 0 },
    provinces: { type: 'geojson', data: provinces, tolerance: 0 },
    highlights: {
      type: 'geojson',
      tolerance: 0,
      data: { type: 'FeatureCollection', features: [] },
    },
  },
  layers: [
    { id: 'sea', type: 'background', paint: { 'background-color': '#0a0c0e' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#262a2d' } },
    {
      id: 'coast',
      type: 'line',
      source: 'land',
      paint: { 'line-color': '#697075', 'line-width': 1.1 },
    },
    {
      id: 'regions',
      type: 'fill',
      source: 'regions',
      paint: { 'fill-color': '#262a2d', 'fill-opacity': 1 },
    },
    {
      id: 'boundaries',
      type: 'line',
      source: 'regions',
      paint: {
        'line-color': '#596168',
        'line-opacity': 0.6,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.3, 9, 0.7],
      },
    },
    {
      id: 'provinces',
      type: 'line',
      source: 'provinces',
      paint: {
        'line-color': '#899096',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 9, 1.2],
        'line-opacity': 0.65,
      },
    },
    {
      id: 'highlight-fill',
      type: 'fill',
      source: 'highlights',
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.36 },
    },
    {
      id: 'highlight-line',
      type: 'line',
      source: 'highlights',
      paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
    },
  ],
});
function regionCenter(regions: Regions, ids: string[]): [number, number] {
  const feature = regions.features.find((f) => ids.includes(String(f.id)))!;
  if (
    Number.isFinite(feature.properties?.label_lon) &&
    Number.isFinite(feature.properties?.label_lat)
  )
    return [feature.properties!.label_lon, feature.properties!.label_lat];
  return feature.geometry.type === 'Polygon'
    ? (feature.geometry.coordinates[0][0] as [number, number])
    : (feature.geometry.coordinates[0][0][0] as [number, number]);
}
const labels: [string, [number, number]][] = [
  ['서울', [126.98, 37.57]],
  ['인천', [126.7, 37.46]],
  ['춘천', [127.73, 37.88]],
  ['강릉', [128.9, 37.75]],
  ['대전', [127.38, 36.35]],
  ['대구', [128.6, 35.87]],
  ['부산', [129.07, 35.18]],
  ['광주', [126.85, 35.16]],
  ['전주', [127.15, 35.82]],
  ['목포', [126.39, 34.81]],
  ['울산', [129.31, 35.54]],
  ['제주', [126.53, 33.5]],
  ['평양', [125.75, 39.03]],
  ['백령도', [124.65, 37.97]],
];
function arrangeLabels(container: HTMLDivElement) {
  const occupied: DOMRect[] = [];
  const texts = Array.from(container.querySelectorAll<HTMLElement>('[data-map-text]')).sort(
    (a, b) => Number(b.dataset.mapPriority) - Number(a.dataset.mapPriority),
  );
  const overlaps = (rect: DOMRect) =>
    occupied.some(
      (other) =>
        rect.left < other.right + 7 &&
        rect.right > other.left - 7 &&
        rect.top < other.bottom + 5 &&
        rect.bottom > other.top - 5,
    );
  for (const element of texts) {
    element.style.visibility = 'visible';
    element.style.marginTop = '0px';
    const priority = Number(element.dataset.mapPriority);
    let rect = element.getBoundingClientRect();
    if (priority > 0) {
      for (const dy of [0, 32, -32, 64, -64]) {
        element.style.marginTop = `${dy}px`;
        rect = element.getBoundingClientRect();
        if (!overlaps(rect)) break;
      }
    } else if (overlaps(rect)) {
      element.style.visibility = 'hidden';
      continue;
    }
    occupied.push(rect);
  }
}
export function BroadcastMap({
  camera,
  countries,
  regions,
  provinces,
  events,
  frame,
  inset = false,
}: {
  camera: Camera;
  countries: FeatureCollection;
  regions: Regions;
  provinces: FeatureCollection;
  events: CompiledEvent[];
  frame: number;
  inset?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<MapInstance | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const markers = useRef<HTMLDivElement>(null);
  const geometrySignature = useRef('');
  // Initialize once. Every camera/layer update is explicitly awaited before capture.
  useEffect(() => {
    const handle = delayRender('Initializing offline map');
    let m: MapInstance;
    maplibregl.setWorkerUrl(staticFile('maplibre-gl-worker.mjs'));
    try {
      m = new maplibregl.Map({
        container: container.current!,
        style: style(countries, regions, provinces),
        center: camera.center,
        zoom: camera.zoom,
        bearing: camera.bearing,
        pitch: camera.pitch,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
      });
    } catch (e) {
      cancelRender(e as Error);
      return;
    }
    map.current = m;
    geometrySignature.current = '';
    m.on('error', (e) => cancelRender(new Error(`MapLibre: ${e.error.message}`)));
    m.once('load', () => {
      m.resize();
      continueRender(handle);
    });
    return () => {
      map.current = null;
      m.remove();
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const handle = delayRender(`Map frame ${frame}`);
    const update = () => {
      try {
        m.jumpTo({
          center: camera.center,
          zoom: camera.zoom,
          bearing: camera.bearing,
          pitch: camera.pitch,
        });
        const regionsNow = events.filter((e) => e.type === 'region');
        const signature = JSON.stringify(regionsNow.map((e) => [e.id, e.regions, e.color]));
        if (signature !== geometrySignature.current) {
          const features = regionsNow.flatMap((e) =>
            regions.features
              .filter((f) => e.regions.includes(String(f.id)))
              .map((f) => ({
                ...f,
                id: `${e.id}:${f.id}`,
                properties: { ...f.properties, color: e.color, eventId: e.id },
              })),
          );
          (m.getSource('highlights') as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features,
          });
          geometrySignature.current = signature;
        }
        // Frame-based opacity changes do not retile the unchanged geographic polygons.
        const opacity: unknown[] = ['match', ['get', 'eventId']];
        for (const event of regionsNow)
          opacity.push(
            event.id,
            event.pulse
              ? 0.23 + 0.12 * (1 + Math.sin(((frame - event.start) / 60) * Math.PI))
              : 0.36,
          );
        opacity.push(0.36);
        m.setPaintProperty('highlight-fill', 'fill-opacity', regionsNow.length ? (opacity as maplibregl.ExpressionSpecification) : 0.36);
        m.once('idle', () => {
          document.fonts.ready
            .then(() => {
              if (markers.current) {
                for (const element of markers.current.querySelectorAll<HTMLElement>('[data-lng]')) {
                  const p = m.project([Number(element.dataset.lng), Number(element.dataset.lat)]);
                  element.style.left = `${p.x}px`;
                  element.style.top = `${p.y}px`;
                }
                arrangeLabels(markers.current);
              }
              continueRender(handle);
            })
            .catch(cancelRender);
        });
        m.triggerRepaint();
      } catch (e) {
        cancelRender(e as Error);
      }
    };
    if (m.isStyleLoaded()) update();
    else m.once('load', update);
    return () => {
      m.off('load', update);
    };
  }, [
    camera.center[0],
    camera.center[1],
    camera.zoom,
    camera.bearing,
    camera.pitch,
    events,
    frame,
  ]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <style>{'.maplibregl-canvas {position:absolute;left:0;top:0;}'}</style>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      <div ref={markers} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {labels.map(([name, p]) => (
          <div
            key={name}
            data-map-text="context"
            data-map-priority={0}
            data-lng={p[0]}
            data-lat={p[1]}
            style={{
              position: 'absolute',
              transform: 'translate(-50%,-50%)',
              fontSize: inset ? 15 : 18,
              color: '#b3bbc1',
              textShadow: '0 1px 2px #000',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
        ))}
        {events
          .filter((e) => e.type === 'region' && e.label)
          .map((e) => {
            if (e.type !== 'region') return null;
            const p = regionCenter(regions, e.regions);
            return (
              <div
                key={e.id}
                data-map-text="region"
                data-map-priority={1}
                data-lng={p[0]}
                data-lat={p[1]}
                style={{
                  position: 'absolute',
                  transform: 'translate(-50%,-50%)',
                  background: '#0b0e10f2',
                  padding: '6px 12px',
                  borderLeft: `3px solid ${e.color}`,
                  fontSize: 18,
                  color: e.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {e.label}
              </div>
            );
          })}
        {events
          .filter((e) => e.type === 'marker')
          .map((e) => {
            if (e.type !== 'marker') return null;
            const age = (frame - e.start) / 60,
              ring = e.effect === 'ring',
              size = ring ? 24 + Math.min(age, 3) * 25 : 13;
            return (
              <div
                key={e.id}
                data-lng={e.position[0]}
                data-lat={e.position[1]}
                style={{ position: 'absolute', transform: 'translate(-50%,-50%)' }}
              >
                <div
                  style={{
                    width: size,
                    height: size,
                    border: `2px solid ${e.color}`,
                    background: ring ? 'transparent' : e.color,
                    borderRadius: '50%',
                    opacity: ring ? Math.max(0.3, 1 - age / 4) : 1,
                  }}
                />
                <span
                  data-map-text="marker"
                  data-map-priority={2}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 'calc(100% + 10px)',
                    transform: 'translateY(-50%)',
                    fontSize: 22,
                    fontWeight: 600,
                    color: e.color,
                    whiteSpace: 'nowrap',
                    textShadow: '0 2px 4px #000',
                    paddingTop: 7,
                  }}
                >
                  {e.label}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
