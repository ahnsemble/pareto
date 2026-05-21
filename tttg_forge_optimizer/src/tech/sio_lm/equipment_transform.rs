use std::collections::BTreeSet;

use serde_json::Value;

use super::{
    add_post_deferred_transform_stat, add_transform_stat, capped_level_ratio,
    defer_twin_lance_total_core_39_condition, defer_twin_lance_total_core_42_condition,
    multiply_transform_stat, set_transform_stat, transform_stat_value, SioLmStatTransform,
};

pub(super) fn apply_compact_equipment_source_transform(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    decoded: &Value,
) {
    let game_mode = decoded["meta"]["gameMode"].as_str();
    let total_ss_core_level = equipment
        .iter()
        .map(|item| item.get("c").and_then(Value::as_f64).unwrap_or(0.0))
        .sum::<f64>();
    let max_gear = decoded["meta"]["maxGear"].as_f64();
    for item in equipment {
        apply_ss_equipment_dynamic_transform_for_game_mode(
            transform,
            item,
            game_mode,
            total_ss_core_level,
            max_gear,
        );
    }
    apply_compact_equipment_collectible_set_bonuses(
        transform,
        equipment,
        &decoded["accountInputs"],
    );
    apply_compact_equipment_item_collectible_bonuses(
        transform,
        equipment,
        game_mode,
        &decoded["accountInputs"],
    );
    apply_compact_equipment_dynamic_specials(
        transform,
        equipment,
        game_mode,
        &decoded["accountInputs"],
        &decoded["settings"],
        &decoded["derivedBaseStats"],
    );
}

fn apply_compact_equipment_item_collectible_bonuses(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    game_mode: Option<&str>,
    account_inputs: &Value,
) {
    if has_item_id(equipment, "voidwakerEmblem") {
        apply_voidwaker_emblem_collectible_bonuses(transform, game_mode, account_inputs);
    }
    if has_item_id(equipment, "twistingBelt") {
        apply_twisting_belt_collectible_bonuses(transform, account_inputs);
    }
}

fn apply_voidwaker_emblem_collectible_bonuses(
    transform: &mut SioLmStatTransform,
    game_mode: Option<&str>,
    account_inputs: &Value,
) {
    let upgraded = upgraded_collectible_indexes(account_inputs);
    let mut crit_rate = 0.0;
    let mut void_neck_boost = 0.0;

    let lucky_charm_multiplier = collectible_multiplier(&upgraded, 41);
    let lucky_charm_stars = collectible_stars(account_inputs, 41);
    if lucky_charm_stars >= 5.0 {
        void_neck_boost += 10.0 * lucky_charm_multiplier;
    }
    if lucky_charm_stars >= 10.0 {
        crit_rate += 10.0 * lucky_charm_multiplier;
    }

    let memory_editor_multiplier = collectible_multiplier(&upgraded, 24);
    let memory_editor_stars = collectible_stars(account_inputs, 24);
    if memory_editor_stars >= 10.0 {
        crit_rate += 40.0 * memory_editor_multiplier;
        void_neck_boost += 20.0 * memory_editor_multiplier;
    } else if memory_editor_stars >= 5.0 {
        crit_rate += 40.0 * memory_editor_multiplier;
    } else if memory_editor_stars >= 3.0 {
        crit_rate += 20.0 * memory_editor_multiplier;
    }

    add_transform_stat(transform, "critRate", crit_rate);
    if void_neck_boost != 0.0 {
        let game_mode_multiplier = if game_mode == Some("ee") { 1.4 } else { 1.0 };
        let current = transform_stat_value(transform, "voidNeckBoost");
        let current_raw = if current > 0.0 {
            current / game_mode_multiplier * 100.0 - 100.0
        } else {
            0.0
        };
        set_transform_stat(
            transform,
            "voidNeckBoost",
            (current_raw + void_neck_boost + 100.0) / 100.0 * game_mode_multiplier,
        );
    }
}

fn apply_twisting_belt_collectible_bonuses(
    transform: &mut SioLmStatTransform,
    account_inputs: &Value,
) {
    let upgraded = upgraded_collectible_indexes(account_inputs);
    let mut max_energy_flux = 0.0;

    let safehouse_map_stars = collectible_stars(account_inputs, 39);
    if safehouse_map_stars >= 10.0 {
        max_energy_flux += 20.0 * collectible_multiplier(&upgraded, 39);
    } else if safehouse_map_stars >= 5.0 {
        max_energy_flux += 10.0 * collectible_multiplier(&upgraded, 39);
    }

    let holodream_fluid_stars = collectible_stars(account_inputs, 27);
    if holodream_fluid_stars >= 10.0 {
        max_energy_flux += 60.0 * collectible_multiplier(&upgraded, 27);
    } else if holodream_fluid_stars >= 5.0 {
        max_energy_flux += 30.0 * collectible_multiplier(&upgraded, 27);
    } else if holodream_fluid_stars >= 3.0 {
        max_energy_flux += 15.0 * collectible_multiplier(&upgraded, 27);
    }

    let taurus_starlight_stars = collectible_stars(account_inputs, 35);
    if taurus_starlight_stars >= 10.0 {
        max_energy_flux += 60.0 * collectible_multiplier(&upgraded, 35);
    } else if taurus_starlight_stars >= 5.0 {
        max_energy_flux += 30.0 * collectible_multiplier(&upgraded, 35);
    } else if taurus_starlight_stars >= 3.0 {
        max_energy_flux += 15.0 * collectible_multiplier(&upgraded, 35);
    }

    add_transform_stat(transform, "maxEnergyFlux", max_energy_flux);
    let min_energy_flux = transform_stat_value(transform, "minEnergyFlux");
    let max_energy_flux = transform_stat_value(transform, "maxEnergyFlux");
    set_transform_stat(
        transform,
        "chaosBeltBoost",
        ((max_energy_flux - min_energy_flux) / 2.0 + min_energy_flux) / 100.0,
    );
}

pub(super) fn apply_compact_equipment_environment_overrides(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    skills: &Value,
) {
    if has_item_id(equipment, "judgmentNecklace") {
        if skill_enabled(skills, "Energy Cube") {
            set_transform_stat(transform, "cooldownReduction", 2.024_291_497_975_708_5);
        }
        if skill_enabled(skills, "HP Bullet") {
            set_transform_stat(transform, "hpBulletBoost", 1.6);
        }
    }
}

fn skill_enabled(skills: &Value, name: &str) -> bool {
    skills.get(name).and_then(Value::as_bool).unwrap_or(false)
}

