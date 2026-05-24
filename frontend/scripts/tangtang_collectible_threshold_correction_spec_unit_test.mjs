import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const jsonPath = path.join(root, 'artifacts/td11/tangtang_collectible_threshold_correction_spec.json');
const mdPath = path.join(root, 'artifacts/td11/tangtang_collectible_threshold_correction_spec.md');

const EXPECTED_DIRECT_ROW_IDS = [
  'collectible-set:dreamOrReality:gold:15:atkPercent',
  'collectible-set:dreamOrReality:red:15:atkPercent',
  'collectible-set:genesis:gold:15:atkPercent',
  'collectible-set:genesis:red:15:atkPercent',
];

const SOURCE_INPUTS = [
  'frontend/artifacts/td11/tangtang_formula_correction_candidates.json',
  'frontend/artifacts/td11/tangtang_formula_correction_candidates.md',
  'frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.json',
  'frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.md',
  'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
  'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
  'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
  'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
  'frontend/artifacts/td11/collectible_effect_mapping_matrix.json',
  'frontend/artifacts/td11/sio_lm_equivalence_matrix.json',
];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8');
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

function isThreeItemGoldRedAtkThreshold(row, setByKey) {
  const parent = setByKey.get(row.parentKey);
  return (
    row.kind === 'set-threshold' &&
    (row.thresholdMetric === 'gold' || row.thresholdMetric === 'red') &&
    row.threshold === 15 &&
    row.rustStatChannel === 'atkPercent' &&
    (row.value === 4 || row.value === 6) &&
    ((parent?.itemSchemaKeys ?? []).length === 3) &&
    parent?.sourceSetThresholds?.gold?.['15']?.atkPercent === 4 &&
    parent?.sourceSetThresholds?.red?.['15']?.atkPercent === 6
  );
}

function directRowFromCandidate(row) {
  return stableObject({
    atomRowId: row.atomRowId,
    candidateId: row.candidateId,
    entityKey: row.entityKey,
    sourceEntityDisplayName: row.sourceEntityDisplayName,
    tangtangSchemaKey: row.tangtangSchemaKey,
    evidenceClass: 'direct-confirmed-description-threshold-mismatch',
    correctionEligibleNow: false,
    correctionAppliedNow: false,
    mismatchType: row.mismatchType,
    mismatchFields: row.mismatchFields,
    sourceConditionOrThreshold: row.currentSioConditionOrThreshold,
    directConditionOrThreshold: row.directDescriptionConditionOrThreshold,
    sourceThreshold: row.sourceThreshold,
    directThreshold: row.capturedThreshold,
    proposedCorrectedConditionOrThreshold: row.proposedTangtangConditionOrThreshold,
    sourceParsedFormulaValue: row.currentSioParsedFormulaValue,
    directParsedFormulaValue: row.directDescriptionParsedFormulaValue,
    sourceStatChannel: row.rustStatChannel,
    directStatChannel: row.rustStatChannel,
    multiplierStage: row.multiplierStage,
    valueUnchanged: row.valueMatchesCurrent,
    statChannelUnchanged: row.statChannelMatchesCurrent,
    multiplierStageUnchanged: row.multiplierStageMatchesCurrent,
    rawCaptureArtifactPaths: row.rawCaptureArtifactPaths,
    rawCaptureEvidenceBuckets: row.rawCaptureEvidenceBuckets,
    requiredEvidenceBeforeApplication: [
      'controlled direct observed damage trial at 15-18 stars showing the current source threshold over-applies, or explicit user-approved description-only correction policy',
      'dedicated corrected scorer/gate that does not mutate sio_full_lm_equivalence semantics',
    ],
  });
}

