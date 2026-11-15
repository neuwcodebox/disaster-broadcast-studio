import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, scenarioSchema } from '../src/scenario.js';
import { stateAt } from '../src/timeline.js';
import { ChatPanel } from '../src/video/Chat.js';

const input = () => ({
  version: 1,
  title: '채팅 검증',
  fictionNotice: '허구 검증 화면',
  agencies: {},
  map: { camera: { center: [127.5, 36], zoom: 6 } },
  cuts: [
    { id: 'first', duration: 10, storyTime: '2026-01-01T12:00:00+09:00' },
    { id: 'second', duration: 10, storyTime: '2026-01-01T14:00:00+09:00', clockTransition: 1 },
  ],
  events: [
    { id: 'live', type: 'chat', cut: 'first', at: 5, duration: 10, carry: true },
    { id: 'one', type: 'chat-message', cut: 'first', at: 6, chat: 'live', author: '시청자', text: '첫 반응' },
    { id: 'two', type: 'chat-message', cut: 'first', at: 6, chat: 'live', author: '이웃', text: '동시 반응' },
    { id: 'three', type: 'chat-message', cut: 'second', at: 0, chat: 'live', author: '시청자', text: '시간 도약 후' },
    { id: 'next', type: 'chat', cut: 'second', at: 6, duration: 4, title: '다시 연결된 채팅' },
  ] as Record<string, unknown>[],
});
const make = (data = input()) => compile(scenarioSchema.parse(data), new Set());
const ids = (frame: number) => stateAt(make(), frame).chat?.messages.map((m) => m.id);

test('chat is optional, follows panel boundaries and starts a fresh history per panel', () => {
  const data = input();
  data.events = [];
  assert.equal(stateAt(make(data), 700).chat, null);
  assert.equal(ids(299), undefined);
  assert.deepEqual(ids(300), []);
  assert.deepEqual(ids(359), []);
  assert.deepEqual(ids(360), ['one', 'two']);
  assert.deepEqual(ids(899), ['one', 'two', 'three']);
  assert.equal(ids(900), undefined);
  assert.deepEqual(ids(960), []);
  assert.ok(!stateAt(make(), 900).visible.some((e) => e.type === 'chat-message'));
});

test('time jumps freeze chat with the other content and arbitrary seeking restores it', () => {
  for (const frame of [659, 360, 600, 599]) assert.deepEqual(ids(frame), ['one', 'two']);
  assert.deepEqual(ids(660), ['one', 'two', 'three']);
  assert.deepEqual(ids(359), []);
});

test('inspection keeps the full conversation even when old rows leave the rendered panel', () => {
  const data = input();
  data.events = [data.events[0], ...Array.from({ length: 15 }, (_, i) => ({
    id: `message-${i}`, type: 'chat-message', chat: 'live', cut: 'first',
    at: 5 + i / 5, author: '시청자', text: `대화 ${i} 끝`,
  }))];
  // References do not depend on where the panel declaration appears in the source array.
  data.events.push(data.events.shift()!);
  const timeline = make(data);
  const chat = stateAt(timeline, 540).chat!;
  assert.equal(chat.messages.length, 15);
  const html = renderToStaticMarkup(React.createElement(ChatPanel, { timeline, chat, frame: 540 }));
  assert.doesNotMatch(html, /대화 0 끝/);
  assert.match(html, /대화 14 끝/);
});

test('messages reference a chat panel and must arrive inside its compiled interval', () => {
  for (const reference of ['missing', 'one']) {
    const data = input();
    data.events[1].chat = reference;
    assert.throws(() => make(data), /events\[1\] \(one\).chat: unknown chat/);
  }
  for (const [cut, at] of [['first', 4.99], ['second', 5]] as const) {
    const data = input();
    data.events[1] = { ...data.events[1], cut, at };
    assert.throws(() => make(data), /events\[1\] \(one\).at: outside chat live/);
  }
  const data = input();
  data.events[0].carry = false;
  assert.throws(() => make(data), /exceeds cut; set carry: true/);
});

test('two chat panels cannot overlap', () => {
  const data = input();
  data.events[4].at = 4;
  assert.throws(() => make(data), /overlapping chat events live \/ next/);
});

test('chat requires short, nonempty single-line names and messages with valid colors', () => {
  for (const fields of [
    { author: ' ' }, { author: '가'.repeat(21) }, { author: '줄\n바꿈' },
    { text: ' ' }, { text: '가'.repeat(81) }, { text: '줄\n바꿈' }, { color: 'red' },
    { duration: 2 },
  ]) {
    const data = input();
    Object.assign(data.events[1], fields);
    assert.throws(() => make(data));
  }
});

test('rendered chat shows authored text, timestamps and stable order; seeks do not retain future text', () => {
  const timeline = make();
  const markup = (frame: number) => renderToStaticMarkup(React.createElement(ChatPanel, {
    timeline, frame, chat: stateAt(timeline, frame).chat!,
  }));
  assert.match(markup(330), /아직 채팅이 없습니다/);
  const full = markup(700);
  assert.ok(full.indexOf('첫 반응') < full.indexOf('동시 반응'));
  assert.ok(full.indexOf('동시 반응') < full.indexOf('시간 도약 후'));
  assert.match(full, /12:00:06/);
  assert.match(full, /14:00:00/);
  assert.doesNotMatch(markup(400), /시간 도약 후/);
  assert.equal(markup(700), full);
  const data = input();
  data.events[1].text = '<script>허구 & 반응</script>';
  const escaped = make(data);
  const html = renderToStaticMarkup(React.createElement(ChatPanel, {
    timeline: escaped, frame: 400, chat: stateAt(escaped, 400).chat!,
  }));
  assert.match(html, /&lt;script&gt;허구 &amp; 반응&lt;\/script&gt;/);
});
