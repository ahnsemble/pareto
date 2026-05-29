export function relativeError(actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected === 0) return null;
  return Math.abs(actual - expected) / Math.abs(expected);
}

export function evaluateGeneratedOptimizerCase({
  fullRowMatches,
  activeSkillsMatch,
  chipMatches,
  partsMatch,
  overloadMatches,
  actualMultiplier,
  liveExpectedMultiplier,
  traceCase,
  scorerMatches,
  fullFlagMatches,
  tolerance,
}) {
  const liveMultiplierRelativeError = relativeError(actualMultiplier, liveExpectedMultiplier);
  const liveMultiplierMatches =
    liveMultiplierRelativeError !== null && liveMultiplierRelativeError <= tolerance;
  const traceAlignmentAvailable =
    traceCase?.traceAlignment?.aligned === true && Number.isFinite(traceCase?.tracedMultiplier);
  const traceMultiplierRelativeError = traceAlignmentAvailable
    ? relativeError(actualMultiplier, traceCase.tracedMultiplier)
    : null;
  const traceMultiplierMatches =
    traceMultiplierRelativeError !== null && traceMultiplierRelativeError <= tolerance;
  const traceMultiplierStatus = traceAlignmentAvailable
    ? traceMultiplierMatches
      ? 'aligned-match'
      : 'aligned-mismatch'
    : 'unavailable-no-aligned-trace';
  const legacyTraceFirstMultiplier =
    traceCase?.tracedMultiplier ?? traceCase?.replayedTopMultiplier ?? liveExpectedMultiplier;
  const legacyTraceFirstMultiplierRelativeError = relativeError(
    actualMultiplier,
    legacyTraceFirstMultiplier,
  );
  const legacyTraceFirstMultiplierMatches =
    legacyTraceFirstMultiplierRelativeError !== null &&
    legacyTraceFirstMultiplierRelativeError <= tolerance;
  const structuralMatches =
    fullRowMatches && activeSkillsMatch && chipMatches && partsMatch && overloadMatches;
  const pass =
    structuralMatches && liveMultiplierMatches && scorerMatches && fullFlagMatches;

  return {
    pass,
    structuralMatches,
    primaryMultiplierSource: 'live-worker',
    liveMultiplierMatches,
    liveMultiplierRelativeError,
    traceAlignmentAvailable,
    traceMultiplierMatches,
    traceMultiplierRelativeError,
    traceMultiplierStatus,
    legacyTraceFirstMultiplier,
    legacyTraceFirstMultiplierMatches,
    legacyTraceFirstMultiplierRelativeError,
  };
}
