import type { Scenario } from './scenario.js';
export type Credit = {
  id: string;
  title: string;
  creator: string;
  sources: string[];
  licenses: { name: string; url: string }[];
  changes: string;
  notice?: string;
};
export function makeCredits(scenario: Scenario, bundled: Credit[]) {
  const entries = bundled.filter((entry) => !scenario.map.regions || entry.id !== 'kr-boundaries');
  const customMap = scenario.map.regions ? scenario.map.attribution : null;
  const sections = entries.map((entry) =>
    [
      entry.title,
      `제공·가공: ${entry.creator}`,
      ...entry.sources.map((source) => `원자료: ${source}`),
      ...entry.licenses.map((license) => `이용조건: ${license.name} — ${license.url}`),
      `가공: ${entry.changes}`,
      ...(entry.notice ? [entry.notice] : []),
    ].join('\n'),
  );
  if (customMap) sections.unshift(`사용자 지정 지도 경계\n${customMap}`);
  const grids = new Set(scenario.events.filter(e => e.type === 'grid').map(e => e.asset));
  for (const [id, asset] of Object.entries(scenario.assets))
    sections.push(`${grids.has(id) ? '그리드' : '음원'} ${id}\n출처: ${asset.source}\n이용조건: ${asset.license}`);
  if(scenario.events.some(e=>'sound' in e && e.sound==='default'))
    sections.push('기본 알림·경보 효과음\n출처: 재난방송실에서 직접 합성한 창작 음향.\n이용조건: CC0 1.0');
  const text = `자료 출처\n\n${sections.join('\n\n')}\n\n원자료는 각 제공자의 조건에 따라 있는 그대로 제공됩니다. 제공기관은 이 창작물의 내용을 보증하거나 후원하지 않습니다.\n`;
  return { entries, customMap, text };
}
