import {FPS,type Timeline,type Camera,type CompiledEvent} from './scenario.js';
export const active=(e:CompiledEvent,frame:number)=>e.start<=frame&&frame<e.end;
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function cameraAt(t:Timeline,frame:number):Camera{
 let cam={...t.scenario.map.camera};
 for(const e of t.events){
  if(e.type!=='camera'||e.start>frame)continue;
  const p=Math.min(1,(frame-e.start)/Math.max(1,e.end-e.start-1));
  const q=e.ease==='smooth'?p*p*(3-2*p):p;
  cam={center:[mix(cam.center[0],e.to.center[0],q),mix(cam.center[1],e.to.center[1],q)],zoom:mix(cam.zoom,e.to.zoom,q),bearing:mix(cam.bearing,e.to.bearing,q),pitch:mix(cam.pitch,e.to.pitch,q)};
 }
 return cam;
}
export function stateAt(t:Timeline,frame:number){
 if(!Number.isInteger(frame)||frame<0||frame>=t.durationInFrames)throw Error(`frame: expected integer 0..${t.durationInFrames-1}`);
 const cut=t.cuts.find(c=>c.start<=frame&&frame<c.end)!;
 const visible=t.events.filter(e=>active(e,frame));
 return {
  cut,frame,epoch:cut.epoch+(frame-cut.start)*1000/FPS,camera:cameraAt(t,frame),
  alerts:t.events.filter(e=>e.type==='alert'&&e.start<=frame).reverse(),
  visible,
  news:visible.find(e=>e.type==='news'),
  opacity:Math.min(1,cut.fadeIn?(frame-cut.start)/FPS/cut.fadeIn:1,cut.fadeOut?(cut.end-1-frame)/FPS/cut.fadeOut:1),
 };
}
export function envelope(frame:number,start:number,end:number,fadeIn:number,fadeOut:number){
 if(frame<start||frame>=end)return 0;
 return Math.max(0,Math.min(1,fadeIn?(frame-start)/FPS/fadeIn:1,fadeOut?(end-1-frame)/FPS/fadeOut:1));
}
export function clock(epoch:number,timezone:string,withDate=false){
 return new Intl.DateTimeFormat('ko-KR',{timeZone:timezone,...(withDate?{year:'numeric',month:'2-digit',day:'2-digit'}:{}),hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(epoch);
}
