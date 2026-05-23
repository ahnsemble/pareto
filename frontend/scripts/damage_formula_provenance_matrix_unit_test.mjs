import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const buildDir = path.join(tmpdir(), 'pareto-damage-formula-provenance');
const matrixPath = path.join(root, 'artifacts/td11/damage_formula_provenance_matrix.md');
const writeMode = process.argv.includes('--write');
const EXPECTED_DESCRIPTION_CAPTURE_ROWS = 12;
const EXPECTED_DESCRIPTION_CAPTURE_MATCHED_ROWS = 10;
const EXPECTED_DESCRIPTION_CAPTURE_DIVERGENCE_ROWS = 2;
const EXPECTED_DESCRIPTION_CAPTURE_OBSERVED_FOLLOW_UP_ROWS = 2;
const EXPECTED_FORMULA_ATOM_ROWS_REMAINING_WITHOUT_DIRECT_CAPTURE = 209;

const CONFIDENCE = new Set([
  'sio-live-equivalent',
  'sio-source-only',
  'catalog-only',
  'in-game-description-verified',
  'unsupported-by-current-sio-source',
]);

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

const {
  CATALOG_ONLY_COLLECTIBLE_ITEM_IDS,
  COLLECTIBLE_ITEM_INDEX,
  COLLECTIBLE_SET_INDEX,
  HERO_SCHEMA_INDEX,
  MOUNT_SCHEMA_INDEX,
  PET_SCHEMA_INDEX,
  SIO_STATS_FIXED_ORDER,
  SS_EQUIPMENT_SCHEMA_INDEX,
  TECH_MODIFIER_MATRIX,
  TECH_PART_SCHEMA_INDEX,
  WEAPON_SCHEMA_INDEX,
  XENO_TRIGGER_MATRIX,
} = schemas;

const DIRECT_STAT_STAGE = new Map([
  ['atkBase', 'en0 attack aggregate'],
  ['atkEquip', 'en0 attack aggregate'],
  ['atkEquipPercent', 'en0 attack aggregate'],
  ['atkHero', 'en0 attack aggregate'],
  ['atkHeroPercent', 'en0 attack aggregate'],
  ['atkPercent', 'en0 attack aggregate'],
  ['atkFinal', 'en0 attack aggregate'],
  ['critRate', 'en1 crit expectation'],
  ['critDamage', 'en1 crit expectation'],
  ['vulnerability', 'en2 vulnerability'],
  ['shieldDamage', 'en3 shield damage uptime'],
  ['shieldDamageUptime', 'en3 shield damage uptime'],
  ['poisoned', 'en4 target status damage'],
  ['poisonedUptime', 'en4 target status damage'],
  ['weakened', 'en4 target status damage'],
  ['weakenedUptime', 'en4 target status damage'],
  ['chilled', 'en4 target status damage'],
  ['chilledUptime', 'en4 target status damage'],
  ['exposedDamage', 'en4 target status damage'],
  ['clarity', 'en5 clarity'],
  ['eternalMultiplier', 'en6 eternal multiplier'],
  ['glacialBloodline', 'en7 glacial bloodline'],
  ['laceration', 'en8 laceration/divine fire'],
  ['lacerationUptime', 'en8 laceration/divine fire'],
  ['divineFire', 'en8 laceration/divine fire'],
  ['divineFireUptime', 'en8 laceration/divine fire'],
  ['joeyWeakSpot', 'en9 Joey weak spot'],
  ['ssGlovesLaser', 'en10 SS gloves laser'],
  ['flashriftRip', 'en11 flashrift rip'],
  ['taloxaOverload', 'en12 Taloxa overload'],
  ['eternalSuitBoost', 'en13 Eternal Suit boost'],
  ['voidNeckBoost', 'en14 Voidwaker Emblem boost'],
  ['voidNeckBoostUptime', 'en14 Voidwaker Emblem boost'],
  ['voidGlovesInstakill', 'en15 Voidwaker Handguards instakill'],
  ['voidBootsBoost', 'en16 Voidwaker Treads boost'],
  ['chaosBeltBoost', 'en17 chaos belt boost'],
  ['hpBulletBoost', 'en18 HP Bullet boost'],
  ['damageDealt', 'en19 damage dealt'],
  ['adrenaline', 'en20 adrenaline'],
  ['damageTransmute', 'en21 xeno transmute damage'],
  ['damageBoss', 'en22 boss damage'],
  ['xenoResMultiplier', 'en23 xeno resonance multiplier'],
  ['lme1Damage', 'en24 LME phase damage'],
]);

const DIRECT_HERO_CHANNELS = new Map([
  ['king', 'critRate/critDamage -> en1'],
  ['taloxa', 'laceration/taloxaOverload -> en8/en12'],
  ['venato', 'adrenaline -> en20'],
  ['worm', 'cooldownReduction side channel'],
  ['yelena', 'critDamage/vulnerability -> en1/en2 through survivor transform'],
  ['squidward', 'critRate/critDamage -> en1 through survivor transform'],
  ['spongebob', 'critRate/critDamage -> en1 through survivor transform'],
]);

const TARGETED_SURVIVOR_IDS = new Set(['spongebob', 'squidward', 'yelena']);
const ACTIVE_MOUNT_DAMAGE_LIVE_IDS = new Set(['electricScooter', 'techHoverboard']);
const COLLECTIBLE_CATALOG_ONLY_ITEM_IDS = new Set(CATALOG_ONLY_COLLECTIBLE_ITEM_IDS);

const mountDamageSourceFixturePath = path.join(root, 'artifacts/td11/mount_damage_source_fixture.json');
const mountDamageSourceFixture = JSON.parse(await fs.readFile(mountDamageSourceFixturePath, 'utf8'));
const collectibleEffectMappingPath = path.join(root, 'artifacts/td11/collectible_effect_mapping_matrix.json');
const collectibleEffectMapping = JSON.parse(await fs.readFile(collectibleEffectMappingPath, 'utf8'));
const genericAggregateNonAuthorityPath = path.join(root, 'artifacts/td11/generic_aggregate_non_authority_gate.json');
const genericAggregateNonAuthority = JSON.parse(await fs.readFile(genericAggregateNonAuthorityPath, 'utf8'));
const sioToolsLiveEvidencePath = path.join(root, 'artifacts/td11/sio_tools_live_evidence_matrix.json');
const sioToolsLiveEvidence = JSON.parse(await fs.readFile(sioToolsLiveEvidencePath, 'utf8'));
const inGameDescriptionEvidencePath = path.join(root, 'artifacts/td11/in_game_description_evidence_matrix.json');
const inGameDescriptionEvidence = JSON.parse(await fs.readFile(inGameDescriptionEvidencePath, 'utf8'));
const inGameDescriptionEvidenceByKey = new Map(inGameDescriptionEvidence.rows.map((row) => [row.key, row]));
const sioToolsFormulaSourceEvidencePath = path.join(root, 'artifacts/td11/sio_tools_formula_source_evidence_matrix.json');
const sioToolsFormulaSourceEvidence = JSON.parse(await fs.readFile(sioToolsFormulaSourceEvidencePath, 'utf8'));
const tangtangDamageFormulaSpecPath = path.join(root, 'artifacts/td11/tangtang_damage_formula_spec.json');
const tangtangDamageFormulaSpec = JSON.parse(await fs.readFile(tangtangDamageFormulaSpecPath, 'utf8'));
const tangtangDescriptionFormulaValidationPath = path.join(
  root,
  'artifacts/td11/tangtang_description_formula_validation_matrix.json',
);
const tangtangDescriptionFormulaValidation = JSON.parse(
  await fs.readFile(tangtangDescriptionFormulaValidationPath, 'utf8'),
);
const tangtangDescriptionFormulaValidationProtocolPath = path.join(
  root,
  'artifacts/td11/tangtang_description_formula_validation_protocol.md',
);
const tangtangDescriptionFormulaValidationProtocol = await fs.readFile(
  tangtangDescriptionFormulaValidationProtocolPath,
  'utf8',
);
const tangtangDescriptionCaptureImportPath = path.join(
  root,
  'artifacts/td11/tangtang_description_capture_import_matrix.json',
);
const tangtangDescriptionCaptureImport = JSON.parse(await fs.readFile(tangtangDescriptionCaptureImportPath, 'utf8'));
const tangtangDescriptionCaptureImportProtocolPath = path.join(
  root,
  'artifacts/td11/tangtang_description_capture_import_protocol.md',
);
const tangtangDescriptionCaptureImportProtocol = await fs.readFile(
  tangtangDescriptionCaptureImportProtocolPath,
  'utf8',
);
const tangtangRandomCaptureSampleAuditPath = path.join(
  root,
  'artifacts/td11/tangtang_random_capture_sample_audit.json',
);
const tangtangRandomCaptureSampleAudit = JSON.parse(await fs.readFile(tangtangRandomCaptureSampleAuditPath, 'utf8'));
const tangtangFirstPartyDescriptionSourceInventoryPath = path.join(
  root,
  'artifacts/td11/tangtang_first_party_description_source_inventory.json',
);
const tangtangFirstPartyDescriptionSourceInventory = JSON.parse(
  await fs.readFile(tangtangFirstPartyDescriptionSourceInventoryPath, 'utf8'),
);
const tangtangFirstPartyDescriptionSourceInventoryProtocolPath = path.join(
  root,
  'artifacts/td11/tangtang_first_party_description_source_inventory.md',
);
const tangtangFirstPartyDescriptionSourceInventoryProtocol = await fs.readFile(
  tangtangFirstPartyDescriptionSourceInventoryProtocolPath,
  'utf8',
);
const tangtangInGameDamageValidationPath = path.join(root, 'artifacts/td11/tangtang_in_game_damage_validation_matrix.json');
const tangtangInGameDamageValidation = JSON.parse(await fs.readFile(tangtangInGameDamageValidationPath, 'utf8'));
const doomsteedDirectCaptureAtomRows =
  tangtangDescriptionCaptureImport.firstPartyCaptureCoverage.capturedAtomRowIds.filter((rowId) => (
    rowId.startsWith('mount:doomsteed:')
  )).length;

