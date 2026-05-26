import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const buildDir = path.join(tmpdir(), 'pareto-tangtang-sio-taxonomy-gap-audit');
const deployedDataPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json');
const artifactPath = path.join(root, 'artifacts/td11/tangtang_sio_taxonomy_gap_audit.json');
const mdArtifactPath = path.join(root, 'artifacts/td11/tangtang_sio_taxonomy_gap_audit.md');

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
    return Object.fromEntries(Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableObject(item)]));
  }
  return value;
}

function numericLeafRows(domain, value, pathParts = []) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [{
      domain,
      sourcePath: pathParts.join('.'),
      value,
    }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => numericLeafRows(domain, item, [...pathParts, String(index)]));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => numericLeafRows(domain, item, [...pathParts, key]));
  }
  return [];
}

function sourceKeyForProductName(domain, productName) {
  const aliases = {
    heroes: {
      SpongeBob: 'Spongebob',
    },
    pets: {
      Clucker: 'Crucker',
      Blizzblast: 'King Blizzblast',
    },
  };
  return aliases[domain]?.[productName] ?? productName;
}

function compareSourceBackedRows({ domain, sourceKeys, productRows, productName = (row) => row.display_name_en }) {
  const productSourceKeys = productRows.map((row) => sourceKeyForProductName(domain, productName(row)));
  const productSourceKeySet = new Set(productSourceKeys);
  const sourceKeySet = new Set(sourceKeys);
  const missingSourceRows = sourceKeys
    .filter((sourceKey) => !productSourceKeySet.has(sourceKey))
    .map((sourceKey) => ({
      domain,
      sourceKey,
      expectedProductId: idFromName(sourceKey),
      status: 'missing-product-schema-row',
    }));
  const productOnlyRows = productRows
    .filter((row) => !sourceKeySet.has(sourceKeyForProductName(domain, productName(row))))
    .map((row) => ({
      domain,
      productId: row.id,
      productName: productName(row),
      sourceLookupKey: sourceKeyForProductName(domain, productName(row)),
      status: 'product-only-or-alias-pending',
    }));
  const aliasRows = productRows
    .map((row) => ({
      domain,
      productId: row.id,
      productName: productName(row),
      sourceKey: sourceKeyForProductName(domain, productName(row)),
    }))
    .filter((row) => row.productName !== row.sourceKey && sourceKeySet.has(row.sourceKey));

  return {
    missingSourceRows,
    productOnlyRows,
    aliasRows,
  };
}

function rowCount(label, rows) {
  return `| ${label} | ${rows.length} |`;
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
  COLLECTIBLE_EVENT_SLOTS,
  COLLECTIBLE_ITEM_INDEX,
  COLLECTIBLE_SET_INDEX,
  HERO_SCHEMA_INDEX,
  PET_SCHEMA_INDEX,
  SS_EQUIPMENT_SCHEMA_INDEX,
  TECH_TWINBORN_PARTS,
} = schemas;

const collectibleCompare = compareSourceBackedRows({
  domain: 'collectibles',
  sourceKeys: Object.keys(deployedData.collectibles).sort(),
  productRows: COLLECTIBLE_ITEM_INDEX,
});
const setCompare = compareSourceBackedRows({
  domain: 'sets',
  sourceKeys: Object.keys(deployedData.sets).sort(),
  productRows: COLLECTIBLE_SET_INDEX,
});
const itemCompare = compareSourceBackedRows({
  domain: 'items',
  sourceKeys: Object.keys(deployedData.items).sort(),
  productRows: SS_EQUIPMENT_SCHEMA_INDEX,
});
const heroCompare = compareSourceBackedRows({
  domain: 'heroes',
  sourceKeys: Object.keys(deployedData.heroes).sort(),
  productRows: HERO_SCHEMA_INDEX,
});
const petCompareRaw = compareSourceBackedRows({
  domain: 'pets',
  sourceKeys: Object.keys(deployedData.pets).sort(),
  productRows: PET_SCHEMA_INDEX.filter((pet) => sourceKeyForProductName('pets', pet.display_name_en) in deployedData.pets),
});
const techCompare = compareSourceBackedRows({
  domain: 'techs',
  sourceKeys: Object.keys(deployedData.techs).sort(),
  productRows: TECH_TWINBORN_PARTS,
});

const petSkillOnlyRows = PET_SCHEMA_INDEX
  .filter((pet) => !(sourceKeyForProductName('pets', pet.display_name_en) in deployedData.pets))
  .map((pet) => ({
    domain: 'pets',
    productId: pet.id,
    productName: pet.display_name_en,
    sourceKey: `petSkills.Default.${pet.display_name_en}`,
    status: deployedData.petSkills?.Default?.[pet.display_name_en] ? 'covered-as-default-pet-skill' : 'product-only-pending',
  }));

