import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
const [admin, countries, northKorea] = process.argv.slice(2);
if (!admin || !countries || !northKorea)
  throw Error(
    'Usage: node scripts/build-map-assets.mjs <admdongkor-20260701.geojson> <natural-earth-10m-5.1.2.geojson> <geoboundaries-PRK-ADM0.geojson>',
  );
const require = createRequire(import.meta.url);
const mapshaper = path.join(
  path.dirname(require.resolve('mapshaper/package.json')),
  'bin/mapshaper',
);
const temp = await mkdtemp(path.join(os.tmpdir(), 'dbs-maps-'));
await mkdir('assets', { recursive: true });
const run = (...args) => execFileSync(process.execPath, [mapshaper, ...args], { stdio: 'inherit' });
const pack = async (name, data) =>
  writeFile(`assets/${name}.geojson.gz`, gzipSync(JSON.stringify(data), { level: 9 }));
try {
  const regions = path.join(temp, 'regions.geojson');
  run(
    admin,
    '-dissolve',
    'sgg',
    'copy-fields=sido,sggnm',
    '-rename-fields',
    'SIG_CD=sgg,SIG_KOR_NM=sggnm',
    '-each',
    'label_lon=this.innerX,label_lat=this.innerY',
    '-filter-fields',
    'SIG_CD,SIG_KOR_NM,sido,label_lon,label_lat',
    '-o',
    regions,
    'format=geojson',
  );
  const municipalities = JSON.parse(await readFile(regions, 'utf8'));
  await pack('regions', municipalities);
  const provinces = path.join(temp, 'provinces.geojson');
  run(regions, '-dissolve', 'sido', '-o', provinces, 'format=geojson');
  await pack('provinces', JSON.parse(await readFile(provinces, 'utf8')));
  const background = JSON.parse(await readFile(countries, 'utf8'));
  // Keep every source coordinate; discard unused descriptive columns only.
  const neighbors = new Set(['CHN', 'PRK', 'KOR', 'JPN', 'RUS', 'TWN', 'MNG']);
  background.features = background.features
    .filter((f) => neighbors.has(f.properties.ADM0_A3))
    .map((f) => ({ ...f, properties: { name: f.properties.ADMIN, code: f.properties.ADM0_A3 } }));
  const north = JSON.parse(await readFile(northKorea, 'utf8'));
  background.features = background.features.filter((f) => f.properties.code !== 'PRK');
  for (const feature of north.features)
    background.features.push({ ...feature, properties: { name: 'North Korea', code: 'PRK' } });
  await pack('countries', background);
  console.log(
    `Saved ${municipalities.features.length} municipalities; original boundary detail retained.`,
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
