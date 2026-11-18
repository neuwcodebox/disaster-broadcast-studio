// Original synthesized effects, CC0-1.0. Shared envelopes avoid clicks.
const attack = Array.from({ length: 129 }, (_, i) => (1 - Math.cos(Math.PI * i / 128)) / 2);
const release = attack.map((value) => 1 - value);

export function tone(Tone, frequency, start, length, level, type = 'sine') {
  const gain = new Tone.Gain(0).toDestination();
  // Raised-cosine edges flatten at both ends, reaching zero before stopping.
  gain.gain.setValueCurveAtTime(attack, start, 0.012, level);
  gain.gain.setValueCurveAtTime(release, start + length - 0.06, 0.06, level);
  new Tone.Oscillator(frequency, type).connect(gain).start(start).stop(start + length);
}

export function alarm(Tone, pulses, level) {
  for (const [start, length] of pulses) {
    tone(Tone, 850, start, length, level);
    tone(Tone, 960, start, length, level);
    tone(Tone, 1700, start, length, level * 0.12);
  }
}
