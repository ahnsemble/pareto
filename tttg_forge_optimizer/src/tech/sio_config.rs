use std::collections::{BTreeMap, BTreeSet};

use serde_json::{json, Map, Value};

const RARITY_INPUT_ORDER: [&str; 10] = [
    "Eternal", "Legend4", "Legend3", "Legend2", "Legend1", "Legend", "Epic3", "Epic2", "Epic1",
    "Epic",
];

const COMPACT_CONFIG_SKILL_ORDER: [&str; 21] = [
    "Energy Cube",
    "HP Bullet",
    "Exo Bracer",
    "Ammo Thruster",
    "HE Fuel",
    "Drone Mode",
    "Forcefield Mode",
    "Drill Shot Mode",
    "Rocket Mode",
    "Soccer Mode",
    "Durian Mode",
    "Lightning Mode",
    "Boomerang Mode",
    "Guardian Mode",
    "Laser Mode",
    "Molotov",
    "Rocket",
    "Drone",
    "Drill",
    "Brick Mode",
    "Molotov Mode",
];

const LIVE_MODE_ORDER: [&str; 16] = [
    "Drone Mode",
    "Forcefield Mode",
    "Drill Shot Mode",
    "Rocket Mode",
    "Soccer Mode",
    "Durian Mode",
    "Lightning Mode",
    "Boomerang Mode",
    "Guardian Mode",
    "Laser Mode",
    "Brick Mode",
    "Molotov Mode",
    "Molotov",
    "Rocket",
    "Drone",
    "Drill",
];

const COMPACT_CONFIG_MODE_ORDER: [&str; 16] = [
    "Drone Mode",
    "Forcefield Mode",
    "Drill Shot Mode",
    "Rocket Mode",
    "Soccer Mode",
    "Durian Mode",
    "Lightning Mode",
    "Boomerang Mode",
    "Guardian Mode",
    "Laser Mode",
    "Molotov",
    "Rocket",
    "Drone",
    "Drill",
    "Brick Mode",
    "Molotov Mode",
];

const SKILLS_MAP_STATUS_ORDER: [&str; 3] = ["enabled", "forced", "disabled"];

const SURVIVOR_ORDER: [&str; 22] = [
    "Common",
    "Tsukuyomi",
    "Catnips",
    "Worm",
    "King",
    "Wesson",
    "Yelena",
    "Master Yang",
    "Metalia",
    "Joey",
    "Taloxa",
    "Raphael",
    "April",
    "Donatello",
    "Splinter",
    "Leonardo",
    "Michelangelo",
    "Squidward",
    "Spongebob",
    "Sandy",
    "Patrick",
    "Venato",
];

const SP_TEAMWORK_HEROES: [&str; 10] = [
    "Raphael",
    "April",
    "Donatello",
    "Splinter",
    "Leonardo",
    "Michelangelo",
    "Squidward",
    "Spongebob",
    "Sandy",
    "Patrick",
];

const COMPACT_HERO_ORDER: [&str; 23] = [
    "None",
    "Common",
    "Tsukuyomi",
    "Catnips",
    "Worm",
    "King",
    "Wesson",
    "Yelena",
    "Master Yang",
    "Metalia",
    "Joey",
    "Taloxa",
    "Raphael",
    "April",
    "Donatello",
    "Splinter",
    "Leonardo",
    "Michelangelo",
    "Squidward",
    "Spongebob",
    "Sandy",
    "Patrick",
    "Venato",
];

const EVO_TREE_ORDER: [&str; 4] = [
    "Expose Weakness",
    "Viva la Materia",
    "Overreaction",
    "Watchmaker",
];

const PET_ORDER: [&str; 8] = [
    "Rex",
    "Croaky",
    "Capy",
    "Clucker",
    "Puffo",
    "King Blizzblast",
    "Nutjob",
    "Gourmeow",
];

const XENO_PET_NAMES: [&str; 6] = [
    "Capy",
    "Clucker",
    "Puffo",
    "King Blizzblast",
    "Nutjob",
    "Gourmeow",
];

const PET_SKILL_ORDER: [&str; 6] = [
    "Motivation",
    "Inspiration",
    "Encouragement",
    "Battle Lust",
    "Gary",
    "Sync Rate",
];

const PET_SKILL_RARITY_ORDER: [&str; 3] = ["Excellent", "Advanced", "Super"];

const COMPACT_COLLECTIBLE_INDEX_TO_DATA_INDEX: [u64; 118] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    26, 27, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
    58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
    82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 95, 96, 97, 98, 94, 99, 100, 101, 29, 30, 31,
    28, 103, 104, 105, 106, 102, 107, 108, 109, 110, 32, 33, 34, 35, 113, 114, 115, 116, 111, 112,
    117,
];

pub(crate) const DEFAULT_COMPACT_PROFILE_COLLECTIBLE_STARS: &[(u64, f64)] = &[
    (3, 8.0),
    (1, 8.0),
    (6, 8.0),
    (7, 8.0),
    (10, 8.0),
    (11, 8.0),
    (37, 8.0),
    (42, 8.0),
    (71, 8.0),
    (14, 8.0),
    (15, 8.0),
    (18, 8.0),
    (19, 8.0),
    (41, 8.0),
    (23, 8.0),
    (22, 8.0),
    (47, 8.0),
    (49, 8.0),
    (58, 8.0),
    (59, 8.0),
    (70, 8.0),
    (90, 8.0),
    (89, 8.0),
    (81, 8.0),
    (80, 8.0),
    (0, 8.0),
    (2, 8.0),
    (4, 8.0),
    (5, 8.0),
    (9, 8.0),
    (8, 8.0),
    (12, 8.0),
    (13, 8.0),
    (16, 8.0),
    (17, 8.0),
    (20, 8.0),
    (21, 8.0),
    (26, 8.0),
    (27, 8.0),
    (25, 8.0),
    (24, 8.0),
    (36, 8.0),
    (38, 8.0),
    (39, 8.0),
    (43, 8.0),
    (44, 8.0),
    (48, 8.0),
    (50, 8.0),
    (57, 8.0),
    (60, 8.0),
    (68, 8.0),
    (72, 8.0),
    (78, 8.0),
    (79, 8.0),
    (87, 8.0),
    (88, 8.0),
    (95, 8.0),
    (96, 8.0),
    (97, 8.0),
    (98, 8.0),
];

const XENO_AWAKENING_STATS: [(&str, [f64; 7]); 10] = [
    ("skillDamage", [0.0, 2.0, 6.0, 12.0, 20.0, 30.0, 40.0]),
    ("critDamage", [0.0, 2.0, 6.0, 12.0, 20.0, 30.0, 40.0]),
    ("xenoResDamage", [0.0, 1.0, 3.0, 6.0, 10.0, 15.0, 20.0]),
    ("chilled", [0.0, 2.0, 6.0, 12.0, 20.0, 30.0, 40.0]),
    ("poisoned", [0.0, 2.0, 6.0, 12.0, 20.0, 30.0, 40.0]),
    ("weakened", [0.0, 2.0, 6.0, 12.0, 20.0, 30.0, 40.0]),
    ("xenoResDamage", [0.0, 2.0, 6.0, 12.0, 20.0, 30.0, 40.0]),
    ("shieldDamage", [0.0, 2.0, 6.0, 12.0, 20.0, 30.0, 40.0]),
    ("xenoSyncRate", [0.0, 5.0, 15.0, 30.0, 50.0, 70.0, 95.0]),
    ("xenoResDamage", [0.0, 3.0, 9.0, 18.0, 30.0, 45.0, 60.0]),
];

#[derive(Clone, Copy)]
struct CompactSsEquipmentDef {
    item_index: u64,
    id: &'static str,
    name: &'static str,
    slot: &'static str,
}

