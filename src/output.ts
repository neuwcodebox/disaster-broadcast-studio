import { link, lstat, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import path from 'node:path';

type OutputOptions = { overwrite?: boolean; sidecars: string[] };

/** Stage all files beside the destination; publish the main result after its sidecars. */
export async function withOutputFiles<T>(
  destination: string,
  { overwrite = false, sidecars }: OutputOptions,
  produce: (pending: string, directory: string) => Promise<T>,
): Promise<T> {
  const out = path.resolve(destination);
  const suffixes = [...sidecars, ''];
  if (!overwrite) {
    for (const suffix of suffixes) {
      try {
        await lstat(`${out}${suffix}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      throw Error(`output exists: ${out}${suffix}; use --overwrite`);
    }
  }
  await mkdir(path.dirname(out), { recursive: true });
  const directory = await mkdtemp(path.join(path.dirname(out), '.dbs-'));
  const pending = path.join(directory, path.basename(out));
  const published: string[] = [];
  try {
    const result = await produce(pending, directory);
    // Catch missing artifacts before publishing any of them.
    for (const suffix of suffixes) {
      if (!(await lstat(`${pending}${suffix}`)).isFile())
        throw Error(`output is not a file: ${pending}${suffix}`);
    }
    for (const suffix of suffixes) {
      const target = `${out}${suffix}`;
      if (overwrite) await rename(`${pending}${suffix}`, target);
      else {
        // Exclusive publication also protects files created while rendering.
        await link(`${pending}${suffix}`, target);
        published.push(target);
      }
    }
    return result;
  } catch (error) {
    for (const file of published) await rm(file, { force: true });
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
