import { FPS, type Timeline } from './scenario.js';

export const notificationAsset = '__dbs_notification';
export const defaultSounds = {
  '안전안내': { asset: notificationAsset, file: 'notification.wav', duration: 0.55, volume: 0.65 },
  '긴급재난': { asset: '__dbs_alert_urgent', file: 'alert-urgent.wav', duration: 2.4, volume: 0.85 },
  '위급재난': { asset: '__dbs_alert_critical', file: 'alert-critical.wav', duration: 4.2, volume: 0.95 },
  status: { asset: '__dbs_status', file: 'status.wav', duration: 0.3, volume: 0.75 },
  news: { asset: '__dbs_news', file: 'news.wav', duration: 0.28, volume: 0.65 },
  bulletin: { asset: '__dbs_bulletin', file: 'bulletin.wav', duration: 1, volume: 0.9 },
} as const;

export function notificationSounds(timeline: Timeline) {
  const statuses = timeline.events.filter((event) => event.type === 'status');
  return timeline.events.flatMap((event) => {
    if (!('sound' in event) || event.sound === false) return [];
    const sound = event.sound === 'default'
      ? defaultSounds[event.type === 'alert' ? event.level : event.type]
      : event.sound;
    const cue = (start: number, suffix = '') => ({
      id: `sound-${event.id}${suffix}`,
      start,
      frames: Math.min(timeline.durationInFrames - start, Math.max(1, Math.round(sound.duration * FPS))),
      asset: sound.asset,
      volume: sound.volume,
    });
    if (event.type !== 'status') return [cue(event.start)];
    const previous = statuses.find((other) => other.end === event.start);
    const sameItems = JSON.stringify(previous?.items ?? []) === JSON.stringify(event.items);
    const sounds = sameItems ? [] : [cue(event.start)];
    // An adjacent status owns the change; emit only one cue at a replacement/clear.
    if (event.items.length && event.end < timeline.durationInFrames &&
        !statuses.some((other) => other.start === event.end))
      sounds.push(cue(event.end, '/end'));
    return sounds;
  }).sort((a, b) => a.start - b.start);
}
