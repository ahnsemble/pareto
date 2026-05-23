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
]);

const ABSENT_SURVIVORS = [
  ['spongebob', 'SpongeBob'],
  ['squidward', 'Squidward'],
  ['yelena', 'Yelena'],
];

const MOUNT_DAMAGE_FORMULA_FIXTURES = [];

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
  addRow({
    key: `survivor:${hero.id}`,
    domain: 'survivor',
    name: hero.display_name_en,
    sourceStatus: 'present in current SIO source/default roster',
    sioSourceKey: citationsOf(hero),
    tangtangSchemaKey: `HERO_SCHEMA_INDEX.${hero.id}`,
    rustStatChannel: DIRECT_HERO_CHANNELS.get(hero.id) ?? 'SIO compact survivor/passive/teamwork transform; generic aggregate empty',
    multiplierStage: DIRECT_HERO_CHANNELS.get(hero.id) ?? 'upstream stat transform before 31-stage damage vector',
    liveEvidence: 'sio_lm_equivalence_matrix.survivors-passives-harmony-teamwork=implemented-live-covered',
    confidence: 'sio-live-equivalent',
    nextAction: 'add in-game description row for each star/awakening/passive effect',
  });
}

for (const [id, name] of ABSENT_SURVIVORS) {
  addRow({
    key: `survivor-unsupported:${id}`,
    domain: 'survivor-unsupported',
    name,
    sourceStatus: 'absent from corrected current SIO default/source docs',
    sioSourceKey: 'sio_tools_formulas_and_defaults.md:316-319',
    tangtangSchemaKey: 'none',
    rustStatChannel: 'none',
    multiplierStage: 'none',
    liveEvidence: 'none',
    confidence: 'unsupported-by-current-sio-source',
    nextAction: 'refresh SIO/game source before supporting this survivor',
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
  addRow({
    key: `mount:${mount.id}`,
    domain: 'mount',
    name: mount.display_name_en,
    sourceStatus: 'SIO mount catalog plus compact mount stat-line fold',
    sioSourceKey: citationsOf(mount),
    tangtangSchemaKey: `MOUNT_SCHEMA_INDEX.${mount.id}`,
    rustStatChannel: 'compact mount stats; mountDamage currently not strongly live-proven',
    multiplierStage: 'mount-derived stat channels when present',
    liveEvidence: 'sio_lm_equivalence_matrix.mounts=implemented-live-covered, but prior audit notes incomplete mount damage formulas',
    confidence: 'sio-source-only',
    nextAction: 'capture non-empty mount live fixture with damage-bearing lines',
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
  addRow({
    key: `collectible-item:${item.id}`,
    domain: eventSlot ? 'collectible-event-slot' : 'collectible-item',
    name: item.display_name_en,
    sourceStatus: eventSlot ? 'SIO reserved event placeholder slot' : 'SIO collectible item index source-backed',
    sioSourceKey: citationsOf(item),
    tangtangSchemaKey: `COLLECTIBLE_ITEM_INDEX.${item.id}`,
    rustStatChannel: eventSlot ? 'none until event source is known' : 'equipment_transform item/set bonuses where explicitly wired',
    multiplierStage: eventSlot ? 'none' : 'item/set-dependent upstream stat transform',
    liveEvidence: eventSlot ? 'none' : 'sio_lm_equivalence_matrix.collectibles-custom-sets=implemented-live-covered',
    confidence: eventSlot ? 'catalog-only' : 'sio-source-only',
    nextAction: eventSlot ? 'replace placeholder when SIO exposes real item' : 'add item-level in-game description and stat/equipment effect mapping',
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
    liveEvidence: 'sio_lm_equivalence_matrix.collectibles-custom-sets=implemented-live-covered',
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
for (const row of mountRows) {
  assert.equal(row.confidence, 'sio-source-only', `${row.key}.confidence`);
  assertIncludes(row, 'rustStatChannel', 'mountDamage currently not strongly live-proven');
  assert.equal(row.nextAction, 'capture non-empty mount live fixture with damage-bearing lines', `${row.key}.nextAction`);
}
const hasMountDamageFixture = MOUNT_DAMAGE_FORMULA_FIXTURES.some((fixture) => typeof fixture.mountDamageLine === 'string' && fixture.mountDamageLine.trim() !== '');
const mountFormulaCompleteRows = mountRows.filter((row) => row.confidence === 'sio-live-equivalent' || row.confidence === 'in-game-description-verified');
assert.equal(mountFormulaCompleteRows.length, 0, 'mount formula-complete rows require non-empty mountDamage fixture before confidence promotion');
assert.equal(hasMountDamageFixture, false, 'mountDamage fixture list is intentionally empty until a non-empty live or approved fixture exists');

const unsupportedSurvivorRows = rows.filter((row) => row.domain === 'survivor-unsupported');
assert.deepEqual(
  unsupportedSurvivorRows.map((row) => row.key).sort(),
  ABSENT_SURVIVORS.map(([id]) => `survivor-unsupported:${id}`).sort(),
  'unsupported survivors must stay explicit until source refresh',
);
for (const row of unsupportedSurvivorRows) {
  assert.equal(row.confidence, 'unsupported-by-current-sio-source', `${row.key}.confidence`);
  assert.equal(row.nextAction, 'refresh SIO/game source before supporting this survivor', `${row.key}.nextAction`);
}

const collectibleTextMappingRows = rows.filter((row) => row.domain === 'collectible-item' || row.domain === 'collectible-set');
assert.equal(collectibleTextMappingRows.length, 118, 'collectible item/set text-mapping slice must remain explicit');
for (const row of collectibleTextMappingRows) {
  assert.equal(row.confidence, 'sio-source-only', `${row.key}.confidence`);
  assertIncludes(row, 'nextAction', 'description');
}

const exoBracerSsWeaponRow = requireRow('tech-modifier:exoBracer->ssWeapon');
assert.equal(TECH_MODIFIER_MATRIX.exoBracer.ssWeapon, -0.025, 'Exo Bracer -> SS Weapon coefficient must remain a debuff');
assertIncludes(exoBracerSsWeaponRow, 'sourceStatus', '-0.025');
assert.equal(exoBracerSsWeaponRow.nextAction, 'keep debuff regression visible in tests/docs');

const genericAggregateRows = rows.filter((row) => row.rustStatChannel.includes('generic aggregate empty'));
assert.ok(genericAggregateRows.length > 0, 'generic aggregate non-authoritative rows must stay visible');

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
    currentState: 'source-only; mountDamage is not strongly live-proven',
    blocker: 'needs non-empty mount live capture with damage-bearing lines',
    nextGate: 'capture a live fixture or add an explicitly sourced synthetic fixture before formula-completeness claims',
  },
  {
    gate: 'DF-P4',
    slice: 'Collectible item/set text mapping',
    rowsGuarded: `${collectibleTextMappingRows.length} collectible item/set rows`,
    currentState: 'source-only; compact path covered, per-description mapping not independently captured',
    blocker: 'missing item/set in-game description to stat-channel mapping',
    nextGate: 'map description -> source key -> Tangtang schema key -> Rust stat channel -> multiplier stage',
  },
  {
    gate: 'DF-P5',
    slice: 'Unsupported collaboration survivors',
    rowsGuarded: unsupportedSurvivorRows.map((row) => row.key).join('; '),
    currentState: 'unsupported by current corrected source',
    blocker: 'SpongeBob/Squidward/Yelena need source refresh before support',
    nextGate: 'refresh SIO/game source first; only then add schema/scoring support',
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
    rowsGuarded: `${genericAggregateRows.length} rows mentioning generic aggregate empty`,
    currentState: 'matrix documents that product scoring relies on compact equivalence paths for these domains',
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
status: [DAMAGE-FORMULA-PROVENANCE-MATRIX-V0]

## Purpose

This matrix is a coverage ledger, not a new formula implementation. It records which Tangtang damage-affecting entities are backed by the current SIO Tools mirror, which ones are only catalog/source rows, and which ones still need direct in-game description evidence.

Confidence values:

- \`sio-live-equivalent\`: covered by the current SIO LM full-equivalence/live replay gate.
- \`sio-source-only\`: backed by SIO source/schema extraction, but lacking a targeted live or in-game text fixture.
- \`catalog-only\`: present as a product/schema catalog row, but not proven as a formula input.
- \`in-game-description-verified\`: reserved for rows with direct in-game description capture plus formula mapping. No row has this confidence in v0.
- \`unsupported-by-current-sio-source\`: explicitly requested/known entity, but absent from current corrected SIO source.

## Summary

- Total rows: ${rows.length}
- Generated from: \`frontend/app/lib/pareto-store/schemas/index.ts\`
- Formula reference: \`tttg_forge_core/src/v3_damage.rs\`
- SIO source references:
  - \`/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_gt_master.md\`
  - \`/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/시오툴/sio_tools_formulas_and_defaults.md\`

### Rows By Domain

${renderCountTable(countBy('domain'))}

### Rows By Confidence

${renderCountTable(countBy('confidence'))}

## High-Risk Gaps

- Non-SS weapons are present as catalog rows but not proven as complete formula rows.
- SpongeBob, Squidward, and Yelena are explicitly unsupported by the current corrected SIO source. Donatello is present and covered through the SIO survivor matrix.
- Mounts need non-empty mount live captures with damage-bearing lines before claiming independent formula completeness.
- Collectible item/set rows are source-backed, but most still need item-level in-game description-to-stat mapping.
- Generic aggregate modules remain non-authoritative for hero/pet/tech/collectible-set scoring; the current product scorer relies on the SIO LM compact path.

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
