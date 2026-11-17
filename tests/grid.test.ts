import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { gridSchema } from '../src/grid.js';
import { compile, scenarioSchema } from '../src/scenario.js';
import { stateAt } from '../src/timeline.js';
import { loadScenario } from '../src/load.js';
import { PreviewProject } from '../src/preview/project.js';
import { makeCredits } from '../src/credits.js';
import { MapGrids } from '../src/video/map/grid/index.js';
import { paintGrid } from '../src/video/map/grid/raster.js';

const grid = () => ({ bounds: [126, 36, 128, 38], cells: [
  ['#123456', '#abcdef80'], [null, '#abcdef'],
] });
const input = () => ({
  version: 1, title: '격자 기술 검증', fictionNotice: '허구의 합성 분포', agencies: {},
  map: { camera: { center: [127, 37], zoom: 7 } },
  assets: { field: { path: 'grid.json', source: '기술 검증용 합성 분포', license: 'CC0' } },
  cuts: [
    { id: 'a', duration: 10, storyTime: '2031-01-01T00:00:00+09:00' },
    { id: 'b', duration: 10, storyTime: '2031-01-01T01:00:00+09:00', clockTransition: 1 },
  ],
  events: [{ id: 'field', type: 'grid', cut: 'a', at: 2, duration: 10, carry: true, asset: 'field', fadeIn: 1, fadeOut: 1 }],
});

test('grid files validate geographic bounds, rectangular dimensions and transparent cells', () => {
  assert.deepEqual(gridSchema.parse(grid()), grid());
  for (const invalid of [
    { ...grid(), bounds: [128, 36, 126, 38] },
    { ...grid(), bounds: [126, 38, 128, 38] },
    { ...grid(), bounds: [126, -86, 128, 38] },
    { ...grid(), bounds: [126, 36, Infinity, 38] },
    { ...grid(), cells: [] }, { ...grid(), cells: [[]] },
    { ...grid(), cells: [['#123456'], [null, null]] },
    { ...grid(), cells: [['red']] }, { ...grid(), cells: [[1]] },
    { ...grid(), cells: [['#123456', 'transparent']] },
    { ...grid(), cells: [Array(257).fill(null)] },
    { ...grid(), cells: Array.from({ length: 257 }, () => [null]) },
  ]) assert.equal(gridSchema.safeParse(invalid).success, false, JSON.stringify(invalid).slice(0, 120));
});

test('grid layers support fades, cut carry, time-jump hold, arbitrary seeking and clean replacement', () => {
  const raw = input();
  raw.events.push({ ...raw.events[0], id: 'replacement', cut: 'b', at: 2, duration: 2, carry: false, fadeIn: 0, fadeOut: 0 });
  const t = compile(scenarioSchema.parse(raw), new Set());
  const visible = (frame: number) => stateAt(t, frame).visible.filter(e => e.type === 'grid');
  const markup = (frame: number) => renderToStaticMarkup(React.createElement(MapGrids, {
    events: visible(frame), grids: { field: gridSchema.parse(grid()) }, projection: null,
    frame: stateAt(t, frame).contentFrame,
  }));
  assert.equal(markup(119), '');
  assert.match(markup(120), /opacity:0/);
  assert.match(markup(150), /opacity:0.3/);
  assert.match(markup(180), /opacity:0.6/);
  assert.match(markup(689), /opacity:0.3/);
  assert.equal(markup(599), markup(600));
  assert.equal(markup(599), markup(659));
  assert.deepEqual(visible(720).map(e => e.id), ['replacement']);
  assert.equal(markup(840), '');
  const expected = markup(180);
  markup(800); markup(121);
  assert.equal(markup(180), expected);
  assert.doesNotMatch(expected, /<text|<span|<line|<path/);
  const events = input().events;
  assert.throws(() => compile(scenarioSchema.parse({ ...input(), events: [{ ...events[0], asset: 'missing' }] }), new Set()), /field.*asset.*missing/);
  assert.throws(() => compile(scenarioSchema.parse({ ...input(), events: [{ ...events[0], carry: false }] }), new Set()), /carry/);
  assert.throws(() => compile(scenarioSchema.parse({ ...input(), events: [{ ...events[0], fadeIn: 10 }] }), new Set()), /fades exceed duration/);
  assert.equal(scenarioSchema.safeParse({ ...input(), events: [{ ...events[0], opacity: 1.1 }] }).success, false);
});