#[derive(Clone, Copy)]
struct CompactCustomSetDef {
    size: usize,
    thresholds: &'static [(u64, &'static [(&'static str, f64)])],
    advanced_thresholds: &'static [(u64, &'static [(&'static str, f64)])],
}

#[derive(Clone, Copy)]
struct CompactCollectibleStatDef {
    index: u64,
    stat: &'static str,
    value: f64,
}

#[derive(Clone, Copy)]
enum CompactSetMetric {
    Gold,
    Red,
    Total,
    GoldEach,
    RedEach,
}

#[derive(Clone, Copy)]
struct CompactCollectibleSetThreshold {
    indexes: &'static [u64],
    metric: CompactSetMetric,
    threshold: f64,
    stats: &'static [(&'static str, f64)],
}

const COMPACT_SS_EQUIPMENT_DEFS: [CompactSsEquipmentDef; 8] = [
    CompactSsEquipmentDef {
        item_index: 1,
        id: "twinLance",
        name: "Twin Lance",
        slot: "Weapon",
    },
    CompactSsEquipmentDef {
        item_index: 2,
        id: "evervoidArmor",
        name: "Evervoid Armor",
        slot: "Armor",
    },
    CompactSsEquipmentDef {
        item_index: 4,
        id: "judgmentNecklace",
        name: "Judgment Necklace",
        slot: "Necklace",
    },
    CompactSsEquipmentDef {
        item_index: 6,
        id: "stardustSash",
        name: "Stardust Sash",
        slot: "Belt",
    },
    CompactSsEquipmentDef {
        item_index: 5,
        id: "voidwakerEmblem",
        name: "Voidwaker Emblem",
        slot: "Necklace",
    },
    CompactSsEquipmentDef {
        item_index: 7,
        id: "twistingBelt",
        name: "Twisting Belt",
        slot: "Belt",
    },
    CompactSsEquipmentDef {
        item_index: 8,
        id: "moonscarBracer",
        name: "Moonscar Bracer",
        slot: "Gloves",
    },
    CompactSsEquipmentDef {
        item_index: 10,
        id: "glacialWarboots",
        name: "Glacial Warboots",
        slot: "Boots",
    },
];

const CUSTOM_SET_0_THRESHOLDS: [(u64, &[(&str, f64)]); 4] = [
    (1, &[("critDamage", 10.0)]),
    (2, &[("skillDamage", 10.0)]),
    (3, &[("critDamage", 15.0)]),
    (4, &[("poisoned", 5.0), ("weakened", 5.0), ("chilled", 5.0)]),
];

const CUSTOM_SET_8_THRESHOLDS: [(u64, &[(&str, f64)]); 8] = [
    (1, &[("critDamage", 10.0)]),
    (2, &[("skillDamage", 10.0)]),
    (3, &[("critDamage", 15.0)]),
    (4, &[("poisoned", 5.0), ("weakened", 5.0), ("chilled", 5.0)]),
    (5, &[("skillDamage", 30.0)]),
    (
        6,
        &[("poisoned", 10.0), ("weakened", 10.0), ("chilled", 10.0)],
    ),
    (7, &[("critDamage", 30.0)]),
    (
        8,
        &[("poisoned", 10.0), ("weakened", 10.0), ("chilled", 10.0)],
    ),
];

const CUSTOM_SET_0_ADVANCED_THRESHOLDS: [(u64, &[(&str, f64)]); 4] = [
    (5, &[("critDamage", 20.0)]),
    (12, &[("skillDamage", 20.0)]),
    (
        24,
        &[("poisoned", 10.0), ("weakened", 10.0), ("chilled", 10.0)],
    ),
    (36, &[("critDamage", 40.0)]),
];

const CUSTOM_SET_8_ADVANCED_THRESHOLDS: [(u64, &[(&str, f64)]); 7] = [
    (5, &[("critDamage", 20.0)]),
    (12, &[("skillDamage", 20.0)]),
    (
        24,
        &[("poisoned", 10.0), ("weakened", 10.0), ("chilled", 10.0)],
    ),
    (36, &[("critDamage", 40.0)]),
    (
        60,
        &[("poisoned", 15.0), ("weakened", 15.0), ("chilled", 15.0)],
    ),
    (70, &[("skillDamage", 40.0)]),
    (
        80,
        &[
            ("poisoned", 25.0),
            ("weakened", 25.0),
            ("chilled", 25.0),
            ("damageBoss", 20.0),
        ],
    ),
];

const COMPACT_CUSTOM_SET_DEFS: [CompactCustomSetDef; 4] = [
    CompactCustomSetDef {
        size: 4,
        thresholds: &CUSTOM_SET_0_THRESHOLDS,
        advanced_thresholds: &CUSTOM_SET_0_ADVANCED_THRESHOLDS,
    },
    CompactCustomSetDef {
        size: 8,
        thresholds: &CUSTOM_SET_8_THRESHOLDS,
        advanced_thresholds: &CUSTOM_SET_8_ADVANCED_THRESHOLDS,
    },
    CompactCustomSetDef {
        size: 8,
        thresholds: &CUSTOM_SET_8_THRESHOLDS,
        advanced_thresholds: &CUSTOM_SET_8_ADVANCED_THRESHOLDS,
    },
    CompactCustomSetDef {
        size: 8,
        thresholds: &CUSTOM_SET_8_THRESHOLDS,
        advanced_thresholds: &CUSTOM_SET_8_ADVANCED_THRESHOLDS,
    },
];

const COMPACT_COLLECTIBLE_STAR_STATS: [CompactCollectibleStatDef; 76] = [
    CompactCollectibleStatDef {
        index: 0,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 1,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 2,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 3,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 4,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 5,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 6,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 7,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 8,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 9,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 10,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 11,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 12,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 13,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 14,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 15,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 16,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 17,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 18,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 19,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 20,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 21,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 22,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 23,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 24,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 25,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 26,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 27,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 28,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 29,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 30,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 31,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 32,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 33,
        stat: "critDamage",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 34,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 35,
        stat: "critRate",
        value: 10.0,
    },
    CompactCollectibleStatDef {
        index: 36,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 37,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 38,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 39,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 41,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 42,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 43,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 44,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 47,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 48,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 49,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 50,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 57,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 58,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 59,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 60,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 68,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 70,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 71,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 72,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 78,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 79,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 80,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 81,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 87,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 88,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 89,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 90,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 95,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 96,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 97,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 98,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 103,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 104,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 105,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 106,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 113,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 114,
        stat: "critDamage",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 115,
        stat: "critRate",
        value: 5.0,
    },
    CompactCollectibleStatDef {
        index: 116,
        stat: "critRate",
        value: 5.0,
    },
];

const COMPACT_COLLECTIBLE_SET_THRESHOLDS: &[CompactCollectibleSetThreshold] = &[
    CompactCollectibleSetThreshold {
        indexes: &[12, 21, 89, 88],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("critDamage", 15.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[12, 21, 89, 88],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("critDamage", 15.0), ("skillDamage", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[12, 21, 89, 88],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[4, 6, 79, 81],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[4, 6, 79, 81],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[4, 6, 79, 81],
        metric: CompactSetMetric::GoldEach,
        threshold: 3.0,
        stats: &[("shieldDamage", 5.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[4, 6, 79, 81],
        metric: CompactSetMetric::RedEach,
        threshold: 3.0,
        stats: &[("skillDamage", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[4, 6, 79, 81],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("critDamage", 10.0), ("shieldDamage", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 17, 79, 81],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 17, 79, 81],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 17, 79, 81],
        metric: CompactSetMetric::RedEach,
        threshold: 3.0,
        stats: &[("shieldDamage", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 17, 79, 81],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("shieldDamage", 15.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[11, 14, 43, 72],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("laceration", 5.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[11, 14, 43, 72],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("laceration", 5.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[11, 14, 43, 72],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 17, 18, 19],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 17, 18, 19],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[0, 1, 6, 7],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[0, 1, 6, 7],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[20, 21, 22, 23],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[20, 21, 22, 23],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[8, 9, 10, 11],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[8, 9, 10, 11],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[3, 19, 70, 80],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[10, 22, 87, 90],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[7, 24, 78, 97],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[13, 26, 95, 96],
        metric: CompactSetMetric::Gold,
        threshold: 10.0,
        stats: &[("skillDamage", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[13, 26, 95, 96],
        metric: CompactSetMetric::Red,
        threshold: 10.0,
        stats: &[("skillDamage", 20.0), ("weakened", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[13, 26, 95, 96],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("weakened", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[13, 26, 95, 96],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[5, 26, 68, 98],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("skillDamage", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[5, 26, 68, 98],
        metric: CompactSetMetric::Red,
        threshold: 10.0,
        stats: &[("poisoned", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[5, 26, 68, 98],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("poisoned", 10.0), ("skillDamage", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[5, 26, 68, 98],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[28, 29, 30, 31],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[28, 29, 30, 31],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 29, 58, 103],
        metric: CompactSetMetric::Gold,
        threshold: 10.0,
        stats: &[("critDamage", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 29, 58, 103],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("shieldDamage", 20.0), ("poisoned", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 29, 58, 103],
        metric: CompactSetMetric::Red,
        threshold: 10.0,
        stats: &[("skillDamage", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 29, 58, 103],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("critDamage", 20.0), ("poisoned", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[16, 29, 58, 103],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[17, 30, 57, 104],
        metric: CompactSetMetric::Gold,
        threshold: 10.0,
        stats: &[("shieldDamage", 10.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[17, 30, 57, 104],
        metric: CompactSetMetric::Gold,
        threshold: 20.0,
        stats: &[("skillDamage", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[17, 30, 57, 104],
        metric: CompactSetMetric::Red,
        threshold: 10.0,
        stats: &[("critDamage", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[17, 30, 57, 104],
        metric: CompactSetMetric::Red,
        threshold: 20.0,
        stats: &[("shieldDamage", 20.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[17, 30, 57, 104],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[20, 31, 44, 106],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[32, 33, 34, 35],
        metric: CompactSetMetric::GoldEach,
        threshold: 3.0,
        stats: &[("shieldDamage", 30.0), ("ssMiscPath", 13.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[32, 33, 34, 35],
        metric: CompactSetMetric::RedEach,
        threshold: 3.0,
        stats: &[("skillDamage", 60.0), ("ssMiscPath", 25.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[32, 33, 34, 35],
        metric: CompactSetMetric::Total,
        threshold: 25.0,
        stats: &[
            ("shieldDamage", 30.0),
            ("damageBoss", 20.0),
            ("ssMiscPath", 38.0),
        ],
    },
    CompactCollectibleSetThreshold {
        indexes: &[0, 37, 38],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[0, 37, 38],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[2, 41, 44],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[2, 41, 44],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[4, 47, 48],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[4, 47, 48],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[6, 49, 50],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[6, 49, 50],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[8, 57, 58],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[8, 57, 58],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[10, 57, 58],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[10, 57, 58],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[12, 70, 72],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[12, 70, 72],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[15, 70, 72],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[15, 70, 72],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[18, 78, 79],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[18, 78, 79],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[20, 87, 88],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[20, 87, 88],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[22, 87, 88],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[22, 87, 88],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[24, 95, 96],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[24, 95, 96],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[26, 95, 96],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[26, 95, 96],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[28, 103, 104],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[28, 103, 104],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[30, 103, 104],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[30, 103, 104],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[32, 113, 114],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[32, 113, 114],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[34, 113, 114],
        metric: CompactSetMetric::Gold,
        threshold: 15.0,
        stats: &[("atkPercent", 4.0)],
    },
    CompactCollectibleSetThreshold {
        indexes: &[34, 113, 114],
        metric: CompactSetMetric::Red,
        threshold: 15.0,
        stats: &[("atkPercent", 6.0)],
    },
];

fn compact_object<'a>(value: &'a Value, key: &str) -> Option<&'a Map<String, Value>> {
    value.get(key).and_then(Value::as_object)
}

fn bool_from_number(value: Option<&Value>) -> bool {
    value.and_then(Value::as_i64).unwrap_or(0) != 0
}

fn number_or_null(value: Option<&Value>) -> Value {
    value.cloned().unwrap_or(Value::Null)
}

fn number_or_zero(value: Option<&Value>) -> Value {
    value.cloned().unwrap_or_else(|| json!(0))
}

fn config_mode_name(index: &Value) -> Option<&'static str> {
    index
        .as_u64()
        .and_then(|index| COMPACT_CONFIG_MODE_ORDER.get(index as usize).copied())
}

fn compact_hero_name(value: Option<&Value>) -> Value {
    value
        .and_then(Value::as_u64)
        .and_then(|index| COMPACT_HERO_ORDER.get(index as usize))
        .map(|name| Value::String((*name).to_string()))
        .unwrap_or(Value::Null)
}

fn ss_equipment_def(item_index: u64) -> Option<CompactSsEquipmentDef> {
    COMPACT_SS_EQUIPMENT_DEFS
        .iter()
        .copied()
        .find(|def| def.item_index == item_index)
}

fn decode_compact_account_meta(meta: Option<&Map<String, Value>>) -> Value {
    let teamwork = meta
        .and_then(|meta| meta.get("f"))
        .and_then(Value::as_array)
        .map(|items| {
            Value::Array(
                items
                    .iter()
                    .filter_map(|item| {
                        let name = compact_hero_name(Some(item));
                        if name == Value::String("None".to_string()) || name == Value::Null {
                            None
                        } else {
                            Some(name)
                        }
                    })
                    .collect(),
            )
        })
        .unwrap_or_else(|| json!([]));

    json!({
        "synergy": bool_from_number(meta.and_then(|meta| meta.get("b"))),
        "synergyLevel": number_or_null(meta.and_then(|meta| meta.get("g"))),
        "mainHero": compact_hero_name(meta.and_then(|meta| meta.get("c"))),
        "harmonyL": compact_hero_name(meta.and_then(|meta| meta.get("d"))),
        "harmonyR": compact_hero_name(meta.and_then(|meta| meta.get("e"))),
        "teamwork": teamwork,
        "clanLevel": number_or_null(meta.and_then(|meta| meta.get("bb"))),
    })
}

fn decode_compact_ss_equipment(compact: &Value) -> Value {
    let Some(items) = compact.get("j").and_then(Value::as_array) else {
        return json!([]);
    };
    Value::Array(
        items
            .iter()
            .filter_map(|item| {
                let object = item.as_object()?;
                let item_index = object.get("t")?.as_u64()?;
                let definition = ss_equipment_def(item_index)?;
                let mut decoded = json!({
                    "slot": definition.slot,
                    "id": definition.id,
                    "name": definition.name,
                    "itemIndex": item_index,
                    "e": number_or_zero(object.get("w")),
                    "v": number_or_zero(object.get("u")),
                    "c": number_or_zero(object.get("v")),
                    "x": number_or_zero(object.get("bg")),
                    "base": number_or_zero(object.get("x")),
                });
                if object.contains_key("bh") {
                    decoded["transmuteEffect"] = number_or_zero(object.get("bh"));
                }
                if object.contains_key("bo") {
                    decoded["transmuteCondition"] = number_or_zero(object.get("bo"));
                }
                Some(decoded)
            })
            .collect(),
    )
}

fn decode_compact_survivors(compact: &Value) -> Value {
    let Some(items) = compact.get("h").and_then(Value::as_array) else {
        return json!({});
    };
    let mut output = Map::new();
    for (index, item) in items.iter().enumerate() {
        let Some(name) = SURVIVOR_ORDER.get(index) else {
            continue;
        };
        let Some(object) = item.as_object() else {
            continue;
        };
        output.insert(
            (*name).to_string(),
            json!({
                "stars": number_or_zero(object.get("r")),
                "level": number_or_null(object.get("q")),
            }),
        );
    }
    Value::Object(output)
}

fn decode_compact_collectibles(compact: &Value) -> Value {
    let mut stars_by_data_index = if compact_has_exported_default_profile_surface(compact) {
        DEFAULT_COMPACT_PROFILE_COLLECTIBLE_STARS
            .iter()
            .copied()
            .collect::<BTreeMap<_, _>>()
    } else {
        BTreeMap::new()
    };
    let preserve_sparse_default_surface =
        compact_preserves_sparse_default_collectible_surface(compact);
    if let Some(items) = compact.get("i").and_then(Value::as_array) {
        for (compact_index, item) in items.iter().enumerate() {
            let Some(data_index) = compact_collectible_data_index(compact_index) else {
                continue;
            };
            let Some(object) = item.as_object() else {
                if !preserve_sparse_default_surface {
                    stars_by_data_index.remove(&data_index);
                }
                continue;
            };
            stars_by_data_index.insert(
                data_index,
                object.get("r").and_then(Value::as_f64).unwrap_or(0.0),
            );
        }
    }
    Value::Array(
        stars_by_data_index
            .into_iter()
            .map(|(index, stars)| {
                json!({
                    "index": index,
                    "stars": stars,
                })
            })
            .collect(),
    )
}

fn compact_collectible_data_index(compact_index: usize) -> Option<u64> {
    COMPACT_COLLECTIBLE_INDEX_TO_DATA_INDEX
        .get(compact_index)
        .copied()
}

fn compact_has_exported_default_profile_surface(compact: &Value) -> bool {
    let Some(meta) = compact.get("a").and_then(Value::as_object) else {
        return false;
    };
    meta.get("*").and_then(Value::as_f64) == Some(111_376.0)
        && meta.get("%").and_then(Value::as_f64) == Some(230.0)
}

fn compact_preserves_sparse_default_collectible_surface(compact: &Value) -> bool {
    let Some(meta) = compact.get("a").and_then(Value::as_object) else {
        return false;
    };
    if meta.get("I").and_then(Value::as_str) != Some("ee")
        || meta.get("ba").and_then(Value::as_f64).is_none()
    {
        return false;
    }
    let Some(items) = compact.get("i").and_then(Value::as_array) else {
        return false;
    };
    let explicit_count = items.iter().filter(|item| item.is_object()).count();
    explicit_count > 0 && explicit_count < DEFAULT_COMPACT_PROFILE_COLLECTIBLE_STARS.len()
}

fn decode_compact_custom_sets(compact: &Value) -> Value {
    let Some(items) = compact.get("n").and_then(Value::as_array) else {
        return json!([]);
    };
    Value::Array(
        items
            .iter()
            .map(|item| {
                json!({
                    "collectibleIndexes": item
                        .get("i")
                        .and_then(Value::as_array)
                        .map(|collectibles| {
                            collectibles
                                .iter()
                                .map(|collectible| match collectible.as_u64() {
                                    Some(encoded) if encoded > 0 => json!(encoded - 1),
                                    _ => Value::Null,
                                })
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default(),
                    "level": number_or_zero(item.get("q")),
                })
            })
            .collect(),
    )
}

fn decode_compact_evo(compact: &Value) -> Value {
    let Some(items) = compact.get("k").and_then(Value::as_array) else {
        return json!({});
    };
    let mut output = Map::new();
    for (index, name) in EVO_TREE_ORDER.iter().enumerate() {
        output.insert(
            (*name).to_string(),
            json!(bool_from_number(items.get(index))),
        );
    }
    Value::Object(output)
}

fn decode_compact_pet_skills(compact: &Value) -> Value {
    let Some(items) = compact.get("l").and_then(Value::as_array) else {
        return json!([]);
    };
    Value::Array(
        items
            .iter()
            .enumerate()
            .map(|(index, item)| {
                let rarity = item
                    .get("B")
                    .and_then(Value::as_u64)
                    .and_then(|index| PET_SKILL_RARITY_ORDER.get(index as usize))
                    .copied();
                json!({
                    "index": index,
                    "skill": PET_SKILL_ORDER.get(index).copied().unwrap_or("Unknown"),
                    "enabled": bool_from_number(item.get("s")),
                    "rarityIndex": number_or_null(item.get("B")),
                    "rarity": rarity.map(|rarity| Value::String(rarity.to_string())).unwrap_or(Value::Null),
                    "value": number_or_null(item.get("P")),
                })
            })
            .collect(),
    )
}

fn decode_compact_pets(compact: &Value) -> Value {
    let pets = compact.get("bi").and_then(Value::as_object);
    let use_default_profile_pet =
        pets.is_none() && compact_has_exported_default_profile_surface(compact);
    let active_index = pets
        .and_then(|pets| pets.get("bj"))
        .and_then(Value::as_u64)
        .unwrap_or(if use_default_profile_pet { 1 } else { 0 });
    let active_pet = active_index
        .checked_sub(1)
        .and_then(|index| PET_ORDER.get(index as usize))
        .copied()
        .unwrap_or("None");

    let mut stars = Map::new();
    if use_default_profile_pet {
        stars.insert("Rex".to_string(), json!(10));
    }
    if let Some(items) = pets
        .and_then(|pets| pets.get("r"))
        .and_then(Value::as_array)
    {
        for (index, name) in PET_ORDER.iter().enumerate() {
            stars.insert(
                (*name).to_string(),
                items.get(index).cloned().unwrap_or(Value::Null),
            );
        }
    }

    let support = pets
        .and_then(|pets| pets.get("bm"))
        .and_then(Value::as_array)
        .map(|items| {
            Value::Array(
                items
                    .iter()
                    .map(|item| {
                        let pet_index = item.get("t").and_then(Value::as_u64).unwrap_or(0);
                        let pet_name = pet_index
                            .checked_sub(1)
                            .and_then(|index| PET_ORDER.get(index as usize))
                            .copied()
                            .unwrap_or("None");
                        json!({
                            "petIndex": pet_index,
                            "pet": pet_name,
                            "skillIndexes": item
                                .get("bn")
                                .and_then(Value::as_array)
                                .cloned()
                                .unwrap_or_default(),
                        })
                    })
                    .collect(),
            )
        })
        .unwrap_or_else(|| json!([]));

    json!({
        "activeIndex": active_index,
        "active": active_pet,
        "stars": Value::Object(stars),
        "support": support,
        "skillSettings": decode_compact_pet_skills(compact),
    })
}

fn decode_compact_mounts(compact: &Value) -> Value {
    let Some(mounts) = compact.get("bJ") else {
        return json!([]);
    };
    let active_index = mounts.get("bj").and_then(Value::as_u64);
    let Some(items) = mounts.get("bM").and_then(Value::as_array) else {
        return json!([]);
    };
    Value::Array(
        items
            .iter()
            .enumerate()
            .map(|(index, item)| {
                json!({
                    "index": index,
                    "name": compact_mount_name(index).unwrap_or("Unknown"),
                    "active": active_index == Some(index as u64),
                    "enabled": bool_from_number(item.get("s")),
                    "stars": number_or_null(item.get("r")),
                    "lines": number_or_null(item.get("bL")),
                    "stats": decode_compact_mount_stat_map(item.get("bK")),
                })
            })
            .collect(),
    )
}

fn decode_compact_mount_stat_map(value: Option<&Value>) -> Value {
    let Some(stats) = value.and_then(Value::as_object) else {
        return json!({});
    };
    let mut output = Map::new();
    for (key, value) in stats {
        let decoded = match key.as_str() {
            "bO" => "skillDamage",
            "bP" => "critDamage",
            "bQ" => "shieldDamage",
            "bR" => "weakened",
            "bS" => "poisoned",
            "bT" => "chilled",
            "bU" => "laceration",
            "bV" => "damageBoss",
            "skillDamage" | "critDamage" | "shieldDamage" | "weakened" | "poisoned" | "chilled"
            | "laceration" | "damageBoss" => key.as_str(),
            _ => continue,
        };
        output.insert(decoded.to_string(), value.clone());
    }
    Value::Object(output)
}

fn decode_compact_lme(compact: &Value, meta: Option<&Map<String, Value>>) -> Value {
    let turf = compact_object(compact, "&");
    json!({
        "atkEquipPercent": turf
            .and_then(|value| value.get("^"))
            .cloned()
            .unwrap_or_else(|| json!([])),
        "atkHeroPercent": turf
            .and_then(|value| value.get("bc"))
            .cloned()
            .unwrap_or_else(|| json!([])),
        "lme1Damage": turf
            .and_then(|value| value.get("bp"))
            .cloned()
            .unwrap_or_else(|| json!([])),
        "testaments": number_or_null(meta.and_then(|meta| meta.get("J"))),
        "clanLevel": number_or_null(meta.and_then(|meta| meta.get("bb"))),
    })
}

fn decode_compact_ee(meta: Option<&Map<String, Value>>) -> Value {
    json!({
        "gameMode": meta.and_then(|meta| meta.get("I")).cloned().unwrap_or(Value::Null),
        "skills": meta.and_then(|meta| meta.get("K")).cloned().unwrap_or(Value::Null),
        "omnipower": meta.and_then(|meta| meta.get("ba")).cloned().unwrap_or(Value::Null),
    })
}

fn add_stat(output: &mut Map<String, Value>, key: &str, value: f64) {
    if value == 0.0 {
        return;
    }
    let next = output.get(key).and_then(Value::as_f64).unwrap_or(0.0) + value;
    output.insert(key.to_string(), json!(next));
}

fn stat_value(output: &Map<String, Value>, key: &str) -> f64 {
    output.get(key).and_then(Value::as_f64).unwrap_or(0.0)
}

fn sum_number_array(value: &Value) -> f64 {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_f64)
        .sum()
}

#[derive(Clone, Copy)]
struct CompactSynergyStats {
    threshold: f64,
    crit_damage: f64,
    skill_damage: f64,
    shield_damage: f64,
    weakened: f64,
    poisoned: f64,
    chilled: f64,
    laceration: f64,
    damage_boss: f64,
}

const COMPACT_SYNERGY_STATS: [CompactSynergyStats; 32] = [
    CompactSynergyStats {
        threshold: 5.0,
        crit_damage: 5.0,
        skill_damage: 5.0,
        shield_damage: 5.0,
        weakened: 0.0,
        poisoned: 0.0,
        chilled: 0.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 10.0,
        crit_damage: 10.0,
        skill_damage: 10.0,
        shield_damage: 5.0,
        weakened: 5.0,
        poisoned: 0.0,
        chilled: 0.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 15.0,
        crit_damage: 20.0,
        skill_damage: 20.0,
        shield_damage: 5.0,
        weakened: 5.0,
        poisoned: 10.0,
        chilled: 0.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 20.0,
        crit_damage: 30.0,
        skill_damage: 30.0,
        shield_damage: 5.0,
        weakened: 5.0,
        poisoned: 10.0,
        chilled: 10.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 25.0,
        crit_damage: 45.0,
        skill_damage: 45.0,
        shield_damage: 20.0,
        weakened: 5.0,
        poisoned: 10.0,
        chilled: 10.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 30.0,
        crit_damage: 60.0,
        skill_damage: 60.0,
        shield_damage: 20.0,
        weakened: 20.0,
        poisoned: 10.0,
        chilled: 10.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 35.0,
        crit_damage: 75.0,
        skill_damage: 75.0,
        shield_damage: 20.0,
        weakened: 20.0,
        poisoned: 25.0,
        chilled: 10.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 40.0,
        crit_damage: 90.0,
        skill_damage: 90.0,
        shield_damage: 20.0,
        weakened: 20.0,
        poisoned: 25.0,
        chilled: 25.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 45.0,
        crit_damage: 115.0,
        skill_damage: 115.0,
        shield_damage: 45.0,
        weakened: 20.0,
        poisoned: 25.0,
        chilled: 25.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 50.0,
        crit_damage: 140.0,
        skill_damage: 140.0,
        shield_damage: 45.0,
        weakened: 45.0,
        poisoned: 25.0,
        chilled: 25.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 55.0,
        crit_damage: 165.0,
        skill_damage: 165.0,
        shield_damage: 45.0,
        weakened: 45.0,
        poisoned: 50.0,
        chilled: 25.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 60.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 45.0,
        weakened: 45.0,
        poisoned: 50.0,
        chilled: 50.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 61.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 45.0,
        weakened: 55.0,
        poisoned: 50.0,
        chilled: 50.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 62.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 45.0,
        weakened: 55.0,
        poisoned: 60.0,
        chilled: 50.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 63.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 45.0,
        weakened: 55.0,
        poisoned: 60.0,
        chilled: 60.0,
        laceration: 0.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 64.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 50.0,
        weakened: 55.0,
        poisoned: 60.0,
        chilled: 60.0,
        laceration: 5.0,
        damage_boss: 0.0,
    },
    CompactSynergyStats {
        threshold: 65.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 55.0,
        weakened: 55.0,
        poisoned: 60.0,
        chilled: 60.0,
        laceration: 5.0,
        damage_boss: 5.0,
    },
    CompactSynergyStats {
        threshold: 66.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 55.0,
        weakened: 65.0,
        poisoned: 60.0,
        chilled: 60.0,
        laceration: 5.0,
        damage_boss: 5.0,
    },
    CompactSynergyStats {
        threshold: 67.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 55.0,
        weakened: 65.0,
        poisoned: 70.0,
        chilled: 60.0,
        laceration: 5.0,
        damage_boss: 5.0,
    },
    CompactSynergyStats {
        threshold: 68.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 55.0,
        weakened: 65.0,
        poisoned: 70.0,
        chilled: 70.0,
        laceration: 5.0,
        damage_boss: 5.0,
    },
    CompactSynergyStats {
        threshold: 69.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 60.0,
        weakened: 65.0,
        poisoned: 70.0,
        chilled: 70.0,
        laceration: 10.0,
        damage_boss: 5.0,
    },
    CompactSynergyStats {
        threshold: 70.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 65.0,
        weakened: 65.0,
        poisoned: 70.0,
        chilled: 70.0,
        laceration: 10.0,
        damage_boss: 10.0,
    },
    CompactSynergyStats {
        threshold: 71.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 65.0,
        weakened: 75.0,
        poisoned: 70.0,
        chilled: 70.0,
        laceration: 10.0,
        damage_boss: 10.0,
    },
    CompactSynergyStats {
        threshold: 72.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 65.0,
        weakened: 75.0,
        poisoned: 80.0,
        chilled: 70.0,
        laceration: 10.0,
        damage_boss: 10.0,
    },
    CompactSynergyStats {
        threshold: 73.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 65.0,
        weakened: 75.0,
        poisoned: 80.0,
        chilled: 80.0,
        laceration: 10.0,
        damage_boss: 10.0,
    },
    CompactSynergyStats {
        threshold: 74.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 70.0,
        weakened: 75.0,
        poisoned: 80.0,
        chilled: 80.0,
        laceration: 15.0,
        damage_boss: 10.0,
    },
    CompactSynergyStats {
        threshold: 75.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 75.0,
        weakened: 75.0,
        poisoned: 80.0,
        chilled: 80.0,
        laceration: 15.0,
        damage_boss: 15.0,
    },
    CompactSynergyStats {
        threshold: 76.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 75.0,
        weakened: 85.0,
        poisoned: 80.0,
        chilled: 80.0,
        laceration: 15.0,
        damage_boss: 15.0,
    },
    CompactSynergyStats {
        threshold: 77.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 75.0,
        weakened: 85.0,
        poisoned: 90.0,
        chilled: 80.0,
        laceration: 15.0,
        damage_boss: 15.0,
    },
    CompactSynergyStats {
        threshold: 78.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 75.0,
        weakened: 85.0,
        poisoned: 90.0,
        chilled: 90.0,
        laceration: 15.0,
        damage_boss: 15.0,
    },
    CompactSynergyStats {
        threshold: 79.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 80.0,
        weakened: 85.0,
        poisoned: 90.0,
        chilled: 90.0,
        laceration: 20.0,
        damage_boss: 15.0,
    },
    CompactSynergyStats {
        threshold: 80.0,
        crit_damage: 190.0,
        skill_damage: 190.0,
        shield_damage: 85.0,
        weakened: 85.0,
        poisoned: 90.0,
        chilled: 90.0,
        laceration: 20.0,
        damage_boss: 20.0,
    },
];

const COMPACT_LME_DEBUFF_DELTAS: &[(f64, &str, f64)] = &[
    (80.0, "critRate", -10.0),
    (120.0, "skillDamage", -10.0),
    (160.0, "critDamage", -10.0),
    (200.0, "shieldDamage", -5.0),
    (280.0, "vulnerability", -5.0),
    (320.0, "critDamage", -10.0),
    (360.0, "skillDamage", -10.0),
    (400.0, "weakened", -10.0),
    (500.0, "critDamage", -10.0),
    (550.0, "skillDamage", -10.0),
    (600.0, "damageDealt", -5.0),
    (650.0, "poisoned", -10.0),
    (750.0, "skillDamage", -10.0),
    (800.0, "shieldDamage", -5.0),
    (850.0, "critDamage", -10.0),
    (900.0, "chilled", -10.0),
    (1000.0, "critRate", -10.0),
    (1050.0, "skillDamage", -10.0),
    (1100.0, "critDamage", -10.0),
    (1150.0, "vulnerability", -5.0),
    (1260.0, "skillDamage", -10.0),
    (1320.0, "shieldDamage", -5.0),
    (1380.0, "vulnerability", -5.0),
    (1440.0, "damageDealt", -5.0),
    (1640.0, "skillDamage", -10.0),
    (1710.0, "weakened", -10.0),
    (1780.0, "critDamage", -10.0),
    (1850.0, "vulnerability", -5.0),
    (1990.0, "skillDamage", -10.0),
    (2060.0, "poisoned", -10.0),
    (2130.0, "critDamage", -10.0),
    (2200.0, "damageDealt", -5.0),
    (2340.0, "shieldDamage", -5.0),
    (2410.0, "chilled", -10.0),
    (2480.0, "critRate", -10.0),
    (2550.0, "critDamage", -10.0),
    (2690.0, "damageDealt", -5.0),
    (2760.0, "skillDamage", -10.0),
    (2840.0, "critDamage", -10.0),
    (2920.0, "shieldDamage", -5.0),
    (3160.0, "critRate", -10.0),
    (3240.0, "skillDamage", -10.0),
    (3320.0, "vulnerability", -5.0),
    (3400.0, "critDamage", -10.0),
    (3560.0, "shieldDamage", -5.0),
    (3640.0, "vulnerability", -5.0),
    (3720.0, "critDamage", -15.0),
    (3880.0, "weakened", -10.0),
    (3960.0, "skillDamage", -15.0),
    (4040.0, "poisoned", -10.0),
    (4220.0, "shieldDamage", -5.0),
    (4310.0, "damageDealt", -5.0),
    (4400.0, "chilled", -15.0),
    (4700.0, "shieldDamage", -5.0),
    (4800.0, "critRate", -10.0),
    (4900.0, "skillDamage", -15.0),
    (5100.0, "shieldDamage", -5.0),
    (5200.0, "critDamage", -15.0),
    (5300.0, "skillDamage", -15.0),
    (5400.0, "critRate", -10.0),
    (5600.0, "weakened", -15.0),
    (5700.0, "critDamage", -15.0),
    (5800.0, "damageDealt", -5.0),
    (5900.0, "skillDamage", -15.0),
    (6200.0, "shieldDamage", -10.0),
    (6300.0, "poisoned", -20.0),
    (6400.0, "critDamage", -20.0),
    (6600.0, "vulnerability", -10.0),
    (6700.0, "critDamage", -20.0),
    (6800.0, "skillDamage", -20.0),
    (6900.0, "shieldDamage", -10.0),
    (7100.0, "critRate", -10.0),
    (7200.0, "skillDamage", -20.0),
    (7300.0, "shieldDamage", -10.0),
    (7400.0, "damageDealt", -5.0),
    (7700.0, "critRate", -15.0),
    (7800.0, "skillDamage", -25.0),
    (7900.0, "vulnerability", -15.0),
    (8000.0, "critDamage", -25.0),
    (8200.0, "skillDamage", -25.0),
    (8300.0, "critDamage", -25.0),
    (8400.0, "shieldDamage", -15.0),
    (8500.0, "chilled", -30.0),
    (8700.0, "critDamage", -25.0),
    (8800.0, "skillDamage", -25.0),
    (8900.0, "damageDealt", -5.0),
    (9200.0, "critRate", -15.0),
    (9300.0, "skillDamage", -25.0),
    (9400.0, "shieldDamage", -15.0),
    (9500.0, "critDamage", -25.0),
    (9700.0, "vulnerability", -15.0),
    (9800.0, "skillDamage", -25.0),
    (9900.0, "critDamage", -25.0),
    (10000.0, "shieldDamage", -15.0),
    (10200.0, "skillDamage", -25.0),
    (10300.0, "critDamage", -25.0),
    (10400.0, "weakened", -30.0),
    (10700.0, "vulnerability", -15.0),
    (10800.0, "critDamage", -30.0),
    (10900.0, "skillDamage", -30.0),
    (11000.0, "shieldDamage", -20.0),
    (11200.0, "critRate", -20.0),
    (11300.0, "shieldDamage", -20.0),
    (11400.0, "damageDealt", -5.0),
    (11500.0, "skillDamage", -30.0),
    (11700.0, "poisoned", -30.0),
    (11800.0, "critDamage", -30.0),
    (11900.0, "skillDamage", -30.0),
    (12200.0, "critDamage", -45.0),
    (12300.0, "skillDamage", -45.0),
    (12400.0, "chilled", -50.0),
    (12500.0, "vulnerability", -20.0),
    (12700.0, "shieldDamage", -30.0),
    (12800.0, "critDamage", -45.0),
    (12900.0, "skillDamage", -45.0),
    (13000.0, "damageDealt", -5.0),
    (13200.0, "weakened", -50.0),
    (13300.0, "vulnerability", -20.0),
    (13400.0, "shieldDamage", -30.0),
    (14100.0, "skillDamage", -45.0),
    (14400.0, "poisoned", -50.0),
    (14700.0, "critDamage", -45.0),
    (15000.0, "shieldDamage", -30.0),
    (15600.0, "vulnerability", -20.0),
    (15900.0, "damageDealt", -5.0),
    (16200.0, "skillDamage", -45.0),
    (16500.0, "shieldDamage", -30.0),
    (17100.0, "chilled", -50.0),
    (17400.0, "vulnerability", -20.0),
    (17700.0, "skillDamage", -45.0),
    (19000.0, "skillDamage", -45.0),
    (19500.0, "critDamage", -45.0),
    (20000.0, "shieldDamage", -30.0),
    (20500.0, "vulnerability", -20.0),
    (21500.0, "skillDamage", -45.0),
    (22000.0, "critDamage", -45.0),
    (22500.0, "chilled", -60.0),
    (23000.0, "critDamage", -45.0),
    (23500.0, "skillDamage", -45.0),
    (24500.0, "damageDealt", -5.0),
    (25000.0, "vulnerability", -20.0),
    (25500.0, "critDamage", -45.0),
    (26000.0, "shieldDamage", -30.0),
    (26500.0, "chilled", -60.0),
    (28000.0, "critDamage", -60.0),
    (28500.0, "weakened", -70.0),
    (29000.0, "vulnerability", -25.0),
    (29500.0, "skillDamage", -60.0),
    (30000.0, "poisoned", -70.0),
    (30500.0, "critRate", -40.0),
    (31000.0, "chilled", -70.0),
    (31500.0, "skillDamage", -60.0),
    (32000.0, "critDamage", -60.0),
    (32500.0, "damageDealt", -5.0),
    (33500.0, "skillDamage", -60.0),
    (34000.0, "vulnerability", -25.0),
    (34500.0, "critDamage", -60.0),
    (35000.0, "skillDamage", -60.0),
    (35500.0, "shieldDamage", -40.0),
    (36000.0, "weakened", -70.0),
    (36500.0, "shieldDamage", -40.0),
    (37000.0, "poisoned", -70.0),
    (37500.0, "critRate", -40.0),
    (38000.0, "critDamage", -60.0),
    (39000.0, "chilled", -70.0),
    (39500.0, "skillDamage", -60.0),
    (40000.0, "weakened", -70.0),
    (40500.0, "critRate", -40.0),
    (41000.0, "critDamage", -60.0),
    (41500.0, "skillDamage", -60.0),
    (42000.0, "poisoned", -70.0),
    (42500.0, "chilled", -70.0),
    (43000.0, "critRate", -40.0),
    (43500.0, "critDamage", -60.0),
    (44000.0, "weakened", -70.0),
    (44500.0, "poisoned", -70.0),
    (46000.0, "vulnerability", -25.0),
    (46500.0, "critDamage", -60.0),
    (47000.0, "skillDamage", -60.0),
    (47500.0, "weakened", -80.0),
    (48000.0, "vulnerability", -25.0),
    (48500.0, "shieldDamage", -40.0),
    (49500.0, "skillDamage", -60.0),
    (50000.0, "critRate", -40.0),
    (50500.0, "critDamage", -60.0),
    (51000.0, "shieldDamage", -40.0),
    (51500.0, "laceration", -15.0),
    (52500.0, "vulnerability", -25.0),
    (53000.0, "poisoned", -80.0),
    (53500.0, "shieldDamage", -40.0),
    (54000.0, "critDamage", -60.0),
    (54500.0, "vulnerability", -25.0),
    (55000.0, "laceration", -15.0),
    (56500.0, "shieldDamage", -40.0),
    (57000.0, "chilled", -80.0),
    (57500.0, "vulnerability", -25.0),
    (58000.0, "skillDamage", -75.0),
    (58500.0, "critDamage", -75.0),
    (59000.0, "shieldDamage", -40.0),
    (60000.0, "laceration", -20.0),
    (60500.0, "damageDealt", -5.0),
    (61000.0, "skillDamage", -75.0),
    (61500.0, "vulnerability", -25.0),
    (62000.0, "critDamage", -75.0),
    (63000.0, "weakened", -80.0),
    (63500.0, "skillDamage", -75.0),
    (64000.0, "shieldDamage", -40.0),
    (64500.0, "vulnerability", -25.0),
    (65000.0, "critDamage", -75.0),
    (65500.0, "laceration", -20.0),
    (67000.0, "skillDamage", -100.0),
    (67500.0, "vulnerability", -30.0),
    (68000.0, "critDamage", -100.0),
    (68500.0, "shieldDamage", -50.0),
    (69000.0, "laceration", -30.0),
    (69500.0, "xenoResDamage", -20.0),
    (70500.0, "poisoned", -120.0),
    (71000.0, "vulnerability", -30.0),
    (71500.0, "skillDamage", -100.0),
    (72000.0, "damageDealt", -5.0),
    (72500.0, "damageBoss", -15.0),
    (73500.0, "vulnerability", -30.0),
    (74000.0, "laceration", -30.0),
    (74500.0, "shieldDamage", -50.0),
    (75000.0, "critDamage", -100.0),
    (75500.0, "xenoResDamage", -20.0),
    (76000.0, "damageBoss", -15.0),
    (77500.0, "chilled", -120.0),
    (78000.0, "shieldDamage", -50.0),
    (78500.0, "critRate", -50.0),
    (79000.0, "vulnerability", -40.0),
    (79500.0, "skillDamage", -100.0),
    (80000.0, "laceration", -30.0),
    (81000.0, "critDamage", -100.0),
    (81500.0, "skillDamage", -100.0),
    (82000.0, "shieldDamage", -50.0),
    (82500.0, "damageDealt", -5.0),
    (83000.0, "xenoResDamage", -20.0),
    (84000.0, "skillDamage", -100.0),
    (84500.0, "shieldDamage", -50.0),
    (85000.0, "critDamage", -100.0),
    (85500.0, "vulnerability", -40.0),
    (86000.0, "laceration", -30.0),
    (86500.0, "damageBoss", -15.0),
];
fn derive_generic_compact_base_stats(compact: &Value, account_inputs: &Value) -> Value {
    let mut output = Map::new();
    let meta = &account_inputs["meta"];
    apply_compact_static_base_stats(&mut output);
    if meta["synergy"].as_bool().unwrap_or(false) {
        let synergy_level = meta["synergyLevel"].as_f64().unwrap_or(0.0);
        apply_compact_synergy_stats(&mut output, synergy_level);
        add_stat(&mut output, "atkHero", synergy_level * 400.0);
        apply_compact_harmony_stats(&mut output, account_inputs);
    }
    if let Some(clan_level) = meta["clanLevel"].as_f64() {
        if clan_level > 0.0 {
            add_stat(&mut output, "atkHeroPercent", clan_level + 2.0);
        }
    }
    let has_laceration_teamwork = meta["teamwork"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .any(|hero| hero == "Raphael" || hero == "Michelangelo");
    if has_laceration_teamwork {
        add_stat(&mut output, "lacerationUptime", 0.25);
    }
    if !has_laceration_teamwork && compact_taloxa_laceration_uptime_active(compact, account_inputs)
    {
        add_stat(&mut output, "lacerationUptime", 1.0);
    }
    apply_compact_active_skill_base_stats(&mut output, compact);
    apply_compact_survivor_stats(&mut output, account_inputs);
    apply_compact_donatello_teamwork_stats(&mut output, account_inputs);
    finalize_compact_survivor_surface_stats(&mut output);
    apply_compact_default_pet_stats(&mut output, account_inputs);
    apply_compact_xeno_pet_stats(&mut output, account_inputs);
    apply_compact_evo_tree_stats(&mut output, account_inputs);
    apply_compact_pet_skill_stats(&mut output, account_inputs);

    let lme = &account_inputs["lme"];
    for (key, stat) in [
        ("atkEquipPercent", "atkEquipPercent"),
        ("atkHeroPercent", "atkHeroPercent"),
        ("lme1Damage", "lme1Damage"),
    ] {
        add_stat(&mut output, stat, sum_number_array(&lme[key]));
    }
    if account_inputs["ee"]["gameMode"].as_str() == Some("lme2") {
        apply_compact_lme_testament_stats(&mut output, lme["testaments"].as_f64().unwrap_or(0.0));
    }
    if account_inputs["ee"]["gameMode"].as_str() == Some("ee") {
        apply_compact_ee_skill_stats(&mut output, &account_inputs["ee"]["skills"]);
    }

    for mount in account_inputs["mounts"].as_array().into_iter().flatten() {
        if !mount
            .get("enabled")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            continue;
        }
        let index = mount.get("index").and_then(Value::as_u64).unwrap_or(0) as usize;
        let stars = mount.get("stars").and_then(Value::as_f64).unwrap_or(0.0);
        for (stat, value) in mount
            .get("stats")
            .and_then(Value::as_object)
            .into_iter()
            .flatten()
        {
            let multiplier = compact_mount_puzzle_stat_multiplier(index, stars);
            add_stat(
                &mut output,
                stat,
                value.as_f64().unwrap_or(0.0) * multiplier,
            );
        }
        if mount
            .get("active")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            add_stat(
                &mut output,
                "mountDamage",
                compact_mount_damage(index, stars),
            );
            let lines = mount.get("lines").and_then(Value::as_f64).unwrap_or(0.0);
            for (stat, value) in compact_mount_line_stats(index, stars, lines) {
                add_stat(&mut output, stat, *value);
            }
        }
    }

    apply_compact_collectible_stats(&mut output, account_inputs);
    apply_compact_collectible_set_stats(&mut output, account_inputs);
    apply_compact_custom_set_stats(&mut output, account_inputs);

    Value::Object(output)
}

fn apply_compact_collectible_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    let upgraded = compact_upgraded_collectible_indexes(account_inputs);
    for collectible in account_inputs["collectibles"]
        .as_array()
        .into_iter()
        .flatten()
    {
        let Some(index) = collectible["index"].as_u64() else {
            continue;
        };
        let stars = collectible["stars"].as_f64().unwrap_or(0.0);
        if stars < 8.0 {
            continue;
        }
        let Some(definition) = COMPACT_COLLECTIBLE_STAR_STATS
            .iter()
            .find(|definition| definition.index == index)
        else {
            continue;
        };
        let multiplier = if upgraded.contains(&index) { 1.33 } else { 1.0 };
        add_stat(output, definition.stat, definition.value * multiplier);
    }
}

fn compact_upgraded_collectible_indexes(account_inputs: &Value) -> BTreeSet<u64> {
    let mut upgraded = BTreeSet::new();
    for (index, custom_set) in account_inputs["customSets"]
        .as_array()
        .into_iter()
        .flatten()
        .enumerate()
    {
        let Some(definition) = COMPACT_CUSTOM_SET_DEFS.get(index) else {
            continue;
        };
        let Some(collectibles) = custom_set["collectibleIndexes"].as_array() else {
            continue;
        };
        let selected_count = collectibles
            .iter()
            .filter(|item| !item.is_null())
            .take(definition.size)
            .count();
        if selected_count != definition.size {
            continue;
        }
        let level = custom_set["level"].as_u64().unwrap_or(0);
        for collectible in collectibles.iter().take(level as usize) {
            if let Some(index) = collectible.as_u64() {
                upgraded.insert(index);
            }
        }
    }
    upgraded
}

#[derive(Default)]
struct CompactCollectibleSetMetrics {
    gold: f64,
    red: f64,
    total: f64,
    gold_each: f64,
    red_each: f64,
}

fn apply_compact_collectible_set_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    for threshold in COMPACT_COLLECTIBLE_SET_THRESHOLDS {
        let metrics = compact_collectible_set_metrics(account_inputs, threshold.indexes);
        if compact_collectible_set_metric_value(&metrics, threshold.metric) >= threshold.threshold {
            for (stat, value) in threshold.stats {
                add_stat(output, stat, *value);
            }
        }
    }
}

fn compact_collectible_set_metric_value(
    metrics: &CompactCollectibleSetMetrics,
    metric: CompactSetMetric,
) -> f64 {
    match metric {
        CompactSetMetric::Gold => metrics.gold,
        CompactSetMetric::Red => metrics.red,
        CompactSetMetric::Total => metrics.total,
        CompactSetMetric::GoldEach => metrics.gold_each,
        CompactSetMetric::RedEach => metrics.red_each,
    }
}

fn compact_collectible_set_metrics(
    account_inputs: &Value,
    indexes: &[u64],
) -> CompactCollectibleSetMetrics {
    if indexes.is_empty() {
        return CompactCollectibleSetMetrics::default();
    }

    let mut metrics = CompactCollectibleSetMetrics {
        gold_each: f64::INFINITY,
        red_each: f64::INFINITY,
        ..CompactCollectibleSetMetrics::default()
    };
    for index in indexes {
        let stars = compact_collectible_stars(account_inputs, *index);
        let gold_stars = stars.min(5.0);
        let red_stars = (stars - 5.0).max(0.0);
        metrics.gold += gold_stars;
        metrics.red += red_stars;
        metrics.total += stars;
        metrics.gold_each = metrics.gold_each.min(gold_stars);
        metrics.red_each = metrics.red_each.min(red_stars);
    }
    metrics
}

fn apply_compact_custom_set_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    for (index, custom_set) in account_inputs["customSets"]
        .as_array()
        .into_iter()
        .flatten()
        .enumerate()
    {
        let Some(definition) = COMPACT_CUSTOM_SET_DEFS.get(index) else {
            continue;
        };
        let selected_count = custom_set["collectibleIndexes"]
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter(|item| !item.is_null())
                    .take(definition.size)
                    .count()
            })
            .unwrap_or(0);
        for (threshold, stats) in definition.thresholds {
            if selected_count as u64 >= *threshold {
                for (stat, value) in *stats {
                    add_stat(output, stat, *value);
                }
            }
        }
        if selected_count < definition.size {
            continue;
        }
        let level = custom_set["level"].as_u64().unwrap_or(0);
        let advanced_stars = custom_set["collectibleIndexes"]
            .as_array()
            .into_iter()
            .flatten()
            .take(level as usize)
            .filter_map(Value::as_u64)
            .map(|index| compact_collectible_stars(account_inputs, index))
            .sum::<f64>();
        for (threshold, stats) in definition.advanced_thresholds {
            if advanced_stars >= *threshold as f64 {
                for (stat, value) in *stats {
                    add_stat(output, stat, *value);
                }
            }
        }
    }
}

fn compact_collectible_stars(account_inputs: &Value, index: u64) -> f64 {
    account_inputs["collectibles"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|collectible| collectible["index"].as_u64() == Some(index))
        .and_then(|collectible| collectible["stars"].as_f64())
        .unwrap_or(0.0)
}

fn apply_compact_survivor_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    let main_hero = account_inputs["meta"]["mainHero"].as_str();
    let synergy = account_inputs["meta"]["synergy"].as_bool().unwrap_or(false);
    let teamwork: BTreeSet<&str> = account_inputs["meta"]["teamwork"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    for hero in SURVIVOR_ORDER {
        let survivor = &account_inputs["survivors"][hero];
        if survivor.is_null() {
            continue;
        }
        let stars = survivor["stars"].as_f64().unwrap_or(0.0);
        if stars <= 0.0 {
            continue;
        }
        let level = survivor["level"]
            .as_f64()
            .unwrap_or_else(|| if synergy { 120.0 } else { 0.0 });
        apply_compact_survivor_level_stats(output, hero, level);
        let star_stats_value = if main_hero == Some(hero) || teamwork.contains(hero) {
            stars
        } else {
            stars.min(5.0)
        };
        apply_compact_survivor_star_stats(output, hero, star_stats_value);
        if main_hero == Some(hero) {
            apply_compact_survivor_main_passive_stats(output, hero, stars);
        }
    }
}

fn apply_compact_survivor_level_stats(output: &mut Map<String, Value>, hero: &str, level: f64) {
    match hero {
        "Common" | "Squidward" | "Spongebob" | "Sandy" | "Patrick" => {
            if level >= 40.0 {
                add_stat(output, "critDamage", 5.0);
            }
            if level >= 120.0 {
                add_stat(output, "critRate", 5.0);
            }
        }
        "Tsukuyomi" | "King" | "Wesson" => {
            if level >= 40.0 {
                add_stat(output, "atkHeroPercent", 5.0);
            }
            if level >= 80.0 {
                add_stat(output, "critRate", 5.0);
            }
            if level >= 120.0 {
                add_stat(output, "critDamage", 5.0);
            }
        }
        "Catnips" | "Worm" | "Yelena" | "Raphael" | "April" | "Donatello" | "Splinter"
        | "Leonardo" | "Michelangelo" => {
            if level >= 120.0 {
                add_stat(output, "atkHeroPercent", 5.0);
            }
        }
        "Master Yang" => {
            if level >= 40.0 {
                add_stat(output, "atkHeroPercent", 10.0);
            }
            if level >= 120.0 {
                add_stat(output, "critRate", 10.0);
            }
        }
        "Metalia" | "Joey" | "Taloxa" | "Venato" => {
            if level >= 40.0 {
                add_stat(output, "atkHeroPercent", 10.0);
            }
            if level >= 120.0 {
                add_stat(output, "critDamage", 10.0);
            }
        }
        _ => {}
    }
}

fn apply_compact_survivor_star_stats(output: &mut Map<String, Value>, hero: &str, stars: f64) {
    match hero {
        "Common" => {
            if stars >= 8.0 {
                add_stat(output, "skillDamage", 5.0);
            }
            if stars >= 10.0 {
                add_stat(output, "critDamage", 10.0);
            }
            if stars >= 12.0 {
                add_stat(output, "skillDamage", 10.0);
            }
        }
        "Tsukuyomi" | "Wesson" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 4.0);
            }
        }
        "Catnips" => {
            if stars >= 10.0 {
                add_stat(output, "critDamage", 20.0);
            }
        }
        "Worm" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 4.0);
            }
            if stars >= 7.0 {
                add_stat(output, "critDamage", 10.0);
            }
            if stars >= 8.0 {
                add_stat(output, "critDamage", 10.0);
            }
            if stars >= 10.0 {
                add_stat(output, "skillDamage", 10.0);
            }
            if stars >= 12.0 {
                add_stat(output, "critDamage", 15.0);
                add_stat(output, "skillDamage", 15.0);
            }
        }
        "King" => {
            if stars >= 8.0 {
                add_stat(output, "vulnerability", 5.0);
            }
            if stars >= 10.0 {
                add_stat(output, "vulnerability", 5.0);
            }
            if stars >= 12.0 {
                add_stat(output, "vulnerability", 10.0);
            }
        }
        "Yelena" => {
            if stars >= 10.0 {
                add_stat(output, "critDamage", 20.0);
            }
            if stars >= 12.0 {
                add_stat(output, "critDamage", 25.0);
            }
        }
        "Raphael" | "Michelangelo" => {
            if stars >= 5.0 {
                add_stat(output, "critRate", 8.0);
            }
            if stars >= 7.0 {
                add_stat(output, "laceration", 10.0);
            }
            if stars >= 8.0 {
                add_stat(output, "laceration", 10.0);
            }
            if stars >= 10.0 {
                add_stat(output, "laceration", 10.0);
            }
            if stars >= 12.0 {
                add_stat(output, "laceration", 20.0);
            }
        }
        "April" | "Donatello" | "Splinter" => {
            if stars >= 5.0 {
                add_stat(output, "critRate", 8.0);
            }
        }
        "Leonardo" => {
            if stars >= 5.0 {
                add_stat(output, "critRate", 8.0);
            }
            if stars >= 7.0 {
                add_stat(output, "laceration", 2.0);
                add_stat(output, "lacerationUptime", 1.0);
            }
            if stars >= 8.0 {
                add_stat(output, "laceration", 2.0);
            }
            if stars >= 10.0 {
                add_stat(output, "laceration", 3.0);
            }
            if stars >= 12.0 {
                add_stat(output, "laceration", 3.0);
            }
        }
        "Squidward" | "Spongebob" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 4.0);
            }
        }
        "Master Yang" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 8.0);
            }
            if stars >= 7.0 {
                add_stat(output, "critRate", 5.0);
                add_stat(output, "critDamage", 5.0);
            }
            if stars >= 8.0 {
                add_stat(output, "skillDamage", 15.0);
            }
            if stars >= 10.0 {
                add_stat(output, "critRate", 10.0);
                add_stat(output, "critDamage", 10.0);
            }
            if stars >= 12.0 {
                add_stat(output, "critRate", 15.0);
                add_stat(output, "critDamage", 25.0);
                add_stat(output, "skillDamage", 15.0);
            }
            if stars >= 14.0 {
                add_stat(output, "critRate", 30.0);
                add_stat(output, "critDamage", 50.0);
                add_stat(output, "skillDamage", 30.0);
            }
        }
        "Metalia" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 8.0);
            }
            if stars >= 7.0 {
                add_stat(output, "shieldDamage", 10.0);
            }
            if stars >= 8.0 {
                add_stat(output, "poisoned", 5.0);
            }
            if stars >= 10.0 {
                add_stat(output, "chilled", 5.0);
            }
            if stars >= 12.0 {
                add_stat(output, "chilled", 15.0);
            }
            if stars >= 14.0 {
                add_stat(output, "shieldDamage", 25.0);
                add_stat(output, "poisoned", 80.0);
                add_stat(output, "chilled", 40.0);
            }
        }
        "Joey" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 8.0);
            }
            if stars >= 8.0 {
                add_stat(output, "exposedDamage", 2.0);
            }
            if stars >= 12.0 {
                add_stat(output, "exposedDamage", 3.0);
            }
            if stars >= 14.0 {
                add_stat(output, "exposedDamage", 4.0);
            }
        }
        "Taloxa" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 8.0);
            }
            if stars >= 7.0 {
                add_stat(output, "laceration", 10.0);
            }
            if stars >= 8.0 {
                add_stat(output, "laceration", 15.0);
            }
            if stars >= 10.0 {
                add_stat(output, "laceration", 25.0);
            }
            if stars >= 14.0 {
                add_stat(output, "laceration", 50.0);
            }
        }
        "Venato" => {
            if stars >= 5.0 {
                add_stat(output, "atkHeroPercent", 8.0);
            }
            if stars >= 7.0 {
                add_stat(output, "critDamage", 10.0);
            }
            if stars >= 8.0 {
                add_stat(output, "critDamage", 20.0);
            }
            if stars >= 10.0 {
                add_stat(output, "critDamage", 10.0);
            }
            if stars >= 12.0 {
                add_stat(output, "critDamage", 40.0);
            }
            if stars >= 14.0 {
                add_stat(output, "critDamage", 60.0);
            }
        }
        _ => {}
    }
}

fn apply_compact_survivor_main_passive_stats(
    output: &mut Map<String, Value>,
    hero: &str,
    stars: f64,
) {
    match hero {
        "Tsukuyomi" => {
            if stars >= 9.0 {
                add_stat(output, "vulnerability", 5.0);
            }
            if stars >= 10.0 {
                add_stat(output, "skillDamage", 20.0);
            }
            if stars >= 11.0 {
                add_stat(output, "vulnerability", 5.0);
            }
        }
        "Worm" => {
            if stars >= 0.0 {
                add_stat(output, "vulnerability", 50.0);
            }
        }
        "King" => {
            if stars >= 3.0 {
                add_stat(output, "critDamage", 25.0);
            }
            if stars >= 11.0 {
                add_stat(output, "critDamage", 30.0);
            }
        }
        "Wesson" => {
            if stars >= 7.0 {
                add_stat(output, "skillDamage", 10.0);
            }
            if stars >= 8.0 {
                add_stat(output, "skillDamage", 20.0);
            }
        }
        "Yelena" => {
            if stars >= 9.0 {
                add_stat(output, "vulnerability", 5.0);
            }
            if stars >= 11.0 {
                add_stat(output, "vulnerability", 5.0);
            }
        }
        "Master Yang" => apply_compact_selected_stat_table(
            output,
            stars,
            &[
                (0.0, &[("critRate", 20.0), ("atkHero", 19_515.0)]),
                (
                    1.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 19_515.0),
                        ("vulnerability", 25.0),
                    ],
                ),
                (
                    2.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 20_115.0),
                        ("vulnerability", 25.0),
                    ],
                ),
                (
                    3.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 20_115.0),
                        ("vulnerability", 75.0),
                    ],
                ),
                (
                    4.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 21_615.0),
                        ("vulnerability", 75.0),
                    ],
                ),
                (
                    6.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 21_615.0),
                        ("vulnerability", 75.0),
                        ("atkHeroPercent", 20.0),
                    ],
                ),
                (
                    9.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 21_615.0),
                        ("vulnerability", 85.0),
                        ("atkHeroPercent", 20.0),
                    ],
                ),
                (
                    11.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 21_615.0),
                        ("vulnerability", 100.0),
                        ("atkHeroPercent", 20.0),
                    ],
                ),
                (
                    13.0,
                    &[
                        ("critRate", 20.0),
                        ("atkHero", 21_615.0),
                        ("vulnerability", 130.0),
                        ("atkHeroPercent", 20.0),
                    ],
                ),
            ],
        ),
        "Metalia" => apply_compact_selected_stat_table(
            output,
            stars,
            &[
                (
                    0.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 19_515.0),
                    ],
                ),
                (
                    2.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 20_115.0),
                    ],
                ),
                (
                    4.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 21_615.0),
                    ],
                ),
                (
                    6.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                    ],
                ),
                (
                    7.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("critDamage", 20.0),
                    ],
                ),
                (
                    9.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("critDamage", 40.0),
                    ],
                ),
                (
                    11.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("critDamage", 60.0),
                    ],
                ),
                (
                    13.0,
                    &[
                        ("metaliaPoisoned", 60.0),
                        ("metaliaChilled", 30.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("critDamage", 120.0),
                    ],
                ),
            ],
        ),
        "Joey" => apply_compact_selected_stat_table(
            output,
            stars,
            &[
                (
                    0.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 15.0),
                        ("flashriftRipFinal", 200.0),
                        ("flashriftRipEfficiency", 800.0),
                        ("atkHero", 19_515.0),
                    ],
                ),
                (
                    2.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 15.0),
                        ("flashriftRipFinal", 200.0),
                        ("flashriftRipEfficiency", 800.0),
                        ("atkHero", 20_115.0),
                    ],
                ),
                (
                    4.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 15.0),
                        ("flashriftRipFinal", 200.0),
                        ("flashriftRipEfficiency", 800.0),
                        ("atkHero", 21_615.0),
                    ],
                ),
                (
                    6.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 25.0),
                        ("flashriftRipFinal", 200.0),
                        ("flashriftRipEfficiency", 800.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                    ],
                ),
                (
                    7.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 35.0),
                        ("flashriftRipFinal", 600.0),
                        ("flashriftRipEfficiency", 800.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 60.0),
                    ],
                ),
                (
                    9.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 45.0),
                        ("flashriftRipFinal", 1_100.0),
                        ("flashriftRipEfficiency", 1_000.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 60.0),
                    ],
                ),
                (
                    11.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 45.0),
                        ("flashriftRipFinal", 1_625.0),
                        ("flashriftRipEfficiency", 1_000.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 60.0),
                        ("critDamage", 60.0),
                    ],
                ),
                (
                    13.0,
                    &[
                        ("exposedDamage", 3.0),
                        ("joeyWeakSpot", 45.0),
                        ("flashriftRipFinal", 2_625.0),
                        ("flashriftRipEfficiency", 1_000.0),
                        ("atkHero", 21_615.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 60.0),
                        ("critDamage", 90.0),
                    ],
                ),
            ],
        ),
        "Taloxa" => apply_compact_selected_stat_table(
            output,
            stars,
            &[
                (
                    0.0,
                    &[
                        ("taloxaMaxSync", 300.0),
                        ("taloxaSyncLoss", 10.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 19_515.0),
                    ],
                ),
                (
                    1.0,
                    &[
                        ("taloxaMaxSync", 300.0),
                        ("taloxaSyncLoss", 10.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 19_515.0),
                        ("taloxaOverloadEff", 10.0),
                        ("taloxaOverload", 20.0),
                    ],
                ),
                (
                    2.0,
                    &[
                        ("taloxaMaxSync", 300.0),
                        ("taloxaSyncLoss", 10.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 20_115.0),
                        ("taloxaOverloadEff", 10.0),
                        ("taloxaOverload", 20.0),
                    ],
                ),
                (
                    3.0,
                    &[
                        ("taloxaMaxSync", 350.0),
                        ("taloxaSyncLoss", 10.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 20_115.0),
                        ("taloxaOverloadEff", 15.0),
                        ("taloxaOverload", 20.0),
                        ("laceration", 15.0),
                    ],
                ),
                (
                    4.0,
                    &[
                        ("taloxaMaxSync", 350.0),
                        ("taloxaSyncLoss", 10.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 21_615.0),
                        ("taloxaOverloadEff", 15.0),
                        ("taloxaOverload", 20.0),
                        ("laceration", 15.0),
                    ],
                ),
                (
                    6.0,
                    &[
                        ("taloxaMaxSync", 350.0),
                        ("taloxaSyncLoss", 10.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 21_615.0),
                        ("taloxaOverloadEff", 15.0),
                        ("taloxaOverload", 40.0),
                        ("laceration", 30.0),
                        ("atkHeroPercent", 20.0),
                    ],
                ),
                (
                    7.0,
                    &[
                        ("taloxaMaxSync", 400.0),
                        ("taloxaSyncLoss", 8.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 21_615.0),
                        ("taloxaOverloadEff", 15.0),
                        ("taloxaOverload", 40.0),
                        ("laceration", 30.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 30.0),
                    ],
                ),
                (
                    9.0,
                    &[
                        ("taloxaMaxSync", 400.0),
                        ("taloxaSyncLoss", 8.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 21_615.0),
                        ("taloxaOverloadEff", 15.0),
                        ("taloxaOverload", 60.0),
                        ("laceration", 30.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 30.0),
                        ("critDamage", 30.0),
                    ],
                ),
                (
                    11.0,
                    &[
                        ("taloxaMaxSync", 400.0),
                        ("taloxaSyncLoss", 5.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 21_615.0),
                        ("taloxaOverloadEff", 20.0),
                        ("taloxaOverload", 60.0),
                        ("laceration", 30.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 60.0),
                        ("critDamage", 60.0),
                    ],
                ),
                (
                    13.0,
                    &[
                        ("taloxaMaxSync", 400.0),
                        ("taloxaSyncLoss", 5.0),
                        ("lacerationUptime", 1.0),
                        ("atkHero", 21_615.0),
                        ("taloxaOverloadEff", 20.0),
                        ("taloxaOverload", 60.0),
                        ("laceration", 30.0),
                        ("atkHeroPercent", 20.0),
                        ("skillDamage", 120.0),
                        ("critDamage", 120.0),
                        ("taloxaBeam", 35.0),
                    ],
                ),
            ],
        ),
        "Venato" => apply_compact_selected_stat_table(
            output,
            stars,
            &[
                (0.0, &[("atkHero", 19_515.0)]),
                (1.0, &[("atkHero", 19_515.0), ("adrenaline", 10.0)]),
                (2.0, &[("atkHero", 20_115.0), ("adrenaline", 10.0)]),
                (3.0, &[("atkHero", 20_115.0), ("adrenaline", 30.0)]),
                (4.0, &[("atkHero", 21_615.0), ("adrenaline", 30.0)]),
                (
                    6.0,
                    &[
                        ("atkHero", 21_615.0),
                        ("adrenaline", 30.0),
                        ("damageBoss", 20.0),
                    ],
                ),
                (
                    7.0,
                    &[
                        ("atkHero", 21_615.0),
                        ("adrenaline", 30.0),
                        ("damageBoss", 20.0),
                        ("crimsonBat", 1.5),
                    ],
                ),
                (
                    9.0,
                    &[
                        ("atkHero", 21_615.0),
                        ("adrenaline", 30.0),
                        ("damageBoss", 50.0),
                        ("crimsonBat", 1.5),
                    ],
                ),
                (
                    11.0,
                    &[
                        ("atkHero", 21_615.0),
                        ("adrenaline", 60.0),
                        ("damageBoss", 50.0),
                        ("crimsonBat", 1.5),
                    ],
                ),
                (
                    13.0,
                    &[
                        ("atkHero", 21_615.0),
                        ("adrenaline", 60.0),
                        ("damageBoss", 110.0),
                        ("crimsonBat", 2.0),
                    ],
                ),
            ],
        ),
        _ => {}
    }
}