pub(super) fn apply_compact_equipment_collectible_set_bonuses(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    account_inputs: &Value,
) {
    if has_item_id(equipment, "twinLance") {
        apply_equipment_set_thresholds(
            transform,
            account_inputs,
            &[0, 1, 6, 7],
            &[
                (
                    EquipmentSetMetric::Total,
                    25.0,
                    &[("vulnerability", 15.0)][..],
                ),
                (
                    EquipmentSetMetric::GoldEach,
                    3.0,
                    &[("ssMiscPath", 20.0)][..],
                ),
            ],
        );
        apply_equipment_set_thresholds(
            transform,
            account_inputs,
            &[28, 29, 30, 31],
            &[(
                EquipmentSetMetric::RedEach,
                3.0,
                &[("damageBoss", 20.0)][..],
            )],
        );
    }
    if has_item_id(equipment, "evervoidArmor") {
        apply_equipment_set_thresholds(
            transform,
            account_inputs,
            &[2, 3, 4, 5],
            &[
                (
                    EquipmentSetMetric::GoldEach,
                    3.0,
                    &[("shieldDamage", 5.0)][..],
                ),
                (EquipmentSetMetric::RedEach, 3.0, &[("clarity", 10.0)][..]),
                (
                    EquipmentSetMetric::Total,
                    25.0,
                    &[("skillDamage", 20.0)][..],
                ),
            ],
        );
    }
    if has_item_id(equipment, "judgmentNecklace") {
        apply_equipment_set_thresholds(
            transform,
            account_inputs,
            &[8, 9, 10, 11],
            &[
                (
                    EquipmentSetMetric::GoldEach,
                    3.0,
                    &[("skillDamage", 10.0)][..],
                ),
                (EquipmentSetMetric::RedEach, 3.0, &[("weakened", 10.0)][..]),
                (EquipmentSetMetric::Total, 25.0, &[("critDamage", 18.0)][..]),
            ],
        );
    }
    if has_item_id(equipment, "stardustSash") {
        apply_equipment_set_thresholds(
            transform,
            account_inputs,
            &[12, 13, 14, 15],
            &[
                (
                    EquipmentSetMetric::GoldEach,
                    3.0,
                    &[("shieldDamage", 10.0)][..],
                ),
                (
                    EquipmentSetMetric::RedEach,
                    3.0,
                    &[("skillDamage", 25.0)][..],
                ),
                (
                    EquipmentSetMetric::Total,
                    25.0,
                    &[("eternalMultiplier", 5.0)][..],
                ),
            ],
        );
    }
    if has_item_id(equipment, "moonscarBracer") {
        apply_equipment_set_thresholds(
            transform,
            account_inputs,
            &[16, 17, 18, 19],
            &[(
                EquipmentSetMetric::GoldEach,
                3.0,
                &[("shieldDamage", 10.0)][..],
            )],
        );
    }
    if has_item_id(equipment, "glacialWarboots") {
        apply_equipment_set_thresholds(
            transform,
            account_inputs,
            &[20, 21, 22, 23],
            &[
                (
                    EquipmentSetMetric::RedEach,
                    3.0,
                    &[("shieldDamage", 10.0), ("glacialBloodline", 12.0)][..],
                ),
                (EquipmentSetMetric::Total, 25.0, &[("chilled", 50.0)][..]),
            ],
        );
    }

    if let Some(boots_e) = item_level(equipment, "glacialWarboots", "e") {
        if boots_e >= 1.0 && all_collectibles_at_least(account_inputs, &[20, 21, 22, 23], 3.0) {
            add_transform_stat(
                transform,
                "shieldDamage",
                if boots_e >= 5.0 { 60.0 } else { 50.0 },
            );
        }
    }
}

pub(super) fn apply_compact_equipment_dynamic_specials(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    _game_mode: Option<&str>,
    account_inputs: &Value,
    settings: &Value,
    base_stats: &Value,
) {
    apply_voidwaker_emblem_uptime_dynamic_specials(transform, equipment, account_inputs, settings);
    apply_moonscar_dynamic_specials(transform, equipment, account_inputs, base_stats);
    apply_glacial_warboots_dynamic_specials(transform, equipment);
    apply_necklace_armor_dynamic_specials(transform, equipment);
    apply_twin_lance_total_core_dynamic_specials(transform, equipment, account_inputs, base_stats);
}

fn apply_voidwaker_emblem_uptime_dynamic_specials(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    account_inputs: &Value,
    settings: &Value,
) {
    if !has_item_id(equipment, "voidwakerEmblem")
        || account_inputs["meta"]["mainHero"].as_str() == Some("Venato")
    {
        return;
    }
    let revives = settings["revives"].as_array();
    let last_revive = revives
        .into_iter()
        .flatten()
        .filter_map(Value::as_f64)
        .last()
        .unwrap_or(0.0);
    if last_revive <= 0.0 {
        return;
    }
    let revive_divisor = revives
        .and_then(|values| {
            values
                .iter()
                .position(|value| value.as_f64() == Some(180.0))
                .map(|index| index + 1)
        })
        .filter(|value| *value > 0)
        .unwrap_or(3) as f64;
    let revive_window = last_revive / revive_divisor / 180.0;
    let lucky_charm_window = if collectible_stars(account_inputs, 41) >= 3.0 {
        0.75
    } else {
        0.5
    };
    let uptime_loss = revive_window * (1.0 - lucky_charm_window) + 0.4 * revive_window / 2.0;
    let armor_e_level = item_level(equipment, "evervoidArmor", "e").unwrap_or(0.0);
    let adjusted_loss = if has_item_id(equipment, "evervoidArmor") && armor_e_level >= 3.0 {
        0.5 * uptime_loss
    } else {
        uptime_loss
    };
    let current = transform_stat_value(transform, "voidNeckBoostUptime");
    if current != 0.0 {
        set_transform_stat(transform, "voidNeckBoostUptime", current - adjusted_loss);
    }
}

