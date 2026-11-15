import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { FPS, type Timeline } from '../scenario.js';
import { active, envelope } from '../timeline.js';
import { notificationSounds } from '../notifications.js';

export function AudioTrack({
  timeline,
  audio,
  frame,
}: {
  timeline: Timeline;
  audio: Record<string, string>;
  frame: number;
}) {
  const muted = timeline.events.some((event) => event.type === 'silence' && active(event, frame));
  return (
    <>
      {notificationSounds(timeline).map((event) => (
        <Sequence key={event.id} from={event.start} durationInFrames={event.frames}>
          <Audio src={staticFile(audio[event.asset])} volume={muted ? 0 : event.volume} />
        </Sequence>
      ))}
      {timeline.events
        .filter((event) => event.type === 'audio')
        .map((event) => (
          <Sequence key={event.id} from={event.start} durationInFrames={event.end - event.start}>
            <Audio
              src={staticFile(audio[event.asset])}
              trimBefore={Math.round(event.offset * FPS)}
              loop={event.loop}
              playbackRate={event.playbackRate}
              // Use the outer timeline frame so fades and silence continue
              // across loop iterations and stay independent of source speed.
              volume={
                muted
                  ? 0
                  : event.volume *
                    envelope(frame, event.start, event.end, event.fadeIn, event.fadeOut)
              }
            />
          </Sequence>
        ))}
    </>
  );
}
