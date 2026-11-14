import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export async function readBundledJson<T>(name: string): Promise<T> {
  const bytes = await readFile(path.join(packageRoot, 'assets', name));
  return JSON.parse((name.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8')) as T;
}
