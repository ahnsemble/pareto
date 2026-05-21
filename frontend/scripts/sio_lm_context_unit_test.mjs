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

process.env.SIO_LM_COMPACT_ONLY = '1';
const playerState = applySioLmContext({}, workerCase, traceCase);
delete process.env.SIO_LM_COMPACT_ONLY;

assert.deepEqual(playerState.sioLm, {
  compactConfig: {
    a: { I: 'lme2' },
    p: [1],
  },
});

console.log('sio_lm_context_unit_test passed');
