import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const buildDir = path.join(tmpdir(), 'pareto-collectible-effect-mapping');
const deployedDataPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json');
const artifactPath = path.join(root, 'artifacts/td11/collectible_effect_mapping_matrix.json');

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
const deployedData = JSON.parse(await fs.readFile(deployedDataPath, 'utf8'));

const {
  CATALOG_ONLY_COLLECTIBLE_ITEM_IDS,
  COLLECTIBLE_ITEM_INDEX,
  COLLECTIBLE_SET_INDEX,
} = schemas;

const sourceCollectibleNames = Object.keys(deployedData.collectibles);
const sourceCollectibleIndexByName = new Map(sourceCollectibleNames.map((name, index) => [name, index]));

function idFromName(name) {
  return String(name)
    .replace(/['!?]/g, '')
    .replace(/[^A-Za-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
}

function stableObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableObject(item)]));
  }
  return value;
}

function statKeysFromThresholdTable(table) {
  const keys = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object') {
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'number') {
        keys.add(key);
      } else {
        visit(item);
      }
    }
  };
  visit(table);
  return [...keys].sort();
}

const ITEM_EQUIPMENT_MAPPINGS = {
  'Lucky Charm': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:75',
      equipment: 'voidwakerEmblem',
      thresholdMetric: 'stars',
      thresholds: [3, 5, 10],
      statChannels: ['critRate', 'voidNeckBoost', 'voidNeckBoostUptime'],
    },
  ],
  'Memory Editor': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:84',
      equipment: 'voidwakerEmblem',
      thresholdMetric: 'stars',
      thresholds: [3, 5, 10],
      statChannels: ['critRate', 'voidNeckBoost'],
    },
  ],
  'Safehouse Map': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:119',
      equipment: 'twistingBelt',
      thresholdMetric: 'stars',
      thresholds: [5, 10],
      statChannels: ['maxEnergyFlux', 'chaosBeltBoost'],
    },
  ],
  'Holodream Fluid': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:126',
      equipment: 'twistingBelt',
      thresholdMetric: 'stars',
      thresholds: [3, 5, 10],
      statChannels: ['maxEnergyFlux', 'chaosBeltBoost'],
    },
  ],
  'Taurus Starlight': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:135',
      equipment: 'twistingBelt',
      thresholdMetric: 'stars',
      thresholds: [3, 5, 10],
      statChannels: ['maxEnergyFlux', 'chaosBeltBoost'],
    },
  ],
};

const SET_SPECIAL_MAPPINGS = {
  'Erudite Heirloom': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:178',
      equipment: 'twinLance',
      thresholdMetric: 'total/goldEach',
      thresholds: [25, 3],
      statChannels: ['vulnerability', 'ssMiscPath'],
    },
  ],
  'Summon the Stand-in!': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:196',
      equipment: 'twinLance',
      thresholdMetric: 'redEach',
      thresholds: [3],
      statChannels: ['damageBoss'],
    },
  ],
  'Otherworld Treasure': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:207',
      equipment: 'evervoidArmor',
      thresholdMetric: 'goldEach/redEach/total',
      thresholds: [3, 25],
      statChannels: ['shieldDamage', 'clarity', 'skillDamage'],
    },
  ],
  'Meaning of Life': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:227',
      equipment: 'judgmentNecklace',
      thresholdMetric: 'goldEach/redEach/total',
      thresholds: [3, 25],
      statChannels: ['skillDamage', 'weakened', 'critDamage'],
    },
  ],
  'Interdimension Movement': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:243',
      equipment: 'stardustSash',
      thresholdMetric: 'goldEach/redEach/total',
      thresholds: [3, 25],
      statChannels: ['shieldDamage', 'skillDamage', 'eternalMultiplier'],
    },
  ],
  'Summon the Divine Dragon': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:267',
      equipment: 'moonscarBracer',
      thresholdMetric: 'goldEach/item stars',
      thresholds: [3, 8],
      statChannels: ['shieldDamage', 'critDamage', 'skillDamage'],
    },
  ],
  'Conduct Experiments': [
    {
      stage: 'equipment_transform',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs:279',
      equipment: 'glacialWarboots',
      thresholdMetric: 'redEach/total/item stars',
      thresholds: [3, 25],
      statChannels: ['shieldDamage', 'glacialBloodline', 'chilled'],
    },
  ],
  'Impression Idols': [
    {
      stage: 'tech_stats',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm.rs:1173',
      equipment: null,
      thresholdMetric: 'gold/red',
      thresholds: [20],
      statChannels: ['critDamage', 'skillDamage', 'vulnerability'],
    },
  ],
  'Wind Totem': [
    {
      stage: 'tech_stats',
      rustLocation: 'tttg_forge_optimizer/src/tech/sio_lm.rs:1191',
      equipment: null,
      thresholdMetric: 'gold',
      thresholds: [10, 20],
      statChannels: ['vulnerability'],
    },
  ],
};