function inferredRowFromMapping(row) {
  const directCondition = `${row.thresholdMetric} >= 19`;
  return stableObject({
    atomRowId: row.key,
    entityKey: row.parentKey,
    sourceEntityDisplayName: row.name,
    tangtangSchemaKey: row.tangtangSchemaKey,
    evidenceClass: 'inferred-family-pending',
    correctionEligibleNow: false,
    correctionAppliedNow: false,
    sourceConditionOrThreshold: `${row.thresholdMetric} >= ${row.threshold}`,
    inferredDirectConditionOrThreshold: directCondition,
    sourceThreshold: {
      metric: row.thresholdMetric,
      threshold: row.threshold,
    },
    inferredDirectThreshold: {
      metric: row.thresholdMetric,
      threshold: 19,
    },
    sourceParsedFormulaValue: row.value,
    rustStatChannel: row.rustStatChannel,
    multiplierStage: row.multiplierStage,
    reasonNotApplied:
      'This three-item set shares the same source-table gold/red >= 15 ATK% family, but it has no direct first-party threshold capture yet.',
    requiredEvidenceBeforeApplication: [
      'direct first-party set detail capture for this exact set and color threshold',
      'then the same corrected-mode isolation policy used for direct-confirmed rows',
    ],
  });
}

const [
  candidates,
  candidatesMd,
  additionalSetAudit,
  additionalSetAuditMd,
  captureImport,
  captureInbox,
  inGameDamageValidation,
  formulaSpec,
  collectibleMapping,
  equivalenceMatrix,
] = await Promise.all([
  readJson('frontend/artifacts/td11/tangtang_formula_correction_candidates.json'),
  readText('frontend/artifacts/td11/tangtang_formula_correction_candidates.md'),
  readJson('frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.json'),
  readText('frontend/artifacts/td11/tangtang_additional_set_threshold_capture_audit.md'),
  readJson('frontend/artifacts/td11/tangtang_description_capture_import_matrix.json'),
  readJson('frontend/artifacts/td11/tangtang_description_capture_inbox.json'),
  readJson('frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json'),
  readJson('frontend/artifacts/td11/tangtang_damage_formula_spec.json'),
  readJson('frontend/artifacts/td11/collectible_effect_mapping_matrix.json'),
  readJson('frontend/artifacts/td11/sio_lm_equivalence_matrix.json'),
]);

