import React from 'react';
import type { Timeline, CompiledEvent } from '../scenario.js';
import { FPS, pages, alertText } from '../scenario.js';
import { stateAt, clock } from '../timeline.js';
import { numberFont } from './fonts.js';
const colors: Record<string, string> = {
  안전안내: '#a0adb5',
  긴급재난: '#c2746e',
  위급재난: '#dd655f',
};
function AlertCard({
  event,
  latest,
  frame,
  timeline,
}: {
  event: CompiledEvent;
  latest: boolean;
  frame: number;
  timeline: Timeline;
}) {
  if (event.type !== 'alert') return null;
  const chunks = pages(alertText(timeline.scenario.agencies[event.sender], event.text)),
    page = Math.floor((frame - event.start) / FPS / event.pageSeconds) % chunks.length;
  const received = stateAt(timeline, event.start).epoch;
  return (
    <article
      style={{
        padding: latest ? '20px 24px 22px' : '17px 24px 20px',
        borderBottom: '1px solid #343a3f',
        background: latest ? '#131719' : '#0e1214',
        borderLeft: `2px solid ${latest ? colors[event.level] : '#434b51'}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 17,
          color: latest ? colors[event.level] : '#8c979e',
          marginBottom: 12,
        }}
      >
        <b
          style={{
            border: `1px solid ${latest ? colors[event.level] : '#4b565d'}`,
            padding: '2px 7px',
            fontWeight: 400,
          }}
        >
          {event.corrects ? '정정 · ' : ''}
          {event.level}
        </b>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: numberFont,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 17,
            color: '#aab3b9',
          }}
        >
          수신 {clock(received, timeline.scenario.timezone)}
        </span>
      </div>
      {(event.occurredAt || event.publishedAt) && (
        <div style={{ fontSize: 16, color: '#939fa7', marginBottom: 10 }}>
          {event.occurredAt &&
            `발생 ${clock(Date.parse(event.occurredAt), timeline.scenario.timezone)} `}
          {event.publishedAt &&
            `발표 ${clock(Date.parse(event.publishedAt), timeline.scenario.timezone)}`}
        </div>
      )}
      <div
        style={{
          fontSize: latest ? 28 : 22,
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
          overflowWrap: 'anywhere',
          color: latest ? '#e0e4e7' : '#aab5bd',
        }}
      >
        {chunks[page]}
      </div>
      {chunks.length > 1 && (
        <div
          style={{
            fontFamily: numberFont,
            fontSize: 16,
            color: '#839099',
            marginTop: 12,
            textAlign: 'right',
          }}
        >
          {page + 1} / {chunks.length}
        </div>
      )}
      {event.corrects && (
        <div
          style={{
            fontSize: 16,
            color: '#a4afb6',
            marginTop: 12,
            borderTop: '1px solid #343a3f',
            paddingTop: 10,
          }}
        >
          이전 문자 정정 ·{' '}
          {clock(
            stateAt(timeline, timeline.events.find((e) => e.id === event.corrects)!.start).epoch,
            timeline.scenario.timezone,
          )}
        </div>
      )}
    </article>
  );
}
export function AlertHistory({ timeline, frame }: { timeline: Timeline; frame: number }) {
  return (
    <>
      {stateAt(timeline, frame).alerts.map((event, i) => (
        <AlertCard
          key={event.id}
          event={event}
          latest={i === 0}
          frame={frame}
          timeline={timeline}
        />
      ))}
    </>
  );
}
