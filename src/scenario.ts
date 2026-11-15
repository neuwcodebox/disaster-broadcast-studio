import { z } from 'zod';

const id = z.string().regex(/^[\w-]+$/, 'Use letters, numbers, _ or -');
const seconds = z.number().finite().nonnegative();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const position = z.tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)]);
const timestamp = z.string().datetime({ offset: true });
const fitsText = (text: string, columns: number, lines: number) =>
  text.split(/\r\n|\r|\n/).reduce(
    (count, line) => count + Math.max(1, Math.ceil(Array.from(line.replace(/\t/g, '        ')).length / columns)),
    0,
  ) <= lines;
const shortText = (characters: number, columns: number, lines: number) =>
  z.string().trim().min(1).max(characters).refine((text) => fitsText(text, columns, lines),
    'Shorten the text or remove line breaks so the full message fits at once');
const camera = z
  .object({
    center: position,
    zoom: z.number().min(1).max(14),
    bearing: z.number().default(0),
    pitch: z.number().min(0).max(60).default(0),
  })
  .strict();
const timed = { id, cut: id, at: seconds };
const span = {
  ...timed,
  duration: z.number().positive(),
  carry: z.boolean().default(false),
};
const notificationSound = z
  .union([
    z.literal(false),
    z.literal('default'),
    z
      .object({
        asset: id,
        duration: z.number().positive(),
        volume: z.number().min(0).max(2).default(0.8),
      })
      .strict(),
  ])
  .default('default');
const alert = z
  .object({
    ...timed,
    type: z.literal('alert'),
    sender: id,
    text: shortText(120, 16, 8),
    level: z.enum(['안전안내', '긴급재난', '위급재난']).default('안전안내'),
    regions: z.array(z.string()).default([]),
    mapHighlight: z
      .union([
        z.literal(false),
        z
          .object({
            duration: z.number().positive().default(2.4),
            color: color.default('#d6e2ec'),
          })
          .strict(),
      ])
      .default({ duration: 2.4, color: '#d6e2ec' }),
    sound: notificationSound,
    occurredAt: timestamp.optional(),
    publishedAt: timestamp.optional(),
  })
  .strict();
const news = z
  .object({
    ...span,
    type: z.literal('news'),
    sound: notificationSound.default(false),
    source: id,
    headline: shortText(64, 32, 2),
    publishedAt: timestamp.optional(),
  })
  .strict();
const status = z
  .object({
    ...span,
    type: z.literal('status'),
    sound: notificationSound,
    items: z.array(z.object({ text: z.string().min(1).max(80), color }).strict()),
  })
  .strict();
const bulletin = z
  .object({
    ...span,
    type: z.literal('bulletin'),
    sound: notificationSound,
    source: id,
    heading: shortText(40, 26, 2),
    text: shortText(180, 30, 6),
    color: color.default('#b7c1c8'),
  })
  .strict();
const chat = z
  .object({
    ...span,
    type: z.literal('chat'),
    title: z.string().trim().min(1).max(30).regex(/^[^\r\n]+$/, 'Use a single line').default('실시간 채팅'),
  })
  .strict();
const chatMessage = z
  .object({
    ...timed,
    type: z.literal('chat-message'),
    chat: id,
    author: z.string().trim().min(1).max(20).regex(/^[^\r\n]+$/, 'Use a single line'),
    text: z.string().trim().min(1).max(80).regex(/^[^\r\n]+$/, 'Use a single line'),
    color: color.default('#9fb8cb'),
  })
  .strict();
const zone = z
  .object({
    ...span,
    type: z.literal('zone'),
    points: z.array(position).min(4),
    color: color.default('#b9615b'),
    opacity: z.number().min(0).max(1).default(0.18),
  })
  .strict();
const grid = z.object({
  ...span,
  type: z.literal('grid'),
  asset: id,
  opacity: z.number().min(0).max(1).default(0.6),
  fadeIn: seconds.default(0),
  fadeOut: seconds.default(0),
}).strict();
const line = z
  .object({
    ...span,
    type: z.literal('line'),
    points: z.array(position).min(2),
    color: color.default('#b7c1c8'),
    width: z.number().positive().default(2),
    drawSeconds: seconds.default(0),
    dashed: z.boolean().default(false),
    flowSpeed: z.number().min(-10).max(10).default(0),
    fadeIn: seconds.default(0),
    fadeOut: seconds.default(0),
  })
  .strict();
const circle = z
  .object({
    ...span,
    type: z.literal('circle'),
    center: position,
    radiusKm: z.number().positive().max(2000),
    color: color.default('#b9615b'),
    fillOpacity: z.number().min(0).max(1).default(0.12),
    strokeWidth: z.number().min(0).max(20).default(2),
    fadeIn: seconds.default(0),
    fadeOut: seconds.default(0),
    pulse: z.boolean().default(false),
  })
  .strict();
const highlight = z
  .object({
    ...span,
    type: z.literal('region'),
    regions: z.array(z.string()).min(1),
    color: color.default('#b9615b'),
    fillOpacity: z.number().min(0).max(1).default(0.36),
    strokeColor: color.optional(),
    strokeOpacity: z.number().min(0).max(1).default(1),
    strokeWidth: z.number().nonnegative().default(2),
    label: z.string().max(80).optional(),
    fadeIn: seconds.default(0),
    fadeOut: seconds.default(0),
    pulse: z.boolean().default(false),
  })
  .strict();
