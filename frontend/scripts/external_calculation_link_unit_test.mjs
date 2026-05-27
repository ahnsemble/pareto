import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tmpDir = resolve(tmpdir(), 'pareto-external-calculation-link-tests');
const modulePath = resolve(__dirname, '../app/lib/pareto-store/external-calculation-link.ts');
const profileModulePath = resolve(__dirname, '../app/lib/pareto-store/external-calculation-profile.ts');
const profileImportModulePath = resolve(__dirname, '../app/lib/pareto-store/profile-import.ts');
const recommendationModulePath = resolve(__dirname, '../app/lib/pareto-store/tech-upgrade-recommendations.ts');
const collectionRecommendationModulePath = resolve(__dirname, '../app/lib/pareto-store/collectible-upgrade-recommendations.ts');
const schemaModulePath = resolve(__dirname, '../app/lib/pareto-store/schemas/index.ts');
const rawPath = resolve(__dirname, '../fixtures/external-calculation-links/4ZgaBw.raw.txt');
const expectedPath = resolve(__dirname, '../fixtures/external-calculation-links/4ZgaBw.expected.json');

function loadTsModule(sourcePath, outputName) {
  if (!existsSync(sourcePath)) {
    throw new Error(`module missing: ${sourcePath}`);
  }
  mkdirSync(tmpDir, { recursive: true });
  const source = readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
  });
  const lzmaUrl = pathToFileURL(resolve(__dirname, '../node_modules/lzma/src/lzma-d-min.js')).href;
  const outputText = transpiled.outputText.replaceAll(
    "import('lzma/src/lzma-d-min.js')",
    `import(${JSON.stringify(lzmaUrl)})`,
  );
  const outputPath = resolve(tmpDir, `${outputName}-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`);
  writeFileSync(outputPath, outputText);
  return import(pathToFileURL(outputPath));
}

function writeCjsModule(sourcePath, outputPath) {
  if (!existsSync(sourcePath)) {
    throw new Error(`module missing: ${sourcePath}`);
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  const source = readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  });
  writeFileSync(outputPath, transpiled.outputText);
}

function loadRecommendationModule() {
  writeCjsModule(schemaModulePath, resolve(tmpDir, 'schemas/index.js'));
  writeCjsModule(collectionRecommendationModulePath, resolve(tmpDir, 'collectible-upgrade-recommendations.js'));
  writeCjsModule(recommendationModulePath, resolve(tmpDir, 'tech-upgrade-recommendations.js'));
  return require(resolve(tmpDir, 'tech-upgrade-recommendations.js'));
}

const { decodeExternalCalculationRaw, parseExternalCalculationInput, resolveExternalCalculationCode } = await loadTsModule(
  modulePath,
  'external-calculation-link',
);

const raw = readFileSync(rawPath, 'utf8').trim();
const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));

assert.equal(raw.length, expected.rawLength);

const decoded = await decodeExternalCalculationRaw(raw);

assert.equal(decoded._V, expected.decodedVersion);
for (const key of ['a', 'h', 'i', 'j', 'm', 'bi', 'bJ', 'X', '&']) {
  assert.ok(Object.hasOwn(decoded, key), `missing compact key ${key}`);
}

const parsedRaw = parseExternalCalculationInput(`https://sio-tools.vercel.app?raw=${raw}`);
assert.equal(parsedRaw.kind, 'raw');
assert.equal(parsedRaw.raw, raw);

const parsedCode = parseExternalCalculationInput('https://sio-tools.vercel.app?code=4ZgaBw');
assert.equal(parsedCode.kind, 'code');
assert.equal(parsedCode.code, '4ZgaBw');

const rawFromCode = await resolveExternalCalculationCode('4ZgaBw', async (url) => {
  assert.match(url, /is\.gd\/forward\.php/);
  return {
    ok: true,
    json: async () => ({ url: `https://sio-tools.vercel.app?raw=${raw}` }),
  };
});
assert.equal(rawFromCode, raw);

