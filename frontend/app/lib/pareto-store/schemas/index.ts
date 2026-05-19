import type {
  AstralForgeLevel,
  CollectibleItemSchema,
  CollectibleSetSchema,
  EvoTreeSkillSchema,
  HeroSchema,
  IsolatedAreaPendingSpec,
  IsolatedXenoTarget,
  LmeTurfMatrix,
  MountSchema,
  PetSchema,
  SSEquipmentState,
  SioStatSchema,
  TechModifierMatrix,
  TechPartSchema,
  WeaponSchema,
  XenoTriggerMatrix,
} from '../types';

const citation = (line: number) => `sio_tools_gt_master.md:${line}`;
const formulaCitation = (line: number) => `sio_tools_formulas_and_defaults.md:${line}`;

const idFromName = (name: string): string =>
  name
    .replace(/['!?]/g, '')
    .replace(/[^A-Za-z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase());

const baseSSCommon = {
  base_level: 1,
  astral_forge_eaf_level: 1 as AstralForgeLevel,
  astral_forge_vaf_level: 1 as AstralForgeLevel,
  cores_allocated_eternal: 0,
  cores_allocated_void: 0,
  astral_forge_effects: [],
  system_status: 'active' as const,
};

export const PET_SCHEMA_INDEX: PetSchema[] = [
  { id: 'rex', display_name_en: 'Rex', display_name_ko: 'Rex', slot: null, is_xeno: false, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(24)] },
  { id: 'croaky', display_name_en: 'Croaky', display_name_ko: 'Croaky', slot: null, is_xeno: false, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(25)] },
  { id: 'gary', display_name_en: 'Gary', display_name_ko: 'Gary', slot: null, is_xeno: false, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(26)] },
  { id: 'capy', display_name_en: 'Capy', display_name_ko: 'Capy', slot: null, is_xeno: true, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(27)] },
  { id: 'crucker', display_name_en: 'Clucker', display_name_ko: 'Clucker', slot: null, is_xeno: true, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(28)] },
  { id: 'puffo', display_name_en: 'Puffo', display_name_ko: 'Puffo', slot: null, is_xeno: true, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(29)] },
  { id: 'blizzblast', display_name_en: 'Blizzblast', display_name_ko: 'Blizzblast', slot: null, is_xeno: true, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(30)] },
  { id: 'nutjob', display_name_en: 'Nutjob', display_name_ko: 'Nutjob', slot: null, is_xeno: true, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(31)] },
  { id: 'gourmeow', display_name_en: 'Gourmeow', display_name_ko: 'Gourmeow', slot: null, is_xeno: false, resonance_chance: 0, resonance_atk: 0, assist_filter: [], source_citations: [citation(32)] },
];

const hero = (id: HeroSchema['id'], display: string, role: HeroSchema['role'], extra: Partial<HeroSchema> = {}): HeroSchema => ({
  id,
  display_name_en: display,
  display_name_ko: display,
  tier: extra.tier ?? 'A',
  role,
  star_effects: extra.star_effects ?? [],
  awakening_effects: extra.awakening_effects ?? [],
  synergy_modifier: extra.synergy_modifier ?? [],
  global_passive_lv40: extra.global_passive_lv40 ?? null,
  global_passive_lv80: extra.global_passive_lv80 ?? null,
  teamwork_passives: extra.teamwork_passives ?? [],
  note: extra.note,
  source_citations: extra.source_citations ?? [citation(45), formulaCitation(297)],
});

