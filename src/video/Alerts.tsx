import React from 'react';
import { interpolateColors } from 'remotion';
import type { Timeline, CompiledEvent } from '../scenario.js';
import { alertText } from '../scenario.js';
import { stateAt, clock } from '../timeline.js';
import { numberFont } from './fonts.js';
import { changeProgress } from './transitions.js';
const colors: Record<string, string> = {
  안전안내: '#a0adb5',
  긴급재난: '#c2746e',
  위급재난: '#dd655f',
};
function AlertCard({
  event,
  emphasis,
  frame,
  timeline,
}: {
  event: CompiledEvent;
  emphasis: number;
  frame: number;
  timeline: Timeline;
}) {
  if (event.type !== 'alert') return null;
  const arrival = changeProgress(frame, event.start);
  const received = stateAt(timeline, event.start).epoch;
  return (
    <div style={{ display: 'grid', gridTemplateRows: `${arrival}fr` }}>
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        <article
          style={{
            padding: '16px 24px',
            opacity: arrival,
            transform: `translateY(${-14 * (1 - arrival)}px)`,
            boxShadow: `inset 4px 0 ${colors[event.level]}${Math.round(
              (1 - changeProgress(frame, event.start, 66)) * 180,
            )
              .toString(16)
              .padStart(2, '0')}`,
            borderBottom: '1px solid #343a3f',
            background: interpolateColors(emphasis, [0, 1], ['#0e1214', '#131719']),
            borderLeft: `2px solid ${colors[event.level]}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 28,
              color: colors[event.level],
              marginBottom: 10,
            }}
          >
            <b
              style={{
                border: `1px solid ${colors[event.level]}`,
                padding: '2px 7px',
                fontWeight: 400,
              }}
            >
              {event.level}
            </b>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: numberFont,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 26,
                color: '#aab3b9',
              }}
            >
              수신 {clock(received, timeline.scenario.timezone)}
            </span>
          </div>
          {(event.occurredAt || event.publishedAt) && (
            <div style={{ fontSize: 26, color: '#b0bac2', marginBottom: 8 }}>
              {event.occurredAt &&
                `발생 ${clock(Date.parse(event.occurredAt), timeline.scenario.timezone)} `}
              {event.publishedAt &&
                `발표 ${clock(Date.parse(event.publishedAt), timeline.scenario.timezone)}`}
            </div>
          )}
          <div
            style={{
              fontSize: 32 + 8 * emphasis,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'normal',
              overflowWrap: 'anywhere',
              color: interpolateColors(emphasis, [0, 1], ['#c0c9d0', '#edf0f2']),
            }}
          >
            {alertText(timeline.scenario.agencies[event.sender], event.text)}
          </div>
        </article>
      </div>
    </div>
  );
}
export function AlertHistory({ timeline, frame }: { timeline: Timeline; frame: number }) {
  const alerts = stateAt(timeline, frame).alerts;
  return (
    <>
      {alerts.map((event, i) => (
        <AlertCard
          key={event.id}
          event={event}
          emphasis={
            i === 0
              ? 1
              : alerts[i - 1].start > event.start
                ? 1 - changeProgress(frame, alerts[i - 1].start)
                : 0
          }
          frame={frame}
          timeline={timeline}
        />
      ))}
    </>
  );
}
