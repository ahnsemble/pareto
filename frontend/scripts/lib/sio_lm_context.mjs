export function bestConfigString(workerCase) {
  const requestIndex = workerCase?.best?.requestIndex ?? 0;
  return workerCase?.skillsRequests?.[requestIndex]?.configString ?? null;
}

export function bestCompactConfigWithoutFingerprint(workerCase) {
  const configString = bestConfigString(workerCase);
  if (!configString) return null;
  const compact = JSON.parse(configString);
  delete compact._R;
  return compact;
}

export function capturedStatTransform() {
  return {
    statAdds: {
      atkEquip: 34538,
      atkPercent: 180,
      critRate: 30,
      critDamage: 114,
      shieldDamage: 186,
      skillDamage: 320,
      chilled: 85,
      weakened: 45,
      vulnerability: 45,
      clarity: 30,
      eternalMultiplier: 55,
      glacialBloodline: 72,
      ssGlovesLaser: 50,
      ssMiscPath: 160.56,
    },
    statSets: {
      cooldownReduction: 2.130833155763903,
      hpBulletBoost: 1.6,
      chilledUptime: 1,
      weakenedUptime: 1,
      lacerationUptime: 1,
    },
    ceDamage: {
      ssWeapon: 12215.992136368319,
      taloxaOverload: 7354.871999999999,
      crimsonBat: 0,
      Taloxa: 0,
      Joey: 0,
      Metalia: 0,
      'Master Yang': 0,
      King: 0,
      Common: 0,
      xeno: 0,
      mount: 0,
    },
    passivePools: {
      0: 0.985,
      1: 1.015,
      2: 1.018,
      3: 2.130833155763903,
      12: 1.21816,
      13: 1.23532,
      28: 1.11604,
      29: 1.06696,
      30: 1.012,
      31: 2.130833155763903,
    },
  };
}

export function applySioLmContext(playerState, workerCase, traceCase) {
  const legacyExplicitContext = process.env.SIO_LM_LEGACY_EXPLICIT_CONTEXT === '1';
  playerState.sioLm = {
    compactConfig: bestCompactConfigWithoutFingerprint(workerCase),
  };
  if (legacyExplicitContext) {
    playerState.sioLm.baseStats = traceCase?.baseStats ?? {};
    playerState.sioLm.enabledSkills = traceCase?.enabledSkills ?? [];
    playerState.sioLm.attackMeta = traceCase?.attackMeta ?? undefined;
    playerState.sioLm.calcMode = traceCase?.calcMode ?? undefined;
    playerState.sioLm.gameMode = traceCase?.gameMode ?? undefined;
    playerState.sioLm.statTransform = capturedStatTransform();
  }
  return playerState;
}
