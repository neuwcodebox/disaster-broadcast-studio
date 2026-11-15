import { useEffect, useState } from 'react';
import { staticFile, useBufferState, useDelayRender } from 'remotion';
import { fonts } from './fonts.js';

export function useBundledFonts(text: string) {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const buffer = useBufferState();
  const [fontHandle] = useState(() => delayRender('Loading bundled Korean font'));
  useEffect(() => {
    const playback = buffer.delayPlayback();
    let cancelled = false;
    const links = fonts.flatMap((font) =>
      font.weights.map((weight) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = staticFile(`fonts/${font.id}-${weight}.css`);
        document.head.append(link);
        return link;
      }),
    );
    Promise.all(
      links.map(
        (link) =>
          new Promise<void>((resolve, reject) => {
            link.onload = () => resolve();
            link.onerror = () => reject(Error('Bundled font CSS unavailable'));
          }),
      ),
    )
      .then(() =>
        Promise.all(
          fonts.flatMap((font) =>
            font.weights.map((weight) =>
              document.fonts.load(
                `${weight} 28px "${font.family}"`,
                font.id === 'mono'
                  ? '0123456789:.- /+'
                  : text + ' 재난문자 수신 이력 발생 발표 안전안내 긴급재난 위급재난',
              ),
            ),
          ),
        ),
      )
      .then(() => document.fonts.ready)
      .then(() => { if (!cancelled) { continueRender(fontHandle); playback.unblock(); } })
      .catch(error => { if (!cancelled) { playback.unblock(); cancelRender(error); } });
    return () => { cancelled = true; playback.unblock(); continueRender(fontHandle); links.forEach((link) => link.remove()); };
  }, [text, fontHandle, buffer, delayRender, continueRender, cancelRender]);
}