export const HERO_SCHEMA_INDEX: HeroSchema[] = [
  hero('common', 'Common', 'global_passive_holder', { tier: 'C', source_citations: [citation(46), formulaCitation(298)] }),
  hero('king', 'King', 'main_dps', { tier: 'A', source_citations: [citation(47), formulaCitation(299)] }),
  hero('masterYang', 'Master Yang', 'main_dps', { tier: 'A+', source_citations: [citation(48), formulaCitation(300)] }),
  hero('metalia', 'Metalia', 'conditional_dps', { tier: 'A+', source_citations: [citation(49), formulaCitation(301)] }),
  hero('joey', 'Joey', 'buffer', { tier: 'A', source_citations: [citation(50), formulaCitation(302)] }),
  hero('taloxa', 'Taloxa', 'conditional_dps', { tier: 'S', source_citations: [citation(51), formulaCitation(303)] }),
  hero('venato', 'Venato', 'conditional_dps', {
    tier: 'S',
    star_effects: [
      { star: 1, effect_id: 'venatoAdrenalineUnlock', condition: 'skill_active_window', stat_channel: 'adrenaline', description: 'Adrenaline unlock', source_citation: formulaCitation(297) },
    ],
    source_citations: [citation(52), formulaCitation(304)],
  }),
  hero('worm', 'Worm', 'buffer', {
    tier: 'B+',
    note: 'passives activate only when fewer than 3 monsters are on the map',
    source_citations: [citation(55), formulaCitation(314)],
  }),
  hero('april', 'April', 'global_passive_holder', { tier: 'B', source_citations: [formulaCitation(305)] }),
  hero('splinter', 'Splinter', 'global_passive_holder', { tier: 'B', source_citations: [formulaCitation(306)] }),
  hero('raphael', 'Raphael', 'main_dps', { tier: 'B', source_citations: [formulaCitation(307)] }),
  hero('donatello', 'Donatello', 'buffer', { tier: 'B', source_citations: [formulaCitation(308)] }),
  hero('tsukuyomi', 'Tsukuyomi', 'main_dps', { tier: 'B', source_citations: [formulaCitation(309)] }),
  hero('wesson', 'Wesson', 'global_passive_holder', { tier: 'C+', source_citations: [formulaCitation(310)] }),
  hero('catnips', 'Catnips', 'survival', { tier: 'C+', source_citations: [formulaCitation(311)] }),
];

export const SS_EQUIPMENT_SCHEMA_INDEX: SSEquipmentState[] = [
  { ...baseSSCommon, id: 'twinLance', display_name_en: 'Twin Lance', display_name_ko: 'Twin Lance', slot: 'weapon', enhancement_system: 'xeno_transmute', xeno_transmute_level: 0, xeno_transmute_stage_effects: [], source_citations: [citation(76)] },
  { ...baseSSCommon, id: 'eternalSuit', display_name_en: 'Eternal Suit', display_name_ko: 'Eternal Suit', slot: 'armor', enhancement_system: 'astral_forge_only', source_citations: [citation(70)] },
  { ...baseSSCommon, id: 'evervoidArmor', display_name_en: 'Evervoid Armor', display_name_ko: 'Evervoid Armor', slot: 'armor', enhancement_system: 'astral_forge_only', source_citations: [citation(71)] },
  { ...baseSSCommon, id: 'judgmentNecklace', display_name_en: 'Judgment Necklace', display_name_ko: 'Judgment Necklace', slot: 'necklace', enhancement_system: 'chaos_fusion', chaos_fusion_level: 0, source_citations: [citation(73)] },
  { ...baseSSCommon, id: 'voidwakerEmblem', display_name_en: 'Voidwaker Emblem', display_name_ko: 'Voidwaker Emblem', slot: 'necklace', enhancement_system: 'chaos_fusion', chaos_fusion_level: 0, source_citations: [citation(78)] },
  { ...baseSSCommon, id: 'twistingBelt', display_name_en: 'Twisting Belt', display_name_ko: 'Twisting Belt', slot: 'belt', enhancement_system: 'astral_forge_only', source_citations: [citation(77)] },
  { ...baseSSCommon, id: 'stardustSash', display_name_en: 'Stardust Sash', display_name_ko: 'Stardust Sash', slot: 'belt', enhancement_system: 'astral_forge_only', source_citations: [citation(75)] },
  { ...baseSSCommon, id: 'moonscarBracer', display_name_en: 'Moonscar Bracer', display_name_ko: 'Moonscar Bracer', slot: 'gloves', enhancement_system: 'chaos_fusion', chaos_fusion_level: 0, source_citations: [citation(74)] },
  { ...baseSSCommon, id: 'voidwakerHandguards', display_name_en: 'Voidwaker Handguards', display_name_ko: 'Voidwaker Handguards', slot: 'gloves', enhancement_system: 'chaos_fusion', chaos_fusion_level: 0, source_citations: [citation(79)] },
  { ...baseSSCommon, id: 'glacialWarboots', display_name_en: 'Glacial Warboots', display_name_ko: 'Glacial Warboots', slot: 'boots', enhancement_system: 'chaos_fusion', chaos_fusion_level: 0, source_citations: [citation(72)] },
  { ...baseSSCommon, id: 'voidwakerTreads', display_name_en: 'Voidwaker Treads', display_name_ko: 'Voidwaker Treads', slot: 'boots', enhancement_system: 'chaos_fusion', chaos_fusion_level: 0, source_citations: [citation(80)] },
];

