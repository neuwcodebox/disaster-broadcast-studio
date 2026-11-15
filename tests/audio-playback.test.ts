import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { compile, scenarioSchema } from '../src/scenario.js';
import { AudioTrack } from '../src/video/AudioTrack.js';

const input = (events: unknown[]) => ({
  version: 1, title: '음원 재생 제어', fictionNotice: '허구', agencies: { a: '시험' },
  map: { camera: { center: [127, 37], zoom: 6 } },
  assets: { bed: { path: 'bed.wav', source: 'test', license: 'CC0' } },
  cuts: [{ id: 'c', duration: 20, storyTime: '2031-01-01T00:00:00+09:00' }],
  events: events.map((event: any, i) => ({ id: `e${i}`, cut: 'c', at: 2, ...event })),
});
const timeline = (events: unknown[]) => compile(scenarioSchema.parse(input(events)), new Set());
const bed = { type: 'audio', asset: 'bed', duration: 10 };

// Inspect the public Remotion boundary, without mounting browser media tags.
function streamsAt(t: ReturnType<typeof timeline>, frame: number) {
  const element = AudioTrack({ timeline: t, audio: { bed: 'audio/bed.wav', __dbs_notification: 'audio/cue.wav' }, frame });
  return React.Children.toArray(element.props.children).map((child) => {
    const sequence = child as React.ReactElement<{ from: number; durationInFrames: number; children: React.ReactElement<any> }>;
    return { from: sequence.props.from, duration: sequence.props.durationInFrames, ...sequence.props.children.props };
  });
}

test('audio playback defaults preserve one-shot playback and rates reject unsupported values', () => {
  const [stream] = streamsAt(timeline([bed]), 180);
  assert.equal(stream.loop, false);
  assert.equal(stream.playbackRate, 1);
  assert.equal(stream.trimBefore, 0);
  for (const playbackRate of [0, 0.249, 4.01, Infinity, NaN])
    assert.throws(() => timeline([{ ...bed, playbackRate }]));
  for (const loop of ['true', 1, null])
    assert.throws(() => timeline([{ ...bed, loop }]));
});

test('loop and rate use source offset while the authored event bounds the output duration', () => {
  for (const playbackRate of [0.25, 0.5, 1, 2, 4]) {
    const [stream] = streamsAt(timeline([{ ...bed, loop: true, offset: 1.25, playbackRate }]), 180);
    assert.equal(stream.loop, true);
    assert.equal(stream.playbackRate, playbackRate);
    assert.equal(stream.trimBefore, 75, 'offset stays in source frames at every speed');
    assert.equal(stream.from, 120, 'playback rate does not move the event');
    assert.equal(stream.duration, 600, 'loop stays within the authored video duration');
  }
});

test('looped and retimed tracks fade in video time and reproduce volume after arbitrary seeks', () => {
  const t = timeline([{ ...bed, loop: true, offset: 1.25, playbackRate: 2, volume: 0.8, fadeIn: 2, fadeOut: 2 }]);
  const level = (frame: number) => streamsAt(t, frame)[0].volume;
  assert.equal(level(119), 0);
  assert.equal(level(120), 0);
  assert.equal(level(180), 0.4);
  assert.equal(level(240), 0.8);
  assert.equal(level(599), 0.8);
  assert.equal(level(659), 0.4);
  assert.equal(level(719), 0);
  assert.equal(level(720), 0);
  assert.equal(level(180), 0.4);
  assert.equal(level(400), 0.8);
});

test('silence mutes looped audio and notification cues without changing playback settings', () => {
  const t = timeline([
    { ...bed, loop: true, offset: 0.5, playbackRate: 0.5, volume: 0.7 },
    { type: 'silence', at: 4.2, duration: 1 },
    { type: 'alert', at: 4, sender: 'a', text: '시험 문자', sound: { asset: 'bed', duration: 3, volume: 0.65 } },
  ]);
  const levels = (frame: number) => streamsAt(t, frame).map((s) => s.volume);
  assert.deepEqual(levels(251), [0.65, 0.7]);
  assert.deepEqual(levels(252), [0, 0]);
  assert.deepEqual(levels(311), [0, 0]);
  assert.deepEqual(levels(312), [0.65, 0.7]);
  const [before, during, after] = [251, 260, 312].map((frame) => {
    const { volume, ...settings } = streamsAt(t, frame)[1];
    return settings;
  });
  assert.deepEqual(during, before);
  assert.deepEqual(after, before);
});
