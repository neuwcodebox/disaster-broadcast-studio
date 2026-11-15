import { tone } from './tones.mjs';
export default function ({ Tone }) {
  tone(Tone, 660, 0, 0.16, 0.24);
  tone(Tone, 880, 0.17, 0.16, 0.24);
  tone(Tone, 1100, 0.34, 0.29, 0.2);
}
