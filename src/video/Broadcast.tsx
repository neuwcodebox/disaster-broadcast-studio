import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { FeatureCollection } from 'geojson';
import type { Timeline } from '../scenario.js';
import { FPS } from '../scenario.js';
import type { Regions } from '../load.js';
import {
  stateAt,
  clock,
  envelope,
  receiptHighlights,
  statusEntry,
  shutdownAt,
} from '../timeline.js';
import { AlertHistory } from './Alerts.js';
import { BroadcastMap } from './Map.js';
import { SignalEffects, signalLevels } from './SignalEffects.js';
import { AudioTrack } from './AudioTrack.js';
import { Bulletin } from './Bulletin.js';
import { useBundledFonts } from './useBundledFonts.js';
import { bodyFont, numberFont } from './fonts.js';
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
  useBundledFonts(JSON.stringify(timeline.scenario));
  const status = state.visible.find((e) => e.type === 'status');
  const bulletin = state.visible.find((e) => e.type === 'bulletin');
  const inset = state.visible.find((e) => e.type === 'inset');
  const legend = state.visible.find((e) => e.type === 'legend');
  const signal = signalLevels(state.visible, frame);
  const mapEvents = [...state.visible, ...receiptHighlights(timeline, state.contentFrame)];
  const entry = statusEntry(state.contentFrame, status?.start ?? 0);
  const shutdown = shutdownAt(state.visible, frame);
  return (
    <AbsoluteFill
      style={{
        filter: signal.chromatic > 0 ? 'url(#dbs-chromatic)' : undefined,
        background: shutdown ? '#000' : '#080b0d',
        fontFamily: bodyFont,
        color: '#dce1e5',
      }}
    >
      <AbsoluteFill
        style={{
          opacity: shutdown?.black ? 0 : state.opacity,
          transform: shutdown ? `scale(${shutdown.x},${shutdown.y})` : undefined,
          transformOrigin: '50% 50%',
        }}
      >
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
                  opacity: entry.opacity,
                  transform: `translateY(${entry.offset}px)`,
                  background: `${item.color}${Math.round(entry.glow * 255)
                    .toString(16)
                    .padStart(2, '0')}`,
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
        <main
          style={{
            position: 'absolute',
            left: 0,
            top: 49,
            right: 640,
            bottom: 93,
          }}
        >
          <BroadcastMap
            camera={state.camera}
            countries={countries}
            regions={regions}
            provinces={provinces}
            events={mapEvents}
            frame={state.contentFrame}
          />
          {legend?.type === 'legend' && (
            <div
              style={{
                position: 'absolute',
                left: 24,
                bottom: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: '#0b0e10ed',
                padding: '14px 18px',
                fontSize: 21,
                color: '#d0d5da',
              }}
            >
              {legend.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 23,
                      height: item.symbol === 'line' ? 0 : 16,
                      background: item.symbol === 'fill' ? item.color : 'transparent',
                      border: item.symbol === 'fill' ? 'none' : `2px solid ${item.color}`,
                    }}
                  />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          )}
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
        {bulletin && (
          <Bulletin
            event={bulletin}
            source={timeline.scenario.agencies[bulletin.source]}
            frame={state.contentFrame}
          />
        )}
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
        .filter(
          (e) => e.type === 'screen' && ['blackout', 'flash', 'interference'].includes(e.effect),
        )
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
      {shutdown?.line && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            height: 2,
            width: `${shutdown.x * 100}%`,
            transform: 'translate(-50%,-50%)',
            background: '#dce5e9',
            boxShadow: '0 0 10px #a9c9db',
          }}
        />
      )}
      <SignalEffects frame={frame} seed={timeline.scenario.seed} levels={signal} />
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
      <AudioTrack timeline={timeline} audio={audio} frame={frame} />
    </AbsoluteFill>
  );
}
