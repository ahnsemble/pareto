use serde_json::{json, Map, Value};

const SS_EFFECT_IDS: [&str; 11] = [
    "moonscarCritThreshold",
    "moonscarDivineDragonUptime",
    "moonscarSkillThreshold",
    "glacialWarbootsBloodline",
    "twinLanceCustomSetChain",
    "eternalSuitReviveShield",
    "voidwakerEmblemBoost",
    "voidwakerHandguardsInstakill",
    "voidwakerTreadsBoost",
    "necklaceArmorCombinedShield",
    "postProcessingBoosts",
];

fn array<'a>(value: &'a Value, key: &str) -> &'a [Value] {
    value
        .get(key)
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[])
}

fn object<'a>(value: &'a Value, key: &str) -> Option<&'a Map<String, Value>> {
    value.get(key).and_then(Value::as_object)
}

fn num(value: &Value, key: &str) -> f64 {
    value
        .get(key)
        .and_then(Value::as_f64)
        .filter(|n| n.is_finite())
        .unwrap_or(0.0)
}

fn bool_value(value: &Value, key: &str) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn str_value<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value.get(key).and_then(Value::as_str)
}

fn nested_num(value: &Value, path: &[&str]) -> f64 {
    let mut current = value;
    for part in path {
        let Some(next) = current.get(*part) else {
            return 0.0;
        };
        current = next;
    }
    current.as_f64().filter(|n| n.is_finite()).unwrap_or(0.0)
}

fn nested_bool(value: &Value, path: &[&str]) -> bool {
    let mut current = value;
    for part in path {
        let Some(next) = current.get(*part) else {
            return false;
        };
        current = next;
    }
    current.as_bool().unwrap_or(false)
}

fn add_stat(stats: &mut Map<String, Value>, key: &str, delta: f64) {
    let next = stats.get(key).and_then(Value::as_f64).unwrap_or(0.0) + delta;
    stats.insert(key.to_string(), json!(next));
}

fn set_stat_max(stats: &mut Map<String, Value>, key: &str, value: f64) {
    let current = stats.get(key).and_then(Value::as_f64).unwrap_or(0.0);
    if value > current {
        stats.insert(key.to_string(), json!(value));
    }
}

fn stat(stats: &Map<String, Value>, key: &str) -> f64 {
    stats
        .get(key)
        .and_then(Value::as_f64)
        .filter(|n| n.is_finite())
        .unwrap_or(0.0)
}

fn stat_or(stats: &Map<String, Value>, key: &str, default_value: f64) -> f64 {
    stats
        .get(key)
        .and_then(Value::as_f64)
        .filter(|n| n.is_finite())
        .unwrap_or(default_value)
}

fn collect_stats(input: &Value) -> Map<String, Value> {
    let mut stats = object(input, "stats").cloned().unwrap_or_default();
    let damage = input.get("damage").unwrap_or(&Value::Null);

    let base_attack = nested_num(damage, &["base_attack"]);
    if base_attack > 0.0 {
        stats.insert("atkBase".to_string(), json!(base_attack));
    } else {
        stats.insert("atkBase".to_string(), json!(num(input, "base_attack")));
    }

    let damage_mappings = [
        ("critRate", "crit_rate_percent", 0.01),
        ("critDamage", "crit_damage_percent", 0.01),
        ("damageDealt", "damage_percent", 1.0),
        ("skillDamage", "skill_damage_percent", 1.0),
        ("damageBoss", "boss_damage_percent", 1.0),
        ("vulnerability", "vulnerability_percent", 1.0),
        ("atkFinal", "final_attack", 1.0),
    ];
    for (stat_key, input_key, scale) in damage_mappings {
        let value = num(damage, input_key);
        if value > 0.0 && !stats.contains_key(stat_key) {
            stats.insert(stat_key.to_string(), json!(value * scale));
        }
    }

    stats
}

