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
      paint: { 'line-color': ['get', 'strokeColor'], 'line-width': ['get', 'strokeWidth'], 'line-opacity': ['get', 'strokeOpacity'] },
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
  moving = false,
}: {
  camera: Camera;
  countries: FeatureCollection;
  regions: Regions;
  provinces: FeatureCollection;
  events: CompiledEvent[];
  frame: number;
  inset?: boolean;
  moving?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<MapInstance | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const markers = useRef<HTMLDivElement>(null);
  const snapshot = useRef<HTMLCanvasElement>(null);
  const outlineSnapshot = useRef<HTMLCanvasElement>(null);
  const pulseLayers = useRef<HTMLDivElement>(null);
  const geometrySignature = useRef('');
  const completedSignature = useRef('');
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
        canvasContextAttributes: { alpha: true, preserveDrawingBuffer: true, antialias: true },
      });
    } catch (e) {
      cancelRender(e as Error);
      return;
    }
    map.current = m;
    geometrySignature.current = '';
    completedSignature.current = '';
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
    const regionsNow = events.filter((e) => e.type === 'region');
    const signature = JSON.stringify([
      camera,
      moving,
      events.filter((e) => ['region', 'marker', 'zone', 'line'].includes(e.type)),
      moving && regionsNow.some((e) => e.pulse) ? frame : null,
    ]);
    if (signature === completedSignature.current) return;
    const handle = delayRender(`Map frame ${frame}`);
    const update = () => {
      try {
        m.getCanvas().style.visibility = 'visible';
        if (snapshot.current) snapshot.current.style.display = 'none';
        if (outlineSnapshot.current) outlineSnapshot.current.style.display = 'none';
        if (pulseLayers.current) pulseLayers.current.replaceChildren();
        for (const layer of m.getStyle().layers)
          m.setLayoutProperty(layer.id, 'visibility', 'visible');
        m.setFilter('highlight-fill', null);
        m.jumpTo({
          center: camera.center,
          zoom: camera.zoom,
          bearing: camera.bearing,
          pitch: camera.pitch,
        });

        const regionSignature = JSON.stringify(regionsNow);
        if (regionSignature !== geometrySignature.current) {
          const features = regionsNow.flatMap((e) =>
            regions.features
              .filter((f) => e.regions.includes(String(f.id)))
              .map((f) => ({
                ...f,
                id: `${e.id}:${f.id}`,
                properties: { ...f.properties, color: e.color, eventId: e.id,
                  strokeColor: e.strokeColor ?? e.color, strokeWidth: e.strokeWidth,
                  strokeOpacity: e.strokeOpacity },
              })),
          );
          (m.getSource('highlights') as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features,
          });
          geometrySignature.current = regionSignature;
        }
        // Frame-based opacity changes do not retile the unchanged geographic polygons.
        const opacity: unknown[] = ['match', ['get', 'eventId']];
        for (const event of regionsNow)
          opacity.push(
            event.id,
            event.pulse
              ? moving
                ? event.fillOpacity * (0.65 + 0.175 * (1 + Math.sin(((frame - event.start) / 60) * Math.PI)))
                : 0
              : event.fillOpacity,
          );
        opacity.push(0.36);
        m.setPaintProperty(
          'highlight-fill',
          'fill-opacity',
          regionsNow.length ? (opacity as maplibregl.ExpressionSpecification) : 0.36,
        );
        // Static pulse fills are composited below a separate outline snapshot.
        m.setLayoutProperty('highlight-line', 'visibility', moving ? 'visible' : 'none');
        m.once('idle', () => {
          document.fonts.ready
            .then(async () => {
              if (markers.current) {
                for (const element of markers.current.querySelectorAll<HTMLElement>('[data-lng]')) {
                  const p = m.project([Number(element.dataset.lng), Number(element.dataset.lat)]);
                  element.style.left = `${p.x}px`;
                  element.style.top = `${p.y}px`;
                }
                for (const element of markers.current.querySelectorAll<SVGElement>(
                  '[data-geometry]',
                )) {
                  const points = JSON.parse(element.dataset.geometry!) as [number, number][];
                  element.setAttribute(
                    'points',
                    points
                      .map((point) => {
                        const p = m.project(point);
                        return `${p.x},${p.y}`;
                      })
                      .join(' '),
                  );
                }
                arrangeLabels(markers.current);
              }
              if (!moving && snapshot.current) {
                const image = snapshot.current;
                image.width = m.getCanvas().width;
                image.height = m.getCanvas().height;
                image.getContext('2d')!.drawImage(m.getCanvas(), 0, 0);
                for (const event of regionsNow.filter((e) => e.pulse && e.fillOpacity > 0)) {
                  for (const layer of m.getStyle().layers)
                    m.setLayoutProperty(
                      layer.id,
                      'visibility',
                      layer.id === 'highlight-fill' ? 'visible' : 'none',
                    );
                  m.setFilter('highlight-fill', ['==', ['get', 'eventId'], event.id]);
                  m.setPaintProperty('highlight-fill', 'fill-opacity', 1);
                  await new Promise<void>((resolve) => {
                    m.once('idle', () => resolve());
                    m.triggerRepaint();
                  });
                  const layer = document.createElement('canvas');
                  layer.width = m.getCanvas().width;
                  layer.height = m.getCanvas().height;
                  layer.getContext('2d')!.drawImage(m.getCanvas(), 0, 0);
                  layer.dataset.start = String(event.start);
                  layer.dataset.opacity = String(event.fillOpacity);
                  Object.assign(layer.style, {
                    position: 'absolute',
                    inset: '0',
                    width: '100%',
                    height: '100%',
                    opacity: String(
                      event.fillOpacity * (0.65 + 0.175 * (1 + Math.sin(((frame - event.start) / 60) * Math.PI))),
                    ),
                  });
                  pulseLayers.current!.append(layer);
                }
                for (const layer of m.getStyle().layers)
                  m.setLayoutProperty(layer.id, 'visibility', layer.id === 'highlight-line' ? 'visible' : 'none');
                await new Promise<void>((resolve) => {
                  m.once('idle', () => resolve());
                  m.triggerRepaint();
                });
                const outlines = outlineSnapshot.current!;
                outlines.width = m.getCanvas().width;
                outlines.height = m.getCanvas().height;
                outlines.getContext('2d')!.drawImage(m.getCanvas(), 0, 0);
                outlines.style.display = 'block';
                image.style.display = 'block';
                m.getCanvas().style.visibility = 'hidden';
              }
              completedSignature.current = signature;
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
    moving,
    events,
    frame,
  ]);
  useEffect(() => {
    for (const image of pulseLayers.current?.querySelectorAll<HTMLCanvasElement>('canvas') ?? [])
      image.style.opacity = String(
        Number(image.dataset.opacity) * (0.65 + 0.175 * (1 + Math.sin(((frame - Number(image.dataset.start)) / 60) * Math.PI))),
      );
  }, [frame]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <style>{'.maplibregl-canvas {position:absolute;left:0;top:0;}'}</style>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      <canvas
        ref={snapshot}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'none' }}
      />
      <div ref={pulseLayers} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <canvas ref={outlineSnapshot} aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'none' }} />
      <div ref={markers} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {events.map((e) => {
            if (e.type === 'zone')
              return (
                <polygon
                  key={e.id}
                  data-geometry={JSON.stringify(e.points)}
                  fill={e.color}
                  fillOpacity={e.opacity}
                  stroke={e.color}
                  strokeWidth={1.5}
                />
              );
            if (e.type !== 'line') return null;
            const progress = e.drawSeconds
              ? Math.min(1, (frame - e.start) / 60 / e.drawSeconds)
              : 1;
            const maskId = `${inset ? 'inset' : 'main'}-${e.id}`;
            return (
              <g key={e.id}>
                <defs>
                  <mask
                    id={maskId}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                  >
                    <polyline
                      data-geometry={JSON.stringify(e.points)}
                      fill="none"
                      stroke="white"
                      strokeWidth={e.width + 2}
                      pathLength={1}
                      strokeDasharray={`${progress} 2`}
                    />
                  </mask>
                </defs>
                <polyline
                  data-geometry={JSON.stringify(e.points)}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={e.width}
                  strokeDasharray={e.dashed ? '8 7' : undefined}
                  mask={`url(#${maskId})`}
                />
              </g>
            );
          })}
        </svg>
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
                {e.label && (
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
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