function slug(value) {
  return String(value)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function cell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function citationsOf(item) {
  return Array.isArray(item.source_citations) && item.source_citations.length > 0
    ? item.source_citations.join('<br>')
    : 'missing-source-citation';
}

const rows = [];

function addRow(row) {
  assert.ok(row.key, 'row key is required');
  assert.ok(row.domain, `domain is required for ${row.key}`);
  assert.ok(row.name, `name is required for ${row.key}`);
  assert.ok(CONFIDENCE.has(row.confidence), `unsupported confidence ${row.confidence} for ${row.key}`);
  rows.push({
    sourceStatus: 'source-backed through SIO mirror unless noted',
    inGameDescription: 'not independently captured',
    tangtangSchemaKey: '',
    rustStatChannel: '',
    multiplierStage: '',
    liveEvidence: '',
    nextAction: '',
    ...row,
  });
}

for (const item of SS_EQUIPMENT_SCHEMA_INDEX) {
  addRow({
    key: `ss-equipment:${item.id}`,
    domain: 'ss-equipment',
    name: item.display_name_en,
    sourceStatus: 'SIO item source plus equipment transform / SS conditional path',
    sioSourceKey: citationsOf(item),
    tangtangSchemaKey: `SS_EQUIPMENT_SCHEMA_INDEX.${item.id}`,
    rustStatChannel: 'sio_lm/equipment_transform + v3_damage.apply_ss_effects',
    multiplierStage: 'equipment-dependent direct/stat transform stages',
    liveEvidence: 'sio_lm_equivalence_matrix.equipment=implemented-live-covered',
    confidence: 'sio-live-equivalent',
    nextAction: 'add per-description row before editing formula semantics',
  });
}

for (const item of WEAPON_SCHEMA_INDEX) {
  const isTwinLance = item.id === 'twinLance';
  addRow({
    key: `weapon:${item.id}`,
    domain: 'weapon',
    name: item.display_name_en,
    sourceStatus: isTwinLance ? 'covered through SS Twin Lance path' : 'cataloged in schema; formula not proven',
    sioSourceKey: citationsOf(item),
    tangtangSchemaKey: `WEAPON_SCHEMA_INDEX.${item.id}`,
    rustStatChannel: isTwinLance ? 'ssMiscPath / equipment transform' : 'none proven',
    multiplierStage: isTwinLance ? 'SS weapon stages and tech modifier ssWeapon edges' : 'none proven',
    liveEvidence: isTwinLance ? 'sio_lm_equivalence_matrix.equipment=implemented-live-covered' : 'none',
    confidence: isTwinLance ? 'sio-live-equivalent' : 'catalog-only',
    nextAction: isTwinLance ? 'keep covered by SS equipment fixtures' : 'unsupported for formula input until fixture evidence exists',
  });
}

for (const hero of HERO_SCHEMA_INDEX) {
  const isTargetedSurvivor = TARGETED_SURVIVOR_IDS.has(hero.id);
  const descriptionEvidence = isTargetedSurvivor ? inGameDescriptionEvidenceByKey.get(`survivor:${hero.id}`) : null;
  const publicClaimStatus = descriptionEvidence
    ? `${descriptionEvidence.publicClaimCount}/${descriptionEvidence.sourceClaimCount} public stat claims`
    : '';
  const hasFullPublicClaimCoverage = descriptionEvidence?.publicClaimCount === descriptionEvidence?.sourceClaimCount;
  addRow({
    key: `survivor:${hero.id}`,
    domain: 'survivor',
    name: hero.display_name_en,
    sourceStatus: isTargetedSurvivor
      ? 'present in current SIO runtime table and Rust compact survivor transform; targeted current-worker live fixture captured'
      : 'present in current SIO source/default roster',
    sioSourceKey: citationsOf(hero),
    tangtangSchemaKey: `HERO_SCHEMA_INDEX.${hero.id}`,
    rustStatChannel: DIRECT_HERO_CHANNELS.get(hero.id) ?? 'SIO compact survivor/passive/teamwork transform; generic aggregate empty',
    multiplierStage: DIRECT_HERO_CHANNELS.get(hero.id) ?? 'upstream stat transform before 31-stage damage vector',
    inGameDescription: descriptionEvidence
      ? hasFullPublicClaimCoverage
        ? `public-web corroborated for current source stat claims (${publicClaimStatus}); direct first-party capture still missing`
        : `partial public-web evidence (${publicClaimStatus}); source-table-only claims remain`
      : 'not independently captured',
    liveEvidence: isTargetedSurvivor
      ? `sio_tools_live_evidence_matrix.targetSurvivorLiveRows=3; targeted mainHero/h-array live fixtures captured for Yelena/Squidward/SpongeBob; in_game_description_evidence=${publicClaimStatus}`
      : 'sio_lm_equivalence_matrix.survivors-passives-harmony-teamwork=implemented-live-covered',
    confidence: 'sio-live-equivalent',
    nextAction: isTargetedSurvivor
      ? hasFullPublicClaimCoverage
        ? 'replace public-web corroboration with direct in-game capture before formula semantics change'
        : 'capture missing direct in-game description rows before formula semantics change'
      : 'add in-game description row for each star/awakening/passive effect',
  });
}

for (const tech of TECH_PART_SCHEMA_INDEX) {
  addRow({
    key: `tech-part:${tech.id}`,
    domain: 'tech-part',
    name: tech.display_name_en,
    sourceStatus: 'SIO tech schema and optimizer row source-backed',
    sioSourceKey: citationsOf(tech),
    tangtangSchemaKey: `TECH_PART_SCHEMA_INDEX.${tech.id}`,
    rustStatChannel: tech.category === 'twinborn' ? 'resonanceMultiplier / CE damage transform' : 'skillDamage / passive pool / CE damage transform',
    multiplierStage: tech.category === 'twinborn' ? 'tech CE and modifier-derived stage inputs' : 'active skill damage/multiplier path',
    liveEvidence: 'sio_lm_equivalence_matrix.active-skills=implemented-live-covered',
    confidence: 'sio-live-equivalent',
    nextAction: 'add per-mode in-game description capture for high-risk tech effects',
  });
}

for (const [source, targets] of Object.entries(TECH_MODIFIER_MATRIX)) {
  for (const [target, coefficient] of Object.entries(targets)) {
    addRow({
      key: `tech-modifier:${source}->${target}`,
      domain: 'tech-modifier',
      name: `${source} -> ${target}`,
      sourceStatus: `SIO modifier matrix coefficient ${coefficient}`,
      sioSourceKey: 'sio_tools_formulas_and_defaults.md:551-599',
      tangtangSchemaKey: `TECH_MODIFIER_MATRIX.${source}.${target}`,
      rustStatChannel: 'sio_lm tech modifier reconstruction',
      multiplierStage: 'damage mode multiplier / CE tech contribution',
      liveEvidence: 'sio_lm_equivalence_matrix.active-skills=implemented-live-covered',
      confidence: 'sio-live-equivalent',
      nextAction: coefficient < 0 ? 'keep debuff regression visible in tests/docs' : 'keep matrix-source regression',
    });
  }
}

for (const pet of PET_SCHEMA_INDEX) {
  const aliasNote = pet.id === 'blizzblast'
    ? 'source/product alias risk: SIO compact uses King Blizzblast, product schema displays Blizzblast'
    : pet.id === 'crucker'
      ? 'source/product alias risk: compact key may appear as Crucker while display is Clucker'
      : '';
  addRow({
    key: `pet:${pet.id}`,
    domain: 'pet-xeno',
    name: pet.display_name_en,
    sourceStatus: pet.is_xeno ? `SIO xeno pet source-backed. ${aliasNote}`.trim() : `SIO pet source-backed. ${aliasNote}`.trim(),
    sioSourceKey: citationsOf(pet),
    tangtangSchemaKey: `PET_SCHEMA_INDEX.${pet.id}`,
    rustStatChannel: pet.is_xeno ? 'xenoDamage / xenoRes* / compact_xeno_pet_damage' : 'pet skills / cooldown side channels when applicable',
    multiplierStage: pet.is_xeno ? 'xenoResMultiplier en23 plus xeno upstream stats' : 'cooldownReduction or upstream passive stats',
    liveEvidence: 'sio_lm_equivalence_matrix.pets-xeno-awakening=implemented-live-covered',
    confidence: 'sio-live-equivalent',
    nextAction: aliasNote ? 'add alias regression test' : 'add per-skill in-game description capture',
  });
}

for (const mount of MOUNT_SCHEMA_INDEX) {
  const hasActiveMountDamageLiveEvidence = ACTIVE_MOUNT_DAMAGE_LIVE_IDS.has(mount.id);
  const descriptionEvidence = inGameDescriptionEvidenceByKey.get(`mount:${mount.id}`);
  const directCaptureImportNote =
    mount.id === 'doomsteed' && doomsteedDirectCaptureAtomRows > 0
      ? `; direct first-party capture import covers ${doomsteedDirectCaptureAtomRows} Doomsteed atom rows and all imported rows match current handling`
      : '; no direct first-party capture import rows for this mount';
  addRow({
    key: `mount:${mount.id}`,
    domain: 'mount',
    name: mount.display_name_en,
    sourceStatus: hasActiveMountDamageLiveEvidence
      ? 'SIO mount catalog plus active mountDamage live trace captured'
      : 'SIO mount catalog plus compact mount stat-line fold; zero/non-active source row',
    sioSourceKey: citationsOf(mount),
    tangtangSchemaKey: `MOUNT_SCHEMA_INDEX.${mount.id}`,
    rustStatChannel: hasActiveMountDamageLiveEvidence
      ? 'compact mount stats + active mountDamage live trace'
      : 'compact mount stats; non-zero mountDamage not applicable/proven for this row',
    multiplierStage: 'mount-derived stat channels when present',
    inGameDescription: descriptionEvidence
      ? `public web confirms mount system/names; public-web exact per-line status=${descriptionEvidence.exactInGameDescriptionStatus}; ${descriptionEvidence.sourceClaimCount} source-table claims retained${directCaptureImportNote}`
      : 'not independently captured',
    liveEvidence: hasActiveMountDamageLiveEvidence
      ? `sio_tools_live_evidence_matrix.activeMountLiveRows=2; nonZeroMountDamageLiveRows=2; mountActiveShortKey=bj; public_web_mountExact=${inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions}/${inGameDescriptionEvidence.summary.mountRows}${directCaptureImportNote}`
      : `sio_tools_live_evidence_matrix.mountLineStatsLiveRows=1; zero/non-active mount row only; mountActiveShortKey=bj; public_web_mountExact=${inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions}/${inGameDescriptionEvidence.summary.mountRows}${directCaptureImportNote}`,
    confidence: hasActiveMountDamageLiveEvidence ? 'sio-live-equivalent' : 'sio-source-only',
    nextAction: hasActiveMountDamageLiveEvidence
      ? 'capture exact mount line descriptions for this mount before editing mount scoring semantics'
      : 'keep zero-coefficient/source row unless source changes; capture remaining mount line descriptions before editing scoring semantics',
  });
}

for (const [slot, triggers] of Object.entries(XENO_TRIGGER_MATRIX)) {
  for (const trigger of triggers) {
    addRow({
      key: `xeno-trigger:${slot}:level-${trigger.level}`,
      domain: 'xeno-trigger',
      name: `${slot} X${trigger.level}`,
      sourceStatus: 'schema trigger row; pending areas remain isolated where not formula-active',
      sioSourceKey: `XENO_TRIGGER_MATRIX.${slot}.${trigger.level}`,
      tangtangSchemaKey: `XENO_TRIGGER_MATRIX.${slot}.level${trigger.level}`,
      rustStatChannel: 'xeno_transmute_modifier / damageTransmute when active',
      multiplierStage: 'en21 damageTransmute or pending isolated spec',
      liveEvidence: 'sio_lm_equivalence_matrix.equipment=implemented-live-covered',
      confidence: 'sio-source-only',
      nextAction: 'map trigger text to concrete transmute effect fixtures',
    });
  }
}

for (const item of COLLECTIBLE_ITEM_INDEX) {
  const eventSlot = /^event\d+$/i.test(item.id);
  const catalogOnlyNamedItem = COLLECTIBLE_CATALOG_ONLY_ITEM_IDS.has(item.id);
  addRow({
    key: `collectible-item:${item.id}`,
    domain: eventSlot ? 'collectible-event-slot' : catalogOnlyNamedItem ? 'collectible-catalog-only-item' : 'collectible-item',
    name: item.display_name_en,
    sourceStatus: eventSlot
      ? 'SIO reserved event placeholder slot'
      : catalogOnlyNamedItem
        ? 'product catalog row not found in current SIO runtime collectible table'
        : 'SIO collectible item index source-backed',
    sioSourceKey: citationsOf(item),
    tangtangSchemaKey: `COLLECTIBLE_ITEM_INDEX.${item.id}`,
    rustStatChannel: eventSlot || catalogOnlyNamedItem ? 'none until source effect row is known' : 'equipment_transform item/set bonuses where explicitly wired',
    multiplierStage: eventSlot || catalogOnlyNamedItem ? 'none' : 'item/set-dependent upstream stat transform',
    liveEvidence: eventSlot || catalogOnlyNamedItem ? 'none' : 'sio_tools_live_evidence_matrix.collectibleLiveRows=7; collectible_effect_mapping.thresholdRows=170',
    confidence: eventSlot || catalogOnlyNamedItem ? 'catalog-only' : 'sio-source-only',
    nextAction: eventSlot || catalogOnlyNamedItem ? 'replace or promote only when SIO exposes real item/effect row' : 'add item-level in-game description and stat/equipment effect mapping',
  });
}

for (const set of COLLECTIBLE_SET_INDEX) {
  addRow({
    key: `collectible-set:${set.id}`,
    domain: 'collectible-set',
    name: set.display_name_en,
    sourceStatus: 'SIO collectible set source-backed',
    sioSourceKey: citationsOf(set),
    tangtangSchemaKey: `COLLECTIBLE_SET_INDEX.${set.id}`,
    rustStatChannel: 'equipment_transform custom/set bonuses where explicitly wired; generic aggregate empty',
    multiplierStage: 'set-dependent upstream stat transform',
    liveEvidence: 'sio_tools_live_evidence_matrix.collectibleLiveRows=7; collectible_effect_mapping.thresholdRows=170',
    confidence: 'sio-source-only',
    nextAction: 'add per-set in-game description and stat channel mapping',
  });
}

for (const stat of SIO_STATS_FIXED_ORDER) {
  const stage = DIRECT_STAT_STAGE.get(stat.key);
  addRow({
    key: `stat:${stat.key}`,
    domain: 'stat-channel',
    name: stat.key,
    sourceStatus: 'SIO fixed stat order source-backed',
    sioSourceKey: 'sio_tools_formulas_and_defaults.md:601-632',
    tangtangSchemaKey: `SIO_STATS_FIXED_ORDER[${stat.index}]`,
    rustStatChannel: stat.key,
    multiplierStage: stage ?? 'upstream/support stat; no direct 31-stage multiplier slot',
    liveEvidence: 'sio_lm_equivalence_matrix.compact-meta=implemented-live-covered',
    confidence: stage ? 'sio-live-equivalent' : 'sio-source-only',
    nextAction: stage ? 'add in-game text mapping for stat label' : 'document producer/consumer before treating as final multiplier',
  });
}

const keys = rows.map((row) => row.key);
assert.equal(new Set(keys).size, rows.length, 'provenance row keys must be unique');
assert.equal(rows.length, 367, 'provenance matrix row count changed unexpectedly');

const rowByKey = new Map(rows.map((row) => [row.key, row]));

function requireRow(key) {
  const row = rowByKey.get(key);
  assert.ok(row, `missing required provenance row: ${key}`);
  return row;
}

function assertRow(row, expected) {
  for (const [field, value] of Object.entries(expected)) {
    assert.equal(row[field], value, `${row.key}.${field}`);
  }
}

function assertIncludes(row, field, value) {
  assert.ok(String(row[field]).includes(value), `${row.key}.${field} must include ${value}`);
}

const nonSsWeaponRows = rows.filter((row) => row.domain === 'weapon' && row.key !== 'weapon:twinLance');
assert.equal(nonSsWeaponRows.length, WEAPON_SCHEMA_INDEX.length - 1, 'all non-SS weapons must be explicitly isolated');
for (const row of nonSsWeaponRows) {
  assertRow(row, {
    confidence: 'catalog-only',
    rustStatChannel: 'none proven',
    multiplierStage: 'none proven',
    liveEvidence: 'none',
    nextAction: 'unsupported for formula input until fixture evidence exists',
  });
}

const twinLanceWeaponRow = requireRow('weapon:twinLance');
assertRow(twinLanceWeaponRow, {
  confidence: 'sio-live-equivalent',
  rustStatChannel: 'ssMiscPath / equipment transform',
  nextAction: 'keep covered by SS equipment fixtures',
});

const blizzblastRow = requireRow('pet:blizzblast');
assertRow(blizzblastRow, {
  name: 'Blizzblast',
  confidence: 'sio-live-equivalent',
  nextAction: 'add alias regression test',
});
assertIncludes(blizzblastRow, 'sourceStatus', 'King Blizzblast');

const cruckerRow = requireRow('pet:crucker');
assertRow(cruckerRow, {
  name: 'Clucker',
  confidence: 'sio-live-equivalent',
  nextAction: 'add alias regression test',
});
assertIncludes(cruckerRow, 'sourceStatus', 'Crucker');

const mountRows = rows.filter((row) => row.domain === 'mount');
assert.equal(mountRows.length, MOUNT_SCHEMA_INDEX.length, 'all mounts must be represented in the mount fixture gate slice');
const activeMountDamageLiveRows = mountRows.filter((row) => row.confidence === 'sio-live-equivalent');
const sourceOnlyMountRows = mountRows.filter((row) => row.confidence === 'sio-source-only');
assert.deepEqual(
  activeMountDamageLiveRows.map((row) => row.key).sort(),
  ['mount:electricScooter', 'mount:techHoverboard'],
  'active non-zero mountDamage rows must be live captured for Electric Scooter and Tech Hoverboard',
);
assert.deepEqual(
  sourceOnlyMountRows.map((row) => row.key),
  ['mount:doomsteed'],
  'Doomsteed remains source-only because its coefficient is zero/non-active in current fixture evidence',
);
for (const row of sourceOnlyMountRows) {
  assert.equal(row.confidence, 'sio-source-only', `${row.key}.confidence`);
  assertIncludes(row, 'rustStatChannel', 'non-zero mountDamage not applicable/proven');
  assertIncludes(row, 'liveEvidence', 'mountActiveShortKey=bj');
  assertIncludes(row, 'liveEvidence', 'public_web_mountExact=0/3');
  assertIncludes(row, 'liveEvidence', 'direct first-party capture import covers 9 Doomsteed atom rows');
  assertIncludes(row, 'inGameDescription', 'public-web exact per-line status=not-found-public-web');
  assertIncludes(row, 'inGameDescription', 'all imported rows match current handling');
  assert.equal(
    row.nextAction,
    'keep zero-coefficient/source row unless source changes; capture remaining mount line descriptions before editing scoring semantics',
    `${row.key}.nextAction`,
  );
}
for (const row of activeMountDamageLiveRows) {
  assertIncludes(row, 'rustStatChannel', 'active mountDamage live trace');
  assertIncludes(row, 'liveEvidence', 'nonZeroMountDamageLiveRows=2');
  assertIncludes(row, 'liveEvidence', 'public_web_mountExact=0/3');
  assertIncludes(row, 'inGameDescription', 'public-web exact per-line status=not-found-public-web');
  assert.equal(
    row.nextAction,
    'capture exact mount line descriptions for this mount before editing mount scoring semantics',
    `${row.key}.nextAction`,
  );
}
assert.equal(mountDamageSourceFixture.summary.totalRows, MOUNT_SCHEMA_INDEX.length, 'mount source fixture must cover all mounts');
assert.equal(sioToolsLiveEvidence.summary.mountLiveRows, 4, 'live evidence matrix must include broad and active mount live capture rows');
assert.equal(sioToolsLiveEvidence.summary.mountLineStatsLiveRows, 1, 'live evidence matrix must isolate non-empty mount stat-line capture');
assert.equal(sioToolsLiveEvidence.summary.activeMountLiveRows, 2, 'live evidence matrix must include active mount live rows');
assert.equal(sioToolsLiveEvidence.summary.nonZeroMountDamageLiveRows, 2, 'live evidence matrix must capture non-zero mountDamage live coverage');
assert.equal(sioToolsLiveEvidence.summary.mountActiveShortKey, 'bj', 'live evidence matrix must preserve SIO compact active-mount key evidence');
assert.ok(
  mountDamageSourceFixture.rows.some((fixture) => typeof fixture.mountDamageLine === 'string' && fixture.mountDamageLine.trim() !== ''),
  'mount source fixture must include non-empty mountDamage formulas',
);
assert.ok(
  mountDamageSourceFixture.rows.every((fixture) => fixture.confidence === 'sio-source-only'),
  'mount source fixture cannot promote rows to live-equivalent by itself',
);
const mountFormulaCompleteRows = mountRows.filter((row) => row.confidence === 'sio-live-equivalent' || row.confidence === 'in-game-description-verified');
assert.equal(mountFormulaCompleteRows.length, 2, 'active non-zero mountDamage live fixtures promote two mount rows');
assert.equal(inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions, 0, 'mount public web evidence must not be over-promoted to exact in-game descriptions');
assert.equal(inGameDescriptionEvidence.summary.mountRowsStillSourceOnlyForExactLineStats, 3, 'all mount line stats must remain source-only until exact text is captured');

const unsupportedSurvivorRows = rows.filter((row) => row.domain === 'survivor-unsupported');
assert.equal(unsupportedSurvivorRows.length, 0, 'SpongeBob/Squidward/Yelena are source-backed locally, not unsupported rows');
const targetedSurvivorRows = [...TARGETED_SURVIVOR_IDS].map((id) => requireRow(`survivor:${id}`));
for (const row of targetedSurvivorRows) {
  assert.equal(row.confidence, 'sio-live-equivalent', `${row.key}.confidence`);
  assertIncludes(row, 'sourceStatus', 'Rust compact survivor transform');
  assertIncludes(row, 'sioSourceKey', 'module37013_f_default_config.json');
  assertIncludes(row, 'liveEvidence', 'targetSurvivorLiveRows=3');
  assertIncludes(row, 'liveEvidence', 'in_game_description_evidence=');
  assert.match(row.inGameDescription, /public-web|partial/, `${row.key}.inGameDescription`);
}
assert.equal(inGameDescriptionEvidence.summary.rowsWithAllSourceClaimsPubliclyCorroborated, 2, 'SpongeBob and Squidward public claims cover current source claims');
assert.equal(inGameDescriptionEvidence.summary.rowsWithPartialPublicStatClaims, 1, 'Yelena must remain partially public-web corroborated');
assert.equal(sioToolsFormulaSourceEvidence.summary.rawSourceLeafRows, 4650, 'SIO Tools source evidence must capture all current formula stat leaves');
assert.equal(sioToolsFormulaSourceEvidence.summary.targetSurvivorNormalizedClaims, 11, 'target survivor normalized source claims must stay captured');
assert.equal(sioToolsFormulaSourceEvidence.summary.targetSurvivorRawCumulativeLeafRows, 13, 'target survivor raw cumulative source cells must stay visible');
assert.equal(sioToolsFormulaSourceEvidence.summary.mountNormalizedClaims, 26, 'mount normalized source claims must stay captured');
assert.equal(sioToolsFormulaSourceEvidence.summary.mountRawCumulativeLeafRows, 52, 'mount raw cumulative source cells must stay visible');
assert.equal(sioToolsFormulaSourceEvidence.summary.collectibleThresholdRows, 170, 'collectible source threshold rows must stay captured');
assert.equal(sioToolsFormulaSourceEvidence.summary.collectibleSpecialRustMappings, 14, 'collectible special Rust mappings must stay captured');
assert.equal(sioToolsFormulaSourceEvidence.summary.inGameDescriptionVerifiedRows, 0, 'SIO Tools source evidence must not be promoted to direct in-game-description verified');
assert.equal(tangtangDamageFormulaSpec.status, '[TANGTANG-DAMAGE-FORMULA-SPEC-GREEN]', 'Tangtang damage formula spec status changed');
assert.equal(tangtangDamageFormulaSpec.claim, 'sio-tools-equivalent', 'Tangtang damage formula spec claim must remain limited');
assert.equal(tangtangDamageFormulaSpec.behaviorChange, false, 'Tangtang damage formula spec cannot imply behavior changes');
assert.equal(tangtangDamageFormulaSpec.summaryCounts.rawSourceLeafRows, 4650, 'formula spec raw source leaf count mismatch');
assert.equal(tangtangDamageFormulaSpec.summaryCounts.mountNormalizedClaims, 26, 'formula spec mount normalized claim count mismatch');
assert.equal(tangtangDamageFormulaSpec.summaryCounts.targetSurvivorNormalizedClaims, 11, 'formula spec target survivor normalized claim count mismatch');
assert.equal(tangtangDamageFormulaSpec.summaryCounts.collectibleThresholdRows, 170, 'formula spec collectible threshold count mismatch');
assert.equal(tangtangDamageFormulaSpec.summaryCounts.collectibleSpecialRustMappings, 14, 'formula spec collectible special Rust mapping count mismatch');
assert.equal(tangtangDamageFormulaSpec.summaryCounts.inGameDescriptionVerifiedRows, 0, 'formula spec must not promote direct in-game verified rows');
assert.equal(
  tangtangDescriptionFormulaValidation.status,
  '[TANGTANG-DESCRIPTION-FORMULA-VALIDATION-PROTOCOL-READY]',
  'description formula validation gate status changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.claim,
  'description-derived-formula-validation-protocol',
  'description formula validation gate claim changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.validationScope.directFirstPartyDescriptionFormulaRows,
  0,
  'direct first-party description-derived formula rows must start at zero',
);
assert.equal(
  tangtangDescriptionFormulaValidation.formulaAtomSummary.totalRows,
  221,
  'description formula atom ledger row count changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.formulaAtomSummary.stageBucketTaxonomyRows,
  25,
  'stage bucket taxonomy row count changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.formulaAtomSummary.mountAtomRows,
  26,
  'mount formula atom row count changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.formulaAtomSummary.survivorAtomRows,
  11,
  'survivor formula atom row count changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.formulaAtomSummary.collectibleThresholdAtomRows,
  170,
  'collectible threshold formula atom row count changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.formulaAtomSummary.collectibleSpecialRustMappingAtomRows,
  14,
  'collectible special Rust formula atom row count changed',
);
assert.equal(
  tangtangDescriptionFormulaValidation.formulaAtomGraph.graphMode,
  'deterministic-atom-ledger-not-graphrag',
  'description formula validation should remain a deterministic atom ledger before GraphRAG',
);
assert.equal(
  tangtangDescriptionFormulaValidation.divergenceRows.length,
  0,
  'description/SIO divergence rows must start at zero',
);
assert.equal(
  tangtangDescriptionFormulaValidation.decisionPolicy.canClaimSioFormulaDescriptionCorrect,
  false,
  'SIO formula description-correctness cannot be claimed without direct description-derived formula rows',
);
assert.equal(
  tangtangDescriptionFormulaValidation.decisionPolicy.canApplyTangtangFormulaCorrection,
  false,
  'Tangtang formula correction must be blocked without description-derived divergences',
);
assert.ok(
  tangtangDescriptionFormulaValidation.decisionPolicy.observedDamageValidationRole.includes('secondary confirmation'),
  'observed damage must remain secondary confirmation',
);
assert.ok(
  tangtangDescriptionFormulaValidation.decisionPolicy.observedDamageValidationRole.includes('not the first validation layer'),
  'observed damage must not be the first validation layer',
);
assert.ok(
  tangtangDescriptionFormulaValidation.derivationSchema.divergencePolicy.includes('description-derived divergence'),
  'description gate must route only description-derived divergences to confirmation',
);
assert.ok(
  tangtangDescriptionFormulaValidationProtocol.includes('This is the primary next validation layer'),
  'description validation protocol must state it is the primary next validation layer',
);
assert.equal(
  tangtangDescriptionCaptureImport.status,
  '[TANGTANG-DESCRIPTION-CAPTURE-IMPORT-GATE-READY]',
  'description capture import gate status changed',
);
assert.equal(
  tangtangDescriptionCaptureImport.claim,
  'description-capture-import-gate',
  'description capture import gate claim changed',
);
assert.equal(
  tangtangDescriptionCaptureImport.summary.captureInboxRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
  'capture inbox should contain the current direct first-party capture rows',
);
assert.equal(
  tangtangDescriptionCaptureImport.summary.directFirstPartyDescriptionCaptureRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
  'description capture import should count current direct first-party rows',
);
assert.equal(
  tangtangDescriptionCaptureImport.summary.parsedDescriptionFormulaRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
  'description capture import should parse the current direct first-party rows',
);
assert.equal(
  tangtangDescriptionCaptureImport.summary.matchedSioRows,
  EXPECTED_DESCRIPTION_CAPTURE_MATCHED_ROWS,
  'matched capture row count changed',
);
assert.equal(
  tangtangDescriptionCaptureImport.summary.descriptionSioDivergenceRows,
  EXPECTED_DESCRIPTION_CAPTURE_DIVERGENCE_ROWS,
  'description capture import divergence rows changed',
);
assert.equal(
  tangtangDescriptionCaptureImport.summary.observedDamageFollowUpRows,
  EXPECTED_DESCRIPTION_CAPTURE_OBSERVED_FOLLOW_UP_ROWS,
  'description capture import observed-damage follow-up rows changed',
);
assert.equal(
  tangtangDescriptionCaptureImport.decisionPolicy.canApplyTangtangFormulaCorrection,
  false,
  'description capture import cannot apply Tangtang formula corrections',
);
assert.equal(
  tangtangDescriptionCaptureImport.decisionPolicy.canRunObservedDamageFollowUp,
  true,
  'description capture import should open follow-up for imported divergences',
);
assert.equal(
  tangtangDescriptionCaptureImport.atomLedgerContract.formulaAtomRows,
  221,
  'description capture import must use the current atom ledger',
);
assert.ok(
  tangtangDescriptionCaptureImportProtocol.includes(`Capture inbox rows: ${EXPECTED_DESCRIPTION_CAPTURE_ROWS}`),
  'description capture import protocol must show the current capture state',
);
assert.equal(
  tangtangRandomCaptureSampleAudit.status,
  '[TANGTANG-RANDOM-CAPTURE-SAMPLE-AUDIT-GREEN]',
  'random capture sample audit status changed',
);
assert.equal(
  tangtangRandomCaptureSampleAudit.summary.submittedRawImages,
  30,
  'random capture sample raw image count changed',
);
assert.equal(
  tangtangRandomCaptureSampleAudit.summary.importedAtomRowsFromBatch,
  3,
  'random capture sample imported row count changed',
);
assert.equal(
  tangtangRandomCaptureSampleAudit.summary.matchedSioRowsFromBatch,
  1,
  'random capture sample matched row count changed',
);
assert.equal(
  tangtangRandomCaptureSampleAudit.summary.descriptionSioDivergenceRowsFromBatch,
  EXPECTED_DESCRIPTION_CAPTURE_DIVERGENCE_ROWS,
  'random capture sample divergence count changed',
);
assert.equal(
  tangtangRandomCaptureSampleAudit.summary.observedDamageFollowUpRowsFromBatch,
  EXPECTED_DESCRIPTION_CAPTURE_OBSERVED_FOLLOW_UP_ROWS,
  'random capture sample observed-damage follow-up count changed',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.status,
  '[TANGTANG-FIRST-PARTY-DESCRIPTION-SOURCE-INVENTORY-READY]',
  'first-party source inventory status changed',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.claim,
  'first-party-description-source-inventory',
  'first-party source inventory claim changed',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.officialPublicSourceCandidates,
  8,
  'official/public source candidate count changed',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.officialPublicSourcesWithStructuredFormulaRows,
  0,
  'official public web must not claim structured formula rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.officialPublicRowsPromotedToDirectCapture,
  0,
  'official public web must not be promoted to direct capture rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.localAppResourceArtifactsFound,
  0,
  'local app-resource artifacts should remain absent until supplied deliberately',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.rowsRequiringDirectDescriptionCapture,
  221,
  'first-party source inventory must cover the current formula atom ledger',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.directFirstPartyDescriptionFormulaRows,
  0,
  'first-party source inventory must not claim full description-derived formula coverage',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.directFirstPartyDescriptionCaptureRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
  'first-party source inventory must carry current direct capture rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.parsedDescriptionFormulaRows,
  EXPECTED_DESCRIPTION_CAPTURE_ROWS,
  'first-party source inventory must carry current parsed capture rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.matchedSioRows,
  EXPECTED_DESCRIPTION_CAPTURE_MATCHED_ROWS,
  'first-party source inventory must carry current SIO-matched capture rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.descriptionSioDivergenceRows,
  EXPECTED_DESCRIPTION_CAPTURE_DIVERGENCE_ROWS,
  'first-party source inventory must carry current imported divergence rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.observedDamageFollowUpRows,
  EXPECTED_DESCRIPTION_CAPTURE_OBSERVED_FOLLOW_UP_ROWS,
  'first-party source inventory must carry current imported observed-damage follow-up rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.formulaAtomRowsRemainingWithoutDirectCapture,
  EXPECTED_FORMULA_ATOM_ROWS_REMAINING_WITHOUT_DIRECT_CAPTURE,
  'first-party source inventory must show remaining atom rows',
);
assert.equal(
  tangtangFirstPartyDescriptionSourceInventory.summary.publicOfficialWebSufficientForFormulaValidation,
  false,
  'public official web should not be sufficient for formula validation',
);
assert.ok(
  tangtangFirstPartyDescriptionSourceInventoryProtocol.includes('Public official web sufficient for formula validation: `false`'),
  'first-party source inventory protocol must preserve the official-web limitation',
);
assert.equal(tangtangInGameDamageValidation.status, '[TANGTANG-IN-GAME-DAMAGE-VALIDATION-PROTOCOL-READY]', 'in-game damage validation gate status changed');
assert.equal(tangtangInGameDamageValidation.claim, 'in-game-validation-protocol', 'in-game damage validation gate claim changed');
assert.equal(tangtangInGameDamageValidation.behaviorChange, false, 'in-game damage validation gate cannot imply behavior changes');
assert.equal(
  tangtangInGameDamageValidation.validationScope.primaryValidationLayer,
  'description-derived-formula-validation',
  'observed damage gate must point to description-derived formula validation first',
);
assert.equal(
  tangtangInGameDamageValidation.validationScope.observedDamageValidationLayer,
  'follow-up-divergence-check-only',
  'observed damage gate must stay follow-up only',
);
assert.equal(
  tangtangInGameDamageValidation.validationScope.directFirstPartyDescriptionFormulaRows,
  0,
  'observed damage gate must carry description formula row count',
);
assert.equal(
  tangtangInGameDamageValidation.validationScope.descriptionDivergenceRows,
  0,
  'observed damage gate must carry description divergence row count',
);
assert.equal(
  tangtangInGameDamageValidation.validationScope.importedDescriptionDivergenceRows,
  EXPECTED_DESCRIPTION_CAPTURE_DIVERGENCE_ROWS,
  'observed damage gate must carry imported description divergence rows',
);
assert.equal(
  tangtangInGameDamageValidation.validationScope.importedObservedDamageFollowUpRows,
  EXPECTED_DESCRIPTION_CAPTURE_OBSERVED_FOLLOW_UP_ROWS,
  'observed damage gate must carry imported observed-damage follow-up rows',
);
assert.equal(tangtangInGameDamageValidation.validationScope.directObservedDamageTrialCount, 0, 'direct observed damage trials must start at zero');
assert.equal(tangtangInGameDamageValidation.validationScope.currentInGameCorrectnessClaim, 'not-established', 'in-game correctness must not be over-claimed');
assert.equal(tangtangInGameDamageValidation.decisionPolicy.canClaimSioFormulaInGameCorrect, false, 'SIO formula in-game correctness cannot be claimed without description-derived validation and follow-up observations');
assert.equal(tangtangInGameDamageValidation.decisionPolicy.canApplyTangtangFormulaCorrection, false, 'Tangtang formula correction must be blocked without description-derived divergences and follow-up confirmation');
assert.equal(
  tangtangInGameDamageValidation.decisionPolicy.canRunObservedDamageFollowUpWithoutDescriptionDivergence,
  false,
  'observed damage follow-up cannot run without a description-derived divergence',
);
assert.equal(
  tangtangInGameDamageValidation.correctionPolicy.currentCorrectionStatus,
  'blocked-description-derived-formula-validation-incomplete',
  'correction policy must remain blocked by incomplete description formula validation',
);
assert.equal(requireRow('survivor:spongebob').nextAction, 'replace public-web corroboration with direct in-game capture before formula semantics change');
assert.equal(requireRow('survivor:squidward').nextAction, 'replace public-web corroboration with direct in-game capture before formula semantics change');
assert.equal(requireRow('survivor:yelena').nextAction, 'capture missing direct in-game description rows before formula semantics change');

assert.equal(collectibleEffectMapping.summary.totalRows, 160, 'collectible mapping artifact must cover all item, event, and set rows');
assert.equal(collectibleEffectMapping.summary.catalogOnlyNamedItemRows, COLLECTIBLE_CATALOG_ONLY_ITEM_IDS.size, 'collectible mapping artifact must isolate schema-only named items');
assert.equal(collectibleEffectMapping.summary.thresholdRows, 170, 'collectible mapping artifact must include threshold-level source rows');
assert.equal(sioToolsLiveEvidence.summary.collectibleLiveRows, 7, 'live evidence matrix must preserve collectible live capture rows');
assert.equal(sioToolsLiveEvidence.summary.collectibleThresholdRows, 170, 'live evidence matrix must link collectible threshold rows');
assert.ok(
  collectibleEffectMapping.thresholdRows.some((row) => row.key === 'collectible-item:luckyCharm:stars:8:critRate'),
  'collectible item threshold row must map source threshold to stat channel',
);
assert.ok(
  collectibleEffectMapping.thresholdRows.some((row) => row.key === 'collectible-set:impressionIdols:red:20:skillDamage'),
  'collectible set threshold row must map source threshold to stat channel',
);
const collectibleTextMappingRows = rows.filter((row) => row.domain === 'collectible-item' || row.domain === 'collectible-set');
assert.equal(collectibleTextMappingRows.length, 114, 'source-backed collectible item/set text-mapping slice must remain explicit');
for (const row of collectibleTextMappingRows) {
  assert.equal(row.confidence, 'sio-source-only', `${row.key}.confidence`);
  assertIncludes(row, 'nextAction', 'description');
}
const collectibleCatalogOnlyRows = rows.filter((row) => row.domain === 'collectible-event-slot' || row.domain === 'collectible-catalog-only-item');
assert.equal(collectibleCatalogOnlyRows.length, 46, 'collectible catalog-only rows must stay isolated from source-backed formula rows');
assert.deepEqual(
  collectibleCatalogOnlyRows.filter((row) => row.domain === 'collectible-catalog-only-item').map((row) => row.key).sort(),
  [...COLLECTIBLE_CATALOG_ONLY_ITEM_IDS].map((id) => `collectible-item:${id}`).sort(),
  'schema-only named collectibles must remain explicit',
);
for (const row of collectibleCatalogOnlyRows) {
  assert.equal(row.confidence, 'catalog-only', `${row.key}.confidence`);
  assert.equal(row.rustStatChannel, 'none until source effect row is known', `${row.key}.rustStatChannel`);
}

const exoBracerSsWeaponRow = requireRow('tech-modifier:exoBracer->ssWeapon');
assert.equal(TECH_MODIFIER_MATRIX.exoBracer.ssWeapon, -0.025, 'Exo Bracer -> SS Weapon coefficient must remain a debuff');
assertIncludes(exoBracerSsWeaponRow, 'sourceStatus', '-0.025');
assert.equal(exoBracerSsWeaponRow.nextAction, 'keep debuff regression visible in tests/docs');

const genericAggregateRows = rows.filter((row) => row.rustStatChannel.includes('generic aggregate empty'));
assert.ok(genericAggregateRows.length > 0, 'generic aggregate non-authoritative rows must stay visible');
assert.equal(genericAggregateNonAuthority.summary.totalRows, 4, 'generic aggregate non-authority gate must cover hero/pet/tech/collectible_set');
assert.equal(genericAggregateNonAuthority.summary.nonAuthoritativeRows, 4, 'generic aggregate paths must remain explicitly non-authoritative until promoted by evidence');

function countBy(field) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row[field], (counts.get(row[field]) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)));
}

