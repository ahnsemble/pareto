export const EQUIPMENT_TOP3_SLOT_IDS = ['weapon', 'ring', 'necklace'] as const;
export type EquipmentSlotId = (typeof EQUIPMENT_TOP3_SLOT_IDS)[number];
export type EquipmentGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const EQUIPMENT_GRADE_KO: Record<EquipmentGrade, string> = {
  common: '커먼',
  uncommon: '언커먼',
  rare: '레어',
  epic: '에픽',
  legendary: '레전드',
  mythic: '미씩',
};

export interface EquipmentItem {
  id: string;
  name: string;
  nameKo: string;
  slot: EquipmentSlotId;
  grade: EquipmentGrade;
  statBonus: Record<string, number>;
}

export interface EquipmentSlot {
  id: EquipmentSlotId;
  label: string;
  labelKo: string;
  options: EquipmentItem[];
}

export const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  {
    id: 'weapon',
    label: 'Weapon',
    labelKo: '무기',
    options: [
      { id: 'kunai', name: 'Kunai', nameKo: '쿠나이', slot: 'weapon', grade: 'epic', statBonus: { atk: 0.15, atkSpeed: 0.08 } },
      { id: 'baseball-bat', name: 'Baseball Bat', nameKo: '야구 방망이', slot: 'weapon', grade: 'rare', statBonus: { atk: 0.12, critDamage: 0.10 } },
      { id: 'forcefield', name: 'Forcefield', nameKo: '포스필드', slot: 'weapon', grade: 'epic', statBonus: { atk: 0.10, def: 0.10 } },
      { id: 'lightchaser', name: 'Lightchaser', nameKo: '광속검', slot: 'weapon', grade: 'legendary', statBonus: { atk: 0.20, critRate: 0.12 } },
      { id: 'destroyer', name: 'Destroyer', nameKo: '파괴자', slot: 'weapon', grade: 'mythic', statBonus: { atk: 0.30, critDamage: 0.20 } },
      { id: 'oracle-bell', name: 'Oracle Bell', nameKo: '오라클벨', slot: 'weapon', grade: 'legendary', statBonus: { atk: 0.18, hp: 0.08 } },
      { id: 'fuel-barrel', name: 'Fuel Barrel', nameKo: '연료통', slot: 'weapon', grade: 'rare', statBonus: { atk: 0.10, atkSpeed: 0.12 } },
      { id: 'shotgun', name: 'Shotgun', nameKo: '샷건', slot: 'weapon', grade: 'epic', statBonus: { atk: 0.16, critRate: 0.10 } },
      { id: 'rpg', name: 'RPG', nameKo: 'RPG', slot: 'weapon', grade: 'legendary', statBonus: { atk: 0.22, critDamage: 0.15 } },
      { id: 'drone', name: 'Drone', nameKo: '드론', slot: 'weapon', grade: 'epic', statBonus: { atk: 0.14, atkSpeed: 0.10 } },
    ],
  },
  {
    id: 'ring',
    label: 'Ring',
    labelKo: '반지',
    options: [
      { id: 'dragons-eye', name: "Dragon's Eye", nameKo: '용의눈', slot: 'ring', grade: 'legendary', statBonus: { critRate: 0.18, critDamage: 0.15 } },
      { id: 'rage-ring', name: 'Rage Ring', nameKo: '분노의반지', slot: 'ring', grade: 'epic', statBonus: { atk: 0.12, critDamage: 0.10 } },
      { id: 'hp-ring', name: 'Vital Ring', nameKo: '활력의반지', slot: 'ring', grade: 'rare', statBonus: { hp: 0.15, def: 0.05 } },
      { id: 'speed-ring', name: 'Swift Ring', nameKo: '신속의반지', slot: 'ring', grade: 'epic', statBonus: { atkSpeed: 0.15, moveSpeed: 0.10 } },
      { id: 'sharp-ring', name: 'Sharp Ring', nameKo: '예리의반지', slot: 'ring', grade: 'mythic', statBonus: { critRate: 0.22, atk: 0.10 } },
      { id: 'guardian-ring', name: 'Guardian Ring', nameKo: '수호의반지', slot: 'ring', grade: 'rare', statBonus: { def: 0.18, hp: 0.10 } },
      { id: 'storm-ring', name: 'Storm Ring', nameKo: '폭풍의반지', slot: 'ring', grade: 'legendary', statBonus: { atk: 0.16, atkSpeed: 0.10 } },
      { id: 'doom-ring', name: 'Doom Ring', nameKo: '파멸의반지', slot: 'ring', grade: 'mythic', statBonus: { critDamage: 0.25, atk: 0.08 } },
      { id: 'aegis-ring', name: 'Aegis Ring', nameKo: '아이기스반지', slot: 'ring', grade: 'epic', statBonus: { def: 0.12, hp: 0.12 } },
      { id: 'shadow-ring', name: 'Shadow Ring', nameKo: '그림자반지', slot: 'ring', grade: 'legendary', statBonus: { critRate: 0.15, moveSpeed: 0.10 } },
    ],
  },
  {
    id: 'necklace',
    label: 'Necklace',
    labelKo: '목걸이',
    options: [
      { id: 'snake-necklace', name: 'Snake Necklace', nameKo: '뱀목걸이', slot: 'necklace', grade: 'epic', statBonus: { critDamage: 0.18, atk: 0.08 } },
      { id: 'dragon-necklace', name: 'Dragon Necklace', nameKo: '용목걸이', slot: 'necklace', grade: 'legendary', statBonus: { atk: 0.15, critRate: 0.12 } },
      { id: 'phoenix-necklace', name: 'Phoenix Necklace', nameKo: '불사조목걸이', slot: 'necklace', grade: 'mythic', statBonus: { hp: 0.20, atk: 0.12 } },
      { id: 'wisdom-necklace', name: 'Wisdom Necklace', nameKo: '지혜의목걸이', slot: 'necklace', grade: 'epic', statBonus: { critRate: 0.14, atkSpeed: 0.08 } },
      { id: 'iron-necklace', name: 'Iron Necklace', nameKo: '강철목걸이', slot: 'necklace', grade: 'rare', statBonus: { def: 0.18, hp: 0.08 } },
      { id: 'thunder-necklace', name: 'Thunder Necklace', nameKo: '천둥목걸이', slot: 'necklace', grade: 'legendary', statBonus: { atk: 0.18, critDamage: 0.10 } },
      { id: 'tide-necklace', name: 'Tide Necklace', nameKo: '조수의목걸이', slot: 'necklace', grade: 'epic', statBonus: { hp: 0.15, def: 0.08 } },
      { id: 'flame-necklace', name: 'Flame Necklace', nameKo: '화염목걸이', slot: 'necklace', grade: 'mythic', statBonus: { atk: 0.25, critRate: 0.10 } },
      { id: 'frost-necklace', name: 'Frost Necklace', nameKo: '서리목걸이', slot: 'necklace', grade: 'rare', statBonus: { def: 0.12, atkSpeed: 0.10 } },
      { id: 'void-necklace', name: 'Void Necklace', nameKo: '공허목걸이', slot: 'necklace', grade: 'legendary', statBonus: { critDamage: 0.20, hp: 0.10 } },
    ],
  },
];

export type EquippedMap = Partial<Record<EquipmentSlotId, string>>;

export function equipmentDelta(equipped: EquippedMap): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = equipped[slot.id];
    if (!itemId) continue;
    const item = slot.options.find((o) => o.id === itemId);
    if (!item) continue;
    for (const [key, value] of Object.entries(item.statBonus)) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}
