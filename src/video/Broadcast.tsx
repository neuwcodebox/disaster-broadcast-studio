import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame,useDelayRender,cancelRender} from 'remotion';
import type {FeatureCollection} from 'geojson';
import type {Timeline,CompiledEvent} from '../scenario.js';
import {FPS,pages} from '../scenario.js';
import type {Regions} from '../load.js';
import {stateAt,clock,envelope} from '../timeline.js';
import {BroadcastMap} from './Map.js';
export type BroadcastProps={timeline:Timeline;regions:Regions;countries:FeatureCollection;audio:Record<string,string>;attribution:string};
const colors:Record<string,string>={'안전안내':'#b7c9d0','긴급재난':'#e5b867','위급재난':'#e18473'};
function AlertCard({event,latest,frame,timeline}:{event:CompiledEvent;latest:boolean;frame:number;timeline:Timeline}){
 if(event.type!=='alert')return null;
 const chunks=pages(event.text),page=Math.floor((frame-event.start)/FPS/event.pageSeconds)%chunks.length;
 const t=stateAt(timeline,event.start).epoch;
 return <article style={{height:latest?450:320,boxSizing:'border-box',padding:latest?'24px 28px':'18px 28px',borderBottom:'1px solid #30373c',background:latest?'#20272c':'#181e22',borderLeft:`4px solid ${latest?colors[event.level]:'#465158'}`}}>
  <div style={{display:'flex',alignItems:'center',gap:12,fontSize:20,color:latest?colors[event.level]:'#a7b1b7',marginBottom:12}}>
   <b>{event.corrects?'정정 · ':''}{event.level}</b><span style={{marginLeft:'auto',fontVariantNumeric:'tabular-nums'}}>수신 {clock(t,timeline.scenario.timezone)}</span>
  </div>
  <div style={{fontSize:22,fontWeight:700,marginBottom:12}}>{timeline.scenario.agencies[event.sender]}</div>
  {(event.occurredAt||event.publishedAt)&&<div style={{fontSize:16,color:'#a7b1b7',marginBottom:8}}>{event.occurredAt&&`발생 ${clock(Date.parse(event.occurredAt),timeline.scenario.timezone)} `}{event.publishedAt&&`발표 ${clock(Date.parse(event.publishedAt),timeline.scenario.timezone)}`}</div>}
  <div style={{fontSize:latest?29:21,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'keep-all',overflowWrap:'anywhere',minHeight:latest?210:128}}>{chunks[page]}</div>
  {chunks.length>1&&<div style={{fontSize:17,color:'#a7b1b7',marginTop:8,textAlign:'right'}}>{page+1} / {chunks.length}</div>}
  {event.corrects&&<div style={{fontSize:17,color:'#b8c2c8',marginTop:8}}>이전 문자 정정 · {clock(stateAt(timeline,timeline.events.find(e=>e.id===event.corrects)!.start).epoch,timeline.scenario.timezone)}</div>}
 </article>;
}
export function Broadcast(props:BroadcastProps){
 const {timeline,regions,countries,audio,attribution}=props;
 const frame=useCurrentFrame(),state=stateAt(timeline,frame),news=state.news;
 const {delayRender,continueRender}=useDelayRender();
 const [fontHandle]=useState(()=>delayRender('Loading bundled Korean font'));
 useEffect(()=>{
  const links=['400','700'].map(weight=>{const link=document.createElement('link');link.rel='stylesheet';link.href=staticFile(`fonts/${weight}.css`);document.head.append(link);return link;});
  Promise.all(links.map(l=>new Promise<void>((resolve,reject)=>{l.onload=()=>resolve();l.onerror=()=>reject(Error('Bundled font CSS unavailable'));})))
   .then(()=>Promise.all([document.fonts.load('400 29px "Noto Sans KR"',JSON.stringify(timeline.scenario)),document.fonts.load('700 29px "Noto Sans KR"',JSON.stringify(timeline.scenario))]))
   .then(()=>document.fonts.ready).then(()=>continueRender(fontHandle)).catch(cancelRender);
  return ()=>links.forEach(l=>l.remove());
 },[]);
 const inset=state.visible.find(e=>e.type==='inset');
 const alertWindow=state.alerts.length<=2?state.alerts:[state.alerts[0],state.alerts[1+Math.floor((frame-state.alerts[0].start)/FPS/12)%(state.alerts.length-1)]];
 return <AbsoluteFill style={{background:'#0b0f12',fontFamily:'"Noto Sans KR", sans-serif',color:'#edf0f1'}}>
  <AbsoluteFill style={{opacity:state.opacity}}>
   <header style={{position:'absolute',inset:'0 0 auto 0',height:92,display:'flex',alignItems:'center',padding:'0 38px',borderBottom:'1px solid #3c454b',background:'#13191d',gap:20}}>
    <span style={{width:8,height:34,background:'#b8c2c8'}}/><h1 style={{fontSize:timeline.scenario.title.length>40?23:30,fontWeight:700,margin:0,letterSpacing:1,maxWidth:1040,lineHeight:1.4,overflowWrap:'anywhere'}}>{timeline.scenario.title}</h1>
    <time style={{marginLeft:'auto',fontSize:29,fontVariantNumeric:'tabular-nums',color:'#d0d7db'}}>{clock(state.epoch,timeline.scenario.timezone,true)}</time>
   </header>
   <main style={{position:'absolute',left:0,top:93,right:654,bottom:134}}>
    <BroadcastMap camera={state.camera} countries={countries} regions={regions} events={state.visible} frame={frame}/>
    {inset?.type==='inset'&&<div style={{position:'absolute',right:24,bottom:46,width:420,height:290,border:'1px solid #6d7980',boxShadow:'0 8px 30px #0008'}}>
     <BroadcastMap camera={inset.camera} countries={countries} regions={regions} events={state.visible} frame={frame} inset/>
     <div style={{position:'absolute',top:0,left:0,right:0,padding:'8px 16px',background:'#13191de8',fontSize:19}}>{inset.title}</div>
    </div>}
    <div style={{position:'absolute',bottom:12,left:20,right:20,fontSize:13,color:'#99a6ae',textShadow:'0 1px 3px #000'}}>{attribution}</div>
   </main>
   <aside style={{position:'absolute',top:93,right:0,bottom:134,width:654,borderLeft:'1px solid #3c454b',background:'#151b1f',overflow:'hidden'}}>
    <div style={{height:56,padding:'12px 28px',boxSizing:'border-box',fontSize:21,color:'#bcc6cd',borderBottom:'1px solid #3c454b',display:'flex',justifyContent:'space-between'}}><b>재난문자</b><span>{state.alerts.length.toString().padStart(2,'0')}</span></div>
    {alertWindow.map((e,i)=><AlertCard key={e.id} event={e} latest={i===0} frame={frame} timeline={timeline}/>)}
   </aside>
   <footer style={{position:'absolute',bottom:0,left:0,right:0,height:133,borderTop:'1px solid #525c63',display:'flex',alignItems:'center',background:'#11171b',padding:'0 38px',gap:30}}>
    {news?.type==='news'&&<>
     <div style={{borderLeft:'5px solid #b8c2c8',paddingLeft:19,minWidth:140}}><div style={{fontSize:20,color:'#c4ced4',fontWeight:700}}>{timeline.scenario.agencies[news.source]}</div><div style={{fontSize:17,color:'#84939d',marginTop:7}}>{clock(news.publishedAt?Date.parse(news.publishedAt):stateAt(timeline,news.start).epoch,timeline.scenario.timezone)}</div></div>
     <div style={{fontSize:news.headline.length>85?28:35,lineHeight:1.45,fontWeight:700,wordBreak:'keep-all',overflowWrap:'anywhere',opacity:Math.min(1,(frame-news.start+1)/12)}}>{news.headline}</div>
    </>}
   </footer>
  </AbsoluteFill>
  {state.visible.filter(e=>e.type==='screen').map(e=>{
   if(e.type!=='screen')return null;
   const opacity=envelope(frame,e.start,e.end,e.fadeIn,e.fadeOut)*e.intensity;
   const noise=((frame*1103515245+timeline.scenario.seed*12345)>>>0)%13;
   return <AbsoluteFill key={e.id} style={{pointerEvents:'none',opacity,background:e.effect==='blackout'?'#000':e.effect==='flash'?'#fff':`repeating-linear-gradient(0deg, transparent ${noise}px, #8b949b33 ${noise+1}px, transparent ${noise+3}px, transparent ${noise+8}px)`}}/>;
  })}
  {frame<180&&<AbsoluteFill style={{background:'#101519',justifyContent:'center',alignItems:'center',opacity:frame<150?1:(180-frame)/30}}><div style={{fontSize:timeline.scenario.title.length>40?28:36,fontWeight:700,maxWidth:1440,textAlign:'center',overflowWrap:'anywhere',lineHeight:1.5}}>{timeline.scenario.title}</div><div style={{fontSize:23,color:'#b6c0c7',marginTop:24,maxWidth:1200,textAlign:'center',lineHeight:1.7}}>{timeline.scenario.fictionNotice}</div></AbsoluteFill>}
  {timeline.events.filter(e=>e.type==='audio').map(e=>{
   if(e.type!=='audio')return null;
   return <Sequence key={e.id} from={e.start} durationInFrames={e.end-e.start}><Audio src={staticFile(audio[e.asset])} trimBefore={Math.round(e.offset*FPS)} volume={timeline.events.some(x=>x.type==='silence'&&x.start<=frame&&frame<x.end)?0:e.volume*envelope(frame,e.start,e.end,e.fadeIn,e.fadeOut)}/></Sequence>;
  })}
 </AbsoluteFill>;
}