export const INITIAL_SS_EQUIPMENT = SS_EQUIPMENT_SCHEMA_INDEX;

const weapon = (id: string, display: string): WeaponSchema => ({
  id,
  display_name_en: display,
  display_name_ko: display,
  rarity_group: id === 'twinLance' ? 'ss' : id === 'voidPower' || id === 'swordOfDisorder' || id === 'lightchaser' ? 's_grade' : 'normal',
  evolution_grade: id === 'twinLance' ? 'ss' : 'legend',
  astral_forge_eaf_level: 0,
  astral_forge_vaf_level: 0,
  eaf_effects: [],
  vaf_effects: [],
  source_citations: [citation(64)],
});

export const WEAPON_SCHEMA_INDEX: WeaponSchema[] = [
  weapon('twinLance', 'Twin Lance'),
  weapon('voidPower', 'Void Power'),
  weapon('swordOfDisorder', 'Sword of Disorder'),
  weapon('lightchaser', 'Lightchaser'),
  weapon('kunai', 'Kunai'),
  weapon('baseballBat', 'Baseball Bat'),
  weapon('katana', 'Katana'),
  weapon('shotgun', 'Shotgun'),
  weapon('revolver', 'Revolver'),
];

const tech = (id: string, display: string, category: NonNullable<TechPartSchema['category']>, sourceLine: number, baseSkillId?: string): TechPartSchema => ({
  id,
  display_name_en: display,
  display_name_ko: display,
  category,
  base_skill_id: baseSkillId,
  equipped_slot: null,
  evolution_grade: 'eternal',
  is_twinborn: category === 'twinborn',
  twinborn_components: [],
  resonance_chip_allocated: 0,
  stat_channels: category === 'activeSkill' || category === 'modeVariant' ? ['skillDamage'] : ['resonanceMultiplier'],
  source_citations: [citation(sourceLine)],
});

export const TECH_TWINBORN_PARTS: TechPartSchema[] = [
  tech('energyGuidanceSystem', 'Energy Guidance System', 'twinborn', 98),
  tech('antimatterMaintainer', 'Antimatter Maintainer', 'twinborn', 99),
  tech('quantumNanobot', 'Quantum Nanobot', 'twinborn', 100),
  tech('phaseDriver', 'Phase Driver', 'twinborn', 101),
  tech('energyDiffuser', 'Energy Diffuser', 'twinborn', 102),
  tech('hiMaintainer', 'Hi-Maintainer', 'twinborn', 103),
  tech('precisionDevice', 'Precision Device', 'twinborn', 104),
  tech('antimatterGenerator', 'Antimatter Generator', 'twinborn', 105),
  tech('exoRadicator', 'Exo-radicator', 'twinborn', 106),
  tech('hiGravityPulser', 'Hi-Gravity Pulser', 'twinborn', 107),
];

