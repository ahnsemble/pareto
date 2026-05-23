import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const inboxPath = path.join(root, 'artifacts/td11/tangtang_description_capture_inbox.json');
const matrixPath = path.join(root, 'artifacts/td11/tangtang_description_capture_import_matrix.json');
const protocolPath = path.join(root, 'artifacts/td11/tangtang_description_capture_import_protocol.md');

const SOURCE_INPUTS = [
  'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
  'frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md',
  'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
  'frontend/artifacts/td11/sio_lm_equivalence_matrix.json',
];

const CAPTURE_REQUIRED_FIELDS = [
  'captureId',
  'atomRowId',
  'captureDateKst',
  'gameVersion',
  'sourceKind',
  'captureEvidenceTier',
  'language',
  'descriptionTextOriginal',
  'rawCaptureArtifactPaths',
  'parsedFormulaOperation',
  'parsedFormulaValue',
  'operationBucket',
  'conditionOrThreshold',
  'rustStatChannel',
  'multiplierStage',
];

const EMPTY_INBOX = {
  title: 'Tangtang Description Capture Inbox',
  schemaVersion: 1,
  claim: 'first-party-description-capture-input',
  generatedAtKst: '2026-05-23',
  status: '[TANGTANG-DESCRIPTION-CAPTURE-INBOX-EMPTY]',
  behaviorChange: false,
  purpose:
    'Manual inbox for direct first-party item/effect in-game description captures before importing them into the formula atom ledger.',
  requiredFields: CAPTURE_REQUIRED_FIELDS,
  rows: [],
  notes: [
    'Only direct first-party in-game UI screenshots, videos, or first-party data exports should be entered here.',
    'Public-web text, SIO source rows, and inferred source descriptions must not be entered as direct first-party capture rows.',
    'Adding rows here does not change Tangtang scoring; it only enables description-vs-SIO comparison.',
  ],
};

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8');
}

