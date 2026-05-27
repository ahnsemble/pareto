import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const assetDiscoveryScriptPath = path.join(root, 'scripts/sio_tools_asset_discovery.mjs');
const formulaExtractScriptPath = path.join(root, 'scripts/sio_minified_formula_table_extract.mjs');
const assetDiscoverySummaryPath = path.join(root, 'artifacts/td11/sio_tools_asset_discovery/asset_discovery_summary.json');
const runtimeExportsPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/formula_table_runtime_exports.json');
const deployedDataPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json');
const damageCoefficientsPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module32085_mg_damage_coefficients.json');

const assetDiscoverySource = await fs.readFile(assetDiscoveryScriptPath, 'utf8');
const formulaExtractSource = await fs.readFile(formulaExtractScriptPath, 'utf8');
const assetDiscoverySummary = JSON.parse(await fs.readFile(assetDiscoverySummaryPath, 'utf8'));
const runtimeExports = JSON.parse(await fs.readFile(runtimeExportsPath, 'utf8'));
const deployedData = JSON.parse(await fs.readFile(deployedDataPath, 'utf8'));
const damageCoefficients = JSON.parse(await fs.readFile(damageCoefficientsPath, 'utf8'));

assert.match(
  assetDiscoverySource,
  /fs\.rm\(mirrorDir,\s*\{\s*recursive:\s*true,\s*force:\s*true\s*\}\)/,
  'asset discovery must clear mirrored_assets before fetching so stale chunks cannot win module id ordering',
);
assert.doesNotMatch(
  formulaExtractSource,
  /Drill Shot Mode['"`\]]\s*!==\s*36\.8|36\.8'\)|36\.8`\)/,
  'formula extractor must not hard-code one historical Drill Shot Mode coefficient',
);
assert.equal(
  assetDiscoverySummary.fetchedAssets.some((asset) => path.isAbsolute(asset.mirrorPath ?? '')),
  false,
  'asset discovery artifacts must store repo-relative mirror paths, not one-machine absolute paths',
);
assert.equal(runtimeExports.freshness?.currentSourceLabel, 'sio-tools-live-bundle');
assert.equal(runtimeExports.freshness?.sourceUrl, 'https://sio-tools.vercel.app');
assert.equal(runtimeExports.freshness?.fullSioEquivalentChanged, false);

const drillAnchor = runtimeExports.freshness?.damageCoefficientAnchors?.drillShotMode;
assert.equal(drillAnchor?.name, 'Drill Shot Mode');
assert.equal(drillAnchor?.status, 'observed-finite');
assert.equal(drillAnchor?.value, damageCoefficients['Drill Shot Mode']);
assert.equal(typeof drillAnchor?.historicalReferenceValue, 'number');
assert.notEqual(
  drillAnchor?.historicalReferenceValue,
  drillAnchor?.value,
  'freshness audit should preserve that the live coefficient moved from the old reference',
);

assert.equal(Object.keys(deployedData.customSets ?? {}).length, 4, 'custom collection hall must expose four customSets slots');
assert.equal(Boolean(deployedData.heroes?.Nezha), true, 'Nezha must remain source-backed');
assert.equal(Boolean(deployedData.heroes?.Nita), false, 'Nita is not present in the current live source table');

console.log('sio_runtime_extract_freshness_unit_test: passed');
