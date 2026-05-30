import fs from 'node:fs';
import path from 'node:path';

export const workerSourceFileName = 'worker-skills-8663.js';

export function defaultControlledWorkerSourceDir(cwd = process.cwd()) {
  return path.join(cwd, 'artifacts/td11/sio_worker_source/current');
}

function candidateDirs({ cwd = process.cwd(), env = process.env, tmpDir = '/tmp' } = {}) {
  const candidates = [];
  if (env.SIO_WORKER_SRC_DIR) {
    candidates.push({
      label: 'SIO_WORKER_SRC_DIR',
      dir: env.SIO_WORKER_SRC_DIR,
    });
  }
  candidates.push({
    label: 'controlled-artifact',
    dir: defaultControlledWorkerSourceDir(cwd),
  });
  candidates.push({
    label: 'tmp-current',
    dir: path.join(tmpDir, 'sio-tools-src.current'),
  });

  try {
    const discovered = fs
      .readdirSync(tmpDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('sio-tools-src.'))
      .map((entry) => path.join(tmpDir, entry.name))
      .sort();
    for (const dir of discovered) {
      candidates.push({ label: 'tmp-discovered', dir });
    }
  } catch {
    // Missing temp dirs are reported through diagnostics below.
  }

  return candidates;
}

export function workerSourceDiagnostics(options = {}) {
  const candidates = candidateDirs(options).map((candidate) => {
    const filePath = path.join(candidate.dir, workerSourceFileName);
    return {
      ...candidate,
      filePath,
      exists: fs.existsSync(filePath),
    };
  });
  const candidateText = candidates
    .map((candidate) => `${candidate.label}: ${candidate.filePath} exists=${candidate.exists}`)
    .join('; ');
  return {
    candidates,
    message:
      `Unable to find SIO worker source ${workerSourceFileName}. ` +
      `Set SIO_WORKER_SRC_DIR or run node scripts/sio_worker_source_materialize.mjs. ` +
      `Checked ${candidateText}`,
  };
}

export function findWorkerSourceDir(options = {}) {
  const diagnostics = workerSourceDiagnostics(options);
  const match = diagnostics.candidates.find((candidate) => candidate.exists);
  if (match) {
    return match.dir;
  }
  throw new Error(diagnostics.message);
}
