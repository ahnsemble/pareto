export function parseFirstNumber(text) {
  const match = String(text).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  return match ? Number(match[0]) : null;
}

export function parseSioResultFromText(text) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (lines[index] === 'damage') {
      const value = parseFirstNumber(lines[index + 1]);
      if (Number.isFinite(value)) return { text: lines[index + 1], value };
    }
  }
  return { text: '', value: null };
}

export function computeDiffPct(v3Value, sioValue) {
  if (!Number.isFinite(v3Value) || !Number.isFinite(sioValue) || sioValue === 0) return null;
  return Math.abs(v3Value - sioValue) / Math.abs(sioValue) * 100;
}

export function classifyDiff(diffPct, hardGatePct = 0.5) {
  if (!Number.isFinite(diffPct)) return 'STOP';
  return diffPct <= hardGatePct ? 'PASS' : 'STOP';
}

export function summarizeSamples(samples) {
  const values = samples.filter(Number.isFinite).slice().sort((left, right) => left - right);
  if (values.length === 0) {
    return { iterations: 0, avg_ms: null, p50_ms: null, p95_ms: null, max_ms: null };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  const nearestRank = (percentile) => values[Math.max(0, Math.ceil(values.length * percentile) - 1)];
  return {
    iterations: values.length,
    avg_ms: total / values.length,
    p50_ms: nearestRank(0.5),
    p95_ms: nearestRank(0.95),
    max_ms: values.at(-1),
  };
}
