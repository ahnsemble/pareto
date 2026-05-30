import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  defaultControlledWorkerSourceDir,
  findWorkerSourceDir,
  workerSourceDiagnostics,
} from './lib/sio_worker_source_discovery.mjs';

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sio-worker-source-test-'));
const workerFile = 'worker-skills-8663.js';
const controlledDir = defaultControlledWorkerSourceDir(tempRoot);
await fs.mkdir(controlledDir, { recursive: true });
await fs.writeFile(path.join(controlledDir, workerFile), 'self.__worker = true;');

assert.equal(findWorkerSourceDir({ cwd: tempRoot, env: {}, tmpDir: tempRoot }), controlledDir);

const envDir = path.join(tempRoot, 'env-worker');
await fs.mkdir(envDir, { recursive: true });
await fs.writeFile(path.join(envDir, workerFile), 'self.__envWorker = true;');
assert.equal(
  findWorkerSourceDir({
    cwd: tempRoot,
    env: { SIO_WORKER_SRC_DIR: envDir },
    tmpDir: tempRoot,
  }),
  envDir,
);

const missingRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sio-worker-source-missing-'));
const diagnostics = workerSourceDiagnostics({ cwd: missingRoot, env: {}, tmpDir: missingRoot });
assert.match(diagnostics.message, /SIO_WORKER_SRC_DIR/);
assert.match(diagnostics.message, /sio_worker_source_materialize\.mjs/);
assert.match(diagnostics.message, /artifacts\/td11\/sio_worker_source\/current/);

assert.throws(
  () => findWorkerSourceDir({ cwd: missingRoot, env: {}, tmpDir: missingRoot }),
  /Unable to find SIO worker source/,
);

console.log('sio_worker_source_discovery_unit_test: passed');
