#[derive(Clone, Copy, Debug, PartialEq)]
pub struct TechModifierEntry {
    pub base_tech: &'static str,
    pub target: &'static str,
    pub coefficient: f64,
    pub returns_level: bool,
}

const TECH_MODIFIER_MATRIX: [TechModifierEntry; 37] = [
    entry("Exo Bracer", "ssWeapon", -0.025, false),
    entry("Exo Bracer", "Lightning Mode", -0.0177, false),
    entry("Exo Bracer", "Drill", 0.3636, false),
    entry("Exo Bracer", "Drill Shot Mode", 0.3636, false),
    entry("Exo Bracer", "Rocket", 0.0583, false),
    entry("Exo Bracer", "Rocket Mode", 0.0583, false),
    entry("Exo Bracer", "Molotov", 0.1, false),
    entry("Exo Bracer", "Soccer Mode", 0.1934, false),
    entry("Exo Bracer", "Laser Mode", 1.0, false),
    entry("Ammo Thruster", "ssWeapon", 0.025, false),
    entry("Ammo Thruster", "Drone", 0.1111, false),
    entry("Ammo Thruster", "Lightning Mode", 0.0267, false),
    entry("Ammo Thruster", "Drill", 0.3922, false),
    entry("Ammo Thruster", "Drill Shot Mode", 0.3922, false),
    entry("Ammo Thruster", "Rocket", 0.065, false),
    entry("Ammo Thruster", "Rocket Mode", 0.065, false),
    entry("Ammo Thruster", "Soccer Mode", 0.1116, false),
    entry("Ammo Thruster", "Laser Mode", 1.0, false),
    entry("HE Fuel", "ssWeapon", 0.03, false),
    entry("HE Fuel", "Drone", 0.0783, false),
    entry("HE Fuel", "Molotov", 0.8, false),
    entry("HE Fuel", "Durian Mode", 0.1667, false),
    entry("HE Fuel", "Soccer Mode", 0.02, false),
    entry("HE Fuel", "Boomerang Mode", 0.0617, false),
    entry("HE Fuel", "Laser Mode", 1.0, false),
    entry("Energy Cube", "ssWeapon", 1.0, true),
    entry("Energy Cube", "Lightning Mode", 1.0, true),
    entry("Energy Cube", "Rocket", 1.0, true),
    entry("Energy Cube", "Rocket Mode", 1.0, true),
    entry("Energy Cube", "Molotov", 1.0, true),
    entry("Energy Cube", "Molotov Mode", 1.0, true),
    entry("Energy Cube", "Durian Mode", 1.0, true),
    entry("Energy Cube", "Soccer Mode", 1.0, true),
    entry("Energy Cube", "Boomerang Mode", 1.0, true),
    entry("Energy Cube", "Guardian Mode", 1.0, true),
    entry("Energy Cube", "Laser Mode", 1.0, true),
    entry("Energy Cube", "Brick Mode", 1.0, true),
];

const fn entry(
    base_tech: &'static str,
    target: &'static str,
    coefficient: f64,
    returns_level: bool,
) -> TechModifierEntry {
    TechModifierEntry {
        base_tech,
        target,
        coefficient,
        returns_level,
    }
}

pub fn compute_tech_modifier(base_tech: &str, target: &str, twinborn_level: f64) -> f64 {
    match tech_modifier_entry(base_tech, target) {
        Some(entry) if entry.returns_level => twinborn_level,
        Some(entry) => 1.0 + entry.coefficient * twinborn_level,
        None => 1.0,
    }
}

fn tech_modifier_entry(base_tech: &str, target: &str) -> Option<TechModifierEntry> {
    TECH_MODIFIER_MATRIX
        .iter()
        .copied()
        .find(|entry| entry.base_tech == base_tech && entry.target == target)
}

pub fn tech_modifier_matrix_entries() -> &'static [TechModifierEntry] {
    &TECH_MODIFIER_MATRIX
}

pub fn tech_modifier_target_count() -> usize {
    TECH_MODIFIER_MATRIX.len()
}