function schemaCitation(item) {
  return Array.isArray(item.source_citations) ? item.source_citations : [];
}

function mappingStatChannels(mappings) {
  return [...new Set(mappings.flatMap((mapping) => mapping.statChannels ?? []))].sort();
}

function sourceStarStats(definition) {
  return stableObject(definition?.stars ?? {});
}

const itemRows = COLLECTIBLE_ITEM_INDEX.map((item) => {
  const isEventSlot = /^event\d+$/i.test(item.id);
  const sourceName = item.display_name_en;
  const sourceIndex = sourceCollectibleIndexByName.get(sourceName);
  const sourceDefinition = deployedData.collectibles[sourceName];
  const isSourceBacked = !isEventSlot && Boolean(sourceDefinition);
  const sourceChannels = isSourceBacked ? statKeysFromThresholdTable(sourceDefinition.stars) : [];
  const mappings = [
    ...(sourceChannels.length > 0
      ? [{
        stage: 'derived_base_stats',
        rustLocation: 'tttg_forge_optimizer/src/tech/sio_config.rs:2459',
        equipment: null,
        thresholdMetric: 'stars>=8',
        thresholds: [8],
        statChannels: sourceChannels,
      }]
      : []),
    ...(ITEM_EQUIPMENT_MAPPINGS[sourceName] ?? []),
  ];

  return {
    key: `collectible-item:${item.id}`,
    kind: isEventSlot ? 'event-slot' : sourceDefinition ? 'item' : 'catalog-only-item',
    name: item.display_name_en,
    sioSourceKey: sourceName,
    sioSourceIndex: sourceIndex ?? null,
    tangtangSchemaKey: `COLLECTIBLE_ITEM_INDEX.${item.id}`,
    sourceCitations: schemaCitation(item),
    sourceStarStats: sourceStarStats(sourceDefinition),
    rustMappings: mappings,
    rustStatChannels: mappingStatChannels(mappings),
    multiplierStage: isEventSlot || !sourceDefinition
      ? 'none until source effect row is known'
      : 'derived base stat fold; selected rows also feed equipment-specific transforms',
    inGameDescriptionStatus: 'not independently captured',
    confidence: isEventSlot || !sourceDefinition ? 'catalog-only' : 'sio-source-only',
    nextAction: isEventSlot || !sourceDefinition
      ? 'replace or promote only when source exposes a real collectible/effect row'
      : 'capture in-game description and compare text against source threshold rows',
  };
});

const setRows = COLLECTIBLE_SET_INDEX.map((set) => {
  const sourceName = set.display_name_en;
  const sourceDefinition = deployedData.sets[sourceName];
  const sourceChannels = statKeysFromThresholdTable(sourceDefinition?.stars);
  const mappings = [
    ...(sourceChannels.length > 0
      ? [{
        stage: 'derived_base_stats',
        rustLocation: 'tttg_forge_optimizer/src/tech/sio_config.rs:2525',
        equipment: null,
        thresholdMetric: 'gold/red/total/goldEach/redEach',
        thresholds: Object.values(sourceDefinition.stars).flatMap((thresholds) => Object.keys(thresholds).map(Number)).sort((a, b) => a - b),
        statChannels: sourceChannels,
      }]
      : []),
    ...(SET_SPECIAL_MAPPINGS[sourceName] ?? []),
  ];

  return {
    key: `collectible-set:${set.id}`,
    kind: 'set',
    name: set.display_name_en,
    sioSourceKey: sourceName,
    sioSourceIndex: null,
    tangtangSchemaKey: `COLLECTIBLE_SET_INDEX.${set.id}`,
    sourceCitations: schemaCitation(set),
    itemSchemaKeys: set.item_ids.map((id) => `COLLECTIBLE_ITEM_INDEX.${id}`),
    sourceSetThresholds: stableObject(sourceDefinition?.stars ?? {}),
    rustMappings: mappings,
    rustStatChannels: mappingStatChannels(mappings),
    multiplierStage: 'derived base set fold; selected rows also feed equipment or tech-specific transforms',
    inGameDescriptionStatus: 'not independently captured',
    confidence: 'sio-source-only',
    nextAction: 'capture set in-game description and compare text against source threshold rows',
  };
});