async function readInbox() {
  try {
    return JSON.parse(await fs.readFile(inboxPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return EMPTY_INBOX;
    }
    throw error;
  }
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
  descriptionFormulaValidation,
  descriptionFormulaValidationProtocol,
  formulaSpec,
  equivalenceMatrix,
  captureInbox,
] = await Promise.all([
  readJson('frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md'),
  readJson('frontend/artifacts/td11/tangtang_damage_formula_spec.json'),
  readJson('frontend/artifacts/td11/sio_lm_equivalence_matrix.json'),
  readInbox(),
]);

for (const input of SOURCE_INPUTS) {
  await fs.access(path.join(root, input.replace(/^frontend\//, '')));
}

function compareCaptureToAtom(capture, atom) {
  const fields = [
    ['parsedFormulaOperation', 'parsedFormulaOperation'],
    ['parsedFormulaValue', 'parsedFormulaValue'],
    ['operationBucket', 'operationBucket'],
    ['conditionOrThreshold', 'conditionOrThreshold'],
    ['rustStatChannel', 'rustStatChannel'],
    ['multiplierStage', 'multiplierStage'],
  ];
  const missing = fields.filter(([captureField]) => capture[captureField] == null || capture[captureField] === '');
  if (missing.length > 0) {
    return {
      comparisonVerdict: 'capture-needs-manual-parse',
      mismatchFields: missing.map(([captureField]) => captureField),
    };
  }
  const mismatchFields = fields
    .filter(([captureField, atomField]) => String(capture[captureField]) !== String(atom[atomField]))
    .map(([captureField]) => captureField);
  if (mismatchFields.length > 0) {
    return {
      comparisonVerdict: 'description-sio-divergent-needs-confirmation',
      mismatchFields,
    };
  }
  return {
    comparisonVerdict: 'matches-sio-description-derived',
    mismatchFields: [],
  };
}

function normalizeCaptureRows(inbox, atomById) {
  return (inbox.rows ?? []).map((capture) => {
    const atom = atomById.get(capture.atomRowId);
    const missingRequiredFields = CAPTURE_REQUIRED_FIELDS.filter((field) => (
      capture[field] == null || capture[field] === '' || (Array.isArray(capture[field]) && capture[field].length === 0)
    ));
    if (!atom) {
      return stableObject({
        ...capture,
        importStatus: 'rejected-unknown-atom-row-id',
        comparisonVerdict: 'invalid-capture-row',
        correctionEligible: false,
        requiresObservedDamageFollowUp: false,
        missingRequiredFields,
      });
    }
  if (
    capture.sourceKind !== 'direct-first-party-in-game' ||
    capture.captureEvidenceTier !== 'direct-first-party-description'
  ) {
    return stableObject({
      ...capture,
      atomSnapshot: atom,
        importStatus: 'rejected-not-first-party',
        comparisonVerdict: 'invalid-capture-row',
        correctionEligible: false,
        requiresObservedDamageFollowUp: false,
        missingRequiredFields,
      });
    }
    if (missingRequiredFields.length > 0) {
      return stableObject({
        ...capture,
        atomSnapshot: atom,
        importStatus: 'accepted-needs-parse',
        comparisonVerdict: 'capture-needs-manual-parse',
        correctionEligible: false,
        requiresObservedDamageFollowUp: false,
        missingRequiredFields,
      });
    }
    const comparison = compareCaptureToAtom(capture, atom);
    return stableObject({
      ...capture,
      atomSnapshot: atom,
      importStatus: 'accepted',
      comparisonVerdict: comparison.comparisonVerdict,
      correctionEligible: false,
      requiresObservedDamageFollowUp:
        comparison.comparisonVerdict === 'description-sio-divergent-needs-confirmation',
      missingRequiredFields,
      mismatchFields: comparison.mismatchFields,
    });
  }).sort((left, right) => String(left.captureId).localeCompare(String(right.captureId)));
}

function buildMatrix() {
  const atomRows = descriptionFormulaValidation.formulaAtomRows;
  const atomById = new Map(atomRows.map((atom) => [atom.rowId, atom]));
  const importedCaptureRows = normalizeCaptureRows(captureInbox, atomById);
  const acceptedRows = importedCaptureRows.filter((row) => row.importStatus === 'accepted');
  const rejectedRows = importedCaptureRows.filter((row) => row.importStatus.startsWith('rejected'));
  const parsedRows = importedCaptureRows.filter((row) => (
    row.comparisonVerdict === 'matches-sio-description-derived' ||
    row.comparisonVerdict === 'description-sio-divergent-needs-confirmation'
  ));
  const divergenceRows = importedCaptureRows.filter((row) => (
    row.comparisonVerdict === 'description-sio-divergent-needs-confirmation'
  ));
  const observedDamageFollowUpRows = importedCaptureRows.filter((row) => row.requiresObservedDamageFollowUp);
  return stableObject({
    title: 'Tangtang Description Capture Import Gate',
    generatedAtKst: formulaSpec.generatedAtKst,
    status: '[TANGTANG-DESCRIPTION-CAPTURE-IMPORT-GATE-READY]',
    claim: 'description-capture-import-gate',
    behaviorChange: false,
    sourceInputs: [...SOURCE_INPUTS, 'frontend/artifacts/td11/tangtang_description_capture_inbox.json'],
    captureInput: {
      path: 'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
      requiredFields: CAPTURE_REQUIRED_FIELDS,
      sourceKindRequired: 'direct-first-party-in-game',
      captureEvidenceTierRequired: 'direct-first-party-description',
      rows: captureInbox.rows ?? [],
    },
    importPolicy: {
      purpose:
        'Import first-party item/effect description captures into formula atom rows, compare parsed formula fields against current SIO/Tangtang handling, and route only divergences to observed-damage follow-up.',
      acceptedSourceKind: 'direct-first-party-in-game',
      acceptedCaptureEvidenceTier: 'direct-first-party-description',
      rejectedSourceKinds: ['public-web', 'sio-source-derived', 'manual-inference'],
      rejectedCaptureEvidenceTiers: [
        'public-web-corroborated',
        'sio-tools-current-source-derived',
        'ocr-only-without-raw-artifact',
        'translated-only-without-original',
      ],
      matchingMode: 'explicit atomRowId only',
      automaticScoringChangeAllowed: false,
      observedDamageFollowUpAllowedOnlyFor: 'description-sio-divergent-needs-confirmation',
    },
    atomLedgerContract: {
      formulaAtomRows: descriptionFormulaValidation.formulaAtomSummary.totalRows,
      stageBucketTaxonomyRows: descriptionFormulaValidation.formulaAtomSummary.stageBucketTaxonomyRows,
      mountAtomRows: descriptionFormulaValidation.formulaAtomSummary.mountAtomRows,
      survivorAtomRows: descriptionFormulaValidation.formulaAtomSummary.survivorAtomRows,
      collectibleThresholdAtomRows: descriptionFormulaValidation.formulaAtomSummary.collectibleThresholdAtomRows,
      collectibleSpecialRustMappingAtomRows:
        descriptionFormulaValidation.formulaAtomSummary.collectibleSpecialRustMappingAtomRows,
      graphMode: descriptionFormulaValidation.formulaAtomGraph.graphMode,
    },
    equivalenceContract: {
      fullSioEquivalent: equivalenceMatrix.fullSioEquivalent,
      currentScorer: equivalenceMatrix.currentScorer,
      scorer: equivalenceMatrix.scorer,
    },
    importedCaptureRows,
    summary: {
      captureInboxRows: (captureInbox.rows ?? []).length,
      importedCaptureRows: importedCaptureRows.length,
      acceptedCaptureRows: acceptedRows.length,
      rejectedCaptureRows: rejectedRows.length,
      parsedDescriptionFormulaRows: parsedRows.length,
      matchedSioRows: importedCaptureRows.filter((row) => row.comparisonVerdict === 'matches-sio-description-derived').length,
      ambiguousRows: importedCaptureRows.filter((row) => row.comparisonVerdict === 'capture-needs-manual-parse').length,
      descriptionSioDivergenceRows: divergenceRows.length,
      observedDamageFollowUpRows: observedDamageFollowUpRows.length,
      correctionEligibleRows: importedCaptureRows.filter((row) => row.correctionEligible).length,
    },
    decisionPolicy: {
      currentDescriptionFormulaCorrectnessClaim: 'not-established',
      canClaimSioFormulaDescriptionCorrect: false,
      canApplyTangtangFormulaCorrection: false,
      canRunObservedDamageFollowUp: observedDamageFollowUpRows.length > 0,
      userFacingClaimLimit:
        'No user-facing formula correctness claim may be made from capture imports until direct first-party rows are parsed and compared.',
    },
    verificationCommands: [
      'node scripts/tangtang_description_capture_import_unit_test.mjs',
      'node scripts/tangtang_description_formula_validation_unit_test.mjs',
      'node scripts/tangtang_damage_formula_spec_unit_test.mjs',
      'node scripts/damage_formula_provenance_matrix_unit_test.mjs',
      'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
      'git diff --check',
    ],
    artifactPaths: {
      inbox: 'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
      matrix: 'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
      protocol: 'frontend/artifacts/td11/tangtang_description_capture_import_protocol.md',
      script: 'frontend/scripts/tangtang_description_capture_import_unit_test.mjs',
      atomLedger: 'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
    },
  });
}

function renderProtocol(matrix) {
  return `# Tangtang Description Capture Import Protocol

generatedAtKst: ${matrix.generatedAtKst}
status: ${matrix.status}
claim: \`${matrix.claim}\`
behaviorChange: \`${matrix.behaviorChange}\`

## Purpose

This gate imports direct first-party item/effect in-game description captures into the deterministic formula atom ledger. It does not change formula semantics, scoring core, Rust damage formulas, WASM scoring behavior, optimizer ranking, or product UI.

Current decision:

- Capture inbox rows: ${matrix.summary.captureInboxRows}
- Parsed description formula rows: ${matrix.summary.parsedDescriptionFormulaRows}
- Description/SIO divergence rows: ${matrix.summary.descriptionSioDivergenceRows}
- Observed damage follow-up rows: ${matrix.summary.observedDamageFollowUpRows}
- Can claim SIO formula description-correct: \`${matrix.decisionPolicy.canClaimSioFormulaDescriptionCorrect}\`
- Can apply Tangtang formula correction: \`${matrix.decisionPolicy.canApplyTangtangFormulaCorrection}\`

## Input Schema

Capture rows must be direct first-party in-game evidence and must include:

${matrix.captureInput.requiredFields.map((field) => `- \`${field}\``).join('\n')}

Rejected source kinds: ${matrix.importPolicy.rejectedSourceKinds.map((kind) => `\`${kind}\``).join(', ')}

Rejected capture evidence tiers: ${matrix.importPolicy.rejectedCaptureEvidenceTiers.map((tier) => `\`${tier}\``).join(', ')}

Matching mode: ${matrix.importPolicy.matchingMode}

## Atom Ledger Contract

- Formula atom rows: ${matrix.atomLedgerContract.formulaAtomRows}
- Stage bucket taxonomy rows: ${matrix.atomLedgerContract.stageBucketTaxonomyRows}
- Mount atom rows: ${matrix.atomLedgerContract.mountAtomRows}
- Survivor atom rows: ${matrix.atomLedgerContract.survivorAtomRows}
- Collectible threshold atom rows: ${matrix.atomLedgerContract.collectibleThresholdAtomRows}
- Collectible special Rust mapping atom rows: ${matrix.atomLedgerContract.collectibleSpecialRustMappingAtomRows}
- Graph mode: \`${matrix.atomLedgerContract.graphMode}\`

## Import Outcomes

| Outcome | Count |
|---|---:|
| imported capture rows | ${matrix.summary.importedCaptureRows} |
| accepted capture rows | ${matrix.summary.acceptedCaptureRows} |
| rejected capture rows | ${matrix.summary.rejectedCaptureRows} |
| matched SIO rows | ${matrix.summary.matchedSioRows} |
| ambiguous rows | ${matrix.summary.ambiguousRows} |
| description/SIO divergence rows | ${matrix.summary.descriptionSioDivergenceRows} |
| observed damage follow-up rows | ${matrix.summary.observedDamageFollowUpRows} |
| correction-eligible rows | ${matrix.summary.correctionEligibleRows} |

## Evidence Artifacts

${matrix.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${matrix.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const matrix = buildMatrix();
const protocol = renderProtocol(matrix);
const serializedInbox = `${JSON.stringify(stableObject(captureInbox), null, 2)}\n`;
const serializedMatrix = `${JSON.stringify(matrix, null, 2)}\n`;

assert.equal(matrix.title, 'Tangtang Description Capture Import Gate');
assert.equal(matrix.claim, 'description-capture-import-gate');
assert.equal(matrix.behaviorChange, false);
assert.equal(matrix.captureInput.sourceKindRequired, 'direct-first-party-in-game');
assert.equal(matrix.captureInput.captureEvidenceTierRequired, 'direct-first-party-description');
assert.equal(matrix.captureInput.requiredFields.length, CAPTURE_REQUIRED_FIELDS.length);
assert.equal(matrix.importPolicy.acceptedCaptureEvidenceTier, 'direct-first-party-description');
assert.equal(matrix.importPolicy.automaticScoringChangeAllowed, false);
assert.equal(matrix.atomLedgerContract.formulaAtomRows, 221);
assert.equal(matrix.atomLedgerContract.stageBucketTaxonomyRows, 25);
assert.equal(matrix.atomLedgerContract.mountAtomRows, 26);
assert.equal(matrix.atomLedgerContract.survivorAtomRows, 11);
assert.equal(matrix.atomLedgerContract.collectibleThresholdAtomRows, 170);
assert.equal(matrix.atomLedgerContract.collectibleSpecialRustMappingAtomRows, 14);
assert.equal(matrix.atomLedgerContract.graphMode, 'deterministic-atom-ledger-not-graphrag');
assert.equal(matrix.equivalenceContract.fullSioEquivalent, true);
assert.equal(matrix.equivalenceContract.currentScorer, 'sio_full_lm_equivalence');
assert.equal(matrix.equivalenceContract.scorer, 'sio_full_lm_equivalence');
assert.equal(matrix.summary.captureInboxRows, 0);
assert.equal(matrix.summary.importedCaptureRows, 0);
assert.equal(matrix.summary.acceptedCaptureRows, 0);
assert.equal(matrix.summary.rejectedCaptureRows, 0);
assert.equal(matrix.summary.parsedDescriptionFormulaRows, 0);
assert.equal(matrix.summary.descriptionSioDivergenceRows, 0);
assert.equal(matrix.summary.observedDamageFollowUpRows, 0);
assert.equal(matrix.summary.correctionEligibleRows, 0);
assert.equal(matrix.decisionPolicy.canClaimSioFormulaDescriptionCorrect, false);
assert.equal(matrix.decisionPolicy.canApplyTangtangFormulaCorrection, false);
assert.equal(matrix.decisionPolicy.canRunObservedDamageFollowUp, false);
assert.ok(descriptionFormulaValidationProtocol.includes('Formula atom rows: 221'));
assert.ok(protocol.includes('direct first-party item/effect in-game description captures'));

if (writeMode) {
  await fs.mkdir(path.dirname(matrixPath), { recursive: true });
  await fs.writeFile(inboxPath, serializedInbox);
  await fs.writeFile(matrixPath, serializedMatrix);
  await fs.writeFile(protocolPath, protocol);
  console.log(`tangtang_description_capture_import_unit_test: wrote ${inboxPath}, ${matrixPath}, and ${protocolPath}`);
} else {
  const [existingInbox, existingMatrix, existingProtocol] = await Promise.all([
    fs.readFile(inboxPath, 'utf8'),
    fs.readFile(matrixPath, 'utf8'),
    fs.readFile(protocolPath, 'utf8'),
  ]);
  assert.equal(existingInbox, serializedInbox, 'Tangtang description capture inbox is stale; run with --write');
  assert.equal(existingMatrix, serializedMatrix, 'Tangtang description capture import matrix is stale; run with --write');
  assert.equal(existingProtocol, protocol, 'Tangtang description capture import protocol is stale; run with --write');
  console.log(`tangtang_description_capture_import_unit_test: passed (${matrix.summary.captureInboxRows} capture rows)`);
}
