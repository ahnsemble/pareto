import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const buildDir = path.join(tmpdir(), 'pareto-in-game-description-evidence');
const matrixPath = path.join(root, 'artifacts/td11/in_game_description_evidence_matrix.json');
const writeMode = process.argv.includes('--write');

async function transpileModule(sourcePath, outPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.outputText);
}

await fs.rm(buildDir, { recursive: true, force: true });
await transpileModule(
  path.join(root, 'app/lib/pareto-store/schemas/index.ts'),
  path.join(buildDir, 'schemas/index.js'),
);

const require = createRequire(import.meta.url);
const schemas = require(path.join(buildDir, 'schemas/index.js'));

const { HERO_SCHEMA_INDEX, MOUNT_SCHEMA_INDEX } = schemas;

const generatedAtKst = '2026-05-23';
const sourceTablePath = 'frontend/artifacts/td11/sio_tools_formula_table_extract/extracted_tables/module37013_c_deployed_data_table.json';
const mountSourceFixturePath = 'frontend/artifacts/td11/mount_damage_source_fixture.json';
const liveEvidencePath = 'frontend/artifacts/td11/sio_tools_live_evidence_matrix.json';
const targetedLiveEvidencePath = 'frontend/artifacts/td11/targeted_live_evidence/targeted_live_evidence_matrix.json';

const SOURCES = {
  fandomCharacters: {
    sourceId: 'fandom-characters-2026-05-23',
    title: 'Survivor.io Wiki / Characters',
    url: 'https://survivorio.fandom.com/wiki/Characters',
    sourceType: 'public-web-guide',
    capturedAtKst: generatedAtKst,
    note:
      'Search/open evidence showed Yelena level bonuses through level 120, but not the current SIO 10/12-star and passive vulnerability rows.',
  },
  mturboYelena: {
    sourceId: 'mturbogamer-yelena-2023-09',
    title: 'Survivor.io: How To Unlock/Get Yelena',
    url: 'https://mturbogamer.com/2023/09/survivor-io-how-to-unlock-get-yelena/',
    sourceType: 'public-web-guide',
    capturedAtKst: generatedAtKst,
    note:
      'Older public guide confirms Yelena survivor level/skill framing, but it stops before the current source-only 10/12-star and passive rows.',
  },
  mturboSpongebob: {
    sourceId: 'mturbogamer-spongebob-2024-06',
    title: 'SpongeBob SquarePants Skills In Survivor.io',
    url: 'https://mturbogamer.com/2024/06/30/spongebob-squarepants-skills-in-survivor-io/',
    sourceType: 'public-web-guide-search-index',
    capturedAtKst: generatedAtKst,
    note:
      'Public search index evidence lists SpongeBob 5-star all-survivor ATK, level-40 crit-damage, and level-120 crit-rate bonuses.',
  },
  redditSpongebobSquidward: {
    sourceId: 'reddit-spongebob-squidward-current-2026-05-23',
    title: 'Survivor.io community current SpongeBob/Squidward stat discussion',
    url: 'https://www.reddit.com/search/?q=%22SpongeBob%22%20%22Level%20120%22%20%22Crit%20Rate%22%20%22All%20Survivors%22%20%22Survivor.io%22',
    sourceType: 'public-community-search-index',
    capturedAtKst: generatedAtKst,
    note:
      'Public search result corroborates the current SpongeBob/Squidward all-survivor crit-rate and related stat rows; not treated as first-party in-game capture.',
  },
  phasecastMountGuide: {
    sourceId: 'phasecast-mount-guide-2026-04-23',
    title: 'Survivor.io Mount Guide - Everything You Need to Know',
    url:
      'https://phasecast.com/videos/survivorio-mount-guide-everything-you-need-to-know-doomsteed-hoverboard-scooter-W2pNmo',
    trpcUrl:
      'https://phasecast.com/api/trpc/videos.bySlug?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22slug%22%3A%22survivorio-mount-guide-everything-you-need-to-know-doomsteed-hoverboard-scooter-W2pNmo%22%7D%7D%7D',
    youtubeId: 'F9R49Hy44ck',
    sourceType: 'public-web-video-metadata',
    publishedAt: '2026-04-23T13:55:08.000Z',
    capturedAtKst: generatedAtKst,
    note:
      'Public metadata confirms Doomsteed, Tech Hoverboard, Electric Scooter, mount shards, components, buffs, and line effects; it does not expose exact per-line stat values.',
  },
  phasecastMountUnlock: {
    sourceId: 'phasecast-mount-unlock-2026-04-16',
    title: 'How to Unlock Mounts in Survivor.io',
    url:
      'https://phasecast.com/videos/how-to-unlock-mounts-in-survivorio-new-vehicle-system-hoverboard-doom-steed-more-qPqOCM',
    trpcUrl:
      'https://phasecast.com/api/trpc/videos.bySlug?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22slug%22%3A%22how-to-unlock-mounts-in-survivorio-new-vehicle-system-hoverboard-doom-steed-more-qPqOCM%22%7D%7D%7D',
    youtubeId: 'TVeKiWy1vDg',
    sourceType: 'public-web-video-metadata',
    publishedAt: '2026-04-16T08:57:32.000Z',
    capturedAtKst: generatedAtKst,
    note:
      'Public metadata confirms the vehicle system and the three current mount names plus shards/components/upgrades/sync/refinement/fusion.',
  },
  sioToolsCurrentTable: {
    sourceId: 'sio-tools-current-source-table-2026-05-23',
    title: 'Current SIO Tools deployed source table extract',
    url:
      'https://sio-tools.vercel.app/_next/static/chunks/7227.2d1c78b0f3f92fba.js?dpl=dpl_56iU76iXR6KnXd1j6BesFJBdsckh',
    sourceType: 'current-public-worker-source-table',
    versionHash: '955cb880d975c11ea2c5f0da623444ab717bef8ac463a30395b9563c7df627d1',
    localExtract: sourceTablePath,
    capturedAtKst: generatedAtKst,
    note:
      'Authoritative for current SIO Tools mirror/source semantics, but not independent in-game text.',
  },
};