fn equipment_by_id<'a>(input: &'a Value, id: &str) -> Option<&'a Value> {
    array(input, "ss_equipment")
        .iter()
        .find(|item| str_value(item, "id") == Some(id))
}

fn slot_has_ss(input: &Value, slot: &str) -> bool {
    array(input, "ss_equipment")
        .iter()
        .any(|item| str_value(item, "slot") == Some(slot))
}

fn set_config<'a>(input: &'a Value, key: &str) -> &'a Value {
    input
        .get("collectibleSets")
        .and_then(|sets| sets.get(key))
        .unwrap_or(&Value::Null)
}

fn apply_hero_conditionals(
    input: &Value,
    stats: &mut Map<String, Value>,
    applied: &mut Vec<String>,
) {
    let hero_id = input
        .get("selected_hero")
        .and_then(|hero| str_value(hero, "id"))
        .unwrap_or("");
    let conditional = input.get("conditional_state").unwrap_or(&Value::Null);

    if hero_id == "king" {
        add_stat(stats, "critRate", 0.30);
        add_stat(stats, "critDamage", 2.0);
        applied.push("king_crit_expectation".to_string());
    }

    if hero_id == "taloxa" && bool_value(conditional, "target_lacerated") {
        add_stat(stats, "laceration", 125.0);
        add_stat(stats, "lacerationUptime", 1.0);
        applied.push("taloxa_laceration_stack".to_string());
    }

    if hero_id == "venato" && bool_value(conditional, "skill_active_window") {
        add_stat(
            stats,
            "adrenaline",
            num(conditional, "hp_missing_ratio") * 40.0,
        );
        applied.push("venato_hp_missing_adrenaline".to_string());
    }

    if bool_value(conditional, "target_weakened") {
        add_stat(stats, "weakened", 18.0);
        add_stat(stats, "weakenedUptime", 1.0);
        applied.push("judgment_weakened_target".to_string());
    }

    let lme_gain = if bool_value(conditional, "target_is_boss") {
        20.0
    } else {
        5.0
    };
    add_stat(stats, "lme1Damage", lme_gain);
    applied.push("lme_phase_weight".to_string());
}

fn apply_xeno(input: &Value, stats: &mut Map<String, Value>, skipped: &mut Vec<String>) {
    let Some(xeno) = input.get("xeno_transmute_modifier") else {
        skipped.push("xeno_transmute_modifier".to_string());
        return;
    };
    if xeno.is_null() || array(xeno, "active_effects").is_empty() {
        skipped.push("xeno_transmute_modifier".to_string());
        return;
    }

    let deltas = object(xeno, "stat_channel_delta");
    for effect in array(xeno, "active_effects") {
        let channel = str_value(effect, "stat_channel").unwrap_or("damageBoss");
        let delta = deltas
            .and_then(|map| map.get(channel))
            .and_then(Value::as_f64)
            .filter(|n| n.is_finite())
            .unwrap_or(5.0);
        add_stat(stats, channel, delta * 100.0);
    }
}