fn apply_compact_selected_stat_table(
    output: &mut Map<String, Value>,
    value: f64,
    thresholds: &[(f64, &[(&str, f64)])],
) {
    let mut selected = None;
    for (threshold, stats) in thresholds {
        if value >= *threshold {
            selected = Some(*stats);
        }
    }
    if let Some(stats) = selected {
        for (stat, value) in stats {
            add_stat(output, stat, *value);
        }
    }
}

fn apply_compact_donatello_teamwork_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    let donatello_stars = account_inputs["survivors"]["Donatello"]["stars"]
        .as_f64()
        .unwrap_or(0.0);
    let sp_teamwork_count = compact_sp_teamwork_count(account_inputs);
    if donatello_stars <= 0.0 || sp_teamwork_count <= 0.0 {
        return;
    }

    let bonus = 3.0 * sp_teamwork_count;
    if donatello_stars >= 7.0 {
        add_stat(output, "critRate", bonus);
    }
    if donatello_stars >= 8.0 {
        add_stat(output, "critDamage", bonus);
        add_stat(output, "skillDamage", bonus);
    }
    if donatello_stars >= 10.0 {
        add_stat(output, "shieldDamage", bonus);
        add_stat(output, "laceration", bonus);
    }
    if donatello_stars >= 12.0 {
        add_stat(output, "poisoned", bonus);
        add_stat(output, "weakened", bonus);
        add_stat(output, "chilled", bonus);
    }
}

