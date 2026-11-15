import { tone } from './tones.mjs';
export default function ({ Tone }) {
  // Two firm attention calls, with a longer second call to hold attention.
  for (const [start, length] of [[0, 0.3], [0.44, 0.46]]) {
    tone(Tone, 540, start, length, 0.4);
    tone(Tone, 270, start, length, 0.12);
    tone(Tone, 1080, start, length, 0.06);
  }
}
