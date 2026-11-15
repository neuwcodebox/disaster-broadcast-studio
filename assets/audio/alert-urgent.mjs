import { alarm } from './tones.mjs';
export default function ({ Tone }) {
  alarm(Tone, [[0, 0.65], [0.83, 0.65], [1.66, 0.65]], 0.30);
}