fn finalize_compact_survivor_surface_stats(output: &mut Map<String, Value>) {
    if let Some(value) = output.get("lacerationUptime").and_then(Value::as_f64) {
        output.insert("lacerationUptime".to_string(), json!(value.clamp(0.0, 1.0)));
    }

    if let Some(value) = output.get("exposedDamage").and_then(Value::as_f64) {
        output.insert("exposedDamage".to_string(), json!(value * 10.0));
    }

    if let Some(value) = output.get("taloxaOverloadEff").and_then(Value::as_f64) {
        output.insert("taloxaOverloadEff".to_string(), json!(value * 5.0));
    }
    if let Some(value) = output.get("taloxaOverload").and_then(Value::as_f64) {
        let overload_eff = output
            .get("taloxaOverloadEff")
            .and_then(Value::as_f64)
            .unwrap_or(0.0);
        let overload = value * overload_eff / 100.0;
        output.insert("taloxaOverload".to_string(), json!(overload));
        let beam = (stat_value(output, "taloxaBeam") / 100.0 + 1.0) * overload / 10.0;
        output.insert("taloxaBeam".to_string(), json!(beam));
    }

    if let Some(value) = output.get("joeyWeakSpot").and_then(Value::as_f64) {
        output.insert("joeyWeakSpot".to_string(), json!(value * 0.7));
    }
    if let Some(value) = output.get("flashriftRipFinal").and_then(Value::as_f64) {
        let joey_weak_spot = stat_value(output, "joeyWeakSpot");
        output.insert(
            "flashriftRip".to_string(),
            json!((value + 100.0 * 14.75) / 650.0),
        );
        output.insert(
            "flashriftRipFinal".to_string(),
            json!((value + 100.0) * 14.75 * (joey_weak_spot / 100.0 + 1.0)),
        );
    }
    if let Some(value) = output.get("flashriftRipEfficiency").and_then(Value::as_f64) {
        output.insert("flashriftRipEfficiency".to_string(), json!(value / 30.0));
    }
}

