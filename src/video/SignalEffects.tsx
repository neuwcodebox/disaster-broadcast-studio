import React, {useLayoutEffect, useRef} from 'react';
import type {CompiledEvent} from '../scenario.js';
import {envelope} from '../timeline.js';
import {seededRandom} from '../audio/wav.js';

export function signalLevels(events: CompiledEvent[], frame: number) {
  const levels = {noise: 0, scanlines: 0, chromatic: 0, dropout: 0};
  for (const event of events) if (event.type === 'screen' && event.effect in levels) {
    const key = event.effect as keyof typeof levels;
    levels[key] = Math.min(1, levels[key] + envelope(frame,event.start,event.end,event.fadeIn,event.fadeOut)*event.intensity);
  }
  return levels;
}
function Noise({frame,seed,intensity}:{frame:number;seed:number;intensity:number}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  useLayoutEffect(()=>{
    const ctx=canvas.current!.getContext('2d')!, data=ctx.createImageData(960,540);
    const random=seededRandom(seed ^ Math.imul(frame+1,0x45d9f3b));
    for(let i=0;i<data.data.length;i+=4) {
      const n=Math.floor(random()*256);
      data.data[i]=data.data[i+1]=data.data[i+2]=n;data.data[i+3]=255;
    }
    ctx.putImageData(data,0,0);
  },[frame,seed]);
  return <canvas ref={canvas} width={960} height={540} style={{position:'absolute',inset:0,width:'100%',height:'100%',imageRendering:'pixelated',opacity:intensity*.22,mixBlendMode:'screen'}}/>;
}
export function SignalEffects({frame,seed,levels}:{frame:number;seed:number;levels:ReturnType<typeof signalLevels>}) {
  const shift=levels.chromatic*(3+Math.sin(frame*.47+seed)*2);
  const random=seededRandom(seed ^ Math.imul(Math.floor(frame/6)+1,0x27d4eb2d));
  return <>
    <svg width={0} height={0} aria-hidden="true" style={{position:'absolute'}}><defs>
      <filter id="dbs-chromatic" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
        <feOffset in="r" dx={shift} result="red"/>
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
        <feOffset in="b" dx={-shift} result="blue"/>
        <feBlend in="red" in2="green" mode="screen" result="rg"/>
        <feBlend in="rg" in2="blue" mode="screen"/>
      </filter>
    </defs></svg>
    {levels.noise>0&&<Noise frame={frame} seed={seed} intensity={levels.noise}/>}
    {levels.scanlines>0&&<div style={{position:'absolute',inset:0,pointerEvents:'none',opacity:levels.scanlines*.4,background:'repeating-linear-gradient(to bottom,transparent 0px,transparent 2px,#000 2px,#000 4px)',backgroundPositionY:(frame/3)%4}}/>}
    {levels.dropout>0&&Array.from({length:1+Math.floor(levels.dropout*2)},(_,i)=><div key={i} style={{position:'absolute',left:0,right:0,top:`${random()*94}%`,height:12+random()*96*levels.dropout,background:'#020405',opacity:levels.dropout,pointerEvents:'none'}}/>)}
  </>;
}