function schemaItemByDisplayName(schemaIndex, displayName) {
  const item = schemaIndex.find((candidate) => candidate.display_name_en === displayName);
  assert.ok(item, `missing schema row for ${displayName}`);
  return item;
}

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

const survivorSourceRows = {
  yelena: {
    sourceName: 'Yelena',
    sourceClaims: [
      {
        sourcePath: 'survivors.Yelena.level.120',
        sourceKey: 'atkHeroPercent',
        value: 5,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.yelena.level.120',
        rustStatChannel: 'atkHeroPercent',
        multiplierStage: 'en0 attack aggregate',
        evidenceStatus: 'public-web-partial',
        publicEvidenceSourceIds: ['fandom-characters-2026-05-23', 'mturbogamer-yelena-2023-09'],
        evidenceSummary: 'public guides corroborate Yelena level-based all-survivor ATK framing through level 120',
      },
      {
        sourcePath: 'survivors.Yelena.stars.10',
        sourceKey: 'critDamage',
        value: 20,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.yelena.stars.10',
        rustStatChannel: 'critDamage',
        multiplierStage: 'en1 crit expectation',
        evidenceStatus: 'sio-source-only',
        publicEvidenceSourceIds: [],
        evidenceSummary: 'current public web search did not expose a direct 10-star in-game description row',
      },
      {
        sourcePath: 'survivors.Yelena.stars.12',
        sourceKey: 'critDamage',
        value: 25,
        cumulativeValue: 45,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.yelena.stars.12',
        rustStatChannel: 'critDamage',
        multiplierStage: 'en1 crit expectation',
        evidenceStatus: 'sio-source-only',
        publicEvidenceSourceIds: [],
        evidenceSummary: 'current public web search did not expose a direct 12-star in-game description row',
      },
      {
        sourcePath: 'survivors.Yelena.passives.9',
        sourceKey: 'vulnerability',
        value: 5,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.yelena.passives.9',
        rustStatChannel: 'vulnerability',
        multiplierStage: 'en2 vulnerability',
        evidenceStatus: 'sio-source-only',
        publicEvidenceSourceIds: [],
        evidenceSummary: 'current public web search did not expose a direct passive vulnerability description row',
      },
      {
        sourcePath: 'survivors.Yelena.passives.11',
        sourceKey: 'vulnerability',
        value: 5,
        cumulativeValue: 10,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.yelena.passives.11',
        rustStatChannel: 'vulnerability',
        multiplierStage: 'en2 vulnerability',
        evidenceStatus: 'sio-source-only',
        publicEvidenceSourceIds: [],
        evidenceSummary: 'current public web search did not expose a direct passive vulnerability description row',
      },
    ],
  },
  squidward: {
    sourceName: 'Squidward',
    sourceClaims: [
      {
        sourcePath: 'survivors.Squidward.stars.5',
        sourceKey: 'atkHeroPercent',
        value: 4,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.squidward.stars.5',
        rustStatChannel: 'atkHeroPercent',
        multiplierStage: 'en0 attack aggregate',
        evidenceStatus: 'public-web-corroborated',
        publicEvidenceSourceIds: ['reddit-spongebob-squidward-current-2026-05-23'],
        evidenceSummary: 'public current community search corroborates Squidward/SpongeBob all-survivor ATK star row',
      },
      {
        sourcePath: 'survivors.Squidward.level.40',
        sourceKey: 'critDamage',
        value: 5,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.squidward.level.40',
        rustStatChannel: 'critDamage',
        multiplierStage: 'en1 crit expectation',
        evidenceStatus: 'public-web-corroborated',
        publicEvidenceSourceIds: ['reddit-spongebob-squidward-current-2026-05-23'],
        evidenceSummary: 'public current community search corroborates level-40 all-survivor crit-damage row',
      },
      {
        sourcePath: 'survivors.Squidward.level.120',
        sourceKey: 'critRate',
        value: 5,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.squidward.level.120',
        rustStatChannel: 'critRate',
        multiplierStage: 'en1 crit expectation',
        evidenceStatus: 'public-web-corroborated',
        publicEvidenceSourceIds: ['reddit-spongebob-squidward-current-2026-05-23'],
        evidenceSummary: 'public current community search corroborates level-120 all-survivor crit-rate row',
      },
    ],
  },
  spongebob: {
    sourceName: 'Spongebob',
    sourceClaims: [
      {
        sourcePath: 'survivors.Spongebob.stars.5',
        sourceKey: 'atkHeroPercent',
        value: 4,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.spongebob.stars.5',
        rustStatChannel: 'atkHeroPercent',
        multiplierStage: 'en0 attack aggregate',
        evidenceStatus: 'public-web-corroborated',
        publicEvidenceSourceIds: [
          'mturbogamer-spongebob-2024-06',
          'reddit-spongebob-squidward-current-2026-05-23',
        ],
        evidenceSummary: 'public web/search evidence corroborates SpongeBob all-survivor ATK star row',
      },
      {
        sourcePath: 'survivors.Spongebob.level.40',
        sourceKey: 'critDamage',
        value: 5,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.spongebob.level.40',
        rustStatChannel: 'critDamage',
        multiplierStage: 'en1 crit expectation',
        evidenceStatus: 'public-web-corroborated',
        publicEvidenceSourceIds: [
          'mturbogamer-spongebob-2024-06',
          'reddit-spongebob-squidward-current-2026-05-23',
        ],
        evidenceSummary: 'public web/search evidence corroborates SpongeBob level-40 crit-damage row',
      },
      {
        sourcePath: 'survivors.Spongebob.level.120',
        sourceKey: 'critRate',
        value: 5,
        tangtangSchemaKey: 'HERO_SCHEMA_INDEX.spongebob.level.120',
        rustStatChannel: 'critRate',
        multiplierStage: 'en1 crit expectation',
        evidenceStatus: 'public-web-corroborated',
        publicEvidenceSourceIds: [
          'mturbogamer-spongebob-2024-06',
          'reddit-spongebob-squidward-current-2026-05-23',
        ],
        evidenceSummary: 'public web/search evidence corroborates SpongeBob level-120 crit-rate row',
      },
    ],
  },
};

