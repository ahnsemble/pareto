export const workerLmPatchSets = [
  {
    name: 'legacy-2026-05-worker',
    baseNeedle:
      'let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);',
    baseReplacement:
      'let __baseStatsBeforeTech={...la};let{ceDamage:o,passivePools:n}=E({evolvePassives:li,cooldownReduction:r,techs:e,skills:lh,collectibles:eO,upgradedCollectibles:e7,settings:e5,gameMode:eb,eeOmnipower:eA,eeSkills:eL,staticCache:e8,stableTechEntries:t?V:void 0},la);',
    scoreNeedle: 'return(0,_.IE)(lv),(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb)',
    scoreReplacement:
      'return(()=>{(0,_.IE)(lv);let __score=(0,H.f)(la,lu,a,i,e5.calcMode,lh,n,eb);if(__score>((self.__bestLmTrace&&self.__bestLmTrace.score)||0))self.__bestLmTrace={score:__score,mask:l,calcMode:e5.calcMode,gameMode:eb,attackMeta:{...lu},damageFactor:a,ceDamage:i,baseStats:{...__baseStatsBeforeTech},stats:{...la},skills:{...lh},techs:JSON.parse(JSON.stringify(e)),passivePools:Array.from(n||[])};return __score})()',
  },
  {
    name: 'current-2026-05-worker',
    baseNeedle:
      'let{ceDamage:o,passivePools:s}=k({evolvePassives:ro,cooldownReduction:l,techs:e,skills:ri,collectibles:eV,upgradedCollectibles:e4,settings:e1,gameMode:eN,eeOmnipower:eH,eeSkills:eX,staticCache:e5,stableTechEntries:t?ef:void 0},rl);',
    baseReplacement:
      'let __baseStatsBeforeTech={...rl};let{ceDamage:o,passivePools:s}=k({evolvePassives:ro,cooldownReduction:l,techs:e,skills:ri,collectibles:eV,upgradedCollectibles:e4,settings:e1,gameMode:eN,eeOmnipower:eH,eeSkills:eX,staticCache:e5,stableTechEntries:t?ef:void 0},rl);',
    scoreNeedle: 'return(0,R.IE)(ra),(0,W.f)(rl,rn,c,a,e1.calcMode,ri,s,eN)',
    scoreReplacement:
      'return(()=>{(0,R.IE)(ra);let __score=(0,W.f)(rl,rn,c,a,e1.calcMode,ri,s,eN);if(__score>((self.__bestLmTrace&&self.__bestLmTrace.score)||0))self.__bestLmTrace={score:__score,mask:r,calcMode:e1.calcMode,gameMode:eN,attackMeta:{...rn},damageFactor:c,ceDamage:a,baseStats:{...__baseStatsBeforeTech},stats:{...rl},skills:{...ri},techs:JSON.parse(JSON.stringify(e)),passivePools:Array.from(s||[])};return __score})()',
  },
  {
    name: 'current-2026-05-worker-alt',
    baseNeedle:
      'let{ceDamage:o,passivePools:n}=D({evolvePassives:ts,cooldownReduction:l,techs:e,skills:td,collectibles:eV,upgradedCollectibles:e6,settings:e3,gameMode:eP,eeOmnipower:eI,eeSkills:eG,staticCache:e7,stableTechEntries:r?ep:void 0},tn);',
    baseReplacement:
      'let __baseStatsBeforeTech={...tn};let{ceDamage:o,passivePools:n}=D({evolvePassives:ts,cooldownReduction:l,techs:e,skills:td,collectibles:eV,upgradedCollectibles:e6,settings:e3,gameMode:eP,eeOmnipower:eI,eeSkills:eG,staticCache:e7,stableTechEntries:r?ep:void 0},tn);',
    scoreNeedle: 'return(0,N.IE)(tu),(0,W.f)(tn,tc,a,c,e3.calcMode,td,n,eP)',
    scoreReplacement:
      'return(()=>{(0,N.IE)(tu);let __score=(0,W.f)(tn,tc,a,c,e3.calcMode,td,n,eP);if(__score>((self.__bestLmTrace&&self.__bestLmTrace.score)||0))self.__bestLmTrace={score:__score,mask:t,calcMode:e3.calcMode,gameMode:eP,attackMeta:{...tc},damageFactor:a,ceDamage:c,baseStats:{...__baseStatsBeforeTech},stats:{...tn},skills:{...td},techs:JSON.parse(JSON.stringify(e)),passivePools:Array.from(n||[])};return __score})()',
  },
];

export const workerWebpackReadyNeedles = [
  {
    name: 'webpack-ready-t',
    needle: '_N_E=t.x()',
    replacement: 'self.__webpack_require__=t;self.__webpack_ready__=t.x()',
  },
  {
    name: 'webpack-ready-r',
    needle: '_N_E=r.x()',
    replacement: 'self.__webpack_require__=r;self.__webpack_ready__=r.x()',
  },
];

export function selectWorkerLmPatchSet(code) {
  return workerLmPatchSets.find(
    (item) => code.includes(item.baseNeedle) && code.includes(item.scoreNeedle),
  );
}

export function describeWorkerLmPatchFailure(code) {
  return workerLmPatchSets
    .map((item) => {
      const baseFound = code.includes(item.baseNeedle);
      const scoreFound = code.includes(item.scoreNeedle);
      return `${item.name}: baseNeedle=${baseFound} scoreNeedle=${scoreFound}`;
    })
    .join('; ');
}

export function applyWorkerCapturePatch(code) {
  const patchSet = selectWorkerLmPatchSet(code);
  if (!patchSet) {
    throw new Error(
      `Unable to patch worker-skills lm() base stats expression. ${describeWorkerLmPatchFailure(code)}`,
    );
  }

  let patched = code
    .replace(patchSet.baseNeedle, patchSet.baseReplacement)
    .replace(patchSet.scoreNeedle, patchSet.scoreReplacement);

  const webpackReadyNeedle = workerWebpackReadyNeedles.find((item) => patched.includes(item.needle));
  if (!webpackReadyNeedle) {
    const diagnostics = workerWebpackReadyNeedles
      .map((item) => `${item.name}: needle=${patched.includes(item.needle)}`)
      .join('; ');
    throw new Error(`Unable to patch worker bootstrap: webpack ready needle not found. ${diagnostics}`);
  }

  patched = patched.replace(webpackReadyNeedle.needle, webpackReadyNeedle.replacement);
  return patched;
}
