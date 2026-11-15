export default function ({ Tone }) {
  // A clear, sustained attention tone followed by a short resonant tail.
  for (const [frequency, level, length] of [[440, 0.38, 0.92], [220, 0.12, 0.85], [880, 0.06, 0.6]]) {
    const gain = new Tone.Gain(0).toDestination();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(level, 0.018);
    gain.gain.setValueAtTime(level, 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, length - 0.04);
    gain.gain.linearRampToValueAtTime(0, length);
    new Tone.Oscillator(frequency, 'sine').connect(gain).start(0).stop(length);
  }
}
