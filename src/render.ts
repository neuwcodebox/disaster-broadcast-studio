import { bundle } from '@remotion/bundler';
import { renderStill, renderMedia, selectComposition } from '@remotion/renderer';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Loaded } from './load.js';
import { withOutputFiles } from './output.js';
import type { BroadcastProps } from './video/Broadcast.js';
import { fonts } from './video/fonts.js';
import { readBundledJson, packageRoot } from './assets.js';
import { makeCredits, type Credit } from './credits.js';
import type { FeatureCollection } from 'geojson';
export type RenderOptions = {
  out: string;
  frame?: number;
  from?: number;
  to?: number;
  browser?: string;
  gl?: 'angle' | 'swiftshader' | 'swangle';
  concurrency: number;
  overwrite?: boolean;
};
const require = createRequire(import.meta.url);
export async function render(loaded: Loaded, options: RenderOptions) {
  const out = path.resolve(options.out),
    last = loaded.timeline.durationInFrames - 1;
  const still = options.frame !== undefined,
    from = options.from ?? 0,
    to = options.to ?? last;
  if (path.extname(out).toLowerCase() !== (still ? '.png' : '.mp4'))
    throw Error(`--out: expected ${still ? '.png' : '.mp4'} extension`);
  if (still && (!Number.isInteger(options.frame) || options.frame! < 0 || options.frame! > last))
    throw Error(`--frame: expected 0..${last}`);
  if (
    !still &&
    (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > last || to < from)
  )
    throw Error(`range: expected inclusive frames 0..${last}`);
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1)
    throw Error('--concurrency: expected positive integer');
  await withOutputFiles(
    out,
    { overwrite: options.overwrite, sidecars: ['.json', '.credits.txt'] },
    async (pending, temp) => {
      const publicDir = path.join(temp, 'public');
      await mkdir(path.join(publicDir, 'fonts', 'files'), { recursive: true });
      for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'])
        await copyFile(require.resolve(`maplibre-gl/dist/${name}`), path.join(publicDir, name));
      for (const font of fonts) {
        const fontRoot = path.dirname(require.resolve(`${font.package}/package.json`));
        for (const weight of font.weights) {
          const css = await readFile(path.join(fontRoot, `${weight}.css`), 'utf8');
          await writeFile(path.join(publicDir, 'fonts', `${font.id}-${weight}.css`), css);
          for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
            const relative = match[1].replace(/['"]/g, '');
            await copyFile(path.join(fontRoot, relative), path.join(publicDir, 'fonts', relative));
          }
        }
      }
      const audio: Record<string, string> = {};
      for (const [id, file] of Object.entries(loaded.assetPaths)) {
        const name = `audio/${id}${path.extname(file)}`;
        await mkdir(path.join(publicDir, 'audio'), { recursive: true });
        await copyFile(file, path.join(publicDir, name));
        audio[id] = name;
      }
      const countries = await readBundledJson<FeatureCollection>('countries.geojson.gz');
      const defaultRegions = !loaded.timeline.scenario.map.regions;
      // The full SGIS polygons supply the Korean coastline and administrative fills.
      if (defaultRegions)
        countries.features = countries.features.filter((f) => f.properties?.code !== 'KOR');
      const provinces = defaultRegions
        ? await readBundledJson<FeatureCollection>('provinces.geojson.gz')
        : { type: 'FeatureCollection' as const, features: [] };
      const inputProps: BroadcastProps = {
        timeline: loaded.timeline,
        regions: loaded.regions,
        countries,
        provinces,
        audio,
      };
      const serveUrl = await bundle({
        entryPoint: path.join(packageRoot, 'dist/video/index.js'),
        publicDir,
        outDir: path.join(temp, 'bundle'),
        enableCaching: true,
        rootDir: packageRoot,
      });
      const browserExecutable = options.browser ?? null,
        chromiumOptions = { gl: options.gl ?? ('angle' as const) };
      const composition = await selectComposition({
        serveUrl,
        id: 'Broadcast',
        inputProps,
        browserExecutable,
        chromiumOptions,
        timeoutInMilliseconds: 120_000,
      });
      const common = {
        composition,
        serveUrl,
        inputProps,
        browserExecutable,
        chromiumOptions,
        timeoutInMilliseconds: 120_000,
        output: pending,
      };
      let lastProgress = -1,
        lastReport = 0;
      if (still)
        await renderStill({
          ...common,
          frame: options.frame!,
          imageFormat: 'png',
        });
      else
        await renderMedia({
          composition,
          serveUrl,
          inputProps,
          browserExecutable,
          chromiumOptions,
          timeoutInMilliseconds: 120_000,
          outputLocation: pending,
          codec: 'h264',
          audioCodec: 'aac',
          enforceAudioTrack: true,
          pixelFormat: 'yuv420p',
          frameRange: [from, to],
          concurrency: options.concurrency,
          crf: 18,
          onProgress: (p) => {
            const step = Math.floor(p.progress * 10);
            if (step !== lastProgress || Date.now() - lastReport > 15000) {
              lastProgress = step;
              lastReport = Date.now();
              console.error(
                `Rendering ${Math.floor(p.progress * 100)}% · ${p.renderedFrames}/${to - from + 1} frames`,
              );
            }
          },
        });
      const credits = makeCredits(
        loaded.timeline.scenario,
        await readBundledJson<Credit[]>('attribution.json'),
      );
      await writeFile(`${pending}.credits.txt`, credits.text);
      await writeFile(
        `${pending}.json`,
        JSON.stringify(
          {
            title: loaded.timeline.scenario.title,
            version: loaded.timeline.scenario.version,
            fps: 60,
            width: 1920,
            height: 1080,
            frames: still ? [options.frame] : [from, to],
            assets: loaded.timeline.scenario.assets,
            credits: credits.entries,
            customMapAttribution: credits.customMap,
            creditsFile: `${path.basename(out)}.credits.txt`,
          },
          null,
          2,
        ) + '\n',
      );
    },
  );
  return out;
}
