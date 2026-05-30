import path from 'node:path';

import { findSioSubstrings } from './lib/public_no_sio_surface.mjs';

const roots = (process.env.PUBLIC_NO_SIO_ROOTS ?? 'out,.next/static')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => path.resolve(process.cwd(), item));

const rows = await findSioSubstrings(roots);
const summary = {
  roots,
  filesWithBlockedTerms: rows.length,
  matches: rows.reduce((total, row) => total + row.count, 0),
};

console.log(JSON.stringify({ ...summary, rows }, null, 2));

if (rows.length > 0) {
  process.exitCode = 1;
}
