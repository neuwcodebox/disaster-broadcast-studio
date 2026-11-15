import { useEffect, useState } from 'react';
import { staticFile, useDelayRender, cancelRender } from 'remotion';
import { fonts } from './fonts.js';

export function useBundledFonts(text: string) {
  const { delayRender, continueRender } = useDelayRender();
  const [fontHandle] = useState(() => delayRender('Loading bundled Korean font'));
  useEffect(() => {
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
                  : text + ' 재난문자 수신 이력 발생 발표 이전 정정 안전안내 긴급재난 위급재난',
              ),
            ),
          ),
        ),
      )
      .then(() => document.fonts.ready)
      .then(() => continueRender(fontHandle))
      .catch(cancelRender);
    return () => links.forEach((link) => link.remove());
  }, [text, fontHandle, delayRender, continueRender]);
}
