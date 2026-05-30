import path from 'node:path';

import { sanitizeSioSubstringsInRoots } from './lib/public_no_sio_surface.mjs';

const roots = (process.env.PUBLIC_NO_SIO_ROOTS ?? 'out,.next/static')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => path.resolve(process.cwd(), item));

const rows = await sanitizeSioSubstringsInRoots(roots);
console.log(
  JSON.stringify(
    {
      roots,
      filesSanitized: rows.length,
      replacements: rows.reduce((total, row) => total + row.count, 0),
      rows,
    },
    null,
    2,
  ),
);
