import { z } from 'zod';

const id = z.string().regex(/^[\w-]+$/, 'Use letters, numbers, _ or -');
const seconds = z.number().finite().nonnegative();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const position = z.tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)]);
const timestamp = z.string().datetime({ offset: true });
const camera = z
  .object({
    center: position,
    zoom: z.number().min(1).max(14),
    bearing: z.number().default(0),
    pitch: z.number().min(0).max(60).default(0),
  })
  .strict();
const timed = { id, cut: id, at: seconds };
const span = { ...timed, duration: z.number().positive(), carry: z.boolean().default(false) };
const alert = z
  .object({
    ...timed,
    type: z.literal('alert'),
    sender: id,
    text: z.string().min(1).max(4000),
    level: z.enum(['안전안내', '긴급재난', '위급재난']).default('안전안내'),
    regions: z.array(z.string()).default([]),
    corrects: id.optional(),
    occurredAt: timestamp.optional(),
    publishedAt: timestamp.optional(),
    pageSeconds: z.number().min(3).default(8),
  })
  .strict();
const news = z
  .object({
    ...span,
    type: z.literal('news'),
    source: id,
    headline: z.string().min(1).max(160),
    publishedAt: timestamp.optional(),
  })
  .strict();
const highlight = z
  .object({
    ...span,
    type: z.literal('region'),
    regions: z.array(z.string()).min(1),
    color: color.default('#b9615b'),
    label: z.string().max(80).optional(),
    pulse: z.boolean().default(false),
  })
  .strict();
const marker = z
  .object({
    ...span,
    type: z.literal('marker'),
    position,
    label: z.string().max(80),
    color: color.default('#c9d0d5'),
    effect: z.enum(['point', 'ring']).default('point'),
  })
  .strict();
const cameraEvent = z
  .object({
    ...span,
    type: z.literal('camera'),
    to: camera,
    ease: z.enum(['linear', 'smooth']).default('smooth'),
  })
  .strict();
const inset = z
  .object({ ...span, type: z.literal('inset'), camera, title: z.string().max(80) })
  .strict();
const audio = z
  .object({
    ...span,
    type: z.literal('audio'),
    asset: id,
    offset: seconds.default(0),
    volume: z.number().min(0).max(2).default(1),
    fadeIn: seconds.default(0),
    fadeOut: seconds.default(0),
  })
  .strict();
const mute = z.object({ ...span, type: z.literal('silence') }).strict();
const screen = z
  .object({
    ...span,
    type: z.literal('screen'),
    effect: z.enum(['blackout', 'flash', 'interference']),
    intensity: z.number().min(0).max(1).default(1),
    fadeIn: seconds.default(0),
    fadeOut: seconds.default(0),
  })
  .strict();
export const scenarioSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1).max(70),
    fictionNotice: z.string().min(1).max(160),
    timezone: z.string().default('Asia/Seoul'),
    seed: z.number().int().default(1),
    agencies: z.record(z.string(), z.string().min(1)),
    assets: z
      .record(
        z.string(),
        z
          .object({
            path: z.string().min(1),
            source: z.string().min(1),
            license: z.string().min(1),
          })
          .strict(),
      )
      .default({}),
    map: z
      .object({ camera, regions: z.string().optional(), attribution: z.string().min(1).optional() })
      .strict(),
    cuts: z
      .array(
        z
          .object({
            id,
            duration: z.number().positive(),
            storyTime: timestamp,
            fadeIn: seconds.default(0),
            fadeOut: seconds.default(0),
          })
          .strict(),
      )
      .min(1),
    events: z
      .array(
        z.discriminatedUnion('type', [
          alert,
          news,
          highlight,
          marker,
          cameraEvent,
          inset,
          audio,
          mute,
          screen,
        ]),
      )
      .default([]),
  })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;
export type Event = Scenario['events'][number];
export type Camera = Scenario['map']['camera'];
export type CompiledEvent = Event & { start: number; end: number; order: number };
export type Cut = Scenario['cuts'][number] & { start: number; end: number; epoch: number };
export type Timeline = {
  scenario: Scenario;
  fps: number;
  durationInFrames: number;
  cuts: Cut[];
  events: CompiledEvent[];
};
export const FPS = 60;
export const frames = (seconds: number) => Math.round(seconds * FPS);
export const pages = (text: string) => {
  const result: string[] = [];
  let remaining = Array.from(
    new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(text),
    (x) => x.segment,
  );
  while (remaining.length > 100) {
    const part = remaining.slice(0, 100);
    let boundary = 99;
    for (let i = 99; i >= 60; i--)
      if (/[\s]/.test(part[i])) {
        boundary = i;
        break;
      }
    result.push(remaining.slice(0, boundary + 1).join(''));
    remaining = remaining.slice(boundary + 1);
  }
  if (remaining.length) result.push(remaining.join(''));
  return result;
};

