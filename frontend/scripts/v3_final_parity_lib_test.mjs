import assert from 'node:assert/strict';
import {
  classifyDiff,
  computeDiffPct,
  parseFirstNumber,
  parseSioResultFromText,
  summarizeSamples,
} from './v3_final_parity_lib.mjs';

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${passed}: ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL: ${name}`);
    console.error(error?.stack ?? error);
  }
}

await check('parseFirstNumber handles grouped and decimal values', () => {
  assert.equal(parseFirstNumber('52,824,072,351.46'), 52824072351.46);
});

await check('parseSioResultFromText reads the number after the calc mode labels', () => {
  const result = parseSioResultFromText('Calculation based on\nmultiplier\ndamage\n52,824,072,351.46\nAtk Bonus');
  assert.deepEqual(result, { text: '52,824,072,351.46', value: 52824072351.46 });
});

await check('computeDiffPct uses absolute delta over sIO value', () => {
  assert.equal(computeDiffPct(99, 100), 1);
});

await check('computeDiffPct rejects zero sIO baselines', () => {
  assert.equal(computeDiffPct(99, 0), null);
});

await check('classifyDiff passes values at or below the hard gate', () => {
  assert.equal(classifyDiff(0.5), 'PASS');
});

await check('classifyDiff stops values above the hard gate', () => {
  assert.equal(classifyDiff(0.5000001), 'STOP');
});

await check('summarizeSamples returns avg p50 p95 and max from sorted copy', () => {
  assert.deepEqual(summarizeSamples([5, 1, 3, 2, 4]), {
    iterations: 5,
    avg_ms: 3,
    p50_ms: 3,
    p95_ms: 5,
    max_ms: 5,
  });
});

if (failures.length > 0) {
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\n${passed} final parity helper checks passed`);
