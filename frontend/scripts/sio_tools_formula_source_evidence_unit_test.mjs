import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const buildDir = path.join(tmpdir(), 'pareto-sio-tools-formula-source-evidence');
const artifactPath = path.join(root, 'artifacts/td11/sio_tools_formula_source_evidence_matrix.json');
const deployedDataPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json');
const inGameDescriptionEvidencePath = path.join(root, 'artifacts/td11/in_game_description_evidence_matrix.json');
const collectibleEffectMappingPath = path.join(root, 'artifacts/td11/collectible_effect_mapping_matrix.json');
const mountDamageSourceFixturePath = path.join(root, 'artifacts/td11/mount_damage_source_fixture.json');
const sioToolsLiveEvidencePath = path.join(root, 'artifacts/td11/sio_tools_live_evidence_matrix.json');
const targetedLiveEvidencePath = path.join(root, 'artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json');

const currentWorker = {
  url: 'https://sio-tools.vercel.app/_next/static/chunks/7227.2d1c78b0f3f92fba.js?dpl=dpl_56iU76iXR6KnXd1j6BesFJBdsckh',
  versionHash: '955cb880d975c11ea2c5f0da623444ab717bef8ac463a30395b9563c7df627d1',
  capturedFromDeployment: 'dpl_56iU76iXR6KnXd1j6BesFJBdsckh',
};

const DIRECT_STAT_STAGE = new Map([
  ['atkBase', 'en0 attack aggregate'],
  ['atkEquip', 'en0 attack aggregate'],
  ['atkEquipPercent', 'en0 attack aggregate'],
  ['atkHero', 'en0 attack aggregate'],
  ['atkHeroPercent', 'en0 attack aggregate'],
  ['atkPercent', 'en0 attack aggregate'],
  ['atkFinal', 'en0 attack aggregate'],
  ['critRate', 'en1 crit expectation'],
  ['critDamage', 'en1 crit expectation'],
  ['vulnerability', 'en2 vulnerability'],
  ['shieldDamage', 'en3 shield damage uptime'],
  ['shieldDamageUptime', 'en3 shield damage uptime'],
  ['poisoned', 'en4 target status damage'],
  ['poisonedUptime', 'en4 target status damage'],
  ['weakened', 'en4 target status damage'],
  ['weakenedUptime', 'en4 target status damage'],
  ['chilled', 'en4 target status damage'],
  ['chilledUptime', 'en4 target status damage'],
  ['exposedDamage', 'en4 target status damage'],
  ['clarity', 'en5 clarity'],
  ['eternalMultiplier', 'en6 eternal multiplier'],
  ['glacialBloodline', 'en7 glacial bloodline'],
  ['laceration', 'en8 laceration/divine fire'],
  ['lacerationUptime', 'en8 laceration/divine fire'],
  ['divineFire', 'en8 laceration/divine fire'],
  ['divineFireUptime', 'en8 laceration/divine fire'],
  ['joeyWeakSpot', 'en9 Joey weak spot'],
  ['ssGlovesLaser', 'en10 SS gloves laser'],
  ['flashriftRip', 'en11 flashrift rip'],
  ['taloxaOverload', 'en12 Taloxa overload'],
  ['eternalSuitBoost', 'en13 Eternal Suit boost'],
  ['voidNeckBoost', 'en14 Voidwaker Emblem boost'],
  ['voidNeckBoostUptime', 'en14 Voidwaker Emblem boost'],
  ['voidGlovesInstakill', 'en15 Voidwaker Handguards instakill'],
  ['voidBootsBoost', 'en16 Voidwaker Treads boost'],
  ['chaosBeltBoost', 'en17 chaos belt boost'],
  ['hpBulletBoost', 'en18 HP Bullet boost'],
  ['damageDealt', 'en19 damage dealt'],
  ['adrenaline', 'en20 adrenaline'],
  ['damageTransmute', 'en21 xeno transmute damage'],
  ['damageBoss', 'en22 boss damage'],
  ['xenoResMultiplier', 'en23 xeno resonance multiplier'],
  ['lme1Damage', 'en24 LME phase damage'],
]);

