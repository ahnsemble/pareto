import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(__dirname, '../app/lib/pareto-store/tech-profile-share.ts');
const storageModulePath = resolve(__dirname, '../app/lib/pareto-store/tech-profile-storage.ts');
const tmpDir = resolve(tmpdir(), 'pareto-tangtang-tech-profile-share-tests');

if (!existsSync(modulePath)) {
  throw new Error(`tech profile share helper missing: ${modulePath}`);
}
if (!existsSync(storageModulePath)) {
  throw new Error(`tech profile storage helper missing: ${storageModulePath}`);
}

mkdirSync(tmpDir, { recursive: true });
function transpile(sourcePath, outputPath) {
  const source = readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
  });
  const lzmaCompressPath = resolve(__dirname, '../node_modules/lzma/src/lzma-c-min.js');
  const lzmaDecompressPath = resolve(__dirname, '../node_modules/lzma/src/lzma-d-min.js');
  const outputText = transpiled.outputText
    .replaceAll("import('lzma/src/lzma-c-min.js')", `import(${JSON.stringify(pathToFileURL(lzmaCompressPath).href)})`)
    .replaceAll("import('lzma/src/lzma-d-min.js')", `import(${JSON.stringify(pathToFileURL(lzmaDecompressPath).href)})`)
    .replaceAll("require('lzma/src/lzma-c-min.js')", `require(${JSON.stringify(lzmaCompressPath)})`)
    .replaceAll("require('lzma/src/lzma-d-min.js')", `require(${JSON.stringify(lzmaDecompressPath)})`)
    .replaceAll("require(\"lzma/src/lzma-c-min.js\")", `require(${JSON.stringify(lzmaCompressPath)})`)
    .replaceAll("require(\"lzma/src/lzma-d-min.js\")", `require(${JSON.stringify(lzmaDecompressPath)})`);
  writeFileSync(outputPath, outputText);
}

transpile(storageModulePath, resolve(tmpDir, 'tech-profile-storage.js'));
const outputPath = resolve(tmpDir, 'tech-profile-share.js');
transpile(modulePath, outputPath);

const {
  TECH_PROFILE_SHARE_PARAM,
  buildTechProfileBackupText,
  buildCompactTechProfileShareUrl,
  buildTechProfileShareUrl,
  decodeTechProfileBackupText,
  decodeTechProfileShareState,
  decodeTechProfileShareStateAsync,
  encodeCompactTechProfileShareState,
  encodeTechProfileShareState,
  getTechProfileSharePayloadFromUrl,
} = createRequire(import.meta.url)(outputPath);

assert.equal(TECH_PROFILE_SHARE_PARAM, 'ttProfile');
assert.equal(typeof encodeTechProfileShareState, 'function');
assert.equal(typeof encodeCompactTechProfileShareState, 'function');
assert.equal(typeof decodeTechProfileShareState, 'function');
assert.equal(typeof decodeTechProfileShareStateAsync, 'function');
assert.equal(typeof buildTechProfileShareUrl, 'function');
assert.equal(typeof buildCompactTechProfileShareUrl, 'function');
assert.equal(typeof buildTechProfileBackupText, 'function');
assert.equal(typeof decodeTechProfileBackupText, 'function');
assert.equal(typeof getTechProfileSharePayloadFromUrl, 'function');

const sampleState = {
  activeProfileSlot: 'guildExpedition',
  accountContext: { finalAtk: 333333, skillDamage: 477, guildExpeditionTestaments: 600 },
  resourceWallet: { techResonanceChips: 22 },
  rarityCounts: { Legend: 1, Epic: 4 },
  chips: 22,
  skillSlots: 4,
  overloadable: true,
  maxOverload: 5,
  speedMode: 'normal',
  limit: 'basic',
  skillStatus: { droneMode: 'locked', rocketMode: 'disabled' },
  profileImportText: 'https://sio-tools.vercel.app?code=4ZgaBw',
  profileImportSummary: 'Imported calculation link',
};

