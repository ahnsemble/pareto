import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  applyWorkerCapturePatch,
  describeWorkerLmPatchFailure,
  selectWorkerLmPatchSet,
  workerLmPatchSets,
} from './lib/sio_arbitrary_compact_live_capture_patch.mjs';

const root = process.cwd();
const captureScriptPath = path.join(root, 'scripts/sio_arbitrary_compact_live_capture.mjs');
const captureScript = await fs.readFile(captureScriptPath, 'utf8');

const legacyBaseNeedle =
  'let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);';
const legacyScoreNeedle = 'return(0,_.IE)(lv),(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb)';

const currentBaseNeedle =
  'let{ceDamage:o,passivePools:s}=k({evolvePassives:ro,cooldownReduction:l,techs:e,skills:ri,collectibles:eV,upgradedCollectibles:e4,settings:e1,gameMode:eN,eeOmnipower:eH,eeSkills:eX,staticCache:e5,stableTechEntries:t?ef:void 0},rl);';
const currentScoreNeedle = 'return(0,R.IE)(ra),(0,W.f)(rl,rn,c,a,e1.calcMode,ri,s,eN)';

assert.ok(
  captureScript.includes('applyWorkerCapturePatch'),
  'live capture script must apply patching through the shared helper',
);
assert.ok(
  workerLmPatchSets.some((item) => item.baseNeedle === legacyBaseNeedle),
  'legacy worker base stats patch needle must remain supported',
);
assert.ok(
  workerLmPatchSets.some((item) => item.scoreNeedle === legacyScoreNeedle),
  'legacy worker score patch needle must remain supported',
);
assert.ok(
  workerLmPatchSets.some((item) => item.baseNeedle === currentBaseNeedle),
  'current worker base stats patch needle must be supported',
);
assert.ok(
  workerLmPatchSets.some((item) => item.scoreNeedle === currentScoreNeedle),
  'current worker score patch needle must be supported',
);

assert.ok(workerLmPatchSets.length >= 3, 'worker capture patch must preserve all known worker variants');

const currentPatchSet = selectWorkerLmPatchSet(`${currentBaseNeedle}\n${currentScoreNeedle}`);
assert.equal(currentPatchSet?.name, 'current-2026-05-worker');

const patchedWorker = applyWorkerCapturePatch(
  `${currentBaseNeedle}\n${currentScoreNeedle}\n_N_E=r.x()`,
);
assert.ok(patchedWorker.includes('__baseStatsBeforeTech'));
assert.ok(patchedWorker.includes('self.__bestLmTrace'));
assert.ok(patchedWorker.includes('self.__webpack_ready__=r.x()'));

const failureDetails = describeWorkerLmPatchFailure(`${currentBaseNeedle}\nreturn staleWorkerScore()`);
assert.ok(failureDetails.includes('current-2026-05-worker'));
assert.ok(failureDetails.includes('baseNeedle=true'));
assert.ok(failureDetails.includes('scoreNeedle=false'));

console.log('sio_arbitrary_compact_live_capture_patch_unit_test: passed');
