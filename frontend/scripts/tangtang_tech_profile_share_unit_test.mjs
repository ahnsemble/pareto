import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  writeFileSync(outputPath, transpiled.outputText);
}

transpile(storageModulePath, resolve(tmpDir, 'tech-profile-storage.js'));
const outputPath = resolve(tmpDir, 'tech-profile-share.js');
transpile(modulePath, outputPath);

const {
  TECH_PROFILE_SHARE_PARAM,
  buildTechProfileBackupText,
  buildTechProfileShareUrl,
  decodeTechProfileBackupText,
  decodeTechProfileShareState,
  encodeTechProfileShareState,
} = createRequire(import.meta.url)(outputPath);

assert.equal(TECH_PROFILE_SHARE_PARAM, 'ttProfile');
assert.equal(typeof encodeTechProfileShareState, 'function');
assert.equal(typeof decodeTechProfileShareState, 'function');
assert.equal(typeof buildTechProfileShareUrl, 'function');
assert.equal(typeof buildTechProfileBackupText, 'function');
assert.equal(typeof decodeTechProfileBackupText, 'function');

const sampleState = {
  accountContext: { finalAtk: 333333, skillDamage: 477 },
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
const encoded = encodeTechProfileShareState(sampleState, fixedDate);
assert.match(encoded, /^[A-Za-z0-9_-]+$/);
assert.equal(/sio-tools|profileImportText|\{|\}/i.test(encoded), false);

const decoded = decodeTechProfileShareState(encoded);
assert.equal(decoded.ok, true);
assert.equal(decoded.document.savedAt, fixedDate.toISOString());
assert.equal(decoded.document.state.accountContext.finalAtk, 333333);
assert.equal(decoded.document.state.chips, 22);
assert.equal(decoded.document.state.skillStatus.droneMode, 'locked');

const shareUrl = buildTechProfileShareUrl({
  baseUrl: 'https://example.com/en/v3/optimizer/tech-parts?old=1#debug',
  state: sampleState,
  now: fixedDate,
});
assert.match(shareUrl, /^https:\/\/example\.com\/en\/v3\/optimizer\/tech-parts\?old=1&ttProfile=/);
assert.equal(shareUrl.includes('#'), false);
assert.equal(/sio-tools|\{|\}/i.test(shareUrl), false);

const backupText = buildTechProfileBackupText(sampleState, fixedDate);
assert.match(backupText, /"kind": "tangtang-tech-profile-backup"/);
assert.match(backupText, /"payload": "/);
assert.equal(/sio-tools|profileImportText/i.test(backupText), false);

const backupDecoded = decodeTechProfileBackupText(backupText);
assert.equal(backupDecoded.ok, true);
assert.equal(backupDecoded.document.state.accountContext.skillDamage, 477);
assert.equal(decodeTechProfileShareState('not valid').ok, false);
assert.equal(decodeTechProfileBackupText('{ bad json').ok, false);

console.log('tangtang_tech_profile_share_unit_test: passed');
