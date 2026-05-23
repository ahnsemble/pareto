import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const jsonPath = path.join(root, 'artifacts/td11/tangtang_random_capture_sample_audit.json');
const mdPath = path.join(root, 'artifacts/td11/tangtang_random_capture_sample_audit.md');
const sampleCaptureDir = 'frontend/artifacts/td11/captures/2026-05-23-random-sample';
const EXPECTED_RAW_IMAGE_COUNT = 30;
const EXPECTED_IMPORTED_ROWS_FROM_BATCH = 3;
const EXPECTED_MATCHED_ROWS_FROM_BATCH = 1;
const EXPECTED_DIVERGENCE_ROWS_FROM_BATCH = 2;

const rawImagePaths = Array.from({ length: EXPECTED_RAW_IMAGE_COUNT }, (_, index) => (
  `${sampleCaptureDir}/${index + 1}.jpg`
));

const NON_IMPORTED_GROUPS = [
  {
    imageRefs: ['3.jpg', '4.jpg'],
    domain: 'collectible-aggregate-stats',
    reason: 'aggregate stat summary screen; not a row-level item/set formula description',
    sampleEffects: ['critRate 50%', 'critDamage 165%', 'skillDamage 110%', 'poisoned/weakened/chilled damage 35%'],
  },
  {
    imageRefs: ['5.jpg', '7.jpg', '8.jpg', '9.jpg', '29.jpg', '30.jpg'],
    domain: 'collectible-item-non-ledger-rows',
    reason: 'Instellar Transition Matrix Design rows for drone/system effects are not represented as current formula atom rows',
    sampleEffects: ['guided-system attack +3/+4%', 'drone missile count +5/+10%', 'drone missile single damage +5/+10%'],
  },
  {
    imageRefs: ['10.jpg', '23.jpg', '24.jpg', '25.jpg', '26.jpg', '27.jpg', '28.jpg'],
    domain: 'sync-level-rows',
    reason: 'commander synchronization rows are direct descriptions, but no current formula atom ledger rows exist for this subsystem',
    sampleEffects: ['critDamage/skillDamage/status damage tiers', 'shield damage +5%', 'elite/boss damage +5%'],
  },
  {
    imageRefs: ['11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg', '16.jpg', '17.jpg', '18.jpg'],
    domain: 'equipment-and-divine-forge-rows',
    reason: 'SS equipment, forge, and belt skill text is important direct evidence but outside the current 221-row description atom ledger',
    sampleEffects: ['skill attack +30% max 2 stacks', 'damage received +10%', 'energy-level damage/skill/crit/shield bonuses'],
  },
  {
    imageRefs: ['19.jpg'],
    domain: 'equipment-non-atom-row',
    reason: 'Belt grade-skill text is direct evidence, but no current formula atom ledger row exists for this item text',
    sampleEffects: ['skill damage random 80% to 150% +20%', 'HP +15/+25%'],
  },
  {
    imageRefs: ['20.jpg', '21.jpg', '22.jpg'],
    domain: 'pet-rows',
    reason: 'pet resonance/support skill rows are direct descriptions, but no current formula atom ledger rows exist for this subsystem',
    sampleEffects: ['pet resonance damage +1.5%', '13% proc for owner damage +15.5% for 4s', 'poison/weaken support skill text'],
  },
];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8'));
}

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

function cell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

const captureImport = await readJson('frontend/artifacts/td11/tangtang_description_capture_import_matrix.json');

