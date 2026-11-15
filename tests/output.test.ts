import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { withOutputFiles } from '../src/output.js';

async function workspace(run: (root: string, out: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dbs-output-test-'));
  try {
    await run(root, path.join(root, 'film.mp4'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const options = { sidecars: ['.json', '.credits.txt'] };
async function produce(pending: string) {
  await writeFile(pending, 'media');
  await writeFile(`${pending}.json`, '{}');
  await writeFile(`${pending}.credits.txt`, 'credits');
  return 'done';
}

test('successful output includes metadata and credits and removes temporary files', async () => {
  await workspace(async (root, out) => {
    assert.equal(await withOutputFiles(out, options, produce), 'done');
    assert.deepEqual((await readdir(root)).sort(), [
      'film.mp4',
      'film.mp4.credits.txt',
      'film.mp4.json',
    ]);
    assert.equal(await readFile(out, 'utf8'), 'media');
    assert.equal(await readFile(`${out}.json`, 'utf8'), '{}');
    assert.equal(await readFile(`${out}.credits.txt`, 'utf8'), 'credits');
  });
});

test('existing media or sidecars block output before production starts', async () => {
  for (const suffix of ['', '.json', '.credits.txt']) {
    await workspace(async (root, out) => {
      await writeFile(`${out}${suffix}`, 'user content');
      await assert.rejects(
        withOutputFiles(out, options, async () => {
          assert.fail('production must not start');
        }),
        /output exists/,
      );
      assert.equal(await readFile(`${out}${suffix}`, 'utf8'), 'user content');
      assert.deepEqual(await readdir(root), [`film.mp4${suffix}`]);
    });
  }
});

test('failed production preserves existing outputs and removes partial artifacts', async () => {
  await workspace(async (root, out) => {
    await writeFile(out, 'old media');
    await writeFile(`${out}.json`, 'old metadata');
    await assert.rejects(
      withOutputFiles(out, { ...options, overwrite: true }, async (pending) => {
        await writeFile(pending, 'partial media');
        await writeFile(`${pending}.json`, 'partial metadata');
        throw Error('render failed');
      }),
      /render failed/,
    );
    assert.equal(await readFile(out, 'utf8'), 'old media');
    assert.equal(await readFile(`${out}.json`, 'utf8'), 'old metadata');
    assert.deepEqual((await readdir(root)).sort(), ['film.mp4', 'film.mp4.json']);
  });
});

test('missing sidecars prevent publication of otherwise successful media', async () => {
  await workspace(async (root, out) => {
    await assert.rejects(
      withOutputFiles(out, options, async (pending) => {
        await writeFile(pending, 'media');
      }),
      /ENOENT/,
    );
    assert.deepEqual(await readdir(root), []);
  });
});

test('a destination created during rendering is preserved and published sidecars are removed', async () => {
  await workspace(async (root, out) => {
    await assert.rejects(
      withOutputFiles(out, options, async (pending) => {
        await produce(pending);
        await writeFile(out, 'concurrent output');
      }),
      /EEXIST/,
    );
    assert.equal(await readFile(out, 'utf8'), 'concurrent output');
    assert.deepEqual(await readdir(root), ['film.mp4']);
  });
});

test('overwrite replaces all outputs after successful production', async () => {
  await workspace(async (root, out) => {
    for (const suffix of ['', ...options.sidecars]) await writeFile(`${out}${suffix}`, 'old');
    await withOutputFiles(out, { ...options, overwrite: true }, produce);
    assert.equal(await readFile(out, 'utf8'), 'media');
    assert.equal(await readFile(`${out}.json`, 'utf8'), '{}');
    assert.equal(await readFile(`${out}.credits.txt`, 'utf8'), 'credits');
    assert.equal((await readdir(root)).length, 3);
  });
});
