export interface HeroOption {
  id: string;
  label: string;
  slotCount: number;
  includeBaseline: boolean;
  tradeoff: boolean;
  tagline: string;
}

export const HEROES: HeroOption[] = [
  {
    id: 'recruit',
    label: 'Recruit',
    slotCount: 4,
    includeBaseline: true,
    tradeoff: false,
    tagline: '4 slots · 16 combos — fastest smoke check',
  },
  {
    id: 'scout',
    label: 'Scout',
    slotCount: 6,
    includeBaseline: true,
    tradeoff: false,
    tagline: '6 slots · 64 combos — compact baseline/upgrade space',
  },
  {
    id: 'commando',
    label: 'Commando',
    slotCount: 8,
    includeBaseline: true,
    tradeoff: false,
    tagline: '8 slots · 256 combos — mid-size frontier',
  },
  {
    id: 'vanguard',
    label: 'Vanguard',
    slotCount: 10,
    includeBaseline: true,
    tradeoff: false,
    tagline: '10 slots · 1024 combos — wider frontier',
  },
  {
    id: 'overlord',
    label: 'Overlord',
    slotCount: 12,
    includeBaseline: true,
    tradeoff: false,
    tagline: '12 slots · 4096 combos — largest space',
  },
];

export interface CollectibleEntry {
  id: number;
  name: string;
  category: string;
}

const CATEGORY_NAMES = [
  'Strike',
  'Guard',
  'Surge',
  'Coil',
  'Anchor',
  'Halo',
  'Echo',
  'Vortex',
];

export const COLLECTIBLES: CollectibleEntry[] = Array.from({ length: 64 }, (_, i) => ({
  id: i,
  name: `${CATEGORY_NAMES[i % CATEGORY_NAMES.length]}-${String(i + 1).padStart(2, '0')}`,
  category: CATEGORY_NAMES[i % CATEGORY_NAMES.length],
}));
