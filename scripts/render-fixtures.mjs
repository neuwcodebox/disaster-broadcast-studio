// Technical fixtures are generated outside the engine workspace.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const directory = path.resolve(process.argv[2] ?? '/tmp/dbs-render-fixtures');
await mkdir(directory, { recursive: true });
const seconds = 8,
  rate = 48000,
  pcm = Buffer.alloc(rate * seconds * 2);
for (let i = 0; i < rate * seconds; i++)
  pcm.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 1500), i * 2);
const header = Buffer.alloc(44);
header.write('RIFF');
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);
await writeFile(path.join(directory, 'tone.wav'), Buffer.concat([header, pcm]));
const base = {
  version: 1,
  title: '방송 화면 · 기술 검증',
  fictionNotice: '엔진 기능 확인을 위한 허구 화면입니다.',
  agencies: { city: '시험시청', news: '시험방송' },
  assets: {
    tone: {
      path: 'tone.wav',
      source: 'scripts/render-fixtures.mjs, original sine wave',
      license: 'CC0',
    },
  },
  map: { camera: { center: [127.5, 36.2], zoom: 6.15 } },
  cuts: [
    { id: 'one', duration: 5, storyTime: '2026-01-01T18:00:00+09:00' },
    { id: 'two', duration: 3, storyTime: '2026-01-01T19:30:00+09:00', fadeIn: 0.2 },
  ],
  events: [
    {
      id: 'alert',
      type: 'alert',
      cut: 'one',
      at: 0,
      sender: 'city',
      level: '긴급재난',
      text: '[시험시청] 이 문자는 화면 검증을 위한 안내입니다. 지도에 표시된 지역과 문자 수신 시각을 확인합니다. 실제 재난 안내가 아닙니다.',
      regions: ['47190'],
    },
    {
      id: 'region',
      type: 'region',
      cut: 'one',
      at: 0,
      duration: 8,
      carry: true,
      regions: ['47190', '47210', '47250'],
      color: '#bc665f',
      pulse: true,
    },
    {
      id: 'news',
      type: 'news',
      cut: 'one',
      at: 3,
      duration: 5,
      carry: true,
      source: 'news',
      headline: '지역 안내 화면 점검…문자·지도·뉴스 동시 표시',
    },
    {
      id: 'camera',
      type: 'camera',
      cut: 'one',
      at: 3,
      duration: 2,
      to: { center: [128.1, 36.1], zoom: 7.4 },
    },
    {
      id: 'correct',
      type: 'alert',
      cut: 'two',
      at: 0,
      sender: 'city',
      text: '[시험시청] 앞선 문자의 검증 지역을 정정합니다. 이전 문자와 이 문자가 별도 항목으로 남는지 확인합니다.',
    },
    {
      id: 'tone',
      type: 'audio',
      cut: 'one',
      at: 0,
      duration: 8,
      carry: true,
      asset: 'tone',
      volume: 0.3,
      fadeIn: 0.2,
      fadeOut: 0.5,
    },
    { id: 'quiet', type: 'silence', cut: 'two', at: 0, duration: 0.5 },
    {
      id: 'inset',
      type: 'inset',
      cut: 'two',
      at: 0,
      duration: 3,
      title: '보조 지도',
      camera: { center: [128.34, 36.12], zoom: 9 },
    },
  ],
};
await writeFile(path.join(directory, 'first.json'), JSON.stringify(base, null, 2));
const second = {
  ...base,
  title: '본문 · 병렬 연출 검증',
  cuts: [{ id: 'one', duration: 5, storyTime: '2026-02-01T07:00:00+09:00' }],
  events: [
    {
      ...base.events[0],
      text: '[시험시청] 실내에 머무르며 후속 안내를 확인하고, 주변의 다른 사람에게도 내용을 전달해 주시기 바랍니다.',
    },
    { ...base.events[1], duration: 5, carry: false },
    { ...base.events.find((e) => e.type === 'news'), duration: 2, carry: false },
    { ...base.events.find((e) => e.type === 'audio'), duration: 5, carry: false },
    {
      id: 'noise',
      type: 'screen',
      cut: 'one',
      at: 3,
      duration: 2,
      effect: 'interference',
      intensity: 0.3,
    },
  ],
};
await writeFile(path.join(directory, 'second.json'), JSON.stringify(second, null, 2));
console.log(directory);
const overlays = {
  ...base,
  events: [
    ...base.events.filter((e) => !['camera', 'inset'].includes(e.type)),
    {
      id: 'status',
      type: 'status',
      cut: 'one',
      at: 0,
      duration: 8,
      carry: true,
      items: [
        { text: '소방동원령 1호', color: '#c48b67' },
        { text: '갑호비상', color: '#b7a57e' },
        { text: 'DEFCON 4', color: '#9ba8b0' },
      ],
    },
    {
      id: 'zone',
      type: 'zone',
      cut: 'one',
      at: 3,
      duration: 5,
      carry: true,
      points: [
        [126.8, 36.4],
        [127.5, 36.8],
        [128, 36.4],
        [127.5, 36.1],
        [126.8, 36.4],
      ],
    },
    {
      id: 'line',
      type: 'line',
      cut: 'one',
      at: 3,
      duration: 5,
      carry: true,
      points: [
        [126.4, 35.8],
        [127.3, 36.2],
        [128.1, 36.7],
      ],
      drawSeconds: 3,
      dashed: true,
    },
    {
      id: 'bulletin',
      type: 'bulletin',
      cut: 'two',
      at: 0,
      duration: 3,
      source: 'city',
      heading: '방송 안내',
      text: '방송 안내와 시계·상태 표시가 함께 유지됩니다. 지도와 문자 영역은 안내 화면으로 전환됩니다.',
    },
  ],
};
await writeFile(path.join(directory, 'overlays.json'), JSON.stringify(overlays, null, 2));
const chat = {
  ...base,
  title: '스트리밍 채팅 · 기술 검증',
  assets: {},
  cuts: [{ id: 'one', duration: 20, storyTime: '2026-01-01T18:00:00+09:00' }],
  events: [
    { ...base.events[0], at: 5, sound: false },
    // Rapid arrivals exercise history density, rather than demonstrate reading-time pacing.
    { ...base.events[0], id: 'follow-up', at: 7, sound: false, level: '안전안내',
      text: '[시험시청] 앞선 안내의 대상 지역을 확인하고 후속 방송을 기다려 주시기 바랍니다. 문자 이력과 채팅을 함께 확인하는 시험 문안입니다.' },
    { ...base.events[0], id: 'correction', at: 9, sound: false,
      text: '[시험시청] 앞선 안내를 정정합니다. 지역별 안내 내용은 최신 문자를 확인해 주시기 바랍니다. 실제 재난 안내가 아닙니다.' },
    { ...base.events[1], duration: 20 },
    { ...base.events.find((e) => e.type === 'news'), at: 5, duration: 15,
      headline: '현황판 시험 송출…시청자 반응과 안내 가독성 확인' },
    { id: 'live', type: 'chat', cut: 'one', at: 5, duration: 15 },
    ...[
      ['강가사는사람', '안내 방송도 같은 말 계속 나오는데요', '#9fb8cb'],
      ['밤산책', '어느 쪽이에요? 저희 동네는 조용한데', '#b6ab8d'],
      ['저녁하늘', '문자 이제 왔어요. 일단 창문 닫았습니다', '#9eb6a3'],
      ['강가사는사람', '아까는 밖에서 들렸는데 지금은 복도에서도 들려요', '#9fb8cb'],
      ['동네주민', '저희 동네는 아직 조용합니다. 가족들과 집 안에서 기다리고 있어요. 다른 지역도 같은 문자를 받았나요?', '#b6ab8d'],
    ].map(([author, text, color], i) => ({
      id: `message-${i}`, type: 'chat-message', chat: 'live', cut: 'one',
      at: [5.5, 7, 9, 11, 15][i], author, text, color,
    })),
  ],
};
await writeFile(path.join(directory, 'chat.json'), JSON.stringify(chat, null, 2));
const mobile = {
  ...chat,
  title: '모바일 가로 화면 · 가독성 검증',
  cuts: [{ ...chat.cuts[0], duration: 50 }],
  events: [
    ...chat.events.map((event) => 'duration' in event ? { ...event, duration: 50 - event.at } : event),
    { id: 'readiness', type: 'status', cut: 'one', at: 5, duration: 45, sound: false,
      items: [{ text: '소방동원령 1호', color: '#c48b67' }, { text: '갑호비상', color: '#c8ba95' }] },
    { id: 'long-alert', type: 'alert', cut: 'one', at: 14, sender: 'city', sound: false,
      level: '위급재난',
      text: '해안가·하천 주변 주민께서는 가까운 건물 안으로 이동하십시오. 창문과 출입문을 닫고 후속 안내를 확인하십시오.',
      occurredAt: '2026-01-01T17:59:00+09:00', publishedAt: '2026-01-01T18:00:13+09:00' },
    { id: 'notice', type: 'bulletin', cut: 'one', at: 38, duration: 12, source: 'city', sound: false,
      heading: '방송 안내', text: '이 화면은 모바일 가로 전체화면에서 글자 크기와 명암을 확인하기 위한 허구의 방송입니다. 지도·재난문자·뉴스·채팅은 실제 긴급 서비스와 연결되지 않습니다.' },
  ],
};
// Headlines are brief and remain fully visible while active.
const mobileNews = mobile.events.find((event) => event.type === 'news');
mobileNews.headline = '해안가·하천 주변 주민에 실내 대피 안내…관계 기관, 현장 상황 확인 중';
await writeFile(path.join(directory, 'mobile.json'), JSON.stringify(mobile, null, 2));
