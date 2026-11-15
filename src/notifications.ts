import type {Timeline} from './scenario.js';
import {FPS} from './scenario.js';
export const notificationAsset='__dbs_notification';
export function notificationSounds(t:Timeline){
 return t.events.flatMap(e=>e.type!=='alert'||e.sound===false?[]:[{
  id:`sound-${e.id}`,start:e.start,frames:Math.min(t.durationInFrames-e.start,Math.round((e.sound==='default'?.55:e.sound.duration)*FPS)),
  asset:e.sound==='default'?notificationAsset:e.sound.asset,volume:e.sound==='default'?.65:e.sound.volume,
 }]);
}
