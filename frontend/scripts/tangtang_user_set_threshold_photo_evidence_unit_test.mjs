import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const jsonPath = resolve(repoRoot, 'artifacts/td11/tangtang_user_set_threshold_photo_evidence.json');
const markdownPath = resolve(repoRoot, 'artifacts/td11/tangtang_user_set_threshold_photo_evidence.md');
const writeMode = process.argv.includes('--write');

const photoRows = [
  {
    id: 'user-photo-2026-05-24-good-drinks-reading-page-1',
    sourcePath: '/Users/woosung/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/3/3176C127-B854-4DD8-9B34-554C132FA0B8_4_5005_c.jpeg',
    setDisplayNameKo: '좋은 음료와 독서',
    setType: 'collectible-set',
    visibleMaxFinalAtk: 1200,
    visibleMaxFinalHp: 4800,
    parsedRows: [
      { condition: '4개의 각성색 획득', statText: '최종 공격 +200, 최종 HP +800', active: true },
      { condition: '각 컬렉션 당 3개의 금 별 획득', statText: '최종 공격 +300, 최종 HP +1200', active: false },
      { condition: '누적으로 19개의 금 별 획득', statText: 'HP +4%', active: false },
      { condition: '각 컬렉션 당 3개의 빨간 별 획득', statText: '최종 공격 +500, 최종 HP +2000', active: false },
    ],
  },
  {
    id: 'user-photo-2026-05-24-good-drinks-reading-page-2',
    sourcePath: '/Users/woosung/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/0/03987048-9886-4192-811C-7FB70C610091_4_5005_c.jpeg',
    setDisplayNameKo: '좋은 음료와 독서',
    setType: 'collectible-set',
    visibleMaxFinalAtk: 1200,
    visibleMaxFinalHp: 4800,
    parsedRows: [
      { condition: '누적으로 19개의 빨간 별 획득', statText: 'HP +6%', active: false },
      { condition: '8개의 별 획득', statText: '최종 공격 +200, 최종 HP +800', active: true },
      { condition: '16개의 별 획득', statText: '최종 공격 +300, 최종 HP +1200', active: true },
      { condition: '24개의 별 획득', statText: '최종 공격 +500, 최종 HP +2000', active: true },
    ],
  },
  {
    id: 'user-photo-2026-05-24-sparkling-crush-page-1',
    sourcePath: '/Users/woosung/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/A/A2E99317-B174-444D-B29D-E0BCF718E325_4_5005_c.jpeg',
    setDisplayNameKo: '반짝이는 분쇄물',
    setType: 'collectible-set',
    visibleMaxFinalAtk: 1000,
    visibleMaxFinalHp: 4000,
    parsedRows: [
      { condition: '4개의 각성색 획득', statText: '최종 공격 +50, 최종 HP +200', active: true },
      { condition: '각 컬렉션 당 3개의 금 별 획득', statText: '최종 공격 +100, 최종 HP +400', active: true },
      { condition: '누적으로 18개의 금 별 획득', statText: '최종 공격 +150, 최종 HP +600', active: true },
      { condition: '각 컬렉션 당 3개의 빨간 별 획득', statText: '최종 공격 +150, 최종 HP +600', active: true },
    ],
  },
  {
    id: 'user-photo-2026-05-24-sparkling-crush-page-2',
    sourcePath: '/Users/woosung/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/9/9C04C12C-5A0E-4BF4-89B3-8AD7135FEB1C_4_5005_c.jpeg',
    setDisplayNameKo: '반짝이는 분쇄물',
    setType: 'collectible-set',
    visibleMaxFinalAtk: 1000,
    visibleMaxFinalHp: 4000,
    parsedRows: [
      { condition: '각 컬렉션 당 3개의 빨간 별 획득', statText: '최종 공격 +150, 최종 HP +600', active: true },
      { condition: '누적으로 18개의 빨간 별 획득', statText: '최종 공격 +250, 최종 HP +1000', active: true },
      { condition: '8개의 별 획득', statText: '최종 공격 +50, 최종 HP +200', active: true },
      { condition: '16개의 별 획득', statText: '최종 공격 +100, 최종 HP +400', active: true },
    ],
  },
  {
    id: 'user-photo-2026-05-24-sparkling-crush-page-3',
    sourcePath: '/Users/woosung/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/8/8EC1E405-D199-479E-9988-ECAD1E5139BC_4_5005_c.jpeg',
    setDisplayNameKo: '반짝이는 분쇄물',
    setType: 'collectible-set',
    visibleMaxFinalAtk: 1000,
    visibleMaxFinalHp: 4000,
    parsedRows: [
      { condition: '누적으로 18개의 빨간 별 획득', statText: '최종 공격 +250, 최종 HP +1000', active: true },
      { condition: '8개의 별 획득', statText: '최종 공격 +50, 최종 HP +200', active: true },
      { condition: '16개의 별 획득', statText: '최종 공격 +100, 최종 HP +400', active: true },
      { condition: '24개의 별 획득', statText: '최종 공격 +150, 최종 HP +600', active: true },
    ],
  },
  {
    id: 'user-photo-2026-05-24-hidden-mystery-page-1',
    sourcePath: '/Users/woosung/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/B/BF890176-729B-47B6-A9F7-9843EC788A92_4_5005_c.jpeg',
    setDisplayNameKo: '감춰진 신비',
    setType: 'collectible-set',
    visibleMaxFinalAtk: 1200,
    visibleMaxFinalHp: 4800,
    parsedRows: [
      { condition: '4개의 각성색 획득', statText: '최종 공격 +200, 최종 HP +800', active: true },
      { condition: '각 컬렉션 당 3개의 금 별 획득', statText: '최종 공격 +300, 최종 HP +1200', active: false },
      { condition: '누적으로 19개의 금 별 획득', statText: 'HP +4%', active: false },
      { condition: '각 컬렉션 당 3개의 빨간 별 획득', statText: '최종 공격 +500, 최종 HP +2000', active: false },
    ],
  },
  {
    id: 'user-photo-2026-05-24-hidden-mystery-page-2',
    sourcePath: '/Users/woosung/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/8/8223C545-50EB-436F-B8E8-23C144FE356B_4_5005_c.jpeg',
    setDisplayNameKo: '감춰진 신비',
    setType: 'collectible-set',
    visibleMaxFinalAtk: 1200,
    visibleMaxFinalHp: 4800,
    parsedRows: [
      { condition: '누적으로 19개의 빨간 별 획득', statText: 'HP +6%', active: false },
      { condition: '8개의 별 획득', statText: '최종 공격 +200, 최종 HP +800', active: true },
      { condition: '16개의 별 획득', statText: '최종 공격 +300, 최종 HP +1200', active: true },
      { condition: '24개의 별 획득', statText: '최종 공격 +500, 최종 HP +2000', active: true },
    ],
  },
];

