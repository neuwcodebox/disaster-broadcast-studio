// Technical sample: a synthetic color field, not measured weather or a forecast.
// Copy into the work's own folder and edit bounds, shape and palette as needed.
// node grid.mjs grid-early.json 0
// node grid.mjs grid-later.json 1
import { writeFile } from 'node:fs/promises';

const output = process.argv[2];
const phase = Number(process.argv[3] ?? 0);
if (!output || !Number.isFinite(phase)) throw Error('Usage: node grid.mjs <output.json> [phase]');
const bounds = [125.8, 36.7, 128.2, 38.5]; // west, south, east, north
const columns = 96, rows = 72;
const palette = ['#4564b9', '#31a6cd', '#45b96e', '#d5cb4d', '#df9852', '#c55364'];
const cells = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
  const x = column / (columns - 1), y = row / (rows - 1);
  const center = 0.35 + 0.17 * Math.sin(x * 5) + 0.08 * phase;
  const band = Math.exp(-(((y - center) / 0.21) ** 2));
  const texture = 0.08 * Math.sin(x * 31 + y * 17) * Math.cos(y * 27 - x * 11);
  const intensity = band * (0.62 + 0.23 * phase) + texture;
  return intensity < 0.12 ? null : palette[Math.min(palette.length - 1, Math.floor(intensity * palette.length))];
}));
// Exclusive write protects existing work. Generate a new file when revising.
await writeFile(output, JSON.stringify({ bounds, cells }) + '\n', { flag: 'wx' });
console.log(output);
