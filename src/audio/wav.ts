export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Interleaved little-endian PCM16. Out-of-range samples are counted and clipped. */
export function encodeWav(channels: Float32Array[], sampleRate: number) {
  const frames = channels[0]?.length ?? 0;
  if (!channels.length || !frames || channels.some((c) => c.length !== frames))
    throw Error('WAV: expected nonempty channels of equal length');
  const bytes = frames * channels.length * 2;
  if (bytes > 0xffffffff - 36) throw Error('WAV: PCM exceeds RIFF 4 GiB limit; split the sound');
  const wav = new Uint8Array(44 + bytes), view = new DataView(wav.buffer);
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, bytes, true);
  let peak = 0, clippedSamples = 0, sum = 0, offset = 44;
  for (let i = 0; i < frames; i++) for (const channel of channels) {
    const value = channel[i];
    if (!Number.isFinite(value)) throw Error(`WAV: non-finite sample at frame ${i}`);
    peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) > 1) clippedSamples++;
    sum += value * value;
    const sample = Math.max(-1, Math.min(1, value));
    view.setInt16(offset, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
    offset += 2;
  }
  return { wav, peak, clippedSamples, rms: Math.sqrt(sum / (frames * channels.length)), frames };
}
