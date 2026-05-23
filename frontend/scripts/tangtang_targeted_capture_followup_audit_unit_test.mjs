import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const jsonPath = path.join(root, 'artifacts/td11/tangtang_targeted_capture_followup_audit.json');
const mdPath = path.join(root, 'artifacts/td11/tangtang_targeted_capture_followup_audit.md');
const targetedCaptureDir = 'frontend/artifacts/td11/captures/2026-05-23-targeted-followup';
const randomCaptureDir = 'frontend/artifacts/td11/captures/2026-05-23-random-sample';
const EXPECTED_RAW_IMAGE_COUNT = 27;
const EXPECTED_IMPORTED_ROWS_FROM_BATCH = 2;
const EXPECTED_MATCHED_ROWS_FROM_BATCH = 0;
const EXPECTED_DIVERGENCE_ROWS_FROM_BATCH = 2;
const EXPECTED_REINFORCED_EXISTING_ATOM_ROWS = 2;

const rawImagePaths = Array.from({ length: EXPECTED_RAW_IMAGE_COUNT }, (_, index) => (
  `${targetedCaptureDir}/${index + 1}.jpg`
));

const NON_IMPORTED_GROUPS = [
  {
    imageRefs: ['3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg'],
    domain: 'tech-part-energy-guidance-system',
    reason: 'Energy Guidance System / dual resonance and grade skill text is direct evidence, but no current 221-row description atom ledger row exists for this subsystem.',
    sampleEffects: [
      'dual drone single-shot damage tiers',
      'vulnerability/status damage rows',
      'skill damage rows',
      'dual part grade skill text',
    ],
  },
  {
    imageRefs: ['11.jpg'],
    domain: 'mount-tech-hoverboard-tooltip',
    reason: 'Skateboard/Tech Hoverboard tooltip is direct evidence, but the visible tooltip is not a clean row-level match to the current mount line atom rows.',
    sampleEffects: ['shield stack tooltip', 'damage reduction text', 'freeze-status wording'],
  },
  {
    imageRefs: ['12.jpg', '13.jpg', '14.jpg', '15.jpg', '16.jpg'],
    domain: 'custom-collection-set',
    reason: 'Custom collection set slot/upgrade rows are preserved as direct evidence, but are outside the current collectible set threshold atom ids.',
    sampleEffects: [
      'custom collection final attack/HP rows',
      'crit damage / weakened / poisoned / chilled rows',
      'slot upgrade explanation',
    ],
  },
  {
    imageRefs: ['17.jpg'],
    domain: 'collectible-set-important-day-record',
    reason: 'Important Day Record set rows are direct evidence, but no current atom row id was confidently mapped in this pass.',
    sampleEffects: ['gold/red 15-star final attack/HP rows'],
  },
  {
    imageRefs: ['18.jpg', '19.jpg'],
    domain: 'locked-collectible-item-unknown',
    reason: 'Locked unknown collectible rows are direct evidence, but item identity and atom id are not established.',
    sampleEffects: ['Twisting Belt HP rows', 'crit rate row', 'skill max-bound row'],
  },
  {
    imageRefs: ['20.jpg', '21.jpg', '22.jpg', '26.jpg', '27.jpg'],
    domain: 'survivor-taloxia',
    reason: 'Taloxia skill/passive/awakening text is direct survivor evidence, but the current 221-row description atom ledger does not include Taloxia rows.',
    sampleEffects: ['sync link tooltip', 'transform tooltip', 'firepower armament tooltip', 'awakening passive rows'],
  },
  {
    imageRefs: ['23.jpg', '24.jpg', '25.jpg'],
    domain: 'collaboration-battle',
    reason: 'Collaboration battle upgrade rows are direct evidence, but no current formula atom ledger rows exist for this subsystem.',
    sampleEffects: ['assist collaboration skill level upgrades', 'rage gain rows'],
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
  (row.rawCaptureArtifactPaths ?? []).some((artifact) => artifact.startsWith(targetedCaptureDir))
));
const matchedRowsFromBatch = importedRowsFromBatch.filter((row) => (
  row.comparisonVerdict === 'matches-sio-description-derived'
));
const divergenceRowsFromBatch = importedRowsFromBatch.filter((row) => (
  row.comparisonVerdict === 'description-sio-divergent-needs-confirmation'
));
const reinforcedExistingAtomRows = importedRowsFromBatch.filter((row) => (
  (row.rawCaptureArtifactPaths ?? []).some((artifact) => artifact.startsWith(randomCaptureDir))
));
const rawImagesWithImportedAtoms = [
  ...new Set(
    importedRowsFromBatch.flatMap((row) => row.rawCaptureArtifactPaths ?? [])
      .filter((artifact) => artifact.startsWith(targetedCaptureDir)),
  ),
].sort();

