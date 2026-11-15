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
import type { Timeline } from '../scenario.js';
import { FPS, pages } from '../scenario.js';
import type { Regions } from '../load.js';
import { stateAt, clock, envelope, receiptHighlights, statusEntry, shutdownAt } from '../timeline.js';
import { AlertHistory } from './Alerts.js';
import { BroadcastMap } from './Map.js';
import {SignalEffects, signalLevels} from './SignalEffects.js';
import {notificationSounds} from '../notifications.js';
import { fonts, bodyFont, numberFont } from './fonts.js';
export type BroadcastProps = {
  timeline: Timeline;
  regions: Regions;
  countries: FeatureCollection;
  provinces: FeatureCollection;
  audio: Record<string, string>;
};
export function Broadcast(props: BroadcastProps) {
  const { timeline, regions, countries, provinces, audio } = props;
  const openingFrames = 5 * FPS;
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
  const status = state.visible.find((e) => e.type === 'status');
  const bulletin = state.visible.find((e) => e.type === 'bulletin');
  const inset = state.visible.find((e) => e.type === 'inset');
  const legend = state.visible.find((e) => e.type === 'legend');
  const signal = signalLevels(state.visible, frame);
  const mapEvents=[...state.visible,...receiptHighlights(timeline,state.contentFrame)];
  const entry=statusEntry(state.contentFrame,status?.start??0);
  const shutdown=shutdownAt(state.visible,frame);
  return (
    <AbsoluteFill style={{ filter: signal.chromatic > 0 ? 'url(#dbs-chromatic)' : undefined, background: shutdown ? '#000' : '#080b0d', fontFamily: bodyFont, color: '#dce1e5' }}>
      <AbsoluteFill style={{ opacity: shutdown?.black ? 0 : state.opacity, transform: shutdown ? `scale(${shutdown.x},${shutdown.y})` : undefined, transformOrigin: '50% 50%' }}>
        <header
          style={{
            position: 'absolute',
            inset: '0 0 auto 0',
            height: 48,
            display: 'flex',
            alignItems: 'center',
            padding: '0 26px',
            borderBottom: '1px solid #495159',
            background: '#0b0e10',
            gap: 14,
          }}
        >
          {status?.type === 'status' &&
            status.items.map((item, i) => (
              <span
                key={`${status.id}-${i}`}
                style={{
                  opacity: entry.opacity, transform: `translateY(${entry.offset}px)`,
                  background: `${item.color}${Math.round(entry.glow*255).toString(16).padStart(2,'0')}`,
                  border: `1px solid ${item.color}`,
                  color: item.color,
                  padding: '3px 10px',
                  fontSize: 18,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {item.text}
              </span>
            ))}
          <time
            style={{
              marginLeft: 'auto',
              fontSize: 23,
              fontFamily: numberFont,
              fontVariantNumeric: 'tabular-nums',
              color: state.jumping ? '#eef2f4' : '#bdc7ce',
              borderBottom: state.jumping ? '2px solid #d4e0e7' : '2px solid transparent',
              background: state.jumping ? '#202b32' : 'transparent',
              boxShadow: state.jumping ? '0 0 16px #b8d6e333' : 'none',
              textShadow: state.jumping ? '0 0 8px #d9e9f280' : 'none',
              padding: '2px 8px',
              fontWeight: state.jumping ? 600 : 400,
              letterSpacing: 0.5,
            }}
          >
            {clock(state.displayEpoch, timeline.scenario.timezone, true)}
          </time>
        </header>
        <main style={{ position: 'absolute', left: 0, top: 49, right: 640, bottom: 93 }}>
          <BroadcastMap
            camera={state.camera}
            moving={state.visible.some((e) => e.type === 'camera')}
            countries={countries}
            regions={regions}
            provinces={provinces}
            events={mapEvents}
            frame={state.contentFrame}
          />
          {legend?.type === 'legend' && <div style={{ position: 'absolute', left: 24, bottom: 24,
            display: 'flex', flexDirection: 'column', gap: 10, background: '#0b0e10ed',
            padding: '14px 18px', fontSize: 21, color: '#d0d5da' }}>
            {legend.items.map((item, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 23, height: item.symbol === 'line' ? 0 : 16,
                background: item.symbol === 'fill' ? item.color : 'transparent',
                border: item.symbol === 'fill' ? 'none' : `2px solid ${item.color}` }} />
              <span>{item.text}</span>
            </div>)}
          </div>}
          {inset?.type === 'inset' && (
            <div
              style={{
                position: 'absolute',
                right: 20,
                bottom: 20,
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
                events={mapEvents}
                frame={state.contentFrame}
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
        </main>
        <aside
          style={{
            position: 'absolute',
            top: 49,
            right: 0,
            bottom: 93,
            width: 640,
            borderLeft: '1px solid #495159',
            background: '#0c1012',
            overflow: 'hidden',
          }}
        >
          <AlertHistory timeline={timeline} frame={state.contentFrame} />
        </aside>
        {bulletin?.type === 'bulletin' &&
          (() => {
            const chunks = pages(bulletin.text);
            const page =
              Math.floor((frame - bulletin.start) / FPS / bulletin.pageSeconds) % chunks.length;
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
                <div style={{ fontSize: 23, color: '#9ba5ac', marginBottom: 32 }}>
                  {timeline.scenario.agencies[bulletin.source]}
                </div>
                <h2
                  style={{
                    fontSize: 46,
                    fontWeight: 600,
                    color: bulletin.color,
                    margin: '0 0 32px',
                    lineHeight: 1.5,
                  }}
                >
                  {bulletin.heading}
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
          })()}
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
              <div style={{ minWidth: 135 }}>
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
        .filter((e) => e.type === 'screen' && ['blackout', 'flash', 'interference'].includes(e.effect))
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
      {shutdown?.line && <div style={{position:'absolute',top:'50%',left:'50%',height:2,width:`${shutdown.x*100}%`,transform:'translate(-50%,-50%)',background:'#dce5e9',boxShadow:'0 0 10px #a9c9db'}}/>}
      <SignalEffects frame={frame} seed={timeline.scenario.seed} levels={signal}/>
      {frame < openingFrames && (
        <AbsoluteFill
          style={{
            background: '#080b0d',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: frame < openingFrames - 30 ? 1 : (openingFrames - frame) / 30,
          }}
        >
          <div
            style={{
              fontSize: timeline.scenario.title.length > 40 ? 30 : 36,
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
              fontSize: 24,
              color: '#bac3c9',
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
      {notificationSounds(timeline).map(event=><Sequence key={event.id} from={event.start} durationInFrames={event.frames}><Audio src={staticFile(audio[event.asset])} volume={timeline.events.some(e=>e.type==='silence'&&e.start<=frame&&frame<e.end)?0:event.volume}/></Sequence>)}
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
