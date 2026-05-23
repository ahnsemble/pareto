import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const buildDir = path.join(tmpdir(), 'pareto-tangtang-damage-formula-spec');
const jsonPath = path.join(root, 'artifacts/td11/tangtang_damage_formula_spec.json');
const mdPath = path.join(root, 'artifacts/td11/tangtang_damage_formula_spec.md');
const EXPECTED_DESCRIPTION_CAPTURE_ROWS = 12;
const EXPECTED_DESCRIPTION_CAPTURE_MATCHED_ROWS = 10;
const EXPECTED_DESCRIPTION_CAPTURE_DIVERGENCE_ROWS = 2;
const EXPECTED_DESCRIPTION_CAPTURE_OBSERVED_FOLLOW_UP_ROWS = 2;
const EXPECTED_FORMULA_ATOM_ROWS_REMAINING_WITHOUT_DIRECT_CAPTURE = 209;

const REQUIRED_SOURCE_INPUTS = [
  'frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json',
  'frontend/artifacts/td11/damage_formula_provenance_matrix.md',
  'frontend/artifacts/td11/sio_tools_live_evidence_matrix.json',
  'frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json',
  'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
  'frontend/artifacts/td11/collectible_effect_mapping_matrix.json',
  'frontend/artifacts/td11/mount_damage_source_fixture.json',
  'frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json',
  'frontend/artifacts/td11/sio_lm_input_summary_2026-05-20.json',
  'frontend/artifacts/td11/sio_lm_equivalence_matrix.json',
  'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
  'frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md',
  'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
  'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
  'frontend/artifacts/td11/tangtang_description_capture_import_protocol.md',
  'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json',
  'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md',
  'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
  'frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md',
  'frontend/app/lib/pareto-store/schemas/index.ts',
  'frontend/scripts/sio_tools_formula_source_evidence_unit_test.mjs',
  'frontend/scripts/damage_formula_provenance_matrix_unit_test.mjs',
];

const STAGE_DEFINITIONS = [
  {
    id: 'en0',
    label: 'en0 attack aggregate',
    statChannels: ['atkBase', 'atkEquip', 'atkEquipPercent', 'atkHero', 'atkHeroPercent', 'atkPercent', 'atkFinal'],
    multiplierRole:
      'Attack aggregate over base, equipment, hero, percent, and final attack channels before downstream multipliers.',
  },
  {
    id: 'en1',
    label: 'en1 crit expectation',
    statChannels: ['critRate', 'critDamage'],
    multiplierRole: 'Expected critical hit multiplier from crit rate and crit damage channels.',
  },
  {
    id: 'en2',
    label: 'en2 vulnerability',
    statChannels: ['vulnerability'],
    multiplierRole: 'Positive vulnerability channel multiplier.',
  },
  {
    id: 'en3',
    label: 'en3 shield damage uptime',
    statChannels: ['shieldDamage', 'shieldDamageUptime'],
    multiplierRole: 'Shield damage channel weighted by uptime.',
  },
  {
    id: 'en4',
    label: 'en4 target status damage',
    statChannels: ['poisoned', 'poisonedUptime', 'weakened', 'weakenedUptime', 'chilled', 'chilledUptime', 'exposedDamage'],
    multiplierRole: 'Poisoned, weakened, chilled, and exposed status damage contribution.',
  },
  {
    id: 'en5',
    label: 'en5 clarity',
    statChannels: ['clarity'],
    multiplierRole: 'Clarity percentage multiplier.',
  },
  {
    id: 'en6',
    label: 'en6 eternal multiplier',
    statChannels: ['eternalMultiplier'],
    multiplierRole: 'Eternal multiplier channel.',
  },
  {
    id: 'en7',
    label: 'en7 glacial bloodline',
    statChannels: ['glacialBloodline'],
    multiplierRole: 'Glacial Bloodline multiplier channel.',
  },
  {
    id: 'en8',
    label: 'en8 laceration/divine fire',
    statChannels: ['laceration', 'lacerationUptime', 'divineFire', 'divineFireUptime'],
    multiplierRole: 'Laceration and Divine Fire damage channels weighted by uptime.',
  },
  {
    id: 'en9',
    label: 'en9 Joey weak spot',
    statChannels: ['joeyWeakSpot'],
    multiplierRole: 'Joey weak spot multiplier channel.',
  },
  {
    id: 'en10',
    label: 'en10 SS gloves laser',
    statChannels: ['ssGlovesLaser'],
    multiplierRole: 'SS gloves laser multiplier channel.',
  },
  {
    id: 'en11',
    label: 'en11 flashrift rip',
    statChannels: ['flashriftRip'],
    multiplierRole: 'Flashrift rip multiplier channel.',
  },
  {
    id: 'en12',
    label: 'en12 Taloxa overload',
    statChannels: ['taloxaOverload'],
    multiplierRole: 'Taloxa overload multiplier channel.',
  },
  {
    id: 'en13',
    label: 'en13 Eternal Suit boost',
    statChannels: ['eternalSuitBoost'],
    multiplierRole: 'Eternal Suit optional boost multiplier.',
  },
  {
    id: 'en14',
    label: 'en14 Voidwaker Emblem boost',
    statChannels: ['voidNeckBoost', 'voidNeckBoostUptime'],
    multiplierRole: 'Voidwaker Emblem optional boost multiplied by uptime.',
  },
  {
    id: 'en15',
    label: 'en15 Voidwaker Handguards instakill',
    statChannels: ['voidGlovesInstakill'],
    multiplierRole: 'Voidwaker Handguards instakill optional multiplier.',
  },
  {
    id: 'en16',
    label: 'en16 Voidwaker Treads boost',
    statChannels: ['voidBootsBoost'],
    multiplierRole: 'Voidwaker Treads optional boost multiplier.',
  },
  {
    id: 'en17',
    label: 'en17 chaos belt boost',
    statChannels: ['chaosBeltBoost'],
    multiplierRole: 'Chaos belt optional boost multiplier.',
  },
  {
    id: 'en18',
    label: 'en18 HP Bullet boost',
    statChannels: ['hpBulletBoost'],
    multiplierRole: 'HP Bullet optional boost multiplier.',
  },
  {
    id: 'en19',
    label: 'en19 damage dealt',
    statChannels: ['damageDealt'],
    multiplierRole: 'Damage dealt percentage multiplier.',
  },
  {
    id: 'en20',
    label: 'en20 adrenaline',
    statChannels: ['adrenaline'],
    multiplierRole: 'Adrenaline percentage multiplier.',
  },
  {
    id: 'en21',
    label: 'en21 xeno transmute damage',
    statChannels: ['damageTransmute'],
    multiplierRole: 'Xeno transmute damage percentage multiplier.',
  },
  {
    id: 'en22',
    label: 'en22 boss damage',
    statChannels: ['damageBoss'],
    multiplierRole: 'Boss damage percentage multiplier.',
  },
  {
    id: 'en23',
    label: 'en23 xeno resonance multiplier',
    statChannels: ['xenoResMultiplier'],
    multiplierRole: 'Xeno resonance percentage multiplier.',
  },
  {
    id: 'en24',
    label: 'en24 LME phase damage',
    statChannels: ['lme1Damage'],
    multiplierRole: 'LME phase damage percentage multiplier.',
  },
];