const audit = stableObject({
  title: 'Tangtang Targeted Direct Capture Follow-Up Audit',
  generatedAtKst: '2026-05-23 20:15:00 KST',
  status: '[TANGTANG-TARGETED-CAPTURE-FOLLOWUP-AUDIT-GREEN]',
  claim: 'targeted-direct-capture-followup-audit',
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
    reinforcedExistingAtomRowsFromBatch: reinforcedExistingAtomRows.length,
    observedDamageFollowUpRowsFromBatch: divergenceRowsFromBatch.length,
    cumulativeDirectFirstPartyCaptureRows: captureImport.summary.directFirstPartyDescriptionCaptureRows,
    cumulativeDescriptionSioDivergenceRows: captureImport.summary.descriptionSioDivergenceRows,
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
    rawCaptureArtifactPaths: (row.rawCaptureArtifactPaths ?? []).filter((artifact) => (
      artifact.startsWith(targetedCaptureDir)
    )),
    mismatchFields: row.mismatchFields,
  })),
  nonImportedGroups: NON_IMPORTED_GROUPS,
  decision: {
    canApplyTangtangFormulaCorrectionNow: false,
    canClaimOfficialInGameFormulaVerification: false,
    directObservedDamageFollowUpOpenedFor:
      divergenceRowsFromBatch.map((row) => row.atomRowId).sort(),
    reason:
      'The targeted follow-up strengthens the existing Genesis threshold divergence candidates with additional direct first-party captures. No scoring correction is applied until follow-up confirmation and a correction spec exist.',
  },
  artifactPaths: {
    json: 'frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.json',
    markdown: 'frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.md',
    script: 'frontend/scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs',
  },
  verificationCommands: [
    'node scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs',
    'node scripts/tangtang_description_capture_import_unit_test.mjs',
    'node scripts/tangtang_random_capture_sample_audit_unit_test.mjs',
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
- Reinforced existing atom rows from batch: ${matrix.summary.reinforcedExistingAtomRowsFromBatch}
- Observed damage follow-up rows from batch: ${matrix.summary.observedDamageFollowUpRowsFromBatch}
- Cumulative direct first-party capture rows: ${matrix.summary.cumulativeDirectFirstPartyCaptureRows}
- Cumulative description/SIO divergence rows: ${matrix.summary.cumulativeDescriptionSioDivergenceRows}
- Formula/scoring behavior change: \`${matrix.summary.formulaOrScoringBehaviorChange}\`

## Imported / Reinforced Rows

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

assert.equal(audit.claim, 'targeted-direct-capture-followup-audit');
assert.equal(audit.behaviorChange, false);
assert.equal(audit.summary.submittedRawImages, EXPECTED_RAW_IMAGE_COUNT);
assert.equal(audit.summary.importedAtomRowsFromBatch, EXPECTED_IMPORTED_ROWS_FROM_BATCH);
assert.equal(audit.summary.matchedSioRowsFromBatch, EXPECTED_MATCHED_ROWS_FROM_BATCH);
assert.equal(audit.summary.descriptionSioDivergenceRowsFromBatch, EXPECTED_DIVERGENCE_ROWS_FROM_BATCH);
assert.equal(audit.summary.reinforcedExistingAtomRowsFromBatch, EXPECTED_REINFORCED_EXISTING_ATOM_ROWS);
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
assert.ok(markdown.includes('Reinforced existing atom rows from batch: 2'));

if (writeMode) {
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, serializedJson);
  await fs.writeFile(mdPath, markdown);
  console.log(`tangtang_targeted_capture_followup_audit_unit_test: wrote ${jsonPath} and ${mdPath}`);
} else {
  const [existingJson, existingMarkdown] = await Promise.all([
    fs.readFile(jsonPath, 'utf8'),
    fs.readFile(mdPath, 'utf8'),
  ]);
  assert.equal(existingJson, serializedJson, 'Tangtang targeted capture follow-up audit JSON is stale; run with --write');
  assert.equal(existingMarkdown, markdown, 'Tangtang targeted capture follow-up audit MD is stale; run with --write');
  console.log('tangtang_targeted_capture_followup_audit_unit_test: passed (27 raw images, 2 reinforced rows)');
}
