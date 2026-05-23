import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');

const artifactPath = path.join(root, 'artifacts/td11/sio_tools_live_evidence_matrix.json');
const liveCapturePath = path.join(root, 'artifacts/td11/arbitrary_compact_s59/live_capture_summary.json');
const lmTracePath = path.join(root, 'artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json');
const compactManifestPath = path.join(root, 'artifacts/td11/arbitrary_compact_s59/compact_fixture_manifest.json');
const collectibleMatrixPath = path.join(root, 'artifacts/td11/collectible_effect_mapping_matrix.json');
const mountSourceFixturePath = path.join(root, 'artifacts/td11/mount_damage_source_fixture.json');
const targetedLiveEvidencePath = path.join(root, 'artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json');
const deployedDataPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json');
const compactCodecAssetPath = path.join(
  root,
  'artifacts/td11/sio_tools_asset_discovery/mirrored_assets/9730c42f92d7-797-9e5ce5eee251b4e4.js',
);
const schemaPath = path.join(root, 'app/lib/pareto-store/schemas/index.ts');

const COLLECTIBLE_LIVE_CASE_IDS = [
  'collectibles_custom_sets_legend_thresholds',
  'collectibles_individual_star_tables',
  'collectibles_upgraded_multiplier_behavior',
  'collectibles_item_set_folding',
  'collectibles_tech_set_folding',
  'custom_sets_threshold_edges',
  'collectibles_broad_item_tech_set_endgame_fold',
];

const MOUNT_LIVE_CASE_IDS = [
  'mounts_enabled_lines',
  'mounts_fallback_damage_formula_lines',
];

const TARGET_SURVIVORS = [
  { id: 'yelena', displayName: 'Yelena' },
  { id: 'squidward', displayName: 'Squidward' },
  { id: 'spongebob', displayName: 'SpongeBob' },
];

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