async function transpileModule(sourcePath, outPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.outputText);
}

await fs.rm(buildDir, { recursive: true, force: true });
await transpileModule(
  path.join(root, 'app/lib/pareto-store/schemas/index.ts'),
  path.join(buildDir, 'schemas/index.js'),
);

const require = createRequire(import.meta.url);
const schemas = require(path.join(buildDir, 'schemas/index.js'));

const { TECH_STATS_FIXED_ORDER } = schemas;
const statByKey = new Map(TECH_STATS_FIXED_ORDER.map((stat) => [stat.key, stat]));
const deployedData = JSON.parse(await fs.readFile(deployedDataPath, 'utf8'));
const inGameDescriptionEvidence = JSON.parse(await fs.readFile(inGameDescriptionEvidencePath, 'utf8'));
const collectibleEffectMapping = JSON.parse(await fs.readFile(collectibleEffectMappingPath, 'utf8'));
const mountDamageSourceFixture = JSON.parse(await fs.readFile(mountDamageSourceFixturePath, 'utf8'));
const sioToolsLiveEvidence = JSON.parse(await fs.readFile(sioToolsLiveEvidencePath, 'utf8'));
const targetedLiveEvidence = JSON.parse(await fs.readFile(targetedLiveEvidencePath, 'utf8'));

function stableObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableObject(item)]),
    );
  }
  return value;
}

function countBy(values, field) {
  const counts = {};
  for (const value of values) {
    const key = value[field];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return stableObject(counts);
}

function multiplierStage(statChannel) {
  return DIRECT_STAT_STAGE.get(statChannel) ?? 'upstream/support stat; no direct 31-stage multiplier slot';
}

function walkStatLeaves(value, pathParts, out) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStatLeaves(item, [...pathParts, String(index)], out));
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (statByKey.has(key) && typeof item === 'number') {
      const sourcePath = [...pathParts, key].join('.');
      out.push({
        key: `sio-source-leaf:${sourcePath}`,
        sourcePath,
        domainRoot: pathParts[0],
        statChannel: key,
        statOrderIndex: statByKey.get(key).index,
        value: item,
        multiplierStage: multiplierStage(key),
        evidenceStatus: 'sio-tools-current-source-derived',
      });
    } else {
      walkStatLeaves(item, [...pathParts, key], out);
    }
  }
}

function buildSourceLeafRows() {
  const rows = [];
  walkStatLeaves(deployedData, [], rows);
  return stableObject(rows.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)));
}

function sourcePathMatch(row, pattern) {
  return pattern.test(row.sourcePath);
}

function buildTargetSurvivorCoverageRows() {
  return stableObject(
    inGameDescriptionEvidence.rows
      .filter((row) => row.domain === 'survivor')
      .flatMap((row) => row.claims.map((claim) => ({
        key: `target-survivor-source-claim:${row.key}:${claim.sourcePath}:${claim.sourceKey}`,
        parentKey: row.key,
        domain: 'target-survivor',
        displayName: row.displayName,
        sourcePath: claim.sourcePath.replace(/^survivors\./, 'heroes.'),
        sourceKey: claim.sourceKey,
        value: claim.value,
        cumulativeValue: claim.cumulativeValue ?? claim.value,
        tangtangSchemaKey: claim.tangtangSchemaKey,
        rustStatChannel: claim.rustStatChannel,
        multiplierStage: claim.multiplierStage,
        sourceEvidenceStatus: claim.evidenceStatus,
        evidenceStatus: 'sio-tools-current-source-derived',
      })))
      .sort((left, right) => left.key.localeCompare(right.key)),
  );
}

