import { FPS, type CompiledEvent } from '../scenario.js';

// Frame-derived motion: seeking and parallel renders never depend on DOM history.
export const changeFrames = Math.round(0.45 * FPS);
export function changeProgress(frame: number, start: number, frames = changeFrames) {
  const p = Math.max(0, Math.min(1, (frame - start) / frames));
  return 1 - (1 - p) ** 3;
}

export function transitionAt<T extends CompiledEvent['type']>(
  events: CompiledEvent[],
  type: T,
  frame: number,
) {
  type Event = Extract<CompiledEvent, { type: T }>;
  const candidates = events.filter((e): e is Event => e.type === type && e.start <= frame);
  const current = candidates.find((e) => frame < e.end);
  const previous = current
    ? candidates.find((e) => e !== current && e.end === current.start)
    : candidates.reduce<Event | undefined>(
        (last, e) => (!last || e.end > last.end ? e : last),
        undefined,
      );
  const start = current?.start ?? previous?.end ?? frame;
  const progress = changeProgress(frame, start);
  return {
    current,
    previous: progress < 1 ? previous : undefined,
    progress,
    start,
  };
}

export function pageAt(frame: number, start: number, seconds: number, count: number) {
  const frames = Math.round(seconds * FPS);
  const turn = Math.floor(Math.max(0, frame - start) / frames);
  return {
    page: turn % count,
    previous: turn > 0 && count > 1 ? (turn - 1) % count : undefined,
    progress: turn > 0 && count > 1 ? changeProgress(frame, start + turn * frames) : 1,
  };
}
