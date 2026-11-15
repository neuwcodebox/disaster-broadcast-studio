// Original phone-like vibration, CC0-1.0: motor hum and a light contact rattle.
export default function ({ Tone, context, duration, sampleRate, random }) {
  const buffer = context.createBuffer(1, Math.round(duration * sampleRate), sampleRate);
  const data = buffer.getChannelData(0);
  for (const start of [0, 0.28]) {
    let phase = 0, noise = 0;
    const length = 0.22;
    for (let i = 0; i < Math.round(length * sampleRate); i++) {
      const at = Math.round(start * sampleRate) + i;
      if (at >= data.length) break;
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.022);
      const release = Math.min(1, (length - t) / 0.045);
      const envelope = Math.sin(attack * Math.PI / 2) ** 2 * release ** 2;
      const frequency = 125 + 25 * attack + 3 * Math.sin(2 * Math.PI * 32 * t);
      phase += 2 * Math.PI * frequency / sampleRate;
      noise = noise * 0.75 + (random() * 2 - 1) * 0.25;
      const motor = 0.24 * Math.sin(phase) + 0.1 * Math.sin(2 * phase) +
        0.045 * Math.sin(3 * phase) + 0.025 * Math.sin(6 * phase);
      const flutter = 0.85 + 0.15 * Math.sin(2 * Math.PI * 36 * t);
      data[at] = envelope * flutter * (motor + noise * 0.07);
    }
  }
  new Tone.Player(buffer).toDestination().start(0);
}
