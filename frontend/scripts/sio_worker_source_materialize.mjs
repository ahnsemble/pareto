import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import {
  defaultControlledWorkerSourceDir,
  findWorkerSourceDir,
  workerSourceFileName,
} from './lib/sio_worker_source_discovery.mjs';

const workerSummaryPath =
  process.env.WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/shared_ihACJy/worker_decoded_summary.json');
const outputDir = process.env.OUTPUT_DIR ?? defaultControlledWorkerSourceDir();

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export function workerUrlsFromSummary(summary) {
  const urls = new Set();
  for (const item of summary.cases ?? []) {
    for (const result of item.decodedResults ?? []) {
      if (typeof result.workerUrl === 'string' && /^https?:\/\//.test(result.workerUrl)) {
        urls.add(result.workerUrl);
      }
    }
    for (const request of item.skillsRequests ?? []) {
      if (typeof request.workerUrl === 'string' && /^https?:\/\//.test(request.workerUrl)) {
        urls.add(request.workerUrl);
      }
    }
  }
  return [...urls].sort();
}

async function fetchWorker(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'user-agent': 'pareto-sio-worker-source-materialize/1.0',
      },
    });
  } catch (error) {
    throw new Error(
      [
        `failed to fetch ${url}: ${error.message}`,
        'Set SIO_WORKER_SOURCE_PATH or SIO_WORKER_SRC_DIR to materialize from a local mirrored worker source.',
      ].join(' '),
    );
  }
  if (!response.ok) {
    throw new Error(
      [
        `failed to fetch ${url}: HTTP ${response.status}`,
        'Set SIO_WORKER_SOURCE_PATH or SIO_WORKER_SRC_DIR to materialize from a local mirrored worker source.',
      ].join(' '),
    );
  }
  return await response.text();
}

async function localWorkerSourceCandidate({ cwd, env, tmpDir, outputDir }) {
  const explicitPath = env.SIO_WORKER_SOURCE_PATH;
  if (explicitPath) {
    return {
      source: await fs.readFile(explicitPath, 'utf8'),
      sourceKind: 'local-source-path',
      sourcePath: explicitPath,
    };
  }

  const explicitDir = env.SIO_WORKER_SRC_DIR;
  if (explicitDir) {
    const sourcePath = path.join(explicitDir, workerSourceFileName);
    return {
      source: await fs.readFile(sourcePath, 'utf8'),
      sourceKind: 'local-source-dir',
      sourcePath,
    };
  }

  try {
    const sourceDir = findWorkerSourceDir({
      cwd,
      env: { ...env, SIO_WORKER_SRC_DIR: undefined },
      tmpDir,
    });
    const sourcePath = path.join(sourceDir, workerSourceFileName);
    if (path.resolve(sourcePath) === path.resolve(path.join(outputDir, workerSourceFileName))) {
      return null;
    }
    return {
      source: await fs.readFile(sourcePath, 'utf8'),
      sourceKind: 'discovered-local-source-dir',
      sourcePath,
    };
  } catch {
    return null;
  }
}

export async function materializeWorkerSource({
  cwd = process.cwd(),
  env = process.env,
  tmpDir = '/tmp',
  workerSummaryPath: selectedWorkerSummaryPath = workerSummaryPath,
  outputDir: selectedOutputDir = outputDir,
} = {}) {
  const localSource = await localWorkerSourceCandidate({
    cwd,
    env,
    tmpDir,
    outputDir: selectedOutputDir,
  });

  let source = localSource?.source;
  let workerUrl = env.SIO_WORKER_URL ?? null;
  let sourceKind = localSource?.sourceKind ?? 'remote-worker-url';
  let sourcePath = localSource?.sourcePath ?? null;

  if (!source) {
    const summary = await readJson(selectedWorkerSummaryPath);
    workerUrl = workerUrl ?? workerUrlsFromSummary(summary)[0];
    if (!workerUrl) {
      throw new Error(`No SIO worker URL found in ${selectedWorkerSummaryPath}`);
    }
    source = await fetchWorker(workerUrl);
  }

  await fs.mkdir(selectedOutputDir, { recursive: true });
  const workerPath = path.join(selectedOutputDir, workerSourceFileName);
  await fs.writeFile(workerPath, source);

  const metadata = {
    generatedAt: new Date().toISOString(),
    workerSummaryPath: selectedWorkerSummaryPath,
    workerUrl,
    sourceKind,
    sourcePath,
    outputDir: selectedOutputDir,
    workerPath,
    bytes: Buffer.byteLength(source),
    sha256: sha256(source),
  };
  await fs.writeFile(
    path.join(selectedOutputDir, 'worker-source-metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const metadata = await materializeWorkerSource();
  console.log(JSON.stringify(metadata, null, 2));
}
