import { bundle } from '@remotion/bundler';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { packageRoot } from '../assets.js';
import { prepareStaticAssets } from '../video/prepare.js';
import { PreviewProject } from './project.js';
import { previewPage } from './page.js';
import { createPreviewServer } from './http.js';

export async function startPreview(file: string, options: { port?: number } = {}) {
  const port = options.port ?? 3000;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('--port: expected 0..65535');
  const absolute = path.resolve(file);
  const temp = await mkdtemp(path.join(tmpdir(), 'dbs-preview-'));
  const publicDir = path.join(temp, 'public');
  const bundleDir = path.join(temp, 'bundle');
  const project = new PreviewProject(absolute, publicDir);
  const server = createPreviewServer(project, publicDir, bundleDir);
  let timer: ReturnType<typeof setInterval> | undefined;
  let closing: Promise<void> | undefined;
  const close = () => closing ??= (async () => {
    clearInterval(timer);
    if (server.listening) {
      const stopped = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      server.closeAllConnections();
      await stopped;
    }
    await project.refresh(); // Wait for any in-flight preparation before cleanup.
    await rm(temp, { recursive: true, force: true });
  })();
  try {
    await project.refresh();
    project.current(); // Invalid initial input fails before opening a port.
    await prepareStaticAssets(publicDir);
    const entryPoint = path.join(packageRoot, 'dist/preview/browser.js');
    await bundle({
      entryPoint, publicDir, outDir: bundleDir, rootDir: packageRoot,
      ignoreRegisterRootWarning: true,
      webpackOverride: config => ({
        ...config, entry: entryPoint,
      }),
    });
    await writeFile(path.join(bundleDir, 'index.html'), previewPage);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    timer = setInterval(() => { void project.refresh(); }, 750);
    const address = server.address() as { port: number };
    return { url: `http://127.0.0.1:${address.port}`, close };
  } catch (error) { await close(); throw error; }
}