fn compact_sp_teamwork_count(account_inputs: &Value) -> f64 {
    account_inputs["meta"]["teamwork"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .filter(|hero| SP_TEAMWORK_HEROES.contains(hero))
        .count() as f64
}

fn apply_compact_default_pet_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    let Some(active) = account_inputs["pets"]["active"].as_str() else {
        return;
    };
    if XENO_PET_NAMES.contains(&active) {
        return;
    }
    let stars = account_inputs["pets"]["stars"][active]
        .as_f64()
        .unwrap_or(0.0);
    let thresholds: &[(f64, &[(&str, f64)])] = match active {
        "Rex" => &[
            (3.0, &[("critDamage", 5.0)]),
            (10.0, &[("critDamage", 5.0)]),
        ],
        "Croaky" => &[
            (1.0, &[("vulnerability", 12.0)]),
            (10.0, &[("vulnerability", 8.0)]),
        ],
        _ => &[],
    };
    for (threshold, stats) in thresholds {
        if stars >= *threshold {
            for (stat, value) in *stats {
                add_stat(output, stat, *value);
            }
        }
    }
}

fn apply_compact_xeno_pet_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    let Some(active) = account_inputs["pets"]["active"].as_str() else {
        return;
    };
    if !XENO_PET_NAMES.contains(&active) {
        return;
    }

    let active_stars = compact_xeno_pet_stars(account_inputs, active);
    apply_compact_active_xeno_pet_star_stats(output, active, active_stars);
    apply_compact_xeno_support_pet_skill_stats(output, account_inputs, active);
    apply_compact_xeno_awakening_stats(output, account_inputs);
    apply_compact_xeno_global_star_stats(output, account_inputs);
    add_stat(
        output,
        "xenoSyncRate",
        compact_pet_skill_value(account_inputs, "Sync Rate").unwrap_or(0.0),
    );
    add_stat(output, "xenoResChance", 10.0);
    add_stat(output, "xenoResDamage", 10.0);

    let lme_testaments = if account_inputs["ee"]["gameMode"].as_str() == Some("lme2") {
        account_inputs["lme"]["testaments"].as_f64().unwrap_or(0.0)
    } else {
        0.0
    };
    let lme_res_chance = compact_lme_testament_stat_delta(lme_testaments, "xenoResChance");
    let lme_res_damage = compact_lme_testament_stat_delta(lme_testaments, "xenoResDamage");
    let lme_res_duration = compact_lme_testament_stat_delta(lme_testaments, "xenoResDuration");
    let lme_sync_rate = compact_lme_testament_stat_delta(lme_testaments, "xenoSyncRate");
    let hidden_resonance = compact_realizing_childhood_dreams_resonance_stats(account_inputs);
    add_stat(output, "xenoResDuration", hidden_resonance.res_duration);
    add_stat(output, "xenoSyncRate", hidden_resonance.sync_rate);

    let res_chance = (stat_value(output, "xenoResChance") + lme_res_chance).clamp(0.0, 100.0);
    let res_damage = (stat_value(output, "xenoResDamage") + lme_res_damage).max(0.0);
    let res_duration = (stat_value(output, "xenoResDuration") + lme_res_duration).clamp(0.0, 1.0);
    add_stat(
        output,
        "xenoResMultiplier",
        res_chance * res_damage * (4.0 + res_duration) / 500.0,
    );

    let sync_rate = (stat_value(output, "xenoSyncRate") + lme_sync_rate).max(0.0);
    let skill_multiplier = (stat_value(output, "xenoSkillDamage") + 100.0) * 0.01;
    add_stat(
        output,
        "xenoDamage",
        compact_xeno_pet_damage(active, active_stars)
            * compact_xeno_damage_coefficient(active)
            * sync_rate
            / 100.0
            * skill_multiplier,
    );
}