export const TECH_ACTIVE_SKILLS: TechPartSchema[] = [
  tech('drone', 'Drone', 'activeSkill', 109),
  tech('molotov', 'Molotov', 'activeSkill', 109),
  tech('drill', 'Drill', 'activeSkill', 109),
  tech('rocket', 'Rocket', 'activeSkill', 109),
  tech('durian', 'Durian', 'activeSkill', 109),
  tech('soccer', 'Soccer', 'activeSkill', 109),
  tech('forcefield', 'Forcefield', 'activeSkill', 109),
  tech('drillShot', 'Drill Shot', 'activeSkill', 109),
  tech('lightning', 'Lightning', 'activeSkill', 109),
  tech('boomerang', 'Boomerang', 'activeSkill', 109),
  tech('energyCube', 'Energy Cube', 'activeSkill', 109),
  tech('hpBullet', 'HP Bullet', 'activeSkill', 109),
  tech('exoBracer', 'Exo Bracer', 'activeSkill', 109),
  tech('ammoThruster', 'Ammo Thruster', 'activeSkill', 109),
  tech('heFuel', 'HE Fuel', 'activeSkill', 109),
  tech('guardian', 'Guardian', 'activeSkill', 109),
  tech('laser', 'Laser', 'activeSkill', 109),
  tech('brick', 'Brick', 'activeSkill', 109),
];

export const TECH_MODE_VARIANTS: TechPartSchema[] = [
  tech('molotovMode', 'Molotov Mode', 'modeVariant', 112, 'molotov'),
  tech('durianMode', 'Durian Mode', 'modeVariant', 112, 'durian'),
  tech('soccerMode', 'Soccer Mode', 'modeVariant', 112, 'soccer'),
  tech('droneMode', 'Drone Mode', 'modeVariant', 112, 'drone'),
  tech('forcefieldMode', 'Forcefield Mode', 'modeVariant', 112, 'forcefield'),
  tech('drillShotMode', 'Drill Shot Mode', 'modeVariant', 112, 'drillShot'),
  tech('rocketMode', 'Rocket Mode', 'modeVariant', 112, 'rocket'),
  tech('lightningMode', 'Lightning Mode', 'modeVariant', 112, 'lightning'),
  tech('boomerangMode', 'Boomerang Mode', 'modeVariant', 112, 'boomerang'),
  tech('guardianMode', 'Guardian Mode', 'modeVariant', 112, 'guardian'),
  tech('laserMode', 'Laser Mode', 'modeVariant', 112, 'laser'),
  tech('brickMode', 'Brick Mode', 'modeVariant', 112, 'brick'),
];

export const TECH_PART_SCHEMA_INDEX: TechPartSchema[] = [
  ...TECH_TWINBORN_PARTS,
  ...TECH_ACTIVE_SKILLS,
  ...TECH_MODE_VARIANTS,
];

export const TECH_MODIFIER_MATRIX: TechModifierMatrix = {
  exoBracer: { ssWeapon: -0.025, lightningMode: -0.0177, drill: 0.3636, drillShotMode: 0.3636, rocket: 0.0583, rocketMode: 0.0583, molotov: 0.1, soccerMode: 0.1934, laserMode: 1.0 },
  ammoThruster: { ssWeapon: 0.025, drone: 0.1111, lightningMode: 0.0267, drill: 0.3922, drillShotMode: 0.3922, rocket: 0.065, rocketMode: 0.065, soccerMode: 0.1116, laserMode: 1.0 },
  heFuel: { ssWeapon: 0.03, drone: 0.0783, molotov: 0.8, durianMode: 0.1667, soccerMode: 0.02, boomerangMode: 0.0617, laserMode: 1.0 },
  energyCube: { ssWeapon: 1.0, lightningMode: 1.0, rocket: 1.0, rocketMode: 1.0, molotov: 1.0, molotovMode: 1.0, durianMode: 1.0, soccerMode: 1.0, boomerangMode: 1.0, guardianMode: 1.0, laserMode: 1.0, brickMode: 1.0 },
};

export const MOUNT_SCHEMA_INDEX: MountSchema[] = [
  { id: 'doomsteed', display_name_en: 'Doomsteed', display_name_ko: 'Doomsteed', source_citations: [citation(176)] },
  { id: 'electricScooter', display_name_en: 'Electric Scooter', display_name_ko: 'Electric Scooter', source_citations: [citation(177)] },
  { id: 'techHoverboard', display_name_en: 'Tech Hoverboard', display_name_ko: 'Tech Hoverboard', source_citations: [citation(178)] },
];