fn apply_moonscar_dynamic_specials(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    account_inputs: &Value,
    base_stats: &Value,
) {
    let Some(e_level) = item_level(equipment, "moonscarBracer", "e") else {
        return;
    };
    let v_level = item_level(equipment, "moonscarBracer", "v").unwrap_or(0.0);
    let c_level = item_level(equipment, "moonscarBracer", "c").unwrap_or(0.0);
    let crit_rate_before = merged_stat_value(transform, base_stats, "critRate");
    let has_v4 = v_level >= 4.0;
    let has_c6_pre_c10 = c_level >= 6.0 && c_level < 10.0;

    if has_v4 {
        add_transform_stat(transform, "critRate", 10.0);
        add_transform_stat(transform, "critRateFlux", 10.0);
    }
    if has_c6_pre_c10 {
        add_transform_stat(transform, "critRate", 20.0);
        add_transform_stat(transform, "critRateFlux", 20.0);
    }

    if e_level >= 1.0 {
        let bonus = if all_collectibles_at_least(account_inputs, &[16, 17, 18, 19], 8.0) {
            60.0
        } else {
            30.0
        };
        let value = if crit_rate_before >= 100.0 {
            bonus
        } else {
            bonus * moonscar_dynamic_uptime(100.0 - crit_rate_before, has_v4, has_c6_pre_c10)
        };
        add_transform_stat(transform, "critDamage", value);
    }
    if e_level >= 3.0 {
        let bonus = if equipment_set_total(account_inputs, &[16, 17, 18, 19]) >= 25.0 {
            60.0
        } else {
            30.0
        };
        let value = if crit_rate_before >= 130.0 {
            bonus
        } else {
            bonus * moonscar_dynamic_uptime(130.0 - crit_rate_before, has_v4, has_c6_pre_c10)
        };
        add_transform_stat(transform, "skillDamage", value);
    }
    if e_level >= 5.0 {
        let value = if crit_rate_before >= 150.0 {
            100.0
        } else {
            100.0 * moonscar_dynamic_uptime(150.0 - crit_rate_before, has_v4, has_c6_pre_c10)
        };
        add_transform_stat(transform, "critDamage", value);
    }
}

fn moonscar_dynamic_uptime(required_crit_rate: f64, has_v4: bool, has_c6_pre_c10: bool) -> f64 {
    let c_window = if has_c6_pre_c10 { 40.0 } else { 0.0 };
    let v_window = if has_v4 { 20.0 } else { 0.0 };
    if !has_c6_pre_c10 {
        return ((c_window >= required_crit_rate) as u8 as f64
            + ((c_window + v_window) >= required_crit_rate) as u8 as f64)
            * 0.5;
    }
    let clamp = |value: f64| value.clamp(0.0, 1.0);
    (clamp((c_window - required_crit_rate) / c_window)
        + clamp((c_window + v_window - required_crit_rate) / c_window))
        * 0.5
}

fn apply_glacial_warboots_dynamic_specials(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
) {
    let Some(e_level) = item_level(equipment, "glacialWarboots", "e") else {
        return;
    };
    let c_level = item_level(equipment, "glacialWarboots", "c").unwrap_or(0.0);
    if c_level >= 6.0 {
        add_transform_stat(
            transform,
            "glacialBloodline",
            if e_level >= 5.0 { 6.0 } else { 5.0 },
        );
    }
    if c_level >= 10.0 {
        add_transform_stat(
            transform,
            "glacialBloodline",
            if e_level >= 5.0 { 6.6 } else { 5.5 },
        );
    }
}

fn apply_necklace_armor_dynamic_specials(transform: &mut SioLmStatTransform, equipment: &[Value]) {
    if item_level(equipment, "judgmentNecklace", "e").unwrap_or(0.0) >= 5.0
        && item_level(equipment, "evervoidArmor", "e").unwrap_or(0.0) >= 5.0
    {
        add_transform_stat(transform, "shieldDamage", 10.0);
    }
}

fn apply_twin_lance_total_core_dynamic_specials(
    transform: &mut SioLmStatTransform,
    equipment: &[Value],
    account_inputs: &Value,
    _base_stats: &Value,
) {
    let Some(e_level) = item_level(equipment, "twinLance", "e") else {
        return;
    };
    let v_level = item_level(equipment, "twinLance", "v").unwrap_or(0.0);
    let c_level = item_level(equipment, "twinLance", "c").unwrap_or(0.0);
    let x_level = item_level(equipment, "twinLance", "x").unwrap_or(0.0);
    let total_core = equipment
        .iter()
        .map(|item| item.get("c").and_then(Value::as_f64).unwrap_or(0.0))
        .sum::<f64>();

    if x_level >= 8.0 {
        add_transform_stat(
            transform,
            "skillDamage",
            if e_level >= 5.0 { 45.0 } else { 30.0 },
        );
    }
    if total_core >= 9.0 {
        add_transform_stat(
            transform,
            "skillDamage",
            if e_level >= 5.0 { 75.0 } else { 50.0 },
        );
        let multiplier = if e_level >= 5.0 {
            3.0
        } else if e_level >= 1.0 {
            2.0
        } else {
            0.0
        };
        add_transform_stat(
            transform,
            "ssMiscPath",
            (25.0 + if x_level >= 8.0 { 15.0 } else { 0.0 }) * multiplier,
        );
    }
    if total_core >= 18.0 {
        add_transform_stat(transform, "ssMiscPath", twin_lance_total_core_path(v_level));
    }
    if c_level >= 2.0 {
        if equipment_set_gold_each(account_inputs, &[28, 29, 30, 31]) >= 3.0 {
            add_transform_stat(transform, "vulnerability", 30.0);
        }
        if equipment_set_total(account_inputs, &[28, 29, 30, 31]) >= 25.0 {
            add_transform_stat(transform, "ssMiscPath", 40.0);
            if c_level >= 6.0 {
                add_transform_stat(transform, "ssMiscPath", 15.0);
            }
        }
    }
    if total_core >= 24.0 && has_item_id(equipment, "judgmentNecklace") {
        add_transform_stat(transform, "skillDamage", 30.0);
        add_transform_stat(transform, "ssMiscPath", 36.0);
    }
    if total_core >= 27.0 {
        add_transform_stat(transform, "ssMiscPath", twin_lance_total_core_path(v_level));
    }
    if total_core >= 36.0 {
        add_transform_stat(transform, "ssMiscPath", twin_lance_total_core_path(v_level));
    }
    if total_core >= 39.0 {
        defer_twin_lance_total_core_39_condition(transform);
    }
    if total_core >= 42.0 {
        defer_twin_lance_total_core_42_condition(transform);
    }
    if total_core >= 45.0 {
        add_post_deferred_transform_stat(
            transform,
            "ssMiscPath",
            twin_lance_total_core_path(v_level),
        );
    }

    let ss_capped_items = [
        ("twinLance", c_level),
        (
            "evervoidArmor",
            item_level(equipment, "evervoidArmor", "c").unwrap_or(0.0),
        ),
        (
            "judgmentNecklace",
            item_level(equipment, "judgmentNecklace", "c").unwrap_or(0.0),
        ),
        (
            "stardustSash",
            item_level(equipment, "stardustSash", "c").unwrap_or(0.0),
        ),
        (
            "moonscarBracer",
            item_level(equipment, "moonscarBracer", "c").unwrap_or(0.0),
        ),
        (
            "glacialWarboots",
            item_level(equipment, "glacialWarboots", "c").unwrap_or(0.0),
        ),
    ];
    let has_any_capped_ss_item = ss_capped_items
        .iter()
        .any(|(id, level)| has_item_id(equipment, id) && *level >= 10.0);
    if total_core >= 48.0 && has_any_capped_ss_item {
        add_post_deferred_transform_stat(transform, "shieldDamage", 30.0);
        add_post_deferred_transform_stat(transform, "skillDamage", 30.0);
        add_post_deferred_transform_stat(transform, "poisoned", 30.0);
    }
    if total_core >= 51.0 && c_level >= 10.0 {
        add_post_deferred_transform_stat(transform, "damageBoss", 12.0);
        add_post_deferred_transform_stat(transform, "ssMiscPath", 5.0);
    }
    if total_core >= 54.0 {
        for (id, level) in ss_capped_items {
            if has_item_id(equipment, id) && level >= 10.0 {
                add_post_deferred_transform_stat(transform, "damageBoss", 4.0);
                add_post_deferred_transform_stat(transform, "ssMiscPath", 2.0);
            }
        }
    }
    if all_collectibles_at_least(account_inputs, &[0, 1, 6, 7], 8.0) {
        add_post_deferred_transform_stat(
            transform,
            "skillDamage",
            if e_level >= 5.0 { 30.0 } else { 20.0 },
        );
    }

    add_post_deferred_transform_stat(transform, "ssMiscPath", 100.0);
    multiply_transform_stat(transform, "ssMiscPath", 1.338);
    let crit_rate = transform_stat_value(transform, "critRate");
    if crit_rate.is_nan() {
        set_transform_stat(transform, "critRate", 0.0);
    }
}

