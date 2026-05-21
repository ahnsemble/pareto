import fs from 'node:fs/promises';
import path from 'node:path';

const manifestPath =
  process.env.MANIFEST_PATH ??
  path.join(process.cwd(), 'artifacts/td11/arbitrary_compact_s59/compact_fixture_manifest.json');
const templateWorkerSummaryPath =
  process.env.TEMPLATE_WORKER_SUMMARY_PATH ??
  path.join(process.cwd(), 'artifacts/td11/sio_worker_decoded_summary_2026-05-20.json');
const outputPath =
  process.env.OUTPUT_PATH ??
  path.join(process.cwd(), 'artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json');
const liveCapturePath =
  process.env.LIVE_CAPTURE_PATH ??
  path.join(path.dirname(outputPath), 'live_capture_summary.json');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const template = JSON.parse(await fs.readFile(templateWorkerSummaryPath, 'utf8'));
const templateCase = template.cases?.[0];
const templateRequest = templateCase?.skillsRequests?.[templateCase.best?.requestIndex ?? 0];
if (!templateRequest) {
  throw new Error('Unable to locate template skills request');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeCompactConfigPatch(base, patch) {
  if (patch === undefined) {
    return structuredClone(base);
  }
  if (Array.isArray(base) && Array.isArray(patch)) {
    const merged = structuredClone(base);
    patch.forEach((value, index) => {
      merged[index] = mergeCompactConfigPatch(base[index], value);
    });
    return merged;
  }
  if (isPlainObject(base) && isPlainObject(patch)) {
    const merged = structuredClone(base);
    Object.entries(patch).forEach(([key, value]) => {
      merged[key] = mergeCompactConfigPatch(base[key], value);
    });
    return merged;
  }
  return structuredClone(patch);
}

const templateConfig = JSON.parse(templateRequest.configString);
let liveCapture = null;
try {
  liveCapture = JSON.parse(await fs.readFile(liveCapturePath, 'utf8'));
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}
const liveCasesById = new Map((liveCapture?.cases ?? []).map((item) => [item.id, item]));

const cases = manifest.cases.map((fixtureCase) => {
  const request = structuredClone(templateRequest);
  const config = mergeCompactConfigPatch(templateConfig, fixtureCase.compactConfig);
  request.configString = JSON.stringify(config);
  request.messageIndex = 0;
  request.requestSource = 'arbitrary_compact_fixture_generator';
  request.compactPayloadHash = fixtureCase.compactPayloadHash ?? null;
  const rawLiveCase = liveCasesById.get(fixtureCase.id);
  const rawLiveHash = rawLiveCase?.captureMetadata?.compactPayloadHash ?? null;
  const liveCase =
    rawLiveCase && rawLiveHash === fixtureCase.compactPayloadHash ? rawLiveCase : null;
  const staleLiveCapture =
    rawLiveCase && !liveCase
      ? {
          evidenceState: rawLiveCase.evidenceState ?? null,
          captureMetadata: rawLiveCase.captureMetadata ?? null,
          compactPayloadHash: rawLiveHash,
        }
      : null;
  return {
    id: fixtureCase.id,
    domain: fixtureCase.domain,
    purpose: fixtureCase.purpose,
    filePath: manifestPath,
    messageCount: 1,
    skillsRequestCount: 1,
    skillsResultCount: 0,
    nonEmptySkillsResultCount: 0,
    skillsRequests: [request],
    decodedResults: liveCase?.decodedResults ?? [],
    best: liveCase?.best ?? {
      requestIndex: 0,
      multiplier: null,
      skillBits: [],
      rowSignature: [],
    },
    captureMetadata: liveCase?.captureMetadata ?? null,
    liveExpected: liveCase?.liveExpected ?? null,
    decodedRowStatSignatures: liveCase?.decodedRowStatSignatures ?? [],
    evidenceState:
      liveCase?.evidenceState ?? (staleLiveCapture ? 'stale-live-capture' : 'synthetic-replay-only'),
    staleLiveCapture,
    compactConfig: fixtureCase.compactConfig,
    compactPayloadHash: fixtureCase.compactPayloadHash ?? null,
    expectedCapturePath: fixtureCase.expectedCapturePath ?? null,
    capturePlan: fixtureCase.capturePlan,
  };
});

const summary = {
  inputManifestPath: manifestPath,
  templateWorkerSummaryPath,
  liveCapturePath,
  outputPath,
  cases: cases.length,
  domains: [...new Set(cases.map((item) => item.domain))],
  skillsRequests: cases.length,
  liveCaptured: cases.filter((item) => item.evidenceState === 'live-captured').length,
  syntheticOnly: cases.filter((item) => item.evidenceState === 'synthetic-replay-only').length,
  staleLiveCapture: cases.filter((item) => item.evidenceState === 'stale-live-capture').length,
  missing: cases.filter((item) => item.evidenceState === 'missing').length,
  replayableWith: 'node scripts/sio_lm_trace_summary.mjs',
};

const payload = {
  generatedAt: new Date().toISOString(),
  summary,
  cases,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
