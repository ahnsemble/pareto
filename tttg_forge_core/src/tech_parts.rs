#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash, serde::Serialize, serde::Deserialize)]
pub enum TwinbornCategory {
    EnergyGuidanceSystem,
    AntimatterMaintainer,
    QuantumNanobot,
    PhaseDriver,
    EnergyDiffuser,
    HiMaintainer,
    PrecisionDevice,
    AntimatterGenerator,
    ExoRadicator,
    HiGravityPulser,
}

impl TwinbornCategory {
    pub const ALL: [TwinbornCategory; 10] = [
        TwinbornCategory::EnergyGuidanceSystem,
        TwinbornCategory::AntimatterMaintainer,
        TwinbornCategory::QuantumNanobot,
        TwinbornCategory::PhaseDriver,
        TwinbornCategory::EnergyDiffuser,
        TwinbornCategory::HiMaintainer,
        TwinbornCategory::PrecisionDevice,
        TwinbornCategory::AntimatterGenerator,
        TwinbornCategory::ExoRadicator,
        TwinbornCategory::HiGravityPulser,
    ];
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash, serde::Serialize, serde::Deserialize)]
pub enum TechMode {
    MolotovMode,
    DurianMode,
    SoccerMode,
    DroneMode,
    ForcefieldMode,
    DrillShotMode,
    RocketMode,
    LightningMode,
    BoomerangMode,
    GuardianMode,
    LaserMode,
    BrickMode,
}

impl TechMode {
    pub const ALL: [TechMode; 12] = [
        TechMode::MolotovMode,
        TechMode::DurianMode,
        TechMode::SoccerMode,
        TechMode::DroneMode,
        TechMode::ForcefieldMode,
        TechMode::DrillShotMode,
        TechMode::RocketMode,
        TechMode::LightningMode,
        TechMode::BoomerangMode,
        TechMode::GuardianMode,
        TechMode::LaserMode,
        TechMode::BrickMode,
    ];
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash, serde::Serialize, serde::Deserialize)]
pub enum TechRarity {
    Legend,
    Epic1,
    Epic,
    Excellent1,
    Excellent,
    Better,
    Good,
    Advanced,
    Super,
    All,
}

impl TechRarity {
    pub const ALL: [TechRarity; 10] = [
        TechRarity::Legend,
        TechRarity::Epic1,
        TechRarity::Epic,
        TechRarity::Excellent1,
        TechRarity::Excellent,
        TechRarity::Better,
        TechRarity::Good,
        TechRarity::Advanced,
        TechRarity::Super,
        TechRarity::All,
    ];
}

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct TechPart {
    pub id: TwinbornCategory,
    pub rarity: TechRarity,
    pub mode: Option<TechMode>,
    pub resonance: u32,
    pub overload: u32,
    pub support_parts: bool,
    pub twinborn_level: u8,
    pub equipped: bool,
}

impl TechPart {
    pub fn validate(&self) -> Result<(), String> {
        if self.twinborn_level > 5 {
            return Err(format!("twinborn_level {} exceeds 5", self.twinborn_level));
        }
        if self.resonance > 999_999 {
            return Err(format!("resonance {} exceeds 999999", self.resonance));
        }
        if self.overload > 999 {
            return Err(format!("overload {} exceeds 999", self.overload));
        }
        Ok(())
    }
}

fn tech_part(
    id: TwinbornCategory,
    mode: Option<TechMode>,
    resonance: u32,
    equipped: bool,
) -> TechPart {
    TechPart {
        id,
        rarity: TechRarity::Legend,
        mode,
        resonance,
        overload: 0,
        support_parts: false,
        twinborn_level: 0,
        equipped,
    }
}

pub fn default_tech_parts() -> Vec<TechPart> {
    vec![
        tech_part(
            TwinbornCategory::EnergyGuidanceSystem,
            Some(TechMode::DroneMode),
            3000,
            true,
        ),
        tech_part(TwinbornCategory::AntimatterMaintainer, None, 3000, true),
        tech_part(
            TwinbornCategory::QuantumNanobot,
            Some(TechMode::DurianMode),
            3000,
            true,
        ),
        tech_part(TwinbornCategory::PhaseDriver, None, 0, false),
        tech_part(TwinbornCategory::EnergyDiffuser, None, 2100, true),
        tech_part(TwinbornCategory::HiMaintainer, None, 0, false),
        tech_part(TwinbornCategory::PrecisionDevice, None, 0, false),
        tech_part(TwinbornCategory::AntimatterGenerator, None, 0, false),
        tech_part(TwinbornCategory::ExoRadicator, None, 0, false),
        tech_part(TwinbornCategory::HiGravityPulser, None, 0, false),
    ]
}
