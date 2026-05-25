import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(__dirname, '../components/v3/tech/techAccountContext.ts');
const localeCopySourcePath = resolve(__dirname, '../components/v3/tech/techLocaleCopy.ts');

if (!existsSync(sourcePath)) {
  throw new Error(`tech account context missing: ${sourcePath}`);
}
if (!existsSync(localeCopySourcePath)) {
  throw new Error(`tech locale copy missing: ${localeCopySourcePath}`);
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
  buildTechCalculationContext,
  collectibleItemReviewMarker,
  formatPassiveCritOptionLabel,
  formatTeamworkOptionLabel,
  lmeTurfPresetLabel,
  mountReviewSummary,
  normalizePetAssistContext,
  petXenoStatusLabel,
  survivorContextSummary,
} = await import(moduleUrl);

const localeCopySource = readFileSync(localeCopySourcePath, 'utf8');
const localeCopyTranspiled = ts.transpileModule(localeCopySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
});
const localeCopyModuleUrl = `data:text/javascript;base64,${Buffer.from(localeCopyTranspiled.outputText).toString('base64')}`;
const {
  getTechOptimizerCopy,
  localizeTechInventoryMessage,
  localizeTechResourceWalletFields,
} = await import(localeCopyModuleUrl);

assert.equal(typeof normalizePetAssistContext, 'function');
assert.equal(typeof petXenoStatusLabel, 'function');
assert.equal(typeof getTechOptimizerCopy, 'function');
assert.equal(typeof localizeTechResourceWalletFields, 'function');
assert.equal(typeof localizeTechInventoryMessage, 'function');

const koCopy = getTechOptimizerCopy('ko');
assert.equal(koCopy.titleSuffix, '테크 파츠');
assert.equal(koCopy.profileImport.title, 'Tangtang 프로필 가져오기');
assert.equal(koCopy.profileImport.action, '프로필 가져오기');
assert.equal(koCopy.profileSave.title, '저장 프로필');
assert.equal(koCopy.profileSave.save, '저장');
assert.equal(koCopy.profileSave.load, '불러오기');
assert.equal(koCopy.profileSave.delete, '삭제');
assert.equal(koCopy.resourceWallet.title, '리소스 지갑');
assert.equal(koCopy.inventory.title, '보유 테크 재료');
assert.equal(koCopy.results.title, '랭킹 테크 빌드');
assert.equal(koCopy.results.comparison.title, '계산 비교');
assert.equal(koCopy.results.comparison.imported, '가져온 계산');
assert.equal(koCopy.results.comparison.tangtang, 'Tangtang 계산');
assert.equal(koCopy.results.comparison.delta, '차이');
assert.equal(koCopy.results.comparison.unchanged, '변화 없음');
assert.equal(getTechOptimizerCopy('en').results.comparison.imported, 'Imported calculation');
assert.equal(getTechOptimizerCopy('en').results.comparison.tangtang, 'Tangtang calculation');
assert.equal(getTechOptimizerCopy('en').profileSave.title, 'Saved profiles');
assert.equal(getTechOptimizerCopy('en').profileSave.load, 'Load');
assert.equal(localizeTechInventoryMessage('chips.gt_999', 'ko'), '기술 공명 칩은 999 이하여야 합니다');
assert.equal(localizeTechInventoryMessage('chips.gt_999', 'en'), 'Tech resonance chips must be 999 or lower');

const koWalletFields = localizeTechResourceWalletFields('ko');
assert.equal(koWalletFields[0].label, '기술 공명 칩');
assert.equal(koWalletFields[0].scopeLabel, '테크 최적화 지출');
assert.equal(koWalletFields[1].scopeLabel, '계정 컨텍스트');

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

assert.equal(
  mountReviewSummary({ ...DEFAULT_TECH_ACCOUNT_CONTEXT, mountPuzzleSlots: 12, mountCores: 9 }),
  'Puzzle slots 12 / Mount cores 9 / Review-only puzzle rows',
);

assert.equal(lmeTurfPresetLabel(0), '0 nodes');
assert.equal(lmeTurfPresetLabel(12), '12 nodes');

const context = buildTechCalculationContext({
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
