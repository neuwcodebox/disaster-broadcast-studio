import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  cancelRender,
} from 'remotion';
import type { FeatureCollection } from 'geojson';
import type { Timeline, CompiledEvent } from '../scenario.js';
import { FPS, pages } from '../scenario.js';
import type { Regions } from '../load.js';
import { stateAt, clock, envelope } from '../timeline.js';
import { BroadcastMap } from './Map.js';
import { fonts, bodyFont, numberFont } from './fonts.js';
export type BroadcastProps = {
  timeline: Timeline;
  regions: Regions;
  countries: FeatureCollection;
  provinces: FeatureCollection;
  audio: Record<string, string>;
  attribution: string;
};
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
  const chunks = pages(event.text),
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
      <div
        style={{
          fontSize: latest ? 21 : 19,
          fontWeight: 600,
          marginBottom: 12,
          color: latest ? '#d5dade' : '#a4afb7',
        }}
      >
        {timeline.scenario.agencies[event.sender]}
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
export function Broadcast(props: BroadcastProps) {
  const { timeline, regions, countries, provinces, audio, attribution } = props;
  const frame = useCurrentFrame(),
    state = stateAt(timeline, frame),
    news = state.news;
  const { delayRender, continueRender } = useDelayRender();
  const [fontHandle] = useState(() => delayRender('Loading bundled Korean font'));
  useEffect(() => {
    const links = fonts.flatMap((font) =>
      font.weights.map((weight) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = staticFile(`fonts/${font.id}-${weight}.css`);
        document.head.append(link);
        return link;
      }),
    );
    Promise.all(
      links.map(
        (link) =>
          new Promise<void>((resolve, reject) => {
            link.onload = () => resolve();
            link.onerror = () => reject(Error('Bundled font CSS unavailable'));
          }),
      ),
    )
      .then(() =>
        Promise.all(
          fonts.flatMap((font) =>
            font.weights.map((weight) =>
              document.fonts.load(
                `${weight} 28px "${font.family}"`,
                font.id === 'mono'
                  ? '0123456789:.- /+'
                  : JSON.stringify(timeline.scenario) +
                      ' 재난문자 수신 이력 발생 발표 이전 정정 안전안내 긴급재난 위급재난',
              ),
            ),
          ),
        ),
      )
      .then(() => document.fonts.ready)
      .then(() => continueRender(fontHandle))
      .catch(cancelRender);
    return () => links.forEach((link) => link.remove());
  }, []);
  const inset = state.visible.find((e) => e.type === 'inset');
  const alertWindow =
    state.alerts.length <= 2
      ? state.alerts
      : [
          state.alerts[0],
          state.alerts[
            1 + (Math.floor((frame - state.alerts[0].start) / FPS / 12) % (state.alerts.length - 1))
          ],
        ];
  return (
    <AbsoluteFill style={{ background: '#080b0d', fontFamily: bodyFont, color: '#dce1e5' }}>
      <AbsoluteFill style={{ opacity: state.opacity }}>
        <header
          style={{
            position: 'absolute',
            inset: '0 0 auto 0',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 26px',
            borderBottom: '1px solid #495159',
            background: '#0b0e10',
            gap: 14,
          }}
        >
          <span style={{ width: 4, height: 23, background: '#a7b3bb' }} />
          <h1
            style={{
              fontSize: timeline.scenario.title.length > 40 ? 20 : 25,
              fontWeight: 600,
              margin: 0,
              letterSpacing: 0.5,
              maxWidth: 1080,
              lineHeight: 1.3,
              overflowWrap: 'anywhere',
            }}
          >
            {timeline.scenario.title}
          </h1>
          <time
            style={{
              marginLeft: 'auto',
              fontSize: 23,
              fontFamily: numberFont,
              fontVariantNumeric: 'tabular-nums',
              color: '#bdc7ce',
              letterSpacing: 0.5,
            }}
          >
            {clock(state.epoch, timeline.scenario.timezone, true)}
          </time>
        </header>
        <main style={{ position: 'absolute', left: 0, top: 65, right: 640, bottom: 93 }}>
          <BroadcastMap
            camera={state.camera}
            countries={countries}
            regions={regions}
            provinces={provinces}
            events={state.visible}
            frame={frame}
          />
          {inset?.type === 'inset' && (
            <div
              style={{
                position: 'absolute',
                right: 20,
                bottom: 38,
                width: 420,
                height: 290,
                border: '1px solid #78858e',
              }}
            >
              <BroadcastMap
                camera={inset.camera}
                countries={countries}
                regions={regions}
                provinces={provinces}
                events={state.visible}
                frame={frame}
                inset
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: '7px 12px',
                  background: '#0b0e10f2',
                  borderBottom: '1px solid #485159',
                  fontSize: 17,
                }}
              >
                {inset.title}
              </div>
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 16,
              right: 16,
              fontSize: 12,
              color: '#7b8992',
              textShadow: '0 1px 2px #000',
            }}
          >
            {attribution}
          </div>
        </main>
        <aside
          style={{
            position: 'absolute',
            top: 65,
            right: 0,
            bottom: 93,
            width: 640,
            borderLeft: '1px solid #495159',
            background: '#0c1012',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 44,
              padding: '10px 24px',
              boxSizing: 'border-box',
              fontSize: 17,
              color: '#a5b1ba',
              borderBottom: '1px solid #495159',
              display: 'flex',
              justifyContent: 'space-between',
              background: '#0d1113',
            }}
          >
            <b>재난문자 수신 이력</b>
            <span style={{ fontFamily: numberFont, fontVariantNumeric: 'tabular-nums' }}>
              {state.alerts.length.toString().padStart(2, '0')}
            </span>
          </div>
          {alertWindow.map((event, i) => (
            <AlertCard
              key={event.id}
              event={event}
              latest={i === 0}
              frame={frame}
              timeline={timeline}
            />
          ))}
        </aside>
        <footer
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 92,
            borderTop: '1px solid #606a72',
            display: 'flex',
            alignItems: 'center',
            background: '#0b0e10',
            padding: '0 26px',
            gap: 24,
          }}
        >
          {news?.type === 'news' && (
            <>
              <div style={{ borderLeft: '3px solid #aab6be', paddingLeft: 14, minWidth: 135 }}>
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
                  fontWeight: 400,
                  wordBreak: 'keep-all',
                  overflowWrap: 'anywhere',
                  opacity: Math.min(1, (frame - news.start + 1) / 12),
                }}
              >
                {news.headline}
              </div>
            </>
          )}
        </footer>
      </AbsoluteFill>
      {state.visible
        .filter((e) => e.type === 'screen')
        .map((event) => {
          if (event.type !== 'screen') return null;
          const opacity =
            envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut) * event.intensity;
          const noise = ((frame * 1103515245 + timeline.scenario.seed * 12345) >>> 0) % 13;
          return (
            <AbsoluteFill
              key={event.id}
              style={{
                pointerEvents: 'none',
                opacity,
                background:
                  event.effect === 'blackout'
                    ? '#000'
                    : event.effect === 'flash'
                      ? '#fff'
                      : `repeating-linear-gradient(0deg, transparent ${noise}px, #8b949b33 ${noise + 1}px, transparent ${noise + 3}px, transparent ${noise + 8}px)`,
              }}
            />
          );
        })}
      {frame < 180 && (
        <AbsoluteFill
          style={{
            background: '#080b0d',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: frame < 150 ? 1 : (180 - frame) / 30,
          }}
        >
          <div
            style={{
              fontSize: timeline.scenario.title.length > 40 ? 25 : 30,
              fontWeight: 600,
              maxWidth: 1440,
              textAlign: 'center',
              overflowWrap: 'anywhere',
              lineHeight: 1.5,
            }}
          >
            {timeline.scenario.title}
          </div>
          <div
            style={{
              fontSize: 20,
              color: '#8c9aa4',
              marginTop: 22,
              maxWidth: 1200,
              textAlign: 'center',
              lineHeight: 1.7,
            }}
          >
            {timeline.scenario.fictionNotice}
          </div>
        </AbsoluteFill>
      )}
      {timeline.events
        .filter((e) => e.type === 'audio')
        .map((event) => {
          if (event.type !== 'audio') return null;
          return (
            <Sequence key={event.id} from={event.start} durationInFrames={event.end - event.start}>
              <Audio
                src={staticFile(audio[event.asset])}
                trimBefore={Math.round(event.offset * FPS)}
                volume={
                  timeline.events.some(
                    (e) => e.type === 'silence' && e.start <= frame && frame < e.end,
                  )
                    ? 0
                    : event.volume *
                      envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut)
                }
              />
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
}
