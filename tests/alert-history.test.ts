import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { scenarioSchema, compile } from '../src/scenario.js';
import { AlertHistory } from '../src/video/Alerts.js';
import { changeFrames } from '../src/video/transitions.js';

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
      {
        id: 'old',
        type: 'alert',
        cut: 'first',
        at: 0,
        sender: 'city',
        level: '긴급재난',
        text: '이전 문자',
      },
      {
        id: 'new',
        type: 'alert',
        cut: 'first',
        at: 4,
        sender: 'city',
        level: '위급재난',
        text: '새 문자',
      },
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
test('older messages retain their distinct severity badge and border colors', () => {
  const markup = renderToStaticMarkup(React.createElement(AlertHistory, { timeline, frame: 1800 }));
  const cards = markup.match(/<article\b[\s\S]*?<\/article>/g)!;
  for (const [text, color] of [
    ['이전 문자', '#c2746e'],
    ['새 문자', '#dd655f'],
    ['동시 문자 하나', '#a0adb5'],
  ]) {
    const card = cards.find((html) => html.includes(text))!;
    assert.ok(card);
    assert.ok(card.includes(`border-left:2px solid ${color}`));
    assert.ok(card.includes(`border:1px solid ${color}`));
    assert.ok(card.includes(`color:${color}`));
  }
});

const cardAppearance = (frame: number, text: string) => {
  const markup = renderToStaticMarkup(React.createElement(AlertHistory, { timeline, frame }));
  const card = markup.match(/<article\b[\s\S]*?<\/article>/g)!.find((html) => html.includes(text))!;
  const bodyStyle = card.match(/<div style="([^"]*)">\[시험시\]/)![1];
  const channels = (value: string) => value.startsWith('#')
    ? value.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16))
    : value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  return {
    background: channels(card.match(/(?:"|;)background:([^;]+)/)![1]),
    color: channels(bodyStyle.match(/(?:^|;)color:([^;]+)/)![1]),
    fontSize: Number(bodyStyle.match(/font-size:([\d.]+)px/)![1]),
  };
};

test('outgoing latest card fades continuously with no color snap at the end of insertion', () => {
  const start = 240;
  const before = cardAppearance(start - 1, '이전 문자');
  const settled = cardAppearance(start + changeFrames, '이전 문자');
  assert.deepEqual(cardAppearance(start, '이전 문자'), before);
  assert.deepEqual(before.background, [19, 23, 25]);
  assert.deepEqual(before.color, [237, 240, 242]);
  assert.deepEqual(settled.background, [14, 18, 20]);
  assert.deepEqual(settled.color, [192, 201, 208]);

  let previous = before;
  for (let frame = start + 1; frame <= start + changeFrames; frame++) {
    const current = cardAppearance(frame, '이전 문자');
    for (const property of ['background', 'color'] as const) {
      for (let channel = 0; channel < 3; channel++) {
        const drop = previous[property][channel] - current[property][channel];
        const total = before[property][channel] - settled[property][channel];
        assert.ok(drop >= 0 && drop <= Math.ceil(total / 4), `${property} jumps at frame ${frame}`);
      }
    }
    assert.ok(current.fontSize <= previous.fontSize);
    previous = current;
  }
});

test('arrival emphasis stays on the newest card and never re-highlights settled history', () => {
  const settledHistory = cardAppearance(359, '이전 문자');
  for (let frame = 360; frame <= 360 + changeFrames; frame++) {
    const latest = cardAppearance(frame, '동시 문자 둘');
    assert.deepEqual(latest.background, [19, 23, 25]);
    assert.deepEqual(latest.color, [237, 240, 242]);
    assert.equal(latest.fontSize, 40);
    assert.deepEqual(cardAppearance(frame, '이전 문자'), settledHistory);
    assert.equal(cardAppearance(frame, '동시 문자 하나').fontSize, 32);
  }
  const firstSeek = cardAppearance(250, '이전 문자');
  cardAppearance(1800, '이전 문자');
  assert.deepEqual(cardAppearance(250, '이전 문자'), firstSeek);
});