const mountSourceRows = {
  doomsteed: {
    sourceName: 'Doomsteed',
    exactInGameDescriptionStatus: 'not-found-public-web',
    publicEvidenceSourceIds: ['phasecast-mount-guide-2026-04-23', 'phasecast-mount-unlock-2026-04-16'],
    lineClaims: [
      ['1', 'poisoned', 20, 'en4 target status damage'],
      ['3', 'poisoned', 40, 'en4 target status damage'],
      ['3', 'skillDamage', 50, 'skillDamage direct stat channel'],
      ['4', 'skillDamage', 150, 'skillDamage direct stat channel'],
      ['6', 'poisoned', 60, 'en4 target status damage'],
      ['6', 'laceration', 30, 'en8 laceration/divine fire'],
      ['7', 'poisoned', 80, 'en4 target status damage'],
      ['7', 'damageBoss', 5, 'en22 boss damage'],
      ['8', 'damageBoss', 25, 'en22 boss damage'],
    ],
    mountDamage: {
      mgCoefficient: 0,
      activeLiveEvidence: false,
      rustStatChannel: 'mountDamage',
      multiplierStage: 'CE damage mount bucket',
    },
  },
  electricScooter: {
    sourceName: 'Electric Scooter',
    exactInGameDescriptionStatus: 'not-found-public-web',
    publicEvidenceSourceIds: ['phasecast-mount-guide-2026-04-23', 'phasecast-mount-unlock-2026-04-16'],
    lineClaims: [
      ['1', 'weakened', 10, 'en4 target status damage'],
      ['3', 'weakened', 30, 'en4 target status damage'],
      ['4', 'weakened', 50, 'en4 target status damage'],
      ['5', 'critDamage', 20, 'en1 crit expectation'],
      ['6', 'laceration', 10, 'en8 laceration/divine fire'],
      ['7', 'weakened', 70, 'en4 target status damage'],
      ['8', 'laceration', 20, 'en8 laceration/divine fire'],
    ],
    mountDamage: {
      mgCoefficient: 77,
      activeLiveEvidence: true,
      star8MountDamage: 17710,
      star8CeDamageMount: 11806.666666666666,
      rustStatChannel: 'mountDamage',
      multiplierStage: 'CE damage mount bucket',
    },
  },
  techHoverboard: {
    sourceName: 'Tech Hoverboard',
    exactInGameDescriptionStatus: 'not-found-public-web',
    publicEvidenceSourceIds: ['phasecast-mount-guide-2026-04-23', 'phasecast-mount-unlock-2026-04-16'],
    lineClaims: [
      ['1', 'chilled', 10, 'en4 target status damage'],
      ['3', 'chilled', 30, 'en4 target status damage'],
      ['4', 'skillDamage', 50, 'skillDamage direct stat channel'],
      ['5', 'chilled', 50, 'en4 target status damage'],
      ['6', 'skillDamage', 150, 'skillDamage direct stat channel'],
      ['7', 'chilled', 70, 'en4 target status damage'],
      ['8', 'shieldDamage', 50, 'en3 shield damage uptime'],
    ],
    mountDamage: {
      mgCoefficient: 100,
      activeLiveEvidence: true,
      star8MountDamage: 50000,
      star8CeDamageMount: 33333.33333333333,
      rustStatChannel: 'mountDamage',
      multiplierStage: 'CE damage mount bucket',
    },
  },
};