for (const input of SOURCE_INPUTS) {
  await fs.access(path.join(root, input.replace(/^frontend\//, '')));
}

function buildSpec() {
  const setByKey = new Map(collectibleMapping.rows.map((row) => [row.key, row]));
  const directRows = candidates.candidateRows
    .filter((row) => EXPECTED_DIRECT_ROW_IDS.includes(row.atomRowId))
    .map(directRowFromCandidate)
    .sort((left, right) => left.atomRowId.localeCompare(right.atomRowId));
  const directRowIdSet = new Set(directRows.map((row) => row.atomRowId));
  const familyRows = collectibleMapping.thresholdRows
    .filter((row) => isThreeItemGoldRedAtkThreshold(row, setByKey))
    .sort((left, right) => left.key.localeCompare(right.key));
  const inferredFamilyRows = familyRows
    .filter((row) => !directRowIdSet.has(row.key))
    .map(inferredRowFromMapping);

  return stableObject({
    title: 'Tangtang Collectible Threshold Correction Spec',
    generatedAtKst: formulaSpec.generatedAtKst,
    status: '[TANGTANG-COLLECTIBLE-THRESHOLD-CORRECTION-SPEC-GREEN]',
    claim: 'tangtang-description-corrected-candidate',
    behaviorChange: false,
    decision: {
      status: 'candidate-only-not-applied',
      scoringChanged: false,
      correctedModeImplemented: false,
      correctionEligibleNow: false,
      rationale:
        'Direct first-party descriptions repeatedly show four 15-to-19 collectible set threshold mismatches, but there are zero controlled observed damage trials and no approved description-only correction policy.',
      requiredBeforeApplication: [
        'observed damage evidence for the affected threshold band or explicit user-approved description-only correction policy',
        'a dedicated corrected scorer/gate name separate from sio_full_lm_equivalence',
        'RED/GREEN behavior tests proving 15-18 no longer applies only in corrected mode',
        'SIO-equivalent mode remains current source/Rust behavior',
      ],
    },
    sourceInputs: SOURCE_INPUTS,
    equivalenceContract: {
      fullSioEquivalent: equivalenceMatrix.fullSioEquivalent,
      currentScorer: equivalenceMatrix.currentScorer,
      scorer: equivalenceMatrix.scorer,
      preserved: true,
      defaultBehaviorChanged: false,
    },
    correctedContract: {
      proposedScorer: 'tangtang_description_corrected_thresholds',
      status: 'not-implemented-blocked-by-evidence-policy',
      separationRequired: true,
      mayChangeOnlyDirectConfirmedRows: true,
      mustNotMutateSioEquivalentMode: true,
    },
    uiExposureGuard: {
      userFacingProductName: 'Tangtang',
      userFacingSioTermExposed: false,
      rawSioLmJsonExposed: false,
      debugUiExposed: false,
      preselectUiExposed: false,
      beamUiExposed: false,
      exactNodeCapUiExposed: false,
      uiChanged: false,
    },
    summary: {
      directConfirmedCorrectionRows: directRows.length,
      thresholdOnlyMismatchRows: directRows.filter((row) => row.mismatchType === 'threshold-condition-only').length,
      sourceThreshold15Rows: directRows.filter((row) => row.sourceThreshold?.threshold === 15).length,
      directThreshold19Rows: directRows.filter((row) => row.directThreshold?.threshold === 19).length,
      valueUnchangedRows: directRows.filter((row) => row.valueUnchanged).length,
      statChannelUnchangedRows: directRows.filter((row) => row.statChannelUnchanged).length,
      multiplierStageUnchangedRows: directRows.filter((row) => row.multiplierStageUnchanged).length,
      correctionEligibleRows: directRows.filter((row) => row.correctionEligibleNow).length,
      directObservedDamageTrialCount: inGameDamageValidation.validationScope.directObservedDamageTrialCount,
      threeItemGoldRedAtkPercentUniverseRows: familyRows.length,
      inferredFamilyPendingRows: inferredFamilyRows.length,
      importedDescriptionCaptureRows: captureImport.summary.importedCaptureRows,
      captureInboxRows: captureInbox.rows.length,
    },
    directConfirmedRows: directRows,
    inferredFamilyRows,
    caveats: [
      'No direct observed damage trials exist yet for the 15-18 threshold band.',
      'Description evidence is strong enough to preserve a corrected candidate spec, but not enough under the current policy to change scoring.',
      'Inferred-family rows are explicitly pending and must not be applied without exact direct capture evidence.',
      'The SIO-equivalent scorer remains the active/default contract.',
    ],
    artifactPaths: {
      json: 'frontend/artifacts/td11/tangtang_collectible_threshold_correction_spec.json',
      markdown: 'frontend/artifacts/td11/tangtang_collectible_threshold_correction_spec.md',
      script: 'frontend/scripts/tangtang_collectible_threshold_correction_spec_unit_test.mjs',
    },
    verificationCommands: [
      'node scripts/tangtang_collectible_threshold_correction_spec_unit_test.mjs',
      'node scripts/tangtang_formula_correction_candidates_unit_test.mjs',
      'node scripts/tangtang_in_game_damage_validation_unit_test.mjs',
      'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
      'git diff --check',
    ],
  });
}

function renderDirectRows(rows) {
  return [
    '| Atom row | Source condition | Direct condition | Value | Channel | Stage unchanged | Eligible now |',
    '|---|---|---|---:|---|---|---|',
    ...rows.map((row) => `| ${[
      row.atomRowId,
      row.sourceConditionOrThreshold,
      row.directConditionOrThreshold,
      row.directParsedFormulaValue,
      row.directStatChannel,
      row.multiplierStageUnchanged,
      row.correctionEligibleNow,
    ].map(cell).join(' | ')} |`),
  ].join('\n');
}

function renderInferredRows(rows) {
  return [
    '| Atom row | Source condition | Inferred condition | Value | Channel | Status |',
    '|---|---|---|---:|---|---|',
    ...rows.map((row) => `| ${[
      row.atomRowId,
      row.sourceConditionOrThreshold,
      row.inferredDirectConditionOrThreshold,
      row.sourceParsedFormulaValue,
      row.rustStatChannel,
      row.evidenceClass,
    ].map(cell).join(' | ')} |`),
  ].join('\n');
}

function renderMarkdown(spec) {
  return `# ${spec.title}

generatedAtKst: ${spec.generatedAtKst}
status: ${spec.status}
claim: \`${spec.claim}\`
behaviorChange: \`${spec.behaviorChange}\`

## Decision

- Status: \`${spec.decision.status}\`
- Scoring changed: \`${spec.decision.scoringChanged}\`
- Corrected mode implemented: \`${spec.decision.correctedModeImplemented}\`
- Correction eligible now: \`${spec.decision.correctionEligibleNow}\`
- Rationale: ${spec.decision.rationale}

Required before application:

${spec.decision.requiredBeforeApplication.map((item) => `- ${item}`).join('\n')}

## SIO-Equivalent Contract

- Full SIO equivalent: \`${spec.equivalenceContract.fullSioEquivalent}\`
- Current scorer: \`${spec.equivalenceContract.currentScorer}\`
- Default behavior changed: \`${spec.equivalenceContract.defaultBehaviorChanged}\`
- Proposed corrected scorer: \`${spec.correctedContract.proposedScorer}\`
- Corrected scorer status: \`${spec.correctedContract.status}\`

## Summary

- Direct confirmed correction rows: ${spec.summary.directConfirmedCorrectionRows}
- Threshold-only mismatch rows: ${spec.summary.thresholdOnlyMismatchRows}
- Source threshold 15 rows: ${spec.summary.sourceThreshold15Rows}
- Direct threshold 19 rows: ${spec.summary.directThreshold19Rows}
- Value unchanged rows: ${spec.summary.valueUnchangedRows}
- Stat/channel unchanged rows: ${spec.summary.statChannelUnchangedRows}
- Multiplier-stage unchanged rows: ${spec.summary.multiplierStageUnchangedRows}
- Correction eligible rows: ${spec.summary.correctionEligibleRows}
- Direct observed damage trials: ${spec.summary.directObservedDamageTrialCount}
- 3-item gold/red ATK% universe rows: ${spec.summary.threeItemGoldRedAtkPercentUniverseRows}
- Inferred-family pending rows: ${spec.summary.inferredFamilyPendingRows}

## Direct Confirmed Rows

${renderDirectRows(spec.directConfirmedRows)}

## Inferred-Family Pending Rows

${renderInferredRows(spec.inferredFamilyRows)}

## UI Exposure Guard

- User-facing product name: \`${spec.uiExposureGuard.userFacingProductName}\`
- User-facing SIO term exposed: \`${spec.uiExposureGuard.userFacingSioTermExposed}\`
- Raw SIO LM JSON exposed: \`${spec.uiExposureGuard.rawSioLmJsonExposed}\`
- Debug UI exposed: \`${spec.uiExposureGuard.debugUiExposed}\`
- Preselect UI exposed: \`${spec.uiExposureGuard.preselectUiExposed}\`
- Beam UI exposed: \`${spec.uiExposureGuard.beamUiExposed}\`
- Exact node cap UI exposed: \`${spec.uiExposureGuard.exactNodeCapUiExposed}\`
- UI changed: \`${spec.uiExposureGuard.uiChanged}\`

## Caveats

${spec.caveats.map((item) => `- ${item}`).join('\n')}

## Evidence Artifacts

${spec.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${spec.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const spec = buildSpec();
const serializedJson = `${JSON.stringify(spec, null, 2)}\n`;
const markdown = renderMarkdown(spec);

assert.equal(spec.title, 'Tangtang Collectible Threshold Correction Spec');
assert.equal(spec.status, '[TANGTANG-COLLECTIBLE-THRESHOLD-CORRECTION-SPEC-GREEN]');
assert.equal(spec.claim, 'tangtang-description-corrected-candidate');
assert.equal(spec.behaviorChange, false);
assert.equal(spec.decision.status, 'candidate-only-not-applied');
assert.equal(spec.decision.scoringChanged, false);
assert.equal(spec.decision.correctedModeImplemented, false);
assert.equal(spec.decision.correctionEligibleNow, false);
assert.equal(spec.summary.directConfirmedCorrectionRows, 4);
assert.equal(spec.summary.thresholdOnlyMismatchRows, 4);
assert.equal(spec.summary.sourceThreshold15Rows, 4);
assert.equal(spec.summary.directThreshold19Rows, 4);
assert.equal(spec.summary.valueUnchangedRows, 4);
assert.equal(spec.summary.statChannelUnchangedRows, 4);
assert.equal(spec.summary.multiplierStageUnchangedRows, 4);
assert.equal(spec.summary.correctionEligibleRows, 0);
assert.equal(spec.summary.directObservedDamageTrialCount, 0);
assert.equal(spec.summary.threeItemGoldRedAtkPercentUniverseRows, 34);
assert.equal(spec.summary.inferredFamilyPendingRows, 30);
assert.deepEqual(spec.directConfirmedRows.map((row) => row.atomRowId), EXPECTED_DIRECT_ROW_IDS);
assert.ok(spec.directConfirmedRows.every((row) => row.mismatchFields.length === 1));
assert.ok(spec.directConfirmedRows.every((row) => row.mismatchFields[0] === 'conditionOrThreshold'));
assert.ok(spec.directConfirmedRows.every((row) => row.sourceThreshold.threshold === 15));
assert.ok(spec.directConfirmedRows.every((row) => row.directThreshold.threshold === 19));
assert.ok(spec.directConfirmedRows.every((row) => row.valueUnchanged));
assert.ok(spec.directConfirmedRows.every((row) => row.statChannelUnchanged));
assert.ok(spec.directConfirmedRows.every((row) => row.multiplierStageUnchanged));
assert.ok(spec.directConfirmedRows.every((row) => row.correctionEligibleNow === false));
assert.ok(spec.inferredFamilyRows.every((row) => row.evidenceClass === 'inferred-family-pending'));
assert.ok(spec.inferredFamilyRows.every((row) => row.correctionAppliedNow === false));
assert.equal(spec.equivalenceContract.fullSioEquivalent, true);
assert.equal(spec.equivalenceContract.currentScorer, 'sio_full_lm_equivalence');
assert.equal(spec.equivalenceContract.scorer, 'sio_full_lm_equivalence');
assert.equal(spec.equivalenceContract.defaultBehaviorChanged, false);
assert.equal(spec.correctedContract.status, 'not-implemented-blocked-by-evidence-policy');
assert.equal(spec.correctedContract.mustNotMutateSioEquivalentMode, true);
assert.equal(spec.uiExposureGuard.userFacingProductName, 'Tangtang');
assert.equal(spec.uiExposureGuard.userFacingSioTermExposed, false);
assert.equal(spec.uiExposureGuard.rawSioLmJsonExposed, false);
assert.equal(spec.uiExposureGuard.debugUiExposed, false);
assert.equal(spec.uiExposureGuard.preselectUiExposed, false);
assert.equal(spec.uiExposureGuard.beamUiExposed, false);
assert.equal(spec.uiExposureGuard.exactNodeCapUiExposed, false);
assert.equal(spec.uiExposureGuard.uiChanged, false);
assert.ok(candidatesMd.includes('Correction candidate rows: 4'));
assert.ok(additionalSetAuditMd.includes('HP-only set screenshots'));
assert.equal(additionalSetAudit.decision.canApplyTangtangFormulaCorrectionNow, false);
assert.equal(captureImport.summary.descriptionSioDivergenceRows, 4);
assert.equal(inGameDamageValidation.decisionPolicy.canApplyTangtangFormulaCorrection, false);
assert.ok(markdown.includes('candidate-only-not-applied'));
assert.ok(markdown.includes('inferred-family-pending'));
assert.ok(markdown.includes('Direct observed damage trials: 0'));

if (writeMode) {
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, serializedJson);
  await fs.writeFile(mdPath, markdown);
  console.log(`tangtang_collectible_threshold_correction_spec_unit_test: wrote ${jsonPath} and ${mdPath}`);
} else {
  const [existingJson, existingMd] = await Promise.all([
    fs.readFile(jsonPath, 'utf8'),
    fs.readFile(mdPath, 'utf8'),
  ]);
  assert.equal(existingJson, serializedJson, 'Tangtang collectible threshold correction spec JSON is stale; run with --write');
  assert.equal(existingMd, markdown, 'Tangtang collectible threshold correction spec MD is stale; run with --write');
  console.log(
    `tangtang_collectible_threshold_correction_spec_unit_test: passed (${spec.summary.directConfirmedCorrectionRows} direct rows, ${spec.summary.inferredFamilyPendingRows} inferred pending rows)`,
  );
}