fn apply_ss_effects(input: &Value, stats: &mut Map<String, Value>) -> Vec<String> {
    let mut effects = Vec::new();
    let dragon = set_config(input, "summonTheDivineDragon");
    let ss_slots = nested_num(input, &["customSets", "ssSlotCount"]);

    if equipment_by_id(input, "moonscarBracer").is_some() {
        let dragon_gold = num(dragon, "goldStars");
        let dragon_total = num(dragon, "totalStars");
        if stat(stats, "critRate") >= 1.0 {
            add_stat(
                stats,
                "critDamage",
                if dragon_gold >= 8.0 { 60.0 } else { 30.0 },
            );
        }
        if stat(stats, "critRate") >= 1.3 {
            add_stat(
                stats,
                "skillDamage",
                if dragon_total >= 25.0 { 60.0 } else { 30.0 },
            );
        }
        if stat(stats, "critRate") >= 1.5 {
            add_stat(stats, "critDamage", 100.0);
        }
    }
    effects.push(SS_EFFECT_IDS[0].to_string());
    effects.push(SS_EFFECT_IDS[1].to_string());
    effects.push(SS_EFFECT_IDS[2].to_string());

    if let Some(boots) = equipment_by_id(input, "glacialWarboots") {
        add_stat(
            stats,
            "shieldDamage",
            if num(boots, "astral_forge_eaf_level") >= 5.0 {
                60.0
            } else {
                50.0
            },
        );
        if num(boots, "chaos_fusion_level") >= 6.0 {
            add_stat(
                stats,
                "glacialBloodline",
                if num(boots, "chaos_fusion_level") >= 10.0 {
                    30.0
                } else {
                    15.0
                },
            );
        }
    }
    effects.push(SS_EFFECT_IDS[3].to_string());

    if let Some(weapon) = equipment_by_id(input, "twinLance") {
        let e5 = num(weapon, "astral_forge_eaf_level") >= 5.0;
        if ss_slots >= 8.0 {
            add_stat(stats, "skillDamage", if e5 { 45.0 } else { 30.0 });
        }
        if ss_slots >= 18.0 {
            add_stat(stats, "skillDamage", if e5 { 75.0 } else { 50.0 });
        }
        if ss_slots >= 24.0 && slot_has_ss(input, "necklace") {
            add_stat(stats, "skillDamage", 30.0);
        }
        if ss_slots >= 48.0 {
            add_stat(stats, "shieldDamage", 30.0);
            add_stat(stats, "skillDamage", 30.0);
        }
        if str_value(input, "mode") == Some("ee") {
            add_stat(stats, "xenoSkillDamage", 50.0);
        }
    }
    effects.push(SS_EFFECT_IDS[4].to_string());

    if equipment_by_id(input, "eternalSuit").is_some() {
        add_stat(stats, "shieldDamageUptime", 0.5);
        set_stat_max(stats, "eternalSuitBoost", 1.10);
    }
    effects.push(SS_EFFECT_IDS[5].to_string());

    if equipment_by_id(input, "voidwakerEmblem").is_some() {
        set_stat_max(
            stats,
            "voidNeckBoost",
            if str_value(input, "mode") == Some("ee") {
                1.4
            } else {
                1.2
            },
        );
        set_stat_max(stats, "voidNeckBoostUptime", 1.0);
    }
    effects.push(SS_EFFECT_IDS[6].to_string());

    if equipment_by_id(input, "voidwakerHandguards").is_some()
        || equipment_by_id(input, "moonscarBracer").is_some()
    {
        set_stat_max(stats, "voidGlovesInstakill", 1.05);
    }
    effects.push(SS_EFFECT_IDS[7].to_string());

    if equipment_by_id(input, "voidwakerTreads").is_some()
        || equipment_by_id(input, "glacialWarboots").is_some()
    {
        set_stat_max(stats, "voidBootsBoost", 1.10);
    }
    effects.push(SS_EFFECT_IDS[8].to_string());

    let necklace = array(input, "ss_equipment")
        .iter()
        .find(|item| str_value(item, "slot") == Some("necklace"));
    let armor = array(input, "ss_equipment")
        .iter()
        .find(|item| str_value(item, "slot") == Some("armor"));
    if necklace.is_some_and(|item| num(item, "astral_forge_eaf_level") >= 5.0)
        && armor.is_some_and(|item| num(item, "astral_forge_eaf_level") >= 5.0)
    {
        add_stat(stats, "shieldDamage", 10.0);
    }
    effects.push(SS_EFFECT_IDS[9].to_string());

    set_stat_max(
        stats,
        "chaosBeltBoost",
        1.0 + stat(stats, "chaosBeltBoost") / 100.0,
    );
    set_stat_max(
        stats,
        "hpBulletBoost",
        1.0 + stat(stats, "hpBulletBoost") / 100.0,
    );
    effects.push(SS_EFFECT_IDS[10].to_string());

    effects
}

