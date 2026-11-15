import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { scenarioSchema, compile } from '../src/scenario.js';
import { AlertHistory } from '../src/video/Alerts.js';

const timeline = compile(
  scenarioSchema.parse({
    version: 1,
    title: '문자 이력 검증',
    fictionNotice: '허구 검증 화면',
    agencies: { city: '시험시' },
    map: { camera: { center: [127.5, 36], zoom: 6 } },
    cuts: [
      { id: 'first', duration: 40, storyTime: '2026-01-01T12:00:00+09:00' },
      { id: 'second', duration: 40, storyTime: '2026-01-01T14:00:00+09:00' },
    ],
    events: [
      { id: 'old', type: 'alert', cut: 'first', at: 0, sender: 'city', text: '이전 문자' },
      { id: 'new', type: 'alert', cut: 'first', at: 4, sender: 'city', text: '새 문자' },
      { id: 'same1', type: 'alert', cut: 'first', at: 6, sender: 'city', text: '동시 문자 하나' },
      { id: 'same2', type: 'alert', cut: 'first', at: 6, sender: 'city', text: '동시 문자 둘' },
      {
        id: 'jump',
        type: 'alert',
        cut: 'second',
        at: 0,
        sender: 'city',
        text: '시간 도약 후 문자',
        publishedAt: '2026-01-01T11:00:00+09:00',
      },
    ],
  }),
  new Set(),
);
const orderAt = (frame: number) => {
  const markup = renderToStaticMarkup(React.createElement(AlertHistory, { timeline, frame }));
  return timeline.events
    .filter((e) => e.type === 'alert')
    .map((e) => ({ id: e.id, index: markup.indexOf(e.text) }))
    .filter((e) => e.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((e) => e.id);
};

test('new arrivals insert above existing cards and retain every earlier card', () => {
  assert.deepEqual(orderAt(239), ['old']);
  assert.deepEqual(orderAt(240), ['new', 'old']);
});
test('simultaneous arrivals use reverse scenario order and do not cycle with elapsed time', () => {
  for (const frame of [360, 1080, 1800, 2399])
    assert.deepEqual(orderAt(frame), ['same2', 'same1', 'new', 'old']);
});
test('a cut time jump and older publication time preserve receive order and arbitrary seeking', () => {
  assert.deepEqual(orderAt(2400), ['jump', 'same2', 'same1', 'new', 'old']);
  assert.deepEqual(orderAt(360), ['same2', 'same1', 'new', 'old']);
});
