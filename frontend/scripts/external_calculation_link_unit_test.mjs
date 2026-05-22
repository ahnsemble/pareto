import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = resolve(tmpdir(), 'pareto-external-calculation-link-tests');
const modulePath = resolve(__dirname, '../app/lib/pareto-store/external-calculation-link.ts');
const profileModulePath = resolve(__dirname, '../app/lib/pareto-store/external-calculation-profile.ts');
const recommendationModulePath = resolve(__dirname, '../app/lib/pareto-store/tech-upgrade-recommendations.ts');
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
assert.match(normalized.summary, /Imported/);
assert.equal(JSON.stringify(normalized).includes('sioLm'), false);

const { buildTechUpgradeRecommendations } = await loadTsModule(
  recommendationModulePath,
  'tech-upgrade-recommendations',
);
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
