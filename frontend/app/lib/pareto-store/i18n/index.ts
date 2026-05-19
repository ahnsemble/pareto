// P2 05 — typed translation entries (8 categories)
// Categories: ui_label / hero / weapon / item / tech / pet / collectible / mode

import type { Translation } from '../types';

export const TRANSLATION_DICTIONARY: Translation = {
  // ───────── ui_label (15) ─────────
  'ui_label.damage_multiplier': { category: 'ui_label', en: 'Damage Multiplier', ko: '데미지 배율' },
  'ui_label.raw_damage': { category: 'ui_label', en: 'Raw Damage', ko: '실 데미지' },
  'ui_label.base_attack': { category: 'ui_label', en: 'Base Attack', ko: '기초 공격력' },
  'ui_label.final_stats': { category: 'ui_label', en: 'Final Stats', ko: '최종 스탯' },
  'ui_label.resonance_chips': { category: 'ui_label', en: 'Resonance Chips', ko: '공명 칩' },
  'ui_label.teamwork_passives': { category: 'ui_label', en: 'Teamwork Passives', ko: '팀워크 패시브' },
  'ui_label.xenopets': { category: 'ui_label', en: 'Xenopets', ko: '제노 펫' },
  'ui_label.assist_skills': { category: 'ui_label', en: 'Assist Skills', ko: '보조 스킬' },
  'ui_label.astral_forge': { category: 'ui_label', en: 'Astral Forge', ko: '우주의 주조' },
  'ui_label.xeno_transmute': { category: 'ui_label', en: 'Xeno Transmute', ko: '제노 주조' },
  'ui_label.recommend_order': { category: 'ui_label', en: 'Recommend Order', ko: '추천 순서' },
  'ui_label.lme_battle_phase': { category: 'ui_label', en: 'LME Battle Phase', ko: 'LME 전투 페이즈' },
  'ui_label.expedition_phase': { category: 'ui_label', en: 'Expedition Phase', ko: 'LME 탐험 페이즈' },
  'ui_label.chaos_fusion': { category: 'ui_label', en: 'Chaos Fusion', ko: '카오스 퓨전' },
  'ui_label.future_update': { category: 'ui_label', en: 'Data pending future update', ko: '데이터 미확정, 향후 업데이트' },

  // ───────── hero (15) ─────────
  'hero.common': { category: 'hero', en: 'Common', ko: 'Common' },
  'hero.king': { category: 'hero', en: 'King', ko: 'King' },
  'hero.masterYang': { category: 'hero', en: 'Master Yang', ko: 'Master Yang' },
  'hero.metalia': { category: 'hero', en: 'Metalia', ko: 'Metalia' },
  'hero.joey': { category: 'hero', en: 'Joey', ko: 'Joey' },
  'hero.taloxa': { category: 'hero', en: 'Taloxa', ko: 'Taloxa' },
  'hero.venato': { category: 'hero', en: 'Venato', ko: 'Venato' },
  'hero.worm': { category: 'hero', en: 'Worm', ko: 'Worm' },
  'hero.april': { category: 'hero', en: 'April', ko: 'April' },
  'hero.splinter': { category: 'hero', en: 'Splinter', ko: 'Splinter' },
  'hero.raphael': { category: 'hero', en: 'Raphael', ko: 'Raphael' },
  'hero.donatello': { category: 'hero', en: 'Donatello', ko: 'Donatello' },
  'hero.tsukuyomi': { category: 'hero', en: 'Tsukuyomi', ko: 'Tsukuyomi' },
  'hero.wesson': { category: 'hero', en: 'Wesson', ko: 'Wesson' },
  'hero.catnips': { category: 'hero', en: 'Catnips', ko: 'Catnips' },

  // ───────── weapon (7) ─────────
  'weapon.twinLance': { category: 'weapon', en: 'Twin Lance', ko: 'Twin Lance' },
  'weapon.void_power': { category: 'weapon', en: 'Void Power', ko: '파괴의 힘' },
  'weapon.sword_of_disorder': { category: 'weapon', en: 'Sword of Disorder', ko: '혼돈의 검' },
  'weapon.lightchaser': { category: 'weapon', en: 'Lightchaser', ko: '빛을 쫓는 자' },
  'weapon.kunai': { category: 'weapon', en: 'Kunai', ko: '쿠나이' },
  'weapon.baseball_bat': { category: 'weapon', en: 'Baseball Bat', ko: '야구빠따' },
  'weapon.katana': { category: 'weapon', en: 'Katana', ko: '카타나' },

  // ───────── item (11) ─────────
  'item.eternal_suit': { category: 'item', en: 'Eternal Suit', ko: '영원의 전투복' },
  'item.voidwaker_windbreaker': { category: 'item', en: 'Voidwaker Windbreaker', ko: '파괴자의 코트' },
  'item.chaos_armor': { category: 'item', en: 'Chaos Armor', ko: '망자의 갑옷' },
  'item.eternal_boots': { category: 'item', en: 'Eternal Boots', ko: '영원의 부츠' },
  'item.voidwaker_treads': { category: 'item', en: 'Voidwaker Treads', ko: '파괴자의 신발' },
  'item.chaos_shoes': { category: 'item', en: 'Chaos Shoes', ko: '혼란의 신발' },
  'item.eternal_gloves': { category: 'item', en: 'Eternal Gloves', ko: '영원의 장갑' },
  'item.voidwaker_handguards': { category: 'item', en: 'Voidwaker Handguards', ko: '파괴자의 장갑' },
  'item.judgment_necklace': { category: 'item', en: 'SS Judgment Necklace', ko: '심판의 목걸이' },
  'item.voidwaker_emblem': { category: 'item', en: 'Voidwaker Emblem', ko: '파괴자의 영물' },
  'item.twisting_belt': { category: 'item', en: 'Twisting Belt', ko: '꼬인 벨트' },

  // ───────── tech (12) ─────────
  'tech.drone': { category: 'tech', en: 'Drone', ko: '정밀 유도 시스템' },
  'tech.lightning': { category: 'tech', en: 'Lightning', ko: '위상 변환기' },
  'tech.laser': { category: 'tech', en: 'Laser', ko: '전멸 장치' },
  'tech.drill': { category: 'tech', en: 'Drill', ko: '반물질 생성기' },
  'tech.molotov': { category: 'tech', en: 'Molotov', ko: '에너지 디퓨저' },
  'tech.soccer_ball': { category: 'tech', en: 'Soccer Ball', ko: '양자 편광판' },
  'tech.forcefield': { category: 'tech', en: 'Forcefield', ko: '에너지 수집기' },
  'tech.brick': { category: 'tech', en: 'Brick', ko: '중력 제어기' },
  'tech.rocket': { category: 'tech', en: 'Rocket', ko: '고성능 유지장치' },
  'tech.durian': { category: 'tech', en: 'Durian', ko: '나노 로봇' },
  'tech.guardian': { category: 'tech', en: 'Guardian', ko: '기계 골격 시스템' },
  'tech.boomerang': { category: 'tech', en: 'Boomerang', ko: '열전도 보조기' },

  // ───────── pet (9) ─────────
  'pet.rex': { category: 'pet', en: 'Rex', ko: 'Rex' },
  'pet.croaky': { category: 'pet', en: 'Croaky', ko: 'Croaky' },
  'pet.gary': { category: 'pet', en: 'Gary', ko: 'Gary' },
  'pet.capy': { category: 'pet', en: 'Capy', ko: 'Capy' },
  'pet.crucker': { category: 'pet', en: 'Clucker', ko: 'Clucker' },
  'pet.puffo': { category: 'pet', en: 'Puffo', ko: 'Puffo' },
  'pet.blizzblast': { category: 'pet', en: 'Blizzblast', ko: 'Blizzblast' },
  'pet.nutjob': { category: 'pet', en: 'Nutjob', ko: 'Nutjob' },
  'pet.gourmeow': { category: 'pet', en: 'Gourmeow', ko: 'Gourmeow' },

  // ───────── collectible (3) ─────────
  'collectible.impressionIdols': { category: 'collectible', en: 'Impression Idols', ko: 'Impression Idols' },
  'collectible.goldfinger': { category: 'collectible', en: 'Goldfinger', ko: 'Goldfinger' },
  'collectible.advanced_heart': { category: 'collectible', en: 'Advanced Collector Heart', ko: 'Advanced Collector Heart' },

  // ───────── mode (2) ─────────
  'mode.lme': { category: 'mode', en: 'Lunar Mine Expedition', ko: '달 광산 탐험 (LME)' },
  'mode.ee': { category: 'mode', en: "Ender's Echo", ko: '종말의 메아리 (EE)' },
};

// Helper: typed lookup
export function t(key: string, locale: 'en' | 'ko' = 'en'): string {
  const entry = TRANSLATION_DICTIONARY[key];
  if (!entry) return key;
  return entry[locale];
}