fn damage_mode_value(input: &Value, key: &str) -> f64 {
    input
        .get("damageModeMultipliers")
        .and_then(|value| value.get(key))
        .and_then(Value::as_f64)
        .filter(|n| n.is_finite())
        .unwrap_or(1.0)
}

fn multiplier_stages(input: &Value, stats: &Map<String, Value>) -> Vec<f64> {
    let atk_base = stat(stats, "atkBase");
    let atk_equip = stat(stats, "atkEquip");
    let atk_equip_percent = stat(stats, "atkEquipPercent");
    let atk_hero = stat(stats, "atkHero");
    let atk_hero_percent = stat(stats, "atkHeroPercent");
    let atk_percent = stat(stats, "atkPercent");
    let atk_final = stat(stats, "atkFinal");

    vec![
        atk_base
            + atk_equip * (1.0 + atk_equip_percent / 100.0)
            + atk_hero * (1.0 + atk_hero_percent / 100.0) * (1.0 + atk_percent / 100.0)
            + atk_final,
        stat(stats, "critRate") * stat_or(stats, "critDamage", 1.0)
            + (1.0 - stat(stats, "critRate")),
        1.0 + stat(stats, "vulnerability").max(0.0) / 100.0,
        1.0 + (stat(stats, "shieldDamage") * stat(stats, "shieldDamageUptime")).max(0.0) / 100.0,
        1.0 + ((stat(stats, "poisoned") * stat(stats, "poisonedUptime")).max(0.0)
            + (stat(stats, "weakened") * stat(stats, "weakenedUptime")).max(0.0)
            + (stat(stats, "chilled") * stat(stats, "chilledUptime")).max(0.0)
            + stat(stats, "exposedDamage"))
            / 100.0,
        1.0 + stat(stats, "clarity") / 100.0,
        1.0 + stat(stats, "eternalMultiplier") / 100.0,
        1.0 + stat(stats, "glacialBloodline") / 100.0,
        1.0 + ((stat(stats, "laceration") * stat(stats, "lacerationUptime")).max(0.0)
            + (stat(stats, "divineFire") * stat(stats, "divineFireUptime")).max(0.0))
            / 100.0,
        1.0 + stat(stats, "joeyWeakSpot") / 100.0,
        1.0 + stat(stats, "ssGlovesLaser") / 100.0,
        1.0 + stat(stats, "flashriftRip") / 100.0,
        1.0 + stat(stats, "taloxaOverload") / 100.0,
        stat_or(stats, "eternalSuitBoost", 1.0),
        stat_or(stats, "voidNeckBoost", 1.0) * stat_or(stats, "voidNeckBoostUptime", 1.0),
        stat_or(stats, "voidGlovesInstakill", 1.0),
        stat_or(stats, "voidBootsBoost", 1.0),
        stat_or(stats, "chaosBeltBoost", 1.0),
        stat_or(stats, "hpBulletBoost", 1.0),
        1.0 + stat(stats, "damageDealt") / 100.0,
        1.0 + stat(stats, "adrenaline") / 100.0,
        1.0 + stat(stats, "damageTransmute") / 100.0,
        1.0 + stat(stats, "damageBoss") / 100.0,
        1.0 + stat(stats, "xenoResMultiplier") / 100.0,
        1.0 + stat(stats, "lme1Damage") / 100.0,
        damage_mode_value(input, "totalCount"),
        damage_mode_value(input, "otherDamage"),
        damage_mode_value(input, "exoBracerMult"),
        damage_mode_value(input, "ammoThrusterMult"),
        damage_mode_value(input, "heFuelMult"),
        damage_mode_value(input, "energyCubeMult"),
    ]
}

fn rarity_multiplier(rarity: &str, excellent: f64, advanced: f64, super_mult: f64) -> f64 {
    match rarity {
        "Excellent" | "excellent" => excellent,
        "Advanced" | "advanced" => advanced,
        "Super" | "super" => super_mult,
        _ => 1.0,
    }
}

