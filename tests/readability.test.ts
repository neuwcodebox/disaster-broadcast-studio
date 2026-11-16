import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, scenarioSchema } from '../src/scenario.js';
import { stateAt } from '../src/timeline.js';
import { AlertHistory } from '../src/video/Alerts.js';
import { News } from '../src/video/Information.js';
import { ChatPanel } from '../src/video/Chat.js';
import { Bulletin } from '../src/video/Bulletin.js';

const input = () => ({
  version: 1, title: '모바일 가독성 검증', fictionNotice: '허구 화면',
  agencies: { source: '시험방송', operator: '현황판 운영팀' },
  map: { camera: { center: [127.5, 36], zoom: 6 } },
  cuts: [{ id: 'one', duration: 50, storyTime: '2026-01-01T12:00:00+09:00' }],
  events: [
    { id: 'alert', type: 'alert', cut: 'one', at: 5, sender: 'source',
      text: '앞선 안내를 정정합니다. 창문을 닫고 후속 안내를 확인해 주십시오.' },
    { id: 'headline', type: 'news', cut: 'one', at: 5, duration: 40,
      source: 'source', headline: '해안가 주민에 실내 대피 안내…관계 기관, 현장 상황 확인 중' },
    { id: 'panel', type: 'chat', cut: 'one', at: 5, duration: 40 },
    { id: 'message', type: 'chat-message', cut: 'one', at: 5, chat: 'panel',
      author: '시청자', text: '문자 이제 왔어요. 일단 창문 닫았습니다. 가족들도 안에서 기다리고 있어요.' },
    { id: 'notice', type: 'bulletin', cut: 'one', at: 5, duration: 40,
      source: 'operator', heading: '수신 지연 안내', text: '문자 수집 지연으로 최신 정보 반영이 늦어지고 있습니다. 복구 후 갱신을 재개하겠습니다.' },
  ] as Record<string, unknown>[],
});

test('every message displays its full body without automatic paging or generated correction labels', () => {
  const timeline = compile(scenarioSchema.parse(input()), new Set());
  const notice = timeline.events.find((event) => event.type === 'bulletin')!;
  if (notice.type !== 'bulletin') throw Error();
  for (const frame of [360, 1200, 2100]) {
    const views = [
      [renderToStaticMarkup(React.createElement(AlertHistory, { timeline, frame })), input().events[0].text],
      [renderToStaticMarkup(React.createElement(News, { timeline, frame })), input().events[1].headline],
      [renderToStaticMarkup(React.createElement(ChatPanel, { timeline, frame, chat: stateAt(timeline, frame).chat! })), input().events[3].text],
      [renderToStaticMarkup(React.createElement(Bulletin, { event: notice, source: '현황판 운영팀' })), input().events[4].text],
    ];
    for (const [html, body] of views) {
      assert.ok(String(html).includes(String(body)));
      assert.doesNotMatch(String(html), /1\s*\/\s*2|이전 문자 정정|정정 ·/);
    }
  }
});

test('authors must keep text short enough to show fully, including explicit line breaks', () => {
  for (const [index, field, limit] of [[0, 'text', 120], [1, 'headline', 64], [3, 'text', 80], [4, 'text', 180]] as const) {
    const data = input();
    data.events[index][field] = '가'.repeat(limit);
    assert.doesNotThrow(() => compile(scenarioSchema.parse(data), new Set()));
    data.events[index][field] = '가'.repeat(limit + 1);
    assert.throws(() => scenarioSchema.parse(data));
  }
  const data = input();
  data.events[0].text = '짧은 줄\n'.repeat(12);
  assert.throws(() => scenarioSchema.parse(data), /full message fits/);
  const longSource = input();
  longSource.agencies.source = '표시명이너무긴출처'.repeat(3);
  assert.throws(() => compile(scenarioSchema.parse(longSource), new Set()), /shorten.*source|full text fits/);
});

test('paging controls and correction references are not part of the authoring contract', () => {
  for (const [index, field, value] of [[0, 'corrects', 'old'], [0, 'pageSeconds', 8], [1, 'pageSeconds', 8], [3, 'pageSeconds', 8], [4, 'pageSeconds', 12]] as const) {
    const data = input();
    data.events[index][field] = value;
    assert.throws(() => scenarioSchema.parse(data));
  }
});