const legend = z
  .object({
    ...span,
    type: z.literal('legend'),
    items: z.array(
      z
        .object({
          text: z.string().min(1).max(80),
          color,
          symbol: z.enum(['fill', 'outline', 'line']).default('fill'),
        })
        .strict(),
    ),
  })
  .strict();
const marker = z
  .object({
    ...span,
    type: z.literal('marker'),
    position,
    label: z.string().max(80).optional(),
    color: color.default('#c9d0d5'),
    effect: z.enum(['point', 'ring', 'pulse']).default('point'),
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
  .object({
    ...span,
    type: z.literal('inset'),
    camera,
    title: z.string().max(80),
  })
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
    loop: z.boolean().default(false),
    playbackRate: z.number().min(0.25).max(4).default(1),
  })
  .strict();
const mute = z.object({ ...span, type: z.literal('silence') }).strict();
const screen = z
  .object({
    ...span,
    type: z.literal('screen'),
    effect: z.enum([
      'blackout',
      'flash',
      'interference',
      'noise',
      'scanlines',
      'chromatic',
      'dropout',
      'blur',
      'desaturate',
      'vignette',
      'flicker',
      'jitter',
      'vhs',
      'shutdown',
    ]),
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
      .object({
        camera,
        regions: z.string().optional(),
        attribution: z.string().min(1).optional(),
      })
      .strict(),
    cuts: z
      .array(
        z
          .object({
            id,
            duration: z.number().positive(),
            storyTime: timestamp,
            clockTransition: seconds.default(0),
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
          status,
          bulletin,
          chat,
          chatMessage,
          zone,
          grid,
          line,
          circle,
          highlight,
          legend,
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
export type CompiledEvent = Event & {
  start: number;
  end: number;
  order: number;
};
export type Cut = Scenario['cuts'][number] & {
  start: number;
  end: number;
  epoch: number;
};
export type Timeline = {
  scenario: Scenario;
  fps: number;
  durationInFrames: number;
  cuts: Cut[];
  events: CompiledEvent[];
};
export const FPS = 60;
export const frames = (seconds: number) => Math.round(seconds * FPS);
export const alertText = (sender: string, text: string) =>
  text.includes(`[${sender}]`) ? text : `[${sender}] ${text}`;

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
    const cut = {
      ...c,
      start: cursor,
      end: cursor + n,
      epoch: Date.parse(c.storyTime),
    };
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
    if ('sound' in e && typeof e.sound === 'object' && !Object.hasOwn(scenario.assets, e.sound.asset))
      errors.push(`${path}.sound.asset: unknown asset ${e.sound.asset}`);
    if (e.type === 'alert') {
      if (!Object.hasOwn(scenario.agencies, e.sender))
        errors.push(`${path}.sender: unknown agency ${e.sender}`);
      else if (!fitsText(alertText(scenario.agencies[e.sender], e.text), 16, 8))
        errors.push(`${path}.text: shorten the message including its sender so the full text fits at once`);
    }
    if (
      e.type === 'zone' &&
      (e.points[0][0] !== e.points.at(-1)![0] || e.points[0][1] !== e.points.at(-1)![1])
    )
      errors.push(`${path}.points: polygon ring must be closed`);
    if (e.type === 'circle' && Math.abs(e.center[1]) + e.radiusKm / 6371.0088 * 180 / Math.PI > 85)
      errors.push(`${path}.radiusKm: circle exceeds supported map latitudes -85..85`);
    if ((e.type === 'news' || e.type === 'bulletin') && !Object.hasOwn(scenario.agencies, e.source))
      errors.push(`${path}.source: unknown agency ${e.source}`);
    else if (e.type === 'news' && !fitsText(scenario.agencies[e.source], 10, 2))
      errors.push(`${path}.source: shorten the display name so the full source fits beside the headline`);
    else if (e.type === 'bulletin' && !fitsText(scenario.agencies[e.source], 48, 2))
      errors.push(`${path}.source: shorten the display name so the full source fits above the notice`);
    if (e.type === 'audio' || e.type === 'grid') {
      if (!Object.hasOwn(scenario.assets, e.asset))
        errors.push(`${path}.asset: unknown asset ${e.asset}`);
    }
    if ('fadeIn' in e && e.fadeIn + e.fadeOut > e.duration)
      errors.push(`${path}: fades exceed duration`);
    return [{ ...e, start, end, order: i }];
  });
  for (const e of events) {
    if (e.type === 'chat-message') {
      const panel = events.find((x) => x.id === e.chat && x.type === 'chat');
      if (!panel) errors.push(`events[${e.order}] (${e.id}).chat: unknown chat ${e.chat}`);
      else if (e.start < panel.start || e.start >= panel.end)
        errors.push(`events[${e.order}] (${e.id}).at: outside chat ${e.chat}`);
      else e.end = panel.end;
    }
  }
  for (const cut of cuts) {
    if (frames(cut.clockTransition) >= cut.end - cut.start)
      errors.push(`cuts (${cut.id}).clockTransition: must be shorter than cut`);
    if (cut.start === 0 && cut.clockTransition)
      errors.push(`cuts (${cut.id}).clockTransition: requires a previous cut`);
  }
  // Single-owner tracks cannot have ambiguous concurrent values. Independent layers can overlap.
  for (const type of ['camera', 'inset', 'news', 'status', 'bulletin', 'legend', 'chat'] as const) {
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
