import React from 'react';
import type { Timeline } from '../scenario.js';
import { clock, stateAt } from '../timeline.js';
import { numberFont } from './fonts.js';
import { changeProgress } from './transitions.js';

export const chatHeight = 260;

export function ChatPanel({
  timeline,
  chat,
  frame,
}: {
  timeline: Timeline;
  chat: NonNullable<ReturnType<typeof stateAt>['chat']>;
  frame: number;
}) {
  const progress = changeProgress(frame, chat.panel.start);
  return (
    <section
      aria-label={chat.panel.title}
      style={{
        height: chatHeight,
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid #495159',
        background: '#0b0f12',
        opacity: progress,
        transform: `translateY(${12 * (1 - progress)}px)`,
      }}
    >
      <div
        style={{
          height: 42,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 24px',
          borderBottom: '1px solid #293238',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b46e68' }} />
        <span style={{ fontSize: chat.panel.title.length > 20 ? 20 : 28, fontWeight: 600 }}>
          {chat.panel.title}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 22, color: '#b2bdc5', letterSpacing: 1 }}>
          LIVE
        </span>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {chat.messages.length === 0 && (
          <div style={{ padding: '16px 24px', color: '#b2bdc5', fontSize: 28 }}>
            아직 채팅이 없습니다.
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 12, left: 24, right: 24 }}>
          {/* Only the recent tail can fit; absolute bottom alignment scrolls without DOM state. */}
          {chat.messages.slice(-12).map((message) => {
            const arrival = changeProgress(frame, message.start, 18);
            return (
              <div key={message.id} style={{ display: 'grid', gridTemplateRows: `${arrival}fr` }}>
                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                  <article
                    style={{
                      paddingTop: 8,
                      opacity: arrival,
                      transform: `translateY(${8 * (1 - arrival)}px)`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 3 }}>
                      <span style={{ fontSize: 24, color: message.color, overflowWrap: 'anywhere' }}>
                        {message.author}
                      </span>
                      <time style={{ fontSize: 22, color: '#abb8c2', fontFamily: numberFont, flexShrink: 0 }}>
                        {clock(stateAt(timeline, message.start).epoch, timeline.scenario.timezone)}
                      </time>
                    </div>
                    <div style={{ fontSize: 28, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                      {message.text}
                    </div>
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
