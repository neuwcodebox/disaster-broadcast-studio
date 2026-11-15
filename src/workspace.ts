import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { packageRoot } from './assets.js';

async function existing(file: string) {
  try { return await lstat(file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function initializeWorkspace(directory: string) {
  const root = path.resolve(directory);
  const owned = ['scenario.yaml', 'README.md'];
  const directories = ['', 'src', 'src/audio', 'src/maps', 'output', 'output/audio', 'output/maps'];
  for (const relative of directories) {
    const info = await existing(path.join(root, relative));
    if (info && (!info.isDirectory() || info.isSymbolicLink()))
      throw Error(`init: expected directory: ${path.join(root, relative)}`);
  }
  for (const relative of owned) if (await existing(path.join(root, relative)))
    throw Error(`init: already exists: ${path.join(root, relative)}; choose another directory or move the conflicting item`);
  // Check every destination before creating anything; exclusive writes also protect concurrent edits.
  const templates = await Promise.all(['scenario.yaml', 'README.md'].map(async (file) => [file, await readFile(path.join(packageRoot, 'assets/workspace', file), 'utf8')] as const));
  for (const relative of directories) await mkdir(path.join(root, relative), { recursive: true });
  for (const [file, content] of templates) await writeFile(path.join(root, file), content, { flag: 'wx' });
  return { directory: root, scenario: path.join(root, 'scenario.yaml'), skillSource: 'https://github.com/neuwcodebox/disaster-broadcast-studio/tree/main/skills/scenario-writing', next: 'npx dbs validate scenario.yaml' };
}