fn apply_compact_pet_skill_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    if account_inputs["pets"]["active"]
        .as_str()
        .map(|active| XENO_PET_NAMES.contains(&active))
        .unwrap_or(false)
    {
        return;
    }
    for skill in account_inputs["pets"]["skillSettings"]
        .as_array()
        .into_iter()
        .flatten()
    {
        if !skill
            .get("enabled")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            continue;
        }
        let Some(skill_name) = skill.get("skill").and_then(Value::as_str) else {
            continue;
        };
        let Some(rarity) = skill.get("rarity").and_then(Value::as_str) else {
            continue;
        };
        for (stat, value) in compact_pet_skill_stat_table(skill_name, rarity) {
            add_stat(output, stat, *value);
        }
    }
}

fn apply_compact_evo_tree_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    for (name, stats) in [
        ("Expose Weakness", &[("critRate", 8.0)][..]),
        ("Viva la Materia", &[("skillDamage", 5.0)][..]),
        ("Watchmaker", &[("atkEquipPercent", 5.0)][..]),
    ] {
        if account_inputs["evo"][name].as_bool().unwrap_or(false) {
            for (stat, value) in stats {
                add_stat(output, stat, *value);
            }
        }
    }
}

fn compact_mount_puzzle_stat_multiplier(index: usize, stars: f64) -> f64 {
    const LEGEND: [f64; 9] = [0.4, 0.44, 0.48, 0.55, 0.62, 0.71, 0.8, 0.9, 1.0];
    const EXCELLENT: [f64; 9] = [0.3, 0.33, 0.36, 0.4, 0.45, 0.5, 0.55, 0.6, 0.75];
    const BETTER: [f64; 9] = [0.2, 0.22, 0.24, 0.28, 0.32, 0.38, 0.44, 0.52, 0.6];

    let stars = compact_mount_star_index(stars);
    match index {
        0 => LEGEND[stars],
        1 => EXCELLENT[stars],
        2 => BETTER[stars],
        _ => 1.0,
    }
}

fn compact_mount_name(index: usize) -> Option<&'static str> {
    match index {
        0 => Some("Doomsteed"),
        1 => Some("Tech Hoverboard"),
        2 => Some("Electric Scooter"),
        _ => None,
    }
}

fn compact_mount_star_index(stars: f64) -> usize {
    stars.clamp(0.0, 8.0).floor() as usize
}

fn compact_mount_damage(index: usize, stars: f64) -> f64 {
    const DOOMSTEED: [f64; 9] = [
        153.0, 180.0, 180.0, 200.0, 200.0, 200.0, 200.0, 260.0, 260.0,
    ];
    const TECH_HOVERBOARD: [f64; 9] = [
        193.6, 194.084, 199.496, 204.424, 204.424, 387.0, 387.0, 500.0, 500.0,
    ];
    const ELECTRIC_SCOOTER: [f64; 9] = [
        153.0, 160.0, 160.0, 180.0, 180.0, 200.0, 200.0, 230.0, 230.0,
    ];
    let stars = compact_mount_star_index(stars);
    match index {
        0 => DOOMSTEED[stars] * 0.0,
        1 => TECH_HOVERBOARD[stars] * 100.0,
        2 => ELECTRIC_SCOOTER[stars] * 77.0,
        _ => 0.0,
    }
}

