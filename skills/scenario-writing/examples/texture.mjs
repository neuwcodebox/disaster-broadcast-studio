// Original seeded room texture; CC0-1.0.
export default function ({ Tone, context, duration, sampleRate, random }) {
  const buffer = context.createBuffer(1, Math.round(duration * sampleRate), sampleRate);
  const data = buffer.getChannelData(0);
  let low = 0;
  for (let i = 0; i < data.length; i++) {
    low = low * 0.985 + (random() * 2 - 1) * 0.015;
    data[i] = low * 0.2;
  }
  new Tone.Player(buffer).toDestination().start(0);
}
