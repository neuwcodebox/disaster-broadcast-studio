import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { scenarioSchema, compile } from '../src/scenario.js';
import { defaultSounds, notificationSounds } from '../src/notifications.js';
import { loadScenario } from '../src/load.js';
import { makeCredits } from '../src/credits.js';

const input = (events: unknown[]) => ({
  version: 1, title: '효과음 확인', fictionNotice: '허구', agencies: { a: '시험' },
  map: { camera: { center: [127, 37], zoom: 6 } },
  assets: { own: { path: 'own.wav', source: 'test', license: 'CC0' } },
  cuts: [{ id: 'c', duration: 15, storyTime: '2031-01-01T00:00:00+09:00' }],
  events: events.map((event: any, i) => ({ id: `e${i}`, cut: 'c', at: i * 2, ...event })),
});
const timeline = (events: unknown[]) => compile(scenarioSchema.parse(input(events)), new Set());
const status = (at: number, duration: number, text = '상태') => ({
  type: 'status', at, duration, items: text ? [{ text, color: '#abcdef' }] : [],
});

test('alerts select distinct level sounds and preserve the advisory sound level', () => {
  const sounds = notificationSounds(timeline(['안전안내', '긴급재난', '위급재난'].map((level) => ({
    type: 'alert', sender: 'a', text: '안내', level,
  }))));
  assert.equal(new Set(sounds.map((s) => s.asset)).size, 3);
  assert.deepEqual(sounds.map((s) => s.frames), [33, 144, 252]);
  assert.deepEqual(sounds.map((s) => s.volume), [0.65, 0.85, 0.95]);
  const last = notificationSounds(timeline([{ type: 'alert', sender: 'a', text: '끝', level: '위급재난', at: 14.5 }]));
  assert.equal(last[0].frames, 30);
});

test('status sounds follow actual changes, with one cue on replacement or clear', () => {
  const sounds = notificationSounds(timeline([
    status(1, 2), status(3, 2), status(5, 2, '변경'), status(7, 1, ''),
    status(9, 2), status(12, 3),
  ]));
  assert.deepEqual(sounds.map((s) => s.start), [1, 5, 7, 9, 11, 12].map((s) => s * 60));
  assert.ok(sounds.every((s) => s.asset === defaultSounds.status.asset));
  assert.deepEqual(notificationSounds(timeline([status(0, 3, '')])), []);
  assert.deepEqual(notificationSounds(timeline([{ ...status(0, 3), sound: false }])), []);
  assert.deepEqual(notificationSounds(timeline([status(1, 2), { ...status(3, 2, ''), sound: false }])).map((s) => s.start), [60]);
});

test('news and bulletin have default cues; every notification supports opt-out and custom assets', () => {
  const events = [
    { type: 'news', source: 'a', headline: '뉴스', duration: 1 },
    { type: 'bulletin', source: 'a', heading: '안내', text: '본문', duration: 1 },
    status(4, 1),
    { type: 'alert', sender: 'a', text: '문자' },
  ];
  const sounds = notificationSounds(timeline(events));
  assert.equal(sounds[0].asset, defaultSounds.news.asset);
  assert.equal(sounds[1].asset, defaultSounds.bulletin.asset);
  assert.deepEqual(notificationSounds(timeline(events.map((e) => ({ ...e, sound: false })))), []);
  const custom = notificationSounds(timeline(events.map((e) => ({ ...e, sound: { asset: 'own', duration: 0.8, volume: 0.4 } }))));
  assert.ok(custom.every((s) => s.asset === 'own' && s.frames === 48 && s.volume === 0.4));
  for (const event of events)
    assert.throws(() => timeline([{ ...event, sound: { asset: 'missing', duration: 1 } }]), /sound.asset/);
});

test('bundled WAVs match cue durations, have headroom and increasing alert RMS', async () => {
  const rms: Record<string, number> = {};
  for (const [key, sound] of Object.entries(defaultSounds)) {
    const wav = await readFile(new URL(`../assets/audio/${sound.file}`, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 48000);
    assert.equal(wav.readUInt32LE(40) / 2, Math.round(sound.duration * 48000));
    let peak = 0, sum = 0;
    for (let i = 44; i < wav.length; i += 2) {
      const sample = wav.readInt16LE(i) / 32768;
      peak = Math.max(peak, Math.abs(sample)); sum += sample * sample;
    }
    assert.ok(peak > 0.05 && peak < 0.9, `${key}: audible without clipping`);
    rms[key] = Math.sqrt(sum / ((wav.length - 44) / 2)) * sound.volume;
  }
  assert.ok(rms['긴급재난'] > rms['안전안내'] * 1.4);
  assert.ok(rms['위급재난'] > rms['긴급재난'] * 1.2);
  assert.ok(rms.bulletin > rms.news * 1.5, 'bulletin should be more prominent than news');
});

test('loader includes used defaults and credits even when there are no alerts', async () => {
  const dir = await mkdtemp('/tmp/dbs-sounds-');
  try {
    const raw = { ...input([{ type: 'news', source: 'a', headline: '뉴스', duration: 1 }]), assets: {} };
    await writeFile(`${dir}/scenario.json`, JSON.stringify(raw));
    const loaded = await loadScenario(`${dir}/scenario.json`);
    assert.deepEqual(Object.keys(loaded.assetPaths), [defaultSounds.news.asset]);
    assert.ok((await readFile(loaded.assetPaths[defaultSounds.news.asset])).length > 44);
    assert.match(makeCredits(loaded.timeline.scenario, []).text, /기본 알림·경보 효과음/);
    raw.events[0].sound = false;
    await writeFile(`${dir}/scenario.json`, JSON.stringify(raw));
    const muted = await loadScenario(`${dir}/scenario.json`);
    assert.deepEqual(muted.assetPaths, {});
    assert.doesNotMatch(makeCredits(muted.timeline.scenario, []).text, /기본 알림·경보 효과음/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
