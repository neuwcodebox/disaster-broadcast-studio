import React,{useEffect,useRef} from 'react';
import * as maplibregl from 'maplibre-gl';
import type {Map as MapInstance,GeoJSONSource,StyleSpecification} from 'maplibre-gl';
import {useDelayRender,cancelRender,staticFile} from 'remotion';
import type {FeatureCollection} from 'geojson';
import type {Camera,CompiledEvent} from '../scenario.js';
import type {Regions} from '../load.js';

const style=(countries:FeatureCollection,regions:Regions):StyleSpecification=>({
 version:8,sources:{land:{type:'geojson',data:countries},regions:{type:'geojson',data:regions},highlights:{type:'geojson',data:{type:'FeatureCollection',features:[]}}},
 layers:[
  {id:'sea',type:'background',paint:{'background-color':'#111c24'}},
  {id:'land',type:'fill',source:'land',paint:{'fill-color':'#293238'}},
  {id:'coast',type:'line',source:'land',paint:{'line-color':'#5a6870','line-width':1.1}},
  {id:'regions',type:'fill',source:'regions',paint:{'fill-color':'#374248','fill-opacity':0.65}},
  {id:'boundaries',type:'line',source:'regions',paint:{'line-color':'#69767c','line-opacity':0.55,'line-width':0.7}},
  {id:'highlight-fill',type:'fill',source:'highlights',paint:{'fill-color':['get','color'],'fill-opacity':['get','opacity']}},
  {id:'highlight-line',type:'line',source:'highlights',paint:{'line-color':['get','color'],'line-width':2}},
 ]});
function regionCenter(regions:Regions,ids:string[]):[number,number]{
 const points=regions.features.filter(f=>ids.includes(String(f.id))).flatMap(f=>(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()).flat());
 return [(Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))/2,(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2];
}
const labels:[string,[number,number]][]=[['서울',[126.98,37.57]],['인천',[126.7,37.46]],['춘천',[127.73,37.88]],['강릉',[128.9,37.75]],['대전',[127.38,36.35]],['대구',[128.6,35.87]],['부산',[129.07,35.18]],['광주',[126.85,35.16]],['전주',[127.15,35.82]],['목포',[126.39,34.81]],['울산',[129.31,35.54]],['제주',[126.53,33.5]],['평양',[125.75,39.03]],['백령도',[124.65,37.97]]];
export function BroadcastMap({camera,countries,regions,events,frame,inset=false}:{camera:Camera;countries:FeatureCollection;regions:Regions;events:CompiledEvent[];frame:number;inset?:boolean}){
 const container=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null);
 const {delayRender,continueRender}=useDelayRender();
 const markers=useRef<HTMLDivElement>(null);
 // Initialize once. Every camera/layer update is explicitly awaited before capture.
 useEffect(()=>{
  const handle=delayRender('Initializing offline map');
  let m:MapInstance;
  maplibregl.setWorkerUrl(staticFile('maplibre-gl-worker.mjs'));
  try{m=new maplibregl.Map({container:container.current!,style:style(countries,regions),center:camera.center,zoom:camera.zoom,bearing:camera.bearing,pitch:camera.pitch,interactive:false,attributionControl:false,fadeDuration:0,canvasContextAttributes:{preserveDrawingBuffer:true,antialias:true}});}catch(e){cancelRender(e as Error);return;}
  map.current=m;
  m.on('error',e=>cancelRender(new Error(`MapLibre: ${e.error.message}`)));
  m.once('load',()=>{m.resize();continueRender(handle);});
  return ()=>{map.current=null;m.remove();};
 },[]);
 useEffect(()=>{
  const m=map.current;if(!m)return;
  const handle=delayRender(`Map frame ${frame}`);
  const update=()=>{
   try{
    m.jumpTo({center:camera.center,zoom:camera.zoom,bearing:camera.bearing,pitch:camera.pitch});
    const features=events.filter(e=>e.type==='region').flatMap(e=>{
     if(e.type!=='region')return [];
     return regions.features.filter(f=>e.regions.includes(String(f.id))).map(f=>({...f,properties:{...f.properties,color:e.color,opacity:e.pulse?0.23+0.12*(1+Math.sin((frame-e.start)/60*Math.PI)):0.36}}));
    });
    (m.getSource('highlights') as GeoJSONSource).setData({type:'FeatureCollection',features});
    if(markers.current){
     for(const element of markers.current.querySelectorAll<HTMLElement>('[data-lng]')){
      const p=m.project([Number(element.dataset.lng),Number(element.dataset.lat)]);
      element.style.left=`${p.x}px`;element.style.top=`${p.y}px`;
     }
    }
    m.once('idle',()=>continueRender(handle));m.triggerRepaint();
   }catch(e){cancelRender(e as Error);}
  };
  if(m.isStyleLoaded())update();else m.once('load',update);
  return ()=>{m.off('load',update);};
 },[camera.center[0],camera.center[1],camera.zoom,camera.bearing,camera.pitch,events,frame]);
 return <div style={{position:'absolute',inset:0,overflow:'hidden'}}>
  <style>{'.maplibregl-canvas {position:absolute;left:0;top:0;}'}</style>
  <div ref={container} style={{position:'absolute',inset:0}}/>
  <div ref={markers} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
   {labels.map(([name,p])=><div key={name} data-lng={p[0]} data-lat={p[1]} style={{position:'absolute',transform:'translate(-50%,-50%)',fontSize:inset?16:20,color:'#b8c2c8',textShadow:'0 1px 3px #000',whiteSpace:'nowrap'}}>{name}</div>)}
   {events.filter(e=>e.type==='region'&&e.label).map(e=>{
    if(e.type!=='region')return null;const p=regionCenter(regions,e.regions);
    return <div key={e.id} data-lng={p[0]} data-lat={p[1]} style={{position:'absolute',transform:'translate(-50%,-50%)',background:'#151b1fe8',padding:'6px 12px',borderLeft:`3px solid ${e.color}`,fontSize:20,color:e.color,whiteSpace:'nowrap'}}>{e.label}</div>;
   })}
   {events.filter(e=>e.type==='marker').map(e=>{
    if(e.type!=='marker')return null;
    const age=(frame-e.start)/60,ring=e.effect==='ring',size=ring?24+Math.min(age,3)*25:13;
    return <div key={e.id} data-lng={e.position[0]} data-lat={e.position[1]} style={{position:'absolute',transform:'translate(-50%,-50%)'}}>
     <div style={{width:size,height:size,border:`2px solid ${e.color}`,background:ring?'transparent':e.color,borderRadius:'50%',opacity:ring?Math.max(0.3,1-age/4):1}}/>
     <span style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',fontSize:22,fontWeight:700,color:e.color,whiteSpace:'nowrap',textShadow:'0 2px 4px #000',paddingTop:7}}>{e.label}</span>
    </div>;
   })}
  </div>
 </div>;
}