fn twin_lance_total_core_path(v_level: f64) -> f64 {
    60.0 + 2.0 * if v_level >= 4.0 { 80.0 } else { 55.0 }
}

fn has_item_id(equipment: &[Value], id: &str) -> bool {
    equipment
        .iter()
        .any(|item| item.get("id").and_then(Value::as_str) == Some(id))
}

fn merged_stat_value(transform: &SioLmStatTransform, base_stats: &Value, key: &str) -> f64 {
    base_stats.get(key).and_then(Value::as_f64).unwrap_or(0.0)
        + transform_stat_value(transform, key)
}

#[derive(Clone, Copy)]
enum EquipmentSetMetric {
    Total,
    GoldEach,
    RedEach,
}

fn apply_equipment_set_thresholds(
    transform: &mut SioLmStatTransform,
    account_inputs: &Value,
    indexes: &[u64],
    thresholds: &[(EquipmentSetMetric, f64, &[(&str, f64)])],
) {
    for (metric, threshold, stats) in thresholds {
        let actual = match metric {
            EquipmentSetMetric::Total => equipment_set_total(account_inputs, indexes),
            EquipmentSetMetric::GoldEach => equipment_set_gold_each(account_inputs, indexes),
            EquipmentSetMetric::RedEach => equipment_set_red_each(account_inputs, indexes),
        };
        if actual >= *threshold {
            for (stat, value) in *stats {
                add_transform_stat(transform, stat, *value);
            }
        }
    }
}

fn equipment_set_total(account_inputs: &Value, indexes: &[u64]) -> f64 {
    indexes
        .iter()
        .map(|index| collectible_stars(account_inputs, *index))
        .sum()
}

fn equipment_set_gold_each(account_inputs: &Value, indexes: &[u64]) -> f64 {
    if indexes.is_empty() {
        return 0.0;
    }
    indexes
        .iter()
        .map(|index| collectible_stars(account_inputs, *index).min(5.0))
        .fold(f64::INFINITY, f64::min)
}

fn equipment_set_red_each(account_inputs: &Value, indexes: &[u64]) -> f64 {
    if indexes.is_empty() {
        return 0.0;
    }
    indexes
        .iter()
        .map(|index| (collectible_stars(account_inputs, *index) - 5.0).max(0.0))
        .fold(f64::INFINITY, f64::min)
}

fn upgraded_collectible_indexes(account_inputs: &Value) -> BTreeSet<u64> {
    let mut upgraded = BTreeSet::new();
    for custom_set in account_inputs["customSets"]
        .as_array()
        .into_iter()
        .flatten()
    {
        let Some(collectibles) = custom_set["collectibleIndexes"].as_array() else {
            continue;
        };
        let level = custom_set["level"].as_u64().unwrap_or(0);
        for collectible in collectibles.iter().take(level as usize) {
            if let Some(index) = collectible.as_u64() {
                upgraded.insert(index);
            }
        }
    }
    upgraded
}

fn collectible_multiplier(upgraded: &BTreeSet<u64>, index: u64) -> f64 {
    if upgraded.contains(&index) {
        1.33
    } else {
        1.0
    }
}

fn item_level(equipment: &[Value], id: &str, key: &str) -> Option<f64> {
    equipment.iter().find_map(|item| {
        if item.get("id").and_then(Value::as_str) == Some(id) {
            item.get(key).and_then(Value::as_f64)
        } else {
            None
        }
    })
}

fn all_collectibles_at_least(account_inputs: &Value, indexes: &[u64], stars: f64) -> bool {
    indexes
        .iter()
        .all(|index| collectible_stars(account_inputs, *index) >= stars)
}

fn collectible_stars(account_inputs: &Value, index: u64) -> f64 {
    account_inputs["collectibles"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|collectible| collectible["index"].as_u64() == Some(index))
        .and_then(|collectible| collectible["stars"].as_f64())
        .unwrap_or(0.0)
}

pub(super) fn apply_ss_equipment_transform(transform: &mut SioLmStatTransform, item: &Value) {
    apply_ss_equipment_transform_for_game_mode(transform, item, None);
}

pub(super) fn apply_ss_equipment_dynamic_transform_for_game_mode(
    transform: &mut SioLmStatTransform,
    item: &Value,
    game_mode: Option<&str>,
    total_ss_core_level: f64,
    max_gear: Option<f64>,
) {
    let id = item.get("id").and_then(Value::as_str).unwrap_or("");
    match id {
        "twinLance" => {
            apply_twin_lance_dynamic_transform(transform, item, total_ss_core_level, max_gear)
        }
        "evervoidArmor" => apply_evervoid_armor_dynamic_transform(transform, item),
        "judgmentNecklace" => apply_judgment_necklace_dynamic_transform(transform, item, max_gear),
        "stardustSash" => apply_stardust_sash_dynamic_transform(transform, item),
        "voidwakerEmblem" => {
            apply_voidwaker_emblem_dynamic_transform(transform, item, game_mode, max_gear)
        }
        "twistingBelt" => apply_twisting_belt_dynamic_transform(transform, item),
        "moonscarBracer" => apply_moonscar_bracer_dynamic_transform(transform, item, max_gear),
        "glacialWarboots" => apply_glacial_warboots_dynamic_transform(transform, item),
        _ => apply_ss_equipment_transform_for_game_mode(transform, item, game_mode),
    }
}

