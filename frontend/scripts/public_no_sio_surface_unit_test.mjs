import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { findSioSubstrings, sanitizeSioSubstringsInFile } from './lib/public_no_sio_surface.mjs';

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pareto-public-no-sio-'));
const textPath = path.join(tmpDir, 'chunk.js');
const binaryPath = path.join(tmpDir, 'module.wasm');

await fs.writeFile(
  textPath,
  'Version SIO sio Sio permissions precision Survivor.io survivor.io SURVIVOR.IO sio-tools SIO-tools xSIO SIOx _SIO_',
);
await fs.writeFile(binaryPath, Buffer.from('binary\0sio\0SIO\0Version\0precision\0survivor.io\0sio-tools'));

assert.deepEqual(await findSioSubstrings([tmpDir]), [
  { file: textPath, count: 11 },
  { file: binaryPath, count: 5 },
]);

await sanitizeSioSubstringsInFile(textPath);
await sanitizeSioSubstringsInFile(binaryPath);

assert.deepEqual(await findSioSubstrings([tmpDir]), []);
assert.equal((await fs.readFile(textPath, 'utf8')).match(/sio/i), null);
const sanitizedBinary = await fs.readFile(binaryPath);
assert.equal(sanitizedBinary.includes(Buffer.from('survivor.io')), false);
assert.equal(sanitizedBinary.includes(Buffer.from('sio-tools')), false);
assert.equal(sanitizedBinary.includes(Buffer.from('SIO')), false);
assert.equal(sanitizedBinary.includes(Buffer.from('sio')), false);

console.log('public_no_sio_surface_unit_test: passed');
