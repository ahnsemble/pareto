use serde_json::{Map, Number, Value};

const PROFILE_ROOTS: [&str; 5] = ["playerState", "player_state", "profile", "state", "export"];
const CATEGORY_ROOTS: [&str; 9] = [
    "damage",
    "build",
    "hero",
    "equipment",
    "tech",
    "pet",
    "collectible",
    "lme",
    "ecosystem",
];

pub fn sio_export_to_player_state_patch_value(input: &Value) -> Value {
    let mut patch = Map::new();

    for category in CATEGORY_ROOTS {
        if let Some(value) = read_candidates(input, &[category]) {
            if value.is_object() {
                patch.insert(category.to_string(), value);
            }
        }
    }

    set_string(
        &mut patch,
        &["damage", "combat_mode"],
        normalize_mode,
        input,
        &["damage.combat_mode", "calc_mode", "calcMode", "mode"],
    );
    set_string(
        &mut patch,
        &["damage", "enemy_type"],
        normalize_enemy,
        input,
        &["damage.enemy_type", "enemy", "enemy_type", "target_type"],
    );
    set_number(
        &mut patch,
        &["damage", "base_attack"],
        input,
        &[
            "damage.base_attack",
            "base_atk",
            "baseAttack",
            "base_attack",
        ],
    );
    set_number(
        &mut patch,
        &["damage", "final_attack"],
        input,
        &[
            "damage.final_attack",
            "final_atk",
            "finalAttack",
            "final_attack",
        ],
    );
    set_number(
        &mut patch,
        &["damage", "crit_rate_percent"],
        input,
        &[
            "damage.crit_rate_percent",
            "crit_rate",
            "critRate",
            "crit_rate_percent",
        ],
    );
    set_number(
        &mut patch,
        &["damage", "crit_damage_percent"],
        input,
        &[
            "damage.crit_damage_percent",
            "crit_damage",
            "critDamage",
            "crit_damage_percent",
        ],
    );
    set_number(
        &mut patch,
        &["damage", "damage_percent"],
        input,
        &["damage.damage_percent", "damage", "damage_percent"],
    );
    set_number(
        &mut patch,
        &["damage", "skill_damage_percent"],
        input,
        &["damage.skill_damage_percent", "skill_damage", "skillDamage"],
    );
    set_number(
        &mut patch,
        &["damage", "boss_damage_percent"],
        input,
        &["damage.boss_damage_percent", "boss_damage", "bossDamage"],
    );
    set_number(
        &mut patch,
        &["damage", "elite_damage_percent"],
        input,
        &["damage.elite_damage_percent", "elite_damage", "eliteDamage"],
    );
    set_number(
        &mut patch,
        &["damage", "vulnerability_percent"],
        input,
        &[
            "damage.vulnerability_percent",
            "vulnerability",
            "vulnerability_percent",
        ],
    );

    set_number(
        &mut patch,
        &["build", "relic_cores_owned"],
        input,
        &[
            "build.relic_cores_owned",
            "relic_cores",
            "relicCores",
            "relic_cores_owned",
        ],
    );
    set_number(
        &mut patch,
        &["build", "chaos_cores_owned"],
        input,
        &[
            "build.chaos_cores_owned",
            "chaos_cores",
            "chaosCores",
            "chaos_cores_owned",
        ],
    );

    set_string(
        &mut patch,
        &["hero", "selected_hero_id"],
        normalize_id,
        input,
        &["hero.selected_hero_id", "hero", "hero_id", "selectedHero"],
    );
    set_number(
        &mut patch,
        &["hero", "selected_hero_level"],
        input,
        &["hero.selected_hero_level", "hero_level", "heroLevel"],
    );
    set_number(
        &mut patch,
        &["hero", "selected_hero_star"],
        input,
        &["hero.selected_hero_star", "hero_star", "heroStar"],
    );
    set_number(
        &mut patch,
        &["hero", "selected_hero_awakening"],
        input,
        &[
            "hero.selected_hero_awakening",
            "hero_awakening",
            "heroAwakening",
        ],
    );

    for slot in ["weapon", "armor", "necklace", "belt", "gloves", "boots"] {
        set_number(
            &mut patch,
            &["equipment", slot, "astral_forge_eaf_level"],
            input,
            &[
                &format!("equipment.{slot}.astral_forge_eaf_level"),
                &format!("{slot}_eaf"),
            ],
        );
        set_number(
            &mut patch,
            &["equipment", slot, "astral_forge_vaf_level"],
            input,
            &[
                &format!("equipment.{slot}.astral_forge_vaf_level"),
                &format!("{slot}_vaf"),
            ],
        );
        set_number(
            &mut patch,
            &["equipment", slot, "chaos_fusion_level"],
            input,
            &[
                &format!("equipment.{slot}.chaos_fusion_level"),
                &format!("{slot}_cf"),
            ],
        );
        set_number(
            &mut patch,
            &["equipment", slot, "xeno_transmute_level"],
            input,
            &[
                &format!("equipment.{slot}.xeno_transmute_level"),
                &format!("{slot}_xeno"),
            ],
        );
    }

    set_number(
        &mut patch,
        &["tech", "resonance_level"],
        input,
        &["tech.resonance_level", "tech_resonance", "resonance_level"],
    );
    set_number(
        &mut patch,
        &["tech", "chips_available"],
        input,
        &["tech.chips_available", "chips_available", "availableChips"],
    );
    set_bool(
        &mut patch,
        &["tech", "twinborn_enabled"],
        input,
        &["tech.twinborn_enabled", "twinborn", "twinborn_enabled"],
    );

    set_string(
        &mut patch,
        &["pet", "deployed_pet_id"],
        normalize_id,
        input,
        &["pet.deployed_pet_id", "pet", "pet_id", "deployed_pet"],
    );
    set_bool(
        &mut patch,
        &["pet", "deployed_is_xeno"],
        input,
        &["pet.deployed_is_xeno", "pet_xeno", "deployed_is_xeno"],
    );
    set_number(
        &mut patch,
        &["pet", "resonance_atk"],
        input,
        &["pet.resonance_atk", "pet_resonance_atk", "resonance_atk"],
    );

    set_number(
        &mut patch,
        &["collectible", "edition_progress"],
        input,
        &[
            "collectible.edition_progress",
            "edition",
            "edition_progress",
        ],
    );
    set_number(
        &mut patch,
        &["collectible", "advanced_collector_heart_level"],
        input,
        &[
            "collectible.advanced_collector_heart_level",
            "advanced_heart",
            "advanced_collector_heart_level",
        ],
    );

    set_string(
        &mut patch,
        &["lme", "battle_phase"],
        normalize_phase,
        input,
        &["lme.battle_phase", "battle_phase", "phase"],
    );
    set_number(
        &mut patch,
        &["lme", "player_medals"],
        input,
        &["lme.player_medals", "player_medals"],
    );
    set_number(
        &mut patch,
        &["lme", "opponent_medals"],
        input,
        &["lme.opponent_medals", "opponent_medals"],
    );

    set_string(
        &mut patch,
        &["ecosystem", "share_code"],
        passthrough,
        input,
        &["ecosystem.share_code", "share_code", "shareCode"],
    );
    set_string(
        &mut patch,
        &["ecosystem", "import_url"],
        passthrough,
        input,
        &["ecosystem.import_url", "import_url", "importUrl"],
    );
    set_string(
        &mut patch,
        &["ecosystem", "source_build_name"],
        passthrough,
        input,
        &[
            "ecosystem.source_build_name",
            "source_build_name",
            "buildName",
        ],
    );

    Value::Object(patch)
}

