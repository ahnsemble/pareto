export const PET_STATE_IDS = ['early', 'mid', 'endgame'] as const;
export type PetStateId = (typeof PET_STATE_IDS)[number];

export const PET_STATE_MULTIPLIERS: Record<PetStateId, number> = {
  early: 1.0,
  mid: 1.45,
  endgame: 2.05,
};

export type PetElement = 'fire' | 'ice' | 'lightning' | 'poison' | 'light' | 'dark';

export interface PetOption {
  id: string;
  name: string;
  nameKo: string;
  element: PetElement;
  elementKo: string;
  baseStats: Record<string, number>;
  taglineKo: string;
}

export const PETS: PetOption[] = [
  { id: 'rex', name: 'Rex', nameKo: '렉스', element: 'fire', elementKo: '불', baseStats: { atk: 0.12, hp: 0.08 }, taglineKo: '공격력 +12%, 체력 +8%' },
  { id: 'frost-fox', name: 'Frost Fox', nameKo: '서리여우', element: 'ice', elementKo: '얼음', baseStats: { def: 0.15, hp: 0.10 }, taglineKo: '방어력 +15%, 체력 +10%' },
  { id: 'volt-cat', name: 'Volt Cat', nameKo: '전기고양이', element: 'lightning', elementKo: '전기', baseStats: { atkSpeed: 0.18, critRate: 0.08 }, taglineKo: '공속 +18%, 치명 +8%' },
  { id: 'venom', name: 'Venom', nameKo: '베놈', element: 'poison', elementKo: '독', baseStats: { atk: 0.10, critDamage: 0.10 }, taglineKo: '공격력 +10%, 치명피해 +10%' },
  { id: 'lumen', name: 'Lumen', nameKo: '루멘', element: 'light', elementKo: '빛', baseStats: { hp: 0.15, def: 0.08 }, taglineKo: '체력 +15%, 방어력 +8%' },
  { id: 'shadow-wolf', name: 'Shadow Wolf', nameKo: '그림자늑대', element: 'dark', elementKo: '어둠', baseStats: { critRate: 0.12, moveSpeed: 0.10 }, taglineKo: '치명 +12%, 이동속도 +10%' },
  { id: 'pyra', name: 'Pyra', nameKo: '파이라', element: 'fire', elementKo: '불', baseStats: { atk: 0.15, critDamage: 0.08 }, taglineKo: '공격력 +15%, 치명피해 +8%' },
  { id: 'snowball', name: 'Snowball', nameKo: '스노볼', element: 'ice', elementKo: '얼음', baseStats: { def: 0.12, atk: 0.05 }, taglineKo: '방어력 +12%, 공격력 +5%' },
  { id: 'volt-dog', name: 'Volt Dog', nameKo: '전기견', element: 'lightning', elementKo: '전기', baseStats: { atk: 0.10, atkSpeed: 0.10 }, taglineKo: '공격력 +10%, 공속 +10%' },
  { id: 'serpent', name: 'Serpent', nameKo: '서펜트', element: 'poison', elementKo: '독', baseStats: { critRate: 0.10, atk: 0.08 }, taglineKo: '치명 +10%, 공격력 +8%' },
  { id: 'angel', name: 'Angel', nameKo: '엔젤', element: 'light', elementKo: '빛', baseStats: { hp: 0.12, critRate: 0.05 }, taglineKo: '체력 +12%, 치명 +5%' },
  { id: 'umbra', name: 'Umbra', nameKo: '엄브라', element: 'dark', elementKo: '어둠', baseStats: { atk: 0.13, critDamage: 0.12 }, taglineKo: '공격력 +13%, 치명피해 +12%' },
  { id: 'griff', name: 'Griff', nameKo: '그리프', element: 'fire', elementKo: '불', baseStats: { atk: 0.14, def: 0.06 }, taglineKo: '공격력 +14%, 방어력 +6%' },
  { id: 'kelpie', name: 'Kelpie', nameKo: '켈피', element: 'ice', elementKo: '얼음', baseStats: { hp: 0.10, atkSpeed: 0.08 }, taglineKo: '체력 +10%, 공속 +8%' },
  { id: 'tempest', name: 'Tempest', nameKo: '템페스트', element: 'lightning', elementKo: '전기', baseStats: { atk: 0.16, atkSpeed: 0.12 }, taglineKo: '공격력 +16%, 공속 +12%' },
];

export interface PetSelection {
  id: string;
  state: PetStateId;
}

export function petDelta(selection: PetSelection | null): Record<string, number> {
  if (!selection) return {};
  const pet = PETS.find((p) => p.id === selection.id);
  if (!pet) return {};
  const mult = PET_STATE_MULTIPLIERS[selection.state];
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(pet.baseStats)) {
    out[key] = value * mult;
  }
  return out;
}
