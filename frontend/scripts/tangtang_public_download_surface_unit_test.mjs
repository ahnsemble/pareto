import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const clientSurfaceFiles = [
  'app/[locale]/v3/page.tsx',
  'components/v3/optimizer.tsx',
  'components/v3/index.tsx',
  'components/v3/tech/techAccountContext.ts',
  'components/v3/tech/techResultPresenter.ts',
  'components/v3/PlayerStateCoveragePanel.tsx',
  'app/lib/wasm.ts',
  'app/lib/wasm-worker.ts',
  'app/lib/pareto-store/tech-profile-share.ts',
  'app/lib/pareto-store/tech-profile-storage.ts',
  'app/lib/pareto-store/collectible-upgrade-recommendations.ts',
  'app/lib/pareto-store/tech-upgrade-impact.ts',
  'app/lib/pareto-store/tech-upgrade-recommendations.ts',
  'app/lib/pareto-store/schemas/index.ts',
  'app/lib/pareto-store/playerState/constants.ts',
  'app/lib/pareto-store/playerState/defaults.ts',
  'app/lib/pareto-store/playerState/builder.ts',
  'app/lib/pareto-store/playerState/fixtures.ts',
  'app/lib/pareto-store/playerState/index.ts',
  'app/lib/pareto-store/playerState/profileTranslator.ts',
  'app/lib/pareto-store/types/index.ts',
  'components/v3/tech/TechBeforeAfterImpactTable.tsx',
];

const disallowedPatterns = [
  /\bSIO\b/,
  /\bSio[A-Za-z0-9_]*/,
  /\bSIO_[A-Za-z0-9_]*/,
  /\bsio_[A-Za-z0-9_]*/,
  /\bsio-tools\b/i,
  /\bsio_tools\b/i,
  /\bsioLm\b/,
  /\bsioTech[A-Za-z0-9_]*/,
  /\bsioCandidate\b/,
  /\bfull_sio_equivalent\b/,
  /\bsio_full_lm_equivalence\b/,
  /data-full-sio-equivalent/,
  /data-scoring-model/,
  /\bdebug\b/i,
  /data-raw-label/,
  /\braw source\b/i,
  /\bpreselect\b/i,
  /\bbeam\b/i,
  /exact node/i,
  /node cap/i,
  /iteration cap/i,
  /__useParetoStore/,
  /\d+\s+slice/i,
  /\d+\s+selector/i,
  /\d+\s+component/i,
  /invariants? passed/i,
  /field\.key/,
  /debounced 300ms/i,
  /\bNodes:/,
  /No turf nodes registered/i,
  /matrix awaits/i,
];

const allowedLinePatterns = [
  /precisionDevice/,
  /Precision Device/,
  /chaos_fusion/,
  /Impression Idols/,
  /version/,
  /Provision/,
  /const debugStoreKey/,
  /decodeExternalCalculationRaw/,
  /Component Props/,
];

const findings = [];

for (const file of clientSurfaceFiles) {
  const absPath = resolve(root, file);
  const lines = readFileSync(absPath, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (allowedLinePatterns.some((pattern) => pattern.test(line))) return;
    for (const pattern of disallowedPatterns) {
      if (pattern.test(line)) {
        findings.push(`${file}:${index + 1}: ${pattern} :: ${line.trim()}`);
      }
    }
  });
}

assert.deepEqual(
  findings,
  [],
  [
    'Public download surface still exposes source/provenance tokens.',
    'Keep scripts/evidence artifacts explicit, but deployed client/share surfaces must be neutral.',
    ...findings,
  ].join('\n'),
);

console.log('tangtang_public_download_surface_unit_test: passed');
