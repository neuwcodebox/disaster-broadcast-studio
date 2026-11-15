import { alarm } from './tones.mjs';
export default function ({ Tone }) {
  alarm(Tone, [[0, 0.42], [0.54, 0.42], [1.08, 0.42], [1.7, 2.35]], 0.38);
}
