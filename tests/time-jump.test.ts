import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, scenarioSchema } from '../src/scenario.js';
import { stateAt } from '../src/timeline.js';
import { TimeJump, timeJumpStrength } from '../src/video/TimeJump.js';

function make(storyTime = '2031-01-02T02:00:00+09:00', clockTransition = 2, clockTransitionStyle = 'fast-forward') {
  return compile(scenarioSchema.parse({
    version: 1, title: '시간 전환', fictionNotice: '허구', agencies: {},
    map: { camera: { center: [127, 37], zoom: 6 } },
    cuts: [
      { id: 'before', duration: 10, storyTime: '2031-01-01T23:59:50+09:00' },
      { id: 'after', duration: 10, storyTime, clockTransition, clockTransitionStyle },
    ],
    events: [],
  }), new Set());
}

const markup = (timeline: ReturnType<typeof make>, frame: number) =>
  renderToStaticMarkup(React.createElement(TimeJump, { jump: stateAt(timeline, frame).timeJump }));

test('fast-forward effect is limited to an authored transition across skipped story time', () => {
  const timeline = make();
  assert.equal(markup(timeline, 599), '');
  assert.notEqual(markup(timeline, 630), '');
  assert.equal(markup(timeline, 720), '');
  // Adjacent cuts with continuous story time do not signal a time skip.
  assert.equal(markup(make('2031-01-02T00:00:00+09:00'), 630), '');
  assert.equal(markup(make(undefined, 0), 600), '');
});

test('blink style closes quickly, holds black while the clock runs, and opens on arrival', () => {
  const timeline = make(undefined, 2.5, 'blink');
  assert.equal(stateAt(timeline, 600).timeJump?.style, 'blink');
  assert.equal(timeJumpStrength(stateAt(timeline, 600).timeJump), 0);
  for (const frame of [612, 660, 720]) {
    assert.equal(timeJumpStrength(stateAt(timeline, frame).timeJump), 1);
    assert.match(markup(timeline, frame), /background:#000/);
    assert.doesNotMatch(markup(timeline, frame), /<svg|<path/);
  }
  assert.equal(timeJumpStrength(stateAt(timeline, 749).timeJump), 0);
  assert.equal(markup(timeline, 750), '');
  assert.equal(stateAt(timeline, 660).contentFrame, 599);
  assert.throws(() => make(undefined, 2.5, 'unknown'));
});

test('effect fades in, stays visible while the clock rolls, and fades away on arrival', () => {
  const timeline = make();
  const strength = (frame: number) => timeJumpStrength(stateAt(timeline, frame).timeJump);
  assert.equal(strength(600), 0);
  assert.ok(strength(606) > 0 && strength(606) < strength(630));
  assert.equal(strength(660), 1);
  assert.ok(strength(708) > 0 && strength(708) < strength(660));
  assert.equal(strength(719), 0);
  assert.equal(strength(720), 0);
  assert.equal(stateAt(timeline, 660).contentFrame, 599);
  assert.equal(stateAt(timeline, 720).contentFrame, 720);
  assert.equal(stateAt(timeline, 720).displayEpoch, stateAt(timeline, 720).epoch);
});

test('fast-forward cue is an icon without visible wording and seeks reproduce the effect', () => {
  const timeline = make();
  const during = markup(timeline, 660);
  assert.match(during, /<path[^>]+d=/);
  assert.equal(during.replace(/<[^>]*>/g, '').trim(), '');
  assert.notEqual(markup(timeline, 645), during);
  markup(timeline, 900);
  markup(timeline, 610);
  assert.equal(markup(timeline, 660), during);
});
