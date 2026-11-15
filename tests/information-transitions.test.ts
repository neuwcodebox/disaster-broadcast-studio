import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, scenarioSchema } from '../src/scenario.js';
import { stateAt } from '../src/timeline.js';
import { News, PagedText, Status } from '../src/video/Information.js';
import { changeFrames, transitionAt } from '../src/video/transitions.js';

const timeline = compile(
  scenarioSchema.parse({
    version: 1,
    title: '정보 변경 검증',
    fictionNotice: '허구',
    agencies: { a: '시험기관' },
    map: { camera: { center: [127, 37], zoom: 6 } },
    cuts: [
      { id: 'a', duration: 10, storyTime: '2031-01-01T00:00:00+09:00' },
      { id: 'b', duration: 10, storyTime: '2031-01-01T02:00:00+09:00', clockTransition: 1 },
    ],
    events: [
      { id: 'n1', type: 'news', cut: 'a', at: 1, duration: 2, source: 'a', headline: '이전 뉴스' },
      { id: 'n2', type: 'news', cut: 'a', at: 3, duration: 2, source: 'a', headline: '다음 뉴스' },
      {
        id: 'n3',
        type: 'news',
        cut: 'b',
        at: 0,
        duration: 4,
        source: 'a',
        headline: '도약 후 뉴스',
      },
      {
        id: 's1',
        type: 'status',
        cut: 'a',
        at: 1,
        duration: 2,
        items: [
          { text: '유지 항목', color: '#aabbcc' },
          { text: '이전 상태', color: '#bbaa99' },
        ],
      },
      {
        id: 's2',
        type: 'status',
        cut: 'a',
        at: 3,
        duration: 2,
        items: [
          { text: '유지 항목', color: '#aabbcc' },
          { text: '새 상태', color: '#cc9988' },
        ],
      },
    ],
  }),
  new Set(),
);
const markup = (component: typeof News | typeof Status, frame: number) =>
  renderToStaticMarkup(React.createElement(component, { timeline, frame }));

test('news replacement retains outgoing source/headline, settles, and animates removal', () => {
  assert.match(markup(News, 179), /이전 뉴스/);
  const during = markup(News, 190);
  assert.match(during, /이전 뉴스/);
  assert.match(during, /다음 뉴스/);
  assert.doesNotMatch(markup(News, 180 + changeFrames), /이전 뉴스/);
  assert.match(markup(News, 300), /다음 뉴스/);
  assert.doesNotMatch(markup(News, 300 + changeFrames), /다음 뉴스/);
  assert.equal(transitionAt(timeline.events, 'news', 600).previous, undefined);
});
test('status replacement preserves one copy of unchanged items and removes retired items after exit', () => {
  const during = markup(Status, 190);
  assert.equal(during.match(/유지 항목/g)?.length, 1);
  assert.match(during, /이전 상태/);
  assert.match(during, /새 상태/);
  const stableBadge = during.slice(0, during.indexOf('유지 항목'));
  assert.match(stableBadge, /opacity:1;transform:translateY\(0px\)/);
  assert.doesNotMatch(markup(Status, 180 + changeFrames), /이전 상태/);
  assert.doesNotMatch(markup(Status, 300 + changeFrames), /새 상태|유지 항목/);
});
test('changed status blinks three times after entry, while retained status stays fully visible', () => {
  const raw = structuredClone(timeline.scenario);
  const event = raw.events.find((e) => e.id === 's2')!;
  if (event.type !== 'status') throw Error();
  event.duration = 4;
  const longer = compile(scenarioSchema.parse(raw), new Set());
  const opacity = (frame: number, text: string) => {
    const html = renderToStaticMarkup(React.createElement(Status, { timeline: longer, frame }));
    const style = html.match(new RegExp(`<span[^>]*style="([^"]*)"[^>]*>${text}`))![1];
    return Number(style.match(/(?:^|;)opacity:([^;]+)/)![1]);
  };
  for (const frame of [225, 261, 297]) {
    assert.ok(Math.abs(opacity(frame, '새 상태') - 0.4) < 1e-9);
    assert.equal(opacity(frame, '유지 항목'), 1);
  }
  for (const frame of [207, 243, 279, 315, 360]) assert.equal(opacity(frame, '새 상태'), 1);
});
test('page changes retain both pages only during the transition, including wraparound', () => {
  const page = (frame: number) =>
    renderToStaticMarkup(
      React.createElement(PagedText, {
        chunks: ['첫 페이지', '다음 페이지'],
        frame,
        start: 0,
        seconds: 3,
      }),
    );
  assert.doesNotMatch(page(179), /다음 페이지/);
  assert.match(page(190), /첫 페이지/);
  assert.match(page(190), /다음 페이지/);
  assert.doesNotMatch(page(180 + changeFrames), /첫 페이지/);
  assert.match(page(370), /첫 페이지/);
  assert.match(page(370), /다음 페이지/);
});
test('all information transitions freeze with content during a clock jump and are seekable', () => {
  const frozen = stateAt(timeline, 599).contentFrame;
  for (const frame of [600, 630, 659]) {
    const state = stateAt(timeline, frame);
    assert.equal(markup(News, state.contentFrame), markup(News, frozen));
    assert.equal(markup(Status, state.contentFrame), markup(Status, frozen));
  }
  const firstSeek = markup(News, 190);
  markup(News, 700);
  assert.equal(markup(News, 190), firstSeek);
});