fn set_number(root: &mut Map<String, Value>, path: &[&str], input: &Value, candidates: &[&str]) {
    if let Some(value) = read_candidates(input, candidates).and_then(|value| coerce_number(&value))
    {
        if let Some(number) = Number::from_f64(value) {
            set_path(root, path, Value::Number(number));
        }
    }
}

fn set_bool(root: &mut Map<String, Value>, path: &[&str], input: &Value, candidates: &[&str]) {
    if let Some(value) = read_candidates(input, candidates).and_then(|value| coerce_bool(&value)) {
        set_path(root, path, Value::Bool(value));
    }
}

fn set_string(
    root: &mut Map<String, Value>,
    path: &[&str],
    normalize: fn(&str) -> String,
    input: &Value,
    candidates: &[&str],
) {
    if let Some(value) = read_candidates(input, candidates).and_then(|value| coerce_string(&value))
    {
        set_path(root, path, Value::String(normalize(&value)));
    }
}

fn set_path(root: &mut Map<String, Value>, path: &[&str], value: Value) {
    if path.len() == 1 {
        root.insert(path[0].to_string(), value);
        return;
    }

    let entry = root
        .entry(path[0].to_string())
        .or_insert_with(|| Value::Object(Map::new()));
    if !entry.is_object() {
        *entry = Value::Object(Map::new());
    }
    if let Some(child) = entry.as_object_mut() {
        set_path(child, &path[1..], value);
    }
}

