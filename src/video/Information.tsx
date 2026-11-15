import React from 'react';
import type { Timeline } from '../scenario.js';
import { clock, stateAt } from '../timeline.js';
import { numberFont } from './fonts.js';
import { changeProgress, pageAt, transitionAt } from './transitions.js';

export function PagedText({
  chunks,
  frame,
  start,
  seconds,
}: {
  chunks: string[];
  frame: number;
  start: number;
  seconds: number;
}) {
  const { page, previous, progress } = pageAt(frame, start, seconds, chunks.length);
  return (
    <div style={{ display: 'grid', overflow: 'hidden' }}>
      {previous !== undefined && progress < 1 && (
        <div
          aria-hidden
          style={{
            gridArea: '1 / 1',
            opacity: 1 - progress,
            transform: `translateY(${-12 * progress}px)`,
          }}
        >
          {chunks[previous]}
        </div>
      )}
      <div
        style={{
          gridArea: '1 / 1',
          opacity: progress,
          transform: `translateY(${12 * (1 - progress)}px)`,
        }}
      >
        {chunks[page]}
      </div>
    </div>
  );
}

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
        (news, i) =>
          news && (
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
                transform: `translateY(${i === 0 ? -92 * progress : 92 * (1 - progress)}px)`,
              }}
            >
              <div style={{ minWidth: 135, flexShrink: 0 }}>
                <div style={{ fontSize: 18, color: '#b3c0c9', fontWeight: 600 }}>
                  {timeline.scenario.agencies[news.source]}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: '#85959f',
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
                  fontSize: news.headline.length > 120 ? 23 : news.headline.length > 85 ? 25 : 30,
                  lineHeight: 1.3,
                  wordBreak: 'keep-all',
                  overflowWrap: 'anywhere',
                }}
              >
                {news.headline}
              </div>
            </div>
          ),
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
                        opacity: layer === 0 ? 1 - progress : changed ? progress : 1,
                        transform: `translateY(${layer === 0 ? -24 * progress : changed ? 24 * (1 - progress) : 0}px)`,
                        border: `1px solid ${badge.color}`,
                        color: badge.color,
                        padding: '3px 10px',
                        fontSize: 18,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        background: `${badge.color}${Math.round(
                          (layer === 1 && changed ? 1 - changeProgress(frame, start, 66) : 0) * 96,
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
                            opacity: 1 - changeProgress(frame, start, 66),
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
