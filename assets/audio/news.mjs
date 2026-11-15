import { tone } from './tones.mjs';
export default function ({ Tone }) {
  tone(Tone, 420, 0, 0.16, 0.22);
  tone(Tone, 350, 0.22, 0.4, 0.22);
  tone(Tone, 175, 0.22, 0.4, 0.05);
}
