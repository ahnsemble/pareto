import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(__dirname, '../components/v3/tech/techAccountContext.ts');

if (!existsSync(sourcePath)) {
  throw new Error(`tech account context missing: ${sourcePath}`);
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
const {
  DEFAULT_TECH_ACCOUNT_CONTEXT,
  buildSioLmContext,
  collectibleItemReviewMarker,
  formatPassiveCritOptionLabel,
  formatTeamworkOptionLabel,
  normalizePetAssistContext,
  petXenoStatusLabel,
  survivorContextSummary,
} = await import(moduleUrl);

assert.equal(typeof normalizePetAssistContext, 'function');
assert.equal(typeof petXenoStatusLabel, 'function');

const duplicateAssist = normalizePetAssistContext({
  ...DEFAULT_TECH_ACCOUNT_CONTEXT,
  deployedPetId: 'croaky',
  assistPet1Id: 'gary',
  assistPet2Id: 'gary',
  petAssistPets: 2,
});

assert.equal(duplicateAssist.assistPet1Id, 'gary');
assert.equal(duplicateAssist.assistPet2Id, '');
assert.equal(duplicateAssist.petAssistPets, 1);

const deployedDuplicate = normalizePetAssistContext({
  ...DEFAULT_TECH_ACCOUNT_CONTEXT,
  deployedPetId: 'croaky',
  assistPet1Id: 'croaky',
  assistPet2Id: 'capy',
  petAssistPets: 2,
});

assert.equal(deployedDuplicate.assistPet1Id, '');
assert.equal(deployedDuplicate.assistPet2Id, '');
assert.equal(deployedDuplicate.petAssistPets, 0);

assert.equal(petXenoStatusLabel({ ...DEFAULT_TECH_ACCOUNT_CONTEXT, petXeno: 0 }), 'Xeno off');
assert.equal(petXenoStatusLabel({ ...DEFAULT_TECH_ACCOUNT_CONTEXT, petXeno: 1 }), 'Xeno preview on');
assert.equal(
  petXenoStatusLabel({ ...DEFAULT_TECH_ACCOUNT_CONTEXT, petXeno: 1, petResonanceChance: 35, petResonanceAtk: 2100 }),
  'Xeno resonance ready',
);

assert.equal(formatTeamworkOptionLabel(0), '0 slots / none');
assert.equal(formatTeamworkOptionLabel(4), '4 slots / full');
assert.equal(formatPassiveCritOptionLabel(0), 'No passive crit');
assert.equal(formatPassiveCritOptionLabel(24), 'Crit +24%');
assert.match(
  survivorContextSummary({ ...DEFAULT_TECH_ACCOUNT_CONTEXT, selectedHeroId: 'king', survivorTeamwork: 4, survivorPassiveCrit: 24 }),
  /full/,
);
assert.match(
  survivorContextSummary({ ...DEFAULT_TECH_ACCOUNT_CONTEXT, selectedHeroId: 'king', survivorTeamwork: 4, survivorPassiveCrit: 24 }),
  /Crit \+24%/,
);

assert.equal(collectibleItemReviewMarker(true), 'Target');
assert.equal(collectibleItemReviewMarker(false), 'Review');

const context = buildSioLmContext({
  ...DEFAULT_TECH_ACCOUNT_CONTEXT,
  shieldDamage: 165,
  poisonedDamage: 45,
  weakenedDamage: 195,
  chilledDamage: 257.5,
  lacerationDamage: 85,
  otherworldPetSyncRate: 42.5,
});
const baseStats = context.baseStats;

assert.equal(baseStats.shieldDamage, 165);
assert.equal(baseStats.poisoned, 45);
assert.equal(baseStats.weakened, 195);
assert.equal(baseStats.chilled, 257.5);
assert.equal(baseStats.laceration, 85);
assert.equal(baseStats.xenoSyncRate, 42.5);
assert.equal(baseStats.shieldDamageUptime, 1);
assert.equal(baseStats.lacerationUptime, 1);

console.log('tech_account_context_unit_test: passed');
