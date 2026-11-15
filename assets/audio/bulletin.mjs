export default function ({ Tone }) {
  // One low resonant strike; the upper partial fades before the body.
  for (const [frequency, level, length] of [[240, 0.28, 0.88], [120, 0.1, 0.78], [480, 0.045, 0.35]]) {
    const gain = new Tone.Gain(0).toDestination();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(level, 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, length - 0.04);
    gain.gain.linearRampToValueAtTime(0, length);
    new Tone.Oscillator(frequency, 'sine').connect(gain).start(0).stop(length);
  }
}