pub(super) fn apply_ss_equipment_transform_for_game_mode(
    transform: &mut SioLmStatTransform,
    item: &Value,
    game_mode: Option<&str>,
) {
    let id = item.get("id").and_then(Value::as_str).unwrap_or("");
    let e_ratio = capped_level_ratio(item.get("e").and_then(Value::as_f64).unwrap_or(0.0), 3.0);
    let v_ratio = capped_level_ratio(item.get("v").and_then(Value::as_f64).unwrap_or(0.0), 2.0);
    let forge_ratio = e_ratio.min(v_ratio);

    match id {
        "twinLance" => {
            add_transform_stat(transform, "atkEquip", 13_052.0);
            add_transform_stat(transform, "atkPercent", 40.0);
            add_transform_stat(transform, "skillDamage", 60.0 + 170.0 * forge_ratio);
            add_transform_stat(transform, "vulnerability", 10.0 + 35.0 * forge_ratio);
            add_transform_stat(transform, "ssMiscPath", 160.56);
        }
        "evervoidArmor" => {
            add_transform_stat(transform, "clarity", 20.0 + 10.0 * forge_ratio);
            add_transform_stat(transform, "shieldDamage", 60.0 * forge_ratio);
        }
        "judgmentNecklace" => {
            add_transform_stat(transform, "atkEquip", 10_743.0);
            add_transform_stat(transform, "atkPercent", 40.0 + 40.0 * forge_ratio);
            add_transform_stat(transform, "weakened", 25.0 + 20.0 * forge_ratio);
            add_transform_stat(transform, "critDamage", 40.0 * forge_ratio);
            set_transform_stat(transform, "weakenedUptime", 1.0);
        }
        "stardustSash" => {
            add_transform_stat(transform, "skillDamage", 30.0 + 60.0 * forge_ratio);
            add_transform_stat(transform, "eternalMultiplier", 25.0 + 30.0 * forge_ratio);
            add_transform_stat(transform, "shieldDamage", 40.0 * forge_ratio);
        }
        "voidwakerEmblem" => {
            let base_boost = 1.766;
            set_transform_stat(
                transform,
                "voidNeckBoost",
                if game_mode == Some("ee") {
                    base_boost * 1.4
                } else {
                    base_boost
                },
            );
            set_transform_stat(transform, "voidNeckBoostUptime", 1.0);
        }
        "twistingBelt" => {
            add_transform_stat(transform, "minEnergyFlux", 80.0);
            add_transform_stat(transform, "maxEnergyFlux", 379.6);
            set_transform_stat(transform, "chaosBeltBoost", 2.298);
        }
        "moonscarBracer" => {
            add_transform_stat(transform, "atkEquip", 10_743.0);
            add_transform_stat(transform, "atkPercent", 60.0 * forge_ratio);
            add_transform_stat(transform, "critRate", 30.0);
            add_transform_stat(transform, "critDamage", 74.0 * forge_ratio);
            add_transform_stat(transform, "shieldDamage", 10.0 + 76.0 * forge_ratio);
            add_transform_stat(transform, "ssGlovesLaser", 50.0);
        }
        "glacialWarboots" => {
            add_transform_stat(transform, "chilled", 15.0 + 70.0 * forge_ratio);
            add_transform_stat(transform, "glacialBloodline", 60.0 + 12.0 * forge_ratio);
            set_transform_stat(transform, "chilledUptime", 1.0);
        }
        _ => {}
    }
    apply_transmute_transform(transform, item);
}

fn apply_dynamic_equipment_attack(
    transform: &mut SioLmStatTransform,
    item: &Value,
    base_atk: f64,
    atk_growth: f64,
    is_ss: bool,
    max_gear: Option<f64>,
) {
    let gear_cap = if is_ss {
        ss_equipment_attack_cap(item.get("c").and_then(Value::as_f64).unwrap_or(0.0))
    } else {
        160.0
    };
    let gear = max_gear.unwrap_or(0.0).min(gear_cap);
    add_transform_stat(transform, "atkEquip", base_atk + gear * atk_growth);
}

fn ss_equipment_attack_cap(core_level: f64) -> f64 {
    if core_level >= 9.0 {
        230.0
    } else if core_level >= 7.0 {
        220.0
    } else if core_level >= 5.0 {
        215.0
    } else if core_level >= 3.0 {
        210.0
    } else if core_level >= 1.0 {
        205.0
    } else {
        200.0
    }
}

