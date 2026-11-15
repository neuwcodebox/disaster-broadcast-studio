import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { packageRoot } from './assets.js';

async function existing(file: string) {
  try {
    return await lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function initializeWorkspace(directory: string) {
  const root = path.resolve(directory);
  const files = ['scenario.yaml', 'README.md'] as const;
  const directories = ['', 'src', 'src/audio', 'src/maps', 'output', 'output/audio', 'output/maps'];
  for (const relative of directories) {
    const destination = path.join(root, relative);
    const info = await existing(destination);
    if (info && (!info.isDirectory() || info.isSymbolicLink()))
      throw Error(`init: expected directory: ${destination}`);
  }
  for (const file of files) {
    const destination = path.join(root, file);
    if (await existing(destination))
      throw Error(`init: already exists: ${destination}; choose another directory or move the conflicting item`);
  }
  // Check every destination before creating anything; exclusive writes also protect concurrent edits.
  const templates = await Promise.all(files.map(async file => {
    const content = await readFile(path.join(packageRoot, 'assets/workspace', file), 'utf8');
    return [file, content] as const;
  }));
  for (const relative of directories) await mkdir(path.join(root, relative), { recursive: true });
  for (const [file, content] of templates) await writeFile(path.join(root, file), content, { flag: 'wx' });
  return {
    directory: root,
    scenario: path.join(root, 'scenario.yaml'),
    skillSource: 'https://github.com/neuwcodebox/disaster-broadcast-studio/tree/main/skills/scenario-writing',
    next: 'npx dbs validate scenario.yaml',
  };
}