fn read_candidates(input: &Value, candidates: &[&str]) -> Option<Value> {
    for candidate in candidates {
        if let Some(value) = read_key(input, candidate) {
            return Some(value.clone());
        }
    }
    for root in PROFILE_ROOTS {
        if let Some(profile) = read_key(input, root) {
            for candidate in candidates {
                if let Some(value) = read_key(profile, candidate) {
                    return Some(value.clone());
                }
            }
        }
    }
    None
}

fn read_key<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    if let Some(value) = value.get(key) {
        return Some(value);
    }

    let mut current = value;
    for part in key.split('.') {
        current = current.get(part)?;
    }
    Some(current)
}

fn coerce_number(value: &Value) -> Option<f64> {
    value
        .as_f64()
        .or_else(|| {
            value
                .as_str()
                .and_then(|text| text.replace(',', "").parse::<f64>().ok())
        })
        .filter(|value| value.is_finite())
}

fn coerce_bool(value: &Value) -> Option<bool> {
    value.as_bool().or_else(|| {
        value
            .as_str()
            .and_then(|text| match text.trim().to_ascii_lowercase().as_str() {
                "true" | "yes" | "1" | "on" => Some(true),
                "false" | "no" | "0" | "off" => Some(false),
                _ => None,
            })
    })
}

fn coerce_string(value: &Value) -> Option<String> {
    value
        .as_str()
        .map(str::to_string)
        .or_else(|| value.as_i64().map(|number| number.to_string()))
        .or_else(|| value.as_u64().map(|number| number.to_string()))
        .or_else(|| value.as_f64().map(|number| number.to_string()))
}

fn passthrough(value: &str) -> String {
    value.to_string()
}

fn normalize_id(value: &str) -> String {
    value.trim().to_ascii_lowercase().replace([' ', '-'], "_")
}

fn normalize_mode(value: &str) -> String {
    match normalize_id(value).as_str() {
        "ee" | "endless_echo" => "ee".to_string(),
        "generic" | "generic_calculator" | "multiplier" => "generic_calculator".to_string(),
        _ => "lme".to_string(),
    }
}

fn normalize_enemy(value: &str) -> String {
    match normalize_id(value).as_str() {
        "boss" => "boss".to_string(),
        "elite" => "elite".to_string(),
        _ => "normal".to_string(),
    }
}

fn normalize_phase(value: &str) -> String {
    match normalize_id(value).as_str() {
        "phase_1" | "boss_phase_1" => "phase_1".to_string(),
        "phase_2" | "boss_phase_2" => "phase_2".to_string(),
        "expedition" | "expedition_phase" => "expedition".to_string(),
        _ => "battle".to_string(),
    }
}