fn apply_twin_lance_dynamic_transform(
    transform: &mut SioLmStatTransform,
    item: &Value,
    total_ss_core_level: f64,
    max_gear: Option<f64>,
) {
    apply_dynamic_equipment_attack(transform, item, 952.0, 60.0, true, max_gear);
    add_transform_stat(transform, "skillDamage", 60.0);
    add_transform_stat(transform, "vulnerability", 10.0);
    add_transform_stat(transform, "atkPercent", 40.0);
    apply_cumulative_threshold_stats(
        transform,
        item.get("e").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("atkPercent", 10.0)][..]),
            (3, &[("atkPercent", 10.0), ("skillDamage", 10.0)][..]),
            (
                4,
                &[
                    ("atkPercent", 10.0),
                    ("skillDamage", 10.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
            (
                5,
                &[
                    ("atkPercent", 10.0),
                    ("skillDamage", 45.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("v").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("atkPercent", 10.0)][..]),
            (2, &[("atkPercent", 10.0), ("vulnerability", 10.0)][..]),
            (
                3,
                &[
                    ("atkPercent", 10.0),
                    ("vulnerability", 10.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
            (
                4,
                &[
                    ("atkPercent", 10.0),
                    ("vulnerability", 10.0),
                    ("atkFinal", 4_000.0),
                    ("ssMiscPath", 80.0),
                ][..],
            ),
            (
                5,
                &[
                    ("atkPercent", 10.0),
                    ("vulnerability", 10.0),
                    ("atkFinal", 12_000.0),
                    ("ssMiscPath", 80.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("c").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("vulnerability", 10.0), ("ssMiscPath", 80.0)][..]),
            (
                4,
                &[
                    ("vulnerability", 10.0),
                    ("ssMiscPath", 80.0),
                    ("weakened", 20.0),
                ][..],
            ),
            (
                6,
                &[
                    ("vulnerability", 10.0),
                    ("ssMiscPath", 110.0),
                    ("weakened", 20.0),
                ][..],
            ),
            (
                8,
                &[
                    ("vulnerability", 10.0),
                    ("ssMiscPath", 110.0),
                    ("weakened", 20.0),
                    ("chilled", 30.0),
                ][..],
            ),
            (
                10,
                &[
                    ("vulnerability", 10.0),
                    ("ssMiscPath", 190.0),
                    ("weakened", 20.0),
                    ("chilled", 30.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("x").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("ssMiscPath", 5.0)][..]),
            (2, &[("ssMiscPath", 5.0), ("atkPercent", 10.0)][..]),
            (
                4,
                &[
                    ("ssMiscPath", 5.0),
                    ("atkPercent", 10.0),
                    ("laceration", 15.0),
                ][..],
            ),
            (
                6,
                &[
                    ("ssMiscPath", 5.0),
                    ("atkPercent", 25.0),
                    ("laceration", 15.0),
                ][..],
            ),
            (
                7,
                &[
                    ("ssMiscPath", 15.0),
                    ("atkPercent", 25.0),
                    ("laceration", 15.0),
                ][..],
            ),
            (
                9,
                &[
                    ("ssMiscPath", 15.0),
                    ("atkPercent", 25.0),
                    ("laceration", 15.0),
                    ("skillDamage", 105.0),
                ][..],
            ),
            (
                10,
                &[
                    ("ssMiscPath", 15.0),
                    ("atkPercent", 45.0),
                    ("laceration", 15.0),
                    ("skillDamage", 105.0),
                ][..],
            ),
            (
                11,
                &[
                    ("ssMiscPath", 15.0),
                    ("atkPercent", 45.0),
                    ("laceration", 15.0),
                    ("skillDamage", 155.0),
                ][..],
            ),
            (
                12,
                &[
                    ("ssMiscPath", 15.0),
                    ("atkPercent", 45.0),
                    ("laceration", 40.0),
                    ("skillDamage", 155.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        total_ss_core_level,
        &[
            (3, &[("vulnerability", 10.0)][..]),
            (6, &[("vulnerability", 30.0), ("ssMiscPath", 30.0)][..]),
            (
                12,
                &[
                    ("vulnerability", 30.0),
                    ("ssMiscPath", 60.0),
                    ("skillDamage", 10.0),
                    ("shieldDamage", 10.0),
                ][..],
            ),
            (
                15,
                &[
                    ("vulnerability", 30.0),
                    ("ssMiscPath", 90.0),
                    ("skillDamage", 20.0),
                    ("shieldDamage", 20.0),
                ][..],
            ),
            (
                18,
                &[
                    ("vulnerability", 30.0),
                    ("ssMiscPath", 90.0),
                    ("skillDamage", 40.0),
                    ("shieldDamage", 30.0),
                ][..],
            ),
            (
                21,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 90.0),
                    ("skillDamage", 40.0),
                    ("shieldDamage", 30.0),
                ][..],
            ),
            (
                24,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 90.0),
                    ("skillDamage", 40.0),
                    ("shieldDamage", 30.0),
                    ("critDamage", 50.0),
                ][..],
            ),
            (
                27,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 90.0),
                    ("skillDamage", 100.0),
                    ("shieldDamage", 30.0),
                    ("critDamage", 130.0),
                ][..],
            ),
            (
                30,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 90.0),
                    ("skillDamage", 100.0),
                    ("shieldDamage", 50.0),
                    ("critDamage", 130.0),
                    ("weakened", 25.0),
                    ("weakenedUptime", 1.0),
                ][..],
            ),
            (
                33,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 102.0),
                    ("skillDamage", 140.0),
                    ("shieldDamage", 50.0),
                    ("critDamage", 170.0),
                    ("weakened", 25.0),
                    ("weakenedUptime", 1.0),
                ][..],
            ),
            (
                36,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 102.0),
                    ("skillDamage", 140.0),
                    ("shieldDamage", 110.0),
                    ("critDamage", 245.0),
                    ("weakened", 25.0),
                    ("weakenedUptime", 1.0),
                ][..],
            ),
            (
                42,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 102.0),
                    ("skillDamage", 140.0),
                    ("shieldDamage", 110.0),
                    ("critDamage", 245.0),
                    ("weakened", 25.0),
                    ("weakenedUptime", 1.0),
                    ("damageBoss", 10.0),
                ][..],
            ),
            (
                45,
                &[
                    ("vulnerability", 60.0),
                    ("ssMiscPath", 102.0),
                    ("skillDamage", 140.0),
                    ("shieldDamage", 130.0),
                    ("critDamage", 245.0),
                    ("weakened", 25.0),
                    ("weakenedUptime", 1.0),
                    ("damageBoss", 20.0),
                ][..],
            ),
        ],
    );
    apply_transmute_transform(transform, item);
}

fn apply_evervoid_armor_dynamic_transform(transform: &mut SioLmStatTransform, item: &Value) {
    add_transform_stat(transform, "clarity", 20.0);
    apply_cumulative_threshold_stats(
        transform,
        item.get("e").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("shieldDamage", 10.0)][..]),
            (3, &[("shieldDamage", 20.0)][..]),
            (5, &[("shieldDamage", 40.0)][..]),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("v").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("skillDamage", 10.0)][..]),
            (4, &[("skillDamage", 10.0), ("clarity", 15.0)][..]),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("c").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("shieldDamage", 10.0)][..]),
            (4, &[("shieldDamage", 10.0), ("skillDamage", 20.0)][..]),
            (6, &[("shieldDamage", 10.0), ("skillDamage", 40.0)][..]),
            (
                8,
                &[
                    ("shieldDamage", 10.0),
                    ("skillDamage", 40.0),
                    ("poisoned", 30.0),
                ][..],
            ),
            (
                10,
                &[
                    ("shieldDamage", 40.0),
                    ("skillDamage", 40.0),
                    ("poisoned", 30.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("x").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("ssMiscPath", 5.0)][..]),
            (3, &[("ssMiscPath", 10.0)][..]),
            (4, &[("ssMiscPath", 10.0), ("critDamage", 40.0)][..]),
            (7, &[("ssMiscPath", 15.0), ("critDamage", 40.0)][..]),
            (
                8,
                &[
                    ("ssMiscPath", 15.0),
                    ("critDamage", 40.0),
                    ("shieldDamage", 20.0),
                ][..],
            ),
            (
                9,
                &[
                    ("ssMiscPath", 15.0),
                    ("critDamage", 40.0),
                    ("shieldDamage", 20.0),
                    ("laceration", 15.0),
                ][..],
            ),
            (
                11,
                &[
                    ("ssMiscPath", 15.0),
                    ("critDamage", 40.0),
                    ("shieldDamage", 40.0),
                    ("laceration", 15.0),
                ][..],
            ),
            (
                12,
                &[
                    ("ssMiscPath", 15.0),
                    ("critDamage", 40.0),
                    ("shieldDamage", 40.0),
                    ("laceration", 15.0),
                    ("skillDamage", 40.0),
                ][..],
            ),
        ],
    );
    apply_transmute_transform(transform, item);
}

