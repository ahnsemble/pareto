use serde::{Deserialize, Serialize};
use thiserror::Error;

const HERO_BITS: u32 = 6;
const TECH_BITS: u32 = 10;
const COLLECTIBLE_HIGH_BITS: u32 = 48;
const COLLECTIBLE_LOW_BITS: u32 = 16;
const MAX_HERO_ID: u64 = (1 << HERO_BITS) - 1;
const MAX_TECH_MASK: u64 = (1 << TECH_BITS) - 1;

#[derive(Debug, Error)]
pub enum BitmaskError {
    #[error("{0} must be between 0 and {1}, got {2}")]
    OutOfRange(&'static str, u64, u64),
    #[error("collectible id must be canonical or end with a slot index: {0}")]
    BadCollectibleId(String),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DecodedBitmaskV2 {
    pub hero_id: u64,
    pub tech_mask: u64,
    pub collectible_mask: u64,
}

pub fn compute_bitmask_v2(
    hero_id: u64,
    collectible_mask: u64,
    tech_mask: u64,
) -> Result<(u64, u64), BitmaskError> {
    require_range("hero_id", hero_id, MAX_HERO_ID)?;
    require_range("tech_mask", tech_mask, MAX_TECH_MASK)?;
    let collectible_hi = collectible_mask >> COLLECTIBLE_LOW_BITS;
    let collectible_lo = collectible_mask & ((1 << COLLECTIBLE_LOW_BITS) - 1);
    let hi = (hero_id << (TECH_BITS + COLLECTIBLE_HIGH_BITS))
        | (tech_mask << COLLECTIBLE_HIGH_BITS)
        | collectible_hi;
    Ok((hi, collectible_lo))
}

pub fn decode_bitmask_v2(key: (u64, u64)) -> DecodedBitmaskV2 {
    let (hi, lo) = key;
    let collectible_hi = hi & ((1 << COLLECTIBLE_HIGH_BITS) - 1);
    let tech_mask = (hi >> COLLECTIBLE_HIGH_BITS) & MAX_TECH_MASK;
    let hero_id = (hi >> (TECH_BITS + COLLECTIBLE_HIGH_BITS)) & MAX_HERO_ID;
    let collectible_mask =
        (collectible_hi << COLLECTIBLE_LOW_BITS) | (lo & ((1 << COLLECTIBLE_LOW_BITS) - 1));
    DecodedBitmaskV2 {
        hero_id,
        tech_mask,
        collectible_mask,
    }
}

pub fn collectible_to_bits(collectible_ids: &[String]) -> Result<u64, BitmaskError> {
    let mut mask = 0_u64;
    for collectible_id in collectible_ids {
        mask |= 1_u64 << collectible_slot(collectible_id)?;
    }
    Ok(mask)
}

fn require_range(name: &'static str, value: u64, upper_bound: u64) -> Result<(), BitmaskError> {
    if value > upper_bound {
        Err(BitmaskError::OutOfRange(name, upper_bound, value))
    } else {
        Ok(())
    }
}

fn collectible_slot(collectible_id: &str) -> Result<u32, BitmaskError> {
    if let Some(slot) = canonical_collectible_slot(collectible_id) {
        return Ok(slot);
    }
    let digits: String = collectible_id
        .chars()
        .rev()
        .take_while(|ch| ch.is_ascii_digit())
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    let slot: u32 = digits
        .parse()
        .map_err(|_| BitmaskError::BadCollectibleId(collectible_id.to_string()))?;
    if slot > 63 {
        return Err(BitmaskError::OutOfRange(
            "collectible slot",
            63,
            slot as u64,
        ));
    }
    Ok(slot)
}

fn canonical_collectible_slot(name: &str) -> Option<u32> {
    CANONICAL_COLLECTIBLES
        .iter()
        .position(|candidate| *candidate == name)
        .map(|index| index as u32)
}

const CANONICAL_COLLECTIBLES: &[&str] = &[
    "Instellar Transition Matrix Design",
    "Book of Ancient Wisdom",
    "Otherworld Key",
    "Starcore Diamond",
    "Eye of True Vision",
    "Life Hourglass",
    "Old Medical Book",
    "Scientific Luminary's Journal",
    "Superhuman Pill",
    "Dimension Foil",
    "Mental Sync Helm",
    "Dragon Tooth",
    "Hyper Neuron",
    "Lucky Charm",
    "Gene Splicer",
    "Dreamscape Puzzle",
    "Tablet of Epics",
    "Flaming Plume",
    "Plasma Sword",
    "Golden Horn",
    "Hydraulic Flipper",
    "Wormhole Detector",
    "Cosmic Compass",
    "Antiparticle Gourd",
    "Klein Bottle",
    "Human Genome Mapping",
    "Immortal Lucky Coin",
    "Angelic Tear Crystal",
    "Unicorn's Horn",
    "Void Bloom",
    "High-Lat Energy Cube",
    "Nano-Mimetic Mask",
    "Dice of Destiny",
    "Atomic Mech",
    "Time Essence Bottle",
    "Cyber Totem",
    "Clone Mirror",
    "Spatial Rewinder",
    "Holodream Fluid",
    "Temporal Rewinder",
    "Memory Editor",
    "Golden Cutlery",
    "Savior's Memento",
    "Safehouse Map",
    "Super Circuit Board",
    "Mystical Halo",
    "Primordial War Drum",
    "Astral Dewdrop",
    "Nuclear Battery",
    "Elemental Ring",
    "Anti-Gravity Device",
    "Comms Conch",
    "Mini Dyson Sphere",
    "Micro Artificial Sun",
    "Wildfire Furnace",
    "Infinity Score",
    "Shuttle Capsule",
    "Neurochip",
    "Star-Rail Passenger Card",
    "Portable Mech Case",
    "Geocore Orb",
    "Aquacore Orb",
    "Pyrocore Orb",
    "Aerocore Orb",
];
