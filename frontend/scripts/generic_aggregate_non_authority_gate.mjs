import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const artifactPath = path.join(process.cwd(), 'artifacts/td11/generic_aggregate_non_authority_gate.json');
const writeMode = process.argv.includes('--write');

const GENERIC_AGGREGATE_FILES = [
  {
    domain: 'hero',
    path: 'tttg_forge_core/src/aggregate/hero.rs',
    expectedMarker: 'Ok(super::empty_stats())',
  },
  {
    domain: 'pet',
    path: 'tttg_forge_core/src/aggregate/pet.rs',
    expectedMarker: 'Ok(super::empty_stats())',
  },
  {
    domain: 'tech',
    path: 'tttg_forge_core/src/aggregate/tech.rs',
    expectedMarker: '"stats": {}, "ceDamage": {}, "passivePools": []',
  },
  {
    domain: 'collectible_set',
    path: 'tttg_forge_core/src/aggregate/collectible_set.rs',
    expectedMarker: 'Ok(super::empty_stats())',
  },
];

const rows = [];
for (const item of GENERIC_AGGREGATE_FILES) {
  const source = await fs.readFile(path.join(repoRoot, item.path), 'utf8');
  assert.ok(source.includes(item.expectedMarker), `${item.domain} generic aggregate implementation changed without this gate being updated`);
  rows.push({
    domain: item.domain,
    sourcePath: item.path,
    currentAuthority: 'non-authoritative',
    productionScorer: 'sio_full_lm_equivalence compact path',
    expectedMarker: item.expectedMarker,
    risk: 'Using this generic aggregate path as formula authority can undercount domain-specific SIO LM effects.',
    requiredBeforePromotion: 'Add domain-specific provenance rows and equivalence fixtures before using this path for product scoring.',
  });
}

const artifact = {
  generatedAtKst: '2026-05-23',
  status: 'GENERIC-AGGREGATE-NON-AUTHORITY-GATE-V0',
  summary: {
    totalRows: rows.length,
    nonAuthoritativeRows: rows.filter((row) => row.currentAuthority === 'non-authoritative').length,
    productionScorer: 'sio_full_lm_equivalence compact path',
  },
  rows,
};

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
if (writeMode) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, serialized);
  console.log(`generic_aggregate_non_authority_gate: wrote ${artifactPath} (${rows.length} rows)`);
} else {
  const existing = await fs.readFile(artifactPath, 'utf8');
  assert.equal(existing, serialized, 'generic aggregate non-authority gate artifact is stale');
  console.log(`generic_aggregate_non_authority_gate: passed (${rows.length} rows)`);
}
