import { synthesize } from '../dist/audio/render.js';
import { defaultSounds } from '../dist/notifications.js';

// Run after npm run build. The checked-in WAV files are used at playback time.
for (const sound of Object.values(defaultSounds)) {
  const out = `assets/audio/${sound.file}`;
  const result = await synthesize(out.replace(/\.wav$/, '.mjs'), {
    duration: sound.duration, channels: 1, sampleRate: 48000, seed: 731,
    out, overwrite: true,
  });
  console.log(`${out}: ${result.duration}s, peak=${result.peak}, clipped=${result.clippedSamples}`);
}