function buildSurvivorRow(id) {
  const schemaItem = schemaItemByDisplayName(
    HERO_SCHEMA_INDEX,
    id === 'spongebob' ? 'SpongeBob' : id[0].toUpperCase() + id.slice(1),
  );
  const source = survivorSourceRows[id];
  const publicClaimCount = source.sourceClaims.filter((claim) => claim.publicEvidenceSourceIds.length > 0).length;
  const fullClaimCount = source.sourceClaims.length;
  return stableObject({
    key: `survivor:${id}`,
    domain: 'survivor',
    displayName: schemaItem.display_name_en,
    sourceName: source.sourceName,
    schemaCitation: schemaItem.source_citations,
    evidenceState:
      publicClaimCount === fullClaimCount
        ? 'public-web-corroborated-for-current-source-claims'
        : 'public-web-partial-current-source-table-required',
    exactInGameDescriptionStatus:
      publicClaimCount === fullClaimCount ? 'public-web-stat-text-corroborated' : 'partial-public-web-stat-text',
    publicClaimCount,
    fullClaimCount,
    sourceClaimCount: fullClaimCount,
    tangtangSchemaKey: `HERO_SCHEMA_INDEX.${id}`,
    sourceTable: {
      localExtract: sourceTablePath,
      currentWorkerSourceId: SOURCES.sioToolsCurrentTable.sourceId,
      currentWorkerHash: SOURCES.sioToolsCurrentTable.versionHash,
    },
    liveEvidence: targetedLiveEvidencePath,
    claims: source.sourceClaims,
    sources: source.sourceClaims
      .flatMap((claim) => claim.publicEvidenceSourceIds)
      .filter((value, index, array) => array.indexOf(value) === index),
    caveat:
      publicClaimCount === fullClaimCount
        ? 'public source is still secondary/community evidence, not a first-party game screenshot'
        : 'unverified source-table claims stay source-only until direct in-game text is captured',
  });
}

