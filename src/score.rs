use crate::constants::{
    damage_coefficient, damage_pool_index, passive_multiplier, tech_default_mode,
    tech_fallback_aliases, DAMAGE_ORDER, PASSIVE_SKILLS, RECOGNIZED_TECH_SKILLS,
};
use crate::{as_object, bool_value, num, DamageResult, ForgeCoreError, JsonResult};
use serde_json::{json, Map, Value};
use std::collections::BTreeSet;

pub fn get_upgraded_collectibles(
    custom_sets: &Value,
    set_sizes: &[usize],
) -> JsonResult<BTreeSet<String>> {
    let mut upgraded = BTreeSet::new();
    for (index, custom_set) in as_object(custom_sets, "custom_sets")?.values().enumerate() {
        let Some(object) = custom_set.as_object() else {
            continue;
        };
        let collectibles = object
            .get("collectibles")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let level = object
            .get("level")
            .and_then(Value::as_i64)
            .unwrap_or(0)
            .max(0) as usize;
        let filled = collectibles
            .iter()
            .filter(|name| {
                name.as_str()
                    .is_some_and(|name| !name.is_empty() && name != "None")
            })
            .count();
        let required = set_sizes.get(index).copied().unwrap_or(filled);
        if filled != required {
            continue;
        }
        for name in collectibles.iter().take(level).filter_map(Value::as_str) {
            if !name.is_empty() && name != "None" {
                upgraded.insert(name.to_string());
            }
        }
    }
    Ok(upgraded)
}

pub fn get_deployed_modes(techs: &Value, _beta: bool) -> JsonResult<Vec<String>> {
    let mut modes = Vec::new();
    let object = as_object(techs, "techs")?;
    for (tech_name, tech_data) in object {
        if !bool_value(tech_data, "deployed") {
            continue;
        }
        if let Some(mode) = tech_data
            .as_object()
            .and_then(|entry| entry.get("mode"))
            .and_then(Value::as_str)
            .or_else(|| tech_default_mode(tech_name))
        {
            modes.push(mode.to_string());
        }
    }
    for (tech_name, tech_data) in object {
        if !bool_value(tech_data, "deployed") {
            continue;
        }
        for fallback in tech_fallback_aliases(tech_name) {
            if !modes.iter().any(|existing| existing.starts_with(fallback)) {
                modes.push((*fallback).to_string());
            }
        }
    }
    Ok(modes)
}

pub fn build_filtered_skills(skills: &Value, techs: &Value, beta: bool) -> JsonResult<Value> {
    let deployed: BTreeSet<String> = get_deployed_modes(techs, beta)?.into_iter().collect();
    let mut filtered = Map::new();
    for passive in PASSIVE_SKILLS {
        filtered.insert(
            (*passive).to_string(),
            Value::Bool(bool_value(skills, passive)),
        );
    }
    for skill_name in RECOGNIZED_TECH_SKILLS {
        if deployed.contains(*skill_name) {
            filtered.insert(
                (*skill_name).to_string(),
                Value::Bool(bool_value(skills, skill_name)),
            );
        }
    }
    Ok(Value::Object(filtered))
}

pub fn calculate_damage_factor(stats: &Value, ce_damage_techs: &Value) -> JsonResult<DamageResult> {
    let laser_divisor = 1.0 / (0.01 * num(stats, "ssGlovesLaser") + 1.0);
    let mut ce_damage = Map::new();
    let mut damage_factor = 0.0;
    for (key, value) in as_object(ce_damage_techs, "ce_damage_techs")? {
        let numeric = value.as_f64().unwrap_or(0.0);
        ce_damage.insert(key.clone(), json!(numeric));
        damage_factor += numeric;
    }

    let mut ss_weapon = num(stats, "ssMiscPath").powf(0.72) * damage_coefficient("ssWeapon");
    if num(stats, "cooldownReduction") != 0.0 {
        ss_weapon *= passive_multiplier("Energy Cube", "ssWeapon", num(stats, "cooldownReduction"));
    }
    ce_damage.insert("ssWeapon".to_string(), json!(ss_weapon));
    damage_factor += ss_weapon;

    let taloxa_overload = if num(stats, "taloxaBeam") != 0.0 {
        num(stats, "taloxaBeam") * damage_coefficient("taloxaOverload")
    } else {
        0.0
    };
    ce_damage.insert("taloxaOverload".to_string(), json!(taloxa_overload));
    damage_factor += taloxa_overload;

    let crimson_damage = if num(stats, "crimsonBat") != 0.0 {
        num(stats, "crimsonBat") * damage_coefficient("crimsonBat")
    } else {
        0.0
    };
    ce_damage.insert("crimsonBat".to_string(), json!(crimson_damage));
    damage_factor += crimson_damage;

    for (key, stat_name) in [
        ("Taloxa", "harmonyTaloxa"),
        ("Joey", "harmonyJoey"),
        ("Metalia", "harmonyMetalia"),
        ("Master Yang", "harmonyYang"),
        ("King", "harmonyKing"),
        ("Common", "harmonyCommon"),
    ] {
        let value = num(stats, stat_name) * damage_coefficient(key) * laser_divisor;
        ce_damage.insert(key.to_string(), json!(value));
        damage_factor += value;
    }

    let xeno_damage = num(stats, "xenoDamage") * laser_divisor;
    ce_damage.insert("xeno".to_string(), json!(xeno_damage));
    damage_factor += xeno_damage;

    Ok(DamageResult {
        damage_factor,
        ce_damage: Value::Object(ce_damage),
    })
}

