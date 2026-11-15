// Original notification sound, CC0-1.0. Not a reproduction of an official alert.
export default function ({Tone, duration}) {
  const gain = new Tone.Gain(0).toDestination();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.42, 0.025);
  gain.gain.setValueAtTime(0.42, 0.34);
  gain.gain.linearRampToValueAtTime(0, 0.42);
  const osc = new Tone.Oscillator(680, 'sine').connect(gain).start(0).stop(duration);
  osc.frequency.setValueAtTime(510, 0.16);
}