function buildMountRow(id) {
  const schemaItem = schemaItemByDisplayName(
    MOUNT_SCHEMA_INDEX,
    id === 'techHoverboard' ? 'Tech Hoverboard' : id === 'electricScooter' ? 'Electric Scooter' : 'Doomsteed',
  );
  const source = mountSourceRows[id];
  return stableObject({
    key: `mount:${id}`,
    domain: 'mount',
    displayName: schemaItem.display_name_en,
    sourceName: source.sourceName,
    schemaCitation: schemaItem.source_citations,
    evidenceState: source.mountDamage.activeLiveEvidence
      ? 'public-web-system-evidence-plus-current-source-and-live-mountDamage'
      : 'public-web-system-evidence-plus-current-source-only',
    exactInGameDescriptionStatus: source.exactInGameDescriptionStatus,
    publicClaimCount: 0,
    sourceClaimCount: source.lineClaims.length + 1,
    tangtangSchemaKey: `MOUNT_SCHEMA_INDEX.${id}`,
    sourceTable: {
      localExtract: sourceTablePath,
      mountSourceFixture: mountSourceFixturePath,
      currentWorkerSourceId: SOURCES.sioToolsCurrentTable.sourceId,
      currentWorkerHash: SOURCES.sioToolsCurrentTable.versionHash,
    },
    liveEvidence: source.mountDamage.activeLiveEvidence ? liveEvidencePath : mountSourceFixturePath,
    publicEvidenceSourceIds: source.publicEvidenceSourceIds,
    lineClaims: source.lineClaims.map(([lineThreshold, sourceKey, value, multiplierStage]) => ({
      sourcePath: `mounts.${source.sourceName}.lines.${lineThreshold}.${sourceKey}`,
      lineThreshold: Number(lineThreshold),
      sourceKey,
      value,
      tangtangSchemaKey: `MOUNT_SCHEMA_INDEX.${id}.lines.${lineThreshold}.${sourceKey}`,
      rustStatChannel: sourceKey,
      multiplierStage,
      evidenceStatus: 'sio-source-table-only',
      publicEvidenceSourceIds: [],
      evidenceSummary: 'public web confirms mount line-effect system, but exact per-line stat text was not found',
    })),
    mountDamage: source.mountDamage,
    caveat:
      'Do not promote mount line stats to in-game-description-verified until exact in-game text/screenshot or first-party data is captured.',
  });
}

function buildMatrix() {
  const rows = [
    buildSurvivorRow('yelena'),
    buildSurvivorRow('squidward'),
    buildSurvivorRow('spongebob'),
    buildMountRow('doomsteed'),
    buildMountRow('electricScooter'),
    buildMountRow('techHoverboard'),
  ].sort((left, right) => left.key.localeCompare(right.key));

  const publicClaimRows = rows.filter((row) => row.publicClaimCount > 0);
  const fullPublicClaimRows = rows.filter((row) => row.publicClaimCount === row.sourceClaimCount);
  const partialPublicClaimRows = rows.filter((row) => row.publicClaimCount > 0 && row.publicClaimCount < row.sourceClaimCount);
  const mountRows = rows.filter((row) => row.domain === 'mount');
  const survivorRows = rows.filter((row) => row.domain === 'survivor');

  return stableObject({
    generatedAtKst,
    matrixVersion: 'in-game-description-evidence-v1',
    purpose:
      'Evidence ledger for public-web/in-game-description-adjacent claims before any formula semantic change. It deliberately separates public guide/community evidence, current public worker source tables, and live replay evidence.',
    behaviorChange: false,
    sources: SOURCES,
    summary: {
      totalRows: rows.length,
      survivorRows: survivorRows.length,
      mountRows: mountRows.length,
      rowsWithAnyPublicStatClaim: publicClaimRows.length,
      rowsWithAllSourceClaimsPubliclyCorroborated: fullPublicClaimRows.length,
      rowsWithPartialPublicStatClaims: partialPublicClaimRows.length,
      mountRowsWithExactInGameDescriptions: mountRows.filter(
        (row) => row.exactInGameDescriptionStatus === 'public-web-stat-text-corroborated',
      ).length,
      mountRowsStillSourceOnlyForExactLineStats: mountRows.filter(
        (row) => row.exactInGameDescriptionStatus === 'not-found-public-web',
      ).length,
      nonZeroMountDamageLiveRows: mountRows.filter((row) => row.mountDamage.activeLiveEvidence).length,
      publicSourcesUsed: Object.keys(SOURCES).length,
    },
    rows,
  });
}

