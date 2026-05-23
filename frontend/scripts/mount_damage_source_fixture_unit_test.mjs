import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const deployedDataPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json');
const coefficientsPath = path.join(root, 'artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module32085_mg_damage_coefficients.json');
const artifactPath = path.join(root, 'artifacts/td11/mount_damage_source_fixture.json');

const deployedData = JSON.parse(await fs.readFile(deployedDataPath, 'utf8'));
const coefficients = JSON.parse(await fs.readFile(coefficientsPath, 'utf8'));

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

const rows = Object.entries(deployedData.mounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([mountName, mount]) => {
    const mgCoefficient = coefficients[mountName];
    assert.equal(typeof mgCoefficient, 'number', `${mountName} coefficient must exist`);
    const mountDamageByStars = Object.fromEntries(
      Object.entries(mount.damage)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([stars, damage]) => [stars, Number((damage * mgCoefficient).toFixed(6))]),
    );
    const nonZeroStars = Object.entries(mountDamageByStars)
      .filter(([, damage]) => damage !== 0)
      .map(([stars]) => Number(stars));
    return {
      key: `mount:${idFromName(mountName)}`,
      mountName,
      rarity: mount.rarity,
      sourceKeys: {
        deployedData: 'module37013_c_deployed_data_table.json.mounts',
        damageCoefficient: 'module32085_mg_damage_coefficients.json',
      },
      lineThresholds: mount.lines.nums.map((threshold, index) => ({
        threshold,
        stats: stableObject(mount.lines.vals[index]),
      })),
      baseDamageByStars: stableObject(mount.damage),
      mgCoefficient,
      mountDamageLine: `${mountName}: mountDamage = damageByStars[stars] * ${mgCoefficient}`,
      mountDamageByStars,
      nonZeroStars,
      rustStatChannel: 'mountDamage',
      multiplierStage: 'CE damage contribution via ceDamage.mount after active mount source transform',
      liveEvidence: 'not live-captured in current arbitrary compact mount fixtures',
      confidence: 'sio-source-only',
      nextAction: nonZeroStars.length > 0
        ? 'capture active-mount live fixture and compare ceDamage.mount against this source fixture'
        : 'keep as zero-coefficient source row unless source changes',
    };
  });

const artifact = {
  generatedAtKst: '2026-05-23',
  status: 'MOUNT-DAMAGE-SOURCE-FIXTURE-V0',
  summary: {
    totalRows: rows.length,
    sourceBackedRows: rows.filter((row) => row.confidence === 'sio-source-only').length,
    nonZeroMountDamageRows: rows.filter((row) => row.nonZeroStars.length > 0).length,
    liveVerifiedRows: 0,
  },
  rows,
};

assert.equal(artifact.summary.totalRows, 3, 'all three source mounts must be represented');
assert.deepEqual(rows.map((row) => row.mountName), ['Doomsteed', 'Electric Scooter', 'Tech Hoverboard']);
assert.equal(rows.find((row) => row.mountName === 'Doomsteed').mgCoefficient, 0);
assert.equal(rows.find((row) => row.mountName === 'Electric Scooter').mountDamageByStars['8'], 17710);
assert.equal(rows.find((row) => row.mountName === 'Tech Hoverboard').mountDamageByStars['8'], 50000);
assert.equal(artifact.summary.nonZeroMountDamageRows, 2);
assert.ok(rows.every((row) => row.confidence === 'sio-source-only'));
assert.ok(rows.every((row) => row.liveEvidence === 'not live-captured in current arbitrary compact mount fixtures'));

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

if (writeMode) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, serialized);
  console.log(`mount_damage_source_fixture_unit_test: wrote ${artifactPath} (${rows.length} rows)`);
} else {
  const existing = await fs.readFile(artifactPath, 'utf8');
  assert.equal(existing, serialized, 'mount damage source fixture is stale; run with --write');
  console.log(`mount_damage_source_fixture_unit_test: passed (${rows.length} rows)`);
}
