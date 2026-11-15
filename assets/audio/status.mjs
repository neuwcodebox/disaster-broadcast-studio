export default function ({ Tone }) {
  // A single upward gesture with a low body, settling with the badge transition.
  for (const [frequency, target, level, type] of [
    [330, 440, 0.3, 'triangle'],
    [165, 220, 0.14, 'sine'],
    [660, 880, 0.04, 'sine'],
  ]) {
    const gain = new Tone.Gain(0).toDestination();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(level, 0.012);
    gain.gain.setValueAtTime(level, 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.39);
    gain.gain.linearRampToValueAtTime(0, 0.43);
    const oscillator = new Tone.Oscillator(frequency, type).connect(gain).start(0).stop(0.43);
    oscillator.frequency.exponentialRampToValueAtTime(target, 0.1);
  }
}