function itemThresholdRows(row) {
  const nums = row.sourceStarStats.nums ?? [];
  const vals = row.sourceStarStats.vals ?? [];
  return nums.flatMap((threshold, index) => Object.entries(vals[index] ?? {}).map(([statChannel, value]) => ({
    key: `${row.key}:stars:${threshold}:${statChannel}`,
    parentKey: row.key,
    kind: 'item-threshold',
    name: row.name,
    sourceDescription: `${row.name} stars >= ${threshold}: ${statChannel} +${value}`,
    sioSourceKey: `${row.sioSourceKey}.stars.${threshold}.${statChannel}`,
    sioSourceIndex: row.sioSourceIndex,
    tangtangSchemaKey: row.tangtangSchemaKey,
    rustLocation: 'tttg_forge_optimizer/src/tech/sio_config.rs:2459',
    rustStatChannel: statChannel,
    thresholdMetric: 'stars',
    threshold,
    value,
    multiplierStage: 'derived_base_stats before 31-stage damage vector',
    inGameDescriptionStatus: 'not independently captured',
    confidence: row.confidence,
  })));
}

function setThresholdRows(row) {
  return Object.entries(row.sourceSetThresholds).flatMap(([metric, thresholds]) => (
    Object.entries(thresholds ?? {}).flatMap(([threshold, stats]) => (
      Object.entries(stats ?? {}).map(([statChannel, value]) => ({
        key: `${row.key}:${metric}:${threshold}:${statChannel}`,
        parentKey: row.key,
        kind: 'set-threshold',
        name: row.name,
        sourceDescription: `${row.name} ${metric} >= ${threshold}: ${statChannel} +${value}`,
        sioSourceKey: `${row.sioSourceKey}.stars.${metric}.${threshold}.${statChannel}`,
        sioSourceIndex: null,
        tangtangSchemaKey: row.tangtangSchemaKey,
        rustLocation: 'tttg_forge_optimizer/src/tech/sio_config.rs:2525',
        rustStatChannel: statChannel,
        thresholdMetric: metric,
        threshold: Number(threshold),
        value,
        multiplierStage: 'derived_base_set_stats before 31-stage damage vector',
        inGameDescriptionStatus: 'not independently captured',
        confidence: row.confidence,
      }))
    ))
  ));
}

const rows = [...itemRows, ...setRows].sort((a, b) => a.key.localeCompare(b.key));
const thresholdRows = [...itemRows.flatMap(itemThresholdRows), ...setRows.flatMap(setThresholdRows)].sort((a, b) => a.key.localeCompare(b.key));
const eventRows = rows.filter((row) => row.kind === 'event-slot');
const namedItemRows = itemRows.filter((row) => row.kind === 'item');
const catalogOnlyNamedItemRows = itemRows.filter((row) => row.kind === 'catalog-only-item');
const setRowsWithSourceThresholds = setRows.filter((row) => Object.keys(row.sourceSetThresholds).length > 0);
const rowsWithSpecialRustMappings = rows.filter((row) => row.rustMappings.some((mapping) => mapping.stage !== 'derived_base_stats'));

const artifact = {
  generatedAtKst: '2026-05-23',
  status: 'COLLECTIBLE-EFFECT-MAPPING-MATRIX-V0',
  summary: {
    totalRows: rows.length,
    namedItemRows: namedItemRows.length,
    catalogOnlyNamedItemRows: catalogOnlyNamedItemRows.length,
    eventSlotRows: eventRows.length,
    setRows: setRows.length,
    namedItemsWithSourceStarStats: namedItemRows.filter((row) => Object.keys(row.sourceStarStats).length > 0).length,
    setsWithSourceThresholds: setRowsWithSourceThresholds.length,
    thresholdRows: thresholdRows.length,
    rowsWithSpecialRustMappings: rowsWithSpecialRustMappings.length,
    inGameDescriptionVerifiedRows: rows.filter((row) => row.inGameDescriptionStatus !== 'not independently captured').length,
  },
  notes: [
    'Internal provenance artifact only; no product UI wording changes.',
    'Event slots intentionally remain catalog-only until the source exposes real collectible names/effects.',
    'This artifact maps source and Rust channels; it does not independently verify in-game description text.',
  ],
  rows,
  thresholdRows,
};

