import React from 'react';
import type { CompiledEvent } from '../scenario.js';
import { numberFont } from './fonts.js';
import { changeProgress } from './transitions.js';

export function Legend({ event, frame }: {
  event: Extract<CompiledEvent, { type: 'legend' }>;
  frame: number;
}) {
  const compact = event.layout === 'colorbar';
  const position = event.position ?? (compact ? 'top-right' : 'bottom-left');
  const progress = changeProgress(frame, event.start);
  return (
    <div style={{
      position: 'absolute',
      ...(position.startsWith('top') ? { top: 20 } : { bottom: 24 }),
      ...(position.endsWith('right') ? { right: 20 } : { left: 24 }),
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? 0 : 10,
      background: '#0b0e10ed',
      padding: compact ? '8px 10px' : '14px 18px',
      fontSize: compact ? 22 : 30,
      color: '#d0d5da',
      opacity: progress,
      transform: `translateY(${10 * (1 - progress)}px)`,
      pointerEvents: 'none',
    }}>
      {event.items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: compact ? 7 : 12 }}>
          <span style={{
            flexShrink: 0,
            width: compact ? 16 : 23,
            height: compact ? 24 : item.symbol === 'line' ? 0 : 16,
            background: item.symbol === 'fill' ? item.color : 'transparent',
            border: item.symbol === 'fill' ? 'none' : `2px solid ${item.color}`,
          }} />
          <span style={compact ? {
            fontFamily: numberFont,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: '24px',
            whiteSpace: 'nowrap',
          } : undefined}>{item.text}</span>
        </div>
      ))}
      {compact && event.unit && (
        <div style={{ fontSize: 20, lineHeight: '26px', textAlign: 'center', marginTop: 4 }}>
          {event.unit}
        </div>
      )}
    </div>
  );
}
