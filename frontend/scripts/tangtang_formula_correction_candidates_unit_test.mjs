import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const matrixPath = path.join(root, 'artifacts/td11/tangtang_formula_correction_candidates.json');
const protocolPath = path.join(root, 'artifacts/td11/tangtang_formula_correction_candidates.md');

const SOURCE_INPUTS = [
  'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
  'frontend/artifacts/td11/tangtang_description_capture_import_protocol.md',
  'frontend/artifacts/td11/tangtang_random_capture_sample_audit.json',
  'frontend/artifacts/td11/tangtang_random_capture_sample_audit.md',
  'frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.json',
  'frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.md',
  'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
  'frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md',
  'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
  'frontend/artifacts/td11/sio_lm_equivalence_matrix.json',
];

const EXPECTED_CANDIDATE_ROW_IDS = [
  'collectible-set:genesis:gold:15:atkPercent',
  'collectible-set:genesis:red:15:atkPercent',
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

function parseThreshold(condition) {
  const match = String(condition ?? '').match(/^(gold|red|total|stars|gold_each|red_each)\s*>=\s*(\d+(?:\.\d+)?)$/);
  if (!match) {
    return null;
  }
  return {
    metric: match[1],
    threshold: Number(match[2]),
  };
}

function rawCaptureEvidenceBuckets(paths) {
  const buckets = new Set();
  for (const artifactPath of paths ?? []) {
    if (artifactPath.includes('/2026-05-23-random-sample/')) {
      buckets.add('random-sample');
    }
    if (artifactPath.includes('/2026-05-23-targeted-followup/')) {
      buckets.add('targeted-followup');
    }
  }
  return [...buckets].sort();
}

const [
  captureImport,
  captureImportProtocol,
  randomCaptureAudit,
  randomCaptureAuditMarkdown,
  targetedFollowupAudit,
  targetedFollowupAuditMarkdown,
  inGameDamageValidation,
  inGameDamageValidationProtocol,
  formulaSpec,
  equivalenceMatrix,
] = await Promise.all([
  readJson('frontend/artifacts/td11/tangtang_description_capture_import_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_description_capture_import_protocol.md'),
  readJson('frontend/artifacts/td11/tangtang_random_capture_sample_audit.json'),
  readText('frontend/artifacts/td11/tangtang_random_capture_sample_audit.md'),
  readJson('frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.json'),
  readText('frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.md'),
  readJson('frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md'),
  readJson('frontend/artifacts/td11/tangtang_damage_formula_spec.json'),
  readJson('frontend/artifacts/td11/sio_lm_equivalence_matrix.json'),
]);

for (const input of SOURCE_INPUTS) {
  await fs.access(path.join(root, input.replace(/^frontend\//, '')));
}

function buildCandidateRows() {
  return captureImport.importedCaptureRows
    .filter((row) => row.comparisonVerdict === 'description-sio-divergent-needs-confirmation')
    .map((row) => {
      const current = row.atomSnapshotBeforeCaptureImport;
      const sourceThreshold = parseThreshold(current?.conditionOrThreshold);
      const capturedThreshold = parseThreshold(row.conditionOrThreshold);
      const rawCaptureArtifactPaths = [...(row.rawCaptureArtifactPaths ?? [])].sort();
      const valueMatchesCurrent = Number(row.parsedFormulaValue) === Number(current?.parsedFormulaValue);
      const statChannelMatchesCurrent = String(row.rustStatChannel) === String(current?.rustStatChannel);
      const multiplierStageMatchesCurrent = String(row.multiplierStage) === String(current?.multiplierStage);
      return stableObject({
        candidateId: `tangtang-correction:${row.atomRowId}:condition:${sourceThreshold?.threshold ?? 'unknown'}-to-${capturedThreshold?.threshold ?? 'unknown'}`,
        atomRowId: row.atomRowId,
        captureId: row.captureId,
        entityDisplayNameCaptured: row.entityDisplayNameCaptured,
        entityKey: current?.entityKey ?? null,
        sourceEntityDisplayName: current?.entityDisplayName ?? null,
        mismatchType: 'threshold-condition-only',
        mismatchFields: row.mismatchFields,
        currentSioConditionOrThreshold: current?.conditionOrThreshold ?? null,
        directDescriptionConditionOrThreshold: row.conditionOrThreshold,
        proposedTangtangConditionOrThreshold: row.conditionOrThreshold,
        sourceThreshold,
        capturedThreshold,
        currentSioParsedFormulaValue: current?.parsedFormulaValue ?? null,
        directDescriptionParsedFormulaValue: row.parsedFormulaValue,
        valueMatchesCurrent,
        statChannelMatchesCurrent,
        multiplierStageMatchesCurrent,
        rustStatChannel: row.rustStatChannel,
        multiplierStage: row.multiplierStage,
        operationBucket: row.operationBucket,
        parsedFormulaOperation: row.parsedFormulaOperation,
        sioCurrentHandling: current?.sioCurrentHandling ?? null,
        sioSourceKey: current?.sioSourceKey ?? null,
        sioSourcePath: current?.sioSourcePath ?? null,
        tangtangSchemaKey: current?.tangtangSchemaKey ?? null,
        descriptionTextOriginal: row.descriptionTextOriginal,
        rawCaptureArtifactPaths,
        rawCaptureArtifactCount: rawCaptureArtifactPaths.length,
        rawCaptureEvidenceBuckets: rawCaptureEvidenceBuckets(rawCaptureArtifactPaths),
        requiresObservedDamageFollowUp: row.requiresObservedDamageFollowUp,
        correctionEligibleNow: false,
        scoringChangeApplied: false,
        currentDecision:
          'Documented correction candidate only. Do not change Tangtang scoring until correction spec plus observed-damage confirmation exists.',
      });
    })
    .sort((left, right) => left.atomRowId.localeCompare(right.atomRowId));
}

function buildMatrix() {
  const candidateRows = buildCandidateRows();
  const genesisRows = candidateRows.filter((row) => row.entityKey === 'collectible-set:genesis');
  const thresholdOnlyRows = candidateRows.filter((row) => (
    row.mismatchType === 'threshold-condition-only' &&
    row.mismatchFields.length === 1 &&
    row.mismatchFields[0] === 'conditionOrThreshold'
  ));
  const valueMismatchRows = candidateRows.filter((row) => !row.valueMatchesCurrent);
  const statChannelMismatchRows = candidateRows.filter((row) => !row.statChannelMatchesCurrent);
  const multiplierStageMismatchRows = candidateRows.filter((row) => !row.multiplierStageMatchesCurrent);

  return stableObject({
    title: 'Tangtang Formula Correction Candidates',
    generatedAtKst: formulaSpec.generatedAtKst,
    status: '[TANGTANG-FORMULA-CORRECTION-CANDIDATES-GREEN]',
    claim: 'description-derived-correction-candidates',
    behaviorChange: false,
    sourceInputs: SOURCE_INPUTS,
    equivalenceContract: {
      fullSioEquivalent: equivalenceMatrix.fullSioEquivalent,
      currentScorer: equivalenceMatrix.currentScorer,
      scorer: equivalenceMatrix.scorer,
    },
    correctionScope: {
      currentSioEquivalentClaim: formulaSpec.claim,
      currentInGameCorrectnessClaim: inGameDamageValidation.validationScope.currentInGameCorrectnessClaim,
      primaryEvidenceLayer: 'direct first-party item/effect description capture',
      secondaryEvidenceLayer: 'direct observed damage follow-up only after description/SIO divergence',
      correctionType: 'candidate-only-threshold-condition-correction',
      scoringChangeApplied: false,
      formulaSemanticsChanged: false,
      userFacingUiChanged: false,
    },
    candidateRows,
    summary: {
      correctionCandidateRows: candidateRows.length,
      genesisThresholdMismatchRows: genesisRows.length,
      thresholdOnlyMismatchRows: thresholdOnlyRows.length,
      valueMismatchRows: valueMismatchRows.length,
      statChannelMismatchRows: statChannelMismatchRows.length,
      multiplierStageMismatchRows: multiplierStageMismatchRows.length,
      importedDescriptionCaptureRows: captureImport.summary.importedCaptureRows,
      importedDescriptionDivergenceRows: captureImport.summary.descriptionSioDivergenceRows,
      observedDamageFollowUpRows: captureImport.summary.observedDamageFollowUpRows,
      correctionEligibleRows: captureImport.summary.correctionEligibleRows,
      randomSampleDivergenceRows: randomCaptureAudit.summary.descriptionSioDivergenceRowsFromBatch,
      targetedFollowupDivergenceRows: targetedFollowupAudit.summary.descriptionSioDivergenceRowsFromBatch,
      targetedFollowupReinforcedRows: targetedFollowupAudit.summary.reinforcedExistingAtomRowsFromBatch,
      directObservedDamageTrialCount: inGameDamageValidation.validationScope.directObservedDamageTrialCount,
      candidateRowsReadyForScoringChange: candidateRows.filter((row) => row.correctionEligibleNow).length,
    },
    decisionPolicy: {
      currentCorrectionStatus: 'candidate-documented-not-applied',
      canApplyTangtangFormulaCorrectionNow: false,
      canChangeScoringNow: false,
      canKeepCurrentTangtangFormulaNow: true,
      whyNotApplied:
        'The direct first-party description captures repeatedly show a Genesis threshold mismatch, but no correction spec with observed-damage confirmation has been applied yet.',
      requiredBeforeApplication: [
        'keep the candidate isolated from SIO-equivalent source/live claims',
        'write an explicit Tangtang correction spec that supersedes SIO only for the affected rows',
        'add controlled observed-damage follow-up or an approved decision that description text alone is sufficient for this threshold-only input correction',
        'update Rust/WASM scoring semantics behind a dedicated RED/GREEN behavior test',
        'make the equivalence contract explicit because full SIO equivalence would no longer be the applicable claim for corrected rows',
      ],
    },
    artifactPaths: {
      json: 'frontend/artifacts/td11/tangtang_formula_correction_candidates.json',
      markdown: 'frontend/artifacts/td11/tangtang_formula_correction_candidates.md',
      script: 'frontend/scripts/tangtang_formula_correction_candidates_unit_test.mjs',
      captureImportMatrix: 'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
      randomCaptureAudit: 'frontend/artifacts/td11/tangtang_random_capture_sample_audit.json',
      targetedFollowupAudit: 'frontend/artifacts/td11/tangtang_targeted_capture_followup_audit.json',
      inGameDamageValidationMatrix: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
    },
    verificationCommands: [
      'node scripts/tangtang_formula_correction_candidates_unit_test.mjs',
      'node scripts/tangtang_description_capture_import_unit_test.mjs',
      'node scripts/tangtang_targeted_capture_followup_audit_unit_test.mjs',
      'node scripts/tangtang_in_game_damage_validation_unit_test.mjs',
      'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
      'git diff --check',
    ],
  });
}

function renderCandidateTable(rows) {
  return [
    '| Atom row | Current SIO condition | Direct description condition | Value | Channel | Raw capture evidence | Status |',
    '|---|---|---|---:|---|---|---|',
    ...rows.map((row) => [
      row.atomRowId,
      row.currentSioConditionOrThreshold,
      row.directDescriptionConditionOrThreshold,
      row.directDescriptionParsedFormulaValue,
      row.rustStatChannel,
      row.rawCaptureEvidenceBuckets.join(', '),
      row.currentDecision,
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function renderProtocol(matrix) {
  return `# Tangtang Formula Correction Candidates

generatedAtKst: ${matrix.generatedAtKst}
status: ${matrix.status}
claim: \`${matrix.claim}\`
behaviorChange: \`${matrix.behaviorChange}\`

## Scope

This artifact records description-derived Tangtang formula correction candidates. It does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI.

Current decision:

- Correction candidate rows: ${matrix.summary.correctionCandidateRows}
- Genesis threshold mismatch rows: ${matrix.summary.genesisThresholdMismatchRows}
- Threshold-only mismatch rows: ${matrix.summary.thresholdOnlyMismatchRows}
- Value mismatch rows: ${matrix.summary.valueMismatchRows}
- Stat-channel mismatch rows: ${matrix.summary.statChannelMismatchRows}
- Multiplier-stage mismatch rows: ${matrix.summary.multiplierStageMismatchRows}
- Direct observed damage trials: ${matrix.summary.directObservedDamageTrialCount}
- Candidate rows ready for scoring change: ${matrix.summary.candidateRowsReadyForScoringChange}
- Can apply Tangtang correction now: \`${matrix.decisionPolicy.canApplyTangtangFormulaCorrectionNow}\`
- Can change scoring now: \`${matrix.decisionPolicy.canChangeScoringNow}\`
- Current Tangtang formula may remain now: \`${matrix.decisionPolicy.canKeepCurrentTangtangFormulaNow}\`

## Candidates

${renderCandidateTable(matrix.candidateRows)}

## Decision Policy

Current correction status: \`${matrix.decisionPolicy.currentCorrectionStatus}\`

Why not applied: ${matrix.decisionPolicy.whyNotApplied}

Required before application:

${matrix.decisionPolicy.requiredBeforeApplication.map((item) => `- ${item}`).join('\n')}

## Evidence Artifacts

${matrix.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${matrix.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const matrix = buildMatrix();
const protocol = renderProtocol(matrix);
const serializedMatrix = `${JSON.stringify(matrix, null, 2)}\n`;

assert.equal(matrix.title, 'Tangtang Formula Correction Candidates');
assert.equal(matrix.status, '[TANGTANG-FORMULA-CORRECTION-CANDIDATES-GREEN]');
assert.equal(matrix.claim, 'description-derived-correction-candidates');
assert.equal(matrix.behaviorChange, false);
assert.equal(matrix.equivalenceContract.fullSioEquivalent, true);
assert.equal(matrix.equivalenceContract.currentScorer, 'sio_full_lm_equivalence');
assert.equal(matrix.equivalenceContract.scorer, 'sio_full_lm_equivalence');
assert.equal(matrix.correctionScope.scoringChangeApplied, false);
assert.equal(matrix.correctionScope.formulaSemanticsChanged, false);
assert.equal(matrix.correctionScope.userFacingUiChanged, false);
assert.equal(matrix.summary.correctionCandidateRows, 2);
assert.equal(matrix.summary.genesisThresholdMismatchRows, 2);
assert.equal(matrix.summary.thresholdOnlyMismatchRows, 2);
assert.equal(matrix.summary.valueMismatchRows, 0);
assert.equal(matrix.summary.statChannelMismatchRows, 0);
assert.equal(matrix.summary.multiplierStageMismatchRows, 0);
assert.equal(matrix.summary.importedDescriptionCaptureRows, 12);
assert.equal(matrix.summary.importedDescriptionDivergenceRows, 2);
assert.equal(matrix.summary.observedDamageFollowUpRows, 2);
assert.equal(matrix.summary.correctionEligibleRows, 0);
assert.equal(matrix.summary.randomSampleDivergenceRows, 2);
assert.equal(matrix.summary.targetedFollowupDivergenceRows, 2);
assert.equal(matrix.summary.targetedFollowupReinforcedRows, 2);
assert.equal(matrix.summary.directObservedDamageTrialCount, 0);
assert.equal(matrix.summary.candidateRowsReadyForScoringChange, 0);
assert.deepEqual(matrix.candidateRows.map((row) => row.atomRowId), EXPECTED_CANDIDATE_ROW_IDS);
assert.ok(matrix.candidateRows.every((row) => row.mismatchFields.length === 1 && row.mismatchFields[0] === 'conditionOrThreshold'));
assert.ok(matrix.candidateRows.every((row) => row.mismatchType === 'threshold-condition-only'));
assert.ok(matrix.candidateRows.every((row) => row.valueMatchesCurrent));
assert.ok(matrix.candidateRows.every((row) => row.statChannelMatchesCurrent));
assert.ok(matrix.candidateRows.every((row) => row.multiplierStageMatchesCurrent));
assert.ok(matrix.candidateRows.every((row) => row.rustStatChannel === 'atkPercent'));
assert.ok(matrix.candidateRows.every((row) => row.rawCaptureArtifactCount === 2));
assert.ok(matrix.candidateRows.every((row) => row.rawCaptureEvidenceBuckets.join(',') === 'random-sample,targeted-followup'));
assert.equal(
  matrix.candidateRows.find((row) => row.atomRowId.includes(':gold:'))?.currentSioConditionOrThreshold,
  'gold >= 15',
);
assert.equal(
  matrix.candidateRows.find((row) => row.atomRowId.includes(':gold:'))?.directDescriptionConditionOrThreshold,
  'gold >= 19',
);
assert.equal(
  matrix.candidateRows.find((row) => row.atomRowId.includes(':gold:'))?.directDescriptionParsedFormulaValue,
  4,
);
assert.equal(
  matrix.candidateRows.find((row) => row.atomRowId.includes(':red:'))?.currentSioConditionOrThreshold,
  'red >= 15',
);
assert.equal(
  matrix.candidateRows.find((row) => row.atomRowId.includes(':red:'))?.directDescriptionConditionOrThreshold,
  'red >= 19',
);
assert.equal(
  matrix.candidateRows.find((row) => row.atomRowId.includes(':red:'))?.directDescriptionParsedFormulaValue,
  6,
);
assert.equal(matrix.decisionPolicy.currentCorrectionStatus, 'candidate-documented-not-applied');
assert.equal(matrix.decisionPolicy.canApplyTangtangFormulaCorrectionNow, false);
assert.equal(matrix.decisionPolicy.canChangeScoringNow, false);
assert.equal(matrix.decisionPolicy.canKeepCurrentTangtangFormulaNow, true);
assert.ok(captureImportProtocol.includes('Description/SIO divergence rows: 2'));
assert.ok(randomCaptureAuditMarkdown.includes('Genesis'));
assert.ok(targetedFollowupAuditMarkdown.includes('Genesis'));
assert.ok(inGameDamageValidationProtocol.includes('Direct observed in-game damage trials: 0'));

if (writeMode) {
  await fs.mkdir(path.dirname(matrixPath), { recursive: true });
  await fs.writeFile(matrixPath, serializedMatrix);
  await fs.writeFile(protocolPath, protocol);
  console.log(`tangtang_formula_correction_candidates_unit_test: wrote ${matrixPath} and ${protocolPath}`);
} else {
  const [existingMatrix, existingProtocol] = await Promise.all([
    fs.readFile(matrixPath, 'utf8'),
    fs.readFile(protocolPath, 'utf8'),
  ]);
  assert.equal(existingMatrix, serializedMatrix, 'Tangtang formula correction candidates matrix is stale; run with --write');
  assert.equal(existingProtocol, protocol, 'Tangtang formula correction candidates markdown is stale; run with --write');
  console.log(`tangtang_formula_correction_candidates_unit_test: passed (${matrix.summary.correctionCandidateRows} correction candidates)`);
}
