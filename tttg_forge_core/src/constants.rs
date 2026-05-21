pub const PASSIVE_SKILLS: &[&str] = &[
    "Energy Cube",
    "HP Bullet",
    "Exo Bracer",
    "Ammo Thruster",
    "HE Fuel",
];

pub const RECOGNIZED_TECH_SKILLS: &[&str] = &[
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

pub const DAMAGE_ORDER: &[&str] = &[
    "ssWeapon",
    "Lightning Mode",
    "Drill",
    "Drill Shot Mode",
    "Rocket",
    "Rocket Mode",
    "Molotov",
    "Soccer Mode",
    "Laser Mode",
    "Drone",
    "Durian Mode",
    "Boomerang Mode",
    "Molotov Mode",
    "Guardian Mode",
    "Brick Mode",
];

pub const PASSIVE_DAMAGE_NAMES: &[&str] =
    &["Exo Bracer", "Ammo Thruster", "HE Fuel", "Energy Cube"];
pub const MAX_DAMAGE_POOL_INDEX: usize = 59;

pub fn tech_default_mode(name: &str) -> Option<&'static str> {
    match name {
        "Antimatter Generator" => Some("Rocket Mode"),
        "Antimatter Maintainer" => Some("Drill Shot Mode"),
        "Energy Diffuser" => Some("Guardian Mode"),
        "Energy Guidance System" => Some("Drone Mode"),
        "Exo-radicator" => Some("Molotov"),
        "Hi-Gravity Pulser" => Some("Molotov Mode"),
        "Phase Driver" => Some("Lightning Mode"),
        "Precision Device" => Some("Drone Mode"),
        "Quantum Nanobot" => Some("Durian Mode"),
        _ => None,
    }
}

pub fn tech_fallback_aliases(name: &str) -> &'static [&'static str] {
    match name {
        "Energy Guidance System" => &["Drone"],
        "Antimatter Maintainer" => &["Drill", "Rocket"],
        "Hi-Gravity Pulser" => &["Molotov"],
        _ => &[],
    }
}

pub fn damage_coefficient(name: &str) -> f64 {
    match name {
        "ssWeapon" => 148.02,
        "taloxaOverload" => 1634.416,
        "crimsonBat" => 3545.66,
        "Taloxa" => 1.0,
        "Joey" => 1.0,
        "Metalia" => 28.4,
        "Master Yang" => 57.2,
        "King" => 112.03,
        "Common" => 54.72,
        "Drone" => 26.21,
        "Molotov" => 38.0,
        "Molotov Mode" => 40.92,
        "Drill" => 50.02,
        "Rocket" => 31.66,
        "Durian Mode" => 9.38,
        "Soccer Mode" => 19.7,
        "Drone Mode" => 48.22,
        "Forcefield Mode" => 18.94,
        "Drill Shot Mode" => 36.8,
        "Rocket Mode" => 49.04,
        "Lightning Mode" => 56.59,
        "Boomerang Mode" => 24.36,
        "Guardian Mode" => 18.94,
        "Laser Mode" => 38.16,
        "Brick Mode" => 70.0,
        "Capy" => 188.26,
        "Crucker" => 158.7,
        "Puffo" => 308.67,
        "King Blizzblast" => 198.74,
        "Nutjob" | "Gourmeow" => 300.0,
        _ => 0.0,
    }
}

pub fn passive_multiplier(passive_name: &str, mode: &str, value: f64) -> f64 {
    match passive_name {
        "Exo Bracer" => match mode {
            "ssWeapon" => 1.0 + -0.025 * value,
            "Lightning Mode" => 1.0 + -0.0177 * value,
            "Drill" | "Drill Shot Mode" => 1.0 + 0.3636 * value,
            "Rocket" | "Rocket Mode" => 1.0 + 0.0583 * value,
            "Molotov" => 1.0 + 0.1 * value,
            "Soccer Mode" => 1.0 + 0.1934 * value,
            "Laser Mode" => 1.0 + value,
            _ => 1.0,
        },
        "Ammo Thruster" => match mode {
            "ssWeapon" => 1.0 + 0.025 * value,
            "Drone" => 1.0 + 0.1111 * value,
            "Lightning Mode" => 1.0 + 0.0267 * value,
            "Drill" | "Drill Shot Mode" => 1.0 + 0.3922 * value,
            "Rocket" | "Rocket Mode" => 1.0 + 0.065 * value,
            "Soccer Mode" => 1.0 + 0.1116 * value,
            "Laser Mode" => 1.0 + value,
            _ => 1.0,
        },
        "HE Fuel" => match mode {
            "ssWeapon" => 1.0 + 0.03 * value,
            "Drone" => 1.0 + 0.0783 * value,
            "Molotov" => 1.0 + 0.8 * value,
            "Durian Mode" => 1.0 + 0.1667 * value,
            "Soccer Mode" => 1.0 + 0.02 * value,
            "Boomerang Mode" => 1.0 + 0.0617 * value,
            "Laser Mode" => 1.0 + value,
            _ => 1.0,
        },
        "Energy Cube" => match mode {
            "ssWeapon" | "Lightning Mode" | "Rocket" | "Rocket Mode" | "Molotov"
            | "Molotov Mode" | "Durian Mode" | "Soccer Mode" | "Boomerang Mode"
            | "Guardian Mode" | "Laser Mode" | "Brick Mode" => value,
            _ => 1.0,
        },
        _ => 1.0,
    }
}

pub fn damage_pool_index(mode: &str, passive_name: &str) -> Option<usize> {
    let mode_index = DAMAGE_ORDER
        .iter()
        .position(|candidate| *candidate == mode)?;
    let passive_index = PASSIVE_DAMAGE_NAMES
        .iter()
        .position(|candidate| *candidate == passive_name)?;
    Some(mode_index * PASSIVE_DAMAGE_NAMES.len() + passive_index)
}
