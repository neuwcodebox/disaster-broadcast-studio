import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scenarioSchema, compile, alertText } from '../src/scenario.js';
import { stateAt, envelope } from '../src/timeline.js';
import { makeCredits } from '../src/credits.js';
import { loadScenario } from '../src/load.js';
const input = () => ({
  version: 1,
  title: '계약 검증',
  fictionNotice: '기술 검증용 허구 화면입니다.',
  agencies: { city: '시험시', news: '시험 뉴스' },
  map: { camera: { center: [127.5, 36], zoom: 6 } },
  cuts: [
    { id: 'first', duration: 10, storyTime: '2026-01-01T12:00:00+09:00' },
    { id: 'second', duration: 10, storyTime: '2026-01-01T14:00:00+09:00' },
  ],
  events: [
    {
      id: 'a',
      type: 'alert',
      cut: 'first',
      at: 2,
      sender: 'city',
      text: '첫 안내',
      regions: ['47190'],
    },
    {
      id: 'b',
      type: 'alert',
      cut: 'second',
      at: 1,
      sender: 'city',
      text: '정정 안내',
    },
  ],
});
const timeline = () => compile(scenarioSchema.parse(input()), new Set(['47190']));
test('cut interiors use real time; explicit cuts jump; seeking restores history', () => {
  const t = timeline();
  assert.ok(Math.abs(stateAt(t, 599).epoch - stateAt(t, 0).epoch - (599 / 60) * 1000) < 0.001);
  assert.equal(stateAt(t, 600).epoch, Date.parse('2026-01-01T14:00:00+09:00'));
  assert.deepEqual(
    stateAt(t, 670).alerts.map((e) => e.id),
    ['b', 'a'],
  );
  const expected = stateAt(t, 670);
  for (let f = 0; f < 670; f++) stateAt(t, f);
  assert.deepEqual(stateAt(t, 670), expected);
});
test('reference errors identify offending event and field', () => {
  const x = input();
  x.events[0].regions = ['missing'];
  assert.throws(() => compile(scenarioSchema.parse(x), new Set()), /events\[0\].*regions.*missing/);
});
test('conflicting single-owner tracks are rejected; independent layers can overlap', () => {
  const x: any = input();
  x.events.push(
    ...['n1', 'n2'].map((id) => ({
      id,
      type: 'news',
      cut: 'first',
      at: 0,
      duration: 4,
      source: 'news',
      headline: '검증용 제목',
    })),
  );
  assert.throws(() => compile(scenarioSchema.parse(x), new Set(['47190'])), /overlapping news/);
  x.events.pop();
  x.events.push({
    id: 'm',
    type: 'marker',
    cut: 'first',
    at: 0,
    duration: 4,
    position: [127, 36],
    label: '검증',
  });
  assert.doesNotThrow(() => compile(scenarioSchema.parse(x), new Set(['47190'])));
});
test('cut crossing is explicit and audio envelope is frame based', () => {
  const x: any = input();
  x.events.push({ id: 'silence', type: 'silence', cut: 'first', at: 9, duration: 2 });
  assert.throws(() => compile(scenarioSchema.parse(x), new Set(['47190'])), /carry/);
  x.events.at(-1).carry = true;
  const t = compile(scenarioSchema.parse(x), new Set(['47190']));
  assert.ok(stateAt(t, 620).visible.some((e) => e.id === 'silence'));
  assert.equal(envelope(0, 0, 120, 1, 0), 0);
  assert.equal(envelope(60, 0, 120, 1, 0), 1);
  assert.equal(envelope(120, 0, 120, 0, 0), 0);
});
test('past-time cuts are rejected', () => {
  const y = input();
  y.cuts[1].storyTime = '2026-01-01T11:00:00+09:00';
  assert.throws(() => compile(scenarioSchema.parse(y), new Set(['47190'])), /storyTime/);
});
test('external workspace resolves assets relative to scenario and reports missing files', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dbs-contract-'));
  try {
    const x: any = input();
    x.assets = { tone: { path: 'tone.wav', source: 'test', license: 'CC0' } };
    await writeFile(path.join(dir, 'scenario.json'), JSON.stringify(x));
    await assert.rejects(
      loadScenario(path.join(dir, 'scenario.json')),
      /assets.tone.path.*missing/,
    );
    await writeFile(path.join(dir, 'tone.wav'), 'test');
    const loaded = await loadScenario(path.join(dir, 'scenario.json'));
    assert.equal(loaded.assetPaths.tone, path.join(dir, 'tone.wav'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('unknown keys catch misspellings and fractional subframes are rejected', () => {
  const x: any = input();
  x.events[0].recievedAt = 'bad';
  assert.equal(scenarioSchema.safeParse(x).success, false);
  const y = input();
  y.cuts[0].duration = 0.001;
  assert.throws(
    () => compile(scenarioSchema.parse(y), new Set(['47190'])),
    /shorter than one frame/,
  );
});

test('status text and colors are authored verbatim and restore on direct seek', () => {
  const x: any = input();
  x.events.push(
    {
      id: 's1',
      type: 'status',
      cut: 'first',
      at: 1,
      duration: 2,
      items: [
        { text: 'DEFCON 4', color: '#aabbcc' },
        { text: '연결 유지', color: '#123456' },
      ],
    },
    { id: 's2', type: 'status', cut: 'first', at: 3, duration: 2, items: [] },
  );
  const t = compile(scenarioSchema.parse(x), new Set(['47190']));
  assert.deepEqual(
    stateAt(t, 60).visible.find((e) => e.type === 'status')?.items,
    x.events[2].items,
  );
  assert.deepEqual(stateAt(t, 180).visible.find((e) => e.type === 'status')?.items, []);
  assert.equal(
    stateAt(t, 300).visible.some((e) => e.type === 'status'),
    false,
  );
  x.events[3].at = 2;
  assert.throws(() => compile(scenarioSchema.parse(x), new Set(['47190'])), /overlapping status/);
});
test('broadcast notices, optional marker captions, and geographic overlay contracts', () => {
  const x: any = input();
  x.agencies.operator = '현황판 운영팀';
  x.events.push(
    {
      id: 'b1',
      type: 'bulletin',
      cut: 'first',
      at: 0,
      duration: 3,
      source: 'operator',
      heading: '수신 지연 안내',
      text: '문자 수집 지연으로 최신 정보 반영이 늦어지고 있습니다.',
    },
    { id: 'p1', type: 'marker', cut: 'first', at: 0, duration: 3, position: [127, 36] },
    {
      id: 'z1',
      type: 'zone',
      cut: 'first',
      at: 0,
      duration: 3,
      points: [
        [127, 36],
        [128, 36],
        [128, 37],
        [127, 36],
      ],
    },
    {
      id: 'l1',
      type: 'line',
      cut: 'first',
      at: 0,
      duration: 3,
      points: [
        [127, 36],
        [128, 37],
      ],
      drawSeconds: 4,
    },
  );
  assert.doesNotThrow(() => compile(scenarioSchema.parse(x), new Set(['47190'])));
  x.events[4].points[3] = [129, 36];
  assert.throws(() => compile(scenarioSchema.parse(x), new Set(['47190'])), /points/);
  assert.equal(alertText('시험시', '[시험시] 안내'), '[시험시] 안내');
  assert.equal(alertText('시험시', '시험시 일부 지역 안내'), '[시험시] 시험시 일부 지역 안내');
});

test('publication credits retain creator, source, license and custom asset credits', () => {
  const x = scenarioSchema.parse(input());
  const entry = {
    id: 'kr-boundaries',
    title: '경계',
    creator: '제공자',
    sources: ['https://example.org/source'],
    licenses: [{ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }],
    changes: '병합',
  };
  const credits = makeCredits(x, [entry]);
  for (const value of [
    '제공자',
    'https://example.org/source',
    'https://creativecommons.org/licenses/by/4.0/',
    '병합',
  ])
    assert.ok(credits.text.includes(value));
  x.map.regions = 'local.geojson';
  x.map.attribution = '로컬 경계: 제공자·이용조건';
  x.assets = { sound: { path: 'private/path.wav', source: '직접 제작', license: 'CC0' } };
  const custom = makeCredits(x, [entry]);
  assert.deepEqual(custom.entries, []);
  assert.ok(custom.text.includes(x.map.attribution));
  assert.ok(custom.text.includes('직접 제작'));
  assert.equal(custom.text.includes('private/path.wav'), false);
});

test('overlapping map categories keep independent fill, outline and timed legend',()=>{
 const raw=input();
 raw.events=[];
 const scenario=scenarioSchema.parse({...raw,events:[
  {id:'fill',type:'region',cut:'first',at:0,duration:10,regions:['47190'],color:'#8ba7bb',fillOpacity:.28,strokeWidth:0},
  {id:'outline',type:'region',cut:'first',at:2,duration:4,regions:['47190'],color:'#cb9266',fillOpacity:0,strokeWidth:3},
  {id:'key',type:'legend',cut:'first',at:2,duration:4,items:[{text:'작품에서 정한 범위',color:'#cb9266',symbol:'outline'}]},
 ]});
 const timeline=compile(scenario,new Set(['47190']));
 assert.deepEqual(stateAt(timeline,120).visible.map(e=>e.id),['fill','outline','key']);
 assert.deepEqual(stateAt(timeline,360).visible.map(e=>e.id),['fill']);
 assert.equal(scenario.events[0].type==='region'&&scenario.events[0].strokeWidth,0);
 assert.equal(scenario.events[1].type==='region'&&scenario.events[1].fillOpacity,0);
 assert.throws(()=>scenarioSchema.parse({...raw,events:[{...scenario.events[0],fillOpacity:1.1}]}));
});

test('rapid identical messages do not repeat reading warnings; changed content still does',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'dbs-repeat-'));
 try {
  const x:any=input();x.events=[0,.25,.5].map((offset,i)=>({id:`repeat${i}`,type:'alert',cut:'first',at:2+offset,sender:'city',text:'반복 안내',regions:[]}));
  const file=path.join(root,'scenario.json');await writeFile(file,JSON.stringify(x));
  assert.deepEqual((await loadScenario(file)).warnings,[]);
  x.events[1].text='새로운 안내';await writeFile(file,JSON.stringify(x));
  assert.ok((await loadScenario(file)).warnings.some(w=>w.includes('repeat0')));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('references must name declared agencies and assets, including prototype property names', () => {
  const raw = input();
  for (const event of [
    { id: 'bad', type: 'alert', cut: 'first', at: 0, sender: 'constructor', text: '안내' },
    { id: 'bad', type: 'news', cut: 'first', at: 0, duration: 1, source: 'toString', headline: '소식' },
    { id: 'bad', type: 'bulletin', cut: 'first', at: 0, duration: 1, source: 'constructor', heading: '안내', text: '본문' },
    { id: 'bad', type: 'audio', cut: 'first', at: 0, duration: 1, asset: 'constructor' },
    { id: 'bad', type: 'alert', cut: 'first', at: 0, sender: 'city', text: '안내', sound: { asset: 'toString', duration: 1 } },
  ]) {
    assert.throws(() => compile(scenarioSchema.parse({ ...raw, events: [event] }), new Set()), /unknown (agency|asset)/);
  }
  const scenario = scenarioSchema.parse({ ...raw, agencies: { constructor: '명시한 기관' }, events: [
    { id: 'declared', type: 'alert', cut: 'first', at: 0, sender: 'constructor', text: '안내' },
  ] });
  assert.doesNotThrow(() => compile(scenario, new Set()));
});

test('region fades cannot exceed the authored event duration', () => {
  const scenario = scenarioSchema.parse({ ...input(), events: [
    { id: 'region', type: 'region', cut: 'first', at: 0, duration: 2, regions: ['47190'], fadeIn: 1, fadeOut: 2 },
  ] });
  assert.throws(() => compile(scenario, new Set(['47190'])), /region.*fades exceed duration/);
});

test('extended map and audio controls enforce bounds, defaults and cut crossing', () => {
  const raw = { ...input(), assets: { bed: { path: 'bed.wav', source: 'test', license: 'CC0' } } };
  const events = [
    { id: 'radius', type: 'circle', cut: 'first', at: 9, duration: 3, center: [127, 36], radiusKm: 50 },
    { id: 'route', type: 'line', cut: 'first', at: 9, duration: 3, points: [[127, 36], [128, 37]], dashed: true, flowSpeed: -2 },
    { id: 'bed', type: 'audio', cut: 'first', at: 9, duration: 3, asset: 'bed', loop: true, playbackRate: 1.5 },
  ];
  assert.throws(() => compile(scenarioSchema.parse({ ...raw, events }), new Set()), /carry/);
  const scenario = scenarioSchema.parse({ ...raw, events: events.map((e) => ({ ...e, carry: true })) });
  const timeline = compile(scenario, new Set());
  assert.deepEqual(stateAt(timeline, 660).visible.map((e) => e.id), ['radius', 'route', 'bed']);
  assert.deepEqual(stateAt(timeline, 720).visible, []);
  assert.equal(scenario.events[0].type === 'circle' && scenario.events[0].fillOpacity, 0.12);
  for (const e of events.slice(0, 2)) {
    assert.throws(() => compile(scenarioSchema.parse({ ...raw, events: [{ ...e, at: 0, fadeIn: 2, fadeOut: 2 }] }), new Set()), /fades exceed duration/);
  }
  for (const event of [
    { ...events[0], radiusKm: 0 }, { ...events[0], radiusKm: 2001 },
    { ...events[0], center: [181, 36] }, { ...events[0], fillOpacity: 1.01 },
    { ...events[0], strokeWidth: -1 }, { ...events[0], strokeWidth: 21 },
    { ...events[1], flowSpeed: 11 }, { ...events[1], fadeOut: -1 },
    { ...events[2], playbackRate: 0.24 }, { ...events[2], playbackRate: 4.01 },
    { ...events[2], loop: 'yes' },
  ]) assert.equal(scenarioSchema.safeParse({ ...raw, events: [event] }).success, false);
  const original = scenarioSchema.parse({ ...raw, events: [{ ...events[2], at: 0, loop: undefined, playbackRate: undefined }] });
  const audio = original.events[0];
  assert.equal(audio.type === 'audio' && audio.loop, false);
  assert.equal(audio.type === 'audio' && audio.playbackRate, 1);
  for (const latitude of [-82, 82]) {
    assert.throws(() => compile(scenarioSchema.parse({ ...raw, events: [
      { ...events[0], at: 0, center: [40, latitude], radiusKm: 2000 },
    ] }), new Set()), /radius.*radiusKm.*supported map latitudes/);
  }
});

test('reading warnings exclude all five seconds of the opening', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dbs-reading-'));
  try {
    const raw = { ...input(), cuts: input().cuts.slice(0, 1), events: [
      { id: 'early', type: 'alert', cut: 'first', at: 0, sender: 'city', text: '안내' },
    ] };
    const file = path.join(root, 'scenario.json');
    await writeFile(file, JSON.stringify(raw));
    assert.match((await loadScenario(file)).warnings.join('\n'), /early.*allow 8s/);
    raw.cuts[0].duration = 13;
    await writeFile(file, JSON.stringify(raw));
    assert.deepEqual((await loadScenario(file)).warnings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
