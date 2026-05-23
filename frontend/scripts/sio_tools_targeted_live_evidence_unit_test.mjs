import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');

const artifactDir = path.join(root, 'artifacts/td11/targeted_live_evidence');
const manifestPath = path.join(artifactDir, 'compact_fixture_manifest.json');
const liveCapturePath = path.join(artifactDir, 'live_capture_summary.json');
const lmTracePath = path.join(artifactDir, 'lm_trace_summary.json');
const matrixPath = path.join(artifactDir, 'targeted_live_evidence_matrix.json');
const mountSourceFixturePath = path.join(root, 'artifacts/td11/mount_damage_source_fixture.json');

const currentWorker = {
  url: 'https://sio-tools.vercel.app/_next/static/chunks/7227.2d1c78b0f3f92fba.js?dpl=dpl_56iU76iXR6KnXd1j6BesFJBdsckh',
  versionHash: '955cb880d975c11ea2c5f0da623444ab717bef8ac463a30395b9563c7df627d1',
  capturedFromDeployment: 'dpl_56iU76iXR6KnXd1j6BesFJBdsckh',
};

const MOUNT_CASES = [
  {
    id: 'targeted_active_mount_tech_hoverboard',
    mountName: 'Tech Hoverboard',
    mountIndex: 1,
    stars: 8,
    expectedCeDamageMount: 33333.33333333333,
  },
  {
    id: 'targeted_active_mount_electric_scooter',
    mountName: 'Electric Scooter',
    mountIndex: 2,
    stars: 8,
    expectedCeDamageMount: 11806.666666666666,
  },
];

const TARGET_SURVIVORS = [
  {
    id: 'targeted_survivor_yelena',
    survivorId: 'yelena',
    displayName: 'Yelena',
    sourceName: 'Yelena',
    heroArrayIndex: 6,
    mainHeroValue: 7,
    stars: 6,
    level: 120,
    expectedHeroStats: {
      atkHeroPercent: 5,
    },
  },
  {
    id: 'targeted_survivor_squidward',
    survivorId: 'squidward',
    displayName: 'Squidward',
    sourceName: 'Squidward',
    heroArrayIndex: 17,
    mainHeroValue: 18,
    stars: 6,
    level: 120,
    expectedHeroStats: {
      atkHeroPercent: 4,
      critDamage: 5,
      critRate: 5,
    },
  },
  {
    id: 'targeted_survivor_spongebob',
    survivorId: 'spongebob',
    displayName: 'SpongeBob',
    sourceName: 'Spongebob',
    heroArrayIndex: 18,
    mainHeroValue: 19,
    stars: 6,
    level: 120,
    expectedHeroStats: {
      atkHeroPercent: 4,
      critDamage: 5,
      critRate: 5,
    },
  },
];

function stableObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableObject(item)]),
    );
  }
  return value;
}

function compactHeroArray(target) {
  return Array.from({ length: 23 }, (_, index) =>
    index === target.heroArrayIndex ? { r: target.stars, q: target.level } : null,
  );
}

