import React, { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { CompiledEvent } from '../scenario.js';
import { envelope } from '../timeline.js';
import { seededRandom } from '../audio/wav.js';

export const signalEffects = [
  'noise', 'scanlines', 'chromatic', 'dropout',
  'blur', 'desaturate', 'vignette', 'flicker', 'jitter', 'vhs',
] as const;
export type SignalLevels = Record<typeof signalEffects[number], number>;

export function signalLevels(events: CompiledEvent[], frame: number): SignalLevels {
  const levels = Object.fromEntries(signalEffects.map((effect) => [effect, 0])) as SignalLevels;
  for (const event of events) {
    if (event.type !== 'screen' || !Object.hasOwn(levels, event.effect)) continue;
    const key = event.effect as keyof SignalLevels;
    levels[key] = Math.min(1, levels[key] +
      envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut) * event.intensity);
  }
  return levels;
}

// Both CSS and SVG effects derive their parameters from the content frame. Seeking
// and a paused content frame during a time jump therefore reproduce the same image.
export function signalStyle(levels: SignalLevels, frame: number, seed: number): CSSProperties {
  const filters: string[] = [];
  if (levels.chromatic > 0) filters.push('url(#dbs-chromatic)');
  if (levels.vhs > 0) filters.push('url(#dbs-vhs)');
  if (levels.blur > 0) filters.push(`blur(${levels.blur * 6}px)`);
  if (levels.desaturate > 0) filters.push(`grayscale(${levels.desaturate})`);
  const random = seededRandom(seed ^ Math.imul(frame + 1, 0x6c078965));
  const brightness = 1 - levels.flicker * (0.03 + random() * 0.14);
  if (levels.flicker > 0)
    filters.push(`brightness(${brightness})`);
  const x = (random() * 2 - 1) * levels.jitter * 7;
  const y = (random() * 2 - 1) * levels.jitter * 3;
  return {
    filter: filters.length ? filters.join(' ') : undefined,
    transform: levels.jitter > 0 ? `translate(${x}px,${y}px)` : undefined,
  };
}

function Noise({ frame, seed, intensity }: { frame: number; seed: number; intensity: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = canvas.current!.getContext('2d')!, data = ctx.createImageData(960, 540);
    const random = seededRandom(seed ^ Math.imul(frame + 1, 0x45d9f3b));
    for (let i = 0; i < data.data.length; i += 4) {
      const n = Math.floor(random() * 256);
      data.data[i] = data.data[i + 1] = data.data[i + 2] = n;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
  }, [frame, seed]);
  return <canvas ref={canvas} width={960} height={540} style={{
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    imageRendering: 'pixelated', opacity: intensity * .22, mixBlendMode: 'screen',
  }} />;
}

export function SignalEffects({ frame, seed, levels }: {
  frame: number; seed: number; levels: SignalLevels;
}) {
  if (!signalEffects.some((effect) => levels[effect] > 0)) return null;
  const shift = levels.chromatic * (3 + Math.sin(frame * .47 + seed) * 2);
  const random = seededRandom(seed ^ Math.imul(Math.floor(frame / 6) + 1, 0x27d4eb2d));
  const bandTop = ((frame * .45 + (seed >>> 0) % 97) % 112) - 12;
  const bandHeight = 3 + levels.vhs * 7;
  const bandShift = (random() * 2 - 1) * levels.vhs * 32;
  return <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <svg width={0} height={0} style={{ position: 'absolute' }}><defs>
      {levels.chromatic > 0 && <filter id="dbs-chromatic" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={shift} result="red" />
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
        <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={-shift} result="blue" />
        <feBlend in="red" in2="green" mode="screen" result="rg" />
        <feBlend in="rg" in2="blue" mode="screen" />
      </filter>}
      {levels.vhs > 0 && <filter id="dbs-vhs" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feOffset in="SourceGraphic" dx={bandShift} result="shifted" />
        <feFlood floodColor="white" x="0" y={`${bandTop}%`} width="100%" height={`${bandHeight}%`} result="band" />
        <feComposite in="shifted" in2="band" operator="in" result="tracking" />
        <feComposite in="SourceGraphic" in2="band" operator="out" result="steady" />
        <feMerge><feMergeNode in="steady" /><feMergeNode in="tracking" /></feMerge>
      </filter>}
    </defs></svg>
    {levels.noise > 0 && <Noise frame={frame} seed={seed} intensity={levels.noise} />}
    {levels.scanlines > 0 && <div data-effect="scanlines" style={{
      position: 'absolute', inset: 0, opacity: levels.scanlines * .4,
      background: 'repeating-linear-gradient(to bottom,transparent 0px,transparent 2px,#000 2px,#000 4px)',
      backgroundPositionY: (frame / 3) % 4,
    }} />}
    {levels.dropout > 0 && Array.from({ length: 1 + Math.floor(levels.dropout * 2) }, (_, i) =>
      <div key={i} data-effect="dropout" style={{
        position: 'absolute', left: 0, right: 0, top: `${random() * 94}%`,
        height: 12 + random() * 96 * levels.dropout, background: '#020405', opacity: levels.dropout,
      }} />)}
    {levels.vignette > 0 && <div data-effect="vignette" style={{
      position: 'absolute', inset: 0, opacity: levels.vignette,
      background: 'radial-gradient(ellipse at center,transparent 25%,rgba(0,0,0,.28) 60%,rgba(0,0,0,.92) 100%)',
    }} />}
    {levels.vhs > 0 && <div data-effect="vhs" style={{
      position: 'absolute', left: 0, right: 0, top: `${bandTop}%`, height: `${bandHeight}%`,
      opacity: levels.vhs * .15,
      background: 'repeating-linear-gradient(to bottom,#ccd5dd 0px,transparent 1px,transparent 3px)',
      borderTop: '1px solid #eef4f8',
    }} />}
  </div>;
}