fn apply_judgment_necklace_dynamic_transform(
    transform: &mut SioLmStatTransform,
    item: &Value,
    max_gear: Option<f64>,
) {
    apply_dynamic_equipment_attack(transform, item, 793.0, 50.0, true, max_gear);
    add_transform_stat(transform, "weakened", 25.0);
    set_transform_stat(transform, "weakenedUptime", 1.0);
    add_transform_stat(transform, "atkPercent", 40.0);
    apply_cumulative_threshold_stats(
        transform,
        item.get("e").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("skillDamage", 50.0)][..]),
            (2, &[("skillDamage", 50.0), ("atkPercent", 10.0)][..]),
            (
                3,
                &[
                    ("skillDamage", 50.0),
                    ("atkPercent", 10.0),
                    ("weakened", 10.0),
                ][..],
            ),
            (
                4,
                &[
                    ("skillDamage", 50.0),
                    ("atkPercent", 10.0),
                    ("weakened", 10.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
            (
                5,
                &[
                    ("skillDamage", 50.0),
                    ("atkPercent", 10.0),
                    ("weakened", 14.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("v").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("atkPercent", 10.0)][..]),
            (2, &[("atkPercent", 10.0), ("critDamage", 36.0)][..]),
            (
                3,
                &[
                    ("atkPercent", 10.0),
                    ("critDamage", 36.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
            (
                4,
                &[
                    ("atkPercent", 10.0),
                    ("critDamage", 96.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
            (
                5,
                &[
                    ("atkPercent", 10.0),
                    ("critDamage", 96.0),
                    ("atkFinal", 12_000.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("c").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("critDamage", 25.0)][..]),
            (4, &[("critDamage", 25.0), ("skillDamage", 20.0)][..]),
            (6, &[("critDamage", 25.0), ("skillDamage", 60.0)][..]),
            (
                8,
                &[
                    ("critDamage", 25.0),
                    ("skillDamage", 60.0),
                    ("weakened", 30.0),
                ][..],
            ),
            (
                10,
                &[
                    ("critDamage", 25.0),
                    ("skillDamage", 60.0),
                    ("weakened", 70.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("x").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("ssMiscPath", 5.0)][..]),
            (2, &[("ssMiscPath", 5.0), ("atkPercent", 10.0)][..]),
            (3, &[("ssMiscPath", 10.0), ("atkPercent", 10.0)][..]),
            (
                4,
                &[
                    ("ssMiscPath", 10.0),
                    ("atkPercent", 10.0),
                    ("weakened", 60.0),
                ][..],
            ),
            (
                6,
                &[
                    ("ssMiscPath", 10.0),
                    ("atkPercent", 25.0),
                    ("weakened", 60.0),
                ][..],
            ),
            (
                7,
                &[
                    ("ssMiscPath", 20.0),
                    ("atkPercent", 25.0),
                    ("weakened", 60.0),
                ][..],
            ),
            (
                8,
                &[
                    ("ssMiscPath", 20.0),
                    ("atkPercent", 25.0),
                    ("weakened", 160.0),
                ][..],
            ),
            (
                9,
                &[
                    ("ssMiscPath", 20.0),
                    ("atkPercent", 25.0),
                    ("weakened", 160.0),
                    ("critDamage", 120.0),
                ][..],
            ),
            (
                10,
                &[
                    ("ssMiscPath", 20.0),
                    ("atkPercent", 45.0),
                    ("weakened", 160.0),
                    ("critDamage", 120.0),
                ][..],
            ),
            (
                11,
                &[
                    ("ssMiscPath", 20.0),
                    ("atkPercent", 45.0),
                    ("weakened", 160.0),
                    ("critDamage", 120.0),
                    ("shieldDamage", 60.0),
                ][..],
            ),
            (
                12,
                &[
                    ("ssMiscPath", 20.0),
                    ("atkPercent", 45.0),
                    ("weakened", 160.0),
                    ("critDamage", 120.0),
                    ("shieldDamage", 60.0),
                    ("laceration", 15.0),
                ][..],
            ),
        ],
    );
    apply_transmute_transform(transform, item);
}

fn apply_stardust_sash_dynamic_transform(transform: &mut SioLmStatTransform, item: &Value) {
    add_transform_stat(transform, "skillDamage", 30.0);
    add_transform_stat(transform, "eternalMultiplier", 25.0);
    apply_cumulative_threshold_stats(
        transform,
        item.get("e").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("eternalMultiplier", 25.0)][..]),
            (3, &[("eternalMultiplier", 25.0), ("skillDamage", 25.0)][..]),
            (
                5,
                &[
                    ("eternalMultiplier", 25.0),
                    ("skillDamage", 25.0),
                    ("critDamage", 50.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("v").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("shieldDamage", 10.0)][..]),
            (4, &[("shieldDamage", 30.0)][..]),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("c").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("skillDamage", 20.0)][..]),
            (4, &[("skillDamage", 20.0), ("critDamage", 20.0)][..]),
            (
                6,
                &[
                    ("skillDamage", 20.0),
                    ("critDamage", 20.0),
                    ("eternalMultiplier", 15.0),
                ][..],
            ),
            (
                8,
                &[
                    ("skillDamage", 50.0),
                    ("critDamage", 20.0),
                    ("eternalMultiplier", 15.0),
                ][..],
            ),
            (
                10,
                &[
                    ("skillDamage", 50.0),
                    ("critDamage", 20.0),
                    ("eternalMultiplier", 15.0),
                    ("shieldDamage", 30.0),
                ][..],
            ),
        ],
    );
}

fn apply_voidwaker_emblem_dynamic_transform(
    transform: &mut SioLmStatTransform,
    item: &Value,
    game_mode: Option<&str>,
    max_gear: Option<f64>,
) {
    apply_dynamic_equipment_attack(transform, item, 508.0, 32.0, false, max_gear);
    add_transform_stat(transform, "critRate", 40.0);
    add_transform_stat(transform, "atkPercent", 40.0);
    let void_neck_boost = 40.0;
    if item.get("base").and_then(Value::as_f64).unwrap_or(0.0) >= 2.0 {
        add_transform_stat(transform, "atkPercent", 20.0);
    }
    set_transform_stat(
        transform,
        "voidNeckBoost",
        (void_neck_boost + 100.0) / 100.0 * if game_mode == Some("ee") { 1.4 } else { 1.0 },
    );
    set_transform_stat(transform, "voidNeckBoostUptime", 1.0);
}

fn apply_twisting_belt_dynamic_transform(transform: &mut SioLmStatTransform, item: &Value) {
    let base = item.get("base").and_then(Value::as_f64).unwrap_or(0.0);
    let min_energy_flux = 80.0;
    let max_energy_flux = if base >= 3.0 {
        200.0
    } else if base >= 1.0 {
        180.0
    } else {
        160.0
    };
    add_transform_stat(transform, "minEnergyFlux", min_energy_flux);
    add_transform_stat(transform, "maxEnergyFlux", max_energy_flux);
    set_transform_stat(
        transform,
        "chaosBeltBoost",
        ((max_energy_flux - min_energy_flux) / 2.0 + min_energy_flux) / 100.0,
    );
}

fn apply_moonscar_bracer_dynamic_transform(
    transform: &mut SioLmStatTransform,
    item: &Value,
    max_gear: Option<f64>,
) {
    apply_dynamic_equipment_attack(transform, item, 793.0, 50.0, true, max_gear);
    add_transform_stat(transform, "critRate", 30.0);
    add_transform_stat(transform, "shieldDamage", 10.0);
    add_transform_stat(transform, "ssGlovesLaser", 50.0);
    add_transform_stat(transform, "atkPercent", 40.0);
    apply_cumulative_threshold_stats(
        transform,
        item.get("e").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("atkPercent", 10.0)][..]),
            (4, &[("atkPercent", 10.0), ("atkFinal", 4_000.0)][..]),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("v").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("atkPercent", 10.0)][..]),
            (2, &[("atkPercent", 10.0), ("shieldDamage", 20.0)][..]),
            (
                3,
                &[
                    ("atkPercent", 10.0),
                    ("shieldDamage", 20.0),
                    ("atkFinal", 4_000.0),
                ][..],
            ),
            (
                4,
                &[
                    ("atkPercent", 10.0),
                    ("shieldDamage", 20.0),
                    ("atkFinal", 4_000.0),
                    ("ssGlovesLaser", 15.0),
                ][..],
            ),
            (
                5,
                &[
                    ("atkPercent", 10.0),
                    ("shieldDamage", 20.0),
                    ("atkFinal", 12_000.0),
                    ("ssGlovesLaser", 15.0),
                ][..],
            ),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("c").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("shieldDamage", 20.0)][..]),
            (4, &[("shieldDamage", 20.0), ("critDamage", 20.0)][..]),
            (6, &[("shieldDamage", 20.0), ("critDamage", 80.0)][..]),
            (
                8,
                &[
                    ("shieldDamage", 20.0),
                    ("critDamage", 80.0),
                    ("poisoned", 30.0),
                ][..],
            ),
            (
                10,
                &[
                    ("shieldDamage", 40.0),
                    ("critDamage", 140.0),
                    ("poisoned", 30.0),
                    ("critRate", 40.0),
                ][..],
            ),
        ],
    );
}

