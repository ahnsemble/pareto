import assert from 'node:assert/strict';

import { applySioLmContext } from './lib/sio_lm_context.mjs';

const workerCase = {
  best: { requestIndex: 0 },
  skillsRequests: [
    {
      configString: JSON.stringify({
        _R: 'fingerprint',
        a: { I: 'lme2' },
        p: [1],
      }),
    },
  ],
};
const traceCase = {
  baseStats: { skillDamage: 123 },
  enabledSkills: ['Laser Mode'],
  attackMeta: { atkBase: 1, atkFinal: 2 },
  calcMode: 'damage',
  gameMode: 'lme2',
};

const defaultPlayerState = applySioLmContext({}, workerCase, traceCase);

assert.deepEqual(defaultPlayerState.sioLm, {
  compactConfig: {
    a: { I: 'lme2' },
    p: [1],
  },
});

process.env.SIO_LM_LEGACY_EXPLICIT_CONTEXT = '1';
const legacyPlayerState = applySioLmContext({}, workerCase, traceCase);
delete process.env.SIO_LM_LEGACY_EXPLICIT_CONTEXT;

assert.deepEqual(legacyPlayerState.sioLm.baseStats, traceCase.baseStats);
assert.deepEqual(legacyPlayerState.sioLm.enabledSkills, traceCase.enabledSkills);
assert.equal(legacyPlayerState.sioLm.gameMode, 'lme2');

console.log('sio_lm_context_unit_test passed');
