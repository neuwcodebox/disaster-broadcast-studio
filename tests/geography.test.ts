import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FeatureCollection, Polygon, MultiPolygon, Position } from 'geojson';
import { readBundledJson } from '../src/assets.js';
import { parseRegions } from '../src/load.js';
const insideRing = ([x, y]: Position, ring: Position[]) => {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i],
      [c, d] = ring[j];
    if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) result = !result;
  }
  return result;
};
const contains = (point: Position, geometry: Polygon | MultiPolygon) => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (rings) =>
      insideRing(point, rings[0]) && !rings.slice(1).some((ring) => insideRing(point, ring)),
  );
};
test('bundled administrative regions contain independently located mainland and island landmarks', async () => {
  const regions = parseRegions(await readBundledJson('regions.geojson.gz'));
  // Public civic facilities located through Kakao place search; see geography correction history.
  const places: [string, string, Position][] = [
    ['구미시청', '47190', [128.34424636107, 36.1195708487424]],
    ['부산광역시청', '26470', [129.07506783124393, 35.17973748292069]],
    ['백령면사무소', '28720', [124.71858108863975, 37.97412990499503]],
  ];
  for (const [name, id, point] of places) {
    const region = regions.features.find((f) => f.id === id);
    assert.ok(region, `${name}: region ${id} missing`);
    assert.ok(
      contains(point, region.geometry),
      `${name}: outside expected administrative boundary`,
    );
  }
  const ongjin = regions.features.find((f) => f.id === '28720')!;
  assert.equal(
    contains([125.5, 37.7], ongjin.geometry),
    false,
    'offshore water must not be filled as Ongjin land',
  );
  for (const region of regions.features) {
    assert.ok(
      contains([region.properties!.label_lon, region.properties!.label_lat], region.geometry),
      `${region.id}: label outside boundary`,
    );
  }
});
test('peninsula background retains coastlines of both Koreas and nearby countries', async () => {
  const map =
    await readBundledJson<FeatureCollection<Polygon | MultiPolygon>>('countries.geojson.gz');
  for (const [code, point] of [
    ['PRK', [125.75, 39.03]],
    ['KOR', [129.075, 35.18]],
    ['JPN', [130.42, 33.59]],
  ] as const) {
    const country = map.features.find((f) => f.properties?.code === code);
    assert.ok(country, `country ${code} missing`);
    assert.ok(contains([...point], country.geometry));
  }
  const korea = map.features.find((f) => f.properties?.code === 'KOR')!;
  assert.equal(contains([125.5, 36], korea.geometry), false, 'Yellow Sea must remain water');
});