function renderCountTable(counts) {
  return [
    '| Value | Count |',
    '|---|---:|',
    ...counts.map(([key, count]) => `| ${cell(key)} | ${count} |`),
  ].join('\n');
}

function renderRows() {
  return [
    '| Key | Domain | Name | SIO/source status | In-game description status | Tangtang schema key | Rust/stat channel | Multiplier stage | Fixture/live evidence | Confidence | Next action |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((row) => [
        row.key,
        row.domain,
        row.name,
        row.sourceStatus,
        row.inGameDescription,
        row.tangtangSchemaKey,
        row.rustStatChannel,
        row.multiplierStage,
        row.liveEvidence,
        row.confidence,
        row.nextAction,
      ].map(cell).join(' | '))
      .map((line) => `| ${line} |`),
  ].join('\n');
}

const followUpGateSlices = [
  {
    gate: 'DF-P1',
    slice: 'Pet alias regression',
    rowsGuarded: 'pet:blizzblast; pet:crucker',
    currentState: 'live-equivalent rows; product names stay Blizzblast/Clucker while source aliases include King Blizzblast/Crucker',
    blocker: 'alias drift can silently break compact profile mapping',
    nextGate: 'add or keep alias regression before changing pet translator, schema, or compact import handling',
  },
  {
    gate: 'DF-P2',
    slice: 'Non-SS weapons',
    rowsGuarded: `${nonSsWeaponRows.length} weapon rows excluding Twin Lance`,
    currentState: 'catalog-only; no proven Rust/stat channel or live fixture',
    blocker: 'no independent formula fixture for non-SS weapon damage contribution',
    nextGate: 'unsupported for formula input until fixture evidence exists',
  },
  {
    gate: 'DF-P3',
    slice: 'Mount damage line',
    rowsGuarded: `${mountRows.length} mount rows`,
    currentState: `source-backed; SIO Tools source evidence has ${sioToolsFormulaSourceEvidence.summary.mountNormalizedClaims} normalized mount claims and ${sioToolsFormulaSourceEvidence.summary.mountRawCumulativeLeafRows} raw cumulative mount stat cells; public web confirms mount system/names; live evidence matrix has ${sioToolsLiveEvidence.summary.mountLineStatsLiveRows} non-empty mount stat-line row, ${sioToolsLiveEvidence.summary.nonZeroMountDamageLiveRows} non-zero mountDamage live rows, and active compact key ${sioToolsLiveEvidence.summary.mountActiveShortKey}; direct first-party capture import covers ${doomsteedDirectCaptureAtomRows} Doomsteed atom rows`,
    blocker: `complete mount line text coverage is still incomplete; public-web exact matrix remains ${inGameDescriptionEvidence.summary.mountRowsWithExactInGameDescriptions}/${inGameDescriptionEvidence.summary.mountRows}, while direct capture import currently covers Doomsteed only`,
    nextGate: 'capture remaining mount line descriptions before editing mount scoring semantics',
  },
  {
    gate: 'DF-P4',
    slice: 'Collectible item/set text mapping',
    rowsGuarded: `${collectibleTextMappingRows.length} source-backed rows plus ${collectibleCatalogOnlyRows.length} catalog-only rows`,
    currentState: `source-only mapping artifact exists with ${collectibleEffectMapping.summary.thresholdRows} threshold rows, ${sioToolsFormulaSourceEvidence.summary.collectibleRawThresholdLeafRows} raw source threshold cells, ${sioToolsFormulaSourceEvidence.summary.collectibleSpecialRustMappings} special Rust mappings, and ${sioToolsLiveEvidence.summary.collectibleLiveRows} SIO Tools live source-table cases; per-description mapping not independently captured`,
    blocker: 'missing item/set in-game description to stat-channel mapping; 4 named Starlight rows and 42 event slots are catalog-only',
    nextGate: 'map description -> source key -> Tangtang schema key -> Rust stat channel -> multiplier stage',
  },
  {
    gate: 'DF-P5',
    slice: 'Collaboration survivor source reconciliation',
    rowsGuarded: targetedSurvivorRows.map((row) => row.key).join('; '),
    currentState: `source-backed by runtime table and Rust compact transform; SIO Tools source evidence has ${sioToolsFormulaSourceEvidence.summary.targetSurvivorNormalizedClaims} normalized target-survivor claims and ${sioToolsFormulaSourceEvidence.summary.targetSurvivorRawCumulativeLeafRows} raw cumulative target-survivor stat cells; targetSurvivorLiveRows=${sioToolsLiveEvidence.summary.targetSurvivorLiveRows}; public-web stat claim rows=${inGameDescriptionEvidence.summary.rowsWithAnyPublicStatClaim}`,
    blocker: 'public web corroboration exists for SpongeBob/Squidward and partial Yelena, but direct first-party in-game capture is still missing',
    nextGate: 'replace public-web corroboration with direct in-game capture before changing survivor scoring semantics',
  },
  {
    gate: 'DF-P6',
    slice: 'Negative tech modifier',
    rowsGuarded: 'tech-modifier:exoBracer->ssWeapon',
    currentState: 'live-equivalent debuff row with coefficient -0.025',
    blocker: 'debuff can be lost if coefficients are normalized as only-positive multipliers',
    nextGate: 'keep debuff regression visible in tests/docs before editing tech modifier reconstruction',
  },
  {
    gate: 'DF-P7',
    slice: 'Generic aggregate non-authority',
    rowsGuarded: `${genericAggregateRows.length} matrix rows plus ${genericAggregateNonAuthority.summary.totalRows} generic aggregate source files`,
    currentState: 'matrix and dedicated gate document that product scoring relies on compact equivalence paths for these domains',
    blocker: 'generic aggregate path is not an authoritative replacement for hero/pet/tech/collectible-set scoring',
    nextGate: 'do not promote generic aggregate paths without domain-specific provenance and equivalence fixtures',
  },
];