function buildArtifact() {
  const threshold19Rows = photoRows.flatMap((photo) =>
    photo.parsedRows
      .filter((row) => row.condition.includes('19개의'))
      .map((row) => ({ photoId: photo.id, setDisplayNameKo: photo.setDisplayNameKo, ...row })),
  );
  const threshold18Rows = photoRows.flatMap((photo) =>
    photo.parsedRows
      .filter((row) => row.condition.includes('18개의'))
      .map((row) => ({ photoId: photo.id, setDisplayNameKo: photo.setDisplayNameKo, ...row })),
  );
  return {
    generatedAtKst: '2026-05-24',
    status: '[TANGTANG-USER-SET-THRESHOLD-PHOTO-EVIDENCE-GREEN]',
    claim: 'user-supplied-set-threshold-photo-evidence',
    behaviorChange: false,
    scoringChanged: false,
    directObservedDamageTrials: 0,
    photos: photoRows,
    summary: {
      photoCount: photoRows.length,
      parsedRows: photoRows.reduce((sum, photo) => sum + photo.parsedRows.length, 0),
      sets: [...new Set(photoRows.map((photo) => photo.setDisplayNameKo))],
      threshold18Rows: threshold18Rows.length,
      threshold19Rows: threshold19Rows.length,
      hpPercentRows: photoRows.flatMap((photo) => photo.parsedRows).filter((row) => /HP \+[46]%/.test(row.statText)).length,
      finalAtkHpRows: photoRows.flatMap((photo) => photo.parsedRows).filter((row) => row.statText.includes('최종 공격')).length,
    },
    threshold18Rows,
    threshold19Rows,
    decision: {
      status: 'evidence-only-not-applied',
      rationale: 'User-supplied photos corroborate mixed 18/19 collectible set threshold patterns, but they are not controlled observed damage trials and include HP/final ATK/HP rows outside the current 15-to-19 atkPercent correction contract.',
      requiredBeforeApplication: [
        'map each photo row to an exact collectible set id and source atom row',
        'separate HP/final ATK/HP rows from atkPercent damage formula correction rows',
        'add controlled observed damage evidence or an approved description-only correction policy before scoring changes',
      ],
    },
  };
}

