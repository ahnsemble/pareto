import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  materializeWorkerSource,
  workerUrlsFromSummary,
} from './sio_worker_source_materialize.mjs';

const urls = workerUrlsFromSummary({
  cases: [
    {
      decodedResults: [{ workerUrl: 'https://example.test/worker-b.js' }],
      skillsRequests: [{ workerUrl: 'https://example.test/worker-a.js' }],
    },
    {
      decodedResults: [{ workerUrl: 'https://example.test/worker-a.js' }],
    },
  ],
});
assert.deepEqual(urls, ['https://example.test/worker-a.js', 'https://example.test/worker-b.js']);

const tempRoot = await mkdtemp(path.join(tmpdir(), 'sio-worker-source-materialize-'));
try {
  const sourceDir = path.join(tempRoot, 'source');
  const outputDir = path.join(tempRoot, 'output');
  await mkdir(sourceDir, { recursive: true });
  const source = 'self.__workerSource = true;\n';
  await writeFile(path.join(sourceDir, 'worker-skills-8663.js'), source);

  const metadata = await materializeWorkerSource({
    cwd: tempRoot,
    env: { SIO_WORKER_SRC_DIR: sourceDir },
    outputDir,
    tmpDir: path.join(tempRoot, 'tmp'),
    workerSummaryPath: path.join(tempRoot, 'missing-worker-summary.json'),
  });

  assert.equal(metadata.sourceKind, 'local-source-dir');
  assert.equal(metadata.workerUrl, null);
  assert.equal(metadata.bytes, Buffer.byteLength(source));
  assert.equal(
    await readFile(path.join(outputDir, 'worker-skills-8663.js'), 'utf8'),
    source,
  );
  assert.equal(
    JSON.parse(await readFile(path.join(outputDir, 'worker-source-metadata.json'), 'utf8')).sha256,
    metadata.sha256,
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log('sio_worker_source_materialize_unit_test: passed');
