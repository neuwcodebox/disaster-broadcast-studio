import React from 'react';
import type { CompiledEvent } from '../scenario.js';
import { FPS, pages } from '../scenario.js';
import { numberFont } from './fonts.js';

export function Bulletin({
  event,
  source,
  frame,
}: {
  event: Extract<CompiledEvent, { type: 'bulletin' }>;
  source: string;
  frame: number;
}) {
  const chunks = pages(event.text);
  const page = Math.floor((frame - event.start) / FPS / event.pageSeconds) % chunks.length;
  return (
    <section
      style={{
        position: 'absolute',
        top: 49,
        bottom: 93,
        left: 0,
        right: 0,
        background: '#0a0d0f',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '50px 190px',
      }}
    >
      <div style={{ fontSize: 23, color: '#9ba5ac', marginBottom: 32 }}>{source}</div>
      <h2
        style={{
          fontSize: 46,
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
          fontSize: 34,
          lineHeight: 1.9,
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
        }}
      >
        {chunks[page]}
      </div>
      {chunks.length > 1 && (
        <div
          style={{
            fontSize: 18,
            marginTop: 30,
            color: '#8c969d',
            fontFamily: numberFont,
          }}
        >
          {page + 1} / {chunks.length}
        </div>
      )}
    </section>
  );
}