function buildMountCoverageRows() {
  const lineRows = inGameDescriptionEvidence.rows
    .filter((row) => row.domain === 'mount')
    .flatMap((row) => row.lineClaims.map((claim) => ({
      key: `mount-line-source-claim:${row.key}:${claim.sourcePath}:${claim.sourceKey}`,
      parentKey: row.key,
      domain: 'mount-line',
      displayName: row.displayName,
      sourcePath: claim.sourcePath,
      sourceKey: claim.sourceKey,
      value: claim.value,
      tangtangSchemaKey: claim.tangtangSchemaKey,
      rustStatChannel: claim.rustStatChannel,
      multiplierStage: claim.multiplierStage,
      sourceEvidenceStatus: claim.evidenceStatus,
      evidenceStatus: 'sio-tools-current-source-derived',
    })));
  const damageRows = mountDamageSourceFixture.rows.map((row) => ({
    key: `mount-damage-source-claim:${row.key}`,
    parentKey: row.key,
    domain: 'mount-damage',
    displayName: row.mountName,
    sourcePath: `mounts.${row.mountName}.damageByStars*mgCoefficient`,
    sourceKey: 'mountDamage',
    value: row.mountDamageByStars['8'],
    allStarValues: row.mountDamageByStars,
    tangtangSchemaKey: `MOUNT_SCHEMA_INDEX.${row.key.replace(/^mount:/, '')}`,
    rustStatChannel: row.rustStatChannel,
    multiplierStage: row.multiplierStage,
    mgCoefficient: row.mgCoefficient,
    liveEvidence: row.mountName === 'Doomsteed' ? 'zero coefficient row' : 'targeted active mountDamage live trace captured',
    evidenceStatus: 'sio-tools-current-source-derived',
  }));
  return stableObject([...lineRows, ...damageRows].sort((left, right) => left.key.localeCompare(right.key)));
}

function buildCollectibleThresholdCoverageRows() {
  return stableObject(
    collectibleEffectMapping.thresholdRows.map((row) => ({
      key: `collectible-threshold-source-claim:${row.key}`,
      parentKey: row.parentKey,
      domain: row.kind,
      displayName: row.name,
      sourcePath: row.sioSourceKey,
      sourceDescription: row.sourceDescription,
      sourceKey: row.rustStatChannel,
      value: row.value,
      thresholdMetric: row.thresholdMetric,
      threshold: row.threshold,
      tangtangSchemaKey: row.tangtangSchemaKey,
      rustLocation: row.rustLocation,
      rustStatChannel: row.rustStatChannel,
      multiplierStage: row.multiplierStage,
      evidenceStatus: 'sio-tools-current-source-derived',
    })).sort((left, right) => left.key.localeCompare(right.key)),
  );
}

function buildCollectibleSpecialMappingRows() {
  return stableObject(
    collectibleEffectMapping.rows.flatMap((row) =>
      row.rustMappings
        .filter((mapping) => mapping.stage !== 'derived_base_stats')
        .map((mapping) => ({
          key: `collectible-special-rust-mapping:${row.key}:${mapping.stage}:${mapping.rustLocation}`,
          parentKey: row.key,
          domain: 'collectible-special-rust-mapping',
          displayName: row.name,
          sourcePath: row.sioSourceKey,
          tangtangSchemaKey: row.tangtangSchemaKey,
          rustLocation: mapping.rustLocation,
          rustStage: mapping.stage,
          rustStatChannels: mapping.statChannels,
          thresholdMetric: mapping.thresholdMetric,
          thresholds: mapping.thresholds,
          equipment: mapping.equipment,
          evidenceStatus: 'sio-tools-current-source-derived',
        })),
    ).sort((left, right) => left.key.localeCompare(right.key)),
  );
}