fn compact_mount_line_stats(
    index: usize,
    stars: f64,
    lines: f64,
) -> &'static [(&'static str, f64)] {
    const MAX_LINES_BY_STARS: [f64; 9] = [4.0, 4.0, 5.0, 5.0, 6.0, 6.0, 7.0, 7.0, 8.0];
    let effective_lines = lines
        .max(0.0)
        .min(MAX_LINES_BY_STARS[compact_mount_star_index(stars)])
        .floor() as u8;
    match index {
        0 => match effective_lines {
            8.. => &[
                ("poisoned", 200.0),
                ("skillDamage", 200.0),
                ("laceration", 30.0),
                ("damageBoss", 30.0),
            ],
            7 => &[
                ("poisoned", 200.0),
                ("skillDamage", 200.0),
                ("laceration", 30.0),
                ("damageBoss", 5.0),
            ],
            6 => &[
                ("poisoned", 120.0),
                ("skillDamage", 200.0),
                ("laceration", 30.0),
            ],
            4..=5 => &[("poisoned", 60.0), ("skillDamage", 200.0)],
            3 => &[("poisoned", 60.0), ("skillDamage", 50.0)],
            1..=2 => &[("poisoned", 20.0)],
            _ => &[],
        },
        1 => match effective_lines {
            8.. => &[
                ("chilled", 200.0),
                ("skillDamage", 100.0),
                ("shieldDamage", 100.0),
            ],
            7 => &[
                ("chilled", 200.0),
                ("skillDamage", 100.0),
                ("shieldDamage", 40.0),
            ],
            6 => &[
                ("chilled", 140.0),
                ("skillDamage", 55.0),
                ("shieldDamage", 40.0),
            ],
            5 => &[
                ("chilled", 100.0),
                ("skillDamage", 25.0),
                ("shieldDamage", 40.0),
            ],
            4 => &[
                ("chilled", 40.0),
                ("skillDamage", 25.0),
                ("shieldDamage", 40.0),
            ],
            3 => &[("chilled", 40.0), ("skillDamage", 25.0)],
            1..=2 => &[("chilled", 15.0), ("skillDamage", 10.0)],
            _ => &[],
        },
        2 => match effective_lines {
            8.. => &[
                ("weakened", 80.0),
                ("critDamage", 200.0),
                ("laceration", 30.0),
            ],
            7 => &[
                ("weakened", 80.0),
                ("critDamage", 200.0),
                ("laceration", 10.0),
            ],
            6 => &[
                ("weakened", 45.0),
                ("critDamage", 110.0),
                ("laceration", 10.0),
            ],
            5 => &[
                ("weakened", 25.0),
                ("critDamage", 55.0),
                ("laceration", 10.0),
            ],
            4 => &[("weakened", 25.0), ("critDamage", 55.0)],
            3 => &[("weakened", 25.0), ("critDamage", 20.0)],
            1..=2 => &[("weakened", 10.0)],
            _ => &[],
        },
        _ => &[],
    }
}

fn compact_pet_skill_stat_table(skill: &str, rarity: &str) -> &'static [(&'static str, f64)] {
    match (skill, rarity) {
        ("Motivation", "Excellent") => &[("critRate", 3.0)],
        ("Motivation", "Advanced") => &[("critRate", 4.0)],
        ("Motivation", "Super") => &[("critRate", 5.0)],
        ("Inspiration", "Excellent") => &[("critDamage", 6.0)],
        ("Inspiration", "Super") => &[("critDamage", 10.0)],
        ("Encouragement", "Excellent") => &[("skillDamage", 3.0)],
        ("Encouragement", "Super") => &[("skillDamage", 5.0)],
        _ => &[],
    }
}

fn compact_pet_skill_value(account_inputs: &Value, skill: &str) -> Option<f64> {
    account_inputs["pets"]["skillSettings"]
        .as_array()?
        .iter()
        .find(|item| item.get("skill").and_then(Value::as_str) == Some(skill))?
        .get("value")?
        .as_f64()
}

fn compact_taloxa_laceration_uptime_active(compact: &Value, account_inputs: &Value) -> bool {
    let teamwork_has_taloxa = account_inputs["meta"]["teamwork"]
        .as_array()
        .into_iter()
        .flatten()
        .any(|hero| hero.as_str() == Some("Taloxa"));
    if !teamwork_has_taloxa {
        return false;
    }
    let taloxa_stars = account_inputs["survivors"]["Taloxa"]["stars"]
        .as_f64()
        .unwrap_or(0.0);
    (taloxa_stars >= 7.0
        && (compact_skill_enabled(compact, "Rocket Mode")
            || compact_skill_enabled(compact, "Rocket")))
        || (taloxa_stars >= 8.0 && compact_skill_enabled(compact, "Laser Mode"))
        || (taloxa_stars >= 10.0
            && (compact_skill_enabled(compact, "Drone Mode")
                || compact_skill_enabled(compact, "Drone")))
}

fn compact_skill_enabled(compact: &Value, skill: &str) -> bool {
    compact
        .get("p")
        .and_then(Value::as_array)
        .and_then(|skills| {
            COMPACT_CONFIG_SKILL_ORDER
                .iter()
                .position(|name| *name == skill)
                .and_then(|index| skills.get(index))
        })
        .is_some_and(|value| bool_from_number(Some(value)))
}

fn compact_xeno_pet_stars(account_inputs: &Value, pet: &str) -> f64 {
    account_inputs["pets"]["stars"][pet].as_f64().unwrap_or(0.0)
}

fn apply_compact_xeno_support_pet_skill_stats(
    output: &mut Map<String, Value>,
    account_inputs: &Value,
    active: &str,
) {
    for (support_index, support) in account_inputs["pets"]["support"]
        .as_array()
        .into_iter()
        .flatten()
        .enumerate()
    {
        let pet = if support_index == 0 {
            active
        } else {
            support.get("pet").and_then(Value::as_str).unwrap_or("None")
        };
        if !XENO_PET_NAMES.contains(&pet) {
            continue;
        }
        let stars = compact_xeno_pet_stars(account_inputs, pet);
        for skill_index in support["skillIndexes"].as_array().into_iter().flatten() {
            let Some(stat) = skill_index
                .as_u64()
                .and_then(compact_xeno_support_skill_stat)
            else {
                continue;
            };
            add_stat(output, stat, compact_xeno_support_skill_value(stat, stars));
        }
    }
}

fn compact_xeno_support_skill_stat(index: u64) -> Option<&'static str> {
    match index {
        4 => Some("shieldDamage"),
        11 => Some("chilled"),
        53 => Some("xenoResChance"),
        54 => Some("xenoResDamage"),
        60 => Some("atkPercent"),
        6 => Some("poisoned"),
        9 => Some("weakened"),
        _ => None,
    }
}

fn compact_xeno_support_skill_value(stat: &str, stars: f64) -> f64 {
    let index = stars.clamp(0.0, 10.0).floor() as usize;
    let values: &[f64; 11] = match stat {
        "xenoResChance" | "xenoResDamage" => {
            &[0.0, 3.0, 6.0, 6.0, 9.0, 9.0, 15.0, 15.0, 22.5, 22.5, 30.0]
        }
        "shieldDamage" | "atkPercent" => {
            &[0.0, 4.0, 8.0, 8.0, 12.0, 12.0, 20.0, 20.0, 30.0, 30.0, 40.0]
        }
        "poisoned" | "weakened" | "chilled" => &[
            0.0, 5.0, 10.0, 10.0, 15.0, 15.0, 25.0, 25.0, 37.5, 37.5, 50.0,
        ],
        _ => &[0.0; 11],
    };
    values[index]
}

#[derive(Default)]
struct CompactXenoHiddenResonance {
    sync_rate: f64,
    res_duration: f64,
}

fn compact_realizing_childhood_dreams_resonance_stats(
    account_inputs: &Value,
) -> CompactXenoHiddenResonance {
    let metrics = compact_collectible_set_metrics(account_inputs, &[24, 25, 26, 27]);
    CompactXenoHiddenResonance {
        sync_rate: if metrics.gold >= 20.0 { 10.0 } else { 0.0 },
        res_duration: if metrics.red >= 10.0 { 1.0 } else { 0.0 },
    }
}

fn compact_lme_testament_stat_delta(testaments: f64, stat: &str) -> f64 {
    COMPACT_LME_DEBUFF_DELTAS
        .iter()
        .filter(|(threshold, candidate, _)| testaments >= *threshold && *candidate == stat)
        .map(|(_, _, delta)| *delta)
        .sum()
}

fn compact_xeno_pet_damage(pet: &str, stars: f64) -> f64 {
    let index = stars.clamp(0.0, 10.0).floor() as usize;
    let values: &[f64; 11] = match pet {
        "Capy" => &[
            6.0, 9.18, 11.808, 16.409, 17.026, 27.717, 39.942, 47.529, 78.247, 87.172, 96.089,
        ],
        "Clucker" => &[
            2.6, 4.264, 6.182, 9.768, 14.36, 25.417, 40.668, 50.021, 76.032, 91.239, 109.487,
        ],
        "Puffo" => &[
            2.079, 2.426, 2.973, 3.475, 5.473, 6.828, 10.75, 11.912, 23.626, 24.648, 24.932,
        ],
        "King Blizzblast" => &[
            2.743, 4.498, 9.728, 13.699, 23.523, 30.817, 52.087, 59.403, 74.119, 78.276, 98.884,
        ],
        "Nutjob" | "Gourmeow" => &[
            12.24, 17.047, 23.74, 26.607, 29.438, 40.478, 50.996, 54.094, 59.611, 62.441, 70.948,
        ],
        _ => &[0.0; 11],
    };
    values[index]
}

fn compact_xeno_damage_coefficient(pet: &str) -> f64 {
    match pet {
        "Capy" => 188.26,
        "Clucker" => 158.7,
        "Puffo" => 308.67,
        "King Blizzblast" => 198.74,
        "Nutjob" | "Gourmeow" => 300.0,
        _ => 0.0,
    }
}

fn apply_compact_active_xeno_pet_star_stats(
    output: &mut Map<String, Value>,
    pet: &str,
    stars: f64,
) {
    match pet {
        "Capy" => {
            if stars >= 4.0 {
                add_stat(output, "skillDamage", 40.0);
            }
            if stars >= 10.0 {
                add_stat(output, "skillDamage", 40.0);
            }
        }
        "Clucker" => {
            if stars >= 4.0 {
                add_stat(output, "critRate", 15.0);
                add_stat(output, "critDamage", 40.0);
            }
            if stars >= 10.0 {
                add_stat(output, "critRate", 15.0);
                add_stat(output, "critDamage", 40.0);
            }
        }
        "Puffo" => {
            add_stat(output, "poisonedUptime", 1.0);
            add_stat(output, "weakenedUptime", 1.0);
            if stars >= 4.0 {
                add_stat(output, "poisoned", 70.0);
            }
            if stars >= 10.0 {
                add_stat(output, "weakened", 70.0);
            }
        }
        "King Blizzblast" => {
            add_stat(output, "chilledUptime", 1.0);
            if stars >= 4.0 {
                add_stat(output, "chilled", 70.0);
                add_stat(output, "damageBoss", 2.0);
            }
            if stars >= 10.0 {
                add_stat(output, "chilled", 70.0);
                add_stat(output, "damageBoss", 3.0);
            }
        }
        "Nutjob" => {
            add_stat(output, "weakenedUptime", 1.0);
            if stars >= 4.0 {
                add_stat(output, "weakened", 75.0);
                add_stat(output, "damageBoss", 4.0);
            }
            if stars >= 10.0 {
                add_stat(output, "weakened", 75.0);
                add_stat(output, "damageBoss", 6.0);
            }
        }
        "Gourmeow" => {
            if stars >= 4.0 {
                add_stat(output, "shieldDamage", 50.0);
                add_stat(output, "damageBoss", 7.0);
            }
            if stars >= 10.0 {
                add_stat(output, "shieldDamage", 50.0);
                add_stat(output, "damageBoss", 8.0);
            }
        }
        _ => {}
    }
}

fn apply_compact_xeno_global_star_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    for pet in XENO_PET_NAMES {
        if compact_xeno_pet_stars(account_inputs, pet) < 10.0 {
            continue;
        }
        match pet {
            "Capy" => {
                add_stat(output, "skillDamage", 50.0);
                add_stat(output, "xenoSkillDamage", 60.0);
            }
            "Clucker" => {
                add_stat(output, "critDamage", 50.0);
                add_stat(output, "xenoSkillDamage", 60.0);
            }
            "Puffo" => {
                add_stat(output, "poisoned", 30.0);
                add_stat(output, "xenoSkillDamage", 60.0);
            }
            "King Blizzblast" => {
                add_stat(output, "chilled", 30.0);
                add_stat(output, "xenoSkillDamage", 60.0);
            }
            "Nutjob" => {
                add_stat(output, "weakened", 30.0);
                add_stat(output, "xenoSkillDamage", 60.0);
            }
            "Gourmeow" => {
                add_stat(output, "shieldDamage", 25.0);
                add_stat(output, "xenoSkillDamage", 60.0);
            }
            _ => {}
        }
    }
}

fn apply_compact_xeno_awakening_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    for (row, (stat, values)) in XENO_AWAKENING_STATS.iter().enumerate() {
        let count = XENO_PET_NAMES
            .iter()
            .filter(|pet| compact_xeno_pet_stars(account_inputs, pet) > row as f64)
            .count();
        add_stat(output, stat, values[count]);
    }
}

fn apply_compact_synergy_stats(output: &mut Map<String, Value>, synergy_level: f64) {
    let Some(stats) = COMPACT_SYNERGY_STATS
        .iter()
        .rev()
        .find(|stats| synergy_level >= stats.threshold)
    else {
        return;
    };

    for (key, value) in [
        ("critDamage", stats.crit_damage),
        ("skillDamage", stats.skill_damage),
        ("shieldDamage", stats.shield_damage),
        ("weakened", stats.weakened),
        ("poisoned", stats.poisoned),
        ("chilled", stats.chilled),
        ("laceration", stats.laceration),
        ("damageBoss", stats.damage_boss),
    ] {
        add_stat(output, key, value);
    }
}

fn apply_compact_static_base_stats(output: &mut Map<String, Value>) {
    for (key, value) in [
        ("critDamage", 200.0),
        ("shieldDamageUptime", 1.0),
        ("voidNeckBoostUptime", 1.0),
    ] {
        add_stat(output, key, value);
    }
}

