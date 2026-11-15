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
export function receiptHighlights(t:Timeline,frame:number):CompiledEvent[]{
 return t.events.flatMap(e=>{
  if(e.type!=='alert'||!e.mapHighlight||!e.regions.length)return [];
  const end=Math.min(t.durationInFrames,e.start+Math.round(e.mapHighlight.duration*FPS));
  if(frame<e.start||frame>=end)return [];
  return [{id:`receipt-${e.id}`,type:'region' as const,cut:e.cut,at:e.at,duration:e.mapHighlight.duration,carry:true,
   start:e.start,end,order:e.order,regions:e.regions,color:e.mapHighlight.color,fillOpacity:.55,
   strokeColor:e.mapHighlight.color,strokeOpacity:.85,strokeWidth:2,pulse:true}];
 });
}
export function statusEntry(frame:number,start:number,duration=.55){
 const p=Math.max(0,Math.min(1,(frame-start)/(duration*FPS)));
 return {opacity:.4+.6*p,offset:(1-p)*-5,glow:(1-p)*.22};
}
export function shutdownAt(events:CompiledEvent[],frame:number){
 const e=events.find(e=>e.type==='screen'&&e.effect==='shutdown'&&e.intensity>0&&active(e,frame));
 if(!e)return null;
 const p=Math.min(1,(frame-e.start)/Math.min(90,e.end-e.start));
 return {y:Math.max(.002,1-Math.min(1,p/.5)**3),x:p<.5?1:Math.max(0,1-(p-.5)/.3),line:p>=.5&&p<.8,black:p>=.8};
}
export function stateAt(t:Timeline,frame:number){
 if(!Number.isInteger(frame)||frame<0||frame>=t.durationInFrames)throw Error(`frame: expected integer 0..${t.durationInFrames-1}`);
 const cut=t.cuts.find(c=>c.start<=frame&&frame<c.end)!;
 const index=t.cuts.indexOf(cut),transition=Math.round(cut.clockTransition*FPS);
 const jumping=index>0&&transition>0&&frame<cut.start+transition;
 const contentFrame=jumping?cut.start-1:frame;
 const previous=index>0?t.cuts[index-1]:null;
 const epoch=cut.epoch+(frame-cut.start)*1000/FPS;
 const p=jumping?(frame-cut.start)/transition:1;
 const displayEpoch=jumping?mix(previous!.epoch+(previous!.end-previous!.start)*1000/FPS,cut.epoch+transition*1000/FPS,p*p*(3-2*p)):epoch;
 const visible=t.events.filter(e=>active(e,contentFrame));
 return {
  cut,frame,epoch,displayEpoch,jumping,contentFrame,camera:cameraAt(t,contentFrame),
  alerts:t.events.filter(e=>e.type==='alert'&&e.start<=contentFrame).reverse(),
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
