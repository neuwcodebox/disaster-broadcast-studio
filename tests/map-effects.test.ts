import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, scenarioSchema, type CompiledEvent } from '../src/scenario.js';
import { circleAt, circleGeometry, lineAt, MapShapes, markerAt, MarkerGlyph } from '../src/video/map/effects.js';

function timeline(events: unknown[]) {
  return compile(scenarioSchema.parse({
    version: 1, title: '지도 효과', fictionNotice: '허구', agencies: {},
    map: { camera: { center: [127, 37], zoom: 6 } },
    cuts: [{ id: 'a', duration: 10, storyTime: '2031-01-01T00:00:00+09:00' }],
    events: events.map((e) => ({ id: 'effect', cut: 'a', at: 2, duration: 4, ...e as object })),
  }), new Set());
}
const circleEvent = (pulse = false) => timeline([
  { type: 'circle', center: [127, 37], radiusKm: 100, pulse, fadeIn: 1, fadeOut: 1 },
]).events[0] as Extract<CompiledEvent, { type: 'circle' }>;
const distance = (a: [number, number], b: [number, number]) => {
  const [lon, lat] = a.map((v) => v * Math.PI / 180);
  const [otherLon, otherLat] = b.map((v) => v * Math.PI / 180);
  const h = Math.sin((lat - otherLat) / 2) ** 2 +
    Math.cos(lat) * Math.cos(otherLat) * Math.sin((lon - otherLon) / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

test('circle coordinates preserve authored ground distance at different latitudes', () => {
  for (const center of [[127, 37], [10, 0], [40, 82], [179.9, 30]] as [number, number][]) {
    const points = circleGeometry(center, 100);
    assert.deepEqual(points[0], points.at(-1));
    assert.ok(points.length > 60);
    for (const point of points) {
      assert.ok(point.every(Number.isFinite));
      assert.ok(Math.abs(distance(center, point) - 100) < 1e-8);
    }
    // Crossing the date line keeps a local polygon instead of a world-wide slash.
    assert.ok(Math.max(...points.map(([lon]) => lon)) - Math.min(...points.map(([lon]) => lon)) < 15);
  }
});

test('circles obey timing and fades; pulsing radius expands repeatedly and seeks are deterministic', () => {
  const event = circleEvent();
  assert.equal(circleAt(event, 119).opacity, 0);
  assert.equal(circleAt(event, 120).opacity, 0);
  assert.equal(circleAt(event, 150).opacity, 0.5);
  assert.equal(circleAt(event, 180).opacity, 1);
  assert.equal(circleAt(event, 359).opacity, 0);
  assert.equal(circleAt(event, 360).opacity, 0);
  const pulse = circleEvent(true);
  assert.ok(distance(pulse.center, circleAt(pulse, 180).points[0]) <
    distance(pulse.center, circleAt(pulse, 240).points[0]));
  assert.deepEqual(circleAt(pulse, 180).points, circleAt(pulse, 324).points);
  circleAt(pulse, 350);
  circleAt(pulse, 125);
  assert.deepEqual(circleAt(pulse, 210), circleAt(pulse, 210));
});

test('flowing dashed lines preserve draw progress and direction and respect fade boundaries', () => {
  const event = timeline([{ type: 'line', points: [[127, 37], [128, 38]],
    drawSeconds: 2, dashed: true, flowSpeed: 1, fadeIn: 1, fadeOut: 1,
  }]).events[0] as Extract<CompiledEvent, { type: 'line' }>;
  assert.deepEqual(lineAt(event, 120), { progress: 0, opacity: 0, dashOffset: -0 });
  assert.deepEqual(lineAt(event, 180), { progress: 0.5, opacity: 1, dashOffset: -15 });
  assert.equal(lineAt(event, 300).progress, 1);
  assert.equal(lineAt(event, 360).opacity, 0);
  assert.equal(lineAt({ ...event, flowSpeed: -1 }, 180).dashOffset, 15);
  assert.equal(lineAt({ ...event, dashed: false }, 180).dashOffset, 0);
});

test('main and inset line masks are distinct and circle geometry reaches the projection layer', () => {
  const events = timeline([
    { id: 'circle', type: 'circle', center: [127, 37], radiusKm: 20 },
    { id: 'line', type: 'line', points: [[127, 37], [128, 38]], dashed: true, flowSpeed: 1 },
  ]).events;
  const markup = (inset: boolean) => renderToStaticMarkup(React.createElement(MapShapes, { events, frame: 180, inset }));
  assert.match(markup(false), /id="main-line"/);
  assert.match(markup(true), /id="inset-line"/);
  assert.doesNotMatch(markup(false), /inset-line/);
  assert.match(markup(false), /<polygon[^>]+data-geometry=/);
  assert.match(markup(false), /stroke-dashoffset="-15"/);
});

test('pulsing markers keep a stable center point while rings repeat on frame time', () => {
  const event = timeline([{ type: 'marker', position: [127, 37], effect: 'pulse' }])
    .events[0] as Extract<CompiledEvent, { type: 'marker' }>;
  assert.equal(markerAt(event, 180).size, 13);
  assert.ok(markerAt(event, 180).pulseSize < markerAt(event, 240).pulseSize);
  assert.deepEqual(markerAt(event, 180), markerAt(event, 324));
  const markup = renderToStaticMarkup(React.createElement(MarkerGlyph, { event, frame: 180 }));
  assert.match(markup, /background:#c9d0d5/);
  assert.match(markup, /position:absolute/);
  assert.equal(markerAt({ ...event, effect: 'point' }, 180).size, 13);
  assert.equal(markerAt({ ...event, effect: 'ring' }, 300).size, 99);
});