const rowByKey = new Map(rows.map((row) => [row.key, row]));
const requireRow = (key) => {
  const row = rowByKey.get(key);
  assert.ok(row, `missing row: ${key}`);
  return row;
};

assert.equal(artifact.summary.totalRows, 160);
assert.equal(artifact.summary.namedItemRows, 76);
assert.equal(artifact.summary.catalogOnlyNamedItemRows, 4);
assert.equal(artifact.summary.eventSlotRows, 42);
assert.equal(artifact.summary.setRows, 38);
assert.equal(artifact.summary.namedItemsWithSourceStarStats, 76);
assert.equal(artifact.summary.setsWithSourceThresholds, 35);
assert.ok(artifact.summary.thresholdRows > artifact.summary.totalRows, 'mapping must include threshold-level rows, not only entity rows');
assert.ok(artifact.thresholdRows.some((row) => row.key === 'collectible-item:luckyCharm:stars:8:critRate'), 'item threshold rows must map individual stat channels');
assert.ok(artifact.thresholdRows.some((row) => row.key === 'collectible-set:impressionIdols:red:20:skillDamage'), 'set threshold rows must map set metrics to stat channels');
assert.equal(artifact.summary.inGameDescriptionVerifiedRows, 0);
assert.ok(rows.every((row) => row.inGameDescriptionStatus === 'not independently captured'));
assert.ok(eventRows.every((row) => row.confidence === 'catalog-only'));
assert.ok(namedItemRows.every((row) => row.confidence === 'sio-source-only'));
assert.ok(catalogOnlyNamedItemRows.every((row) => row.confidence === 'catalog-only'));
assert.ok(setRows.every((row) => row.confidence === 'sio-source-only'));
assert.deepEqual(
  catalogOnlyNamedItemRows.map((row) => row.name).sort(),
  CATALOG_ONLY_COLLECTIBLE_ITEM_IDS.map((id) => COLLECTIBLE_ITEM_INDEX.find((item) => item.id === id).display_name_en).sort(),
);

assert.equal(requireRow('collectible-item:luckyCharm').sioSourceIndex, 41);
assert.equal(requireRow('collectible-item:memoryEditor').sioSourceIndex, 24);
assert.equal(requireRow('collectible-item:safehouseMap').sioSourceIndex, 39);
assert.equal(requireRow('collectible-item:holodreamFluid').sioSourceIndex, 27);
assert.equal(requireRow('collectible-item:taurusStarlight').sioSourceIndex, 35);
assert.ok(requireRow('collectible-item:luckyCharm').rustStatChannels.includes('voidNeckBoost'));
assert.ok(requireRow('collectible-item:taurusStarlight').rustStatChannels.includes('chaosBeltBoost'));
assert.ok(requireRow('collectible-set:eruditeHeirloom').rustMappings.some((mapping) => mapping.equipment === 'twinLance'));
assert.ok(requireRow('collectible-set:summonTheStandIn').rustMappings.some((mapping) => mapping.equipment === 'twinLance'));
assert.ok(requireRow('collectible-set:otherworldTreasure').rustMappings.some((mapping) => mapping.equipment === 'evervoidArmor'));
assert.ok(requireRow('collectible-set:impressionIdols').rustMappings.some((mapping) => mapping.stage === 'tech_stats'));
assert.deepEqual(
  setRows.filter((row) => Object.keys(row.sourceSetThresholds).length === 0).map((row) => row.name).sort(),
  ['Interdimension Movement', 'Otherworld Treasure', 'Realizing Childhood Dreams'].sort(),
);

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

if (writeMode) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, serialized);
  console.log(`collectible_effect_mapping_matrix_unit_test: wrote ${artifactPath} (${rows.length} rows)`);
} else {
  const existing = await fs.readFile(artifactPath, 'utf8');
  assert.equal(existing, serialized, 'collectible effect mapping matrix is stale; run with --write');
  console.log(`collectible_effect_mapping_matrix_unit_test: passed (${rows.length} rows)`);
}