export function compile(scenario: Scenario, regionIds: Set<string>): Timeline {
  const errors: string[] = [];
  try {
    new Intl.DateTimeFormat('ko-KR', { timeZone: scenario.timezone });
  } catch {
    errors.push('timezone: unknown IANA timezone');
  }
  let cursor = 0;
  const cuts: Cut[] = scenario.cuts.map((c, i) => {
    const n = frames(c.duration);
    if (n < 1) errors.push(`cuts[${i}].duration: shorter than one frame`);
    if (c.fadeIn + c.fadeOut > c.duration) errors.push(`cuts[${i}]: fades exceed duration`);
    const cut = { ...c, start: cursor, end: cursor + n, epoch: Date.parse(c.storyTime) };
    cursor += n;
    return cut;
  });
  const seen = new Set<string>();
  cuts.forEach((c, i) => {
    if (seen.has(c.id)) errors.push(`cuts[${i}].id: duplicate ${c.id}`);
    seen.add(c.id);
  });
  seen.clear();
  const events: CompiledEvent[] = scenario.events.flatMap((e, i) => {
    const path = `events[${i}] (${e.id})`;
    if (seen.has(e.id)) errors.push(`${path}.id: duplicate ID`);
    seen.add(e.id);
    const cut = cuts.find((c) => c.id === e.cut);
    if (!cut) {
      errors.push(`${path}.cut: unknown ${e.cut}`);
      return [];
    }
    const start = cut.start + frames(e.at);
    if (start >= cut.end) errors.push(`${path}.at: outside cut ${cut.id}`);
    const duration = 'duration' in e ? frames(e.duration) : cursor - start;
    if (duration < 1) errors.push(`${path}.duration: shorter than one frame`);
    const end =
      'duration' in e ? (e.carry ? start + duration : Math.min(start + duration, cut.end)) : cursor;
    if ('duration' in e && !e.carry && start + duration > cut.end)
      errors.push(`${path}.duration: exceeds cut; set carry: true to cross cut boundary`);
    if (end > cursor) errors.push(`${path}.duration: exceeds video`);
    if ('regions' in e)
      for (const r of e.regions)
        if (!regionIds.has(r)) errors.push(`${path}.regions: unknown region ${r}`);
    if (e.type === 'alert') {
      if (!(e.sender in scenario.agencies))
        errors.push(`${path}.sender: unknown agency ${e.sender}`);
      if (e.corrects) {
        const prev = scenario.events.find((x) => x.id === e.corrects);
        if (!prev || prev.type !== 'alert')
          errors.push(`${path}.corrects: unknown alert ${e.corrects}`);
      }
    }
    if (e.type === 'news' && !(e.source in scenario.agencies))
      errors.push(`${path}.source: unknown agency ${e.source}`);
    if (e.type === 'audio') {
      if (!(e.asset in scenario.assets)) errors.push(`${path}.asset: unknown asset ${e.asset}`);
      if (e.fadeIn + e.fadeOut > e.duration) errors.push(`${path}: fades exceed duration`);
    }
    if (e.type === 'screen' && e.fadeIn + e.fadeOut > e.duration)
      errors.push(`${path}: fades exceed duration`);
    return [{ ...e, start, end, order: i }];
  });
  for (const e of events) {
    if (e.type === 'alert' && e.corrects) {
      const prior = events.find((x) => x.id === e.corrects);
      if (prior && prior.start >= e.start)
        errors.push(`${e.id}.corrects: correction must follow original alert`);
    }
  }
  // Single-owner tracks cannot have ambiguous concurrent values. Independent layers can overlap.
  for (const type of ['camera', 'inset', 'news'] as const) {
    const track = events.filter((e) => e.type === type).sort((a, b) => a.start - b.start);
    for (let i = 1; i < track.length; i++)
      if (track[i].start < track[i - 1].end)
        errors.push(`events: overlapping ${type} events ${track[i - 1].id} / ${track[i].id}`);
  }
  for (let i = 1; i < cuts.length; i++)
    if (cuts[i].epoch < cuts[i - 1].epoch + ((cuts[i - 1].end - cuts[i - 1].start) * 1000) / FPS)
      errors.push(`cuts[${i}].storyTime: must not precede end of previous cut`);
  if (errors.length) throw new Error(errors.join('\n'));
  return {
    scenario,
    fps: FPS,
    durationInFrames: cursor,
    cuts,
    events: events.sort((a, b) => a.start - b.start || a.order - b.order),
  };
}