const sourceLeafRows = buildSourceLeafRows();
const targetSurvivorCoverageRows = buildTargetSurvivorCoverageRows();
const mountCoverageRows = buildMountCoverageRows();
const collectibleThresholdCoverageRows = buildCollectibleThresholdCoverageRows();
const collectibleSpecialMappingRows = buildCollectibleSpecialMappingRows();
const targetSurvivorRawRows = sourceLeafRows.filter((row) => sourcePathMatch(row, /^heroes\.(Yelena|Squidward|Spongebob)\./));
const mountRawRows = sourceLeafRows.filter((row) => row.domainRoot === 'mounts');
const collectibleRawRows = sourceLeafRows.filter((row) => row.domainRoot === 'collectibles' || row.domainRoot === 'sets');
const directStageRows = sourceLeafRows.filter((row) => DIRECT_STAT_STAGE.has(row.statChannel));

const artifact = stableObject({
  generatedAtKst: '2026-05-23',
  status: 'SIO-TOOLS-FORMULA-SOURCE-EVIDENCE-V1',
  purpose:
    'Internal SIO Tools source-derived formula evidence. This fills source-table evidence for rows that still lack direct first-party in-game text capture, without changing scoring/UI semantics.',
  behaviorChange: false,
  currentWorker,
  sourceInputs: {
    deployedDataPath: 'frontend/artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json',
    inGameDescriptionEvidencePath: 'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
    collectibleEffectMappingPath: 'frontend/artifacts/td11/collectible_effect_mapping_matrix.json',
    mountDamageSourceFixturePath: 'frontend/artifacts/td11/mount_damage_source_fixture.json',
    sioToolsLiveEvidencePath: 'frontend/artifacts/td11/sio_tools_live_evidence_matrix.json',
    targetedLiveEvidencePath: 'frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json',
  },
  notes: [
    'sourceLeafRows are raw cumulative SIO Tools source cells.',
    'coverageRows are normalized formula evidence rows used by Tangtang provenance gates.',
    'Raw cumulative cells and normalized delta rows intentionally have different counts.',
    'No row is direct first-party in-game text; do not promote these rows to in-game-description-verified.',
  ],
  summary: {
    rawSourceLeafRows: sourceLeafRows.length,
    rawSourceLeafRowsByDomain: countBy(sourceLeafRows, 'domainRoot'),
    rawSourceLeafRowsWithDirectMultiplierStage: directStageRows.length,
    targetSurvivorNormalizedClaims: targetSurvivorCoverageRows.length,
    targetSurvivorRawCumulativeLeafRows: targetSurvivorRawRows.length,
    mountNormalizedClaims: mountCoverageRows.length,
    mountRawCumulativeLeafRows: mountRawRows.length,
    collectibleThresholdRows: collectibleThresholdCoverageRows.length,
    collectibleRawThresholdLeafRows: collectibleRawRows.length,
    collectibleSpecialRustMappings: collectibleSpecialMappingRows.length,
    collectibleCatalogOnlyRows: collectibleEffectMapping.summary.catalogOnlyNamedItemRows + collectibleEffectMapping.summary.eventSlotRows,
    nonZeroMountDamageLiveRows: sioToolsLiveEvidence.summary.nonZeroMountDamageLiveRows,
    targetSurvivorLiveRows: sioToolsLiveEvidence.summary.targetSurvivorLiveRows,
    targetedLiveCaptureCases: targetedLiveEvidence.summary.targetedLiveCaptureCases,
    inGameDescriptionVerifiedRows: inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions,
  },
  coverageRows: [
    ...targetSurvivorCoverageRows,
    ...mountCoverageRows,
    ...collectibleThresholdCoverageRows,
    ...collectibleSpecialMappingRows,
  ],
  sourceLeafRows,
});

const sourceLeafByPath = new Map(sourceLeafRows.map((row) => [row.sourcePath, row]));
const coverageByKey = new Map(artifact.coverageRows.map((row) => [row.key, row]));

function requireSourceLeaf(sourcePath) {
  const row = sourceLeafByPath.get(sourcePath);
  assert.ok(row, `missing source leaf row: ${sourcePath}`);
  return row;
}

function requireCoverage(key) {
  const row = coverageByKey.get(key);
  assert.ok(row, `missing coverage row: ${key}`);
  return row;
}

