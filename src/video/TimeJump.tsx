import React from 'react';
import type { stateAt } from '../timeline.js';
import { layout } from './layout.js';

type Jump = ReturnType<typeof stateAt>['timeJump'];

export function timeJumpStrength(jump: Jump) {
  if (!jump) return 0;
  const lead = jump.style === 'blink' ? 0.08 : 0.15;
  const tail = jump.style === 'blink' ? 0.12 : 0.25;
  const ramp = Math.max(0, Math.min(1, jump.progress / lead, (1 - jump.progress) / tail));
  return ramp * ramp * (3 - 2 * ramp);
}

// All motion comes from the requested frame, including direct seeks and stills.
export function TimeJump({ jump }: { jump: Jump }) {
  if (!jump) return null;
  const strength = timeJumpStrength(jump);
  if (jump.style === 'blink') {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          pointerEvents: 'none',
          opacity: strength,
        }}
      />
    );
  }
  return (
    <>
      <svg width={0} height={0} aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <filter id="dbs-time-jump" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${5 * strength} ${0.3 * strength}`} />
          </filter>
        </defs>
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: `${layout.header + 1}px 0 0`,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: strength,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.22,
            background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, #c6d6df55 3px, #c6d6df55 4px, #0005 4px, #0005 6px)',
            backgroundPositionY: (jump.elapsedFrames * 1.4) % 6,
          }}
        />
        {[0, 60].map((offset) => (
          <div
            key={offset}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${((jump.elapsedFrames * 2.8 + offset) % 120) - 10}%`,
              height: '5%',
              background: 'linear-gradient(to bottom, transparent, #dce8ed20 45%, #dce8ed66 50%, #0005 54%, transparent)',
            }}
          />
        ))}
      </div>
      <svg
        viewBox="0 0 240 140"
        width={240}
        height={140}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: strength * 0.27,
          filter: 'blur(2.5px)',
        }}
      >
        <path d="M20 20 L104 70 L20 120 Z M122 20 L206 70 L122 120 Z" fill="#e0e8ed" />
      </svg>
    </>
  );
}
