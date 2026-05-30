function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function updateMultiplierValues(value, before, after) {
  if (Array.isArray(value)) {
    value.forEach((item) => updateMultiplierValues(item, before, after));
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  if (finiteNumber(value.multiplier) === before) {
    value.multiplier = after;
  }
  Object.values(value).forEach((item) => updateMultiplierValues(item, before, after));
}

export function rebaselineWorkerSummaryFromTrace(workerSummary, traceSummary, options = {}) {
  const next = cloneJson(workerSummary);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const traceCaseById = new Map((traceSummary.cases ?? []).map((item) => [item.id, item]));
  const updatedCases = [];

  next.generatedAt = generatedAt;
  next.summary = next.summary ?? {};
  next.summary.bestMultipliers = next.summary.bestMultipliers ?? {};

  for (const workerCase of next.cases ?? []) {
    const traceCase = traceCaseById.get(workerCase.id);
    const after = finiteNumber(traceCase?.replayedTopMultiplier ?? traceCase?.tracedMultiplier);
    const before = finiteNumber(workerCase.best?.multiplier);
    if (after === null || before === null || Object.is(before, after)) {
      continue;
    }

    workerCase.best.multiplier = after;
    updateMultiplierValues(workerCase.decodedResults, before, after);
    next.summary.bestMultipliers[workerCase.id] = after;
    updatedCases.push({ id: workerCase.id, before, after });
  }

  next.rebaseline = {
    generatedAt,
    source: options.source ?? 'sio_lm_trace_summary',
    updatedCases,
  };

  return next;
}