export const EVOTREE_SKILL_SCHEMA_INDEX: EvoTreeSkillSchema[] = [
  { id: 'exposeWeakness', display_name_en: 'Expose Weakness', display_name_ko: 'Expose Weakness', enabled_by_default: true, source_citations: [citation(186), formulaCitation(333)] },
  { id: 'vivaLaMateria', display_name_en: 'Viva la Materia', display_name_ko: 'Viva la Materia', enabled_by_default: true, source_citations: [citation(187), formulaCitation(334)] },
  { id: 'watchmaker', display_name_en: 'Watchmaker', display_name_ko: 'Watchmaker', enabled_by_default: true, source_citations: [citation(188), formulaCitation(335)] },
  { id: 'overreaction', display_name_en: 'Overreaction', display_name_ko: 'Overreaction', enabled_by_default: true, source_citations: [citation(189), formulaCitation(336)] },
];

const collectibleItemNames = [
  'Atomic Mech', 'Time Essence Bottle', 'Life Hourglass', 'Dimension Foil', 'Super Circuit Board', 'Comms Conch',
  'Memory Editor', 'Temporal Rewinder', 'Spatial Rewinder', 'Holodream Fluid', 'Dragon Tooth', 'Hyper Neuron',
  'Cyber Totem', 'Dreamscape Puzzle', 'Gene Splicer', 'Instellar Transition Matrix Design', 'High-Lat Energy Cube',
  'Mental Sync Helm', 'Dice of Destiny', 'Hydraulic Flipper', 'Klein Bottle', 'Wildfire Furnace', 'Wormhole Detector',
  'Mini Dyson Sphere', 'Star-Rail Passenger Card', 'Shuttle Capsule', 'Neurochip', 'Anti-Gravity Device',
  'Portable Mech Case', 'Dark Matter Construct', 'Timeline Cube', 'Omni-Symbiote', 'Plasma Sword', 'Geocore Orb',
  'Aquacore Orb', 'Pyrocore Orb', 'Aerocore Orb', 'Nuclear Battery', 'Old Medical Book', "Savior's Memento",
  'Tablet of Epics', 'Primordial War Drum', 'Flaming Plume', 'Astral Dewdrop', 'Antiparticle Gourd',
  'Micro Artificial Sun', 'Nano-Mimetic Mask', 'Clone Mirror', 'Cosmic Compass', 'Infinity Score',
  'Angelic Tear Crystal', 'Otherworld Key', 'Human Genome Mapping', 'Book of Ancient Wisdom', 'Starcore Diamond',
  'Immortal Lucky Coin', "Unicorn's Horn", 'Void Bloom', 'Eye of True Vision', 'Mystical Halo', 'Lucky Charm',
  "Prophet's Tarot", 'Golden Cutlery', 'Safehouse Map', "Scientific Luminary's Journal", 'Golden Horn',
  'Elemental Ring', 'Superhuman Pill', 'Aquarius Starlight', 'Pisces Starlight', 'Aries Starlight',
  'Taurus Starlight', 'Gemini Starlight', 'Cancer Starlight', 'Leo Starlight', 'Virgo Starlight',
  'Libra Starlight', 'Scorpio Starlight', 'Sagittarius Starlight', 'Capricorn Starlight',
];

export const COLLECTIBLE_EVENT_SLOTS: CollectibleItemSchema[] = Array.from({ length: 42 }, (_, index) => {
  const n = index + 1;
  return {
    id: `event${n}`,
    display_name_en: `Event ${n}`,
    display_name_ko: `Event ${n}`,
    source_citations: [formulaCitation(392)],
  };
});

export const COLLECTIBLE_ITEM_INDEX: CollectibleItemSchema[] = [
  ...collectibleItemNames.map((name) => ({ id: idFromName(name), display_name_en: name, display_name_ko: name, source_citations: [citation(378), formulaCitation(380)] })),
  ...COLLECTIBLE_EVENT_SLOTS,
];