function buildManifest() {
  const cases = [
    ...MOUNT_CASES.map((item) => ({
      id: item.id,
      domain: 'mounts',
      purpose: `Capture active ${item.mountName} live mountDamage contribution with current public worker.`,
      compactConfig: {
        _V: 5,
        bJ: {
          bj: item.mountIndex,
          bM: [
            { s: 1, r: 10 },
            { s: 1, r: 8 },
            { s: 1, r: 8 },
          ],
        },
      },
      expectedEvidence: {
        mountName: item.mountName,
        activeMountIndex: item.mountIndex,
        stars: item.stars,
        compactKeys: {
          mounts: 'bJ',
          active: 'bj',
          data: 'bM',
        },
      },
    })),
    ...TARGET_SURVIVORS.map((item) => ({
      id: item.id,
      domain: 'survivors',
      purpose: `Capture ${item.displayName} as targeted mainHero/live survivor row with current public worker.`,
      compactConfig: {
        _V: 5,
        a: {
          c: item.mainHeroValue,
        },
        h: compactHeroArray(item),
      },
      expectedEvidence: {
        survivorId: item.survivorId,
        displayName: item.displayName,
        sourceName: item.sourceName,
        heroArrayIndex: item.heroArrayIndex,
        mainHeroValue: item.mainHeroValue,
      },
    })),
  ];

  return {
    generatedAtKst: '2026-05-23',
    manifestVersion: 'targeted-live-evidence-v1',
    source: 'Targeted compact fixtures for current public worker evidence only; not part of production scoring.',
    capturePlan: {
      fetchWorker:
        'fetch current skills worker and dependency chunks into /tmp/sio-tools-src.current before running capture',
      liveCaptureCommand:
        'SIO_WORKER_SRC_DIR=/tmp/sio-tools-src.current MANIFEST_PATH=artifacts/td11/targeted_live_evidence/compact_fixture_manifest.json OUTPUT_PATH=artifacts/td11/targeted_live_evidence/live_capture_summary.json node scripts/sio_arbitrary_compact_live_capture.mjs',
      traceCommand:
        'TRACE_LM_BASE_COMPONENTS=1 TRACE_LM_STAT_ATTRIBUTION=1 SIO_WORKER_SRC_DIR=/tmp/sio-tools-src.current WORKER_SUMMARY_PATH=artifacts/td11/targeted_live_evidence/live_capture_summary.json OUTPUT_PATH=artifacts/td11/targeted_live_evidence/lm_trace_summary.json node scripts/sio_lm_trace_summary.mjs',
      matrixCommand: 'node scripts/sio_tools_targeted_live_evidence_unit_test.mjs --write',
    },
    currentWorker,
    cases,
    summary: {
      cases: cases.length,
      activeMountCases: MOUNT_CASES.length,
      targetSurvivorCases: TARGET_SURVIVORS.length,
    },
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function maybeComponent(traceCase, label) {
  return traceCase?.baseStatComponents?.find((component) => component.label === label)?.stats ?? {};
}

function assertApproxEqual(actual, expected, label) {
  const tolerance = Math.max(1e-9, Math.abs(expected) * 1e-12);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
}

function liveSummary(liveCase, traceCase) {
  return stableObject({
    evidenceState: liveCase.evidenceState,
    compactPayloadHash: liveCase.compactPayloadHash,
    multiplier: liveCase.best?.multiplier,
    tracedMultiplier: traceCase.tracedMultiplier,
    stageProductRelativeError: traceCase.stageProductRelativeError,
    damageFactor: traceCase.damageFactor,
  });
}

async function buildMatrix(manifest) {
  const [liveCapture, lmTrace, mountSourceFixture] = await Promise.all([
    readJson(liveCapturePath),
    readJson(lmTracePath),
    readJson(mountSourceFixturePath),
  ]);

  assert.equal(liveCapture.summary.cases, manifest.summary.cases, 'targeted live capture case count changed');
  assert.equal(liveCapture.summary.liveCaptured, liveCapture.summary.cases, 'all targeted cases must be live captured');
  assert.equal(liveCapture.summary.versionHash, currentWorker.versionHash, 'targeted live capture worker hash changed');
  assert.equal(lmTrace.summary.cases, manifest.summary.cases, 'targeted LM trace case count changed');
  assert.equal(lmTrace.summary.stageProductPassed, lmTrace.summary.cases, 'targeted LM trace stage products must all pass');
  assert.equal(lmTrace.summary.replayedPassed, lmTrace.summary.cases, 'targeted LM trace replay must match live expected rows');

  const liveCaseById = new Map(liveCapture.cases.map((item) => [item.id, item]));
  const traceCaseById = new Map(lmTrace.cases.map((item) => [item.id, item]));
  const mountSourceByName = new Map(mountSourceFixture.rows.map((item) => [item.mountName, item]));
  const rows = [];

  for (const item of MOUNT_CASES) {
    const liveCase = liveCaseById.get(item.id);
    const traceCase = traceCaseById.get(item.id);
    assert.equal(liveCase?.evidenceState, 'live-captured', `${item.id} must be live captured`);
    const mountStats = maybeComponent(traceCase, 'mounts');
    const sourceMountDamage = mountSourceByName.get(item.mountName)?.mountDamageByStars?.[String(item.stars)];
    assert.equal(mountStats.mountDamage, sourceMountDamage, `${item.mountName} source/live mountDamage mismatch`);
    assertApproxEqual(traceCase.ceDamage.mount, item.expectedCeDamageMount, `${item.mountName} ceDamage.mount`);
    assertApproxEqual(traceCase.ceDamage.mount, sourceMountDamage * (2 / 3), `${item.mountName} ceDamage.mount source ratio`);
    rows.push({
      key: `live:mounts:active:${item.mountName.replace(/\s+/g, '-').toLowerCase()}`,
      domain: 'mounts',
      evidenceType: 'current-public-worker-live-capture',
      liveCaseId: item.id,
      mountName: item.mountName,
      compactActiveIndex: item.mountIndex,
      compactKeys: {
        mounts: 'bJ',
        active: 'bj',
        data: 'bM',
      },
      sourceCrossCheck: {
        stars: item.stars,
        sourceMountDamage,
        liveBaseMountDamage: mountStats.mountDamage,
        liveCeDamageMount: traceCase.ceDamage.mount,
      },
      live: liveSummary(liveCase, traceCase),
      finding: `${item.mountName} is live-captured with non-zero ceDamage.mount using bJ.bj=${item.mountIndex}.`,
      confidence: 'sio-live-equivalent-for-current-worker-evidence-only',
    });
  }

  for (const item of TARGET_SURVIVORS) {
    const liveCase = liveCaseById.get(item.id);
    const traceCase = traceCaseById.get(item.id);
    assert.equal(liveCase?.evidenceState, 'live-captured', `${item.id} must be live captured`);
    assert.equal(traceCase.expandedConfig.meta.mainHero, item.sourceName, `${item.displayName} mainHero decode changed`);
    const heroStats = maybeComponent(traceCase, 'heroes');
    assert.deepEqual(
      Object.fromEntries(Object.keys(item.expectedHeroStats).map((key) => [key, heroStats[key]])),
      item.expectedHeroStats,
      `${item.displayName} hero stat component changed`,
    );
    rows.push({
      key: `live:survivors:target:${item.survivorId}`,
      domain: 'survivors',
      evidenceType: 'current-public-worker-live-capture',
      liveCaseId: item.id,
      survivorId: item.survivorId,
      displayName: item.displayName,
      sourceName: item.sourceName,
      compactMapping: {
        heroArrayIndex: item.heroArrayIndex,
        mainHeroValue: item.mainHeroValue,
      },
      live: liveSummary(liveCase, traceCase),
      baseHeroStats: stableObject(heroStats),
      finding: `${item.displayName} is live-captured as mainHero=${item.sourceName} with targeted h[${item.heroArrayIndex}] survivor stats.`,
      confidence: 'sio-live-equivalent-for-current-worker-evidence-only',
    });
  }

  return {
    generatedAtKst: '2026-05-23',
    status: 'TARGETED-LIVE-EVIDENCE-V1',
    sourceArtifacts: {
      manifest: path.relative(root, manifestPath),
      liveCapture: path.relative(root, liveCapturePath),
      lmTrace: path.relative(root, lmTracePath),
      mountDamageSourceFixture: path.relative(root, mountSourceFixturePath),
    },
    currentWorker,
    summary: {
      targetedLiveCaptureCases: liveCapture.summary.cases,
      targetedLiveCapturedCases: liveCapture.summary.liveCaptured,
      targetedLmTraceCases: lmTrace.summary.cases,
      targetedLmTraceStageProductPassed: lmTrace.summary.stageProductPassed,
      activeMountLiveRows: MOUNT_CASES.length,
      nonZeroMountDamageLiveRows: rows.filter((row) => row.domain === 'mounts' && row.sourceCrossCheck.liveCeDamageMount > 0).length,
      targetSurvivorLiveRows: TARGET_SURVIVORS.length,
      mountActiveShortKey: 'bj',
      mountDataShortKey: 'bM',
      targetSurvivorMainHeroValues: Object.fromEntries(
        TARGET_SURVIVORS.map((item) => [item.survivorId, item.mainHeroValue]),
      ),
      targetSurvivorHeroArrayIndexes: Object.fromEntries(
        TARGET_SURVIVORS.map((item) => [item.survivorId, item.heroArrayIndex]),
      ),
    },
    rows,
  };
}

const expectedManifest = buildManifest();
const serializedManifest = `${JSON.stringify(expectedManifest, null, 2)}\n`;

if (writeMode) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(manifestPath, serializedManifest);
} else {
  assert.equal(await fs.readFile(manifestPath, 'utf8'), serializedManifest, 'targeted live manifest is stale; run with --write');
}

let matrix;
try {
  matrix = await buildMatrix(expectedManifest);
} catch (error) {
  if (writeMode && error?.code === 'ENOENT') {
    throw new Error(
      `Targeted live capture artifacts are missing after manifest write. Run capture/trace commands from ${path.relative(
        root,
        manifestPath,
      )}, then rerun this script with --write.`,
    );
  }
  throw error;
}

const serializedMatrix = `${JSON.stringify(matrix, null, 2)}\n`;

if (writeMode) {
  await fs.writeFile(matrixPath, serializedMatrix);
  console.log(`sio_tools_targeted_live_evidence_unit_test: wrote ${matrixPath} (${matrix.rows.length} rows)`);
} else {
  assert.equal(await fs.readFile(matrixPath, 'utf8'), serializedMatrix, 'targeted live evidence matrix is stale; run with --write');
  console.log(`sio_tools_targeted_live_evidence_unit_test: passed (${matrix.rows.length} rows)`);
}
