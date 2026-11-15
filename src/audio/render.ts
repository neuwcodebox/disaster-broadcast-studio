import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { writeFile, stat, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { packageRoot } from '../assets.js';
import { withOutputFiles } from '../output.js';
import type { AudioConfig } from './browser.js';

export async function synthesize(
  program: string,
  options: AudioConfig & {
    out: string;
    browser?: string;
    assets?: string;
    overwrite?: boolean;
  },
) {
  const source = path.resolve(program),
    out = path.resolve(options.out);
  if (!['.js', '.mjs'].includes(path.extname(source)))
    throw Error('audio: expected a .mjs or .js module');
  if (!(await stat(source)).isFile()) throw Error(`audio module is not a file: ${source}`);
  if (path.extname(out).toLowerCase() !== '.wav') throw Error('--out: expected .wav extension');
  if (!Number.isFinite(options.duration) || options.duration <= 0)
    throw Error('--duration: expected positive seconds');
  if (!Number.isInteger(options.sampleRate) || options.sampleRate <= 0)
    throw Error('--sample-rate: expected positive integer');
  if (![1, 2].includes(options.channels)) throw Error('--channels: expected 1 or 2');
  if (!Number.isSafeInteger(options.seed)) throw Error('--seed: expected safe integer');
  return withOutputFiles(
    out,
    { overwrite: options.overwrite, sidecars: ['.json'] },
    async (pending, temp) => {
      const config = {
        duration: options.duration,
        sampleRate: options.sampleRate,
        channels: options.channels,
        seed: options.seed,
      };
      const entry = path.join(temp, 'entry.js');
      const publicDir = options.assets ? path.resolve(options.assets) : undefined;
      if (publicDir && !(await stat(publicDir)).isDirectory())
        throw Error(`--assets: expected directory ${publicDir}`);
      await writeFile(
        entry,
        `import {registerAudio} from ${JSON.stringify(path.join(packageRoot, 'dist/audio/browser.js'))};\nimport program from ${JSON.stringify(source)};\nregisterAudio(program, ${JSON.stringify(config)});\n`,
      );
      const serveUrl = await bundle({
        entryPoint: entry,
        publicDir,
        ignoreRegisterRootWarning: true,
        rootDir: packageRoot,
        outDir: path.join(temp, 'bundle'),
        enableCaching: true,
      });
      const timeoutInMilliseconds = Math.max(120000, options.duration * 1000);
      const common = {
        serveUrl,
        browserExecutable: options.browser ?? null,
        timeoutInMilliseconds,
      };
      const composition = await selectComposition({ ...common, id: 'Sound' });
      let wav: Uint8Array | undefined, stats: Record<string, unknown> | undefined;
      await renderStill({
        ...common,
        composition,
        frame: 0,
        output: null,
        onArtifact: ({ filename, content }) => {
          if (filename === 'sound.wav' && content instanceof Uint8Array) wav = content;
          if (filename === 'sound.json') stats = JSON.parse(String(content));
        },
      });
      if (!wav || !stats) throw Error('audio: offline renderer did not produce WAV and metadata');
      const require = createRequire(import.meta.url);
      const tone = JSON.parse(await readFile(require.resolve('tone/package.json'), 'utf8'));
      await writeFile(pending, wav);
      const metadata = {
        ...stats,
        program: path.relative(path.dirname(out), source),
        tone: tone.version,
        format: 'PCM16LE',
        output: path.basename(out),
      };
      await writeFile(`${pending}.json`, JSON.stringify(metadata, null, 2) + '\n');
      if (Number(stats.clippedSamples))
        console.error(`Warning: ${stats.clippedSamples} samples clipped; reduce source gain`);
      if (Number(stats.peak) === 0) console.error('Warning: generated WAV is silent');
      return { ...metadata, output: out };
    },
  );
}
