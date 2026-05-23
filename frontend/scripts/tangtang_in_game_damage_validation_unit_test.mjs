import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const matrixPath = path.join(root, 'artifacts/td11/tangtang_in_game_damage_validation_matrix.json');
const protocolPath = path.join(root, 'artifacts/td11/tangtang_in_game_damage_validation_protocol.md');

const SOURCE_INPUTS = [
  'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
  'frontend/artifacts/td11/tangtang_damage_formula_spec.md',
  'frontend/artifacts/td11/damage_formula_provenance_matrix.md',
  'frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json',
  'frontend/artifacts/td11/sio_tools_live_evidence_matrix.json',
  'frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json',
  'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
  'frontend/artifacts/td11/collectible_effect_mapping_matrix.json',
  'frontend/artifacts/td11/mount_damage_source_fixture.json',
  'frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json',
  'frontend/artifacts/td11/sio_lm_equivalence_matrix.json',
];

const HIGH_RISK_TRIAL_GROUPS = [
  {
    id: 'baseline-attack-aggregate',
    priority: 1,
    stageRefs: ['en0'],
    variableUnderTest: 'attack/base aggregate',
    observationMethod:
      'Hold all damage multipliers constant, change only attack/base inputs, compare observed damage ratio to predicted attack ratio.',
    minimumIndependentTrials: 3,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'skill-damage-stage-order',
    priority: 1,
    stageRefs: ['sio-trace-skillDamage', 'local-en2-caveat'],
    variableUnderTest: 'skillDamage stage ordering',
    observationMethod:
      'Use one active skill and vary only skillDamage-producing inputs to determine whether in-game ordering matches SIO trace behavior.',
    minimumIndependentTrials: 5,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'vulnerability-and-status-uptime',
    priority: 1,
    stageRefs: ['en2', 'en3', 'en4', 'en8'],
    variableUnderTest: 'vulnerability/status/uptime multipliers',
    observationMethod:
      'Capture paired trials with and without each status effect; use ratio validation before attempting absolute damage validation.',
    minimumIndependentTrials: 5,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'boss-damage',
    priority: 1,
    stageRefs: ['en22'],
    variableUnderTest: 'damageBoss',
    observationMethod:
      'Compare boss-target damage with controlled non-boss baseline where possible, isolating only boss damage changes.',
    minimumIndependentTrials: 3,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'lme-phase-damage',
    priority: 1,
    stageRefs: ['en24'],
    variableUnderTest: 'lme1Damage',
    observationMethod:
      'Run LME phase-specific paired observations and compare LME damage ratios against non-LME baseline predictions.',
    minimumIndependentTrials: 3,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'mount-damage-ce-contribution',
    priority: 1,
    stageRefs: ['mountDamage', 'ceDamage.mount'],
    variableUnderTest: 'mountDamage contribution',
    observationMethod:
      'Use active mount rows with non-zero mountDamage and compare isolated mount-on/mount-off observed ratios.',
    minimumIndependentTrials: 3,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'collectible-thresholds',
    priority: 2,
    stageRefs: ['collectible-thresholds', 'collectible-special-rust-mappings'],
    variableUnderTest: 'collectible item/set threshold effects',
    observationMethod:
      'Cross threshold boundaries one at a time and compare observed ratios against the mapped source/Rust stat channel.',
    minimumIndependentTrials: 5,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'collaboration-survivors',
    priority: 2,
    stageRefs: ['SpongeBob', 'Squidward', 'Yelena'],
    variableUnderTest: 'target survivor transforms',
    observationMethod:
      'Capture direct first-party survivor description and paired damage observations for each source/live-backed survivor.',
    minimumIndependentTrials: 3,
    currentObservedTrials: 0,
    currentStatus: 'needs-direct-in-game-damage-observations',
  },
  {
    id: 'non-ss-weapons',
    priority: 3,
    stageRefs: ['non-SS-weapons'],
    variableUnderTest: 'non-SS weapon formula contribution',
    observationMethod:
      'Keep non-SS weapons catalog-only until direct source/description and observed damage fixtures establish formula inputs.',
    minimumIndependentTrials: 3,
    currentObservedTrials: 0,
    currentStatus: 'blocked-catalog-only',
  },
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

const [
  formulaSpec,
  formulaSpecMarkdown,
  provenanceMatrix,
  sourceEvidence,
  liveEvidence,
  targetedLiveEvidence,
  inGameDescriptionEvidence,
  collectibleEffectMapping,
  mountDamageSourceFixture,
  traceSummary,
  equivalenceMatrix,
] = await Promise.all([
  readJson('frontend/artifacts/td11/tangtang_damage_formula_spec.json'),
  readText('frontend/artifacts/td11/tangtang_damage_formula_spec.md'),
  readText('frontend/artifacts/td11/damage_formula_provenance_matrix.md'),
  readJson('frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/sio_tools_live_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/in_game_description_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/collectible_effect_mapping_matrix.json'),
  readJson('frontend/artifacts/td11/mount_damage_source_fixture.json'),
  readJson('frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json'),
  readJson('frontend/artifacts/td11/sio_lm_equivalence_matrix.json'),
]);

for (const input of SOURCE_INPUTS) {
  await fs.access(path.join(root, input.replace(/^frontend\//, '')));
}

function buildMatrix() {
  const directObservedDamageTrials = [];
  const totalMinimumTrials = HIGH_RISK_TRIAL_GROUPS.reduce((sum, group) => sum + group.minimumIndependentTrials, 0);
  const completedMinimumTrials = HIGH_RISK_TRIAL_GROUPS.reduce((sum, group) => sum + group.currentObservedTrials, 0);
  return stableObject({
    title: 'Tangtang In-Game Damage Validation Gate',
    generatedAtKst: formulaSpec.generatedAtKst,
    status: '[TANGTANG-IN-GAME-DAMAGE-VALIDATION-PROTOCOL-READY]',
    claim: 'in-game-validation-protocol',
    behaviorChange: false,
    sourceInputs: SOURCE_INPUTS,
    validationScope: {
      purpose:
        'Validate whether the current SIO Tools-equivalent damage formula matches direct in-game observed damage before allowing Tangtang-specific formula improvements.',
      currentSioEquivalentClaim: formulaSpec.claim,
      currentInGameCorrectnessClaim: 'not-established',
      directObservedDamageTrialCount: directObservedDamageTrials.length,
      directFirstPartyDescriptionVerifiedRows: formulaSpec.summaryCounts.inGameDescriptionVerifiedRows,
      fullSioEquivalent: equivalenceMatrix.fullSioEquivalent,
      currentScorer: equivalenceMatrix.currentScorer,
      scorer: equivalenceMatrix.scorer,
    },
    observationSchema: {
      requiredFields: [
        'trialId',
        'captureDateKst',
        'gameVersion',
        'mode',
        'targetType',
        'controlledVariable',
        'baselineStateSnapshot',
        'variantStateSnapshot',
        'observedBaselineDamageSamples',
        'observedVariantDamageSamples',
        'predictedBaselineDamage',
        'predictedVariantDamage',
        'predictedRatio',
        'observedRatio',
        'relativeError',
        'rawCaptureArtifactPaths',
        'verdict',
      ],
      verdicts: ['pending', 'matches-sio-within-tolerance', 'sio-divergent-needs-replication', 'invalid-uncontrolled-trial'],
      ratioFirst: true,
      absoluteDamageValidation:
        'Allowed only after target defense, rounding, RNG, crit/non-crit split, skill tick identity, and buff uptime are isolated.',
      defaultRatioTolerancePercent: 1,
      replicationRequirement:
        'A SIO-divergent finding needs at least three independent controlled trials for the same variable before Tangtang formula correction can be proposed.',
    },
    trialGroups: HIGH_RISK_TRIAL_GROUPS,
    directObservedDamageTrials,
    decisionPolicy: {
      initialDecision:
        'No direct in-game observed damage trials are present, so SIO formula correctness is not established by this gate.',
      canClaimSioFormulaInGameCorrect: false,
      canApplyTangtangFormulaCorrection: false,
      canKeepCurrentTangtangFormula: true,
      userFacingClaimLimit:
        'Tangtang may claim SIO Tools-equivalent source/live backing only; it must not claim official direct in-game formula verification.',
    },
    correctionPolicy: {
      allowedOnlyWhen: [
        'direct observed in-game damage trials exist for the affected variable',
        'paired ratio-first observations isolate a single variable',
        'at least three independent controlled trials reproduce a SIO divergence',
        'a Tangtang correction spec documents the difference from SIO and the in-game evidence',
        'existing SIO-equivalence behavior is intentionally superseded behind an explicit gate',
      ],
      currentCorrectionStatus: 'blocked-no-direct-observed-damage-trials',
      tangtangMayImproveBeyondSio: true,
      tangtangMayImproveBeyondSioNow: false,
    },
    currentEvidenceSummary: {
      formulaSpecStatus: formulaSpec.status,
      formulaSpecClaim: formulaSpec.claim,
      formulaSpecBehaviorChange: formulaSpec.behaviorChange,
      rawSourceLeafRows: sourceEvidence.summary.rawSourceLeafRows,
      rawSourceLeafRowsWithDirectMultiplierStage: sourceEvidence.summary.rawSourceLeafRowsWithDirectMultiplierStage,
      liveCaptureCount: liveEvidence.summary.liveCaptureCases,
      workerParityArbitraryGeneratedLiveExpected: `${liveEvidence.summary.liveCapturedCases}/${liveEvidence.summary.liveCaptureCases}`,
      targetedLiveCaptureCases: targetedLiveEvidence.summary.targetedLiveCaptureCases,
      targetSurvivorLiveRows: targetedLiveEvidence.summary.targetSurvivorLiveRows,
      mountNormalizedClaims: sourceEvidence.summary.mountNormalizedClaims,
      nonZeroMountDamageLiveRows: liveEvidence.summary.nonZeroMountDamageLiveRows,
      collectibleThresholdRows: collectibleEffectMapping.summary.thresholdRows,
      collectibleSpecialRustMappings: sourceEvidence.summary.collectibleSpecialRustMappings,
      catalogOnlyCollectibleRows: sourceEvidence.summary.collectibleCatalogOnlyRows,
      directInGameDescriptionVerifiedRows: sourceEvidence.summary.inGameDescriptionVerifiedRows,
      mountDamageSourceFixtureRows: mountDamageSourceFixture.summary.totalRows,
      traceStageProductPassed: traceSummary.summary.stageProductPassed,
      traceCases: traceSummary.summary.cases,
      knownStageLabelCaveat:
        'Live SIO trace factors include standalone skillDamage; local Tangtang/Rust provenance labels keep en2 as vulnerability and en24 as LME phase damage.',
    },
    blockers: [
      'No direct in-game observed damage trial pack exists yet.',
      'Direct first-party in-game description verified rows remain 0.',
      'SIO Tools source/live equivalence is not the same as proving SIO formula correctness against game damage.',
      'non-SS weapons remain catalog-only unsupported as formula inputs.',
      'Mount exact per-line in-game text capture remains missing.',
      'Collectible item/set direct description capture remains incomplete.',
    ],
    verificationCommands: [
      'node scripts/tangtang_in_game_damage_validation_unit_test.mjs',
      'node scripts/tangtang_damage_formula_spec_unit_test.mjs',
      'node scripts/damage_formula_provenance_matrix_unit_test.mjs',
      'node scripts/in_game_description_evidence_unit_test.mjs',
      'node scripts/sio_tools_live_evidence_matrix_unit_test.mjs',
      'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
      'git diff --check',
    ],
    artifactPaths: {
      matrix: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
      protocol: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md',
      script: 'frontend/scripts/tangtang_in_game_damage_validation_unit_test.mjs',
      formulaSpecJson: 'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
      formulaSpecMarkdown: 'frontend/artifacts/td11/tangtang_damage_formula_spec.md',
      provenanceMatrix: 'frontend/artifacts/td11/damage_formula_provenance_matrix.md',
    },
  });
}

function renderTrialGroupTable(groups) {
  return [
    '| Priority | Trial group | Variable | Minimum trials | Current trials | Status | Method |',
    '|---:|---|---|---:|---:|---|---|',
    ...groups.map((group) => [
      group.priority,
      group.id,
      group.variableUnderTest,
      group.minimumIndependentTrials,
      group.currentObservedTrials,
      group.currentStatus,
      group.observationMethod,
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function renderProtocol(matrix) {
  return `# Tangtang In-Game Damage Validation Protocol

generatedAtKst: ${matrix.generatedAtKst}
status: ${matrix.status}
claim: \`${matrix.claim}\`
behaviorChange: \`${matrix.behaviorChange}\`

## Purpose

This gate is for validating whether the current SIO Tools-equivalent damage formula matches direct in-game observed damage. It is separate from the existing Tangtang=SIO equivalence gates.

Current decision:

- SIO formula in-game correctness claim: \`${matrix.validationScope.currentInGameCorrectnessClaim}\`
- Direct observed in-game damage trials: ${matrix.validationScope.directObservedDamageTrialCount}
- Direct first-party description verified rows: ${matrix.validationScope.directFirstPartyDescriptionVerifiedRows}
- Tangtang formula correction allowed now: \`${matrix.correctionPolicy.tangtangMayImproveBeyondSioNow}\`
- Current Tangtang formula may remain: \`${matrix.decisionPolicy.canKeepCurrentTangtangFormula}\`

## Validation Method

Use ratio-first validation. Each trial changes one controlled variable while holding the rest of the build, mode, target, crit/non-crit path, skill tick identity, and buff uptime constant. Absolute damage validation is allowed only after target defense, rounding, RNG, and hit identity are isolated.

If SIO and observed damage diverge, Tangtang can improve beyond SIO only after repeated controlled evidence exists and a correction spec documents the exact divergence. Until then, Tangtang remains limited to the SIO Tools-equivalent claim.

## Observation Schema

Required fields:

${matrix.observationSchema.requiredFields.map((field) => `- \`${field}\``).join('\n')}

Verdicts:

${matrix.observationSchema.verdicts.map((verdict) => `- \`${verdict}\``).join('\n')}

Default ratio tolerance: ${matrix.observationSchema.defaultRatioTolerancePercent}%

Replication requirement: ${matrix.observationSchema.replicationRequirement}

## Trial Groups

${renderTrialGroupTable(matrix.trialGroups)}

## Current Evidence Summary

- Formula spec claim: \`${matrix.currentEvidenceSummary.formulaSpecClaim}\`
- Formula behavior change: \`${matrix.currentEvidenceSummary.formulaSpecBehaviorChange}\`
- Raw source stat leaves: ${matrix.currentEvidenceSummary.rawSourceLeafRows}
- Live capture count: ${matrix.currentEvidenceSummary.liveCaptureCount}
- Worker parity: ${matrix.currentEvidenceSummary.workerParityArbitraryGeneratedLiveExpected}
- Target survivor live rows: ${matrix.currentEvidenceSummary.targetSurvivorLiveRows}
- Mount normalized claims: ${matrix.currentEvidenceSummary.mountNormalizedClaims}
- Non-zero mountDamage live rows: ${matrix.currentEvidenceSummary.nonZeroMountDamageLiveRows}
- Collectible threshold rows: ${matrix.currentEvidenceSummary.collectibleThresholdRows}
- Collectible special Rust mappings: ${matrix.currentEvidenceSummary.collectibleSpecialRustMappings}
- Direct in-game description verified rows: ${matrix.currentEvidenceSummary.directInGameDescriptionVerifiedRows}
- Stage label caveat: ${matrix.currentEvidenceSummary.knownStageLabelCaveat}

## Blockers

${matrix.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Correction Policy

Tangtang may improve beyond SIO in principle, but not from source/live equivalence evidence alone. A correction is blocked until all of these are true:

${matrix.correctionPolicy.allowedOnlyWhen.map((item) => `- ${item}`).join('\n')}

Current correction status: \`${matrix.correctionPolicy.currentCorrectionStatus}\`

## Evidence Artifacts

${matrix.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${matrix.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const matrix = buildMatrix();
const protocol = renderProtocol(matrix);
const serializedMatrix = `${JSON.stringify(matrix, null, 2)}\n`;

assert.equal(matrix.title, 'Tangtang In-Game Damage Validation Gate');
assert.equal(matrix.claim, 'in-game-validation-protocol');
assert.equal(matrix.behaviorChange, false);
assert.equal(matrix.validationScope.currentSioEquivalentClaim, 'sio-tools-equivalent');
assert.equal(matrix.validationScope.currentInGameCorrectnessClaim, 'not-established');
assert.equal(matrix.validationScope.directObservedDamageTrialCount, 0);
assert.equal(matrix.validationScope.directFirstPartyDescriptionVerifiedRows, 0);
assert.equal(matrix.validationScope.fullSioEquivalent, true);
assert.equal(matrix.validationScope.currentScorer, 'sio_full_lm_equivalence');
assert.equal(matrix.validationScope.scorer, 'sio_full_lm_equivalence');
assert.equal(matrix.decisionPolicy.canClaimSioFormulaInGameCorrect, false);
assert.equal(matrix.decisionPolicy.canApplyTangtangFormulaCorrection, false);
assert.equal(matrix.decisionPolicy.canKeepCurrentTangtangFormula, true);
assert.equal(matrix.correctionPolicy.currentCorrectionStatus, 'blocked-no-direct-observed-damage-trials');
assert.equal(matrix.correctionPolicy.tangtangMayImproveBeyondSio, true);
assert.equal(matrix.correctionPolicy.tangtangMayImproveBeyondSioNow, false);
assert.equal(matrix.currentEvidenceSummary.rawSourceLeafRows, 4650);
assert.equal(matrix.currentEvidenceSummary.liveCaptureCount, 26);
assert.equal(matrix.currentEvidenceSummary.workerParityArbitraryGeneratedLiveExpected, '26/26');
assert.equal(matrix.currentEvidenceSummary.targetSurvivorLiveRows, 3);
assert.equal(matrix.currentEvidenceSummary.mountNormalizedClaims, 26);
assert.equal(matrix.currentEvidenceSummary.nonZeroMountDamageLiveRows, 2);
assert.equal(matrix.currentEvidenceSummary.collectibleThresholdRows, 170);
assert.equal(matrix.currentEvidenceSummary.collectibleSpecialRustMappings, 14);
assert.equal(matrix.currentEvidenceSummary.directInGameDescriptionVerifiedRows, 0);
assert.equal(matrix.directObservedDamageTrials.length, 0);
assert.ok(matrix.trialGroups.length >= 8, 'high-risk in-game validation trial groups must stay explicit');
assert.ok(matrix.trialGroups.some((group) => group.id === 'skill-damage-stage-order'));
assert.ok(matrix.trialGroups.some((group) => group.id === 'mount-damage-ce-contribution'));
assert.ok(matrix.trialGroups.some((group) => group.id === 'non-ss-weapons' && group.currentStatus === 'blocked-catalog-only'));
assert.ok(formulaSpecMarkdown.includes('behaviorChange: `false`'));
assert.ok(provenanceMatrix.includes('Formula derivation is now available'));
assert.ok(protocol.includes('Tangtang may improve beyond SIO in principle'));
assert.ok(protocol.includes('Direct observed in-game damage trials: 0'));
assert.ok(protocol.includes('SIO Tools-equivalent claim'));

if (writeMode) {
  await fs.mkdir(path.dirname(matrixPath), { recursive: true });
  await fs.writeFile(matrixPath, serializedMatrix);
  await fs.writeFile(protocolPath, protocol);
  console.log(`tangtang_in_game_damage_validation_unit_test: wrote ${matrixPath} and ${protocolPath}`);
} else {
  const [existingMatrix, existingProtocol] = await Promise.all([
    fs.readFile(matrixPath, 'utf8'),
    fs.readFile(protocolPath, 'utf8'),
  ]);
  assert.equal(existingMatrix, serializedMatrix, 'Tangtang in-game damage validation matrix is stale; run with --write');
  assert.equal(existingProtocol, protocol, 'Tangtang in-game damage validation protocol is stale; run with --write');
  console.log(`tangtang_in_game_damage_validation_unit_test: passed (${matrix.trialGroups.length} trial groups, 0 direct trials)`);
}
