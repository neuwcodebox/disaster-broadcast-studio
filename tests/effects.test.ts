import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { scenarioSchema, compile } from '../src/scenario.js';
import { stateAt } from '../src/timeline.js';
import { SignalEffects, signalEffects, signalLevels, signalStyle } from '../src/video/SignalEffects.js';

const base = {
  version: 1, title: '효과 확인', fictionNotice: '허구', agencies: {},
  map: { camera: { center: [127, 36], zoom: 6 } },
  cuts: [{ id: 'a', duration: 10, storyTime: '2031-01-01T00:00:00+09:00' }],
};
const zeros = Object.fromEntries(signalEffects.map((effect) => [effect, 0]));
const events = (effects: readonly string[] = signalEffects) => effects.map((effect, i) => ({
  id: `fx${i}`, type: 'screen', cut: 'a', at: 2, duration: 4,
  effect, intensity: .6, fadeIn: 1, fadeOut: 1,
}));
const timelineWith = (input = events()) =>
  compile(scenarioSchema.parse({ ...base, events: input }), new Set());
const markup = (timeline: ReturnType<typeof timelineWith>, frame: number, seed = 123) =>
  renderToStaticMarkup(React.createElement(SignalEffects, {
    frame, seed, levels: signalLevels(timeline.events, frame),
  }));

test('all signal effects are opt-in, timed, composable and seek independently', () => {
  const timeline = timelineWith();
  assert.deepEqual(signalLevels(timeline.events, 0), zeros);
  assert.deepEqual(signalLevels(timeline.events, 180),
    Object.fromEntries(signalEffects.map((effect) => [effect, .6])));
  assert.deepEqual(signalLevels(timeline.events, 150),
    Object.fromEntries(signalEffects.map((effect) => [effect, .3])));
  assert.deepEqual(signalLevels(timeline.events, 300),
    Object.fromEntries(signalEffects.map((effect) => [effect, .59])));
  assert.deepEqual(signalLevels(timeline.events, 359), zeros);
  assert.deepEqual(signalLevels(timeline.events, 360), zeros);
  const during = markup(timeline, 180);
  markup(timeline, 360);
  markup(timeline, 150);
  assert.equal(markup(timeline, 180), during);
});

test('overlapping effects add intensity with a ceiling and zero intensity stays invisible', () => {
  const timeline = timelineWith([...events(), ...events().map((event) => ({ ...event, id: `${event.id}-2` }))]);
  assert.deepEqual(signalLevels(timeline.events, 180),
    Object.fromEntries(signalEffects.map((effect) => [effect, 1])));
  const disabled = timelineWith(events().map((event) => ({ ...event, intensity: 0 })));
  assert.deepEqual(signalLevels(disabled.events, 180), zeros);
  assert.equal(markup(disabled, 180), '');
  assert.deepEqual(signalStyle(signalLevels(disabled.events, 180), 180, 123), {
    filter: undefined, transform: undefined,
  });
});

test('filters, jitter and tracking bands compose deterministically from frame and seed', () => {
  const timeline = timelineWith();
  const levels = signalLevels(timeline.events, 180);
  const style = signalStyle(levels, 180, 123);
  assert.match(style.filter!, /url\(#dbs-chromatic\) url\(#dbs-vhs\) blur\([\d.]+px\) grayscale\(0.6\) brightness\(/);
  assert.match(style.transform!, /^translate\(/);
  assert.deepEqual(signalStyle(levels, 180, 123), style);
  assert.notDeepEqual(signalStyle(levels, 181, 123), style);
  assert.notDeepEqual(signalStyle(levels, 180, 124), style);
  assert.match(markup(timeline, 180), /id="dbs-chromatic"/);
  assert.match(markup(timeline, 180), /id="dbs-vhs"/);
  assert.match(markup(timeline, 180), /data-effect="vignette"/);
  assert.match(markup(timeline, 180), /data-effect="vhs"/);
  assert.notEqual(markup(timeline, 180, 123), markup(timeline, 180, 124));
});

test('blur and desaturation reach their authored maximum without enabling other layers', () => {
  const timeline = timelineWith(events(['blur', 'desaturate']).map((event) => ({ ...event, intensity: 1 })));
  const levels = signalLevels(timeline.events, 180);
  assert.deepEqual(signalStyle(levels, 180, 1), { filter: 'blur(6px) grayscale(1)', transform: undefined });
  assert.doesNotMatch(markup(timeline, 180), /dbs-chromatic|dbs-vhs|canvas|data-effect=/);
});

test('time jumps retain the same signal image until content resumes', () => {
  const timeline = compile(scenarioSchema.parse({
    ...base,
    cuts: [...base.cuts, { id: 'b', duration: 10, storyTime: '2031-01-02T00:00:00+09:00', clockTransition: 2 }],
    events: events().map((event) => ({ ...event, at: 8, duration: 2, fadeOut: 0 })),
  }), new Set());
  const before = stateAt(timeline, 599);
  const during = stateAt(timeline, 660);
  assert.equal(during.contentFrame, before.contentFrame);
  assert.deepEqual(signalStyle(signalLevels(during.visible, during.contentFrame), during.contentFrame, 123),
    signalStyle(signalLevels(before.visible, before.contentFrame), before.contentFrame, 123));
  assert.equal(markup(timeline, during.contentFrame), markup(timeline, before.contentFrame));
  const after = stateAt(timeline, 720);
  assert.deepEqual(signalLevels(after.visible, after.contentFrame), zeros);
});
