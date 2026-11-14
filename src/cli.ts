#!/usr/bin/env node
import { Command } from 'commander';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadScenario, packageRoot } from './load.js';
import { readBundledJson } from './assets.js';
import { scenarioSchema } from './scenario.js';
import { z } from 'zod';
const program = new Command()
  .name('dbs')
  .description('Text-authored disaster broadcast fiction → 1080p60 video')
  .version('0.1.0');
program
  .command('validate <scenario>')
  .description('Validate YAML/JSON, references, local assets and timeline')
  .action(async (file) => {
    const data = await loadScenario(file);
    console.log(
      JSON.stringify(
        {
          ok: true,
          frames: data.timeline.durationInFrames,
          seconds: data.timeline.durationInFrames / 60,
          cuts: data.timeline.cuts.length,
          warnings: data.warnings,
        },
        null,
        2,
      ),
    );
  });
program
  .command('schema')
  .description('Print the scenario JSON Schema')
  .option('-o, --out <path>')
  .action(async (opts) => {
    const json = JSON.stringify(z.toJSONSchema(scenarioSchema), null, 2) + '\n';
    if (opts.out) await writeFile(opts.out, json);
    else process.stdout.write(json);
  });
program
  .command('regions')
  .description('List bundled region IDs and Korean names')
  .action(async () => {
    const data = await readBundledJson<import('geojson').FeatureCollection>('regions.geojson.gz');
    for (const f of data.features)
      console.log(`${f.properties!.SIG_CD}\t${f.properties!.SIG_KOR_NM}`);
  });
program
  .command('skill')
  .description('Copy the standalone scenario-writing skill and references')
  .requiredOption('-o, --out <directory>')
  .action(async (opts) => {
    await mkdir(path.dirname(path.resolve(opts.out)), { recursive: true });
    await cp(path.join(packageRoot, 'skills/scenario-writing'), path.resolve(opts.out), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    console.log(path.resolve(opts.out));
  });
for (const mode of ['frame', 'render'] as const) {
  const cmd = program
    .command(`${mode} <scenario>`)
    .description(
      mode === 'frame' ? 'Render one PNG frame' : 'Render a full MP4 or inclusive frame range',
    )
    .requiredOption('-o, --out <path>')
    .option('--browser <path>', 'Chromium executable; otherwise Remotion manages Chrome')
    .option('--gl <backend>', 'angle, swiftshader or swangle', 'angle')
    .option('--concurrency <count>', 'Concurrent rendering pages', '2')
    .option('--overwrite', 'Replace existing output');
  if (mode === 'frame') cmd.requiredOption('--frame <number>', 'Zero-based frame');
  else
    cmd
      .option('--from <frame>', 'First included frame', '0')
      .option('--to <frame>', 'Last included frame; default end');
  cmd.action(async (file, opts) => {
    if (!['angle', 'swiftshader', 'swangle'].includes(opts.gl))
      throw Error('--gl: expected angle, swiftshader or swangle');
    const data = await loadScenario(file);
    for (const warning of data.warnings) console.error(`Warning: ${warning}`);
    const { render } = await import('./render.js');
    const result = await render(data, {
      ...opts,
      concurrency: Number(opts.concurrency),
      frame: mode === 'frame' ? Number(opts.frame) : undefined,
      from: opts.from !== undefined ? Number(opts.from) : undefined,
      to: opts.to !== undefined ? Number(opts.to) : undefined,
    });
    console.log(JSON.stringify({ ok: true, output: result }));
  });
}
program.parseAsync().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
});