const set = (name: string, collectibleCount: 3 | 4, itemNames: string[], line: number): CollectibleSetSchema => ({
  id: idFromName(name),
  display_name_en: name,
  display_name_ko: name,
  collectible_count: collectibleCount,
  item_ids: itemNames.map(idFromName),
  gold_stars: 0,
  red_stars: 0,
  source_citations: [citation(line), formulaCitation(456)],
});

export const COLLECTIBLE_SET_INDEX: CollectibleSetSchema[] = [
  set('Impression Idols', 4, ['Nano-Mimetic Mask', 'Clone Mirror', 'Cosmic Compass', 'Infinity Score'], 336),
  set('Open Void Gate', 4, ['Angelic Tear Crystal', 'Otherworld Key', 'Micro Artificial Sun', 'Antiparticle Gourd'], 337),
  set('Close to Creation', 4, ['Atomic Mech', 'Time Essence Bottle', 'Micro Artificial Sun', 'Antiparticle Gourd'], 338),
  set('Hyperrift Tech', 4, ['Life Hourglass', 'Dimension Foil', 'Super Circuit Board', 'Comms Conch'], 339),
  set('Realizing Childhood Dreams', 4, ['Memory Editor', 'Temporal Rewinder', 'Spatial Rewinder', 'Holodream Fluid'], 340),
  set('Summon the Divine Dragon', 4, ['Atomic Mech', 'Time Essence Bottle', 'Dragon Tooth', 'Hyper Neuron'], 341),
  set('Erudite Heirloom', 4, ['Human Genome Mapping', 'Book of Ancient Wisdom', 'Otherworld Key', 'Starcore Diamond'], 342),
  set('Conduct Experiments', 4, ['Cyber Totem', 'Clone Mirror', 'Dreamscape Puzzle', 'Gene Splicer'], 343),
  set('Otherworld Treasure', 4, ['Immortal Lucky Coin', 'Instellar Transition Matrix Design', 'Angelic Tear Crystal', "Unicorn's Horn"], 344),
  set('Meaning of Life', 4, ['High-Lat Energy Cube', 'Void Bloom', 'Eye of True Vision', 'Life Hourglass'], 345),
  set('Interdimension Movement', 4, ['Nano-Mimetic Mask', 'Dice of Destiny', 'Dimension Foil', 'Mental Sync Helm'], 346),
  set('Transgalactic Tentacle', 4, ['Instellar Transition Matrix Design', 'Hyper Neuron', 'Hydraulic Flipper', 'Klein Bottle'], 347),
  set('Multiverse Perspective', 4, ['Eye of True Vision', 'Dreamscape Puzzle', 'Wildfire Furnace', 'Wormhole Detector'], 348),
  set("Rewriting the Stars' Memories", 4, ['Starcore Diamond', 'Memory Editor', 'Mini Dyson Sphere', 'Star-Rail Passenger Card'], 349),
  set('Goldfinger', 4, ['Dice of Destiny', 'Spatial Rewinder', 'Shuttle Capsule', 'Neurochip'], 350),
  set('Cyber Wonderland', 4, ["Unicorn's Horn", 'Spatial Rewinder', 'Anti-Gravity Device', 'Portable Mech Case'], 351),
  set('Summon the Stand-in!', 4, ['Dark Matter Construct', 'Timeline Cube', 'Omni-Symbiote', "Prophet's Tarot"], 352),
  set('Try all possibilities', 4, ['Atomic Mech', 'Timeline Cube', 'Plasma Sword', 'Geocore Orb'], 353),
  set('Brewing Recipe', 4, ['Time Essence Bottle', 'Omni-Symbiote', 'Nuclear Battery', 'Aquacore Orb'], 354),
  set('Wind Totem', 4, ['Cyber Totem', "Prophet's Tarot", 'Mystical Halo', 'Aerocore Orb'], 355),
  set('When Cosmic Stars Shine', 4, ['Aquarius Starlight', 'Pisces Starlight', 'Aries Starlight', 'Taurus Starlight'], 356),
  set('Genesis', 3, ['Human Genome Mapping', 'Old Medical Book', "Savior's Memento"], 359),
  set('Luck Through the Roof', 3, ['Immortal Lucky Coin', 'Lucky Charm', 'Mystical Halo'], 360),
  set('First Myth', 3, ['Angelic Tear Crystal', 'Tablet of Epics', 'Primordial War Drum'], 361),
  set('Parallel Dimension', 3, ['Otherworld Key', 'Flaming Plume', 'Astral Dewdrop'], 362),
  set('Uncontrollable Superpower', 3, ['High-Lat Energy Cube', 'Nuclear Battery', 'Plasma Sword'], 363),
  set('Just Enough to Ignore the Fog', 3, ['Eye of True Vision', 'Nuclear Battery', 'Plasma Sword'], 364),
  set('Merfolk Disguise Attempt', 3, ['Nano-Mimetic Mask', 'Hydraulic Flipper', 'Comms Conch'], 365),
  set('Drones are Safest', 3, ['Mental Sync Helm', 'Hydraulic Flipper', 'Comms Conch'], 366),
  set('Unbreakable', 3, ['Dragon Tooth', 'Mini Dyson Sphere', 'Micro Artificial Sun'], 367),
  set('Extraterrestrial Ritual', 3, ['Cyber Totem', 'Wildfire Furnace', 'Infinity Score'], 368),
  set('Dreamseeker Voyage', 3, ['Dreamscape Puzzle', 'Wildfire Furnace', 'Infinity Score'], 369),
  set('Deleted Memories', 3, ['Memory Editor', 'Shuttle Capsule', 'Neurochip'], 370),
  set('Inescapable', 3, ['Spatial Rewinder', 'Shuttle Capsule', 'Neurochip'], 371),
  set('Dream or Reality?', 3, ['Dark Matter Construct', 'Geocore Orb', 'Aquacore Orb'], 372),
  set('Life Reboot Device', 3, ['Omni-Symbiote', 'Geocore Orb', 'Aquacore Orb'], 373),
  set('Corner of the Universe I', 3, ['Aquarius Starlight', 'Gemini Starlight', 'Cancer Starlight'], 374),
  set('Corner of the Universe III', 3, ['Aries Starlight', 'Gemini Starlight', 'Cancer Starlight'], 375),
];