assert.equal(artifact.summary.rawSourceLeafRows, 4650, 'current deployed data stat leaf count changed');
assert.deepEqual(artifact.summary.rawSourceLeafRowsByDomain, {
  baseStats: 8,
  collectibles: 76,
  customSets: 215,
  ee: 34,
  evoTree: 3,
  harmony: 81,
  heroes: 440,
  items: 383,
  lme: 2074,
  mounts: 52,
  petSkills: 7,
  pets: 49,
  sets: 94,
  skills: 1,
  synergy: 219,
  techs: 914,
});
assert.equal(artifact.summary.targetSurvivorNormalizedClaims, 11);
assert.equal(artifact.summary.targetSurvivorRawCumulativeLeafRows, 13);
assert.equal(artifact.summary.mountNormalizedClaims, 26);
assert.equal(artifact.summary.mountRawCumulativeLeafRows, 52);
assert.equal(artifact.summary.collectibleThresholdRows, 170);
assert.equal(artifact.summary.collectibleRawThresholdLeafRows, 170);
assert.equal(artifact.summary.collectibleSpecialRustMappings, 14);
assert.equal(artifact.summary.collectibleCatalogOnlyRows, 46);
assert.equal(artifact.summary.nonZeroMountDamageLiveRows, 2);
assert.equal(artifact.summary.targetSurvivorLiveRows, 3);
assert.equal(artifact.summary.targetedLiveCaptureCases, 5);
assert.equal(artifact.summary.inGameDescriptionVerifiedRows, 0);
assert.equal(new Set(sourceLeafRows.map((row) => row.key)).size, sourceLeafRows.length, 'source leaf row keys must be unique');
assert.equal(new Set(artifact.coverageRows.map((row) => row.key)).size, artifact.coverageRows.length, 'coverage row keys must be unique');

assert.equal(requireSourceLeaf('heroes.Yelena.stars.vals.1.critDamage').value, 45);
assert.equal(requireSourceLeaf('heroes.Squidward.level.vals.1.critRate').value, 5);
assert.equal(requireSourceLeaf('heroes.Spongebob.level.vals.1.critRate').value, 5);
assert.equal(requireSourceLeaf('mounts.Tech Hoverboard.lines.vals.6.shieldDamage').value, 100);
assert.equal(requireSourceLeaf('mounts.Electric Scooter.lines.vals.6.laceration').value, 30);
assert.equal(requireSourceLeaf('collectibles.Aerocore Orb.stars.vals.0.critRate').value, 5);
assert.equal(requireSourceLeaf('sets.Impression Idols.stars.red.20.skillDamage').value, 20);
assert.equal(requireSourceLeaf('ee.0.0.stats.critDamage').value, 30);
assert.equal(
  requireCoverage('mount-damage-source-claim:mount:techHoverboard').value,
  50000,
  'Tech Hoverboard mountDamage source coverage must be preserved',
);
assert.equal(
  requireCoverage('mount-damage-source-claim:mount:electricScooter').value,
  17710,
  'Electric Scooter mountDamage source coverage must be preserved',
);
assert.deepEqual(
  requireCoverage('collectible-special-rust-mapping:collectible-set:impressionIdols:tech_stats:tttg_forge_optimizer/src/tech/sio_lm.rs:1173').rustStatChannels,
  ['critDamage', 'skillDamage', 'vulnerability'],
);
assert.ok(
  artifact.coverageRows.every((row) => row.evidenceStatus === 'sio-tools-current-source-derived'),
  'coverage rows must remain source-derived evidence only',
);

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

if (writeMode) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, serialized);
  console.log(`sio_tools_formula_source_evidence_unit_test: wrote ${artifactPath} (${sourceLeafRows.length} source leaves)`);
} else {
  const existing = await fs.readFile(artifactPath, 'utf8');
  assert.equal(existing, serialized, 'SIO Tools formula source evidence matrix is stale; run with --write');
  console.log(`sio_tools_formula_source_evidence_unit_test: passed (${sourceLeafRows.length} source leaves)`);
}
