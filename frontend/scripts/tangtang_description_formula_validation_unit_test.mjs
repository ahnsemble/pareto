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

const FORMULA_ATOM_REQUIRED_FIELDS = [
  'rowId',
  'atomType',
  'evidenceTier',
  'domain',
  'entityKey',
  'entityDisplayName',
  'sourceText',
  'sourceTextStatus',
  'parsedFormulaOperation',
  'parsedFormulaValue',
  'operationBucket',
  'conditionOrThreshold',
  'sioSourceKey',
  'sioSourcePath',
  'tangtangSchemaKey',
  'rustStatChannel',
  'multiplierStage',
  'sioCurrentHandling',
  'comparisonVerdict',
  'correctionEligible',
  'requiresObservedDamageFollowUp',
  'requiresDirectDescriptionCapture',
  'provenanceArtifactPaths',
];

const FORMULA_ATOM_COMPARISON_VERDICTS = [
  'insufficient-direct-description-evidence',
  'public-web-corroborated-not-first-party',
  'matches-sio-description-derived',
  'description-sio-divergent-needs-confirmation',
  'invalid-ambiguous-description',
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

function stageIdFromLabel(stageLabel) {
  return String(stageLabel ?? '').match(/\ben\d+\b/)?.[0] ?? null;
}

function operationBucketFor(stageLabel, statChannel) {
  const stage = String(stageLabel ?? '').toLowerCase();
  const channel = String(statChannel ?? '').toLowerCase();
  if (stage.includes('attack aggregate') || channel.includes('atk')) {
    return 'attack-aggregate';
  }
  if (stage.includes('crit expectation') || channel.includes('critrate') || channel.includes('critdamage')) {
    return 'crit-expectation';
  }
  if (stage.includes('uptime') || channel.includes('uptime')) {
    return 'uptime-weighted-multiplier';
  }
  if (stage.includes('target status') || ['poisoned', 'weakened', 'chilled', 'exposeddamage'].includes(channel)) {
    return 'status-conditional-percent';
  }
  if (stage.includes('boss damage') || channel === 'damageboss') {
    return 'target-type-percent';
  }
  if (stage.includes('lme') || channel === 'lme1damage') {
    return 'mode-phase-percent';
  }
  if (stage.includes('skilldamage') || channel === 'skilldamage') {
    return 'skill-damage-percent';
  }
  if (stage.includes('derived_base')) {
    return 'upstream-derived-stat-fold';
  }
  if (stage.includes('boost') || stage.includes('instakill') || stage.includes('overload') || stage.includes('weak spot')) {
    return 'conditional-multiplier';
  }
  return 'additive-percent-multiplier';
}

function evidenceTierFor(evidenceStatus) {
  if (evidenceStatus === 'direct-first-party-description') {
    return 'direct-first-party-description';
  }
  if (String(evidenceStatus ?? '').includes('public-web')) {
    return 'public-web-corroborated';
  }
  return 'sio-tools-current-source-derived';
}

function comparisonVerdictFor(evidenceTier) {
  if (evidenceTier === 'direct-first-party-description') {
    return 'matches-sio-description-derived';
  }
  if (evidenceTier === 'public-web-corroborated') {
    return 'public-web-corroborated-not-first-party';
  }
  return 'insufficient-direct-description-evidence';
}

function baseAtom({
  rowId,
  atomType,
  evidenceStatus,
  domain,
  entityKey,
  entityDisplayName,
  sourceText,
  sourceTextStatus,
  parsedFormulaOperation,
  parsedFormulaValue,
  operationBucket,
  conditionOrThreshold,
  sioSourceKey,
  sioSourcePath,
  tangtangSchemaKey,
  rustStatChannel,
  multiplierStage,
  sioCurrentHandling,
  provenanceArtifactPaths,
  caveats = [],
}) {
  const evidenceTier = evidenceTierFor(evidenceStatus);
  const comparisonVerdict = comparisonVerdictFor(evidenceTier);
  return stableObject({
    rowId,
    atomType,
    evidenceTier,
    evidenceStatus,
    domain,
    entityKey,
    entityDisplayName,
    sourceText,
    sourceTextStatus,
    parsedFormulaOperation,
    parsedFormulaValue,
    operationBucket,
    conditionOrThreshold,
    sioSourceKey,
    sioSourcePath,
    tangtangSchemaKey,
    rustStatChannel,
    statChannel: rustStatChannel,
    multiplierStage,
    stageId: stageIdFromLabel(multiplierStage),
    sioCurrentHandling,
    comparisonVerdict,
    correctionEligible: false,
    requiresObservedDamageFollowUp: false,
    requiresDirectDescriptionCapture: evidenceTier !== 'direct-first-party-description',
    rawCaptureArtifactPaths: [],
    provenanceArtifactPaths,
    caveats: [
      'This atom must not change Tangtang scoring until direct description-derived comparison produces a divergence.',
      ...caveats,
    ],
  });
}

function buildStageAtoms() {
  return formulaSpec.stageOrder.map((stageId) => {
    const stage = formulaSpec.stages[stageId];
    return baseAtom({
      rowId: `stage:${stage.id}`,
      atomType: 'sio-stage-bucket',
      evidenceStatus: 'sio-tools-current-source-derived',
      domain: 'stage',
      entityKey: stage.id,
      entityDisplayName: stage.label,
      sourceText: `${stage.label}: ${stage.multiplierRole}`,
      sourceTextStatus: 'not-in-game-description-text',
      parsedFormulaOperation: 'stage-bucket',
      parsedFormulaValue: null,
      operationBucket: operationBucketFor(stage.label, stage.statChannels[0]),
      conditionOrThreshold: 'stage-order',
      sioSourceKey: stage.id,
      sioSourcePath: stage.provenanceArtifactReferences.join('; '),
      tangtangSchemaKey: `tangtang_damage_formula_spec.stages.${stage.id}`,
      rustStatChannel: stage.statChannels.join(','),
      multiplierStage: stage.label,
      sioCurrentHandling: `${stage.multiplierRole} sourceEvidenceCount=${stage.sourceEvidenceCount}`,
      provenanceArtifactPaths: [
        'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
        'frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json',
      ],
      caveats: stage.knownCaveats,
    });
  });
}

function buildMountAtoms() {
  return inGameDescriptionEvidence.rows
    .filter((row) => row.domain === 'mount')
    .flatMap((row) => {
      const lineAtoms = row.lineClaims.map((claim) => baseAtom({
        rowId: `${row.key}:line:${claim.lineThreshold}:${claim.rustStatChannel}`,
        atomType: 'mount-line-source-claim',
        evidenceStatus: claim.evidenceStatus,
        domain: row.domain,
        entityKey: row.key,
        entityDisplayName: row.displayName,
        sourceText: `${claim.sourcePath}: ${claim.rustStatChannel} +${claim.value}`,
        sourceTextStatus: row.exactInGameDescriptionStatus,
        parsedFormulaOperation: 'add_percent',
        parsedFormulaValue: claim.value,
        operationBucket: operationBucketFor(claim.multiplierStage, claim.rustStatChannel),
        conditionOrThreshold: `mount line >= ${claim.lineThreshold}`,
        sioSourceKey: claim.sourceKey,
        sioSourcePath: claim.sourcePath,
        tangtangSchemaKey: claim.tangtangSchemaKey,
        rustStatChannel: claim.rustStatChannel,
        multiplierStage: claim.multiplierStage,
        sioCurrentHandling: `SIO source table line claim; ${claim.evidenceSummary}`,
        provenanceArtifactPaths: [
          'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
          'frontend/artifacts/td11/mount_damage_source_fixture.json',
        ],
        caveats: [row.caveat],
      }));
      const mountDamage = row.mountDamage;
      const mountDamageValue = mountDamage.star8MountDamage ?? mountDamage.mgCoefficient;
      return [
        ...lineAtoms,
        baseAtom({
          rowId: `${row.key}:mountDamage`,
          atomType: 'mount-damage-source-claim',
          evidenceStatus: mountDamage.activeLiveEvidence
            ? 'sio-tools-current-source-derived-live-backed'
            : 'sio-source-table-only',
          domain: row.domain,
          entityKey: row.key,
          entityDisplayName: row.displayName,
          sourceText: `${row.sourceName} mountDamage coefficient ${mountDamage.mgCoefficient}`,
          sourceTextStatus: row.exactInGameDescriptionStatus,
          parsedFormulaOperation: 'ce_damage_mount_bucket',
          parsedFormulaValue: mountDamageValue,
          operationBucket: 'ce-damage-mount-bucket',
          conditionOrThreshold: mountDamage.star8MountDamage == null ? 'mount active coefficient' : 'star 8 active mount',
          sioSourceKey: 'mountDamage',
          sioSourcePath: `${row.key}.mountDamage`,
          tangtangSchemaKey: `${row.tangtangSchemaKey}.mountDamage`,
          rustStatChannel: mountDamage.rustStatChannel,
          multiplierStage: mountDamage.multiplierStage,
          sioCurrentHandling: `SIO mountDamage source fixture; activeLiveEvidence=${mountDamage.activeLiveEvidence}`,
          provenanceArtifactPaths: [
            'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
            'frontend/artifacts/td11/mount_damage_source_fixture.json',
            'frontend/artifacts/td11/sio_tools_live_evidence_matrix.json',
          ],
          caveats: [row.caveat],
        }),
      ];
    });
}

function buildSurvivorAtoms() {
  return inGameDescriptionEvidence.rows
    .filter((row) => row.domain === 'survivor')
    .flatMap((row) => row.claims.map((claim) => baseAtom({
      rowId: `${row.key}:${claim.sourcePath.split('.').slice(-2).join(':')}:${claim.rustStatChannel}`,
      atomType: 'survivor-public-or-source-claim',
      evidenceStatus: claim.evidenceStatus,
      domain: row.domain,
      entityKey: row.key,
      entityDisplayName: row.displayName,
      sourceText: claim.evidenceSummary,
      sourceTextStatus: row.exactInGameDescriptionStatus,
      parsedFormulaOperation: 'add_percent',
      parsedFormulaValue: claim.value,
      operationBucket: operationBucketFor(claim.multiplierStage, claim.rustStatChannel),
      conditionOrThreshold: claim.sourcePath,
      sioSourceKey: claim.sourceKey,
      sioSourcePath: claim.sourcePath,
      tangtangSchemaKey: claim.tangtangSchemaKey,
      rustStatChannel: claim.rustStatChannel,
      multiplierStage: claim.multiplierStage,
      sioCurrentHandling: `SIO survivor transform claim; ${claim.evidenceSummary}`,
      provenanceArtifactPaths: [
        'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
        'frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json',
      ],
      caveats: [row.caveat],
    })));
}

function buildCollectibleAtoms() {
  return collectibleEffectMapping.thresholdRows.map((row) => baseAtom({
    rowId: row.key,
    atomType: 'collectible-threshold-source-claim',
    evidenceStatus: row.confidence,
    domain: row.kind,
    entityKey: row.parentKey,
    entityDisplayName: row.name,
    sourceText: row.sourceDescription,
    sourceTextStatus: row.inGameDescriptionStatus,
    parsedFormulaOperation: 'threshold_add_percent',
    parsedFormulaValue: row.value,
    operationBucket: operationBucketFor(row.multiplierStage, row.rustStatChannel),
    conditionOrThreshold: `${row.thresholdMetric} >= ${row.threshold}`,
    sioSourceKey: row.sioSourceKey,
    sioSourcePath: row.sioSourceKey,
    tangtangSchemaKey: row.tangtangSchemaKey,
    rustStatChannel: row.rustStatChannel,
    multiplierStage: row.multiplierStage,
    sioCurrentHandling: `${row.sourceDescription}; ${row.rustLocation}`,
    provenanceArtifactPaths: [
      'frontend/artifacts/td11/collectible_effect_mapping_matrix.json',
      'frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json',
    ],
    caveats: ['Collectible item/set direct in-game description capture remains incomplete.'],
  }));
}

function buildCollectibleSpecialRustAtoms() {
  return collectibleEffectMapping.rows
    .filter((row) => (row.rustMappings ?? []).some((mapping) => mapping.stage !== 'derived_base_stats'))
    .flatMap((row) => row.rustMappings
      .filter((mapping) => mapping.stage !== 'derived_base_stats')
      .map((mapping) => baseAtom({
        rowId: `${row.key}:special-rust:${mapping.stage}:${mapping.statChannels.join(',')}`,
        atomType: 'collectible-special-rust-mapping',
        evidenceStatus: row.confidence,
        domain: row.kind,
        entityKey: row.key,
        entityDisplayName: row.name,
        sourceText: `${row.name} special Rust mapping: ${mapping.stage} -> ${mapping.statChannels.join(', ')}`,
        sourceTextStatus: row.inGameDescriptionStatus,
        parsedFormulaOperation: 'rust_transform_mapping',
        parsedFormulaValue: null,
        operationBucket: operationBucketFor(mapping.stage, mapping.statChannels[0]),
        conditionOrThreshold: `${mapping.thresholdMetric}: ${mapping.thresholds.join(',')}`,
        sioSourceKey: row.sioSourceKey,
        sioSourcePath: row.sioSourceKey,
        tangtangSchemaKey: row.tangtangSchemaKey,
        rustStatChannel: mapping.statChannels.join(','),
        multiplierStage: mapping.stage,
        sioCurrentHandling: `${mapping.rustLocation}; equipment=${mapping.equipment ?? 'none'}`,
        provenanceArtifactPaths: [
          'frontend/artifacts/td11/collectible_effect_mapping_matrix.json',
          'frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json',
        ],
        caveats: ['Special Rust mapping is source/Rust backed, not direct item/set in-game description capture.'],
      })));
}

function buildFormulaAtomRows() {
  return [
    ...buildMountAtoms(),
    ...buildSurvivorAtoms(),
    ...buildCollectibleAtoms(),
    ...buildCollectibleSpecialRustAtoms(),
  ].sort((left, right) => left.rowId.localeCompare(right.rowId));
}

function countAtoms(rows, predicate) {
  return rows.filter(predicate).length;
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row[field], (counts.get(row[field]) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function buildFormulaAtomGraph(rows) {
  return stableObject({
    graphMode: 'deterministic-atom-ledger-not-graphrag',
    rationale:
      'The current problem is bucket/stage classification and evidence promotion, so a deterministic DAG ledger is sufficient before any GraphRAG layer.',
    nodes: [
      'source-or-description-evidence',
      'formula-atom-row',
      'operation-bucket',
      'sio-current-handling',
      'comparison-verdict',
      'observed-damage-follow-up',
      'tangtang-formula-correction',
    ],
    edges: [
      { from: 'source-or-description-evidence', to: 'formula-atom-row', condition: `${rows.length} current atoms` },
      { from: 'formula-atom-row', to: 'operation-bucket', condition: 'operationBucket is assigned deterministically from stage/stat channel' },
      { from: 'formula-atom-row', to: 'sio-current-handling', condition: 'atom maps to source key, schema key, Rust/stat channel, and multiplier stage' },
      { from: 'sio-current-handling', to: 'comparison-verdict', condition: 'direct description-derived formula is compared with SIO handling' },
      { from: 'comparison-verdict', to: 'observed-damage-follow-up', condition: 'only when verdict is description-sio-divergent-needs-confirmation' },
      { from: 'observed-damage-follow-up', to: 'tangtang-formula-correction', condition: 'only after repeated controlled follow-up confirms the prior description-vs-SIO divergence' },
    ],
  });
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
  const formulaAtomRows = buildFormulaAtomRows();
  const descriptionFormulaRows = formulaAtomRows.filter(
    (row) => row.evidenceTier === 'direct-first-party-description',
  );
  const divergenceRows = formulaAtomRows.filter(
    (row) => row.comparisonVerdict === 'description-sio-divergent-needs-confirmation',
  );
  const correctionEligibleRows = formulaAtomRows.filter((row) => row.correctionEligible);
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
    formulaAtomSchema: {
      requiredFields: FORMULA_ATOM_REQUIRED_FIELDS,
      operationBuckets: [
        'attack-aggregate',
        'crit-expectation',
        'uptime-weighted-multiplier',
        'status-conditional-percent',
        'target-type-percent',
        'mode-phase-percent',
        'skill-damage-percent',
        'upstream-derived-stat-fold',
        'conditional-multiplier',
        'ce-damage-mount-bucket',
        'additive-percent-multiplier',
      ],
      comparisonVerdicts: FORMULA_ATOM_COMPARISON_VERDICTS,
      promotionPolicy:
        'Formula atoms can describe current source/live handling, but only direct first-party description atoms may become description-derived formula rows.',
    },
    descriptionGroups: DESCRIPTION_GROUPS,
    stageBucketTaxonomy: buildStageAtoms(),
    formulaAtomRows,
    formulaAtomSummary: {
      totalRows: formulaAtomRows.length,
      stageBucketTaxonomyRows: formulaSpec.stageOrder.length,
      mountAtomRows: countAtoms(formulaAtomRows, (row) => row.domain === 'mount'),
      survivorAtomRows: countAtoms(formulaAtomRows, (row) => row.domain === 'survivor'),
      collectibleThresholdAtomRows: countAtoms(formulaAtomRows, (row) => row.atomType === 'collectible-threshold-source-claim'),
      collectibleSpecialRustMappingAtomRows: countAtoms(
        formulaAtomRows,
        (row) => row.atomType === 'collectible-special-rust-mapping',
      ),
      directFirstPartyDescriptionFormulaRows: descriptionFormulaRows.length,
      descriptionSioDivergenceRows: divergenceRows.length,
      correctionEligibleRows: correctionEligibleRows.length,
      rowsByAtomType: countBy(formulaAtomRows, 'atomType'),
      rowsByComparisonVerdict: countBy(formulaAtomRows, 'comparisonVerdict'),
      rowsByEvidenceTier: countBy(formulaAtomRows, 'evidenceTier'),
      rowsRequiringDirectDescriptionCapture: countAtoms(formulaAtomRows, (row) => row.requiresDirectDescriptionCapture),
      rowsRequiringObservedDamageFollowUp: countAtoms(formulaAtomRows, (row) => row.requiresObservedDamageFollowUp),
    },
    formulaAtomGraph: buildFormulaAtomGraph(formulaAtomRows),
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

function renderCountTable(counts) {
  return [
    '| Value | Count |',
    '|---|---:|',
    ...Object.entries(counts).map(([key, count]) => `| ${cell(key)} | ${count} |`),
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

## Formula Atom Ledger

The matrix now carries a deterministic formula atom ledger. This is the small DAG-style structure needed for bucket/stage classification; GraphRAG is not required before direct description rows exist.

- Formula atom rows: ${matrix.formulaAtomSummary.totalRows}
- Stage bucket taxonomy rows: ${matrix.formulaAtomSummary.stageBucketTaxonomyRows}
- Mount atom rows: ${matrix.formulaAtomSummary.mountAtomRows}
- Survivor atom rows: ${matrix.formulaAtomSummary.survivorAtomRows}
- Collectible threshold atom rows: ${matrix.formulaAtomSummary.collectibleThresholdAtomRows}
- Collectible special Rust mapping atom rows: ${matrix.formulaAtomSummary.collectibleSpecialRustMappingAtomRows}
- Direct first-party description-derived formula rows: ${matrix.formulaAtomSummary.directFirstPartyDescriptionFormulaRows}
- Description/SIO divergence rows: ${matrix.formulaAtomSummary.descriptionSioDivergenceRows}
- Correction-eligible rows: ${matrix.formulaAtomSummary.correctionEligibleRows}

Rows by atom type:

${renderCountTable(matrix.formulaAtomSummary.rowsByAtomType)}

Rows by comparison verdict:

${renderCountTable(matrix.formulaAtomSummary.rowsByComparisonVerdict)}

Graph mode: \`${matrix.formulaAtomGraph.graphMode}\`

Graph rationale: ${matrix.formulaAtomGraph.rationale}

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
assert.equal(matrix.formulaAtomRows.length, 221);
assert.equal(matrix.formulaAtomSummary.stageBucketTaxonomyRows, 25);
assert.equal(matrix.formulaAtomSummary.mountAtomRows, 26);
assert.equal(matrix.formulaAtomSummary.survivorAtomRows, 11);
assert.equal(matrix.formulaAtomSummary.collectibleThresholdAtomRows, 170);
assert.equal(matrix.formulaAtomSummary.collectibleSpecialRustMappingAtomRows, 14);
assert.equal(matrix.formulaAtomSummary.directFirstPartyDescriptionFormulaRows, 0);
assert.equal(matrix.formulaAtomSummary.descriptionSioDivergenceRows, 0);
assert.equal(matrix.formulaAtomSummary.correctionEligibleRows, 0);
assert.ok(matrix.formulaAtomSchema.requiredFields.includes('operationBucket'));
assert.ok(matrix.formulaAtomGraph.edges.length >= 4);
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