// Use the same geographic contract as the map: longitude and Mercator latitude.
const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
function raster(cells: (string | null)[][], width = 21, height = 21) {
  const data = gridSchema.parse({ bounds: [0, -1, 2, 1], cells });
  const pixels = new Uint32Array(width * height);
  paintGrid(data, ([lon, lat]) => ({
    x: lon * 10 + 0.5, y: (1 - mercator(lat) / mercator(1)) * 10 + 0.5,
  }), width, height, pixels);
  const bytes = new Uint8Array(pixels.buffer);
  return (x: number, y: number) => Array.from(bytes.slice((y * width + x) * 4, (y * width + x + 1) * 4));
}

test('grid colors blend continuously between cell centers and clamp at the geographic bounds', () => {
  const horizontal = raster([['#ff0000', '#0000ff']]);
  assert.deepEqual(horizontal(5, 10), [255, 0, 0, 255]);
  assert.deepEqual(horizontal(10, 10), [128, 0, 128, 255]);
  assert.deepEqual(horizontal(15, 10), [0, 0, 255, 255]);
  assert.deepEqual(horizontal(0, 10), [255, 0, 0, 255]);
  assert.deepEqual(horizontal(19, 10), [0, 0, 255, 255]);
  assert.deepEqual(horizontal(20, 10), [0, 0, 0, 0]);
  for (let x = 6; x < 15; x++) {
    assert.ok(horizontal(x, 10)[0] < horizontal(x - 1, 10)[0]);
    assert.equal(horizontal(x, 10)[3], 255);
  }
  const vertical = raster([['#ff0000'], ['#0000ff']]);
  assert.deepEqual(vertical(10, 10), [128, 0, 128, 255]);
  assert.deepEqual(vertical(10, 0), [255, 0, 0, 255]);
  assert.deepEqual(vertical(10, 19), [0, 0, 255, 255]);
  const four = raster([['#ff0000', '#00ff00'], ['#0000ff', '#ffffff']]);
  assert.deepEqual(four(10, 10), [128, 128, 128, 255]);
});

test('grid interpolation blends alpha without dark fringes or invisible color leakage', () => {
  const empty = raster([['#ff0000', null]]);
  assert.deepEqual(empty(10, 10), [255, 0, 0, 128]);
  assert.deepEqual(empty(15, 10), [0, 0, 0, 0]);
  assert.deepEqual(raster([['#ff0000', '#0000ff00']])(10, 10), empty(10, 10));
  assert.deepEqual(raster([['#ff0000', '#0000ff80']])(10, 10), [170, 0, 85, 192]);
  assert.deepEqual(raster([['#12345680']])(10, 10), [18, 52, 86, 128]);
  assert.deepEqual(raster([[null]])(10, 10), [0, 0, 0, 0]);
});

