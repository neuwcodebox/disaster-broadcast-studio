import { createHash } from 'node:crypto';
import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { loadScenario } from '../load.js';
import { prepareBroadcast } from '../video/prepare.js';
import type { BroadcastProps } from '../video/Broadcast.js';

export type PreviewStatus = { revision: number; warnings: string[]; error: string | null };
export type PreviewSnapshot = PreviewStatus & { props: BroadcastProps };

// Read the current document's paths even when validation fails, so creating a
// missing asset or repairing a custom map also recovers the preview.
async function fingerprint(file: string) {
  const source = await readFile(file, 'utf8');
  const files = new Set<string>();
  try {
    const document = parseDocument(source).toJS();
    if (typeof document?.map?.regions === 'string') files.add(document.map.regions);
    for (const asset of Object.values(document?.assets ?? {}) as { path?: unknown }[])
      if (typeof asset?.path === 'string') files.add(asset.path);
  } catch { /* Validation reports malformed documents. */ }
  const stamps = await Promise.all([...files].sort().map(async (relative) => {
    try {
      const info = await stat(path.resolve(path.dirname(file), relative), { bigint: true });
      return `${relative}:${info.mtimeNs}:${info.ctimeNs}:${info.size}:${info.ino}`;
    } catch { return `${relative}:missing`; }
  }));
  return createHash('sha256').update(source).update(JSON.stringify(stamps)).digest('hex');
}

export class PreviewProject {
  private signature = '';
  private pending: Promise<void> | undefined;
  private snapshot: PreviewSnapshot | undefined;
  private error: string | null = null;

  constructor(private file: string, private publicDir: string) {}

  status(): PreviewStatus {
    return { revision: this.snapshot?.revision ?? 0, warnings: this.snapshot?.warnings ?? [], error: this.error };
  }

  current(): PreviewSnapshot {
    if (!this.snapshot) throw Error(this.error ?? 'Preview is not ready');
    return { ...this.snapshot, error: this.error };
  }

  refresh(): Promise<void> {
    if (this.pending) return this.pending;
    this.pending = this.update().finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private async update() {
    let revision = 0;
    let fingerprinted = false;
    try {
      const signature = await fingerprint(this.file);
      fingerprinted = true;
      if (signature === this.signature) return;
      this.signature = signature;
      const loaded = await loadScenario(this.file);
      revision = (this.snapshot?.revision ?? 0) + 1;
      const props = await prepareBroadcast(loaded, this.publicDir, `audio/${revision}`);
      this.snapshot = { props, revision, warnings: loaded.warnings, error: null };
      this.error = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      // Retry preparation failures even if the input has not changed.
      if (revision || !fingerprinted) this.signature = '';
    }
    if (revision && this.error)
      await rm(path.join(this.publicDir, 'audio', String(revision)), { recursive: true, force: true });
  }
}
