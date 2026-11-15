import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { initializeWorkspace } from '../src/workspace.js';
import { PreviewProject } from '../src/preview/project.js';
import { createPreviewServer } from '../src/preview/http.js';

test('preview updates valid inputs, keeps the last good frame on errors and recovers missing dependencies', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dbs-preview-project-'));
  try {
    const { scenario: file } = await initializeWorkspace(root);
    const project = new PreviewProject(file, path.join(root, 'public'));
    await project.refresh();
    assert.equal(project.status().revision, 1);
    const first = project.current();
    assert.equal(first.props.timeline.durationInFrames, 1800);
    const sound = Object.values(first.props.audio)[0];
    assert.ok((await readFile(path.join(root, 'public', sound))).length > 44);
    await project.refresh();
    assert.equal(project.status().revision, 1, 'unchanged input does not reset playback');

    const scenario = parse(await readFile(file, 'utf8'));
    scenario.title = '저장한 새 제목';
    await writeFile(file, stringify(scenario));
    await Promise.all([project.refresh(), project.refresh()]);
    assert.equal(project.current().props.timeline.scenario.title, scenario.title);
    assert.equal(project.status().revision, 2);

    await writeFile(file, 'cuts: [');
    await project.refresh();
    assert.ok(project.status().error);
    assert.equal(project.status().revision, 2);
    assert.equal(project.current().props.timeline.scenario.title, scenario.title);

    scenario.assets.extra = { path: 'output/audio/new.wav', source: '직접 제작', license: 'CC0' };
    await writeFile(file, stringify(scenario));
    await project.refresh();
    assert.match(project.status().error!, /missing file/);
    await writeFile(path.join(root, 'output/audio/new.wav'), Buffer.from('first audio'));
    await project.refresh();
    assert.equal(project.status().error, null);
    assert.equal(project.status().revision, 3);
    const previousAudio = project.current().props.audio.extra;
    assert.equal(await readFile(path.join(root, 'public', previousAudio), 'utf8'), 'first audio');
    await writeFile(path.join(root, 'output/audio/new.wav'), Buffer.from('changed audio'));
    await project.refresh();
    assert.equal(project.status().revision, 4);
    assert.notEqual(project.current().props.audio.extra, previousAudio, 'changed audio has a fresh playback URL');
    assert.equal(await readFile(path.join(root, 'public', project.current().props.audio.extra), 'utf8'), 'changed audio');

    const regions = first.props.regions;
    scenario.map.regions = 'map.json';
    scenario.map.attribution = '테스트 지도';
    await writeFile(file, stringify(scenario));
    await writeFile(path.join(root, 'map.json'), '{');
    await project.refresh();
    assert.ok(project.status().error);
    await writeFile(path.join(root, 'map.json'), JSON.stringify(regions));
    await project.refresh();
    assert.equal(project.status().error, null);
    assert.equal(project.status().revision, 5);

    await rm(file);
    await project.refresh();
    assert.match(project.status().error!, /ENOENT/);
    await writeFile(file, stringify(scenario));
    await project.refresh();
    assert.equal(project.status().error, null, 'restoring an identical file clears the missing-file error');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('preview HTTP serves only prepared assets and supports audio seeking', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dbs-preview-http-'));
  const publicDir = path.join(root, 'public'), bundleDir = path.join(root, 'bundle');
  const project = new PreviewProject(path.join(root, 'scenario.yaml'), publicDir);
  const server = createPreviewServer(project, publicDir, bundleDir);
  try {
    await mkdir(publicDir);
    await mkdir(bundleDir);
    await writeFile(path.join(bundleDir, 'index.html'), '<title>미리보기</title>');
    await writeFile(path.join(publicDir, 'test.wav'), '0123456789');
    await writeFile(path.join(root, 'private.txt'), 'private');
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    assert.match(await (await fetch(url)).text(), /미리보기/);
    assert.deepEqual(await (await fetch(`${url}/api/status`)).json(), { revision: 0, warnings: [], error: null });
    const range = await fetch(`${url}/public/test.wav`, { headers: { Range: 'bytes=2-5' } });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(range.headers.get('content-type'), 'audio/wav');
    assert.equal(await range.text(), '2345');
    assert.equal(await (await fetch(`${url}/public/test.wav`, { headers: { Range: 'bytes=-3' } })).text(), '789');
    assert.equal((await fetch(`${url}/public/test.wav`, { headers: { Range: 'bytes=10-' } })).status, 416);
    const head = await fetch(`${url}/public/test.wav`, { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
    for (const file of ['/scenario.yaml', '/private.txt', '/public/..%2fprivate.txt', '/%zz'])
      assert.ok((await fetch(url + file)).status >= 400);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