const COMMON_STAGE_CAVEATS = [
  'SIO Tools-equivalent stage mapping only; not an independently captured first-party in-game formula.',
  'Source-derived rows must not be promoted to direct in-game-description-verified evidence.',
];

const CAVEATS = [
  'This spec claims only SIO Tools-equivalent Tangtang damage formula derivation, not a full direct first-party in-game text verification.',
  'The requested Tangtang/Rust provenance en0-en24 labels are documented as the current local formula stage labels; live SIO trace factors include a standalone skillDamage factor, so trace indices must not be treated as direct official in-game stage labels.',
  'non-SS weapons remain catalog-only and unsupported as formula inputs until fixture evidence exists.',
  'SpongeBob/Squidward/Yelena are source/live backed but do not have direct first-party in-game description capture.',
  'Mounts have source/live mountDamage evidence and 9 direct first-party Doomsteed line capture atom rows, but complete exact per-line mount text coverage is still incomplete.',
  'Collectible item/set mapping is source/Rust backed, but item/set-level in-game description capture is incomplete.',
  'Catalog-only collectible rows remain isolated.',
  'No formula semantics, scoring core, Rust damage formula, WASM scoring behavior, optimizer ranking, or product UI changed.',
];

async function transpileModule(sourcePath, outPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.outputText);
}

await fs.rm(buildDir, { recursive: true, force: true });
await transpileModule(
  path.join(root, 'app/lib/pareto-store/schemas/index.ts'),
  path.join(buildDir, 'schemas/index.js'),
);

const require = createRequire(import.meta.url);
const schemas = require(path.join(buildDir, 'schemas/index.js'));
const { SIO_STATS_FIXED_ORDER, WEAPON_SCHEMA_INDEX } = schemas;
const statByKey = new Map(SIO_STATS_FIXED_ORDER.map((stat) => [stat.key, stat]));

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath.replace(/^frontend\//, '')), 'utf8');
}

const [
  sourceEvidence,
  provenanceMatrix,
  liveEvidence,
  targetedLiveEvidence,
  inGameDescriptionEvidence,
  collectibleEffectMapping,
  mountDamageSourceFixture,
  traceSummary,
  inputSummary,
  equivalenceMatrix,
  descriptionFormulaValidationMatrix,
  descriptionFormulaValidationProtocol,
  descriptionCaptureImportMatrix,
  descriptionCaptureImportProtocol,
  firstPartyDescriptionSourceInventory,
  firstPartyDescriptionSourceInventoryMd,
  inGameDamageValidationMatrix,
  inGameDamageValidationProtocol,
] = await Promise.all([
  readJson('frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json'),
  readText('frontend/artifacts/td11/damage_formula_provenance_matrix.md'),
  readJson('frontend/artifacts/td11/sio_tools_live_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/in_game_description_evidence_matrix.json'),
  readJson('frontend/artifacts/td11/collectible_effect_mapping_matrix.json'),
  readJson('frontend/artifacts/td11/mount_damage_source_fixture.json'),
  readJson('frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json'),
  readJson('frontend/artifacts/td11/sio_lm_input_summary_2026-05-20.json'),
  readJson('frontend/artifacts/td11/sio_lm_equivalence_matrix.json'),
  readJson('frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md'),
  readJson('frontend/artifacts/td11/tangtang_description_capture_import_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_description_capture_import_protocol.md'),
  readJson('frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json'),
  readText('frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md'),
  readJson('frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json'),
  readText('frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md'),
]);

