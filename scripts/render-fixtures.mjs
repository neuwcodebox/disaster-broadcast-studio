// Technical fixtures are generated outside the engine workspace.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const directory=path.resolve(process.argv[2]??'/tmp/dbs-render-fixtures');await mkdir(directory,{recursive:true});
const seconds=8,rate=48000,pcm=Buffer.alloc(rate*seconds*2);
for(let i=0;i<rate*seconds;i++)pcm.writeInt16LE(Math.round(Math.sin(i/rate*2*Math.PI*440)*1500),i*2);
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);await writeFile(path.join(directory,'tone.wav'),Buffer.concat([header,pcm]));
const base={version:1,title:'방송 화면 · 기술 검증',fictionNotice:'엔진 기능 확인을 위한 허구 화면입니다.',agencies:{city:'시험시청',news:'시험방송'},assets:{tone:{path:'tone.wav',source:'scripts/render-fixtures.mjs, original sine wave',license:'CC0'}},map:{camera:{center:[127.5,36.2],zoom:6.15}},cuts:[{id:'one',duration:5,storyTime:'2026-01-01T18:00:00+09:00'},{id:'two',duration:3,storyTime:'2026-01-01T19:30:00+09:00',fadeIn:0.2}],events:[
{id:'alert',type:'alert',cut:'one',at:0,sender:'city',level:'긴급재난',text:'[시험시청] 이 문자는 화면 검증을 위한 안내입니다. 지도에 표시된 지역과 문자 수신 시각을 확인합니다. 실제 재난 안내가 아닙니다.',regions:['47190']},
{id:'region',type:'region',cut:'one',at:0,duration:8,carry:true,regions:['47190','47210','47250'],label:'검증 지역',color:'#dfab66',pulse:true},
{id:'point',type:'marker',cut:'one',at:3,duration:2,position:[128.34,36.12],label:'표시 지점',effect:'ring'},
{id:'news',type:'news',cut:'one',at:3,duration:5,carry:true,source:'news',headline:'지역 안내 화면 점검…문자·지도·뉴스 동시 표시'},
{id:'camera',type:'camera',cut:'one',at:3,duration:2,to:{center:[128.1,36.1],zoom:7.4}},
{id:'correct',type:'alert',cut:'two',at:0,sender:'city',text:'[시험시청] 앞선 문자의 검증 지역을 정정합니다. 이전 문자와 이 문자가 별도 항목으로 남는지 확인합니다.',corrects:'alert'},
{id:'tone',type:'audio',cut:'one',at:0,duration:8,carry:true,asset:'tone',volume:0.3,fadeIn:0.2,fadeOut:0.5},
{id:'quiet',type:'silence',cut:'two',at:0,duration:0.5},
{id:'inset',type:'inset',cut:'two',at:0,duration:3,title:'보조 지도',camera:{center:[128.34,36.12],zoom:9}},
]};
await writeFile(path.join(directory,'first.json'),JSON.stringify(base,null,2));
const second={...base,title:'장문 · 병렬 연출 검증',cuts:[{id:'one',duration:5,storyTime:'2026-02-01T07:00:00+09:00'}],events:[
{...base.events[0],text:'[시험시청] 장문 표시 검증입니다.\n'+ '실내에 머무르며 후속 안내를 확인하고, 주변의 다른 사람에게도 내용을 전달해 주시기 바랍니다. '.repeat(7)},
{...base.events[1],duration:5,carry:false},
{...base.events[3],duration:2,carry:false},
{...base.events[6],duration:5,carry:false},
{id:'noise',type:'screen',cut:'one',at:3,duration:2,effect:'interference',intensity:0.3},
]};await writeFile(path.join(directory,'second.json'),JSON.stringify(second,null,2));console.log(directory);
