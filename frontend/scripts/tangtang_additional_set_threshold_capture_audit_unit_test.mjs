import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const jsonPath = path.join(root, 'artifacts/td11/tangtang_additional_set_threshold_capture_audit.json');
const mdPath = path.join(root, 'artifacts/td11/tangtang_additional_set_threshold_capture_audit.md');
const additionalCaptureDir = 'frontend/artifacts/td11/captures/2026-05-23-additional-set-thresholds';
const EXPECTED_RAW_IMAGE_COUNT = 4;
const EXPECTED_IMPORTED_ROWS_FROM_BATCH = 2;
const EXPECTED_DIVERGENCE_ROWS_FROM_BATCH = 2;
const EXPECTED_NON_IMPORTED_GROUPS = 1;

const rawImagePaths = Array.from({ length: EXPECTED_RAW_IMAGE_COUNT }, (_, index) => (
  `${additionalCaptureDir}/${index + 1}.jpg`
));

const EXPECTED_IMPORTED_ATOM_ROW_IDS = [
  'collectible-set:dreamOrReality:gold:15:atkPercent',
  'collectible-set:dreamOrReality:red:15:atkPercent',
];

const NON_IMPORTED_GROUPS = [
  {
    imageRefs: ['3.jpg', '4.jpg'],
    domain: 'collectible-set-hp-only-or-unmapped',
    reason:
      'The visible set rows show HP +4/+6% and generic final attack/HP bonuses. HP percent is not a current damage-formula atom in the 221-row ledger, so this pass preserves the raw evidence without promoting it to a damage correction candidate.',
    sampleEffects: [
      '누적으로 19개의 금 별 획득 / HP +4%',
      '누적으로 19개의 빨간 별 획득 / HP +6%',
      '8/16/24-star final attack and HP bonuses',
    ],
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

const [captureImport, correctionCandidates] = await Promise.all([
  readJson('frontend/artifacts/td11/tangtang_description_capture_import_matrix.json'),
  readJson('frontend/artifacts/td11/tangtang_formula_correction_candidates.json'),
]);

await Promise.all(rawImagePaths.map((artifact) => fs.access(path.join(root, artifact.replace(/^frontend\//, '')))));

const importedRowsFromBatch = captureImport.importedCaptureRows.filter((row) => (
  (row.rawCaptureArtifactPaths ?? []).some((artifact) => artifact.startsWith(additionalCaptureDir))
));
const divergenceRowsFromBatch = importedRowsFromBatch.filter((row) => (
  row.comparisonVerdict === 'description-sio-divergent-needs-confirmation'
));
const matchedRowsFromBatch = importedRowsFromBatch.filter((row) => (
  row.comparisonVerdict === 'matches-sio-description-derived'
));
const rawImagesWithImportedAtoms = [
  ...new Set(
    importedRowsFromBatch.flatMap((row) => row.rawCaptureArtifactPaths ?? [])
      .filter((artifact) => artifact.startsWith(additionalCaptureDir)),
  ),
].sort();
const correctionCandidateRowsFromBatch = correctionCandidates.candidateRows.filter((row) => (
  (row.rawCaptureArtifactPaths ?? []).some((artifact) => artifact.startsWith(additionalCaptureDir))
));

const audit = stableObject({
  title: 'Tangtang Additional Set Threshold Capture Audit',
  generatedAtKst: '2026-05-23 22:20:00 KST',
  status: '[TANGTANG-ADDITIONAL-SET-THRESHOLD-CAPTURE-AUDIT-GREEN]',
  claim: 'additional-direct-capture-set-threshold-audit',
  behaviorChange: false,
  sourceInputs: [
    'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
    'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
    'frontend/artifacts/td11/tangtang_formula_correction_candidates.json',
    ...rawImagePaths,
  ],
  summary: {
    submittedRawImages: rawImagePaths.length,
    rawImagesWithImportedAtoms: rawImagesWithImportedAtoms.length,
    rawImagesWithoutImportedAtoms: rawImagePaths.length - rawImagesWithImportedAtoms.length,
    importedAtomRowsFromBatch: importedRowsFromBatch.length,
    matchedSioRowsFromBatch: matchedRowsFromBatch.length,
    descriptionSioDivergenceRowsFromBatch: divergenceRowsFromBatch.length,
    correctionCandidateRowsFromBatch: correctionCandidateRowsFromBatch.length,
    nonImportedEvidenceGroups: NON_IMPORTED_GROUPS.length,
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
    rawCaptureArtifactPaths: (row.rawCaptureArtifactPaths ?? []).filter((artifact) => (
      artifact.startsWith(additionalCaptureDir)
    )),
    mismatchFields: row.mismatchFields,
  })),
  correctionCandidateRowsFromBatch: correctionCandidateRowsFromBatch.map((row) => ({
    atomRowId: row.atomRowId,
    currentSioConditionOrThreshold: row.currentSioConditionOrThreshold,
    directDescriptionConditionOrThreshold: row.directDescriptionConditionOrThreshold,
    directDescriptionParsedFormulaValue: row.directDescriptionParsedFormulaValue,
    rustStatChannel: row.rustStatChannel,
    mismatchType: row.mismatchType,
    correctionEligibleNow: row.correctionEligibleNow,
  })),
  nonImportedGroups: NON_IMPORTED_GROUPS,
  decision: {
    importedAsDamageFormulaCandidates: EXPECTED_IMPORTED_ATOM_ROW_IDS,
    preservedOutsideDamageFormulaLedger:
      'The HP-only set screenshots are retained as raw direct evidence but are not promoted to damage formula correction candidates in this pass.',
    canApplyTangtangFormulaCorrectionNow: false,
    canClaimOfficialInGameFormulaVerification: false,
    reason:
      'Dream or Reality? has direct first-party threshold divergence evidence against current source-derived atom rows. The HP-only set evidence does not alter the damage formula ledger.',
  },
  artifactPaths: {
    json: 'frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.json',
    markdown: 'frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.md',
    script: 'frontend/scripts/tangtang_additional_set_threshold_capture_audit_unit_test.mjs',
  },
  verificationCommands: [
    'node scripts/tangtang_additional_set_threshold_capture_audit_unit_test.mjs',
    'node scripts/tangtang_description_capture_import_unit_test.mjs',
    'node scripts/tangtang_formula_correction_candidates_unit_test.mjs',
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
- Correction candidate rows from batch: ${matrix.summary.correctionCandidateRowsFromBatch}
- Non-imported evidence groups: ${matrix.summary.nonImportedEvidenceGroups}
- Formula/scoring behavior change: \`${matrix.summary.formulaOrScoringBehaviorChange}\`

## Imported Rows

| Capture | Atom row | Verdict | Condition | Value | Stat channel | Raw artifacts |
|---|---|---|---|---:|---|---|
${matrix.importedRowsFromBatch.map((row) => `| ${cell(row.captureId)} | ${cell(row.atomRowId)} | ${cell(row.comparisonVerdict)} | ${cell(row.conditionOrThreshold)} | ${cell(row.parsedFormulaValue)} | ${cell(row.rustStatChannel)} | ${cell(row.rawCaptureArtifactPaths.join('<br>'))} |`).join('\n')}

## Correction Candidate Rows

| Atom row | Current source condition | Direct description condition | Value | Channel | Eligible now? |
|---|---|---|---:|---|---|
${matrix.correctionCandidateRowsFromBatch.map((row) => `| ${cell(row.atomRowId)} | ${cell(row.currentSioConditionOrThreshold)} | ${cell(row.directDescriptionConditionOrThreshold)} | ${cell(row.directDescriptionParsedFormulaValue)} | ${cell(row.rustStatChannel)} | ${cell(row.correctionEligibleNow)} |`).join('\n')}

## Preserved Non-Imported Evidence

| Images | Domain | Reason | Sample effects |
|---|---|---|---|
${matrix.nonImportedGroups.map((group) => `| ${cell(group.imageRefs.join(', '))} | ${cell(group.domain)} | ${cell(group.reason)} | ${cell(group.sampleEffects.join('; '))} |`).join('\n')}

## Decision

- Imported as damage formula candidates:
${matrix.decision.importedAsDamageFormulaCandidates.map((rowId) => `  - \`${rowId}\``).join('\n')}
- Preserved outside damage formula ledger: ${matrix.decision.preservedOutsideDamageFormulaLedger}
- Can apply Tangtang formula correction now: \`${matrix.decision.canApplyTangtangFormulaCorrectionNow}\`
- Can claim official in-game formula verification: \`${matrix.decision.canClaimOfficialInGameFormulaVerification}\`

${matrix.decision.reason}

## Evidence Artifacts

${matrix.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${matrix.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const markdown = renderMarkdown(audit);
const serializedJson = `${JSON.stringify(audit, null, 2)}\n`;

assert.equal(audit.claim, 'additional-direct-capture-set-threshold-audit');
assert.equal(audit.behaviorChange, false);
assert.equal(audit.summary.submittedRawImages, EXPECTED_RAW_IMAGE_COUNT);
assert.equal(audit.summary.importedAtomRowsFromBatch, EXPECTED_IMPORTED_ROWS_FROM_BATCH);
assert.equal(audit.summary.matchedSioRowsFromBatch, 0);
assert.equal(audit.summary.descriptionSioDivergenceRowsFromBatch, EXPECTED_DIVERGENCE_ROWS_FROM_BATCH);
assert.equal(audit.summary.correctionCandidateRowsFromBatch, EXPECTED_DIVERGENCE_ROWS_FROM_BATCH);
assert.equal(audit.summary.nonImportedEvidenceGroups, EXPECTED_NON_IMPORTED_GROUPS);
assert.deepEqual(
  audit.importedRowsFromBatch.map((row) => row.atomRowId).sort(),
  EXPECTED_IMPORTED_ATOM_ROW_IDS,
);
assert.deepEqual(
  audit.correctionCandidateRowsFromBatch.map((row) => row.atomRowId).sort(),
  EXPECTED_IMPORTED_ATOM_ROW_IDS,
);
assert.ok(audit.importedRowsFromBatch.every((row) => row.rustStatChannel === 'atkPercent'));
assert.ok(audit.importedRowsFromBatch.every((row) => row.comparisonVerdict === 'description-sio-divergent-needs-confirmation'));
assert.equal(audit.decision.canApplyTangtangFormulaCorrectionNow, false);
assert.equal(audit.decision.canClaimOfficialInGameFormulaVerification, false);
assert.ok(markdown.includes('Dream or Reality?'));
assert.ok(markdown.includes('HP-only set screenshots'));

if (writeMode) {
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, serializedJson);
  await fs.writeFile(mdPath, markdown);
  console.log(`tangtang_additional_set_threshold_capture_audit_unit_test: wrote ${jsonPath} and ${mdPath}`);
} else {
  const [existingJson, existingMarkdown] = await Promise.all([
    fs.readFile(jsonPath, 'utf8'),
    fs.readFile(mdPath, 'utf8'),
  ]);
  assert.equal(existingJson, serializedJson, 'Tangtang additional set threshold capture audit JSON is stale; run with --write');
  assert.equal(existingMarkdown, markdown, 'Tangtang additional set threshold capture audit MD is stale; run with --write');
  console.log('tangtang_additional_set_threshold_capture_audit_unit_test: passed (4 raw images, 2 imported rows)');
}