function nonZeroStats(stats) {
  return Object.fromEntries(
    Object.entries(stats ?? {})
      .filter(([, value]) => Number(value) !== 0)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function statComponent(traceCase, label) {
  return nonZeroStats(traceCase?.baseStatComponents?.find((component) => component.label === label)?.stats);
}

function pickedTraceStats(traceCase) {
  const keys = [
    'atkPercent',
    'chilled',
    'critDamage',
    'critRate',
    'damageBoss',
    'damageTransmute',
    'laceration',
    'poisoned',
    'shieldDamage',
    'skillDamage',
    'ssMiscPath',
    'vulnerability',
    'weakened',
  ];
  return Object.fromEntries(
    keys
      .map((key) => [key, traceCase?.nonZeroStats?.[key]])
      .filter(([, value]) => Number.isFinite(value))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function liveCaseSummary(liveCase, traceCase) {
  return {
    evidenceState: liveCase?.evidenceState ?? 'missing',
    compactPayloadHash: liveCase?.compactPayloadHash ?? liveCase?.captureMetadata?.compactPayloadHash ?? null,
    capturedAt: liveCase?.captureMetadata?.capturedAt ?? null,
    expectedMultiplier: liveCase?.best?.multiplier ?? traceCase?.expectedMultiplier ?? null,
    tracedMultiplier: traceCase?.tracedMultiplier ?? null,
    damageFactor: traceCase?.damageFactor ?? null,
    stageProductRelativeError: traceCase?.stageProductRelativeError ?? null,
  };
}

function parseStringArrayExpression(source, regex, label) {
  const match = source.match(regex);
  assert.ok(match, `${label} must be present in compact codec asset`);
  return Function(`"use strict"; return ${match[1]};`)();
}

function shortKeyForIndex(index, alphabet) {
  assert.ok(index >= 0, 'short key index must be non-negative');
  let encoded = '';
  let value = index;
  do {
    encoded = alphabet[value % alphabet.length] + encoded;
    value = Math.floor(value / alphabet.length);
  } while (value > 0);
  return encoded;
}

const [
  liveCapture,
  lmTrace,
  compactManifest,
  collectibleMatrix,
  mountSourceFixture,
  targetedLiveEvidence,
  deployedData,
  compactCodecAsset,
  schemaSource,
] = await Promise.all([
  fs.readFile(liveCapturePath, 'utf8').then(JSON.parse),
  fs.readFile(lmTracePath, 'utf8').then(JSON.parse),
  fs.readFile(compactManifestPath, 'utf8').then(JSON.parse),
  fs.readFile(collectibleMatrixPath, 'utf8').then(JSON.parse),
  fs.readFile(mountSourceFixturePath, 'utf8').then(JSON.parse),
  fs.readFile(targetedLiveEvidencePath, 'utf8').then(JSON.parse),
  fs.readFile(deployedDataPath, 'utf8').then(JSON.parse),
  fs.readFile(compactCodecAssetPath, 'utf8'),
  fs.readFile(schemaPath, 'utf8'),
]);

const liveCaseById = new Map((liveCapture.cases ?? []).map((item) => [item.id, item]));
const traceCaseById = new Map((lmTrace.cases ?? []).map((item) => [item.id, item]));
const manifestCaseById = new Map((compactManifest.cases ?? []).map((item) => [item.id, item]));

assert.equal(liveCapture.summary.cases, 26, 'expected arbitrary compact live capture case count changed');
assert.equal(liveCapture.summary.liveCaptured, liveCapture.summary.cases, 'all arbitrary compact cases must be live captured');
assert.equal(lmTrace.summary.cases, liveCapture.summary.cases, 'LM trace case count must match live capture count');
assert.equal(lmTrace.summary.stageProductPassed, lmTrace.summary.cases, 'LM trace stage product check must pass for all cases');
assert.equal(collectibleMatrix.summary.thresholdRows, 170, 'collectible source threshold matrix changed');
assert.equal(collectibleMatrix.summary.inGameDescriptionVerifiedRows, 0, 'this gate must not overstate in-game description verification');
assert.equal(mountSourceFixture.summary.nonZeroMountDamageRows, 2, 'source fixture must keep two non-zero mount damage rows');

const compactKeyList = parseStringArrayExpression(compactCodecAsset, /,v=(\[[\s\S]*?\]),b=\[/, 'compact key list');
const compactAlphabet = parseStringArrayExpression(compactCodecAsset, /,p=("[\s\S]*?"),k=p\.length/, 'compact alphabet');
const mountOrder = Object.keys(deployedData.mounts);

const compactKeys = Object.fromEntries(
  ['active', 'mounts', 'stats', 'lines', 'data'].map((longKey) => {
    const index = compactKeyList.indexOf(longKey);
    return [longKey, { index, shortKey: shortKeyForIndex(index, compactAlphabet) }];
  }),
);

assert.deepEqual(mountOrder, ['Doomsteed', 'Tech Hoverboard', 'Electric Scooter']);
assert.equal(compactKeys.mounts.shortKey, 'bJ');
assert.equal(compactKeys.active.shortKey, 'bj');
assert.equal(compactKeys.data.shortKey, 'bM');
assert.equal(compactKeys.stats.shortKey, 'bK');

for (const caseId of MOUNT_LIVE_CASE_IDS) {
  const compactMountConfig = manifestCaseById.get(caseId)?.compactConfig?.bJ;
  assert.ok(compactMountConfig, `${caseId} must keep a compact mount fixture`);
  assert.ok(!Object.hasOwn(compactMountConfig, compactKeys.active.shortKey), `${caseId} unexpectedly became an active mount live fixture`);
}

const rows = [];

for (const caseId of COLLECTIBLE_LIVE_CASE_IDS) {
  const liveCase = liveCaseById.get(caseId);
  const traceCase = traceCaseById.get(caseId);
  assert.equal(liveCase?.evidenceState, 'live-captured', `${caseId} must remain live captured`);
  rows.push({
    key: `live:collectibles:${caseId}`,
    domain: 'collectibles',
    evidenceType: 'sio-tools-live-capture',
    liveCaseId: caseId,
    purpose: liveCase.purpose,
    live: liveCaseSummary(liveCase, traceCase),
    baseStatComponents: stableObject({
      collectibles: statComponent(traceCase, 'collectibles'),
      collectibleSets: statComponent(traceCase, 'collectibleSets'),
      customSets: statComponent(traceCase, 'customSets'),
    }),
    selectedFinalStats: pickedTraceStats(traceCase),
    sourceMatrixCoverage: {
      collectibleEntityRows: collectibleMatrix.summary.totalRows,
      collectibleThresholdRows: collectibleMatrix.summary.thresholdRows,
      inGameDescriptionVerifiedRows: collectibleMatrix.summary.inGameDescriptionVerifiedRows,
    },
    finding: 'SIO Tools live worker captured multiplier and LM trace attribution for collectible source tables; in-game description text is still not independently captured.',
    confidence: 'sio-live-equivalent-for-source-table-path',
  });
}

for (const caseId of MOUNT_LIVE_CASE_IDS) {
  const liveCase = liveCaseById.get(caseId);
  const traceCase = traceCaseById.get(caseId);
  const mountStats = statComponent(traceCase, 'mounts');
  assert.equal(liveCase?.evidenceState, 'live-captured', `${caseId} must remain live captured`);
  assert.equal(traceCase?.ceDamage?.mount, 0, `${caseId} must remain non-active-mount evidence only`);
  const hasMountLineStats = Object.keys(mountStats).length > 0;
  rows.push({
    key: `live:mounts:${caseId}`,
    domain: 'mounts',
    evidenceType: 'sio-tools-live-capture',
    liveCaseId: caseId,
    purpose: liveCase.purpose,
    live: liveCaseSummary(liveCase, traceCase),
    baseStatComponents: stableObject({
      mounts: mountStats,
    }),
    hasMountLineStats,
    ceDamageMount: traceCase.ceDamage.mount,
    finding: hasMountLineStats
      ? 'SIO Tools live worker captured mount stat-line folding; current arbitrary compact fixtures omit mounts.active and therefore do not live-capture non-zero mountDamage.'
      : 'SIO Tools live worker captured this mount fixture, but the traced mount stat component is empty and mounts.active is omitted.',
    confidence: hasMountLineStats
      ? 'sio-live-equivalent-for-line-stats-only'
      : 'sio-live-captured-empty-mount-component',
  });
}

rows.push({
  key: 'source:compact-codec:mount-active-key',
  domain: 'mounts',
  evidenceType: 'sio-tools-public-mirrored-asset',
  sourceArtifact: path.relative(root, compactCodecAssetPath),
  sourceMeaning: 'module73755 export codec maps mounts.active string values to Object.keys(c.c.mounts) indexes and compresses long key active to bj.',
  compactKeys: stableObject(compactKeys),
  mountOrder,
  candidateActivePayloads: mountOrder.map((mountName, index) => ({
    mountName,
    compactPayloadPatch: {
      bJ: {
        bj: index,
      },
    },
  })),
  finding: 'The active-mount compact key is source-proven and targeted live evidence now captures bJ.bj=1/2 with non-zero mountDamage rows.',
  confidence: 'sio-source-plus-targeted-live-evidence',
});

rows.push({
  key: 'source:mounts:damage-fixture',
  domain: 'mounts',
  evidenceType: 'sio-tools-source-table-fixture',
  sourceArtifact: path.relative(root, mountSourceFixturePath),
  summary: stableObject(mountSourceFixture.summary),
  nonZeroMountDamageRows: mountSourceFixture.rows
    .filter((row) => row.nonZeroStars.length > 0)
    .map((row) => ({
      mountName: row.mountName,
      mgCoefficient: row.mgCoefficient,
      nonZeroStars: row.nonZeroStars,
      mountDamageByStars: row.mountDamageByStars,
    })),
  finding: 'Source tables provide non-zero mountDamage expectations for Electric Scooter and Tech Hoverboard; targeted live evidence now cross-checks both source rows.',
  confidence: 'sio-source-plus-targeted-live-evidence',
});

for (const targetedRow of targetedLiveEvidence.rows ?? []) {
  rows.push({
    ...stableObject(targetedRow),
    key: `targeted:${targetedRow.key}`,
    sourceArtifact: path.relative(root, targetedLiveEvidencePath),
  });
}

const survivorLiveCase = liveCaseById.get('survivors_passives_harmony_teamwork');
const survivorTraceCase = traceCaseById.get('survivors_passives_harmony_teamwork');
rows.push({
  key: 'live:survivors:passives-harmony-teamwork',
  domain: 'survivors',
  evidenceType: 'sio-tools-live-capture',
  liveCaseId: 'survivors_passives_harmony_teamwork',
  purpose: survivorLiveCase.purpose,
  live: liveCaseSummary(survivorLiveCase, survivorTraceCase),
  baseStatComponents: stableObject({
    heroes: statComponent(survivorTraceCase, 'heroes'),
    harmony: statComponent(survivorTraceCase, 'harmony'),
  }),
  selectedFinalStats: pickedTraceStats(survivorTraceCase),
  finding: 'SIO Tools live worker captures survivor passive/harmony/teamwork domain behavior; targeted current-worker rows separately cover Yelena, Squidward, and SpongeBob.',
  confidence: 'sio-live-equivalent-for-survivor-domain-not-targeted-heroes',
});

for (const survivor of TARGET_SURVIVORS) {
  const schemaLinePattern = new RegExp(`hero\\('${survivor.id}', '${survivor.displayName}'.*source_citations: \\[[^\\]]+\\]`);
  const schemaLine = schemaSource.split('\n').find((line) => schemaLinePattern.test(line.trim()));
  assert.ok(schemaLine, `${survivor.displayName} must remain source-cited in schema`);
  rows.push({
    key: `source:survivors:${survivor.id}`,
    domain: 'survivors',
    evidenceType: 'tangtang-schema-source-citation',
    survivorId: survivor.id,
    displayName: survivor.displayName,
    sourceArtifact: path.relative(root, schemaPath),
    schemaEvidence: schemaLine.trim(),
    liveEvidenceStatus: 'source-backed-targeted-live-captured-current-worker',
    finding: `${survivor.displayName} is represented as source-cited schema data and now has a targeted current-worker live fixture; in-game description capture is still separate.`,
    confidence: 'sio-source-only',
  });
}

const artifact = {
  generatedAtKst: '2026-05-23',
  status: 'SIO-TOOLS-LIVE-EVIDENCE-MATRIX-V1',
  sourceArtifacts: {
    liveCapture: path.relative(root, liveCapturePath),
    lmTrace: path.relative(root, lmTracePath),
    compactManifest: path.relative(root, compactManifestPath),
    collectibleEffectMappingMatrix: path.relative(root, collectibleMatrixPath),
    mountDamageSourceFixture: path.relative(root, mountSourceFixturePath),
    targetedLiveEvidence: path.relative(root, targetedLiveEvidencePath),
    compactCodecAsset: path.relative(root, compactCodecAssetPath),
  },
  summary: {
    liveCaptureCases: liveCapture.summary.cases,
    liveCapturedCases: liveCapture.summary.liveCaptured,
    lmTraceStageProductPassed: lmTrace.summary.stageProductPassed,
    targetedLiveCaptureCases: targetedLiveEvidence.summary.targetedLiveCaptureCases,
    targetedLiveCapturedCases: targetedLiveEvidence.summary.targetedLiveCapturedCases,
    targetedLmTraceStageProductPassed: targetedLiveEvidence.summary.targetedLmTraceStageProductPassed,
    evidenceRows: rows.length,
    collectibleLiveRows: rows.filter((row) => row.domain === 'collectibles' && row.evidenceType === 'sio-tools-live-capture').length,
    collectibleThresholdRows: collectibleMatrix.summary.thresholdRows,
    inGameDescriptionVerifiedRows: collectibleMatrix.summary.inGameDescriptionVerifiedRows,
    mountLiveRows: rows.filter((row) => row.domain === 'mounts' && String(row.evidenceType ?? '').includes('live-capture')).length,
    mountLineStatsLiveRows: rows.filter((row) => row.domain === 'mounts' && Object.keys(row.baseStatComponents?.mounts ?? {}).length > 0).length,
    mountEmptyComponentLiveRows: rows.filter((row) => row.domain === 'mounts' && row.evidenceType === 'sio-tools-live-capture' && Object.keys(row.baseStatComponents?.mounts ?? {}).length === 0).length,
    activeMountLiveRows: targetedLiveEvidence.summary.activeMountLiveRows,
    nonZeroMountDamageLiveRows: rows.filter(
      (row) => row.domain === 'mounts' && (Number(row.ceDamageMount) > 0 || Number(row.sourceCrossCheck?.liveCeDamageMount) > 0),
    ).length,
    nonZeroMountDamageSourceRows: mountSourceFixture.summary.nonZeroMountDamageRows,
    targetSurvivorSourceRows: TARGET_SURVIVORS.length,
    targetSurvivorLiveRows: targetedLiveEvidence.summary.targetSurvivorLiveRows,
    mountActiveShortKey: compactKeys.active.shortKey,
    mountDataShortKey: compactKeys.data.shortKey,
    targetSurvivorMainHeroValues: targetedLiveEvidence.summary.targetSurvivorMainHeroValues,
    targetSurvivorHeroArrayIndexes: targetedLiveEvidence.summary.targetSurvivorHeroArrayIndexes,
  },
  rows,
};

assert.equal(artifact.summary.collectibleLiveRows, COLLECTIBLE_LIVE_CASE_IDS.length);
assert.equal(artifact.summary.targetedLiveCaptureCases, 5);
assert.equal(artifact.summary.targetedLiveCapturedCases, 5);
assert.equal(artifact.summary.targetedLmTraceStageProductPassed, 5);
assert.equal(artifact.summary.mountLiveRows, MOUNT_LIVE_CASE_IDS.length + targetedLiveEvidence.summary.activeMountLiveRows);
assert.equal(artifact.summary.mountLineStatsLiveRows, 1);
assert.equal(artifact.summary.mountEmptyComponentLiveRows, 1);
assert.equal(artifact.summary.activeMountLiveRows, 2);
assert.equal(artifact.summary.nonZeroMountDamageLiveRows, 2);
assert.equal(artifact.summary.targetSurvivorSourceRows, 3);
assert.equal(artifact.summary.targetSurvivorLiveRows, 3);
assert.deepEqual(artifact.summary.targetSurvivorMainHeroValues, { yelena: 7, squidward: 18, spongebob: 19 });
assert.deepEqual(artifact.summary.targetSurvivorHeroArrayIndexes, { yelena: 6, squidward: 17, spongebob: 18 });
assert.ok(rows.length >= 19, 'evidence matrix should contain broad live, targeted live, source, and gap rows');

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

if (writeMode) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, serialized);
  console.log(`sio_tools_live_evidence_matrix_unit_test: wrote ${artifactPath} (${rows.length} rows)`);
} else {
  const existing = await fs.readFile(artifactPath, 'utf8');
  assert.equal(existing, serialized, 'SIO Tools live evidence matrix is stale; run with --write');
  console.log(`sio_tools_live_evidence_matrix_unit_test: passed (${rows.length} rows)`);
}