fn selected_hero_id(input: &Value) -> &str {
    input
        .get("selected_hero")
        .and_then(|hero| str_value(hero, "id"))
        .unwrap_or("")
}

fn selected_hero_stars(input: &Value) -> f64 {
    input
        .get("selected_hero")
        .map(|hero| num(hero, "stars"))
        .unwrap_or(0.0)
}

fn worm_cooldown_reduction(input: &Value) -> (f64, usize) {
    let mut a = 1.0;
    let s = 1.0;
    let mut stages = 0usize;

    if nested_bool(input, &["evotree", "overreaction"]) {
        a *= 0.95;
        stages += 1;
    }

    if nested_bool(input, &["activeSkills", "energyCube"]) {
        a *= if nested_bool(input, &["activeSkills", "evolvePassives"]) {
            0.52
        } else {
            0.60
        };
        stages += 1;
    }

    let teamwork_has_worm = array(input, "teamwork")
        .iter()
        .any(|hero| hero.as_str() == Some("worm") || str_value(hero, "id") == Some("worm"));
    if selected_hero_id(input) == "worm" || teamwork_has_worm {
        let stars = selected_hero_stars(input);
        if stars >= 12.0 {
            a *= 0.80;
            stages += 1;
        } else if stars >= 10.0 {
            a *= 0.90;
            stages += 1;
        }
    }

    for pet in array(input, "pets") {
        if str_value(pet, "id") != Some("rex") {
            continue;
        }
        let rex_stars = num(pet, "stars");
        if rex_stars > 0.0 {
            a *= 1.0 - (rex_stars.min(10.0) * 0.01);
            stages += 1;
        }
        if let Some(rarity) = str_value(pet, "battleLustRarity") {
            a *= rarity_multiplier(rarity, 0.99, 0.985, 0.98);
            stages += 1;
        }
        if let Some(rarity) = str_value(pet, "garyRarity") {
            a *= rarity_multiplier(rarity, 0.99, 0.985, 0.98);
            stages += 1;
        }
    }

    (1.0 / (a.min(2.0) * s), stages)
}

fn damage_calc_mode(input: &Value) -> &'static str {
    match str_value(input, "mode") {
        Some("multiplier") | Some("generic_calculator") => "multiplier",
        _ => "damage",
    }
}

pub fn v3_damage_value(input: &Value) -> Value {
    let mut stats = collect_stats(input);
    let mut applied_conditionals = Vec::new();
    let mut skipped = Vec::new();

    apply_hero_conditionals(input, &mut stats, &mut applied_conditionals);
    apply_xeno(input, &mut stats, &mut skipped);
    let ss_effects = apply_ss_effects(input, &mut stats);
    let (worm_cdr, worm_stage_count) = worm_cooldown_reduction(input);
    if worm_stage_count > 0 {
        stats.insert("cooldownReduction".to_string(), json!(worm_cdr));
    }

    let stages = multiplier_stages(input, &stats);
    let final_damage = stages.iter().product::<f64>();
    let mut channel_breakdown = Map::new();
    for (index, value) in stages.iter().enumerate() {
        channel_breakdown.insert(format!("en{index}"), json!(value));
    }

    json!({
        "final_damage": final_damage,
        "damage_multiplier": stages.iter().skip(1).product::<f64>(),
        "channel_breakdown": channel_breakdown,
        "applied_conditionals": applied_conditionals,
        "isolated_pending_xeno_specs_skipped": skipped,
        "sio_multiplier_stages": stages,
        "dps_formula_multiplier_stages_count": 31,
        "derived_stats": stats,
        "ss_conditional_effects": ss_effects,
        "ss_conditional_effect_formula_count": 11,
        "worm_cooldown_reduction": worm_cdr,
        "worm_cdr_stage_count": worm_stage_count,
        "damage_calc_mode": damage_calc_mode(input)
    })
}
