import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(__dirname, '../app/lib/pareto-store/profile-import.ts');

if (!existsSync(sourcePath)) {
  throw new Error(`profile import parser missing: ${sourcePath}`);
}

const source = readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
const { parseProductProfileImport } = await import(moduleUrl);

assert.equal(typeof parseProductProfileImport, 'function');

const payload = {
  wallet: { techResonanceChips: 77, relicArtifactCores: 4 },
  tech: { skillSlots: 5, rarityCounts: { Legend: 2, Epic: 8 } },
  account: { baseAtk: 7200, finalAtk: 125000 },
  sioLm: { shouldNotLeak: true },
};

const result = parseProductProfileImport(JSON.stringify(payload));

assert.equal(result.ok, true);
assert.equal(result.wallet.techResonanceChips, 77);
assert.equal(result.wallet.relicArtifactCores, 4);
assert.equal(result.tech.chips, 77);
assert.equal(result.tech.skillSlots, 5);
assert.equal(result.tech.rarityCounts.Legend, 2);
assert.equal(result.tech.rarityCounts.Epic, 8);
assert.equal(result.account.baseAtk, 7200);
assert.equal(result.account.finalAtk, 125000);
assert.equal(Object.hasOwn(result, 'sioLm'), false);
assert.match(result.summary, /Imported wallet/);
assert.match(result.summary, /Imported tech inventory/);
assert.match(result.summary, /Imported account context/);

const nestedResult = parseProductProfileImport(JSON.stringify({ profile: payload }));

assert.equal(nestedResult.ok, true);
assert.equal(nestedResult.wallet.techResonanceChips, 77);

const invalidResult = parseProductProfileImport('{not json');

assert.equal(invalidResult.ok, false);
assert.match(invalidResult.error, /Invalid JSON/);

const aliasResult = parseProductProfileImport(JSON.stringify({
  state: {
    damage: {
      base_attack: 8100,
      final_attack: 130000,
    },
    tech: {
      chips_available: 66,
    },
    equipment: {
      weapon: {
        astral_forge_eaf_level: 4,
      },
    },
  },
}));

assert.equal(aliasResult.ok, true);
assert.equal(aliasResult.account.baseAtk, 8100);
assert.equal(aliasResult.account.finalAtk, 130000);
assert.equal(aliasResult.tech.chips, 66);
assert.equal(aliasResult.account.weaponEaf, 4);

const flatAliasResult = parseProductProfileImport(JSON.stringify({
  base_atk: 8200,
  final_atk: 131000,
  availableChips: 67,
  weapon_eaf: 5,
}));

assert.equal(flatAliasResult.ok, true);
assert.equal(flatAliasResult.account.baseAtk, 8200);
assert.equal(flatAliasResult.account.finalAtk, 131000);
assert.equal(flatAliasResult.tech.chips, 67);
assert.equal(flatAliasResult.account.weaponEaf, 5);

const namedAliasResult = parseProductProfileImport(JSON.stringify({
  state: {
    hero: { selected_hero_id: 'king' },
    collectible: { target_collectible_id: 'atomicMech' },
    pet: {
      deployed_pet_id: 'croaky',
      assist_pet_1_id: 'gary',
      assist_pet_2_id: 'capy',
    },
    mount: { selected_mount_id: 'electricScooter' },
    equipment: {
      weapon: { item_id: 'twinLance' },
      necklace: { item_id: 'voidwakerEmblem' },
      boots: { item_id: 'voidwakerTreads' },
    },
  },
}));

assert.equal(namedAliasResult.ok, true);
assert.equal(namedAliasResult.account.selectedHeroId, 'king');
assert.equal(namedAliasResult.account.targetCollectibleId, 'atomicMech');
assert.equal(namedAliasResult.account.deployedPetId, 'croaky');
assert.equal(namedAliasResult.account.assistPet1Id, 'gary');
assert.equal(namedAliasResult.account.assistPet2Id, 'capy');
assert.equal(namedAliasResult.account.selectedMountId, 'electricScooter');
assert.equal(namedAliasResult.account.weaponItemId, 'twinLance');
assert.equal(namedAliasResult.account.necklaceItemId, 'voidwakerEmblem');
assert.equal(namedAliasResult.account.bootsItemId, 'voidwakerTreads');

console.log('profile_import_unit_test: passed');
