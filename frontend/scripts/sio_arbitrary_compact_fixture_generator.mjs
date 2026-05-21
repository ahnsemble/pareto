import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const outputDir =
  process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'artifacts/td11/arbitrary_compact_s59');
const outputPath = process.env.OUTPUT_PATH ?? path.join(outputDir, 'compact_fixture_manifest.json');

function survivorArray(entries) {
  const survivors = Array.from({ length: 22 }, () => ({}));
  for (const [index, value] of entries) {
    survivors[index] = value;
  }
  return survivors;
}

function collectibleArray(entries, length = 90) {
  const collectibles = Array.from({ length }, () => null);
  for (const [index, value] of entries) {
    collectibles[index] = value;
  }
  return collectibles;
}

function skillFlags(indexes) {
  const flags = Array.from({ length: 21 }, () => 0);
  for (const index of indexes) {
    flags[index] = 1;
  }
  return flags;
}

const equipmentProfiles = {
  judgmentSash: [
    { t: 1, w: 5, u: 5, v: 10, bg: 7, bh: 0, bo: 1, x: 0 },
    { t: 2, w: 5, u: 5, v: 10, bg: 5, bh: 0, bo: 0, x: 0 },
    { t: 4, w: 5, u: 5, v: 6, bg: 0, x: 3 },
    { t: 6, w: 5, u: 5, v: 10, bg: 0, x: 0 },
    { t: 8, w: 5, u: 5, v: 10, bg: 0, x: 0 },
    { t: 10, w: 5, u: 5, v: 10, bg: 0, x: 0 },
  ],
  voidSash: [
    { t: 1, w: 5, u: 5, v: 10, bg: 9, bh: 0, bo: 1, x: 0 },
    { t: 2, w: 5, u: 5, v: 10, bg: 5, bh: 0, bo: 0, x: 0 },
    { t: 5, w: 4, u: 4, v: 8, bg: 0, x: 2 },
    { t: 6, w: 5, u: 5, v: 10, bg: 0, x: 0 },
    { t: 8, w: 5, u: 5, v: 10, bg: 0, x: 0 },
    { t: 10, w: 5, u: 5, v: 10, bg: 0, x: 0 },
  ],
  voidTwisting: [
    { t: 1, w: 5, u: 5, v: 10, bg: 9, bh: 0, bo: 1, x: 0 },
    { t: 2, w: 5, u: 5, v: 10, bg: 5, bh: 0, bo: 0, x: 0 },
    { t: 5, w: 4, u: 4, v: 8, bg: 0, x: 3 },
    { t: 7, w: 5, u: 5, v: 10, bg: 0, x: 3 },
    { t: 8, w: 5, u: 5, v: 10, bg: 0, x: 0 },
    { t: 10, w: 5, u: 5, v: 10, bg: 0, x: 0 },
  ],
  lme2Judgment: [
    { t: 1, w: 5, u: 5, v: 10, bg: 8, bh: 0, bo: 1, x: 0 },
    { t: 2, w: 5, u: 5, v: 10, bg: 5, bh: 0, bo: 0, x: 0 },
    { t: 4, w: 5, u: 5, v: 10, bg: 5, bh: 0, bo: 0, x: 0 },
    { t: 6, w: 5, u: 4, v: 8, bg: 0, x: 0 },
    { t: 8, w: 5, u: 5, v: 10, bg: 0, x: 0 },
    { t: 10, w: 5, u: 5, v: 10, bg: 0, x: 0 },
  ],
  advancedVoidTwisting: [
    { t: 1, w: 5, u: 5, v: 10, bg: 6, bh: 0, bo: 1, x: 0 },
    { t: 2, w: 5, u: 5, v: 10, bg: 5, bh: 0, bo: 0, x: 0 },
    { t: 5, w: 5, u: 5, v: 7, bg: 6, bh: 0, bo: 0, x: 3 },
    { t: 7, w: 5, u: 5, v: 10, bg: 0, x: 3 },
    { t: 8, w: 5, u: 5, v: 10, bg: 0, x: 0 },
    { t: 10, w: 5, u: 5, v: 10, bg: 0, x: 0 },
  ],
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const cases = [
  {
    id: 'compact_meta_synergy_clan_game_mode_surface',
    domain: 'compact-meta',
    purpose: 'Exercise compact meta synergy, harmony, teamwork, clan level, and game-mode account surface fields.',
    compactConfig: {
      a: { b: 1, g: 80, c: 11, d: 9, e: 10, f: [3, 8, 11], bb: 18, I: 'lme1' },
      h: survivorArray([
        [3, { r: 12, q: 120 }],
        [8, { r: 10, q: 120 }],
        [10, { r: 12, q: 120 }],
        [11, { r: 12, q: 120 }],
      ]),
    },
  },
  {
    id: 'collectibles_custom_sets_legend_thresholds',
    domain: 'collectibles-custom-sets',
    purpose: 'Exercise compact collectible stars and custom set levels without relying on captured endgame profile residuals.',
    compactConfig: {
      i: [{ r: 8 }, { r: 8 }, { r: 8 }, { r: 8 }],
      n: [{ i: [1, 2, 3, 4], q: 4 }],
    },
  },
  {
    id: 'pets_xeno_awakening_sync_rate',
    domain: 'pets-xeno-awakening',
    purpose: 'Exercise Sync Rate pet skill, active xeno pet, and xeno awakening star thresholds.',
    compactConfig: {
      l: [{ s: 1, B: 2 }, { s: 1, B: 2 }, { s: 1, B: 2 }, { s: 1, B: 2 }, { s: 1, B: 2 }, { P: 70 }],
      bi: { bj: 3, r: [0, 0, 10, 10, 10, 10, 10, 10] },
    },
  },
  {
    id: 'pets_xeno_support_skill_interactions',
    domain: 'pets-xeno-awakening',
    purpose: 'Exercise active xeno pet with support-pet xeno skill indexes and mixed xeno star thresholds.',
    compactConfig: {
      l: [
        { s: 1, B: 2 },
        { s: 1, B: 2 },
        { s: 1, B: 2 },
        { s: 1, B: 2 },
        { s: 1, B: 2 },
        { P: 95 },
      ],
      bi: {
        bj: 4,
        r: [0, 0, 10, 9, 8, 7, 6, 5],
        bm: [
          { t: 5, bn: [53, 54, 55, 56] },
          { t: 6, bn: [54, 55, 56, 57] },
        ],
      },
    },
  },
  {
    id: 'survivors_passives_harmony_teamwork',
    domain: 'survivors-passives-harmony-teamwork',
    purpose: 'Exercise survivor stars, harmony, Taloxa active-skill teamwork, and Donatello SP-teamwork.',
    compactConfig: {
      a: { c: 22, d: 9, e: 11, f: [11, 12, 17], b: 1, g: 80 },
      h: survivorArray([
        [8, { r: 7, q: 120 }],
        [10, { r: 10, q: 120 }],
        [11, { r: 12, q: 120 }],
        [13, { r: 12 }],
        [16, { r: 12 }],
        [21, { r: 13 }],
      ]),
      p: skillFlags([5, 8, 14]),
    },
  },
  {
    id: 'mounts_enabled_lines',
    domain: 'mounts',
    purpose: 'Exercise compact mount enabled lines and stat map extraction.',
    compactConfig: {
      bJ: {
        bM: [
          { s: 1, r: 6, bK: { skillDamage: 89, damageBoss: 33.5, laceration: 33 } },
          { s: 1, r: 2, bK: { shieldDamage: 43, critDamage: 22, chilled: 23 } },
        ],
      },
    },
  },
  {
    id: 'mounts_fallback_damage_formula_lines',
    domain: 'mounts',
    purpose: 'Exercise mount line fallback formulas when compact mount stat payload is absent.',
    compactConfig: {
      bJ: {
        bM: [
          { s: 1, r: 10 },
          { s: 1, r: 8 },
          { s: 1, r: 6 },
        ],
      },
    },
  },
  {
    id: 'evo_worm_rex_overreaction',
    domain: 'evo',
    purpose: 'Exercise Worm, Rex, Energy Cube, and Overreaction cooldown interaction.',
    compactConfig: {
      a: { c: 4, I: 'lme1' },
      h: survivorArray([[3, { r: 12, q: 120 }]]),
      k: [0, 0, 1, 0],
      p: skillFlags([0]),
      bi: { bj: 1, r: [10] },
    },
  },
  {
    id: 'evo_endgame_all_tree_interactions',
    domain: 'evo',
    purpose: 'Exercise all compact evoTree flags in an endgame LME2 account surface.',
    compactConfig: {
      a: { I: 'lme2', J: 78500 },
      k: [1, 1, 1, 1],
      p: skillFlags([0, 1, 2, 3, 4, 5, 7, 20]),
      bi: { bj: 1, r: [10] },
    },
  },
  {
    id: 'lme2_testament_thresholds',
    domain: 'lme',
    purpose: 'Exercise LME2 testament threshold debuff deltas.',
    compactConfig: {
      a: { I: 'lme2', J: 73502 },
    },
  },
  {
    id: 'lme2_dynamic_threshold_edges',
    domain: 'lme',
    purpose: 'Exercise high LME2 testament threshold edge deltas across multiple debuff stats.',
    compactConfig: {
      a: { I: 'lme2', J: 83000 },
      p: skillFlags([0, 1, 2, 3, 4, 5, 8, 20]),
    },
  },
  {
    id: 'ee_static_skill_groups',
    domain: 'ee',
    purpose: 'Exercise Endless Echelon static skill groups currently implemented in compact baseStats.',
    compactConfig: {
      a: { I: 'ee', K: [1, -1, 4] },
    },
  },
  {
    id: 'ee_omnipower_dynamic_entries',
    domain: 'ee',
    purpose: 'Exercise EE omnipower and non-static skill group entries under the compact meta surface.',
    compactConfig: {
      a: { I: 'ee', K: [2, 3, 5], ba: 9 },
      p: skillFlags([0, 1, 2, 3, 4, 5, 14, 20]),
    },
  },
  {
    id: 'active_skills_slots_and_map',
    domain: 'active-skills',
    purpose: 'Exercise compact enabled skills and tech optimizer active skill slot count.',
    compactConfig: {
      p: skillFlags([0, 1, 5, 14, 17]),
      X: {
        p: 3,
        bG: true,
      },
    },
  },
  {
    id: 'active_skills_endgame_equipment_coupling',
    domain: 'active-skills',
    purpose: 'Exercise active-skill selection coupled to endgame mode and SS equipment transforms.',
    compactConfig: {
      a: { I: 'ee', K: [1, 2, 4], ba: 5 },
      p: skillFlags([0, 1, 2, 3, 4, 5, 8, 14, 20]),
      j: equipmentProfiles.voidTwisting,
      X: {
        p: 4,
        bG: true,
      },
    },
  },
  {
    id: 'equipment_judgment_sash_profile',
    domain: 'equipment',
    purpose: 'Exercise captured Judgment Necklace + Stardust Sash SS equipment profile as generated live evidence.',
    compactConfig: {
      a: { I: 'ee' },
      j: equipmentProfiles.judgmentSash,
    },
  },
  {
    id: 'equipment_void_sash_profile',
    domain: 'equipment',
    purpose: 'Exercise captured Voidwaker Emblem + Stardust Sash SS equipment profile as generated live evidence.',
    compactConfig: {
      a: { I: 'lme1' },
      j: equipmentProfiles.voidSash,
    },
  },
  {
    id: 'equipment_void_twisting_profile',
    domain: 'equipment',
    purpose: 'Exercise captured Voidwaker Emblem + Twisting Belt SS equipment profile as generated live evidence.',
    compactConfig: {
      a: { I: 'lme1' },
      j: equipmentProfiles.voidTwisting,
    },
  },
  {
    id: 'equipment_lme2_judgment_profile',
    domain: 'equipment',
    purpose: 'Exercise captured LME2 Judgment Necklace + Stardust Sash SS equipment profile as generated live evidence.',
    compactConfig: {
      a: { I: 'lme2', J: 73502 },
      j: equipmentProfiles.lme2Judgment,
    },
  },
  {
    id: 'equipment_advanced_void_twisting_profile',
    domain: 'equipment',
    purpose: 'Exercise captured advanced Voidwaker Emblem + Twisting Belt SS equipment profile as generated live evidence.',
    compactConfig: {
      a: { I: 'lme1' },
      j: equipmentProfiles.advancedVoidTwisting,
    },
  },
  {
    id: 'collectibles_individual_star_tables',
    domain: 'collectibles-custom-sets',
    purpose: 'Exercise isolated individual collectible star entries across low, mid, and capped star values.',
    compactConfig: {
      i: collectibleArray([
        [0, { r: 0 }],
        [1, { r: 3 }],
        [2, { r: 5 }],
        [3, { r: 8 }],
        [10, { r: 10 }],
        [21, { r: 12 }],
      ]),
    },
  },
  {
    id: 'collectibles_upgraded_multiplier_behavior',
    domain: 'collectibles-custom-sets',
    purpose: 'Exercise compact upgraded collectible entries that feed multiplier-affecting collectible behavior.',
    compactConfig: {
      i: collectibleArray([
        [0, { r: 8 }],
        [1, { r: 8 }],
        [7, { r: 10 }],
        [10, { r: 10 }],
        [21, { r: 12 }],
      ]),
      n: [{ i: [1, 2, 8, 11], q: 2 }],
      '!': {
        5: 1,
        6: collectibleArray(
          [
            [0, { 9: 12, s: 1 }],
            [7, { 9: 12, s: 1 }],
            [10, { 9: 12, s: 1 }],
            [21, { 9: 12, s: 1 }],
          ],
          23,
        ),
        '£': collectibleArray(
          [
            [7, { 9: 12, s: 1 }],
            [10, { 9: 12, s: 1 }],
            [21, { 9: 12, s: 1 }],
          ],
          22,
        ),
        Z: 0,
        '@': 0,
        '=': 80,
      },
    },
  },
  {
    id: 'collectibles_item_set_folding',
    domain: 'collectibles-custom-sets',
    purpose: 'Exercise item collectible-set folding with SS equipment and collectible stars present.',
    compactConfig: {
      i: collectibleArray([
        [0, { r: 8 }],
        [1, { r: 8 }],
        [2, { r: 8 }],
        [3, { r: 8 }],
        [33, { r: 8 }],
        [34, { r: 8 }],
        [35, { r: 8 }],
        [36, { r: 8 }],
      ]),
      j: equipmentProfiles.judgmentSash,
    },
  },
  {
    id: 'collectibles_tech_set_folding',
    domain: 'collectibles-custom-sets',
    purpose: 'Exercise tech collectible-set folding with compact tech skills and collectible stars present.',
    compactConfig: {
      i: collectibleArray([
        [49, { r: 8 }],
        [50, { r: 8 }],
        [51, { r: 8 }],
        [52, { r: 8 }],
        [70, { r: 8 }],
        [71, { r: 8 }],
        [72, { r: 8 }],
        [73, { r: 8 }],
      ]),
      m: [
        { y: 1, z: 0, B: 0, A: 3000 },
        { y: 1, B: 0, A: 3000 },
        { y: 1, z: 1, B: 0, A: 3000 },
        null,
        null,
        { y: 1, B: 5, A: 2100 },
      ],
    },
  },
  {
    id: 'custom_sets_threshold_edges',
    domain: 'collectibles-custom-sets',
    purpose: 'Exercise custom set low, boundary, and high threshold edges with explicit star sums.',
    compactConfig: {
      i: collectibleArray([
        [0, { r: 10 }],
        [1, { r: 10 }],
        [2, { r: 10 }],
        [3, { r: 10 }],
        [4, { r: 8 }],
        [5, { r: 8 }],
        [6, { r: 8 }],
        [7, { r: 8 }],
        [8, { r: 6 }],
        [9, { r: 6 }],
        [10, { r: 6 }],
        [11, { r: 6 }],
      ]),
      n: [
        { i: [1, 2, 3, 4], q: 4 },
        { i: [5, 6, 7, 8, 9, 10, 11, 12], q: 8 },
      ],
    },
  },
  {
    id: 'collectibles_broad_item_tech_set_endgame_fold',
    domain: 'collectibles-custom-sets',
    purpose: 'Exercise item and tech collectible set folding together under an endgame SS equipment surface.',
    compactConfig: {
      a: { I: 'ee', K: [1, 2, 4], ba: 4 },
      i: collectibleArray([
        [0, { r: 10 }],
        [1, { r: 10 }],
        [6, { r: 10 }],
        [7, { r: 10 }],
        [12, { r: 10 }],
        [21, { r: 10 }],
        [49, { r: 10 }],
        [50, { r: 10 }],
        [70, { r: 10 }],
        [71, { r: 10 }],
      ]),
      j: equipmentProfiles.advancedVoidTwisting,
      m: [
        { y: 1, z: 0, B: 0, A: 4500 },
        { y: 1, B: 0, A: 3000 },
        { y: 1, z: 0, B: 0, A: 3000 },
        { y: 1, z: 0, B: 0, A: 2100 },
        { y: 1, z: 1, B: 0, A: 1200 },
        { y: 1, B: 5, A: 4500 },
      ],
    },
  },
].map((item, index) => {
  const compactConfig = { _V: 5, ...item.compactConfig };
  const stableCompactPayload = stableStringify(compactConfig);
  const compactPayloadHash = sha256(stableCompactPayload);
  const expectedCapturePath = path.join(outputDir, `${item.id}.live_capture.json`);
  return {
    ...item,
    caseIndex: index,
    compactConfig,
    stableCompactPayload,
    compactPayloadHash,
    expectedCapturePath,
    domainTags: [item.domain],
    capturePlan: {
      requiresLiveSioTools: true,
      existingLocalCapture: false,
      expectedCapturePath,
      liveCaptureCommand: 'node scripts/sio_arbitrary_compact_live_capture.mjs',
      summaryCommand: 'node scripts/sio_arbitrary_compact_worker_summary.mjs',
      gateCommand: 'node scripts/sio_full_equivalence_gate.mjs',
    },
  };
});

const manifest = {
  generatedAt: new Date().toISOString(),
  manifestVersion: 2,
  source: 'locally generated arbitrary compact fixture inputs for SIO lm equivalence capture',
  cases,
  summary: {
    cases: cases.length,
    domains: [...new Set(cases.map((item) => item.domain))],
    requiresLiveCapture: cases.filter((item) => item.capturePlan.requiresLiveSioTools).length,
    compactPayloadHashes: Object.fromEntries(cases.map((item) => [item.id, item.compactPayloadHash])),
  },
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, ...manifest.summary }, null, 2));
