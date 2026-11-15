import React from 'react';
import { FPS, type Timeline } from '../scenario.js';
import { clock, notificationPulse, stateAt } from '../timeline.js';
import { numberFont } from './fonts.js';
import { changeFrames, changeProgress, transitionAt } from './transitions.js';
import { layout } from './layout.js';

export function News({ timeline, frame }: { timeline: Timeline; frame: number }) {
  const { current, previous, progress } = transitionAt(timeline.events, 'news', frame);
  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        alignSelf: 'stretch',
        overflow: 'hidden',
      }}
    >
      {[previous, current].map(
        (news, i) => {
          if (!news) return null;
          return (
            <div
              key={news.id}
              aria-hidden={i === 0 || undefined}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                opacity: i === 0 ? 1 - progress : progress,
                transform: `translateY(${i === 0 ? -layout.footer * progress : layout.footer * (1 - progress)}px)`,
              }}
            >
              <div style={{ width: 280, flexShrink: 0, overflowWrap: 'anywhere' }}>
                <div style={{ fontSize: 28, color: '#c6d0d7', fontWeight: 600, lineHeight: 1.3 }}>
                  {timeline.scenario.agencies[news.source]}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    color: '#b0bec8',
                    marginTop: 5,
                    fontFamily: numberFont,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {clock(
                    news.publishedAt
                      ? Date.parse(news.publishedAt)
                      : stateAt(timeline, news.start).epoch,
                    timeline.scenario.timezone,
                  )}
                </div>
              </div>
              <div
                style={{
                  fontSize: 40,
                  lineHeight: 1.3,
                  wordBreak: 'normal',
                  whiteSpace: 'pre-wrap',
                  minWidth: 0,
                  flex: 1,
                  overflowWrap: 'anywhere',
                }}
              >
                {news.headline}
              </div>
            </div>
          );
        },
      )}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: '#b3c0c9',
          opacity: current ? (1 - changeProgress(frame, current.start, 60)) * 0.7 : 0,
        }}
      />
    </div>
  );
}

export function Status({ timeline, frame }: { timeline: Timeline; frame: number }) {
  const { current, previous, progress, start } = transitionAt(timeline.events, 'status', frame);
  const pulse = notificationPulse(frame, start + changeFrames, start + changeFrames + 1.8 * FPS);
  // Compare authored values, so unchanged badges do not animate on event replacement.
  const before = timeline.events.find((e) => e.type === 'status' && e.end === current?.start);
  const oldItems = before?.type === 'status' ? before.items : [];
  const same = (a: { text: string; color: string }, b: { text: string; color: string }) =>
    a.text === b.text && a.color === b.color;
  const removed =
    previous?.items.filter((item) => !current?.items.some((next) => same(item, next))) ?? [];
  const count = Math.max(current?.items.length ?? 0, previous?.items.length ?? 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const item = current?.items[i];
        const old = previous?.items[i];
        const outgoing = old && removed.includes(old) ? old : undefined;
        const changed = item && !oldItems.some((old) => same(item, old));
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              flexShrink: 0,
              gridTemplateColumns: `${item ? 1 : 1 - progress}fr`,
            }}
          >
            <div style={{ display: 'grid', minWidth: 0, overflow: 'hidden' }}>
              {[outgoing, item].map(
                (badge, layer) =>
                  badge && (
                    <span
                      key={layer}
                      aria-hidden={layer === 0 || undefined}
                      style={{
                        gridArea: '1 / 1',
                        position: 'relative',
                        display: 'block',
                        marginRight: 14,
                        opacity:
                          layer === 0 ? 1 - progress : changed ? progress * (1 - 0.6 * pulse) : 1,
                        transform: `translateY(${layer === 0 ? -24 * progress : changed ? 24 * (1 - progress) : 0}px)`,
                        border: `1px solid ${badge.color}`,
                        color: badge.color,
                        padding: '3px 10px',
                        fontSize: 28,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        background: `${badge.color}${Math.round(
                          (layer === 1 && changed
                            ? Math.max(1 - changeProgress(frame, start, 66), pulse)
                            : 0) * 96,
                        )
                          .toString(16)
                          .padStart(2, '0')}`,
                      }}
                    >
                      {badge.text}
                      {layer === 1 && changed && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 2,
                            background: badge.color,
                            transformOrigin: 'left',
                            transform: `scaleX(${progress})`,
                            opacity: Math.max(1 - changeProgress(frame, start, 66), pulse),
                          }}
                        />
                      )}
                    </span>
                  ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