export const COLLECTIBLE_EDITION_SCHEMA_INDEX = COLLECTIBLE_SET_INDEX;

const statKeys = [
  'critRate', 'critDamage', 'skillDamage', 'vulnerability', 'shieldDamage', 'shieldDamageUptime', 'poisoned',
  'poisonedUptime', 'metaliaPoisoned', 'weakened', 'weakenedUptime', 'chilled', 'chilledUptime', 'metaliaChilled',
  'exposedDamage', 'clarity', 'eternalMultiplier', 'glacialBloodline', 'laceration', 'lacerationUptime',
  'cooldownReduction', 'joeyWeakSpot', 'flashriftRip', 'flashriftRipFinal', 'flashriftRipEfficiency', 'ssGlovesLaser',
  'taloxaMaxSync', 'taloxaSyncLoss', 'taloxaOverloadEff', 'taloxaOverload', 'taloxaBeam', 'eternalSuitBoost',
  'voidNeckBoost', 'voidNeckBoostUptime', 'voidGlovesInstakill', 'voidBootsBoost', 'chaosBeltBoost', 'minEnergyFlux',
  'maxEnergyFlux', 'hpBulletBoost', 'damageDealt', 'damageTransmute', 'damageBoss', 'harmonyCommon', 'harmonyKing',
  'harmonyYang', 'harmonyMetalia', 'harmonyJoey', 'harmonyTaloxa', 'ssMiscPath', 'resonanceMultiplier',
  'xenoDamage', 'xenoSyncRate', 'xenoResChance', 'xenoResDamage', 'xenoResMultiplier', 'xenoResDuration',
  'damageFactor', 'atkEquip', 'atkEquipPercent', 'atkPercent', 'atkFinal', 'atkHero', 'atkHeroPercent',
  'xenoSkillDamage', 'lme1Damage', 'adrenaline', 'crimsonBat', 'mountDamage', 'divineFire', 'divineFireUptime',
];

