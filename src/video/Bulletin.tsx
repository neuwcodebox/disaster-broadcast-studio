import React from 'react';
import type { CompiledEvent } from '../scenario.js';
import { layout } from './layout.js';

export function Bulletin({
  event,
  source,
  progress = 1,
}: {
  event: Extract<CompiledEvent, { type: 'bulletin' }>;
  source: string;
  progress?: number;
}) {
  return (
    <section
      style={{
        position: 'absolute',
        top: layout.header + 1,
        bottom: layout.footer + 1,
        left: 0,
        right: 0,
        background: '#0a0d0f',
        opacity: progress,
        transform: `translateY(${16 * (1 - progress)}px)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '50px 190px',
      }}
    >
      <div style={{ fontSize: 32, color: '#b8c3cb', marginBottom: 24 }}>{source}</div>
      <h2
        style={{
          fontSize: 54,
          fontWeight: 600,
          color: event.color,
          margin: '0 0 32px',
          lineHeight: 1.5,
        }}
      >
        {event.heading}
      </h2>
      <div
        style={{
          fontSize: 44,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'normal',
          overflowWrap: 'anywhere',
        }}
      >
        {event.text}
      </div>

    </section>
  );
}
