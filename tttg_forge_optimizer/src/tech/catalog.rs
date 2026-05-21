pub(crate) const TECH_PART_IDS: [&str; 10] = [
    "energyGuidanceSystem",
    "antimatterMaintainer",
    "quantumNanobot",
    "phaseDriver",
    "energyDiffuser",
    "hiMaintainer",
    "precisionDevice",
    "antimatterGenerator",
    "exoRadicator",
    "hiGravityPulser",
];

pub(crate) const TECH_MODES: [&str; 12] = [
    "molotovMode",
    "durianMode",
    "soccerMode",
    "droneMode",
    "forcefieldMode",
    "drillShotMode",
    "rocketMode",
    "lightningMode",
    "boomerangMode",
    "guardianMode",
    "laserMode",
    "brickMode",
];

pub(crate) fn mode_weight(mode: Option<&str>) -> f64 {
    match mode {
        Some("droneMode") => 60.0,
        Some("durianMode") => 52.0,
        Some("rocketMode") => 48.0,
        Some("lightningMode") => 45.0,
        Some("soccerMode") => 42.0,
        Some("molotovMode") => 40.0,
        Some("laserMode") => 38.0,
        Some("drillShotMode") => 36.0,
        Some("guardianMode") => 34.0,
        Some("brickMode") => 32.0,
        Some("boomerangMode") => 30.0,
        Some("forcefieldMode") => 28.0,
        _ => 0.0,
    }
}

pub fn skill_name_to_mode(skill: &str) -> Option<String> {
    let normalized = skill
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect::<String>();
    match normalized.as_str() {
        "molotov" | "molotovmode" => Some("molotovMode".to_string()),
        "durian" | "durianmode" => Some("durianMode".to_string()),
        "soccer" | "soccermode" => Some("soccerMode".to_string()),
        "drone" | "dronemode" => Some("droneMode".to_string()),
        "forcefield" | "forcefieldmode" => Some("forcefieldMode".to_string()),
        "drill" | "drillshot" | "drillshotmode" => Some("drillShotMode".to_string()),
        "rocket" | "rocketmode" => Some("rocketMode".to_string()),
        "lightning" | "lightningmode" => Some("lightningMode".to_string()),
        "boomerang" | "boomerangmode" => Some("boomerangMode".to_string()),
        "guardian" | "guardianmode" => Some("guardianMode".to_string()),
        "laser" | "lasermode" => Some("laserMode".to_string()),
        "brick" | "brickmode" => Some("brickMode".to_string()),
        _ => None,
    }
}
