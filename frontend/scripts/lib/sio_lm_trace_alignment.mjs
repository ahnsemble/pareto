const displayTechToId = {
  'Energy Guidance System': 'energyGuidanceSystem',
  'Antimatter Maintainer': 'antimatterMaintainer',
  'Quantum Nanobot': 'quantumNanobot',
  'Phase Driver': 'phaseDriver',
  'Exo-radicator': 'exoRadicator',
  'Hi-Gravity Pulser': 'hiGravityPulser',
};

const displayModeToId = {
  'Molotov Mode': 'molotovMode',
  'Durian Mode': 'durianMode',
  'Soccer Mode': 'soccerMode',
  'Drone Mode': 'droneMode',
  'Forcefield Mode': 'forcefieldMode',
  'Drill Shot Mode': 'drillShotMode',
  'Rocket Mode': 'rocketMode',
  'Lightning Mode': 'lightningMode',
  'Boomerang Mode': 'boomerangMode',
  'Guardian Mode': 'guardianMode',
  'Laser Mode': 'laserMode',
  'Brick Mode': 'brickMode',
};

const traceTechOrder = [
  'Energy Guidance System',
  'Antimatter Maintainer',
  'Quantum Nanobot',
  'Phase Driver',
  'Exo-radicator',
  'Hi-Gravity Pulser',
];

export function enabledSkillNamesFromBits(skillBits, skillOrder) {
  return (skillBits ?? [])
    .map((enabled, index) => (enabled ? skillOrder[index] : null))
    .filter(Boolean);
}

export function enabledSkillNamesFromTraceSkills(traceSkills) {
  return Object.entries(traceSkills ?? {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([skill]) => skill)
    .sort((left, right) => left.localeCompare(right));
}

export function enabledSkillNamesFromSummary(traceCase) {
  return (traceCase?.enabledSkills ?? []).filter(Boolean).sort((left, right) => left.localeCompare(right));
}

export function traceRowSignature(traceTechs) {
  const techs = traceTechs ?? {};
  return traceTechOrder
    .filter((techName) => techs[techName])
    .map((techName) => {
      const row = techs[techName] ?? {};
      return {
        tech: displayTechToId[techName] ?? techName,
        mode: displayModeToId[row.mode] ?? row.mode ?? null,
        chip: Number.isFinite(row.chip) ? row.chip : null,
        overload: Number.isFinite(row.overload) ? row.overload : null,
        rarity: row.rarity ?? null,
        parts: Array.isArray(row.parts) ? row.parts : [],
      };
    });
}

export function selectAlignedLmTrace(traces, workerCase, skillOrder) {
  const candidates = (traces ?? []).map((trace) => ({
    trace,
    alignment: traceAlignment(trace, workerCase, skillOrder),
  }));
  const aligned = candidates
    .filter((candidate) => candidate.alignment.aligned)
    .sort((left, right) => traceScore(right.trace) - traceScore(left.trace))[0];
  if (aligned) {
    return aligned;
  }
  return (
    candidates.sort((left, right) => traceScore(right.trace) - traceScore(left.trace))[0] ?? {
      trace: null,
      alignment: {
        aligned: false,
        rowMatches: false,
        enabledSkillsMatch: false,
        expectedRows: workerCase?.best?.rowSignature ?? [],
        traceRows: [],
        expectedEnabledSkills: enabledSkillNamesFromBits(workerCase?.best?.skillBits, skillOrder),
        traceEnabledSkills: [],
      },
    }
  );
}

export function traceAlignmentFromSummary(traceCase, workerCase, skillOrder) {
  const expectedRows = workerCase?.best?.rowSignature ?? [];
  const traceRows = traceRowSignature(traceCase?.techs);
  const expectedEnabledSkills = enabledSkillNamesFromBits(workerCase?.best?.skillBits, skillOrder);
  const traceEnabledSkills = traceCase?.skills
    ? enabledSkillNamesFromTraceSkills(traceCase.skills)
    : enabledSkillNamesFromSummary(traceCase);
  const rowMatches = sameJson(expectedRows, traceRows);
  const enabledSkillsMatch = sameArray([...expectedEnabledSkills].sort(), traceEnabledSkills);
  return {
    aligned: rowMatches && enabledSkillsMatch,
    rowMatches,
    enabledSkillsMatch,
    expectedRows,
    traceRows,
    expectedEnabledSkills,
    traceEnabledSkills,
  };
}

function traceAlignment(trace, workerCase, skillOrder) {
  return traceAlignmentFromSummary(trace, workerCase, skillOrder);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameArray(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function traceScore(trace) {
  return Number.isFinite(trace?.score) ? trace.score : Number.NEGATIVE_INFINITY;
}