let retryAttempts = 0;
const rawAfterRetry = await resolveExternalCalculationCode('4ZgaBw', async () => {
  retryAttempts += 1;
  if (retryAttempts === 1) {
    return {
      ok: false,
      json: async () => ({}),
    };
  }
  return {
    ok: true,
    json: async () => ({ url: `https://sio-tools.vercel.app?raw=${raw}` }),
  };
});
assert.equal(rawAfterRetry, raw);
assert.equal(retryAttempts, 2);

const { normalizeExternalCalculationProfile } = await loadTsModule(
  profileModulePath,
  'external-calculation-profile',
);
const normalized = normalizeExternalCalculationProfile(decoded);

assert.equal(normalized.ok, true);
assert.ok(normalized.tech.chips >= 0);
assert.ok(normalized.account.finalAtk > 0);
assert.ok(normalized.account.baseAtk > 0);
assert.ok(normalized.importedTechSnapshot.parts.length >= 6);
assert.ok(normalized.importedCollectibleSnapshot.items.length > 0);
assert.match(normalized.summary, /Imported/);
assert.equal(JSON.stringify(normalized).includes('sioLm'), false);
assert.equal(normalized.sourceGameMode, 'ee');

const { resolveImportedProfileSlot } = await loadTsModule(
  profileImportModulePath,
  'profile-import',
);
assert.equal(typeof resolveImportedProfileSlot, 'function');
assert.equal(resolveImportedProfileSlot('endersEcho', normalized), 'endersEcho');

const endersNormalized = normalizeExternalCalculationProfile({
  _V: 5,
  a: {
    I: 'ee',
    J: 86500,
  },
});
assert.equal(endersNormalized.ok, true);
assert.equal(endersNormalized.sourceGameMode, 'ee');
assert.equal(endersNormalized.account.guildExpeditionTestaments, 86500);
assert.equal(resolveImportedProfileSlot('endersEcho', endersNormalized), 'endersEcho');

const lme1Normalized = normalizeExternalCalculationProfile({
  _V: 5,
  a: {
    I: 'lme1',
    J: 86500,
  },
});
assert.equal(lme1Normalized.ok, true);
assert.equal(lme1Normalized.sourceGameMode, 'lme1');
assert.equal(lme1Normalized.account.guildExpeditionTestaments, 86500);
assert.equal(resolveImportedProfileSlot('endersEcho', lme1Normalized), 'endersEcho');

const guildNormalized = normalizeExternalCalculationProfile({
  _V: 5,
  a: {
    I: 'lme2',
    J: 600,
  },
});
assert.equal(guildNormalized.ok, true);
assert.equal(guildNormalized.sourceGameMode, 'lme2');
assert.equal(guildNormalized.account.guildExpeditionTestaments, 600);
assert.equal(resolveImportedProfileSlot('endersEcho', guildNormalized), 'guildExpedition');

const { buildTechUpgradeRecommendations } = loadRecommendationModule();
const recommendations = buildTechUpgradeRecommendations({
  result: {
    builds: [{
      score: 123,
      damageFactor: 456,
      config: {
        loadout: [
          { part: 'energyGuidanceSystem', mode: 'droneMode', sio: { chip: 24, overload: 3 } },
          { part: 'quantumNanobot', mode: 'durianMode', sio: { chip: 12, overload: 0 } },
        ],
      },
    }],
  },
  importedTechSnapshot: {
    parts: [{ partName: 'Energy Guidance System', modeName: 'Drone Mode', resonance: 3000, overload: 0, deployed: true }],
  },
  chipRemainder: 8,
});

assert.ok(recommendations.length > 0);
assert.match(recommendations[0].title, /Upgrade|Allocate|Tune/);
assert.equal(JSON.stringify(recommendations).includes('energyGuidanceSystem'), false);

console.log(
  JSON.stringify({
    script: 'external_calculation_link_unit_test',
    status: 'passed',
    rawLength: raw.length,
    compactVersion: decoded._V,
    decodedBytesHashPrefix: Buffer.from(JSON.stringify(decoded)).toString('base64url').slice(0, 12),
  }),
);
