import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(__dirname, '../app/lib/pareto-store/tech-profile-storage.ts');
const tmpDir = resolve(tmpdir(), 'pareto-tangtang-tech-profile-storage-tests');

if (!existsSync(modulePath)) {
  throw new Error(`tech profile storage helper missing: ${modulePath}`);
}

mkdirSync(tmpDir, { recursive: true });
const source = readFileSync(modulePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
});
const outputPath = resolve(tmpDir, `tech-profile-storage-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`);
writeFileSync(outputPath, transpiled.outputText);

const {
  TECH_PROFILE_SAVE_SLOTS,
  buildTechProfileSaveDocument,
  labelForTechProfileSaveSlot,
  loadTechProfileSlot,
  removeTechProfileSlot,
  saveTechProfileSlot,
  storageKeyForTechProfileSlot,
} = await import(pathToFileURL(outputPath));

assert.deepEqual(
  TECH_PROFILE_SAVE_SLOTS.map((slot) => slot.id),
  ['endersEcho', 'guildExpedition'],
);
assert.equal(labelForTechProfileSaveSlot('endersEcho', 'ko'), '종말의 메아리');
assert.equal(labelForTechProfileSaveSlot('guildExpedition', 'ko'), '길드원정');
assert.equal(labelForTechProfileSaveSlot('endersEcho', 'en'), "Ender's Echo");
assert.equal(labelForTechProfileSaveSlot('guildExpedition', 'en'), 'Guild Expedition');
assert.notEqual(storageKeyForTechProfileSlot('endersEcho'), storageKeyForTechProfileSlot('guildExpedition'));
assert.equal(/sio/i.test(storageKeyForTechProfileSlot('endersEcho')), false);

const sampleState = {
  accountContext: {
    finalAtk: 123456,
    skillDamage: 477,
    lmeTurf: 12,
    guildExpeditionTestaments: 600,
  },
  resourceWallet: {
    techResonanceChips: 91,
    mountCores: 4,
  },
  rarityCounts: {
    Legend: 2,
    Epic: 8,
  },
  chips: 91,
  skillSlots: 5,
  overloadable: true,
  maxOverload: 7,
  speedMode: 'precise',
  limit: 'advanced',
  skillStatus: {
    droneMode: 'locked',
    rocketMode: 'disabled',
  },
  profileImportText: 'https://sio-tools.vercel.app?code=4ZgaBw',
  importedTechSnapshot: {
    parts: [{ partName: 'Drone', modeName: 'Precision', rarity: 'Legend' }],
  },
  importedCollectibleSnapshot: {
    items: [{ itemIndex: 12, stars: 4 }],
  },
  importedRunSnapshot: {
    accountContext: { finalAtk: 123456 },
    inventory: { chips: 91 },
  },
  profileImportSummary: 'Imported calculation link',
  profileImportCoverage: [{ id: 'buildStats', label: 'Build stats', status: 'imported' }],
  profileImportDetails: [{ id: 'finalAtk', label: 'Final ATK', value: '123456', group: 'Account' }],
  result: { shouldNotBeSaved: true },
  calculationComparison: { shouldNotBeSaved: true },
};

const fixedDate = new Date('2026-05-24T09:15:00.000Z');
const document = buildTechProfileSaveDocument('endersEcho', sampleState, fixedDate);

assert.equal(document.version, 1);
assert.equal(document.slotId, 'endersEcho');
assert.equal(document.savedAt, fixedDate.toISOString());
assert.equal(document.state.activeProfileSlot, 'endersEcho');
assert.equal(document.state.accountContext.finalAtk, 123456);
assert.equal(document.state.accountContext.guildExpeditionTestaments, 600);
assert.equal(document.state.chips, 91);
assert.equal(document.state.importedRunSnapshot.activeProfileSlot, 'endersEcho');
assert.equal(document.state.importedRunSnapshot.inventory.chips, 91);
assert.equal(document.state.profileImportText ?? '', '');
assert.equal(document.state.profileImportSummary ?? '', '');
assert.deepEqual(document.state.profileImportCoverage ?? [], []);
assert.deepEqual(document.state.profileImportDetails ?? [], []);
assert.equal('result' in document.state, false);
assert.equal('calculationComparison' in document.state, false);
assert.equal(/sio-tools|profileImportText|Imported calculation link|\bSIO\b/i.test(JSON.stringify(document)), false);