function renderFollowUpGateSlices() {
  return [
    '| Gate | Slice | Rows guarded | Current state | Blocker | Next gate |',
    '|---|---|---|---|---|---|',
    ...followUpGateSlices.map((row) => [
      row.gate,
      row.slice,
      row.rowsGuarded,
      row.currentState,
      row.blocker,
      row.nextGate,
    ].map(cell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

const generatedAt = '2026-05-23';
const matrix = `# Tangtang Damage Formula Provenance Matrix

generatedAtKst: ${generatedAt}
status: [DAMAGE-FORMULA-PROVENANCE-MATRIX-V1]

## Purpose

This matrix is a coverage ledger, not a new formula implementation. It records which Tangtang damage-affecting entities are backed by the current SIO Tools mirror, which ones are only catalog/source rows, and which ones still need direct in-game description evidence.

Confidence values:

- \`sio-live-equivalent\`: covered by the current SIO LM full-equivalence/live replay gate.
- \`sio-source-only\`: backed by SIO source/schema extraction, but lacking a targeted live or in-game text fixture.
- \`catalog-only\`: present as a product/schema catalog row, but not proven as a formula input.
- \`in-game-description-verified\`: reserved for rows with direct in-game description capture plus formula mapping. No row has this confidence in v1 because public-web evidence is tracked separately and not over-promoted.
- \`unsupported-by-current-sio-source\`: explicitly requested/known entity, but absent from current corrected SIO source.

## Summary

- Total rows: ${rows.length}
- Generated from: \`frontend/app/lib/pareto-store/schemas/index.ts\`
- Formula reference: \`tttg_forge_core/src/v3_damage.rs\`
- SIO source references:
  - \`/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_gt_master.md\`
  - \`/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_formulas_and_defaults.md\`
- Evidence artifacts:
  - \`frontend/artifacts/td11/tangtang_damage_formula_spec.json\`
  - \`frontend/artifacts/td11/tangtang_damage_formula_spec.md\`
  - \`frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json\`
  - \`frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md\`
  - \`frontend/artifacts/td11/tangtang_description_capture_inbox.json\`
  - \`frontend/artifacts/td11/tangtang_description_capture_import_matrix.json\`
  - \`frontend/artifacts/td11/tangtang_description_capture_import_protocol.md\`
  - \`frontend/artifacts/td11/tangtang_random_capture_sample_audit.json\`
  - \`frontend/artifacts/td11/tangtang_random_capture_sample_audit.md\`
  - \`frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json\`
  - \`frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md\`
  - \`frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json\`
  - \`frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md\`
  - \`frontend/artifacts/td11/sio_tools_live_evidence_matrix.json\`
  - \`frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json\`
  - \`frontend/artifacts/td11/in_game_description_evidence_matrix.json\`
  - \`frontend/artifacts/td11/sio_tools_formula_source_evidence_matrix.json\`
  - \`frontend/artifacts/td11/collectible_effect_mapping_matrix.json\`
  - \`frontend/artifacts/td11/mount_damage_source_fixture.json\`

### Rows By Domain

${renderCountTable(countBy('domain'))}

### Rows By Confidence

${renderCountTable(countBy('confidence'))}

## High-Risk Gaps

- Non-SS weapons are present as catalog rows but not proven as complete formula rows.
- SIO Tools formula source evidence now captures ${sioToolsFormulaSourceEvidence.summary.rawSourceLeafRows} current source stat leaves across damage-relevant domains; these rows are source-derived evidence, not direct first-party in-game description captures.
- SpongeBob and Squidward now have public-web corroboration for all current source stat claims, while Yelena is partial; direct first-party in-game captures are still missing.
- Mounts now have public-web system/name evidence, a non-empty source fixture, source-proven active compact key \`bJ.bj\`, two non-zero active mountDamage live rows, and ${doomsteedDirectCaptureAtomRows} direct first-party Doomsteed capture atom rows; complete mount line text coverage remains incomplete.
- Collectible item/set rows now have a source/Rust-channel mapping artifact with threshold-level rows plus 7 SIO Tools live source-table cases; 4 named Starlight rows and 42 event slots remain catalog-only until source effect rows exist.
- Generic aggregate modules now have a dedicated non-authority gate; the current product scorer relies on the SIO LM compact path.

## Formula Derivation Spec

- Formula derivation is now available as a SIO Tools-equivalent Tangtang spec:
  - \`frontend/artifacts/td11/tangtang_damage_formula_spec.json\`
  - \`frontend/artifacts/td11/tangtang_damage_formula_spec.md\`
- Spec status: \`${tangtangDamageFormulaSpec.status}\`
- Spec claim: \`${tangtangDamageFormulaSpec.claim}\`
- Behavior change: \`${tangtangDamageFormulaSpec.behaviorChange}\`
- Summary counts:
  - Raw source stat leaves: ${tangtangDamageFormulaSpec.summaryCounts.rawSourceLeafRows}
  - Mount normalized claims: ${tangtangDamageFormulaSpec.summaryCounts.mountNormalizedClaims}
  - Target survivor normalized claims: ${tangtangDamageFormulaSpec.summaryCounts.targetSurvivorNormalizedClaims}
  - Collectible threshold rows: ${tangtangDamageFormulaSpec.summaryCounts.collectibleThresholdRows}
  - Collectible special Rust mappings: ${tangtangDamageFormulaSpec.summaryCounts.collectibleSpecialRustMappings}
  - Direct in-game description verified rows: ${tangtangDamageFormulaSpec.summaryCounts.inGameDescriptionVerifiedRows}
- Official/direct first-party in-game text verification remains incomplete.
- Formula/scoring/UI behavior did not change.

## Description Formula Validation Gate

- Description-derived formula validation is the primary next validation layer after SIO Tools-equivalent derivation:
  - \`frontend/artifacts/td11/tangtang_description_formula_validation_matrix.json\`
  - \`frontend/artifacts/td11/tangtang_description_formula_validation_protocol.md\`
- Gate status: \`${tangtangDescriptionFormulaValidation.status}\`
- Gate claim: \`${tangtangDescriptionFormulaValidation.claim}\`
- Current description-derived formula correctness claim: \`${tangtangDescriptionFormulaValidation.validationScope.currentDescriptionFormulaCorrectnessClaim}\`
- Formula atom rows: ${tangtangDescriptionFormulaValidation.formulaAtomSummary.totalRows}
- Stage bucket taxonomy rows: ${tangtangDescriptionFormulaValidation.formulaAtomSummary.stageBucketTaxonomyRows}
- Mount atom rows: ${tangtangDescriptionFormulaValidation.formulaAtomSummary.mountAtomRows}
- Survivor atom rows: ${tangtangDescriptionFormulaValidation.formulaAtomSummary.survivorAtomRows}
- Collectible threshold atom rows: ${tangtangDescriptionFormulaValidation.formulaAtomSummary.collectibleThresholdAtomRows}
- Collectible special Rust mapping atom rows: ${tangtangDescriptionFormulaValidation.formulaAtomSummary.collectibleSpecialRustMappingAtomRows}
- Graph mode: \`${tangtangDescriptionFormulaValidation.formulaAtomGraph.graphMode}\`
- Direct first-party description-derived formula rows in formula-validation gate before capture import: ${tangtangDescriptionFormulaValidation.validationScope.directFirstPartyDescriptionFormulaRows}
- Description/SIO divergence rows: ${tangtangDescriptionFormulaValidation.divergenceRows.length}
- Can claim SIO formula description-correct: \`${tangtangDescriptionFormulaValidation.decisionPolicy.canClaimSioFormulaDescriptionCorrect}\`
- Can apply Tangtang formula correction: \`${tangtangDescriptionFormulaValidation.decisionPolicy.canApplyTangtangFormulaCorrection}\`
- Observed damage validation role: ${tangtangDescriptionFormulaValidation.decisionPolicy.observedDamageValidationRole}
- Formula/scoring/UI behavior did not change.

## Description Capture Import Gate

- Direct first-party description capture import is now tracked separately from source/live atom construction:
  - \`frontend/artifacts/td11/tangtang_description_capture_inbox.json\`
  - \`frontend/artifacts/td11/tangtang_description_capture_import_matrix.json\`
  - \`frontend/artifacts/td11/tangtang_description_capture_import_protocol.md\`
- Gate status: \`${tangtangDescriptionCaptureImport.status}\`
- Gate claim: \`${tangtangDescriptionCaptureImport.claim}\`
- Capture inbox rows: ${tangtangDescriptionCaptureImport.summary.captureInboxRows}
- Direct first-party description capture rows: ${tangtangDescriptionCaptureImport.summary.directFirstPartyDescriptionCaptureRows}
- Parsed description formula rows: ${tangtangDescriptionCaptureImport.summary.parsedDescriptionFormulaRows}
- Matched SIO rows: ${tangtangDescriptionCaptureImport.summary.matchedSioRows}
- Description/SIO divergence rows: ${tangtangDescriptionCaptureImport.summary.descriptionSioDivergenceRows}
- Observed damage follow-up rows: ${tangtangDescriptionCaptureImport.summary.observedDamageFollowUpRows}
- Captured atom rows: ${tangtangDescriptionCaptureImport.firstPartyCaptureCoverage.capturedAtomRows}
- Formula atom rows remaining without direct capture: ${tangtangDescriptionCaptureImport.firstPartyCaptureCoverage.formulaAtomRowsRemainingWithoutDirectCapture}
- Can run observed damage follow-up: \`${tangtangDescriptionCaptureImport.decisionPolicy.canRunObservedDamageFollowUp}\`
- Can apply Tangtang formula correction: \`${tangtangDescriptionCaptureImport.decisionPolicy.canApplyTangtangFormulaCorrection}\`
- Formula/scoring/UI behavior did not change.

## Random Capture Sample Audit

- The latest 30-image direct capture sample is summarized in:
  - \`frontend/artifacts/td11/tangtang_random_capture_sample_audit.json\`
  - \`frontend/artifacts/td11/tangtang_random_capture_sample_audit.md\`
- Audit status: \`${tangtangRandomCaptureSampleAudit.status}\`
- Raw images submitted: ${tangtangRandomCaptureSampleAudit.summary.submittedRawImages}
- Imported atom rows from sample: ${tangtangRandomCaptureSampleAudit.summary.importedAtomRowsFromBatch}
- Matched SIO rows from sample: ${tangtangRandomCaptureSampleAudit.summary.matchedSioRowsFromBatch}
- Description/SIO divergence rows from sample: ${tangtangRandomCaptureSampleAudit.summary.descriptionSioDivergenceRowsFromBatch}
- Observed damage follow-up rows from sample: ${tangtangRandomCaptureSampleAudit.summary.observedDamageFollowUpRowsFromBatch}
- Follow-up atom rows:
${tangtangRandomCaptureSampleAudit.decision.directObservedDamageFollowUpOpenedFor.map((rowId) => `  - \`${rowId}\``).join('\n')}
- Non-imported groups remain preserved as raw direct evidence, but are outside the current 221-row description atom ledger.
- Formula/scoring/UI behavior did not change.

## First-Party Description Source Inventory

- Official/public source acquisition is tracked separately from capture import:
  - \`frontend/artifacts/td11/tangtang_first_party_description_source_inventory.json\`
  - \`frontend/artifacts/td11/tangtang_first_party_description_source_inventory.md\`
- Gate status: \`${tangtangFirstPartyDescriptionSourceInventory.status}\`
- Gate claim: \`${tangtangFirstPartyDescriptionSourceInventory.claim}\`
- Official/public source candidates checked: ${tangtangFirstPartyDescriptionSourceInventory.summary.officialPublicSourceCandidates}
- Official/public sources with structured formula rows: ${tangtangFirstPartyDescriptionSourceInventory.summary.officialPublicSourcesWithStructuredFormulaRows}
- Official/public rows promoted to direct capture: ${tangtangFirstPartyDescriptionSourceInventory.summary.officialPublicRowsPromotedToDirectCapture}
- Local app resource artifacts found: ${tangtangFirstPartyDescriptionSourceInventory.summary.localAppResourceArtifactsFound}
- Rows requiring direct description capture: ${tangtangFirstPartyDescriptionSourceInventory.summary.rowsRequiringDirectDescriptionCapture}
- Direct first-party description-derived formula rows in formula-validation gate before capture import: ${tangtangFirstPartyDescriptionSourceInventory.summary.directFirstPartyDescriptionFormulaRows}
- Direct first-party description capture rows: ${tangtangFirstPartyDescriptionSourceInventory.summary.directFirstPartyDescriptionCaptureRows}
- Parsed description formula rows: ${tangtangFirstPartyDescriptionSourceInventory.summary.parsedDescriptionFormulaRows}
- Matched SIO rows: ${tangtangFirstPartyDescriptionSourceInventory.summary.matchedSioRows}
- Formula atom rows remaining without direct capture: ${tangtangFirstPartyDescriptionSourceInventory.summary.formulaAtomRowsRemainingWithoutDirectCapture}
- Public official web sufficient for formula validation: \`${tangtangFirstPartyDescriptionSourceInventory.summary.publicOfficialWebSufficientForFormulaValidation}\`
- User one-by-one capture required: \`${tangtangFirstPartyDescriptionSourceInventory.summary.userOneByOneCaptureRequired}\`
- Formula/scoring/UI behavior did not change.

## In-Game Damage Validation Gate

- Direct in-game observed-damage validation is tracked only as follow-up confirmation for description-vs-SIO divergences:
  - \`frontend/artifacts/td11/tangtang_in_game_damage_validation_matrix.json\`
  - \`frontend/artifacts/td11/tangtang_in_game_damage_validation_protocol.md\`
- Gate status: \`${tangtangInGameDamageValidation.status}\`
- Gate claim: \`${tangtangInGameDamageValidation.claim}\`
- Primary validation layer: \`${tangtangInGameDamageValidation.validationScope.primaryValidationLayer}\`
- Observed damage validation layer: \`${tangtangInGameDamageValidation.validationScope.observedDamageValidationLayer}\`
- Current in-game correctness claim: \`${tangtangInGameDamageValidation.validationScope.currentInGameCorrectnessClaim}\`
- Direct first-party description-derived formula rows in formula-validation gate before capture import: ${tangtangInGameDamageValidation.validationScope.directFirstPartyDescriptionFormulaRows}
- Description/SIO divergence rows: ${tangtangInGameDamageValidation.validationScope.descriptionDivergenceRows}
- Direct observed in-game damage trials: ${tangtangInGameDamageValidation.validationScope.directObservedDamageTrialCount}
- Can claim SIO formula in-game correct: \`${tangtangInGameDamageValidation.decisionPolicy.canClaimSioFormulaInGameCorrect}\`
- Can apply Tangtang formula correction: \`${tangtangInGameDamageValidation.decisionPolicy.canApplyTangtangFormulaCorrection}\`
- Can run observed damage follow-up without description divergence: \`${tangtangInGameDamageValidation.decisionPolicy.canRunObservedDamageFollowUpWithoutDescriptionDivergence}\`
- Correction status: \`${tangtangInGameDamageValidation.correctionPolicy.currentCorrectionStatus}\`
- This gate allows future Tangtang improvements beyond SIO only when repeated controlled direct in-game observations confirm a prior description-vs-SIO divergence.

## Follow-Up Gate Slices

These slices split the v0 matrix into smaller high-risk gates. They are guardrails for future work, not permission to change formula semantics.

${renderFollowUpGateSlices()}

## Matrix

${renderRows()}
`;

assert.match(matrix, /unsupported for formula input until fixture evidence exists/, 'non-SS weapon unsupported formula-input gate must stay visible');

if (writeMode) {
  await fs.mkdir(path.dirname(matrixPath), { recursive: true });
  await fs.writeFile(matrixPath, matrix);
  console.log(`damage_formula_provenance_matrix_unit_test: wrote ${matrixPath} (${rows.length} rows)`);
} else {
  const existing = await fs.readFile(matrixPath, 'utf8');
  assert.equal(existing, matrix, 'damage formula provenance matrix is stale; run with --write');
  console.log(`damage_formula_provenance_matrix_unit_test: passed (${rows.length} rows)`);
}
