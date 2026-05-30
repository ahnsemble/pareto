import assert from 'node:assert/strict';

import { rebaselineWorkerSummaryFromTrace } from './lib/sio_default_golden_rebaseline.mjs';

const workerSummary = {
  generatedAt: 'old',
  summary: {
    cases: 2,
    bestMultipliers: {
      keep: 10,
      update: 20,
    },
  },
  cases: [
    {
      id: 'keep',
      best: { multiplier: 10 },
      decodedResults: [{ top: { multiplier: 10 }, rows: [{ multiplier: 10 }] }],
    },
    {
      id: 'update',
      best: { multiplier: 20 },
      decodedResults: [
        { top: { multiplier: 20 }, rows: [{ multiplier: 12 }, { multiplier: 20 }] },
        { top: { multiplier: 18 }, rows: [{ multiplier: 18 }] },
      ],
    },
  ],
};

const traceSummary = {
  cases: [
    { id: 'keep', replayedTopMultiplier: 10, tracedMultiplier: 10 },
    { id: 'update', replayedTopMultiplier: 19.5, tracedMultiplier: 19.5 },
  ],
};

const rebaselined = rebaselineWorkerSummaryFromTrace(workerSummary, traceSummary, {
  generatedAt: 'new',
  source: 'unit-test',
});

assert.equal(rebaselined.generatedAt, 'new');
assert.equal(rebaselined.summary.bestMultipliers.keep, 10);
assert.equal(rebaselined.summary.bestMultipliers.update, 19.5);
assert.equal(rebaselined.cases[0].best.multiplier, 10);
assert.equal(rebaselined.cases[1].best.multiplier, 19.5);
assert.equal(rebaselined.cases[1].decodedResults[0].top.multiplier, 19.5);
assert.equal(rebaselined.cases[1].decodedResults[0].rows[1].multiplier, 19.5);
assert.equal(rebaselined.cases[1].decodedResults[1].top.multiplier, 18);
assert.equal(rebaselined.rebaseline.source, 'unit-test');
assert.deepEqual(rebaselined.rebaseline.updatedCases, [
  {
    id: 'update',
    before: 20,
    after: 19.5,
  },
]);

console.log('sio_default_golden_rebaseline_unit_test: passed');
