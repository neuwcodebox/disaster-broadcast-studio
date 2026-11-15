import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapInstance, StyleSpecification } from 'maplibre-gl';
import { useBufferState, useDelayRender, useRemotionEnvironment, staticFile } from 'remotion';
import type { FeatureCollection } from 'geojson';
import { type Camera, type CompiledEvent } from '../scenario.js';
import type { Regions } from '../load.js';
import {regionOpacity} from '../timeline.js';
import { circleAt, MapShapes, MarkerGlyph } from './map/effects.js';
const style = (
  countries: FeatureCollection,
  regions: Regions,
  provinces: FeatureCollection,
): StyleSpecification => ({
  version: 8,
  transition: { duration: 0, delay: 0 },
  sources: {
    land: { type: 'geojson', data: countries, tolerance: 0 },
    regions: { type: 'geojson', data: regions, tolerance: 0 },
    provinces: { type: 'geojson', data: provinces, tolerance: 0 },

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
export function BroadcastMap({camera,countries,regions,provinces,events,frame,inset=false}: {
  camera:Camera;countries:FeatureCollection;regions:Regions;provinces:FeatureCollection;
  events:CompiledEvent[];frame:number;inset?:boolean;
}) {
  const container=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null);
  const snapshot=useRef<HTMLCanvasElement>(null),markers=useRef<HTMLDivElement>(null);
  const paths=useRef(new Map<string,string>()),capturedCamera=useRef(''),completed=useRef('');
  const {delayRender,continueRender,cancelRender}=useDelayRender();
  const buffer = useBufferState();
  const { isRendering } = useRemotionEnvironment();
  const pending=useRef<(()=>void)|null>(null);
  const [revision,setRevision]=useState(0);
  useLayoutEffect(()=>{pending.current?.();pending.current=null;},[revision]);
  useEffect(()=>{
    const handle=delayRender('Initializing offline map');
    const playback = buffer.delayPlayback();
    maplibregl.setWorkerUrl(staticFile('maplibre-gl-worker.mjs'));
    let m:MapInstance;
    try {
      m=new maplibregl.Map({container:container.current!,style:style(countries,regions,provinces),
        ...camera,interactive:false,attributionControl:false,fadeDuration:0,
        canvasContextAttributes:{alpha:true,preserveDrawingBuffer:isRendering,antialias:true}});
    } catch(e){playback.unblock();continueRender(handle);cancelRender(e as Error);return;}
    map.current=m;
    m.on('error',e=>cancelRender(new Error(`MapLibre: ${e.error.message}`)));
    m.once('load',()=>{m.resize();continueRender(handle);playback.unblock();});
    return()=>{playback.unblock();continueRender(handle);map.current=null;m.remove();};
  },[]);
  const cameraKey=JSON.stringify(camera);
  const regionEvents=events.filter(e=>e.type==='region');
  const ids=[...new Set(regionEvents.flatMap(e=>e.regions))].sort();
  const circles = events.filter(e => e.type === 'circle');
  const circlePoints = circles.map(e => circleAt(e, frame).points);
  const requestKey=JSON.stringify([cameraKey,ids,events.filter(e=>['marker','circle','zone','line'].includes(e.type)),circlePoints]);
  useEffect(()=>{
    const m=map.current;if(!m||requestKey===completed.current)return;
    const handle=delayRender(`Projecting map frame ${frame}`);let settled=false,cancelled=false;
    const playback = isRendering ? buffer.delayPlayback() : null;
    const finish=()=>{if(!settled){settled=true;continueRender(handle);playback?.unblock();}};
    const project=()=>{
      if(cancelled)return;
      try {
        if(capturedCamera.current!==cameraKey){
          if (isRendering) {
            const canvas=snapshot.current!;canvas.width=m.getCanvas().width;canvas.height=m.getCanvas().height;
            canvas.getContext('2d')!.drawImage(m.getCanvas(),0,0);
          }
          capturedCamera.current=cameraKey;paths.current.clear();
        }
        for(const id of ids)if(!paths.current.has(id)){
          const f=regions.features.find(f=>String(f.id)===id)!;
          const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
          paths.current.set(id,polygons.flatMap(poly=>poly.map(ring=>ring.map((coord,i)=>{
            const p=m.project([coord[0],coord[1]]);return `${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          }).join('')+'Z')).join(''));
        }
        if(markers.current){
          for(const el of markers.current.querySelectorAll<HTMLElement>('[data-lng]')){
            const p=m.project([Number(el.dataset.lng),Number(el.dataset.lat)]);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;
          }
          for(const el of markers.current.querySelectorAll<SVGElement>('[data-geometry]')){
            const coords=JSON.parse(el.dataset.geometry!) as [number,number][];
            el.setAttribute('points',coords.map(c=>{const p=m.project(c);return `${p.x},${p.y}`;}).join(' '));
          }
          arrangeLabels(markers.current);
        }
        completed.current=requestKey;pending.current=finish;setRevision(n=>n+1);
      }catch(e){finish();cancelRender(e as Error);}
    };
    const update=()=>{
      // Playback lets MapLibre paint continuously. Waiting for idle and reading
      // the WebGL canvas on every moving frame is only needed for file output.
      if (!isRendering) { m.jumpTo(camera); project(); return; }
      if(capturedCamera.current===cameraKey){project();return;}
      m.once('idle',project);m.jumpTo(camera);m.triggerRepaint();
    };
    if(m.isStyleLoaded())update();else m.once('load',update);
    return()=>{cancelled=true;m.off('load',update);m.off('idle',project);finish();};
  },[requestKey]);
  return <div style={{position:'absolute',inset:0,overflow:'hidden'}}>
    <style>{'.maplibregl-canvas {position:absolute;left:0;top:0;}'}</style>
    <div ref={container} style={{position:'absolute',inset:0,opacity:isRendering?0:1,pointerEvents:'none'}}/>
    {isRendering && <canvas ref={snapshot} aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>}
    <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}}>
      <g>{regionEvents.map(e=>e.regions.map(id=><path key={`${e.id}-${id}`} d={paths.current.get(id)} fill={e.color} fillRule="evenodd" opacity={e.fillOpacity*regionOpacity(e,frame)}/>))}</g>
      <g fill="none" strokeLinejoin="round">{regionEvents.map(e=>e.regions.map(id=><path key={`${e.id}-${id}`} d={paths.current.get(id)} stroke={e.strokeColor??e.color} strokeWidth={e.strokeWidth} opacity={e.strokeOpacity*regionOpacity(e,frame,false)}/>))}</g>
    </svg>
      <div ref={markers} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <MapShapes events={events} frame={frame} inset={inset} />
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
                  fontSize: 28,
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
            return (
              <div
                key={e.id}
                data-lng={e.position[0]}
                data-lat={e.position[1]}
                style={{ position: 'absolute', transform: 'translate(-50%,-50%)' }}
              >
                <MarkerGlyph event={e} frame={frame} />
                {e.label && (
                  <span
                    data-map-text="marker"
                    data-map-priority={2}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 'calc(100% + 10px)',
                      transform: 'translateY(-50%)',
                      fontSize: 32,
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
    </div>;
}
