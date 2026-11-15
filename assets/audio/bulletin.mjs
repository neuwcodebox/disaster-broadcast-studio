import { tone } from './tones.mjs';
export default function ({ Tone }) {
  tone(Tone, 440, 0, 0.35, 0.22);
  tone(Tone, 660, 0, 0.35, 0.12);
  tone(Tone, 550, 0.4, 0.5, 0.22);
  tone(Tone, 825, 0.4, 0.5, 0.12);
}