export const SIO_UPTIME_STAT_KEYS = ['vulnerability', 'chilledUptime', 'weakenedUptime', 'poisonedUptime', 'lacerationUptime', 'divineFireUptime'] as const;

export const SIO_STATS_FIXED_ORDER: SioStatSchema[] = statKeys.map((key, index) => ({
  index,
  key,
  uptime_based: (SIO_UPTIME_STAT_KEYS as readonly string[]).includes(key),
}));

export const XENO_TRIGGER_MATRIX: XenoTriggerMatrix = {
  weapon: [
    { level: 1, trigger: '50 Void Power hits', cooldown_seconds: 15 },
    { level: 6, trigger: '100 Drone hits', cooldown_seconds: 10 },
    { level: 10, trigger: '20 Overload triggers', cooldown_seconds: 10 },
  ],
  armor: [
    { level: 1, trigger: 'Max Shield +30%', cooldown_seconds: 15 },
    { level: 6, trigger: '10 Lightning hits', cooldown_seconds: 10 },
    { level: 10, trigger: '+60% Shield', cooldown_seconds: 10 },
  ],
  necklace: [
    { level: 1, trigger: 'Fury active, 500 hits', cooldown_seconds: 15 },
    { level: 6, trigger: '10 Durian hits', cooldown_seconds: 10 },
    { level: 10, trigger: 'Lv.20+, 300 hits', cooldown_seconds: 10 },
  ],
};

export const OPTIMIZER_SCHEMAS = {
  items: {
    targetCores: 'number',
    transmuteCores: 'number',
    advanced: [
      'limitE',
      'limitV',
      'limitC',
      'limitMinCores',
      'limitMinTransmuteCores',
      'transmuteExchange',
      'transmuteBuy',
      'transmuteSell',
    ],
    entryState: ['enabled', 'disabled', 'support'],
    entryBounds: ['e', 'v', 'c', 'x', 'base'],
  },
  techs: {
    strategy: ['optimize', 'legend', 'eternal', 'selector', 'downgrade'],
    speedMode: ['fast', 'normal', 'precise', 'precise+', 'full'],
    fodder: ['excess', 'manual', 'smart'],
    overload: ['excess', 'full'],
    limit: ['basic', 'advanced'],
    modeEntryBounds: ['minResonance', 'maxResonance', 'minOverload', 'maxOverload'],
    skillsMapState: ['disabled', 'enabled', 'preferred'],
  },
  heroes: {
    mainHeroes: 'hero keyed enabled/max map',
    minCores: 'number',
    targetCores: 'number',
    targetShards: 'number',
    synergyLimit: 'number',
    entries: 'hero keyed entry map',
  },
} as const;

export const LME_TURF_MATRIX_SCHEMA: LmeTurfMatrix = {
  matrix_id: 'lme_hex_turf_v3',
  nodes: [],
  boss_phase_1_weight: 1.0,
  boss_phase_2_weight: 1.0,
  battle_phase_weight: 1.0,
  expedition_phase_weight: 1.0,
};

export const ISOLATED_XENO_PENDING_SPECS: Record<IsolatedXenoTarget, IsolatedAreaPendingSpec> = {
  judgment_necklace_future_xeno: {
    target_id: 'judgment_necklace_future_xeno',
    active_in_formula: false,
    xeno_transmute_level: 0,
    xeno_transmute_stage_effects: [],
    runtime_input_enabled: true,
    ui_empty_state_key: 'ui_label.future_update',
  },
  twin_lance_xeno_effect_table: {
    target_id: 'twin_lance_xeno_effect_table',
    active_in_formula: false,
    xeno_transmute_level: 0,
    xeno_transmute_stage_effects: [],
    runtime_input_enabled: true,
    ui_empty_state_key: 'ui_label.future_update',
  },
};
