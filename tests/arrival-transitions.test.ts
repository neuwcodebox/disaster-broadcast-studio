import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scenarioSchema,compile} from '../src/scenario.js';
import {stateAt,receiptHighlights,shutdownAt,regionOpacity} from '../src/timeline.js';
import {notificationSounds,notificationAsset} from '../src/notifications.js';
const make=(extra:any={})=>compile(scenarioSchema.parse({version:1,title:'전환',fictionNotice:'허구',agencies:{a:'가상 기관'},assets:{own:{path:'own.wav',source:'test',license:'CC0'}},map:{camera:{center:[127,37],zoom:6}},cuts:[{id:'a',duration:10,storyTime:'2031-01-01T00:00:00+09:00'},{id:'b',duration:10,storyTime:'2031-01-01T02:00:00+09:00',clockTransition:1}],events:[{id:'one',type:'alert',cut:'a',at:2,sender:'a',text:'지역 안내',regions:['51']},{id:'two',type:'alert',cut:'b',at:1.2,sender:'a',text:'후속 안내',regions:['51'],mapHighlight:false,sound:false},{id:'s',type:'screen',cut:'b',at:6,duration:4,effect:'shutdown'}],...extra}),new Set(['51']));
test('receipt targets authored geometry once, supports opt-out and deterministic seeking',()=>{
 const t=make();assert.deepEqual(receiptHighlights(t,119),[]);
 assert.deepEqual(receiptHighlights(t,120)[0].type,'region');
 assert.deepEqual((receiptHighlights(t,120)[0] as any).regions,['51']);
 const cue=receiptHighlights(t,120)[0];if(cue.type!=='region')throw Error();
 assert.equal(cue.strokeWidth,0);assert.equal(cue.pulse,false);
 assert.equal(regionOpacity(cue,120),0);assert.ok(regionOpacity(cue,160)>0);
 assert.equal(regionOpacity(cue,263),0);
 assert.deepEqual(receiptHighlights(t,264),[]);
 assert.deepEqual(receiptHighlights(t,675),[]);
 assert.deepEqual(receiptHighlights(t,130),receiptHighlights(t,130));
});
test('clock traverses skipped time while old content holds, then real-time flow resumes',()=>{
 const t=make();const a=stateAt(t,600),mid=stateAt(t,630),end=stateAt(t,660);
 assert.equal(a.contentFrame,599);assert.equal(a.jumping,true);
 assert.equal(a.clockPhase,'lead');assert.equal(mid.clockPhase,'run');
 const hold=stateAt(t,649);assert.equal(hold.clockPhase,'hold');assert.equal(hold.displayEpoch,stateAt(t,659).displayEpoch);
 assert.ok(mid.displayEpoch>a.displayEpoch&&mid.displayEpoch<end.displayEpoch);
 assert.deepEqual(a.alerts.map(x=>x.id),['one']);
 assert.equal(end.displayEpoch,end.epoch);assert.equal(end.contentFrame,660);
 assert.ok(Math.abs(stateAt(t,720).displayEpoch-end.displayEpoch-1000)<.01);
 assert.deepEqual(stateAt(t,675).alerts.map(x=>x.id),['two','one']);
 assert.deepEqual(stateAt(t,630),mid);
});
test('common sound plays once and supports disabled or custom audio',()=>{
 const t=make();assert.equal(notificationSounds(t).length,1);assert.equal(notificationSounds(t)[0].asset,notificationAsset);
 const raw=structuredClone(t.scenario);const e=raw.events[0];if(e.type!=='alert')throw Error();e.sound={asset:'own',duration:1.4,volume:.4};
 assert.equal(notificationSounds(compile(scenarioSchema.parse(raw),new Set(['51'])))[0].frames,84);
 e.sound={asset:'missing',duration:1,volume:1};assert.throws(()=>compile(scenarioSchema.parse(raw),new Set(['51'])),/sound.asset/);
});
test('shutdown contracts to a line and holds black',()=>{
 const t=make();assert.equal(shutdownAt(t.events,950),null);
 assert.equal(shutdownAt(t.events,1010)?.line,true);
 assert.equal(shutdownAt(t.events,1050)?.black,true);
 assert.equal(shutdownAt(t.events,1199)?.black,true);
});
