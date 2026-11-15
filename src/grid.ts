import { z } from 'zod';

// Rows run north to south, columns west to east. Alpha is optional; null is empty.
const cell = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, 'Use #RRGGBB, #RRGGBBAA or null').nullable();
export const gridSchema = z.object({
  bounds: z.tuple([
    z.number().min(-180).max(180), z.number().min(-85).max(85),
    z.number().min(-180).max(180), z.number().min(-85).max(85),
  ]),
  cells: z.array(z.array(cell).min(1).max(256)).min(1).max(256),
}).strict().superRefine((grid, ctx) => {
  const [west, south, east, north] = grid.bounds;
  if (west >= east || south >= north)
    ctx.addIssue({ code: 'custom', path: ['bounds'], message: 'Use [west, south, east, north] with west < east and south < north; date-line crossing is unsupported' });
  grid.cells.forEach((row, i) => {
    if (row.length !== grid.cells[0].length)
      ctx.addIssue({ code: 'custom', path: ['cells', i], message: 'Every row must have the same number of columns' });
  });
});

export type Grid = z.infer<typeof gridSchema>;