function requireRow(matrix, key) {
  const row = matrix.rows.find((candidate) => candidate.key === key);
  assert.ok(row, `missing evidence row: ${key}`);
  return row;
}

const matrix = buildMatrix();

assert.equal(matrix.summary.totalRows, 6, 'description evidence matrix must track target 3 survivors + 3 mounts');
assert.equal(matrix.summary.survivorRows, 3, 'must include all targeted survivors');
assert.equal(matrix.summary.mountRows, 3, 'must include all current mount rows');
assert.equal(matrix.summary.rowsWithAnyPublicStatClaim, 3, 'only survivor rows currently have public stat-claim evidence');
assert.equal(matrix.summary.rowsWithAllSourceClaimsPubliclyCorroborated, 2, 'SpongeBob and Squidward public claims cover all current source claims');
assert.equal(matrix.summary.rowsWithPartialPublicStatClaims, 1, 'Yelena remains partial because 10/12-star and vulnerability rows are source-only');
assert.equal(matrix.summary.mountRowsWithExactInGameDescriptions, 0, 'mount exact per-line in-game text has not been found on public web');
assert.equal(matrix.summary.mountRowsStillSourceOnlyForExactLineStats, 3, 'all mount exact line stats stay source-table-only');
assert.equal(matrix.summary.nonZeroMountDamageLiveRows, 2, 'Tech Hoverboard and Electric Scooter live mountDamage rows must remain captured');

const squidward = requireRow(matrix, 'survivor:squidward');
const spongebob = requireRow(matrix, 'survivor:spongebob');
const yelena = requireRow(matrix, 'survivor:yelena');
assert.equal(squidward.publicClaimCount, squidward.sourceClaimCount, 'Squidward public stat claims must cover current source claims');
assert.equal(spongebob.publicClaimCount, spongebob.sourceClaimCount, 'SpongeBob public stat claims must cover current source claims');
assert.ok(yelena.publicClaimCount < yelena.sourceClaimCount, 'Yelena must remain partial until star/passive text is captured');
assert.ok(
  yelena.claims.some((claim) => claim.sourceKey === 'vulnerability' && claim.evidenceStatus === 'sio-source-only'),
  'Yelena vulnerability rows must remain source-only',
);

const techHoverboard = requireRow(matrix, 'mount:techHoverboard');
const electricScooter = requireRow(matrix, 'mount:electricScooter');
const doomsteed = requireRow(matrix, 'mount:doomsteed');
assert.equal(techHoverboard.mountDamage.star8MountDamage, 50000, 'Tech Hoverboard star-8 mountDamage source value');
assert.equal(electricScooter.mountDamage.star8MountDamage, 17710, 'Electric Scooter star-8 mountDamage source value');
assert.equal(doomsteed.mountDamage.mgCoefficient, 0, 'Doomsteed coefficient stays zero in current source');
assert.ok(
  techHoverboard.lineClaims.some((claim) => claim.sourceKey === 'shieldDamage' && claim.lineThreshold === 8),
  'Tech Hoverboard shieldDamage line must stay mapped',
);
assert.ok(
  electricScooter.lineClaims.some((claim) => claim.sourceKey === 'critDamage' && claim.lineThreshold === 5),
  'Electric Scooter critDamage line must stay mapped',
);
assert.ok(
  doomsteed.lineClaims.some((claim) => claim.sourceKey === 'damageBoss' && claim.lineThreshold === 8),
  'Doomsteed damageBoss line must stay mapped',
);

if (writeMode) {
  await fs.mkdir(path.dirname(matrixPath), { recursive: true });
  await fs.writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);
  console.log(`in_game_description_evidence_unit_test: wrote ${matrixPath} (${matrix.summary.totalRows} rows)`);
} else {
  const existing = JSON.parse(await fs.readFile(matrixPath, 'utf8'));
  assert.deepEqual(existing, matrix, 'in-game description evidence matrix is stale; run with --write');
  console.log(`in_game_description_evidence_unit_test: passed (${matrix.summary.totalRows} rows)`);
}
