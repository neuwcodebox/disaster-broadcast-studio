import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { FeatureCollection } from 'geojson';
import type { Loaded } from '../load.js';
import { readBundledJson } from '../assets.js';
import type { BroadcastProps } from './Broadcast.js';
import { fonts } from './fonts.js';

const require = createRequire(import.meta.url);

// PNG, MP4 and browser playback share the same assets and composition props.
export async function prepareStaticAssets(publicDir: string) {
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
}

export async function prepareBroadcast(
  loaded: Loaded, publicDir: string, audioPrefix = 'audio',
): Promise<BroadcastProps> {
  const audio: Record<string, string> = {};
  for (const [id, file] of Object.entries(loaded.assetPaths)) {
    const name = `${audioPrefix}/${id}${path.extname(file)}`;
    await mkdir(path.join(publicDir, audioPrefix), { recursive: true });
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
  return {
    timeline: loaded.timeline,
    regions: loaded.regions,
    countries,
    provinces,
    audio,
  };
}