fn apply_glacial_warboots_dynamic_transform(transform: &mut SioLmStatTransform, item: &Value) {
    add_transform_stat(transform, "chilled", 15.0);
    add_transform_stat(transform, "glacialBloodline", 60.0);
    set_transform_stat(transform, "chilledUptime", 1.0);
    apply_cumulative_threshold_stats(
        transform,
        item.get("e").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (1, &[("shieldDamage", 20.0)][..]),
            (3, &[("shieldDamage", 41.0)][..]),
            (5, &[("shieldDamage", 45.0), ("glacialBloodline", 12.0)][..]),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("v").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("chilled", 20.0)][..]),
            (4, &[("chilled", 40.0), ("vulnerability", 10.0)][..]),
        ],
    );
    apply_cumulative_threshold_stats(
        transform,
        item.get("c").and_then(Value::as_f64).unwrap_or(0.0),
        &[
            (2, &[("shieldDamage", 20.0)][..]),
            (4, &[("shieldDamage", 20.0), ("skillDamage", 20.0)][..]),
            (
                8,
                &[
                    ("shieldDamage", 20.0),
                    ("skillDamage", 20.0),
                    ("chilled", 30.0),
                ][..],
            ),
            (
                10,
                &[
                    ("shieldDamage", 20.0),
                    ("skillDamage", 20.0),
                    ("chilled", 60.0),
                ][..],
            ),
        ],
    );
}

fn apply_cumulative_threshold_stats(
    transform: &mut SioLmStatTransform,
    level: f64,
    thresholds: &[(u64, &[(&str, f64)])],
) {
    let level = level.floor() as u64;
    let Some((_, stats)) = thresholds
        .iter()
        .filter(|(threshold, _)| level >= *threshold)
        .next_back()
    else {
        return;
    };
    for (stat, value) in *stats {
        add_transform_stat(transform, stat, *value);
    }
}

fn apply_transmute_transform(transform: &mut SioLmStatTransform, item: &Value) {
    let x_level = item.get("x").and_then(Value::as_f64).unwrap_or(0.0);
    if x_level <= 0.0 {
        return;
    }
    let slot = item.get("slot").and_then(Value::as_str).unwrap_or("");
    let effect = item
        .get("transmuteEffect")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let condition = item
        .get("transmuteCondition")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let Some(cooldown) = transmute_condition_cooldown(slot, condition) else {
        return;
    };
    let average_stack = if cooldown == 15 {
        4.183_333_333_333_334
    } else {
        4.766_666_666_666_667
    };
    if let Some(stat) = transmute_effect_stat(slot, effect) {
        add_transform_stat(transform, stat, 35.0 * average_stack);
    }
    if x_level >= 5.0 {
        add_transform_stat(transform, "damageTransmute", 3.0 * average_stack);
    }
    if x_level >= 13.0 {
        add_transform_stat(transform, "damageTransmute", average_stack);
    }
}

fn transmute_condition_cooldown(slot: &str, condition: u64) -> Option<u8> {
    match (slot, condition) {
        ("Weapon" | "Armor" | "Necklace", 0) => Some(15),
        ("Weapon" | "Armor" | "Necklace", 1 | 2) => Some(10),
        _ => None,
    }
}

fn transmute_effect_stat(slot: &str, effect: u64) -> Option<&'static str> {
    match (slot, effect) {
        ("Weapon" | "Armor" | "Necklace", 0) => Some("chilled"),
        ("Weapon" | "Armor" | "Necklace", 1) => Some("poisoned"),
        ("Weapon" | "Armor" | "Necklace", 2) => Some("weakened"),
        _ => None,
    }
}
