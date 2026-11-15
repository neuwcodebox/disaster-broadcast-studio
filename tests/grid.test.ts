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
import { gridRuns, paintGrid } from '../src/video/map/grid/raster.js';

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

test('grid cells cover the authored bounds with the first row in the north; null stays empty', () => {
  const runs = [...gridRuns(gridSchema.parse(grid()))];
  assert.deepEqual(runs, [
    { color: '#123456', points: [[126, 38], [127, 38], [127, 37], [126, 37]] },
    { color: '#abcdef80', points: [[127, 38], [128, 38], [128, 37], [127, 37]] },
    { color: '#abcdef', points: [[127, 37], [128, 37], [128, 36], [127, 36]] },
  ]);
  assert.deepEqual([...gridRuns(gridSchema.parse({ bounds: [126, 36, 128, 38], cells: [['#123456', '#123456']] }))], [
    { color: '#123456', points: [[126, 38], [128, 38], [128, 36], [126, 36]] },
  ]);
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

test('projected neighboring cells have no seams, keep exact alpha and clip to each viewport', () => {
  const data = gridSchema.parse({ bounds: [0, 0, 2, 2], cells: [
    ['#ff0000', '#00ff0080'], ['#0000ff', null],
  ] });
  const render = (width: number, height: number, project: (p: [number, number]) => { x: number; y: number }) => {
    const pixels = new Uint32Array(width * height);
    paintGrid(data, project, width, height, pixels);
    return new Uint8Array(pixels.buffer);
  };
  const bytes = render(20, 20, ([lon, lat]) => ({ x: lon * 10, y: (2 - lat) * 10 }));
  const pixel = (x: number, y: number) => Array.from(bytes.slice((y * 20 + x) * 4, (y * 20 + x + 1) * 4));
  assert.deepEqual(pixel(5, 5), [255, 0, 0, 255]);
  assert.deepEqual(pixel(15, 5), [0, 255, 0, 128]);
  assert.deepEqual(pixel(5, 15), [0, 0, 255, 255]);
  assert.deepEqual(pixel(15, 15), [0, 0, 0, 0]);
  // Rotate/skew and crop the same field to simulate independent map cameras.
  // Fully colored cells must tile every pixel of their shared interior.
  data.cells[1][1] = '#00ff0080';
  const tilted = render(17, 15, ([lon, lat]) => ({ x: -10 + lon * 20 + lat * 5.3, y: -4 + (2 - lat) * 12.7 }));
  for (let i = 3; i < tilted.length; i += 4) assert.ok(tilted[i] === 128 || tilted[i] === 255);
  assert.notDeepEqual(tilted, bytes);
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