await Promise.all(rawImagePaths.map((artifact) => fs.access(path.join(root, artifact.replace(/^frontend\//, '')))));

const importedRowsFromBatch = captureImport.importedCaptureRows.filter((row) => (
  (row.rawCaptureArtifactPaths ?? []).some((artifact) => artifact.startsWith(sampleCaptureDir))
));
const matchedRowsFromBatch = importedRowsFromBatch.filter((row) => row.comparisonVerdict === 'matches-sio-description-derived');
const divergenceRowsFromBatch = importedRowsFromBatch.filter((row) => (
  row.comparisonVerdict === 'description-sio-divergent-needs-confirmation'
));
const rawImagesWithImportedAtoms = [
  ...new Set(importedRowsFromBatch.flatMap((row) => row.rawCaptureArtifactPaths ?? [])),
].sort();

const audit = stableObject({
  title: 'Tangtang Random Direct Capture Sample Audit',
  generatedAtKst: '2026-05-23 19:30:00 KST',
  status: '[TANGTANG-RANDOM-CAPTURE-SAMPLE-AUDIT-GREEN]',
  claim: 'random-direct-capture-sample-audit',
  behaviorChange: false,
  sourceInputs: [
    'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
    'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
    ...rawImagePaths,
  ],
  summary: {
    submittedRawImages: rawImagePaths.length,
    rawImagesWithImportedAtoms: rawImagesWithImportedAtoms.length,
    rawImagesWithoutImportedAtoms: rawImagePaths.length - rawImagesWithImportedAtoms.length,
    importedAtomRowsFromBatch: importedRowsFromBatch.length,
    matchedSioRowsFromBatch: matchedRowsFromBatch.length,
    descriptionSioDivergenceRowsFromBatch: divergenceRowsFromBatch.length,
    observedDamageFollowUpRowsFromBatch: divergenceRowsFromBatch.length,
    formulaOrScoringBehaviorChange: false,
  },
  importedRowsFromBatch: importedRowsFromBatch.map((row) => ({
    atomRowId: row.atomRowId,
    captureId: row.captureId,
    comparisonVerdict: row.comparisonVerdict,
    descriptionTextOriginal: row.descriptionTextOriginal,
    conditionOrThreshold: row.conditionOrThreshold,
    parsedFormulaOperation: row.parsedFormulaOperation,
    parsedFormulaValue: row.parsedFormulaValue,
    rustStatChannel: row.rustStatChannel,
    multiplierStage: row.multiplierStage,
    rawCaptureArtifactPaths: row.rawCaptureArtifactPaths,
    mismatchFields: row.mismatchFields,
  })),
  nonImportedGroups: NON_IMPORTED_GROUPS,
  decision: {
    canApplyTangtangFormulaCorrectionNow: false,
    canClaimOfficialInGameFormulaVerification: false,
    directObservedDamageFollowUpOpenedFor:
      divergenceRowsFromBatch.map((row) => row.atomRowId).sort(),
    reason:
      'The random sample found direct first-party rows that compare against the current atom ledger, including Genesis condition divergences. No scoring correction is applied until follow-up confirmation and a correction spec exist.',
  },
  artifactPaths: {
    json: 'frontend/artifacts/td11/tangtang_random_capture_sample_audit.json',
    markdown: 'frontend/artifacts/td11/tangtang_random_capture_sample_audit.md',
    script: 'frontend/scripts/tangtang_random_capture_sample_audit_unit_test.mjs',
  },
  verificationCommands: [
    'node scripts/tangtang_random_capture_sample_audit_unit_test.mjs',
    'node scripts/tangtang_description_capture_import_unit_test.mjs',
    'node scripts/tangtang_in_game_damage_validation_unit_test.mjs',
    'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
    'git diff --check',
  ],
});

function renderMarkdown(matrix) {
  return `# ${matrix.title}

generatedAtKst: ${matrix.generatedAtKst}
status: ${matrix.status}
claim: \`${matrix.claim}\`
behaviorChange: \`${matrix.behaviorChange}\`

## Summary

- Submitted raw images: ${matrix.summary.submittedRawImages}
- Raw images with imported atom rows: ${matrix.summary.rawImagesWithImportedAtoms}
- Raw images without imported atom rows: ${matrix.summary.rawImagesWithoutImportedAtoms}
- Imported atom rows from batch: ${matrix.summary.importedAtomRowsFromBatch}
- Matched SIO/Tangtang rows from batch: ${matrix.summary.matchedSioRowsFromBatch}
- Description/SIO divergence rows from batch: ${matrix.summary.descriptionSioDivergenceRowsFromBatch}
- Observed damage follow-up rows from batch: ${matrix.summary.observedDamageFollowUpRowsFromBatch}
- Formula/scoring behavior change: \`${matrix.summary.formulaOrScoringBehaviorChange}\`

## Imported Rows

| Capture | Atom row | Verdict | Condition | Value | Stat channel | Raw artifacts |
|---|---|---|---|---:|---|---|
${matrix.importedRowsFromBatch.map((row) => `| ${cell(row.captureId)} | ${cell(row.atomRowId)} | ${cell(row.comparisonVerdict)} | ${cell(row.conditionOrThreshold)} | ${cell(row.parsedFormulaValue)} | ${cell(row.rustStatChannel)} | ${cell(row.rawCaptureArtifactPaths.join('<br>'))} |`).join('\n')}

## Non-Imported Evidence Groups

| Images | Domain | Reason | Sample effects |
|---|---|---|---|
${matrix.nonImportedGroups.map((group) => `| ${cell(group.imageRefs.join(', '))} | ${cell(group.domain)} | ${cell(group.reason)} | ${cell(group.sampleEffects.join('; '))} |`).join('\n')}

## Decision

- Can apply Tangtang formula correction now: \`${matrix.decision.canApplyTangtangFormulaCorrectionNow}\`
- Can claim official in-game formula verification: \`${matrix.decision.canClaimOfficialInGameFormulaVerification}\`
- Direct observed damage follow-up opened for:
${matrix.decision.directObservedDamageFollowUpOpenedFor.map((rowId) => `  - \`${rowId}\``).join('\n') || '  - none'}

${matrix.decision.reason}

## Evidence Artifacts

${matrix.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${matrix.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const markdown = renderMarkdown(audit);
const serializedJson = `${JSON.stringify(audit, null, 2)}\n`;

assert.equal(audit.claim, 'random-direct-capture-sample-audit');
assert.equal(audit.behaviorChange, false);
assert.equal(audit.summary.submittedRawImages, EXPECTED_RAW_IMAGE_COUNT);
assert.equal(audit.summary.importedAtomRowsFromBatch, EXPECTED_IMPORTED_ROWS_FROM_BATCH);
assert.equal(audit.summary.matchedSioRowsFromBatch, EXPECTED_MATCHED_ROWS_FROM_BATCH);
assert.equal(audit.summary.descriptionSioDivergenceRowsFromBatch, EXPECTED_DIVERGENCE_ROWS_FROM_BATCH);
assert.equal(audit.summary.observedDamageFollowUpRowsFromBatch, EXPECTED_DIVERGENCE_ROWS_FROM_BATCH);
assert.deepEqual(
  audit.decision.directObservedDamageFollowUpOpenedFor,
  [
    'collectible-set:genesis:gold:15:atkPercent',
    'collectible-set:genesis:red:15:atkPercent',
  ],
);
assert.equal(audit.decision.canApplyTangtangFormulaCorrectionNow, false);
assert.equal(audit.decision.canClaimOfficialInGameFormulaVerification, false);
assert.ok(markdown.includes('Description/SIO divergence rows from batch: 2'));

if (writeMode) {
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, serializedJson);
  await fs.writeFile(mdPath, markdown);
  console.log(`tangtang_random_capture_sample_audit_unit_test: wrote ${jsonPath} and ${mdPath}`);
} else {
  const [existingJson, existingMarkdown] = await Promise.all([
    fs.readFile(jsonPath, 'utf8'),
    fs.readFile(mdPath, 'utf8'),
  ]);
  assert.equal(existingJson, serializedJson, 'Tangtang random capture sample audit JSON is stale; run with --write');
  assert.equal(existingMarkdown, markdown, 'Tangtang random capture sample audit MD is stale; run with --write');
  console.log('tangtang_random_capture_sample_audit_unit_test: passed (30 raw images, 3 imported rows)');
}