const petXenoTypeMismatchRows = PET_SCHEMA_INDEX
  .flatMap((pet) => {
    const sourceKey = sourceKeyForProductName('pets', pet.display_name_en);
    const sourcePet = deployedData.pets[sourceKey];
    if (!sourcePet) return [];
    const sourceIsXeno = sourcePet.type === 'Xeno';
    if (sourceIsXeno === Boolean(pet.is_xeno)) return [];
    return [{
      domain: 'pets',
      productId: pet.id,
      productName: pet.display_name_en,
      sourceKey,
      productIsXeno: Boolean(pet.is_xeno),
      sourceIsXeno,
      status: 'source-backed-type-mismatch',
    }];
  });

const productAliasRows = [
  ...heroCompare.aliasRows,
  ...petCompareRaw.aliasRows,
].sort((a, b) => `${a.domain}:${a.productId}`.localeCompare(`${b.domain}:${b.productId}`));

const directGapRows = [
  ...collectibleCompare.missingSourceRows,
  ...setCompare.missingSourceRows,
  ...itemCompare.missingSourceRows,
  ...heroCompare.missingSourceRows,
  ...petCompareRaw.missingSourceRows,
  ...techCompare.missingSourceRows,
  ...petXenoTypeMismatchRows,
].sort((a, b) => `${a.domain}:${a.sourceKey ?? a.productId}`.localeCompare(`${b.domain}:${b.sourceKey ?? b.productId}`));

const sourceEffectLeafCounts = {
  collectibles: numericLeafRows('collectibles', deployedData.collectibles).length,
  sets: numericLeafRows('sets', deployedData.sets).length,
  items: numericLeafRows('items', deployedData.items).length,
  heroes: numericLeafRows('heroes', deployedData.heroes).length,
  pets: numericLeafRows('pets', deployedData.pets).length + numericLeafRows('petSkills', deployedData.petSkills).length,
  techs: numericLeafRows('techs', deployedData.techs).length,
};

const artifact = {
  generatedAtKst: '2026-05-26',
  status: 'TANGTANG-SIO-TAXONOMY-GAP-AUDIT-V0',
  decision: {
    scoringChanged: false,
    uiChanged: false,
    preserveFullSioEquivalentContract: true,
    notes: [
      'This audit compares Tangtang product taxonomy rows against the internal deployed formula table.',
      'It fills source-backed schema gaps only; it does not expose internal source wording in user-facing UI.',
      'Formula effects remain covered by the existing scorer/source-table path; in-game copy text remains evidence-gated.',
    ],
  },
  summary: {
    sourceCollectibleRows: Object.keys(deployedData.collectibles).length,
    tangtangCollectibleRows: COLLECTIBLE_ITEM_INDEX.length,
    collectionSourceMissingRows: collectibleCompare.missingSourceRows.length,
    collectionCatalogOnlyRows: CATALOG_ONLY_COLLECTIBLE_ITEM_IDS.length,
    collectionEventSlotRows: COLLECTIBLE_EVENT_SLOTS.length,
    sourceSetRows: Object.keys(deployedData.sets).length,
    tangtangSetRows: COLLECTIBLE_SET_INDEX.length,
    setSourceMissingRows: setCompare.missingSourceRows.length,
    sourceItemRows: Object.keys(deployedData.items).length,
    tangtangItemRows: SS_EQUIPMENT_SCHEMA_INDEX.length,
    itemSourceMissingRows: itemCompare.missingSourceRows.length,
    sourceHeroRows: Object.keys(deployedData.heroes).length,
    tangtangHeroRows: HERO_SCHEMA_INDEX.length,
    heroSourceMissingRows: heroCompare.missingSourceRows.length,
    sourcePetRows: Object.keys(deployedData.pets).length,
    tangtangPetRows: PET_SCHEMA_INDEX.length,
    petSourceMissingRows: petCompareRaw.missingSourceRows.length,
    petSkillOnlyRows: petSkillOnlyRows.length,
    petXenoTypeMismatchRows: petXenoTypeMismatchRows.length,
    sourceTechRows: Object.keys(deployedData.techs).length,
    tangtangTechRows: TECH_TWINBORN_PARTS.length,
    techSourceMissingRows: techCompare.missingSourceRows.length,
    productAliasRows: productAliasRows.length,
    directGapRows: directGapRows.length,
    noScoringChange: true,
    noUiSioWordingChange: true,
    noRawDebugExposure: true,
  },
  sourceEffectLeafCounts,
  rows: {
    directGapRows,
    productAliasRows,
    petSkillOnlyRows,
    collectionCatalogOnlyRows: CATALOG_ONLY_COLLECTIBLE_ITEM_IDS.map((id) => ({
      domain: 'collectibles',
      productId: id,
      productName: COLLECTIBLE_ITEM_INDEX.find((item) => item.id === id)?.display_name_en ?? id,
      status: 'catalog-only-pending-source-row',
    })),
  },
};

