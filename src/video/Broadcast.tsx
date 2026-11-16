import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { FeatureCollection } from 'geojson';
import type { Timeline } from '../scenario.js';
import { FPS } from '../scenario.js';
import type { Regions } from '../load.js';
import { stateAt, clock, envelope, receiptHighlights, shutdownAt } from '../timeline.js';
import { AlertHistory } from './Alerts.js';
import { ChatPanel } from './Chat.js';
import { BroadcastMap } from './Map.js';
import { SignalEffects, signalLevels, signalStyle } from './SignalEffects.js';
import { AudioTrack } from './AudioTrack.js';
import { Bulletin } from './Bulletin.js';
import { useBundledFonts } from './useBundledFonts.js';
import { bodyFont, numberFont } from './fonts.js';
import { News, Status } from './Information.js';
import { Legend } from './Legend.js';
import { changeProgress, transitionAt } from './transitions.js';
import { layout } from './layout.js';
import { TimeJump, timeJumpStrength } from './TimeJump.js';
import type { Grid } from '../grid.js';
export type BroadcastProps = {
  timeline: Timeline;
  regions: Regions;
  countries: FeatureCollection;
  provinces: FeatureCollection;
  audio: Record<string, string>;
  grids: Record<string, Grid>;
};
export function Broadcast(props: BroadcastProps) {
  const { timeline, regions, countries, provinces, audio, grids } = props;
  const openingFrames = 5 * FPS;
  const frame = useCurrentFrame(),
    state = stateAt(timeline, frame);
  useBundledFonts(JSON.stringify(timeline.scenario));
  const bulletins = transitionAt(timeline.events, 'bulletin', state.contentFrame);
  const inset = state.visible.find((e) => e.type === 'inset');
  const legend = state.visible.find((e) => e.type === 'legend');
  const signal = signalLevels(state.visible, state.contentFrame);
  const mapEvents = [...state.visible, ...receiptHighlights(timeline, state.contentFrame)];
  const shutdown = shutdownAt(state.visible, state.contentFrame);
  const jumpStrength = timeJumpStrength(state.timeJump);
  return (
    <AbsoluteFill
      style={{
        background: '#000',
        overflow: 'hidden',
        fontFamily: bodyFont,
        color: '#dce1e5',
      }}
    >
      <AbsoluteFill style={shutdown?.black ? undefined : signalStyle(signal, state.contentFrame, timeline.scenario.seed)}>
      <AbsoluteFill
        style={{
          background: '#080b0d',
          opacity: shutdown?.black ? 0 : state.opacity,
          transform: shutdown ? `scale(${shutdown.x},${shutdown.y})` : undefined,
          transformOrigin: '50% 50%',
        }}
      >
        <header
          style={{
            position: 'absolute',
            inset: '0 0 auto 0',
            height: layout.header,
            display: 'flex',
            alignItems: 'center',
            padding: '0 26px',
            borderBottom: '1px solid #495159',
            background: '#0b0e10',
            gap: 14,
          }}
        >
          <Status timeline={timeline} frame={state.contentFrame} />
          <time
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              fontSize: 32,
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
        <AbsoluteFill
          style={{
            filter: jumpStrength > 0
              ? `url(#dbs-time-jump) saturate(${1 - jumpStrength * 0.35})`
              : undefined,
          }}
        >
          <main
            style={{
              position: 'absolute',
              left: 0,
              top: layout.header + 1,
              right: layout.sidebar,
              bottom: layout.footer + 1,
            }}
          >
            <BroadcastMap
              camera={state.camera}
              countries={countries}
              regions={regions}
              provinces={provinces}
              grids={grids}
              events={mapEvents}
              frame={state.contentFrame}
            />
            {legend?.type === 'legend' && (
              <Legend event={legend} frame={state.contentFrame} />
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
                  opacity: changeProgress(state.contentFrame, inset.start),
                  transform: `translateY(${10 * (1 - changeProgress(state.contentFrame, inset.start))}px)`,
                }}
              >
                <BroadcastMap
                  camera={inset.camera}
                  countries={countries}
                  regions={regions}
                  provinces={provinces}
                  grids={grids}
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
                    fontSize: 28,
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
              top: layout.header + 1,
              right: 0,
              bottom: layout.footer + 1,
              width: layout.sidebar,
              borderLeft: '1px solid #495159',
              background: '#0c1012',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <AlertHistory timeline={timeline} frame={state.contentFrame} />
            </div>
            {state.chat && <ChatPanel timeline={timeline} chat={state.chat} frame={state.contentFrame} />}
          </aside>
          {[bulletins.previous, bulletins.current].map(
            (bulletin, i) =>
              bulletin && (
                <Bulletin
                  key={bulletin.id}
                  event={bulletin}
                  source={timeline.scenario.agencies[bulletin.source]}
                  progress={i === 0 ? 1 - bulletins.progress : bulletins.progress}
                />
              ),
          )}
          <footer
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: layout.footer,
              borderTop: '1px solid #606a72',
              display: 'flex',
              alignItems: 'center',
              background: '#0b0e10',
              padding: '0 26px',
              gap: 24,
            }}
          >
            <News timeline={timeline} frame={state.contentFrame} />
          </footer>
        </AbsoluteFill>
        <TimeJump jump={state.timeJump} />
      </AbsoluteFill>
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
      {!shutdown?.black && <SignalEffects frame={state.contentFrame} seed={timeline.scenario.seed} levels={signal} />}
      </AbsoluteFill>
      {state.visible
        .filter(
          (e) => e.type === 'screen' && ['blackout', 'flash', 'interference'].includes(e.effect),
        )
        .map((event) => {
          if (event.type !== 'screen') return null;
          const opacity =
            envelope(state.contentFrame, event.start, event.end, event.fadeIn, event.fadeOut) * event.intensity;
          const noise = ((state.contentFrame * 1103515245 + timeline.scenario.seed * 12345) >>> 0) % 13;
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
              fontSize: 54,
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
              fontSize: 36,
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