fn apply_compact_harmony_stats(output: &mut Map<String, Value>, account_inputs: &Value) {
    let meta = &account_inputs["meta"];
    let selected = [
        meta["mainHero"].as_str(),
        meta["harmonyL"].as_str(),
        meta["harmonyR"].as_str(),
    ];
    let mut gold_stars = 0.0;
    let mut red_stars = 0.0;

    for hero in selected.into_iter().flatten() {
        let stars = account_inputs["survivors"][hero]["stars"]
            .as_f64()
            .unwrap_or(0.0);
        gold_stars += stars.min(6.0);
        red_stars += (stars - 6.0).max(0.0);
    }

    if (gold_stars - 18.0).abs() >= f64::EPSILON {
        red_stars = 0.0;
    }
    let left_level = if red_stars > 0.0 {
        (red_stars / 4.0).floor() + 1.0
    } else {
        0.0
    };
    let right_level = if red_stars > 0.0 {
        ((red_stars + 2.0) / 4.0).floor()
    } else {
        0.0
    };

    if let Some(hero) = meta["harmonyL"].as_str() {
        apply_compact_harmony_level_stats(output, hero, left_level);
    }
    if let Some(hero) = meta["harmonyR"].as_str() {
        apply_compact_harmony_level_stats(output, hero, right_level);
    }
    apply_compact_harmony_star_stats(output, gold_stars);
}

fn apply_compact_active_skill_base_stats(output: &mut Map<String, Value>, compact: &Value) {
    if compact_skill_enabled(compact, "HP Bullet") {
        add_stat(output, "hpBulletBoost", 50.0);
    }
}

fn apply_compact_harmony_star_stats(output: &mut Map<String, Value>, gold_stars: f64) {
    let crit_rate = if gold_stars >= 18.0 {
        30.0
    } else if gold_stars >= 15.0 {
        25.0
    } else if gold_stars >= 12.0 {
        20.0
    } else if gold_stars >= 9.0 {
        15.0
    } else if gold_stars >= 6.0 {
        10.0
    } else if gold_stars >= 3.0 {
        5.0
    } else if gold_stars >= 1.0 {
        2.0
    } else {
        0.0
    };
    add_stat(output, "critRate", crit_rate);
}

fn apply_compact_harmony_level_stats(output: &mut Map<String, Value>, hero: &str, level: f64) {
    match hero {
        "Common" => {
            if level >= 1.0 {
                add_stat(output, "harmonyCommon", 30.0);
            }
            if level >= 2.0 {
                add_stat(output, "harmonyCommon", 15.0);
            }
            if level >= 4.0 {
                add_stat(output, "harmonyCommon", 15.0);
            }
            if level >= 5.0 {
                add_stat(output, "skillDamage", 20.0);
            }
        }
        "King" => {
            if level >= 1.0 {
                add_stat(output, "harmonyKing", 16.6544);
            }
            if level >= 2.0 {
                add_stat(output, "harmonyKing", 16.6544);
            }
            if level >= 3.0 {
                add_stat(output, "vulnerability", 5.0);
            }
            if level >= 4.0 {
                add_stat(output, "harmonyKing", 16.6544);
            }
            if level >= 5.0 {
                add_stat(output, "vulnerability", 5.0);
            }
        }
        "Master Yang" => {
            if level >= 1.0 {
                add_stat(output, "harmonyYang", 131.0);
            }
            if level >= 2.0 {
                add_stat(output, "harmonyYang", 86.46000000000001);
            }
            if level >= 3.0 {
                add_stat(output, "vulnerability", 25.0);
            }
            if level >= 4.0 {
                add_stat(output, "harmonyYang", 22.270000000000003);
            }
            if level >= 5.0 {
                add_stat(output, "vulnerability", 25.0);
            }
        }
        "Metalia" => {
            if level >= 1.0 {
                add_stat(output, "harmonyMetalia", 35.68);
                add_stat(output, "poisonedUptime", 0.1111111111111111);
                add_stat(output, "weakenedUptime", 0.1111111111111111);
                add_stat(output, "chilledUptime", 0.1111111111111111);
            }
            if level >= 2.0 {
                add_stat(output, "weakened", 25.0);
                add_stat(output, "chilled", 25.0);
            }
            if level >= 3.0 {
                add_stat(output, "poisoned", 25.0);
                add_stat(output, "chilled", 25.0);
            }
            if level >= 4.0 {
                add_stat(output, "harmonyMetalia", 71.36);
                add_stat(output, "poisonedUptime", 1.0);
                add_stat(output, "weakenedUptime", 1.0);
                add_stat(output, "chilledUptime", 1.0);
            }
            if level >= 5.0 {
                add_stat(output, "harmonyMetalia", 53.519999999999996);
                add_stat(output, "weakened", 25.0);
                add_stat(output, "poisoned", 25.0);
            }
        }
        "Joey" => {
            if level >= 1.0 {
                add_stat(output, "harmonyJoey", 89.2);
            }
            if level >= 2.0 {
                add_stat(output, "harmonyJoey", 11.863600000000002);
            }
            if level >= 3.0 {
                add_stat(output, "harmonyJoey", 35.68);
                add_stat(output, "exposedDamage", 1.5);
                add_stat(output, "weakenedUptime", 0.625);
            }
            if level >= 4.0 {
                add_stat(output, "harmonyJoey", 34.5204);
            }
            if level >= 5.0 {
                add_stat(output, "harmonyJoey", 85.632);
                add_stat(output, "exposedDamage", 1.5);
            }
        }
        "Taloxa" => {
            if level >= 1.0 {
                add_stat(output, "harmonyTaloxa", 33.0);
            }
            if level >= 2.0 {
                add_stat(output, "harmonyTaloxa", 9.9);
            }
            if level >= 3.0 {
                add_stat(output, "harmonyTaloxa", 42.9);
                add_stat(output, "laceration", 20.0);
            }
            if level >= 4.0 {
                add_stat(output, "harmonyTaloxa", 33.0);
            }
            if level >= 5.0 {
                add_stat(output, "harmonyTaloxa", 9.9);
                add_stat(output, "laceration", 30.0);
            }
        }
        "Venato" => {
            if level >= 3.0 {
                add_stat(output, "damageBoss", 15.0);
            }
            if level >= 5.0 {
                add_stat(output, "damageBoss", 25.0);
            }
        }
        _ => {}
    }
}

fn apply_compact_lme_testament_stats(output: &mut Map<String, Value>, testaments: f64) {
    for (threshold, stat, delta) in COMPACT_LME_DEBUFF_DELTAS {
        if testaments >= *threshold {
            add_stat(output, stat, *delta);
        }
    }
}

fn apply_compact_ee_skill_stats(output: &mut Map<String, Value>, skills: &Value) {
    for (group, selected) in skills.as_array().into_iter().flatten().enumerate() {
        let Some(index) = selected.as_i64() else {
            continue;
        };
        if index < 0 {
            continue;
        }
        for (stat, value) in compact_ee_skill_stats(group, index) {
            add_stat(output, stat, *value);
        }
    }
}

fn compact_ee_skill_stats(group: usize, index: i64) -> &'static [(&'static str, f64)] {
    match (group, index) {
        (0, 0) => &[("critDamage", 30.0)],
        (0, 1) => &[("critDamage", 90.0), ("damageDealt", -5.0)],
        (0, 2) => &[("critDamage", 60.0)],
        (0, 3) => &[("critDamage", 60.0), ("critRate", -15.0)],
        (0, 4) => &[("critRate", 15.0)],
        (0, 5) => &[("critRate", 30.0), ("damageDealt", -5.0)],
        (0, 6) => &[("critRate", 30.0)],
        (0, 7) => &[
            ("damageDealt", 30.0),
            ("critRate", 15.0),
            ("critDamage", -60.0),
        ],
        (0, 8) => &[("damageDealt", 15.0), ("critRate", -15.0)],
        (0, 9) => &[("damageDealt", 15.0)],
        (2, 0) => &[("shieldDamage", 30.0)],
        (2, 1) => &[("damageDealt", 20.0)],
        (2, 2) => &[("damageDealt", 20.0)],
        (2, 3) => &[("skillDamage", 50.0)],
        (2, 4) => &[("poisoned", 10.0), ("chilled", 10.0), ("weakened", 10.0)],
        (2, 5) => &[("skillDamage", 100.0)],
        _ => &[],
    }
}

fn derive_compact_base_stats(compact: &Value, account_inputs: &Value) -> Value {
    derive_generic_compact_base_stats(compact, account_inputs)
}

/// Decode the compact sio-tools config fields needed by the live Tech optimizer
/// `lm()` path. This is intentionally narrower than a full public export
/// decoder: it extracts the worker-side meta/settings/skills/techsOptimizer
/// surface used by the captured skills worker requests.
pub fn decode_sio_lm_compact_summary(compact: &Value) -> Value {
    let meta = compact_object(compact, "a");
    let settings = compact_object(compact, "E");
    let optimizer = compact_object(compact, "X");

    let skills = compact
        .get("p")
        .and_then(Value::as_array)
        .map(|skills| {
            let mut output = Map::new();
            for (index, enabled) in skills.iter().enumerate() {
                if bool_from_number(Some(enabled)) {
                    if let Some(name) = COMPACT_CONFIG_SKILL_ORDER.get(index) {
                        output.insert((*name).to_string(), Value::Bool(true));
                    }
                }
            }
            Value::Object(output)
        })
        .unwrap_or_else(|| json!({}));

    let inputs = optimizer
        .and_then(|optimizer| optimizer.get("V"))
        .and_then(Value::as_array)
        .map(|inputs| {
            let mut output = Map::new();
            for (index, rarity) in RARITY_INPUT_ORDER.iter().enumerate() {
                output.insert(
                    (*rarity).to_string(),
                    inputs.get(index).cloned().unwrap_or_else(|| json!(0)),
                );
            }
            Value::Object(output)
        })
        .unwrap_or_else(|| json!({}));

    let modes = optimizer
        .and_then(|optimizer| optimizer.get("W"))
        .and_then(Value::as_array)
        .map(|modes| {
            Value::Array(
                modes
                    .iter()
                    .filter_map(config_mode_name)
                    .map(|mode| Value::String(mode.to_string()))
                    .collect(),
            )
        })
        .unwrap_or_else(|| json!([]));

    let mode_entries = optimizer
        .and_then(|optimizer| optimizer.get("bI"))
        .and_then(Value::as_array)
        .map(|entries| {
            let mut output = Map::new();
            for (index, entry) in entries.iter().enumerate() {
                let Some(mode) = LIVE_MODE_ORDER.get(index) else {
                    continue;
                };
                output.insert(
                    (*mode).to_string(),
                    json!({
                        "minResonance": entry.get("bv").cloned().unwrap_or_else(|| json!(0)),
                        "maxResonance": entry.get("bw").cloned().unwrap_or_else(|| json!(15000)),
                        "minOverload": entry.get("bx").cloned().unwrap_or_else(|| json!(0)),
                        "maxOverload": entry.get("by").cloned().unwrap_or_else(|| json!(18)),
                    }),
                );
            }
            Value::Object(output)
        })
        .unwrap_or_else(|| json!({}));

    let skills_map = optimizer
        .and_then(|optimizer| optimizer.get("+"))
        .and_then(Value::as_array)
        .map(|entries| {
            let mut output = Map::new();
            for (index, entry) in entries.iter().enumerate() {
                let Some(mode) = LIVE_MODE_ORDER.get(index) else {
                    continue;
                };
                let status = entry
                    .as_u64()
                    .and_then(|status| SKILLS_MAP_STATUS_ORDER.get(status as usize))
                    .copied()
                    .unwrap_or("enabled");
                output.insert((*mode).to_string(), Value::String(status.to_string()));
            }
            Value::Object(output)
        })
        .unwrap_or_else(|| json!({}));

    let account_inputs = json!({
        "meta": decode_compact_account_meta(meta),
        "survivors": decode_compact_survivors(compact),
        "collectibles": decode_compact_collectibles(compact),
        "customSets": decode_compact_custom_sets(compact),
        "evo": decode_compact_evo(compact),
        "pets": decode_compact_pets(compact),
        "mounts": decode_compact_mounts(compact),
        "lme": decode_compact_lme(compact, meta),
        "ee": decode_compact_ee(meta),
    });
    let derived_base_stats = derive_compact_base_stats(compact, &account_inputs);

    json!({
        "meta": {
            "atkBase": number_or_null(meta.and_then(|meta| meta.get("("))),
            "atkFinal": number_or_null(meta.and_then(|meta| meta.get("$"))),
            "designs": number_or_null(meta.and_then(|meta| meta.get("*"))),
            "maxGear": number_or_null(meta.and_then(|meta| meta.get("%"))),
            "gameMode": meta.and_then(|meta| meta.get("I")).cloned().unwrap_or(Value::Null),
            "lmeTestaments": number_or_null(meta.and_then(|meta| meta.get("J"))),
            "eeSkills": meta.and_then(|meta| meta.get("K")).cloned().unwrap_or(Value::Null),
            "eeOmnipower": meta.and_then(|meta| meta.get("ba")).cloned().unwrap_or(Value::Null),
            "clanLevel": number_or_null(meta.and_then(|meta| meta.get("bb"))),
        },
        "ssEquipment": decode_compact_ss_equipment(compact),
        "settings": {
            "calcMode": settings.and_then(|settings| settings.get("O")).cloned().unwrap_or(Value::Null),
            "revives": settings.and_then(|settings| settings.get("F")).cloned().unwrap_or(Value::Null),
            "numberFormat": settings.and_then(|settings| settings.get("L")).cloned().unwrap_or(Value::Null),
            "experimentalFeatures": settings.and_then(|settings| settings.get("bf")).cloned().unwrap_or(Value::Null),
        },
        "skills": skills,
        "techsOptimizer": {
            "strategy": optimizer.and_then(|optimizer| optimizer.get("bC")).cloned().unwrap_or(Value::Null),
            "speedMode": optimizer.and_then(|optimizer| optimizer.get("bD")).cloned().unwrap_or(Value::Null),
            "reservedLegends": optimizer.and_then(|optimizer| optimizer.get("bE")).cloned().unwrap_or(Value::Null),
            "fodder": optimizer.and_then(|optimizer| optimizer.get("bF")).cloned().unwrap_or(Value::Null),
            "skills": optimizer.and_then(|optimizer| optimizer.get("p")).cloned().unwrap_or(Value::Null),
            "chips": optimizer.and_then(|optimizer| optimizer.get("U")).cloned().unwrap_or(Value::Null),
            "overloadable": optimizer.and_then(|optimizer| optimizer.get("bG")).cloned().unwrap_or(Value::Null),
            "inputs": inputs,
            "modes": modes,
            "limit": optimizer.and_then(|optimizer| optimizer.get("bH")).cloned().unwrap_or(Value::Null),
            "modeEntries": mode_entries,
            "skillsMap": skills_map,
            "expanded": optimizer.and_then(|optimizer| optimizer.get(")")).cloned().unwrap_or(Value::Null),
        },
        "accountInputs": account_inputs,
        "derivedBaseStats": derived_base_stats,
    })
}