pub fn calculate_score(
    stats: &Value,
    attack_meta: &Value,
    damage_factor: f64,
    ce_damage: &Value,
    calc_mode: &str,
    skills: &Value,
    passive_pools: &[Value],
    game_mode: &str,
) -> JsonResult<f64> {
    let crit_rate_clamped = (num(stats, "critRate") / 100.0).clamp(0.0, 1.0);
    let crit_multiplier = (num(stats, "critDamage") / 100.0).max(2.0);
    let attack_base = attack_meta
        .as_object()
        .and_then(|object| object.get("atkBase"))
        .and_then(Value::as_f64);
    let attack_final = attack_meta
        .as_object()
        .and_then(|object| object.get("atkFinal"))
        .and_then(Value::as_f64);
    let attack_term = match (attack_base, attack_final) {
        (Some(base), Some(final_value)) => {
            (base
                + num(stats, "atkEquip") * percent_multiplier(num(stats, "atkEquipPercent"))
                + num(stats, "atkHero") * percent_multiplier(num(stats, "atkHeroPercent")))
                * percent_multiplier(num(stats, "atkPercent"))
                + final_value
                + num(stats, "atkFinal")
        }
        _ => 0.0,
    };

    let mut factors = vec![
        attack_term,
        crit_rate_clamped * crit_multiplier + (1.0 - crit_rate_clamped),
        percent_multiplier(num(stats, "skillDamage").max(0.0)),
        percent_multiplier(num(stats, "vulnerability").max(0.0)),
        percent_multiplier(
            (num(stats, "shieldDamage") * num(stats, "shieldDamageUptime")).max(0.0),
        ),
        percent_multiplier(
            (num(stats, "poisoned") * num(stats, "poisonedUptime")).max(0.0)
                + (num(stats, "weakened") * num(stats, "weakenedUptime")).max(0.0)
                + (num(stats, "chilled") * num(stats, "chilledUptime")).max(0.0)
                + num(stats, "exposedDamage"),
        ),
        percent_multiplier(num(stats, "clarity")),
        percent_multiplier(num(stats, "eternalMultiplier")),
        percent_multiplier(num(stats, "glacialBloodline")),
        percent_multiplier((num(stats, "laceration") * num(stats, "lacerationUptime")).max(0.0)),
        percent_multiplier(num(stats, "joeyWeakSpot")),
        percent_multiplier(num(stats, "ssGlovesLaser")),
        percent_multiplier(num(stats, "flashriftRip")),
        percent_multiplier(num(stats, "taloxaOverload")),
        optional_multiplier(stats, "eternalSuitBoost"),
        optional_multiplier(stats, "voidNeckBoost") * num(stats, "voidNeckBoostUptime"),
        optional_multiplier(stats, "voidGlovesInstakill"),
        optional_multiplier(stats, "voidBootsBoost"),
        optional_multiplier(stats, "chaosBeltBoost"),
        optional_multiplier(stats, "hpBulletBoost"),
        percent_multiplier(num(stats, "damageDealt")),
        percent_multiplier(num(stats, "adrenaline")),
        percent_multiplier(num(stats, "damageTransmute")),
        percent_multiplier(num(stats, "damageBoss")),
        percent_multiplier(num(stats, "xenoResMultiplier")),
    ];

    if game_mode == "lme1" {
        factors.push(percent_multiplier(num(stats, "lme1Damage")));
    }

    if calc_mode == "damage" {
        let inverse_damage_factor = 1.0
            / if damage_factor == 0.0 {
                1.0
            } else {
                damage_factor
            };
        let mut exo_correction = 0.0;
        let mut ammo_correction = 0.0;
        let mut fuel_correction = 0.0;
        let mut cube_correction = 0.0;
        let mut normalization = 0.0;
        let use_exo = bool_value(skills, "Exo Bracer");
        let use_ammo = bool_value(skills, "Ammo Thruster");
        let use_fuel = bool_value(skills, "HE Fuel");
        let use_cube = num(stats, "cooldownReduction") != 0.0;

        for mode in DAMAGE_ORDER {
            let contribution = ce_damage
                .as_object()
                .and_then(|object| object.get(*mode))
                .and_then(Value::as_f64)
                .unwrap_or(0.0);
            if contribution == 0.0 {
                continue;
            }
            let mut divisor = 1.0;
            if use_exo {
                let value = pool(
                    passive_pools,
                    damage_pool_index(mode, "Exo Bracer").unwrap_or(usize::MAX),
                );
                exo_correction += contribution * (value - 1.0);
                divisor *= value;
            }
            if use_ammo {
                let value = pool(
                    passive_pools,
                    damage_pool_index(mode, "Ammo Thruster").unwrap_or(usize::MAX),
                );
                ammo_correction += contribution * (value - 1.0);
                divisor *= value;
            }
            if use_fuel {
                let value = pool(
                    passive_pools,
                    damage_pool_index(mode, "HE Fuel").unwrap_or(usize::MAX),
                );
                fuel_correction += contribution * (value - 1.0);
                divisor *= value;
            }
            if use_cube {
                let value = pool(
                    passive_pools,
                    damage_pool_index(mode, "Energy Cube").unwrap_or(usize::MAX),
                );
                cube_correction += contribution * (value - 1.0);
                divisor *= value;
            }
            normalization += contribution / divisor - contribution;
        }

        if use_exo {
            exo_correction = exo_correction * inverse_damage_factor + 1.0;
        }
        if use_ammo {
            ammo_correction = ammo_correction * inverse_damage_factor + 1.0;
        }
        if use_fuel {
            fuel_correction = fuel_correction * inverse_damage_factor + 1.0;
        }
        if use_cube {
            cube_correction = cube_correction * inverse_damage_factor + 1.0;
        }
        normalization = normalization * inverse_damage_factor + 1.0;
        factors.extend([
            if damage_factor == 0.0 {
                1.0
            } else {
                damage_factor
            },
            if normalization == 0.0 {
                1.0
            } else {
                normalization
            },
            if exo_correction == 0.0 {
                1.0
            } else {
                exo_correction
            },
            if ammo_correction == 0.0 {
                1.0
            } else {
                ammo_correction
            },
            if fuel_correction == 0.0 {
                1.0
            } else {
                fuel_correction
            },
            if cube_correction == 0.0 {
                1.0
            } else {
                cube_correction
            },
        ]);
    }

    Ok(factors.into_iter().product())
}

