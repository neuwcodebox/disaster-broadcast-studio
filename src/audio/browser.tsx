import React, { useEffect, useState } from 'react';
import { Artifact, Composition, registerRoot, useDelayRender, cancelRender, staticFile } from 'remotion';
import { encodeWav, seededRandom } from './wav.js';
export type AudioConfig = { duration: number; sampleRate: number; channels: number; seed: number };
export type AudioProgram = (options: AudioConfig & {
  Tone: typeof import('tone');
  context: import('tone').OfflineContext;
  random: () => number;
  asset: (relativePath: string) => string;
}) => void | Promise<void>;

export function registerAudio(program: AudioProgram, config: AudioConfig) {
  function OfflineSound() {
    const { delayRender, continueRender } = useDelayRender();
    const [handle] = useState(() => delayRender('Synthesizing offline Tone.js audio'));
    const [result, setResult] = useState<ReturnType<typeof encodeWav> | null>(null);
    useEffect(() => {
      (async () => {
        Math.random = seededRandom(config.seed);
        const Tone = await import('tone');
        if (typeof program !== 'function') throw Error('Audio module must default-export a function');
        const buffer = await Tone.Offline(
          (context) => program({ ...config, Tone, context, random: seededRandom(config.seed), asset: staticFile }),
          config.duration, config.channels, config.sampleRate,
        );
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
        setResult(encodeWav(channels, config.sampleRate));
        buffer.dispose();
      })().catch(cancelRender);
    }, []);
    useEffect(() => { if (result) continueRender(handle); }, [result]);
    if (!result) return null;
    const { wav, ...stats } = result;
    return <><Artifact filename="sound.wav" content={wav} /><Artifact filename="sound.json" content={JSON.stringify({ ...config, ...stats, browser: navigator.userAgent })} /></>;
  }
  registerRoot(() => <Composition id="Sound" component={OfflineSound} width={16} height={16} fps={60} durationInFrames={1} />);
}