const fixedDate = new Date('2026-05-24T12:00:00.000Z');
function encodeLegacySharePayload(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const legacyShareState = {
  accountContext: { finalAtk: 111111 },
  resourceWallet: {},
  rarityCounts: {},
  chips: 0,
  skillSlots: 1,
  overloadable: false,
  maxOverload: 0,
  speedMode: 'normal',
  limit: 'basic',
  skillStatus: {},
  importedRunSnapshot: {
    accountContext: { finalAtk: 111111 },
    inventory: { chips: 0 },
  },
};
const legacyShareDecoded = decodeTechProfileShareState(encodeLegacySharePayload({
  kind: 'tangtang-tech-profile-share',
  version: 1,
  document: {
    version: 1,
    slotId: 'guildExpedition',
    savedAt: fixedDate.toISOString(),
    state: legacyShareState,
  },
}));
assert.equal(legacyShareDecoded.ok, true);
assert.equal(legacyShareDecoded.document.state.activeProfileSlot, 'guildExpedition');
assert.equal(legacyShareDecoded.document.state.accountContext.guildExpeditionTestaments, 0);
assert.equal(legacyShareDecoded.document.state.importedRunSnapshot.activeProfileSlot, 'guildExpedition');

const encoded = encodeTechProfileShareState(sampleState, fixedDate);
assert.match(encoded, /^[0-9a-f]+$/);
assert.equal(/sio-tools|profileImportText|\{|\}/i.test(encoded), false);

const compactEncoded = await encodeCompactTechProfileShareState(sampleState, fixedDate);
assert.match(compactEncoded, /^lz1\.[0-9a-f]+$/);
assert.equal(/sio-tools|profileImportText|\{|\}|sio/i.test(compactEncoded), false);
assert.ok(compactEncoded.length < encoded.length, 'compact share payload must be shorter than legacy hex JSON');
assert.equal(decodeTechProfileShareState(compactEncoded).ok, false, 'sync decoder is intentionally legacy-only for compact payloads');

const decoded = decodeTechProfileShareState(encoded);
assert.equal(decoded.ok, true);
assert.equal(decoded.document.savedAt, fixedDate.toISOString());
assert.equal(decoded.document.state.accountContext.finalAtk, 333333);
assert.equal(decoded.document.state.activeProfileSlot, 'guildExpedition');
assert.equal(decoded.document.state.accountContext.guildExpeditionTestaments, 600);
assert.equal(decoded.document.state.chips, 22);
assert.equal(decoded.document.state.skillStatus.droneMode, 'locked');
assert.equal(decoded.document.state.profileImportText ?? '', '');
assert.equal(decoded.document.state.profileImportSummary ?? '', '');
assert.deepEqual(decoded.document.state.profileImportCoverage ?? [], []);
assert.deepEqual(decoded.document.state.profileImportDetails ?? [], []);
assert.equal(/sio-tools|profileImportText|Imported calculation link/i.test(JSON.stringify(decoded.document.state)), false);

const compactDecoded = await decodeTechProfileShareStateAsync(compactEncoded);
assert.equal(compactDecoded.ok, true);
assert.equal(compactDecoded.document.savedAt, fixedDate.toISOString());
assert.equal(compactDecoded.document.state.accountContext.finalAtk, 333333);
assert.equal(compactDecoded.document.state.activeProfileSlot, 'guildExpedition');
assert.equal(compactDecoded.document.state.profileImportText ?? '', '');

const shareUrl = buildTechProfileShareUrl({
  baseUrl: 'https://example.com/en/v3/optimizer/tech-parts?old=1&debug=1&raw=abc&beam=9&exact=1&ttProfile=stale#debug',
  state: sampleState,
  now: fixedDate,
});
assert.match(shareUrl, /^https:\/\/example\.com\/en\/v3\/optimizer\/tech-parts#ttProfile=/);
assert.equal(shareUrl.includes('?'), false);
assert.equal(/sio-tools|\{|\}/i.test(shareUrl), false);
const parsedShareUrl = new URL(shareUrl);
for (const key of ['old', 'debug', 'raw', 'beam', 'exact']) {
  assert.equal(parsedShareUrl.searchParams.has(key), false, `share URL must drop ${key}`);
}
assert.equal(parsedShareUrl.searchParams.getAll('ttProfile').length, 0);
assert.equal(new URLSearchParams(parsedShareUrl.hash.slice(1)).getAll('ttProfile').length, 1);

const fragmentPayload = getTechProfileSharePayloadFromUrl(shareUrl);
assert.equal(fragmentPayload, encoded);
assert.equal(decodeTechProfileShareState(fragmentPayload).ok, true);
assert.equal(
  getTechProfileSharePayloadFromUrl(`https://example.com/ko/v3/optimizer/tech-parts?ttProfile=${encoded}`),
  encoded,
);
const alternateEncoded = encodeTechProfileShareState({ ...sampleState, chips: 7 }, fixedDate);
assert.equal(
  getTechProfileSharePayloadFromUrl(`https://example.com/ko/v3/optimizer/tech-parts?ttProfile=${encoded}#ttProfile=${alternateEncoded}`),
  alternateEncoded,
  'fragment payload should take precedence over legacy query payload',
);

const compactShareUrl = await buildCompactTechProfileShareUrl({
  baseUrl: 'https://example.com/en/v3/optimizer/tech-parts?old=1&debug=1&raw=abc&beam=9&exact=1&ttProfile=stale#debug',
  state: sampleState,
  now: fixedDate,
});
assert.match(compactShareUrl, /^https:\/\/example\.com\/en\/v3\/optimizer\/tech-parts#ttProfile=lz1\./);
assert.equal(compactShareUrl.includes('?'), false);
assert.equal(/sio-tools|\{|\}|sio/i.test(compactShareUrl), false);
const compactFragmentPayload = getTechProfileSharePayloadFromUrl(compactShareUrl);
assert.equal(compactFragmentPayload, compactEncoded);
assert.equal((await decodeTechProfileShareStateAsync(compactFragmentPayload)).ok, true);
assert.ok(compactShareUrl.length < shareUrl.length, 'compact share URL must be shorter than legacy share URL');

const backupText = buildTechProfileBackupText(sampleState, fixedDate);
assert.match(backupText, /"kind": "tangtang-tech-profile-backup"/);
assert.match(backupText, /"payload": "/);
assert.equal(/sio-tools|profileImportText|beam|preselect|exact/i.test(backupText), false);

const backupDecoded = decodeTechProfileBackupText(backupText);
assert.equal(backupDecoded.ok, true);
assert.equal(backupDecoded.document.state.accountContext.skillDamage, 477);
assert.equal(backupDecoded.document.state.activeProfileSlot, 'guildExpedition');
assert.equal(backupDecoded.document.state.accountContext.guildExpeditionTestaments, 600);
assert.equal(backupDecoded.document.state.profileImportText ?? '', '');
assert.equal(backupDecoded.document.state.profileImportSummary ?? '', '');
assert.deepEqual(backupDecoded.document.state.profileImportCoverage ?? [], []);
assert.deepEqual(backupDecoded.document.state.profileImportDetails ?? [], []);
assert.equal(/sio-tools|profileImportText|Imported calculation link/i.test(JSON.stringify(backupDecoded.document.state)), false);
assert.equal(decodeTechProfileShareState('not valid').ok, false);
assert.equal(decodeTechProfileShareState(`${encoded.slice(0, -1)}g`).ok, false);
assert.equal(decodeTechProfileShareState(`${encoded}0`).ok, false);
assert.equal(decodeTechProfileBackupText('{ bad json').ok, false);
assert.equal(decodeTechProfileBackupText(JSON.stringify({ kind: 'tangtang-tech-profile-backup', version: 1, payload: encoded })).ok, false);

console.log('tangtang_tech_profile_share_unit_test: passed');
