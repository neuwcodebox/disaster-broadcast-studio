import {bundle} from '@remotion/bundler';
import {renderStill,renderMedia,selectComposition} from '@remotion/renderer';
import {mkdtemp,mkdir,copyFile,readFile,rm,rename,stat,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import {packageRoot,type Loaded} from './load.js';
import type {BroadcastProps} from './video/Broadcast.js';
export type RenderOptions={out:string;frame?:number;from?:number;to?:number;browser?:string;gl?:'angle'|'swiftshader'|'swangle';concurrency:number;overwrite?:boolean};
const require=createRequire(import.meta.url);
export async function render(loaded:Loaded,options:RenderOptions){
 const out=path.resolve(options.out),last=loaded.timeline.durationInFrames-1;
 const still=options.frame!==undefined,from=options.from??0,to=options.to??last;
 if(path.extname(out).toLowerCase()!==(still?'.png':'.mp4'))throw Error(`--out: expected ${still?'.png':'.mp4'} extension`);
 if(still&&(!Number.isInteger(options.frame)||options.frame!<0||options.frame!>last))throw Error(`--frame: expected 0..${last}`);
 if(!still&&(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>last||to<from))throw Error(`range: expected inclusive frames 0..${last}`);
 if(!Number.isInteger(options.concurrency)||options.concurrency<1)throw Error('--concurrency: expected positive integer');
 if(!options.overwrite){try{await stat(out);throw Error(`output exists: ${out}; use --overwrite`);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
 await mkdir(path.dirname(out),{recursive:true});
 const temp=await mkdtemp(path.join(os.tmpdir(),'dbs-'));
 const pending=path.join(path.dirname(out),`.${path.basename(out)}.${path.basename(temp)}.${still?'png':'mp4'}`);
 try{
  const publicDir=path.join(temp,'public');await mkdir(path.join(publicDir,'fonts','files'),{recursive:true});
  for(const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs'])await copyFile(require.resolve(`maplibre-gl/dist/${name}`),path.join(publicDir,name));
  const fontRoot=path.dirname(require.resolve('@fontsource/noto-sans-kr/package.json'));
  for(const weight of [400,700]){
   const css=await readFile(path.join(fontRoot,`${weight}.css`),'utf8');
   await writeFile(path.join(publicDir,'fonts',`${weight}.css`),css);
   for(const match of css.matchAll(/url\(([^)]+)\)/g)){
    const relative=match[1].replace(/['"]/g,'');
    await copyFile(path.join(fontRoot,relative),path.join(publicDir,'fonts',relative));
   }
  }
  const audio:Record<string,string>={};
  for(const [id,file]of Object.entries(loaded.assetPaths)){
   const name=`audio/${id}${path.extname(file)}`;await mkdir(path.join(publicDir,'audio'),{recursive:true});
   await copyFile(file,path.join(publicDir,name));audio[id]=name;
  }
  const inputProps:BroadcastProps={timeline:loaded.timeline,regions:loaded.regions,countries:JSON.parse(await readFile(path.join(packageRoot,'assets/countries.geojson'),'utf8')),audio,attribution:loaded.timeline.scenario.map.attribution??'경계: 통계청 SGIS · vuski/admdongkor (CC BY 4.0), disaster-feed 가공 · Natural Earth'};
  const serveUrl=await bundle({entryPoint:path.join(packageRoot,'dist/video/index.js'),publicDir,outDir:path.join(temp,'bundle'),enableCaching:true,rootDir:packageRoot});
  const browserExecutable=options.browser??null,chromiumOptions={gl:options.gl??'angle' as const};
  const composition=await selectComposition({serveUrl,id:'Broadcast',inputProps,browserExecutable,chromiumOptions});
  const common={composition,serveUrl,inputProps,browserExecutable,chromiumOptions,output:pending};
  let lastProgress=-1;
  if(still)await renderStill({...common,frame:options.frame!,imageFormat:'png'});
  else await renderMedia({composition,serveUrl,inputProps,browserExecutable,chromiumOptions,outputLocation:pending,codec:'h264',audioCodec:'aac',enforceAudioTrack:true,pixelFormat:'yuv420p',frameRange:[from,to],concurrency:options.concurrency,crf:18,onProgress:p=>{const step=Math.floor(p.progress*10);if(step!==lastProgress){lastProgress=step;console.error(`Rendering ${step*10}%`);}}});
  await rename(pending,out);
  await writeFile(`${out}.json`,JSON.stringify({title:loaded.timeline.scenario.title,version:loaded.timeline.scenario.version,fps:60,width:1920,height:1080,frames:still?[options.frame]:[from,to],assets:loaded.timeline.scenario.assets},null,2)+'\n');
  return out;
 }finally{await rm(temp,{recursive:true,force:true});await rm(pending,{force:true});}
}