function buildMarkdown(artifact) {
  const rowLines = artifact.photos.flatMap((photo) =>
    photo.parsedRows.map(
      (row) => `| ${photo.id} | ${photo.setDisplayNameKo} | ${row.condition} | ${row.statText} | ${row.active} |`,
    ),
  );
  return `# Tangtang User Set Threshold Photo Evidence

generatedAtKst: ${artifact.generatedAtKst}
status: ${artifact.status}
claim: \`${artifact.claim}\`
behaviorChange: \`${artifact.behaviorChange}\`
scoringChanged: \`${artifact.scoringChanged}\`

## Summary

- Photo count: ${artifact.summary.photoCount}
- Parsed rows: ${artifact.summary.parsedRows}
- Sets: ${artifact.summary.sets.join(', ')}
- Threshold 18 rows: ${artifact.summary.threshold18Rows}
- Threshold 19 rows: ${artifact.summary.threshold19Rows}
- HP percent rows: ${artifact.summary.hpPercentRows}
- Final ATK/HP rows: ${artifact.summary.finalAtkHpRows}
- Direct observed damage trials: ${artifact.directObservedDamageTrials}

## Decision

- Status: \`${artifact.decision.status}\`
- Rationale: ${artifact.decision.rationale}

Required before application:

${artifact.decision.requiredBeforeApplication.map((item) => `- ${item}`).join('\n')}

## Parsed Rows

| Photo | Set | Condition | Parsed stat text | Active |
|---|---|---|---|---|
${rowLines.join('\n')}
`;
}

if (writeMode) {
  const artifact = buildArtifact();
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(markdownPath, buildMarkdown(artifact));
}

if (!existsSync(jsonPath)) {
  throw new Error(`photo evidence artifact missing: ${jsonPath}`);
}
if (!existsSync(markdownPath)) {
  throw new Error(`photo evidence markdown missing: ${markdownPath}`);
}

const artifact = JSON.parse(readFileSync(jsonPath, 'utf8'));
const markdown = readFileSync(markdownPath, 'utf8');

assert.equal(artifact.behaviorChange, false);
assert.equal(artifact.scoringChanged, false);
assert.equal(artifact.summary.photoCount, 7);
assert.equal(artifact.summary.threshold19Rows, 4);
assert.equal(artifact.summary.threshold18Rows, 3);
assert.equal(artifact.summary.hpPercentRows, 4);
assert.equal(artifact.directObservedDamageTrials, 0);
assert.equal(artifact.decision.status, 'evidence-only-not-applied');
assert.ok(artifact.summary.sets.includes('좋은 음료와 독서'));
assert.ok(artifact.summary.sets.includes('반짝이는 분쇄물'));
assert.ok(artifact.summary.sets.includes('감춰진 신비'));
assert.ok(markdown.includes('누적으로 19개의 금 별 획득'));
assert.ok(markdown.includes('누적으로 18개의 빨간 별 획득'));
assert.ok(markdown.includes('scoringChanged: `false`'));

console.log(JSON.stringify({
  script: 'tangtang_user_set_threshold_photo_evidence_unit_test',
  status: 'passed',
  photoCount: artifact.summary.photoCount,
  threshold18Rows: artifact.summary.threshold18Rows,
  threshold19Rows: artifact.summary.threshold19Rows,
}));
