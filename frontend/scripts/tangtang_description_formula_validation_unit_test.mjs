import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const matrixPath = path.join(root, 'artifacts/td11/tangtang_description_formula_validation_matrix.json');
const protocolPath = path.join(root, 'artifacts/td11/tangtang_description_formula_validation_protocol.md');

const SOURCE_INPUTS = [
  'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
  'frontend/artifacts/td11/tangtang_damage_formula_spec.md',
  'frontend/artifacts/td11/damage_formula_provenance_matrix.md',
  'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
  'frontend/artifacts/td11/collectible_effect_mapping_matrix.json',
  'frontend/artifacts/td11/mount_damage_source_fixture.json',
  'frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json',
  'frontend/artifacts/td11/sio_tools_live_evidence_matrix.json',
  'frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json',
  'frontend/artifacts/td11/sio_lm_equivalence_matrix.json',
];

const DESCRIPTION_GROUPS = [
  {
    id: 'ss-equipment-and-twin-lance',
    priority: 1,
    scope: 'SS equipment and Twin Lance formula-affecting descriptions',
    currentEvidence: 'SIO source/live equivalent; direct per-line in-game formula descriptions not fully captured.',
    requiredNextEvidence:
      'Capture first-party item descriptions and parse each damage-affecting phrase into stat channel, operation, stage role, and SIO comparison.',
  },
  {
    id: 'skill-damage-stage-order',
    priority: 1,
    scope: 'skillDamage description phrases and SIO trace standalone factor',
    currentEvidence: 'SIO live trace exposes skillDamage as a standalone factor; local provenance labels keep en2 as vulnerability.',
    requiredNextEvidence:
      'Parse skill damage descriptions separately from vulnerability and compare their intended operation against SIO trace factor ordering.',
  },
  {
    id: 'status-and-uptime-descriptions',
    priority: 1,
    scope: 'vulnerability, shield, poison, weaken, chill, laceration, Divine Fire descriptions',
    currentEvidence: 'Source/live stat channels exist; direct description-to-uptime operation mapping remains incomplete.',
    requiredNextEvidence:
      'Capture description text for each status/uptime source and derive whether the phrase implies additive percent, uptime weighting, or conditional multiplier.',
  },
  {
    id: 'mount-line-descriptions',
    priority: 1,
    scope: 'Mount stat lines and mountDamage contribution',
    currentEvidence: 'mountDamage source/live evidence exists; exact per-line in-game text capture is missing.',
    requiredNextEvidence:
      'Capture exact mount line descriptions and derive stat line formula plus mountDamage CE contribution before any formula correction.',
  },
  {
    id: 'collectible-item-set-descriptions',
    priority: 1,
    scope: 'Collectible item/set threshold descriptions',
    currentEvidence: '170 threshold rows and 14 special Rust mappings are source/Rust backed; item/set-level direct descriptions are incomplete.',
    requiredNextEvidence:
      'Capture item/set descriptions and map description threshold -> SIO source key -> Rust stat channel -> multiplier stage.',
  },
  {
    id: 'collaboration-survivor-descriptions',
    priority: 2,
    scope: 'SpongeBob, Squidward, Yelena descriptions',
    currentEvidence: 'source/live backed with public-web corroboration, but no direct first-party description capture.',
    requiredNextEvidence:
      'Capture direct survivor descriptions and parse each passive/star/level phrase into formula channels before claiming correctness.',
  },
  {
    id: 'lme-ee-mode-descriptions',
    priority: 2,
    scope: 'LME/EE mode-specific descriptions',
    currentEvidence: 'SIO source/live equivalent; mode-specific description semantics remain separate from direct formula verification.',
    requiredNextEvidence:
      'Parse phase/mode descriptions and compare whether SIO applies them in the same mode boundary implied by the text.',
  },
  {
    id: 'non-ss-weapon-descriptions',
    priority: 3,
    scope: 'non-SS weapon descriptions',
    currentEvidence: 'catalog-only and unsupported as formula inputs.',
    requiredNextEvidence:
      'Do not promote non-SS weapons until direct descriptions and SIO/source formula paths exist.',
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
  inGameDescriptionEvidence,
  collectibleEffectMapping,
  mountDamageSourceFixture,
  sourceEvidence,
  liveEvidence,
  traceSummary,
  equivalenceMatrix,
] = await Promise.all([
  readJson('frontend/artifacts/td11/tangtang_damage_formula_spec.json'),
  readText('frontend/artifacts/td11/tangtang_damage_formula_spec.md'),
  readText('frontend/artifacts/td11/damage_formula_provenance_matrix.md'),
  readJson('frontend/artifacts/td11/in_game_description_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/collectible_effect_mapping_matrix.json'),
  readJson('frontend/artifacts/td11/mount_damage_source_fixture.json'),
  readJson('frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/sio_tools_live_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json'),
  readJson('frontend/artifacts/td11/sio_lm_equivalence_matrix.json'),
]);

for (const input of SOURCE_INPUTS) {
  await fs.access(path.join(root, input.replace(/^frontend\//, '')));
}

function buildMatrix() {
  const descriptionFormulaRows = [];
  const divergenceRows = [];
  return stableObject({
    title: 'Tangtang Description Formula Validation Gate',
    generatedAtKst: formulaSpec.generatedAtKst,
    status: '[TANGTANG-DESCRIPTION-FORMULA-VALIDATION-PROTOCOL-READY]',
    claim: 'description-derived-formula-validation-protocol',
    behaviorChange: false,
    sourceInputs: SOURCE_INPUTS,
    validationScope: {
      purpose:
        'Derive damage formulas from item/effect in-game descriptions first, compare those description-derived formulas against SIO Tools/Tangtang source-live formula, and require follow-up confirmation only for divergences.',
      currentSioEquivalentClaim: formulaSpec.claim,
      currentDescriptionFormulaCorrectnessClaim: 'not-established',
      directFirstPartyDescriptionFormulaRows: descriptionFormulaRows.length,
      publicOrSourceCorroboratedRows: inGameDescriptionEvidence.summary.rowsWithAnyPublicStatClaim,
      fullSioEquivalent: equivalenceMatrix.fullSioEquivalent,
      currentScorer: equivalenceMatrix.currentScorer,
      scorer: equivalenceMatrix.scorer,
    },
    derivationSchema: {
      requiredFields: [
        'rowId',
        'captureDateKst',
        'gameVersion',
        'domain',
        'entityId',
        'entityDisplayName',
        'descriptionTextOriginal',
        'descriptionLanguage',
        'parsedFormulaOperation',
        'parsedFormulaValue',
        'conditionOrUptime',
        'sioSourceKey',
        'tangtangSchemaKey',
        'rustStatChannel',
        'multiplierStage',
        'sioFormulaRole',
        'comparisonVerdict',
        'rawCaptureArtifactPaths',
      ],
      comparisonVerdicts: [
        'pending-description-capture',
        'matches-sio-description-derived',
        'description-sio-divergent-needs-confirmation',
        'invalid-ambiguous-description',
      ],
      promotionPolicy:
        'Only direct first-party item/effect description captures parsed into formula operations may increment directFirstPartyDescriptionFormulaRows.',
      divergencePolicy:
        'A description-derived divergence does not immediately change Tangtang scoring; it opens a targeted confirmation task and correction spec.',
    },
    descriptionGroups: DESCRIPTION_GROUPS,
    descriptionFormulaRows,
    divergenceRows,
    decisionPolicy: {
      initialDecision:
        'No direct first-party description-derived formula rows are present, so SIO formula correctness cannot be confirmed or rejected from descriptions yet.',
      canClaimSioFormulaDescriptionCorrect: false,
      canApplyTangtangFormulaCorrection: false,
      canOpenDivergenceConfirmationTasks: false,
      observedDamageValidationRole:
        'Observed damage validation is secondary confirmation for description-vs-SIO divergences, not the first validation layer.',
      userFacingClaimLimit:
        'Tangtang may claim SIO Tools-equivalent source/live backing only; it must not claim description-derived official formula verification.',
    },
    currentEvidenceSummary: {
      formulaSpecStatus: formulaSpec.status,
      formulaSpecClaim: formulaSpec.claim,
      formulaSpecBehaviorChange: formulaSpec.behaviorChange,
      directInGameDescriptionVerifiedRows: sourceEvidence.summary.inGameDescriptionVerifiedRows,
      publicDescriptionRowsWithAnyStatClaim: inGameDescriptionEvidence.summary.rowsWithAnyPublicStatClaim,
      publicDescriptionRowsWithAllSourceClaimsCorroborated:
        inGameDescriptionEvidence.summary.rowsWithAllSourceClaimsPubliclyCorroborated,
      partialPublicDescriptionRows: inGameDescriptionEvidence.summary.rowsWithPartialPublicStatClaims,
      mountRowsWithExactInGameDescriptions: inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions,
      mountRowsStillSourceOnlyForExactLineStats:
        inGameDescriptionEvidence.summary.mountRowsStillSourceOnlyForExactLineStats,
      collectibleThresholdRows: collectibleEffectMapping.summary.thresholdRows,
      collectibleInGameDescriptionVerifiedRows: collectibleEffectMapping.summary.inGameDescriptionVerifiedRows,
      collectibleCatalogOnlyRows:
        collectibleEffectMapping.summary.catalogOnlyNamedItemRows + collectibleEffectMapping.summary.eventSlotRows,
      collectibleSpecialRustMappings: sourceEvidence.summary.collectibleSpecialRustMappings,
      mountDamageSourceFixtureRows: mountDamageSourceFixture.summary.totalRows,
      nonZeroMountDamageLiveRows: liveEvidence.summary.nonZeroMountDamageLiveRows,
      rawSourceLeafRows: sourceEvidence.summary.rawSourceLeafRows,
      liveCaptureCount: liveEvidence.summary.liveCaptureCases,
      traceStageProductPassed: traceSummary.summary.stageProductPassed,
      knownStageLabelCaveat:
        'Description-derived skillDamage formulas must be compared to SIO trace skillDamage as a standalone factor, not collapsed into local en2 vulnerability labels.',
    },
    blockers: [
      'No direct first-party item/effect description-derived formula rows exist yet.',
      'Existing public-web rows are corroboration only and cannot prove official formula semantics.',
      'Mount exact per-line description text remains missing.',
      'Collectible item/set-level direct description capture remains incomplete.',
      'non-SS weapons remain catalog-only unsupported as formula inputs.',
    ],
    verificationCommands: [
      'node scripts/tangtang_description_formula_validation_unit_test.mjs',
      'node scripts/tangtang_damage_formula_spec_unit_test.mjs',
      'node scripts/tangtang_in_game_damage_validation_unit_test.mjs',
      'node scripts/damage_formula_provenance_matrix_unit_test.mjs',
      'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
      'git diff --check',
    ],
    artifactPaths: {
      matrix: 'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
      protocol: 'frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md',
      script: 'frontend/scripts/tangtang_description_formula_validation_unit_test.mjs',
      formulaSpecJson: 'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
      provenanceMatrix: 'frontend/artifacts/td11/damage_formula_provenance_matrix.md',
      observedDamageValidationMatrix: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
    },
  });
}

function renderGroupTable(groups) {
  return [
    '| Priority | Group | Scope | Current evidence | Required next evidence |',
    '|---:|---|---|---|---|',
    ...groups.map((group) => [
      group.priority,
      group.id,
      group.scope,
      group.currentEvidence,
      group.requiredNextEvidence,
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function renderProtocol(matrix) {
  return `# Tangtang Description Formula Validation Protocol

generatedAtKst: ${matrix.generatedAtKst}
status: ${matrix.status}
claim: \`${matrix.claim}\`
behaviorChange: \`${matrix.behaviorChange}\`

## Purpose

This is the primary next validation layer after SIO Tools-equivalent derivation. It derives formulas from item/effect in-game descriptions, compares those description-derived formulas to SIO Tools/Tangtang source-live formula behavior, and sends only divergences to targeted confirmation.

Current decision:

- Description-derived formula correctness claim: \`${matrix.validationScope.currentDescriptionFormulaCorrectnessClaim}\`
- Direct first-party description-derived formula rows: ${matrix.validationScope.directFirstPartyDescriptionFormulaRows}
- Public/source corroborated rows: ${matrix.validationScope.publicOrSourceCorroboratedRows}
- Can claim SIO formula description-correct: \`${matrix.decisionPolicy.canClaimSioFormulaDescriptionCorrect}\`
- Can apply Tangtang formula correction now: \`${matrix.decisionPolicy.canApplyTangtangFormulaCorrection}\`
- Observed damage validation role: ${matrix.decisionPolicy.observedDamageValidationRole}

## Derivation Method

For every captured item/effect description, parse the original text into a formula operation. Then map it to the SIO source key, Tangtang schema key, Rust/stat channel, multiplier stage, and SIO formula role. Only after that comparison can a row be marked as matching SIO or divergent.

Public-web text, SIO source rows, and live SIO worker parity can support triage, but they do not count as direct first-party description-derived formula rows.

## Required Row Fields

${matrix.derivationSchema.requiredFields.map((field) => `- \`${field}\``).join('\n')}

## Comparison Verdicts

${matrix.derivationSchema.comparisonVerdicts.map((verdict) => `- \`${verdict}\``).join('\n')}

Promotion policy: ${matrix.derivationSchema.promotionPolicy}

Divergence policy: ${matrix.derivationSchema.divergencePolicy}

## Description Groups

${renderGroupTable(matrix.descriptionGroups)}

## Current Evidence Summary

- Direct in-game description verified rows: ${matrix.currentEvidenceSummary.directInGameDescriptionVerifiedRows}
- Public rows with any stat claim: ${matrix.currentEvidenceSummary.publicDescriptionRowsWithAnyStatClaim}
- Public rows with all source claims corroborated: ${matrix.currentEvidenceSummary.publicDescriptionRowsWithAllSourceClaimsCorroborated}
- Partial public rows: ${matrix.currentEvidenceSummary.partialPublicDescriptionRows}
- Mount rows with exact in-game descriptions: ${matrix.currentEvidenceSummary.mountRowsWithExactInGameDescriptions}
- Collectible threshold rows: ${matrix.currentEvidenceSummary.collectibleThresholdRows}
- Collectible direct description verified rows: ${matrix.currentEvidenceSummary.collectibleInGameDescriptionVerifiedRows}
- Catalog-only collectible rows: ${matrix.currentEvidenceSummary.collectibleCatalogOnlyRows}
- Non-zero mountDamage live rows: ${matrix.currentEvidenceSummary.nonZeroMountDamageLiveRows}
- Stage label caveat: ${matrix.currentEvidenceSummary.knownStageLabelCaveat}

## Blockers

${matrix.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Evidence Artifacts

${matrix.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${matrix.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const matrix = buildMatrix();
const protocol = renderProtocol(matrix);
const serializedMatrix = `${JSON.stringify(matrix, null, 2)}\n`;

assert.equal(matrix.title, 'Tangtang Description Formula Validation Gate');
assert.equal(matrix.claim, 'description-derived-formula-validation-protocol');
assert.equal(matrix.behaviorChange, false);
assert.equal(matrix.validationScope.currentSioEquivalentClaim, 'sio-tools-equivalent');
assert.equal(matrix.validationScope.currentDescriptionFormulaCorrectnessClaim, 'not-established');
assert.equal(matrix.validationScope.directFirstPartyDescriptionFormulaRows, 0);
assert.equal(matrix.validationScope.fullSioEquivalent, true);
assert.equal(matrix.validationScope.currentScorer, 'sio_full_lm_equivalence');
assert.equal(matrix.validationScope.scorer, 'sio_full_lm_equivalence');
assert.equal(matrix.descriptionFormulaRows.length, 0);
assert.equal(matrix.divergenceRows.length, 0);
assert.equal(matrix.decisionPolicy.canClaimSioFormulaDescriptionCorrect, false);
assert.equal(matrix.decisionPolicy.canApplyTangtangFormulaCorrection, false);
assert.equal(matrix.decisionPolicy.canOpenDivergenceConfirmationTasks, false);
assert.ok(matrix.decisionPolicy.observedDamageValidationRole.includes('secondary confirmation'));
assert.ok(matrix.decisionPolicy.observedDamageValidationRole.includes('not the first validation layer'));
assert.ok(matrix.derivationSchema.divergencePolicy.includes('description-derived divergence'));
assert.equal(matrix.currentEvidenceSummary.directInGameDescriptionVerifiedRows, 0);
assert.equal(matrix.currentEvidenceSummary.mountRowsWithExactInGameDescriptions, 0);
assert.equal(matrix.currentEvidenceSummary.collectibleInGameDescriptionVerifiedRows, 0);
assert.equal(matrix.currentEvidenceSummary.collectibleThresholdRows, 170);
assert.equal(matrix.currentEvidenceSummary.collectibleSpecialRustMappings, 14);
assert.equal(matrix.currentEvidenceSummary.collectibleCatalogOnlyRows, 46);
assert.equal(matrix.currentEvidenceSummary.nonZeroMountDamageLiveRows, 2);
assert.equal(matrix.currentEvidenceSummary.liveCaptureCount, 26);
assert.ok(matrix.descriptionGroups.some((group) => group.id === 'skill-damage-stage-order'));
assert.ok(matrix.descriptionGroups.some((group) => group.id === 'mount-line-descriptions'));
assert.ok(matrix.descriptionGroups.some((group) => group.id === 'collectible-item-set-descriptions'));
assert.ok(matrix.descriptionGroups.some((group) => group.id === 'non-ss-weapon-descriptions'));
assert.ok(formulaSpecMarkdown.includes('claim: `sio-tools-equivalent`'));
assert.ok(provenanceMatrix.includes('Formula derivation is now available'));
assert.ok(protocol.includes('Observed damage validation role'));

if (writeMode) {
  await fs.mkdir(path.dirname(matrixPath), { recursive: true });
  await fs.writeFile(matrixPath, serializedMatrix);
  await fs.writeFile(protocolPath, protocol);
  console.log(`tangtang_description_formula_validation_unit_test: wrote ${matrixPath} and ${protocolPath}`);
} else {
  const [existingMatrix, existingProtocol] = await Promise.all([
    fs.readFile(matrixPath, 'utf8'),
    fs.readFile(protocolPath, 'utf8'),
  ]);
  assert.equal(existingMatrix, serializedMatrix, 'Tangtang description formula validation matrix is stale; run with --write');
  assert.equal(existingProtocol, protocol, 'Tangtang description formula validation protocol is stale; run with --write');
  console.log(`tangtang_description_formula_validation_unit_test: passed (${matrix.descriptionGroups.length} groups, 0 description formula rows)`);
}
