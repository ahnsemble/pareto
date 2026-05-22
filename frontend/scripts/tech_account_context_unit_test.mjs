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
const { DEFAULT_TECH_ACCOUNT_CONTEXT, buildSioLmContext } = await import(moduleUrl);

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
