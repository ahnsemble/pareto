import assert from 'node:assert/strict';

import { evaluateGeneratedOptimizerCase } from './lib/sio_generated_optimizer_gate_checks.mjs';

const baseCase = {
  fullRowMatches: true,
  activeSkillsMatch: true,
  chipMatches: true,
  partsMatch: true,
  overloadMatches: true,
  scorerMatches: true,
  fullFlagMatches: true,
};

const staleTraceLiveGreen = evaluateGeneratedOptimizerCase({
  ...baseCase,
  actualMultiplier: 100,
  liveExpectedMultiplier: 100,
  traceCase: {
    tracedMultiplier: 125,
    replayedTopMultiplier: 125,
  },
  tolerance: 1e-9,
});

assert.equal(staleTraceLiveGreen.pass, true);
assert.equal(staleTraceLiveGreen.liveMultiplierMatches, true);
assert.equal(staleTraceLiveGreen.traceAlignmentAvailable, false);
assert.equal(staleTraceLiveGreen.traceMultiplierMatches, false);
assert.equal(staleTraceLiveGreen.traceMultiplierStatus, 'unavailable-no-aligned-trace');
assert.equal(staleTraceLiveGreen.primaryMultiplierSource, 'live-worker');

const alignedTraceMismatch = evaluateGeneratedOptimizerCase({
  ...baseCase,
  actualMultiplier: 100,
  liveExpectedMultiplier: 90,
  traceCase: {
    tracedMultiplier: 100,
    traceAlignment: { aligned: true },
  },
  tolerance: 1e-9,
});

assert.equal(alignedTraceMismatch.pass, false);
assert.equal(alignedTraceMismatch.liveMultiplierMatches, false);
assert.equal(alignedTraceMismatch.traceAlignmentAvailable, true);
assert.equal(alignedTraceMismatch.traceMultiplierMatches, true);
assert.equal(alignedTraceMismatch.traceMultiplierStatus, 'aligned-match');
assert.equal(alignedTraceMismatch.legacyTraceFirstMultiplierMatches, true);

const structuralRed = evaluateGeneratedOptimizerCase({
  ...baseCase,
  fullRowMatches: false,
  actualMultiplier: 100,
  liveExpectedMultiplier: 100,
  traceCase: {},
  tolerance: 1e-9,
});

assert.equal(structuralRed.pass, false);
assert.equal(structuralRed.structuralMatches, false);
assert.equal(structuralRed.liveMultiplierMatches, true);

console.log('sio_generated_optimizer_parity_gate_unit_test: passed');