for (const input of REQUIRED_SOURCE_INPUTS) {
  await fs.access(path.join(root, input.replace(/^frontend\//, '')));
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

function sourceRowsForStage(stage) {
  return sourceEvidence.sourceLeafRows.filter((row) => stage.statChannels.includes(row.statChannel));
}

function sourceDomainsForRows(rows) {
  return [...new Set(rows.map((row) => row.domainRoot))].sort();
}

function sourceCountsByDomain(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.domainRoot, (counts.get(row.domainRoot) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function traceStageKeyFor(stage) {
  const traceCase = traceSummary.cases?.[0];
  if (!traceCase || !Array.isArray(traceCase.stageFactors)) {
    return null;
  }
  const index = Number(stage.id.replace(/^en/, ''));
  return traceCase.stageFactors[index]?.key ?? null;
}

function stageCaveats(stage, rows) {
  const caveats = [...COMMON_STAGE_CAVEATS];
  const formulaOnlyChannels = stage.statChannels.filter((key) => !statByKey.has(key));
  if (formulaOnlyChannels.length > 0) {
    caveats.push(`Formula input channel(s) outside SIO_STATS_FIXED_ORDER: ${formulaOnlyChannels.join(', ')}.`);
  }
  if (rows.length === 0) {
    caveats.push('No raw current source stat leaf was present for this stage in the captured source evidence matrix.');
  }
  if (stage.id === 'en2') {
    caveats.push('The first live trace stage at the same numeric index is skillDamage; this spec keeps the requested Tangtang/Rust provenance label en2 vulnerability.');
  }
  if (stage.id === 'en0') {
    caveats.push('Attack aggregation depends on upstream compact stat reconstruction and is not a standalone in-game text claim.');
  }
  if (stage.id === 'en14') {
    caveats.push('Voidwaker Emblem uptime remains governed by SIO LM/source equivalence evidence.');
  }
  if (stage.id === 'en24') {
    caveats.push('LME phase damage is mode-dependent and represented here only as the requested en24 channel.');
  }
  return caveats;
}

function buildStages() {
  return STAGE_DEFINITIONS.map((stage, index) => {
    const rows = sourceRowsForStage(stage);
    return stableObject({
      id: stage.id,
      index,
      label: stage.label,
      statChannels: stage.statChannels,
      sourceEvidenceCount: rows.length,
      sourceDomains: sourceDomainsForRows(rows),
      sourceCountsByDomain: sourceCountsByDomain(rows),
      multiplierRole: stage.multiplierRole,
      knownCaveats: stageCaveats(stage, rows),
      provenanceArtifactReferences: [
        'frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json',
        'frontend/artifacts/td11/damage_formula_provenance_matrix.md',
        'frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json',
        'tttg_forge_core/src/v3_damage.rs',
      ],
      traceReference: {
        firstTraceStageKeyAtSameIndex: traceStageKeyFor(stage),
        traceStageProductPassed: traceSummary.summary.stageProductPassed,
        traceCases: traceSummary.summary.cases,
      },
    });
  });
}

function equivalenceDomainStatus(id) {
  const domain = equivalenceMatrix.domains.find((item) => item.id === id);
  return domain ? domain.status : 'not-listed';
}

function buildDomainCoverage() {
  const rawByDomain = sourceEvidence.summary.rawSourceLeafRowsByDomain;
  return stableObject([
    {
      domain: 'attack/base',
      status: 'source/live SIO Tools-equivalent',
      sourceEvidenceCount: rawByDomain.baseStats,
      stageRefs: ['en0'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json'],
      caveat: 'Base attack rows are source-derived and rely on compact input reconstruction.',
    },
    {
      domain: 'equipment',
      status: equivalenceDomainStatus('equipment'),
      sourceEvidenceCount: rawByDomain.items,
      stageRefs: ['en0', 'en10', 'en13', 'en14', 'en15', 'en16', 'en17', 'en18', 'en19', 'en21', 'en22'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_lm_equivalence_matrix.json', 'frontend/artifacts/td11/damage_formula_provenance_matrix.md'],
      caveat: 'SS equipment is live-equivalent; non-SS weapons remain catalog-only and unsupported as formula inputs.',
    },
    {
      domain: 'survivor',
      status: equivalenceDomainStatus('survivors-passives-harmony-teamwork'),
      sourceEvidenceCount: rawByDomain.heroes,
      normalizedClaims: sourceEvidence.summary.targetSurvivorNormalizedClaims,
      liveRows: liveEvidence.summary.targetSurvivorLiveRows,
      stageRefs: ['en0', 'en1', 'en2', 'en8', 'en12', 'en20'],
      evidenceArtifacts: [
        'frontend/artifacts/td11/in_game_description_evidence_matrix.json',
        'frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json',
      ],
      caveat: 'SpongeBob/Squidward/Yelena remain source/live backed without direct first-party description capture.',
    },
    {
      domain: 'pet',
      status: equivalenceDomainStatus('pets-xeno-awakening'),
      sourceEvidenceCount: rawByDomain.pets + rawByDomain.petSkills,
      stageRefs: ['en23'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_lm_equivalence_matrix.json'],
      caveat: 'Pet and xeno effects are covered through compact SIO LM equivalence, not a direct per-skill in-game text audit.',
    },
    {
      domain: 'tech',
      status: equivalenceDomainStatus('active-skills'),
      sourceEvidenceCount: rawByDomain.techs,
      stageRefs: ['en1', 'en2', 'en3', 'en4', 'en8', 'en19', 'en22'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_lm_equivalence_matrix.json', 'frontend/artifacts/td11/damage_formula_provenance_matrix.md'],
      caveat: 'Tech modifier and active-skill behavior remains governed by SIO LM/source equivalence gates.',
    },
    {
      domain: 'mount',
      status: equivalenceDomainStatus('mounts'),
      sourceEvidenceCount: sourceEvidence.summary.mountRawCumulativeLeafRows,
      normalizedClaims: sourceEvidence.summary.mountNormalizedClaims,
      liveRows: liveEvidence.summary.nonZeroMountDamageLiveRows,
      stageRefs: ['en1', 'en3', 'en4', 'en8', 'en22'],
      evidenceArtifacts: [
        'frontend/artifacts/td11/mount_damage_source_fixture.json',
        'frontend/artifacts/td11/sio_tools_live_evidence_matrix.json',
      ],
      caveat:
        'mountDamage source/live evidence exists; 9 direct first-party Doomsteed line capture atom rows match current handling, while complete mount line capture coverage remains incomplete.',
    },
    {
      domain: 'collectible',
      status: equivalenceDomainStatus('collectibles-custom-sets'),
      sourceEvidenceCount: rawByDomain.collectibles + rawByDomain.sets,
      thresholdRows: collectibleEffectMapping.summary.thresholdRows,
      specialRustMappings: sourceEvidence.summary.collectibleSpecialRustMappings,
      catalogOnlyRows: sourceEvidence.summary.collectibleCatalogOnlyRows,
      stageRefs: ['en1', 'en2', 'en3', 'en4', 'en8', 'en19', 'en22'],
      evidenceArtifacts: ['frontend/artifacts/td11/collectible_effect_mapping_matrix.json'],
      caveat: 'Item/set mapping is source/Rust backed; item/set-level in-game description capture is incomplete and 46 catalog-only rows stay isolated.',
    },
    {
      domain: 'custom-set',
      status: equivalenceDomainStatus('collectibles-custom-sets'),
      sourceEvidenceCount: rawByDomain.customSets,
      stageRefs: ['en0', 'en1', 'en2', 'en3', 'en4', 'en8', 'en19', 'en22'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_lm_equivalence_matrix.json'],
      caveat: 'Custom-set rows are source/live equivalent through compact replay, not direct in-game text claims.',
    },
    {
      domain: 'LME',
      status: equivalenceDomainStatus('lme'),
      sourceEvidenceCount: rawByDomain.lme,
      stageRefs: ['en24'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json'],
      caveat: 'LME phase damage is mode-dependent and remains a SIO Tools-equivalent derivation.',
    },
    {
      domain: 'effect',
      status: 'source/live SIO Tools-equivalent',
      sourceEvidenceCount: rawByDomain.ee + rawByDomain.evoTree + rawByDomain.skills + rawByDomain.synergy + rawByDomain.harmony,
      stageRefs: ['en1', 'en2', 'en3', 'en4', 'en8', 'en19', 'en20', 'en22'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json'],
      caveat: 'Effect rows feed stat channels through source/live gates and are not standalone official in-game formula proof.',
    },
    {
      domain: 'status',
      status: 'source/live SIO Tools-equivalent',
      sourceEvidenceCount: STAGE_DEFINITIONS.filter((stage) => ['en3', 'en4', 'en8'].includes(stage.id))
        .flatMap((stage) => sourceRowsForStage(stage)).length,
      stageRefs: ['en3', 'en4', 'en8'],
      evidenceArtifacts: ['frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json'],
      caveat: 'Status damage uses source-derived channels plus uptime channels; direct first-party text verification remains incomplete.',
    },
  ]);
}

function nonSsWeapons() {
  return WEAPON_SCHEMA_INDEX
    .filter((weapon) => weapon.id !== 'twinLance')
    .map((weapon) => stableObject({
      id: weapon.id,
      displayName: weapon.display_name_en,
      formulaInputStatus: 'catalog-only unsupported',
      formulaInputSupported: false,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function buildSpec() {
  const stages = buildStages();
  const stagesById = Object.fromEntries(stages.map((stage) => [stage.id, stage]));
  const rawDirectCount = stages.reduce((sum, stage) => sum + stage.sourceEvidenceCount, 0);
  const unsupportedWeapons = nonSsWeapons();
  return stableObject({
    title: 'Tangtang Damage Formula Derivation',
    generatedAtKst: sourceEvidence.generatedAtKst,
    status: '[TANGTANG-DAMAGE-FORMULA-SPEC-GREEN]',
    claim: 'sio-tools-equivalent',
    behaviorChange: false,
    sourceInputs: REQUIRED_SOURCE_INPUTS,
    sourceInputsDigest: {
      provenanceMatrixContainsFormulaBacklog: provenanceMatrix.includes('Formula derivation') || provenanceMatrix.includes('formula'),
      traceCases: traceSummary.summary.cases,
      traceStageProductPassed: traceSummary.summary.stageProductPassed,
      inputSummaryCases: inputSummary.summary.cases,
    },
    equivalenceContract: {
      fullSioEquivalent: equivalenceMatrix.fullSioEquivalent,
      currentScorer: equivalenceMatrix.currentScorer,
      scorer: equivalenceMatrix.scorer,
      gateStatus: equivalenceMatrix.status,
      gateReason: equivalenceMatrix.gate.reason,
      requiredProductState: 'fullSioEquivalent=true and currentScorer=scorer=sio_full_lm_equivalence must remain true.',
    },
    fullSioEquivalent: equivalenceMatrix.fullSioEquivalent,
    currentScorer: equivalenceMatrix.currentScorer,
    scorer: equivalenceMatrix.scorer,
    evidenceInterpretation: {
      sourceDerivedEvidence:
        'Rows marked sio-tools-current-source-derived are current SIO Tools source/live evidence used for Tangtang equivalence.',
      directInGameVerifiedEvidence:
        'Direct first-party in-game description verification is reserved for independently captured in-game text mapped to source keys and Rust/stat channels.',
      directInGameVerifiedRows: sourceEvidence.summary.inGameDescriptionVerifiedRows,
      warning:
        'Do not state that this is an official formula independently captured from every in-game description line.',
    },
    descriptionFormulaValidationGate: {
      status: descriptionFormulaValidationMatrix.status,
      claim: descriptionFormulaValidationMatrix.claim,
      matrixPath: 'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
      protocolPath: 'frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md',
      currentDescriptionFormulaCorrectnessClaim:
        descriptionFormulaValidationMatrix.validationScope.currentDescriptionFormulaCorrectnessClaim,
      formulaAtomRows: descriptionFormulaValidationMatrix.formulaAtomSummary.totalRows,
      stageBucketTaxonomyRows: descriptionFormulaValidationMatrix.formulaAtomSummary.stageBucketTaxonomyRows,
      mountAtomRows: descriptionFormulaValidationMatrix.formulaAtomSummary.mountAtomRows,
      survivorAtomRows: descriptionFormulaValidationMatrix.formulaAtomSummary.survivorAtomRows,
      collectibleThresholdAtomRows: descriptionFormulaValidationMatrix.formulaAtomSummary.collectibleThresholdAtomRows,
      collectibleSpecialRustMappingAtomRows:
        descriptionFormulaValidationMatrix.formulaAtomSummary.collectibleSpecialRustMappingAtomRows,
      directFirstPartyDescriptionFormulaRows:
        descriptionFormulaValidationMatrix.validationScope.directFirstPartyDescriptionFormulaRows,
      descriptionDivergenceRows: descriptionFormulaValidationMatrix.divergenceRows.length,
      graphMode: descriptionFormulaValidationMatrix.formulaAtomGraph.graphMode,
      primaryValidationLayer: 'description-derived-formula-validation',
      observedDamageValidationRole: descriptionFormulaValidationMatrix.decisionPolicy.observedDamageValidationRole,
      canClaimSioFormulaDescriptionCorrect:
        descriptionFormulaValidationMatrix.decisionPolicy.canClaimSioFormulaDescriptionCorrect,
      canApplyTangtangFormulaCorrection:
        descriptionFormulaValidationMatrix.decisionPolicy.canApplyTangtangFormulaCorrection,
    },
    descriptionCaptureImportGate: {
      status: descriptionCaptureImportMatrix.status,
      claim: descriptionCaptureImportMatrix.claim,
      inboxPath: 'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
      matrixPath: 'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
      protocolPath: 'frontend/artifacts/td11/tangtang_description_capture_import_protocol.md',
      captureInboxRows: descriptionCaptureImportMatrix.summary.captureInboxRows,
      directFirstPartyDescriptionCaptureRows:
        descriptionCaptureImportMatrix.summary.directFirstPartyDescriptionCaptureRows,
      parsedDescriptionFormulaRows: descriptionCaptureImportMatrix.summary.parsedDescriptionFormulaRows,
      matchedSioRows: descriptionCaptureImportMatrix.summary.matchedSioRows,
      descriptionSioDivergenceRows: descriptionCaptureImportMatrix.summary.descriptionSioDivergenceRows,
      observedDamageFollowUpRows: descriptionCaptureImportMatrix.summary.observedDamageFollowUpRows,
      formulaAtomRowsRemainingWithoutDirectCapture:
        descriptionCaptureImportMatrix.firstPartyCaptureCoverage.formulaAtomRowsRemainingWithoutDirectCapture,
      capturedAtomRows: descriptionCaptureImportMatrix.firstPartyCaptureCoverage.capturedAtomRows,
      canRunObservedDamageFollowUp:
        descriptionCaptureImportMatrix.decisionPolicy.canRunObservedDamageFollowUp,
      canApplyTangtangFormulaCorrection:
        descriptionCaptureImportMatrix.decisionPolicy.canApplyTangtangFormulaCorrection,
    },
    firstPartyDescriptionSourceInventoryGate: {
      status: firstPartyDescriptionSourceInventory.status,
      claim: firstPartyDescriptionSourceInventory.claim,
      matrixPath: 'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json',
      protocolPath: 'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md',
      officialPublicSourceCandidates:
        firstPartyDescriptionSourceInventory.summary.officialPublicSourceCandidates,
      officialPublicSourcesWithStructuredFormulaRows:
        firstPartyDescriptionSourceInventory.summary.officialPublicSourcesWithStructuredFormulaRows,
      officialPublicRowsPromotedToDirectCapture:
        firstPartyDescriptionSourceInventory.summary.officialPublicRowsPromotedToDirectCapture,
      localAppResourceArtifactsFound:
        firstPartyDescriptionSourceInventory.summary.localAppResourceArtifactsFound,
      rowsRequiringDirectDescriptionCapture:
        firstPartyDescriptionSourceInventory.summary.rowsRequiringDirectDescriptionCapture,
      directFirstPartyDescriptionFormulaRows:
        firstPartyDescriptionSourceInventory.summary.directFirstPartyDescriptionFormulaRows,
      directFirstPartyDescriptionCaptureRows:
        firstPartyDescriptionSourceInventory.summary.directFirstPartyDescriptionCaptureRows,
      parsedDescriptionFormulaRows:
        firstPartyDescriptionSourceInventory.summary.parsedDescriptionFormulaRows,
      matchedSioRows:
        firstPartyDescriptionSourceInventory.summary.matchedSioRows,
      formulaAtomRowsRemainingWithoutDirectCapture:
        firstPartyDescriptionSourceInventory.summary.formulaAtomRowsRemainingWithoutDirectCapture,
      userOneByOneCaptureRequired:
        firstPartyDescriptionSourceInventory.summary.userOneByOneCaptureRequired,
      publicOfficialWebSufficientForFormulaValidation:
        firstPartyDescriptionSourceInventory.summary.publicOfficialWebSufficientForFormulaValidation,
    },
    inGameDamageValidationGate: {
      status: inGameDamageValidationMatrix.status,
      claim: inGameDamageValidationMatrix.claim,
      matrixPath: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
      protocolPath: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md',
      primaryValidationLayer: inGameDamageValidationMatrix.validationScope.primaryValidationLayer,
      observedDamageValidationLayer: inGameDamageValidationMatrix.validationScope.observedDamageValidationLayer,
      currentInGameCorrectnessClaim: inGameDamageValidationMatrix.validationScope.currentInGameCorrectnessClaim,
      directFirstPartyDescriptionFormulaRows:
        inGameDamageValidationMatrix.validationScope.directFirstPartyDescriptionFormulaRows,
      descriptionDivergenceRows: inGameDamageValidationMatrix.validationScope.descriptionDivergenceRows,
      directObservedDamageTrialCount: inGameDamageValidationMatrix.validationScope.directObservedDamageTrialCount,
      canClaimSioFormulaInGameCorrect: inGameDamageValidationMatrix.decisionPolicy.canClaimSioFormulaInGameCorrect,
      canApplyTangtangFormulaCorrection: inGameDamageValidationMatrix.decisionPolicy.canApplyTangtangFormulaCorrection,
      canRunObservedDamageFollowUpWithoutDescriptionDivergence:
        inGameDamageValidationMatrix.decisionPolicy.canRunObservedDamageFollowUpWithoutDescriptionDivergence,
      currentCorrectionStatus: inGameDamageValidationMatrix.correctionPolicy.currentCorrectionStatus,
    },
    summaryCounts: {
      rawSourceLeafRows: sourceEvidence.summary.rawSourceLeafRows,
      rawSourceLeafRowsWithDirectMultiplierStage: sourceEvidence.summary.rawSourceLeafRowsWithDirectMultiplierStage,
      rawDirectStageCountFromSpec: rawDirectCount,
      mountNormalizedClaims: sourceEvidence.summary.mountNormalizedClaims,
      mountRawCumulativeLeafRows: sourceEvidence.summary.mountRawCumulativeLeafRows,
      targetSurvivorNormalizedClaims: sourceEvidence.summary.targetSurvivorNormalizedClaims,
      targetSurvivorRawCumulativeLeafRows: sourceEvidence.summary.targetSurvivorRawCumulativeLeafRows,
      collectibleThresholdRows: sourceEvidence.summary.collectibleThresholdRows,
      collectibleRawThresholdLeafRows: sourceEvidence.summary.collectibleRawThresholdLeafRows,
      collectibleSpecialRustMappings: sourceEvidence.summary.collectibleSpecialRustMappings,
      collectibleCatalogOnlyRows: sourceEvidence.summary.collectibleCatalogOnlyRows,
      inGameDescriptionVerifiedRows: sourceEvidence.summary.inGameDescriptionVerifiedRows,
      liveCaptureCount: liveEvidence.summary.liveCaptureCases,
      workerParityArbitraryGeneratedLiveExpected: `${liveEvidence.summary.liveCapturedCases}/${liveEvidence.summary.liveCaptureCases}`,
      targetedLiveCaptureCases: targetedLiveEvidence.summary.targetedLiveCaptureCases,
      mountDamageSourceFixtureRows: mountDamageSourceFixture.summary.totalRows,
      nonSsWeaponsUnsupportedCatalogOnly: unsupportedWeapons.length,
    },
    stageOrder: stages.map((stage) => stage.id),
    stageOrderLabels: stages.map((stage) => stage.label),
    stages: stagesById,
    domainCoverage: buildDomainCoverage(),
    unsupportedFormulaInputs: {
      nonSsWeapons: unsupportedWeapons,
      catalogOnlyCollectibleRows: sourceEvidence.summary.collectibleCatalogOnlyRows,
    },
    caveats: CAVEATS,
    verificationCommands: [
      'node scripts/tangtang_damage_formula_spec_unit_test.mjs',
      'node scripts/tangtang_first_party_description_source_inventory_unit_test.mjs',
      'node scripts/tangtang_description_capture_import_unit_test.mjs',
      'node scripts/tangtang_description_formula_validation_unit_test.mjs',
      'node scripts/tangtang_in_game_damage_validation_unit_test.mjs',
      'node scripts/sio_tools_formula_source_evidence_unit_test.mjs',
      'node scripts/damage_formula_provenance_matrix_unit_test.mjs',
      'node scripts/in_game_description_evidence_unit_test.mjs',
      'node scripts/sio_tools_live_evidence_matrix_unit_test.mjs',
      'node scripts/sio_tools_targeted_live_evidence_unit_test.mjs',
      'node scripts/mount_damage_source_fixture_unit_test.mjs',
      'node scripts/collectible_effect_mapping_matrix_unit_test.mjs',
      'node scripts/generic_aggregate_non_authority_gate.mjs',
      'npx tsc --noEmit',
      'SIO_FULL_EQUIVALENCE_REQUIRED=1 node scripts/sio_full_equivalence_gate.mjs',
      'git diff --check',
    ],
    artifactPaths: {
      json: 'frontend/artifacts/td11/tangtang_damage_formula_spec.json',
      markdown: 'frontend/artifacts/td11/tangtang_damage_formula_spec.md',
      script: 'frontend/scripts/tangtang_damage_formula_spec_unit_test.mjs',
      descriptionFormulaValidationMatrix: 'frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json',
      descriptionFormulaValidationProtocol:
        'frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md',
      descriptionCaptureInbox: 'frontend/artifacts/td11/tangtang_description_capture_inbox.json',
      descriptionCaptureImportMatrix: 'frontend/artifacts/td11/tangtang_description_capture_import_matrix.json',
      descriptionCaptureImportProtocol: 'frontend/artifacts/td11/tangtang_description_capture_import_protocol.md',
      firstPartyDescriptionSourceInventory:
        'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json',
      firstPartyDescriptionSourceInventoryProtocol:
        'frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md',
      inGameDamageValidationMatrix: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json',
      inGameDamageValidationProtocol: 'frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md',
      provenanceMatrix: 'frontend/artifacts/td11/damage_formula_provenance_matrix.md',
      audit: 'frontend/artifacts/td11/sio_product_flow_gap_audit.md',
    },
  });
}

function renderStageTable(stages) {
  return [
    '| Stage | Stat channels | Source evidence count | Source domains | Multiplier role | Known caveats |',
    '|---|---|---:|---|---|---|',
    ...stages.map((stage) => [
      stage.label,
      stage.statChannels.join(', '),
      stage.sourceEvidenceCount,
      stage.sourceDomains.join(', ') || 'none in current source leaves',
      stage.multiplierRole,
      stage.knownCaveats.join('<br>'),
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function renderDomainTable(domains) {
  return [
    '| Domain | Status | Source evidence count | Stage refs | Evidence artifacts | Caveat |',
    '|---|---|---:|---|---|---|',
    ...domains.map((domain) => [
      domain.domain,
      domain.status,
      domain.sourceEvidenceCount,
      domain.stageRefs.join(', '),
      domain.evidenceArtifacts.join('<br>'),
      domain.caveat,
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function renderMarkdown(spec) {
  const stages = spec.stageOrder.map((id) => spec.stages[id]);
  return `# ${spec.title}

generatedAtKst: ${spec.generatedAtKst}
status: ${spec.status}
claim: \`${spec.claim}\`
behaviorChange: \`${spec.behaviorChange}\`

## Executive Summary

This is a source/live SIO Tools-equivalent Tangtang damage formula derivation. It documents the current scorer contract and evidence-backed multiplier-stage mapping without changing formula semantics, scoring core, Rust formula code, WASM scoring behavior, optimizer ranking, or product UI.

This is not a claim that every in-game description line was independently captured from first-party game UI and verified as an official formula. Source-derived evidence and direct in-game verified evidence remain separate.

Contract:

- \`fullSioEquivalent=${spec.fullSioEquivalent}\`
- \`currentScorer=${spec.currentScorer}\`
- \`scorer=${spec.scorer}\`
- \`liveCaptureCount=${spec.summaryCounts.liveCaptureCount}\`
- \`workerParity.arbitraryGeneratedLiveExpected=${spec.summaryCounts.workerParityArbitraryGeneratedLiveExpected}\`

Key source/live counts:

- Raw current source stat leaves: ${spec.summaryCounts.rawSourceLeafRows}
- Raw leaves with direct multiplier stage mapping: ${spec.summaryCounts.rawSourceLeafRowsWithDirectMultiplierStage}
- Mount normalized claims: ${spec.summaryCounts.mountNormalizedClaims}
- Target survivor normalized claims: ${spec.summaryCounts.targetSurvivorNormalizedClaims}
- Collectible threshold rows: ${spec.summaryCounts.collectibleThresholdRows}
- Collectible special Rust mappings: ${spec.summaryCounts.collectibleSpecialRustMappings}
- Direct in-game description verified rows: ${spec.summaryCounts.inGameDescriptionVerifiedRows}

## Formula Stage Table

${renderStageTable(stages)}

## Domain Coverage

${renderDomainTable(spec.domainCoverage)}

## Caveats And Blockers

${spec.caveats.map((item) => `- ${item}`).join('\n')}

## Description Formula Validation Gate

- Validation matrix: \`${spec.descriptionFormulaValidationGate.matrixPath}\`
- Validation protocol: \`${spec.descriptionFormulaValidationGate.protocolPath}\`
- Status: \`${spec.descriptionFormulaValidationGate.status}\`
- Claim: \`${spec.descriptionFormulaValidationGate.claim}\`
- Primary validation layer: \`${spec.descriptionFormulaValidationGate.primaryValidationLayer}\`
- Current description-derived formula correctness claim: \`${spec.descriptionFormulaValidationGate.currentDescriptionFormulaCorrectnessClaim}\`
- Formula atom rows: ${spec.descriptionFormulaValidationGate.formulaAtomRows}
- Stage bucket taxonomy rows: ${spec.descriptionFormulaValidationGate.stageBucketTaxonomyRows}
- Mount atom rows: ${spec.descriptionFormulaValidationGate.mountAtomRows}
- Survivor atom rows: ${spec.descriptionFormulaValidationGate.survivorAtomRows}
- Collectible threshold atom rows: ${spec.descriptionFormulaValidationGate.collectibleThresholdAtomRows}
- Collectible special Rust mapping atom rows: ${spec.descriptionFormulaValidationGate.collectibleSpecialRustMappingAtomRows}
- Graph mode: \`${spec.descriptionFormulaValidationGate.graphMode}\`
- Direct first-party description-derived formula rows in formula-validation gate before capture import: ${spec.descriptionFormulaValidationGate.directFirstPartyDescriptionFormulaRows}
- Description/SIO divergence rows: ${spec.descriptionFormulaValidationGate.descriptionDivergenceRows}
- Observed damage validation role: ${spec.descriptionFormulaValidationGate.observedDamageValidationRole}
- Can claim SIO formula description-correct: \`${spec.descriptionFormulaValidationGate.canClaimSioFormulaDescriptionCorrect}\`
- Can apply Tangtang formula correction: \`${spec.descriptionFormulaValidationGate.canApplyTangtangFormulaCorrection}\`

## Description Capture Import Gate

- Capture inbox: \`${spec.descriptionCaptureImportGate.inboxPath}\`
- Import matrix: \`${spec.descriptionCaptureImportGate.matrixPath}\`
- Import protocol: \`${spec.descriptionCaptureImportGate.protocolPath}\`
- Status: \`${spec.descriptionCaptureImportGate.status}\`
- Claim: \`${spec.descriptionCaptureImportGate.claim}\`
- Capture inbox rows: ${spec.descriptionCaptureImportGate.captureInboxRows}
- Direct first-party description capture rows: ${spec.descriptionCaptureImportGate.directFirstPartyDescriptionCaptureRows}
- Parsed description formula rows: ${spec.descriptionCaptureImportGate.parsedDescriptionFormulaRows}
- Matched SIO rows: ${spec.descriptionCaptureImportGate.matchedSioRows}
- Description/SIO divergence rows: ${spec.descriptionCaptureImportGate.descriptionSioDivergenceRows}
- Observed damage follow-up rows: ${spec.descriptionCaptureImportGate.observedDamageFollowUpRows}
- Captured atom rows: ${spec.descriptionCaptureImportGate.capturedAtomRows}
- Formula atom rows remaining without direct capture: ${spec.descriptionCaptureImportGate.formulaAtomRowsRemainingWithoutDirectCapture}
- Can run observed damage follow-up: \`${spec.descriptionCaptureImportGate.canRunObservedDamageFollowUp}\`
- Can apply Tangtang formula correction: \`${spec.descriptionCaptureImportGate.canApplyTangtangFormulaCorrection}\`

## First-Party Description Source Inventory

- Source inventory: \`${spec.firstPartyDescriptionSourceInventoryGate.matrixPath}\`
- Source inventory protocol: \`${spec.firstPartyDescriptionSourceInventoryGate.protocolPath}\`
- Status: \`${spec.firstPartyDescriptionSourceInventoryGate.status}\`
- Claim: \`${spec.firstPartyDescriptionSourceInventoryGate.claim}\`
- Official/public source candidates checked: ${spec.firstPartyDescriptionSourceInventoryGate.officialPublicSourceCandidates}
- Official/public sources with structured formula rows: ${spec.firstPartyDescriptionSourceInventoryGate.officialPublicSourcesWithStructuredFormulaRows}
- Official/public rows promoted to direct capture: ${spec.firstPartyDescriptionSourceInventoryGate.officialPublicRowsPromotedToDirectCapture}
- Local app resource artifacts found: ${spec.firstPartyDescriptionSourceInventoryGate.localAppResourceArtifactsFound}
- Rows requiring direct description capture: ${spec.firstPartyDescriptionSourceInventoryGate.rowsRequiringDirectDescriptionCapture}
- Direct first-party description-derived formula rows in formula-validation gate before capture import: ${spec.firstPartyDescriptionSourceInventoryGate.directFirstPartyDescriptionFormulaRows}
- Direct first-party description capture rows: ${spec.firstPartyDescriptionSourceInventoryGate.directFirstPartyDescriptionCaptureRows}
- Parsed description formula rows: ${spec.firstPartyDescriptionSourceInventoryGate.parsedDescriptionFormulaRows}
- Matched SIO rows: ${spec.firstPartyDescriptionSourceInventoryGate.matchedSioRows}
- Formula atom rows remaining without direct capture: ${spec.firstPartyDescriptionSourceInventoryGate.formulaAtomRowsRemainingWithoutDirectCapture}
- User one-by-one capture required: \`${spec.firstPartyDescriptionSourceInventoryGate.userOneByOneCaptureRequired}\`
- Public official web sufficient for formula validation: \`${spec.firstPartyDescriptionSourceInventoryGate.publicOfficialWebSufficientForFormulaValidation}\`

## In-Game Damage Validation Gate

- Validation matrix: \`${spec.inGameDamageValidationGate.matrixPath}\`
- Validation protocol: \`${spec.inGameDamageValidationGate.protocolPath}\`
- Status: \`${spec.inGameDamageValidationGate.status}\`
- Claim: \`${spec.inGameDamageValidationGate.claim}\`
- Primary validation layer: \`${spec.inGameDamageValidationGate.primaryValidationLayer}\`
- Observed damage validation layer: \`${spec.inGameDamageValidationGate.observedDamageValidationLayer}\`
- Current in-game correctness claim: \`${spec.inGameDamageValidationGate.currentInGameCorrectnessClaim}\`
- Direct first-party description-derived formula rows in formula-validation gate before capture import: ${spec.inGameDamageValidationGate.directFirstPartyDescriptionFormulaRows}
- Description/SIO divergence rows: ${spec.inGameDamageValidationGate.descriptionDivergenceRows}
- Direct observed in-game damage trials: ${spec.inGameDamageValidationGate.directObservedDamageTrialCount}
- Can claim SIO formula in-game correct: \`${spec.inGameDamageValidationGate.canClaimSioFormulaInGameCorrect}\`
- Can apply Tangtang formula correction: \`${spec.inGameDamageValidationGate.canApplyTangtangFormulaCorrection}\`
- Can run observed damage follow-up without description divergence: \`${spec.inGameDamageValidationGate.canRunObservedDamageFollowUpWithoutDescriptionDivergence}\`
- Current correction status: \`${spec.inGameDamageValidationGate.currentCorrectionStatus}\`

## Unsupported Formula Inputs

- non-SS weapons remain catalog-only and unsupported as formula inputs: ${spec.unsupportedFormulaInputs.nonSsWeapons.length} rows.
- Catalog-only collectible rows remain isolated: ${spec.unsupportedFormulaInputs.catalogOnlyCollectibleRows} rows.

## Evidence Artifacts

${spec.sourceInputs.map((input) => `- \`${input}\``).join('\n')}

## Verification Commands

${spec.verificationCommands.map((command) => `- \`${command}\``).join('\n')}
`;
}

const spec = buildSpec();
const stages = spec.stageOrder.map((id) => spec.stages[id]);
const jsonSerialized = `${JSON.stringify(spec, null, 2)}\n`;
const mdSerialized = renderMarkdown(spec);

assert.equal(spec.title, 'Tangtang Damage Formula Derivation');
assert.equal(spec.claim, 'sio-tools-equivalent');
assert.equal(spec.behaviorChange, false);
assert.equal(spec.fullSioEquivalent, true);
assert.equal(spec.currentScorer, 'sio_full_lm_equivalence');
assert.equal(spec.scorer, 'sio_full_lm_equivalence');
assert.deepEqual(spec.stageOrder, STAGE_DEFINITIONS.map((stage) => stage.id), 'stage order must include en0 through en24');
assert.equal(stages.length, 25, 'formula spec must include en0 through en24');
assert.equal(spec.summaryCounts.rawSourceLeafRows, 4650);
assert.equal(spec.summaryCounts.rawSourceLeafRowsWithDirectMultiplierStage, 3878);
assert.equal(spec.summaryCounts.rawDirectStageCountFromSpec, 3878);
assert.equal(spec.summaryCounts.mountNormalizedClaims, 26);
assert.equal(spec.summaryCounts.targetSurvivorNormalizedClaims, 11);
assert.equal(spec.summaryCounts.collectibleThresholdRows, 170);
assert.equal(spec.summaryCounts.collectibleSpecialRustMappings, 14);
assert.equal(spec.summaryCounts.inGameDescriptionVerifiedRows, 0);
assert.equal(spec.descriptionFormulaValidationGate.status, '[TANGTANG-DESCRIPTION-FORMULA-VALIDATION-PROTOCOL-READY]');
assert.equal(spec.descriptionFormulaValidationGate.claim, 'description-derived-formula-validation-protocol');
assert.equal(spec.descriptionFormulaValidationGate.primaryValidationLayer, 'description-derived-formula-validation');
assert.equal(spec.descriptionFormulaValidationGate.currentDescriptionFormulaCorrectnessClaim, 'not-established');
assert.equal(spec.descriptionFormulaValidationGate.formulaAtomRows, 221);
assert.equal(spec.descriptionFormulaValidationGate.stageBucketTaxonomyRows, 25);
assert.equal(spec.descriptionFormulaValidationGate.mountAtomRows, 26);
assert.equal(spec.descriptionFormulaValidationGate.survivorAtomRows, 11);
assert.equal(spec.descriptionFormulaValidationGate.collectibleThresholdAtomRows, 170);
assert.equal(spec.descriptionFormulaValidationGate.collectibleSpecialRustMappingAtomRows, 14);
assert.equal(spec.descriptionFormulaValidationGate.graphMode, 'deterministic-atom-ledger-not-graphrag');
assert.equal(spec.descriptionFormulaValidationGate.directFirstPartyDescriptionFormulaRows, 0);
assert.equal(spec.descriptionFormulaValidationGate.descriptionDivergenceRows, 0);
assert.equal(spec.descriptionFormulaValidationGate.canClaimSioFormulaDescriptionCorrect, false);
assert.equal(spec.descriptionFormulaValidationGate.canApplyTangtangFormulaCorrection, false);
assert.ok(spec.descriptionFormulaValidationGate.observedDamageValidationRole.includes('secondary confirmation'));
assert.ok(spec.descriptionFormulaValidationGate.observedDamageValidationRole.includes('not the first validation layer'));
assert.equal(spec.descriptionCaptureImportGate.status, '[TANGTANG-DESCRIPTION-CAPTURE-IMPORT-GATE-READY]');
assert.equal(spec.descriptionCaptureImportGate.claim, 'description-capture-import-gate');
assert.equal(spec.descriptionCaptureImportGate.captureInboxRows, EXPECTED_DESCRIPTION_CAPTURE_ROWS);
assert.equal(
  spec.descriptionCaptureImportGate.directFirstPartyDescriptionCaptureRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
);
assert.equal(spec.descriptionCaptureImportGate.parsedDescriptionFormulaRows, EXPECTED_DESCRIPTION_CAPTURE_ROWS);
assert.equal(spec.descriptionCaptureImportGate.matchedSioRows, EXPECTED_DESCRIPTION_CAPTURE_MATCHED_ROWS);
assert.equal(
  spec.descriptionCaptureImportGate.descriptionSioDivergenceRows,
  EXPECTED_DESCRIPTION_CAPTURE_DIVERGENCE_ROWS,
);
assert.equal(
  spec.descriptionCaptureImportGate.observedDamageFollowUpRows,
  EXPECTED_DESCRIPTION_CAPTURE_OBSERVED_FOLLOW_UP_ROWS,
);
assert.equal(spec.descriptionCaptureImportGate.capturedAtomRows, EXPECTED_DESCRIPTION_CAPTURE_ROWS);
assert.equal(
  spec.descriptionCaptureImportGate.formulaAtomRowsRemainingWithoutDirectCapture,
  EXPECTED_FORMULA_ATOM_ROWS_REMAINING_WITHOUT_DIRECT_CAPTURE,
);
assert.equal(spec.descriptionCaptureImportGate.canRunObservedDamageFollowUp, true);
assert.equal(spec.descriptionCaptureImportGate.canApplyTangtangFormulaCorrection, false);
assert.ok(descriptionCaptureImportProtocol.includes('Capture inbox rows: 12'));
assert.equal(
  spec.firstPartyDescriptionSourceInventoryGate.status,
  '[TANGTANG-FIRST-PARTY-DESCRIPTION-SOURCE-INVENTORY-READY]',
);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.claim, 'first-party-description-source-inventory');
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.officialPublicSourceCandidates, 8);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.officialPublicSourcesWithStructuredFormulaRows, 0);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.officialPublicRowsPromotedToDirectCapture, 0);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.localAppResourceArtifactsFound, 0);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.rowsRequiringDirectDescriptionCapture, 221);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.directFirstPartyDescriptionFormulaRows, 0);
assert.equal(
  spec.firstPartyDescriptionSourceInventoryGate.directFirstPartyDescriptionCaptureRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
);
assert.equal(
  spec.firstPartyDescriptionSourceInventoryGate.parsedDescriptionFormulaRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.matchedSioRows, EXPECTED_DESCRIPTION_CAPTURE_MATCHED_ROWS);
assert.equal(
  spec.firstPartyDescriptionSourceInventoryGate.formulaAtomRowsRemainingWithoutDirectCapture,
  EXPECTED_FORMULA_ATOM_ROWS_REMAINING_WITHOUT_DIRECT_CAPTURE,
);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.userOneByOneCaptureRequired, true);
assert.equal(spec.firstPartyDescriptionSourceInventoryGate.publicOfficialWebSufficientForFormulaValidation, false);
assert.ok(firstPartyDescriptionSourceInventoryMd.includes('Official/public sources with structured formula rows: 0'));
assert.equal(spec.inGameDamageValidationGate.status, '[TANGTANG-IN-GAME-DAMAGE-VALIDATION-PROTOCOL-READY]');
assert.equal(spec.inGameDamageValidationGate.claim, 'in-game-validation-protocol');
assert.equal(spec.inGameDamageValidationGate.primaryValidationLayer, 'description-derived-formula-validation');
assert.equal(spec.inGameDamageValidationGate.observedDamageValidationLayer, 'follow-up-divergence-check-only');
assert.equal(spec.inGameDamageValidationGate.currentInGameCorrectnessClaim, 'not-established');
assert.equal(spec.inGameDamageValidationGate.directFirstPartyDescriptionFormulaRows, 0);
assert.equal(spec.inGameDamageValidationGate.descriptionDivergenceRows, 0);
assert.equal(spec.inGameDamageValidationGate.directObservedDamageTrialCount, 0);
assert.equal(spec.inGameDamageValidationGate.canClaimSioFormulaInGameCorrect, false);
assert.equal(spec.inGameDamageValidationGate.canApplyTangtangFormulaCorrection, false);
assert.equal(spec.inGameDamageValidationGate.canRunObservedDamageFollowUpWithoutDescriptionDivergence, false);
assert.ok(descriptionFormulaValidationProtocol.includes('This is the primary next validation layer'));
assert.ok(inGameDamageValidationProtocol.includes('observed damage trials are a follow-up divergence check'));
assert.equal(inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions, 0);
assert.equal(collectibleEffectMapping.summary.inGameDescriptionVerifiedRows, 0);
assert.equal(mountDamageSourceFixture.summary.liveVerifiedRows, 0);
assert.equal(liveEvidence.summary.nonZeroMountDamageLiveRows, 2);
assert.equal(targetedLiveEvidence.summary.targetSurvivorLiveRows, 3);
assert.ok(
  spec.unsupportedFormulaInputs.nonSsWeapons.length > 0 &&
    spec.unsupportedFormulaInputs.nonSsWeapons.every((weapon) => weapon.formulaInputSupported === false),
  'non-SS weapons must remain unsupported/catalog-only',
);
assert.ok(provenanceMatrix.includes('unsupported for formula input until fixture evidence exists'));
assert.ok(mdSerialized.includes('This is not a claim that every in-game description line was independently captured'));
assert.ok(mdSerialized.includes('source/live SIO Tools-equivalent Tangtang damage formula derivation'));
assert.ok(mdSerialized.includes('Description Formula Validation Gate'));
assert.ok(mdSerialized.includes('Formula atom rows: 221'));
assert.ok(mdSerialized.includes('Description Capture Import Gate'));
assert.ok(mdSerialized.includes('First-Party Description Source Inventory'));
assert.ok(mdSerialized.includes('Public official web sufficient for formula validation: `false`'));
assert.ok(mdSerialized.includes('Can run observed damage follow-up without description divergence: `false`'));

if (writeMode) {
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, jsonSerialized);
  await fs.writeFile(mdPath, mdSerialized);
  console.log(`tangtang_damage_formula_spec_unit_test: wrote ${jsonPath} and ${mdPath}`);
} else {
  const [existingJson, existingMd] = await Promise.all([
    fs.readFile(jsonPath, 'utf8'),
    fs.readFile(mdPath, 'utf8'),
  ]);
  assert.equal(existingJson, jsonSerialized, 'Tangtang damage formula spec JSON is stale; run with --write');
  assert.equal(existingMd, mdSerialized, 'Tangtang damage formula spec markdown is stale; run with --write');
  console.log(`tangtang_damage_formula_spec_unit_test: passed (${stages.length} stages)`);
}
