// Original synthetic cue; CC0-1.0. Not an official alert tone.
export default function ({ Tone, duration }) {
  const gain = new Tone.Gain(0).toDestination();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.14, 0.012);
  gain.gain.setValueAtTime(0.14, 0.32);
  gain.gain.linearRampToValueAtTime(0, Math.min(0.5, duration));
  const osc = new Tone.Oscillator(680, 'sine').connect(gain).start(0).stop(duration);
  osc.frequency.setValueAtTime(510, 0.16);
}
