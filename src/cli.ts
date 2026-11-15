#!/usr/bin/env node
import { Command } from 'commander';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadScenario } from './load.js';
import { readBundledJson, packageRoot } from './assets.js';
import { FPS, scenarioSchema } from './scenario.js';
import { stateAt, clock } from './timeline.js';
import { makeCredits, type Credit } from './credits.js';
import { z } from 'zod';
const program = new Command()
  .name('dbs')
  .description('Text-authored disaster broadcast fiction → 1080p60 video')
  .version('0.4.0');
program
  .command('init [directory]')
  .description('Create a scenario workspace with YAML, audio and output folders; never overwrite files')
  .action(async (directory = '.') => {
    const { initializeWorkspace } = await import('./workspace.js');
    console.log(JSON.stringify({ ok: true, ...(await initializeWorkspace(directory)) }));
  });
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
          seconds: data.timeline.durationInFrames / FPS,
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
  .option('--search <text>', 'Filter Korean names or IDs')
  .option('--json', 'Output structured regions')
  .action(async (opts) => {
    const data = await readBundledJson<import('geojson').FeatureCollection>('regions.geojson.gz');
    const entries = data.features
      .map((f) => ({
        id: String(f.properties!.SIG_CD),
        name: String(f.properties!.SIG_KOR_NM),
      }))
      .filter((f) => !opts.search || `${f.id} ${f.name}`.includes(opts.search));
    if (opts.json) console.log(JSON.stringify(entries, null, 2));
    else for (const f of entries) console.log(`${f.id}\t${f.name}`);
  });
program
  .command('inspect <scenario>')
  .description('Inspect a frame without rendering')
  .requiredOption('--frame <number>', 'Zero-based frame')
  .action(async (file, opts) => {
    const { timeline, warnings } = await loadScenario(file);
    const state = stateAt(timeline, Number(opts.frame));
    console.log(
      JSON.stringify(
        {
          frame: state.frame,
          cut: state.cut.id,
          storyTime: new Date(state.epoch).toISOString(),
          clock: clock(state.displayEpoch, timeline.scenario.timezone, true),
          clockTransition: state.jumping,
          camera: state.camera,
          visible: state.visible,
          alerts: state.alerts,
          chat: state.chat,
          warnings,
        },
        null,
        2,
      ),
    );
  });
program
  .command('preview <scenario>')
  .description('Preview in a local browser with playback, seeking and automatic file updates')
  .option('--port <number>', 'Local HTTP port; 0 selects an available port', '3000')
  .action(async (file, opts) => {
    const { startPreview } = await import('./preview/server.js');
    console.error('Preparing browser preview…');
    const preview = await startPreview(file, { port: Number(opts.port) });
    console.log(`Preview: ${preview.url}\nOpen this URL in your browser. Press Ctrl+C to stop.`);
    const stop = () => {
      void preview.close().then(() => {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
      }).catch(error => { console.error(error); process.exitCode = 1; });
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
program
  .command('credits <scenario>')
  .description('Prepare source credits for the video description')
  .option('-o, --out <path>')
  .action(async (file, opts) => {
    const { timeline } = await loadScenario(file);
    const { text } = makeCredits(
      timeline.scenario,
      await readBundledJson<Credit[]>('attribution.json'),
    );
    if (opts.out) await writeFile(opts.out, text);
    else process.stdout.write(text);
  });
program
  .command('skill')
  .description('Export bundled scenario-writing skill and references for offline/manual use')
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
program
  .command('audio <program>')
  .description('Run a local Tone.js module offline and write PCM16 WAV')
  .option('--assets <directory>', 'Local samples available through asset(relativePath)')
  .requiredOption('-o, --out <path>')
  .requiredOption('--duration <seconds>', 'Output length, including effect tails')
  .option('--sample-rate <hz>', 'PCM sample rate', '48000')
  .option('--channels <count>', '1 or 2', '2')
  .option('--seed <integer>', 'Seed for procedural sound', '1')
  .option('--browser <path>', 'Chromium executable; otherwise Remotion manages Chrome')
  .option('--overwrite', 'Replace existing output')
  .action(async (file, opts) => {
    const { synthesize } = await import('./audio/render.js');
    console.log(
      JSON.stringify({
        ok: true,
        ...(await synthesize(file, {
          ...opts,
          duration: Number(opts.duration),
          sampleRate: Number(opts.sampleRate),
          channels: Number(opts.channels),
          seed: Number(opts.seed),
        })),
      }),
    );
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
    console.log(
      JSON.stringify({
        ok: true,
        output: result,
        credits: `${result}.credits.txt`,
      }),
    );
  });
}
program.parseAsync().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
});
