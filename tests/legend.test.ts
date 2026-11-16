import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, scenarioSchema } from '../src/scenario.js';
import { stateAt } from '../src/timeline.js';
import { Legend } from '../src/video/Legend.js';

const items = [
  { text: '10', color: '#df9852' },
  { text: '2', color: '#45b96e' },
  { text: '0.1', color: '#31a6cd' },
];
const input = (legend: Record<string, unknown> = {}) => ({
  version: 1, title: '범례 검증', fictionNotice: '기술 검증', agencies: {},
  map: { camera: { center: [127, 37], zoom: 7 } },
  cuts: [
    { id: 'a', duration: 10, storyTime: '2031-01-01T00:00:00+09:00' },
    { id: 'b', duration: 5, storyTime: '2031-01-01T01:00:00+09:00', clockTransition: 1 },
  ],
  events: [{ id: 'scale', type: 'legend', cut: 'a', at: 2, duration: 10, carry: true, items, ...legend }],
});

test('existing list legends retain their labels, symbols and default placement', () => {
  const timeline = compile(scenarioSchema.parse(input({ items: [
    { text: '작품에서 정한 범위', color: '#df9852', symbol: 'outline' },
    { text: '이동 경로', color: '#45b96e', symbol: 'line' },
    items[2],
  ] })), new Set());
  const event = timeline.events[0];
  assert.equal(event.type, 'legend');
  if (event.type !== 'legend') throw Error();
  assert.equal(event.layout, 'list');
  assert.equal(event.items[2].symbol, 'fill');
  const html = renderToStaticMarkup(React.createElement(Legend, { event, frame: 180 }));
  assert.match(html, /작품에서 정한 범위/);
  assert.match(html, /이동 경로/);
  assert.match(html, /bottom:24px/);
  assert.match(html, /left:24px/);
  assert.match(html, /border:2px solid #df9852/);
  assert.match(html, /height:0/);
});

test('colorbars preserve authored order, unit and timeline state across seeking and time jumps', () => {
  const timeline = compile(scenarioSchema.parse(input({ layout: 'colorbar', unit: 'mm/h' })), new Set());
  const html = (frame: number) => {
    const state = stateAt(timeline, frame);
    const event = state.visible.find(e => e.type === 'legend');
    return event?.type === 'legend'
      ? renderToStaticMarkup(React.createElement(Legend, { event, frame: state.contentFrame })) : '';
  };
  assert.equal(html(119), '');
  const visible = html(180);
  assert.match(visible, /top:20px/);
  assert.match(visible, /right:20px/);
  assert.match(visible, /mm\/h/);
  assert.ok(visible.indexOf('>10<') < visible.indexOf('>2<'));
  assert.ok(visible.indexOf('>2<') < visible.indexOf('>0.1<'));
  assert.equal(html(599), html(600));
  assert.equal(html(599), html(659));
  assert.equal(html(720), '');
  html(121);
  assert.equal(html(180), visible);

  for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    const event = compile(scenarioSchema.parse(input({ layout: 'colorbar', position })), new Set()).events[0];
    if (event.type !== 'legend') throw Error();
    const placed = renderToStaticMarkup(React.createElement(Legend, { event, frame: 180 }));
    assert.ok(placed.includes(position.startsWith('top') ? 'top:20px' : 'bottom:24px'));
    assert.ok(placed.includes(position.endsWith('right') ? 'right:20px' : 'left:24px'));
  }
});

test('colorbars reject unreadable scales and unsupported symbols without restricting list descriptions', () => {
  const valid = (legend: Record<string, unknown>) => scenarioSchema.safeParse(input(legend)).success;
  assert.equal(valid({ layout: 'colorbar', items: Array(32).fill(items[0]) }), true);
  assert.equal(valid({ layout: 'colorbar', items: [items[0]] }), true);
  for (const invalid of [
    { items: [] }, { items: Array(33).fill(items[0]) },
    { items: [{ ...items[0], text: '1234567890123' }] },
    { items: [{ ...items[0], text: '1\n2' }] },
    { items: [{ ...items[0], symbol: 'line' }] },
    { items: [{ ...items[0], symbol: 'outline' }] },
    { unit: 'mm\nh' }, { unit: 'x'.repeat(17) }, { position: 'center' },
  ]) assert.equal(valid({ layout: 'colorbar', ...invalid }), false, JSON.stringify(invalid));
  assert.equal(valid({ unit: 'mm/h' }), false);
  assert.equal(valid({ items: [{ ...items[0], text: '설명이 있는 기존 항목 범례' }] }), true);
});
