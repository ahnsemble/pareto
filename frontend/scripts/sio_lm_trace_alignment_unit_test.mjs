import assert from 'node:assert/strict';

import {
  enabledSkillNamesFromBits,
  enabledSkillNamesFromTraceSkills,
  selectAlignedLmTrace,
  traceRowSignature,
} from './lib/sio_lm_trace_alignment.mjs';

const skillOrder = [
  'Energy Cube',
  'HP Bullet',
  'Exo Bracer',
  'Ammo Thruster',
  'HE Fuel',
  'Drone Mode',
  'Forcefield Mode',
  'Drill Shot Mode',
  'Rocket Mode',
  'Soccer Mode',
  'Durian Mode',
  'Lightning Mode',
  'Boomerang Mode',
  'Guardian Mode',
  'Laser Mode',
  'Brick Mode',
  'Molotov Mode',
];

const workerCase = {
  id: 'fixture_row',
  best: {
    skillBits: [1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    rowSignature: [
      {
        tech: 'energyGuidanceSystem',
        mode: 'droneMode',
        chip: 0,
        overload: 0,
        rarity: 'Eternal',
        parts: ['None', 'None', 'None'],
      },
      {
        tech: 'phaseDriver',
        mode: 'lightningMode',
        chip: 1,
        overload: 0,
        rarity: null,
        parts: ['Epic', 'None', 'None'],
      },
    ],
  },
};

const alignedTrace = {
  score: 123,
  skills: {
    'Energy Cube': true,
    'HP Bullet': true,
    'Exo Bracer': true,
    'Ammo Thruster': true,
    'HE Fuel': true,
    'Drone Mode': true,
    'Drill Shot Mode': true,
    'Lightning Mode': true,
    'Molotov Mode': true,
  },
  techs: {
    'Energy Guidance System': {
      mode: 'Drone Mode',
      chip: 0,
      overload: 0,
      rarity: 'Eternal',
      parts: ['None', 'None', 'None'],
    },
    'Phase Driver': {
      mode: 'Lightning Mode',
      chip: 1,
      overload: 0,
      parts: ['Epic', 'None', 'None'],
    },
  },
};

const higherWrongTrace = {
  score: 999,
  skills: {
    'Energy Cube': true,
    'HP Bullet': true,
    'Exo Bracer': true,
    'Ammo Thruster': true,
    'HE Fuel': true,
    'Drone Mode': true,
    'Drill Shot Mode': true,
    'Soccer Mode': true,
    'Molotov Mode': true,
  },
  techs: {
    'Energy Guidance System': {
      mode: 'Drone Mode',
      chip: 0,
      overload: 0,
      rarity: 'Eternal',
      parts: ['None', 'None', 'None'],
    },
    'Phase Driver': {
      mode: 'Boomerang Mode',
      chip: 1,
      overload: 0,
      parts: ['Epic', 'None', 'None'],
    },
  },
};

assert.deepEqual(enabledSkillNamesFromBits(workerCase.best.skillBits, skillOrder), [
  'Energy Cube',
  'HP Bullet',
  'Exo Bracer',
  'Ammo Thruster',
  'HE Fuel',
  'Drone Mode',
  'Drill Shot Mode',
  'Lightning Mode',
  'Molotov Mode',
]);

assert.deepEqual(enabledSkillNamesFromTraceSkills(alignedTrace.skills), [
  'Ammo Thruster',
  'Drill Shot Mode',
  'Drone Mode',
  'Energy Cube',
  'Exo Bracer',
  'HE Fuel',
  'HP Bullet',
  'Lightning Mode',
  'Molotov Mode',
]);

assert.deepEqual(traceRowSignature(alignedTrace.techs), workerCase.best.rowSignature);

const selected = selectAlignedLmTrace([higherWrongTrace, alignedTrace], workerCase, skillOrder);
assert.equal(selected.trace, alignedTrace);
assert.equal(selected.alignment.aligned, true);
assert.equal(selected.alignment.rowMatches, true);
assert.equal(selected.alignment.enabledSkillsMatch, true);

const fallback = selectAlignedLmTrace([higherWrongTrace], workerCase, skillOrder);
assert.equal(fallback.trace, higherWrongTrace);
assert.equal(fallback.alignment.aligned, false);
assert.equal(fallback.alignment.rowMatches, false);
assert.equal(fallback.alignment.enabledSkillsMatch, false);

console.log('sio_lm_trace_alignment_unit_test: passed');
