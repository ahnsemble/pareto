import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const captureScriptPath = path.join(root, 'scripts/sio_arbitrary_compact_live_capture.mjs');
const captureScript = await fs.readFile(captureScriptPath, 'utf8');

const legacyBaseNeedle =
  'let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);';
const legacyScoreNeedle = 'return(0,_.IE)(lv),(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb)';

const currentBaseNeedle =
  'let{ceDamage:o,passivePools:s}=k({evolvePassives:ro,cooldownReduction:l,techs:e,skills:ri,collectibles:eV,upgradedCollectibles:e4,settings:e1,gameMode:eN,eeOmnipower:eH,eeSkills:eX,staticCache:e5,stableTechEntries:t?ef:void 0},rl);';
const currentScoreNeedle = 'return(0,R.IE)(ra),(0,W.f)(rl,rn,c,a,e1.calcMode,ri,s,eN)';

assert.ok(captureScript.includes(legacyBaseNeedle), 'legacy worker base stats patch needle must remain supported');
assert.ok(captureScript.includes(legacyScoreNeedle), 'legacy worker score patch needle must remain supported');
assert.ok(captureScript.includes(currentBaseNeedle), 'current worker base stats patch needle must be supported');
assert.ok(captureScript.includes(currentScoreNeedle), 'current worker score patch needle must be supported');

console.log('sio_arbitrary_compact_live_capture_patch_unit_test: passed');
