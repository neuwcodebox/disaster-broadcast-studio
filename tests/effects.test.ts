import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scenarioSchema,compile} from '../src/scenario.js';
import {signalLevels} from '../src/video/SignalEffects.js';
test('signal effects are opt-in, timed, composable and seek independently',()=>{
 const base={version:1,title:'효과 확인',fictionNotice:'허구',agencies:{},map:{camera:{center:[127,36],zoom:6}},cuts:[{id:'a',duration:10,storyTime:'2031-01-01T00:00:00+09:00'}]};
 const timeline=compile(scenarioSchema.parse({...base,events:['noise','scanlines','chromatic','dropout'].map((effect,i)=>({id:`fx${i}`,type:'screen',cut:'a',at:2,duration:4,effect,intensity:.6,fadeIn:1,fadeOut:1}))}),new Set());
 assert.deepEqual(signalLevels(timeline.events,0),{noise:0,scanlines:0,chromatic:0,dropout:0});
 assert.deepEqual(signalLevels(timeline.events,180),{noise:.6,scanlines:.6,chromatic:.6,dropout:.6});
 assert.equal(signalLevels(timeline.events,150).noise,.3);
 assert.deepEqual(signalLevels(timeline.events,180),signalLevels(timeline.events,180));
 assert.deepEqual(signalLevels(timeline.events,360),{noise:0,scanlines:0,chromatic:0,dropout:0});
});