const memory = new Map();
const storage = {
  getItem(key) {
    return memory.get(key) ?? null;
  },
  setItem(key, value) {
    memory.set(key, String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
};

const legacyState = {
  accountContext: { finalAtk: 222222 },
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
    accountContext: { finalAtk: 222222 },
    inventory: { chips: 0 },
  },
};
const legacyDocument = buildTechProfileSaveDocument('guildExpedition', legacyState, fixedDate);
assert.equal(legacyDocument.state.activeProfileSlot, 'guildExpedition');
assert.equal(legacyDocument.state.accountContext.guildExpeditionTestaments, 0);
assert.equal(legacyDocument.state.importedRunSnapshot.activeProfileSlot, 'guildExpedition');
assert.equal(legacyDocument.state.importedRunSnapshot.accountContext.guildExpeditionTestaments, 0);

memory.set(storageKeyForTechProfileSlot('guildExpedition'), JSON.stringify({
  version: 1,
  slotId: 'guildExpedition',
  savedAt: fixedDate.toISOString(),
  state: legacyState,
}));
const loadedLegacy = loadTechProfileSlot(storage, 'guildExpedition');
assert.equal(loadedLegacy.ok, true);
assert.equal(loadedLegacy.document.state.activeProfileSlot, 'guildExpedition');
assert.equal(loadedLegacy.document.state.accountContext.guildExpeditionTestaments, 0);
assert.equal(loadedLegacy.document.state.importedRunSnapshot.activeProfileSlot, 'guildExpedition');
memory.delete(storageKeyForTechProfileSlot('guildExpedition'));

const saveEnders = saveTechProfileSlot(storage, 'endersEcho', sampleState, fixedDate);
assert.equal(saveEnders.ok, true);
assert.equal(saveEnders.savedAt, fixedDate.toISOString());
assert.equal(memory.has(storageKeyForTechProfileSlot('endersEcho')), true);
assert.equal(memory.has(storageKeyForTechProfileSlot('guildExpedition')), false);

const guildState = {
  ...sampleState,
  accountContext: { ...sampleState.accountContext, finalAtk: 777777 },
  chips: 12,
  skillSlots: 3,
};
const saveGuild = saveTechProfileSlot(storage, 'guildExpedition', guildState, fixedDate);
assert.equal(saveGuild.ok, true);

const loadedEnders = loadTechProfileSlot(storage, 'endersEcho');
assert.equal(loadedEnders.ok, true);
assert.equal(loadedEnders.document.state.accountContext.finalAtk, 123456);
assert.equal(loadedEnders.document.state.accountContext.guildExpeditionTestaments, 600);
assert.equal(loadedEnders.document.state.chips, 91);
assert.equal(loadedEnders.document.state.profileImportText ?? '', '');
assert.equal(loadedEnders.document.state.profileImportSummary ?? '', '');
assert.deepEqual(loadedEnders.document.state.profileImportCoverage ?? [], []);
assert.deepEqual(loadedEnders.document.state.profileImportDetails ?? [], []);

const loadedGuild = loadTechProfileSlot(storage, 'guildExpedition');
assert.equal(loadedGuild.ok, true);
assert.equal(loadedGuild.document.state.accountContext.finalAtk, 777777);
assert.equal(loadedGuild.document.state.accountContext.guildExpeditionTestaments, 600);
assert.equal(loadedGuild.document.state.chips, 12);
assert.equal(loadedGuild.document.state.skillSlots, 3);

const removed = removeTechProfileSlot(storage, 'endersEcho');
assert.equal(removed.ok, true);
assert.deepEqual(loadTechProfileSlot(storage, 'endersEcho'), { ok: false, reason: 'empty' });
assert.equal(loadTechProfileSlot(storage, 'guildExpedition').ok, true);

const blockedStorage = {
  getItem() {
    throw new DOMException('localStorage blocked', 'SecurityError');
  },
  setItem() {
    throw new DOMException('localStorage blocked', 'SecurityError');
  },
  removeItem() {
    throw new DOMException('localStorage blocked', 'SecurityError');
  },
};
assert.equal(saveTechProfileSlot(blockedStorage, 'endersEcho', sampleState).ok, false);
assert.deepEqual(loadTechProfileSlot(blockedStorage, 'endersEcho'), { ok: false, reason: 'storage-unavailable' });
assert.equal(removeTechProfileSlot(blockedStorage, 'endersEcho').ok, false);

console.log(
  JSON.stringify({
    script: 'tangtang_tech_profile_storage_unit_test',
    status: 'passed',
    slots: TECH_PROFILE_SAVE_SLOTS.map((slot) => slot.id),
    hash: Buffer.from(JSON.stringify(document)).toString('base64url').slice(0, 12),
  }),
);