pub fn case_to_json(case: &Value) -> JsonResult<Value> {
    serde_json::to_value(case).map_err(|error| ForgeCoreError::Decode(error.to_string()))
}

pub fn get_base_stats() -> Value {
    json!({
        "atkPercent": 0.0,
        "critRate": 0.0,
        "critDamage": 200.0,
        "skillDamage": 0.0,
        "vulnerability": 0.0
    })
}

pub fn merge_stat_dicts(parts: &[Value]) -> Value {
    let mut merged = Map::new();
    for part in parts {
        let Some(object) = part.as_object() else {
            continue;
        };
        for (key, value) in object {
            let next = merged.get(key).and_then(Value::as_f64).unwrap_or(0.0)
                + value.as_f64().unwrap_or(0.0);
            merged.insert(key.clone(), json!(next));
        }
    }
    Value::Object(merged)
}

pub fn bridge_set(values: &[Value]) -> Value {
    merge_stat_dicts(values)
}

pub fn coerce_stat_dict(value: &Value) -> Value {
    let mut result = Map::new();
    if let Some(object) = value.as_object() {
        for (key, entry) in object {
            result.insert(key.clone(), json!(entry.as_f64().unwrap_or(0.0)));
        }
    }
    Value::Object(result)
}

pub fn coerce_pool_vector(value: &Value) -> Vec<f64> {
    value
        .as_array()
        .map(|items| {
            items
                .iter()
                .map(|entry| entry.as_f64().unwrap_or(0.0))
                .collect()
        })
        .unwrap_or_default()
}

fn percent_multiplier(value: f64) -> f64 {
    (value + 100.0) * 0.01
}

fn optional_multiplier(stats: &Value, key: &str) -> f64 {
    stats
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(Value::as_f64)
        .unwrap_or(1.0)
}

fn pool(passive_pools: &[Value], index: usize) -> f64 {
    if index > crate::constants::MAX_DAMAGE_POOL_INDEX || index >= passive_pools.len() {
        return 1.0;
    }
    passive_pools[index].as_f64().unwrap_or(1.0)
}
