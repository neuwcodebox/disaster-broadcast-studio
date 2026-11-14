import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {scenarioSchema,compile,pages} from '../src/scenario.js';
import {stateAt,envelope} from '../src/timeline.js';
import {loadScenario} from '../src/load.js';
const input=()=>({version:1,title:'계약 검증',fictionNotice:'기술 검증용 허구 화면입니다.',agencies:{city:'시험시',news:'시험 뉴스'},map:{camera:{center:[127.5,36],zoom:6}},cuts:[{id:'first',duration:10,storyTime:'2026-01-01T12:00:00+09:00'},{id:'second',duration:10,storyTime:'2026-01-01T14:00:00+09:00'}],events:[{id:'a',type:'alert',cut:'first',at:2,sender:'city',text:'첫 안내',regions:['47190']},{id:'b',type:'alert',cut:'second',at:1,sender:'city',text:'정정 안내',corrects:'a'}]});
const timeline=()=>compile(scenarioSchema.parse(input()),new Set(['47190']));
test('cut interiors use real time; explicit cuts jump; seeking restores history',()=>{
 const t=timeline();assert.ok(Math.abs(stateAt(t,599).epoch-stateAt(t,0).epoch-599/60*1000)<0.001);
 assert.equal(stateAt(t,600).epoch,Date.parse('2026-01-01T14:00:00+09:00'));
 assert.deepEqual(stateAt(t,670).alerts.map(e=>e.id),['b','a']);
 const expected=stateAt(t,670);for(let f=0;f<670;f++)stateAt(t,f);assert.deepEqual(stateAt(t,670),expected);
});
test('reference errors identify offending event and field',()=>{
 const x=input();x.events[0].regions=['missing'];assert.throws(()=>compile(scenarioSchema.parse(x),new Set()),/events\[0\].*regions.*missing/);
});
test('conflicting single-owner tracks are rejected; independent layers can overlap',()=>{
 const x:any=input();x.events.push(...['n1','n2'].map(id=>({id,type:'news',cut:'first',at:0,duration:4,source:'news',headline:'검증용 제목'})));
 assert.throws(()=>compile(scenarioSchema.parse(x),new Set(['47190'])),/overlapping news/);
 x.events.pop();x.events.push({id:'m',type:'marker',cut:'first',at:0,duration:4,position:[127,36],label:'검증'});assert.doesNotThrow(()=>compile(scenarioSchema.parse(x),new Set(['47190'])));
});
test('cut crossing is explicit and audio envelope is frame based',()=>{
 const x:any=input();x.events.push({id:'silence',type:'silence',cut:'first',at:9,duration:2});
 assert.throws(()=>compile(scenarioSchema.parse(x),new Set(['47190'])),/carry/);
 x.events.at(-1).carry=true;const t=compile(scenarioSchema.parse(x),new Set(['47190']));assert.ok(stateAt(t,620).visible.some(e=>e.id==='silence'));
 assert.equal(envelope(0,0,120,1,0),0);assert.equal(envelope(60,0,120,1,0),1);assert.equal(envelope(120,0,120,0,0),0);
});
test('correction cannot precede original and past-time cuts are rejected',()=>{
 const x=input();x.events[0].corrects='b';assert.throws(()=>compile(scenarioSchema.parse(x),new Set(['47190'])),/correction must follow/);
 const y=input();y.cuts[1].storyTime='2026-01-01T11:00:00+09:00';assert.throws(()=>compile(scenarioSchema.parse(y),new Set(['47190'])),/storyTime/);
});
test('pagination preserves all original text',()=>{
 const text='[시험시] 산지 인근 접근을 삼가고 실내에 머물러 주시기 바랍니다.\n'.repeat(30);
 assert.equal(pages(text).join(''),text);assert.ok(pages(text).every(p=>p.length<=100));
});
test('external workspace resolves assets relative to scenario and reports missing files',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'dbs-contract-'));
 try{
  const x:any=input();x.assets={tone:{path:'tone.wav',source:'test',license:'CC0'}};
  await writeFile(path.join(dir,'scenario.json'),JSON.stringify(x));
  await assert.rejects(loadScenario(path.join(dir,'scenario.json')),/assets.tone.path.*missing/);
  await writeFile(path.join(dir,'tone.wav'),'test');
  const loaded=await loadScenario(path.join(dir,'scenario.json'));assert.equal(loaded.assetPaths.tone,path.join(dir,'tone.wav'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('unknown keys catch misspellings and fractional subframes are rejected',()=>{
 const x:any=input();x.events[0].recievedAt='bad';assert.equal(scenarioSchema.safeParse(x).success,false);
 const y=input();y.cuts[0].duration=0.001;assert.throws(()=>compile(scenarioSchema.parse(y),new Set(['47190'])),/shorter than one frame/);
});
