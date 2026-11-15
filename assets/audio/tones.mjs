// Original synthesized effects, CC0-1.0. Shared envelopes avoid clicks.
export function tone(Tone, frequency, start, length, level, type = 'sine') {
  const gain = new Tone.Gain(0).toDestination();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(level, start + 0.012);
  gain.gain.setValueAtTime(level, start + length - 0.045);
  gain.gain.linearRampToValueAtTime(0, start + length);
  new Tone.Oscillator(frequency, type).connect(gain).start(start).stop(start + length);
}

export function alarm(Tone, pulses, level) {
  for (const [start, length] of pulses) {
    tone(Tone, 850, start, length, level);
    tone(Tone, 960, start, length, level);
    tone(Tone, 1700, start, length, level * 0.12);
  }
}