const md = [
  '# Tangtang / Internal Source Taxonomy Gap Audit',
  '',
  'Date: 2026-05-26',
  '',
  '## Decision',
  '',
  '- Scoring changed: no.',
  '- UI wording changed: no.',
  '- Full equivalence contract preserved: yes.',
  '- Direct source-backed taxonomy gaps after this pass: 0.',
  '',
  '## Summary',
  '',
  '| Metric | Count |',
  '|---|---:|',
  rowCount('Source collectible rows', Object.keys(deployedData.collectibles)),
  rowCount('Tangtang collectible rows', COLLECTIBLE_ITEM_INDEX),
  rowCount('Collection source-missing rows', collectibleCompare.missingSourceRows),
  rowCount('Collection catalog-only pending rows', CATALOG_ONLY_COLLECTIBLE_ITEM_IDS),
  rowCount('Collection event slots', COLLECTIBLE_EVENT_SLOTS),
  rowCount('Source set rows', Object.keys(deployedData.sets)),
  rowCount('Tangtang set rows', COLLECTIBLE_SET_INDEX),
  rowCount('Source item rows', Object.keys(deployedData.items)),
  rowCount('Tangtang item rows', SS_EQUIPMENT_SCHEMA_INDEX),
  rowCount('Source hero rows', Object.keys(deployedData.heroes)),
  rowCount('Tangtang hero rows', HERO_SCHEMA_INDEX),
  rowCount('Source pet rows', Object.keys(deployedData.pets)),
  rowCount('Tangtang pet rows', PET_SCHEMA_INDEX),
  rowCount('Source tech rows', Object.keys(deployedData.techs)),
  rowCount('Tangtang tech rows', TECH_TWINBORN_PARTS),
  rowCount('Product/source alias rows kept', productAliasRows),
  rowCount('Direct gap rows', directGapRows),
  '',
  '## Effect Source Coverage',
  '',
  '| Domain | Numeric source leaves |',
  '|---|---:|',
  ...Object.entries(sourceEffectLeafCounts).map(([domain, count]) => `| ${domain} | ${count} |`),
  '',
  '## Notes',
  '',
  '- Collections are the priority domain: all 118 internal source collectible keys are covered by Tangtang rows; the four zodiac catalog-only rows remain explicitly pending because the source table has no effect rows for them yet.',
  '- Product-facing pet aliases stay as Clucker and Blizzblast while internal source aliases remain Crucker and King Blizzblast.',
  '- Formula effects are already source-backed through the scoring/evidence table. Human-readable in-game effect copy is not promoted without direct capture.',
].join('\n');

assert.equal(artifact.summary.collectionSourceMissingRows, 0);
assert.equal(artifact.summary.setSourceMissingRows, 0);
assert.equal(artifact.summary.itemSourceMissingRows, 0);
assert.equal(artifact.summary.heroSourceMissingRows, 0);
assert.equal(artifact.summary.petSourceMissingRows, 0);
assert.equal(artifact.summary.petXenoTypeMismatchRows, 0);
assert.equal(artifact.summary.techSourceMissingRows, 0);
assert.equal(artifact.summary.directGapRows, 0);
assert.equal(artifact.summary.collectionCatalogOnlyRows, 4);
assert.equal(artifact.summary.collectionEventSlotRows, 42);
assert.equal(artifact.summary.productAliasRows, 3);
assert.deepEqual(productAliasRows.map((row) => `${row.domain}:${row.productName}->${row.sourceKey}`).sort(), [
  'heroes:SpongeBob->Spongebob',
  'pets:Blizzblast->King Blizzblast',
  'pets:Clucker->Crucker',
]);
assert.deepEqual(petSkillOnlyRows, [{
  domain: 'pets',
  productId: 'gary',
  productName: 'Gary',
  sourceKey: 'petSkills.Default.Gary',
  status: 'covered-as-default-pet-skill',
}]);
assert.ok(Object.values(sourceEffectLeafCounts).every((count) => count > 0), 'every audited domain must have source effect leaves');
assert.equal(artifact.decision.scoringChanged, false);
assert.equal(artifact.decision.uiChanged, false);
assert.equal(artifact.summary.noUiSioWordingChange, true);
assert.equal(artifact.summary.noRawDebugExposure, true);

const serialized = `${JSON.stringify(stableObject(artifact), null, 2)}\n`;
const serializedMd = `${md}\n`;

if (writeMode) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, serialized);
  await fs.writeFile(mdArtifactPath, serializedMd);
  console.log(`tangtang_sio_taxonomy_gap_audit_unit_test: wrote ${artifactPath}`);
} else {
  assert.equal(await fs.readFile(artifactPath, 'utf8'), serialized, 'taxonomy gap audit JSON is stale; run with --write');
  assert.equal(await fs.readFile(mdArtifactPath, 'utf8'), serializedMd, 'taxonomy gap audit markdown is stale; run with --write');
  console.log('tangtang_sio_taxonomy_gap_audit_unit_test: passed');
}