test('grid interpolation follows geographic coordinates under perspective, rotation and viewport cropping', () => {
  const data = gridSchema.parse({ bounds: [0, -60, 2, 60], cells: [
    ['#000000', '#ff0000'], ['#0000ff', '#ff00ff'],
  ] });
  const pixels = new Uint32Array(25 * 22);
  paintGrid(data, ([lon, lat]) => {
    const u = lon / 2, v = (1 - mercator(lat) / mercator(60)) / 2;
    const depth = 1 + 0.3 * u + 0.1 * v;
    return { x: (30 * u + 5 * v - 8) / depth, y: (30 * v - 4) / depth };
  }, 25, 22, pixels);
  const bytes = new Uint8Array(pixels.buffer);
  let covered = 0, clipped = 0;
  for (let y = 0; y < 22; y++) for (let x = 0; x < 25; x++) {
    const sx = x + 0.5, sy = y + 0.5;
    // Solve the two screen equations independently for the authored position.
    const a = 30 - 0.3 * sx, b = 5 - 0.1 * sx, c = -0.3 * sy, d = 30 - 0.1 * sy;
    const u = ((sx + 8) * d - b * (sy + 4)) / (a * d - b * c);
    const v = (a * (sy + 4) - c * (sx + 8)) / (a * d - b * c);
    const offset = (y * 25 + x) * 4;
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      assert.equal(bytes[offset + 3], 0); clipped++; continue;
    }
    const latitude = Math.atan(Math.sinh((1 - 2 * v) * mercator(60))) * 180 / Math.PI;
    const red = Math.round(Math.max(0, Math.min(1, 2 * u - 0.5)) * 255);
    const blue = Math.round(Math.max(0, Math.min(1, (60 - latitude) / 60 - 0.5)) * 255);
    assert.ok(Math.abs(bytes[offset] - red) <= 1);
    assert.equal(bytes[offset + 1], 0);
    assert.ok(Math.abs(bytes[offset + 2] - blue) <= 1);
    assert.equal(bytes[offset + 3], 255);
    covered++;
  }
  assert.ok(covered > 100 && clipped > 0);
});

test('grid assets resolve next to the scenario and report malformed data at the referring event', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dbs-grid-'));
  try {
    const file = path.join(root, 'scenario.json');
    await writeFile(file, JSON.stringify(input()));
    await assert.rejects(loadScenario(file), /assets.field.path.*missing file/);
    await writeFile(path.join(root, 'grid.json'), JSON.stringify(grid()));
    const loaded = await loadScenario(file);
    assert.deepEqual(loaded.grids.field, grid());
    assert.match(makeCredits(loaded.timeline.scenario, []).text, /그리드 field\n출처: 기술 검증용 합성 분포/);
    for (const source of ['{', JSON.stringify({ ...grid(), cells: [[null], [null, null]] })]) {
      await writeFile(path.join(root, 'grid.json'), source);
      await assert.rejects(loadScenario(file), /events\[0\].*field.*assets.field.path.*invalid grid/);
    }
    const raw = input();
    raw.assets.field.path = 'https://example.org/grid.json';
    await writeFile(file, JSON.stringify(raw));
    await assert.rejects(loadScenario(file), /assets.field.path.*local file/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('preview reloads edited grids, preserves valid data on errors and recovers without editing the scenario', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dbs-grid-preview-'));
  try {
    const file = path.join(root, 'scenario.json'), dataFile = path.join(root, 'grid.json');
    await writeFile(file, JSON.stringify(input()));
    await writeFile(dataFile, JSON.stringify(grid()));
    const project = new PreviewProject(file, path.join(root, 'public'));
    await project.refresh();
    assert.equal(project.status().revision, 1);
    assert.deepEqual(project.current().props.grids.field, grid());
    assert.equal(Object.hasOwn(project.current().props.audio, 'field'), false);
    const changed = { ...grid(), cells: [['#ff0000']] };
    await writeFile(dataFile, JSON.stringify(changed));
    await project.refresh();
    assert.equal(project.status().revision, 2);
    assert.deepEqual(project.current().props.grids.field, changed);
    await writeFile(dataFile, '{}');
    await project.refresh();
    assert.match(project.status().error!, /invalid grid/);
    assert.equal(project.status().revision, 2);
    assert.deepEqual(project.current().props.grids.field, changed);
    await writeFile(dataFile, JSON.stringify(grid()));
    await project.refresh();
    assert.equal(project.status().error, null);
    assert.equal(project.status().revision, 3);
    assert.deepEqual(project.current().props.grids.field, JSON.parse(await readFile(dataFile, 'utf8')));
  } finally { await rm(root, { recursive: true, force: true }); }
});
