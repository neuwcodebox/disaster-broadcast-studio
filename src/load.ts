import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDocument} from 'yaml';
import type {FeatureCollection,Polygon,MultiPolygon} from 'geojson';
import {compile,scenarioSchema,pages,FPS,type Timeline} from './scenario.js';
export const packageRoot=fileURLToPath(new URL('../',import.meta.url));
export type Regions=FeatureCollection<Polygon|MultiPolygon>;
export type Loaded={timeline:Timeline;regions:Regions;root:string;assetPaths:Record<string,string>;warnings:string[]};
export async function localFile(root:string,value:string,label:string){
 if(/^[a-z]+:\/\//i.test(value))throw Error(`${label}: use a local file, not a URL`);
 const file=path.resolve(root,value);
 try{if(!(await stat(file)).isFile())throw Error('not a file');}catch{throw Error(`${label}: missing file ${file}`);}
 return file;
}
export function parseRegions(raw:unknown):Regions{
 const data=raw as Regions;
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)throw Error('map.regions: expected nonempty GeoJSON FeatureCollection');
 const ids=new Set();
 for(const f of data.features){
  if(f.type!=='Feature'||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('map.regions: every feature must be Polygon or MultiPolygon');
  const id=String(f.id??f.properties?.SIG_CD??'');
  if(!id||ids.has(id))throw Error(`map.regions: missing or duplicate feature ID ${id}`);
  ids.add(id);f.id=id;
  f.properties={...f.properties,id,name:String(f.properties?.name??f.properties?.SIG_KOR_NM??id)};
  const points=(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()).flat();
  if(!points.length||points.some(p=>p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>85))throw Error(`map.regions: invalid WGS84 coordinates in ${id}`);
 }
 return data;
}
export async function loadScenario(file:string):Promise<Loaded>{
 const absolute=path.resolve(file),root=path.dirname(absolute);
 try{
  const doc=parseDocument(await readFile(absolute,'utf8'),{uniqueKeys:true});
  if(doc.errors.length)throw Error(doc.errors.map(e=>e.message).join('\n'));
  const result=scenarioSchema.safeParse(doc.toJS());
  if(!result.success)throw Error(result.error.issues.map(i=>`${i.path.join('.')||'root'}: ${i.message}`).join('\n'));
  const scenario=result.data;
  const regionFile=await localFile(scenario.map.regions?root:packageRoot,scenario.map.regions??'assets/regions.geojson','map.regions');
  if(scenario.map.regions&&!scenario.map.attribution)throw Error('map.attribution: required for custom region data');
  const regions=parseRegions(JSON.parse(await readFile(regionFile,'utf8')));
  const timeline=compile(scenario,new Set(regions.features.map(f=>String(f.id))));
  const assetPaths:Record<string,string>={};
  for(const [key,asset] of Object.entries(scenario.assets))assetPaths[key]=await localFile(root,asset.path,`assets.${key}.path`);
  const warnings:string[]=[];
  const alerts=timeline.events.filter(e=>e.type==='alert');
  for(let i=0;i<alerts.length;i++){
   const a=alerts[i];if(a.type!=='alert')continue;
   const next=alerts[i+1]?.start??timeline.durationInFrames;
   if(next-Math.max(a.start,180)<pages(a.text).length*a.pageSeconds*FPS)warnings.push(`${a.id}: latest-message reading time is short; allow ${pages(a.text).length*a.pageSeconds}s before the next alert/end`);
  }
  return {timeline,regions,root,assetPaths,warnings};
 }catch(e){throw new Error(`${absolute}\n${e instanceof Error?e.message:String(e)}`);}
}
