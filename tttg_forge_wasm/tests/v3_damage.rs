#![recursion_limit = "256"]

use serde_json::json;

fn assert_close(actual: f64, expected: f64) {
    assert!(
        (actual - expected).abs() <= 1e-12,
        "expected {expected}, got {actual}"
    );
}

#[test]
fn v3_damage_baseline_equipment_and_xeno_skip_match_contract() {
    let input = json!({
        "base_attack": 100.0,
        "selected_hero": { "id": "common" },
        "ss_equipment": [
            {
                "slot": "weapon",
                "astral_forge_eaf_level": 1,
                "astral_forge_vaf_level": 0
            }
        ],
        "weapons": [],
        "tech_parts": [],
        "pets": [],
        "collectibles": [],
        "lme_turf": { "nodes": [] },
        "mode": "generic_calculator",
        "conditional_state": {},
        "xeno_transmute_modifier": null
    });

    let actual = tttg_forge_wasm::v3_damage_value(&input);

    assert_close(actual["final_damage"].as_f64().unwrap(), 105.0);
    assert_close(actual["damage_multiplier"].as_f64().unwrap(), 1.05);
    assert_close(actual["channel_breakdown"]["en0"].as_f64().unwrap(), 100.0);
    assert_close(actual["channel_breakdown"]["en24"].as_f64().unwrap(), 1.05);
    assert_eq!(
        actual["isolated_pending_xeno_specs_skipped"],
        json!(["xeno_transmute_modifier"])
    );
}

#[test]
fn v3_damage_full_path_applies_tech_pet_collectible_conditionals_xeno_and_mode() {
    let input = json!({
        "base_attack": 100.0,
        "selected_hero": { "id": "king" },
        "ss_equipment": [],
        "weapons": [],
        "tech_parts": [
            {
                "id": "drone",
                "equipped_slot": "attack_1",
                "is_twinborn": true,
                "resonance_chip_allocated": 2
            }
        ],
        "pets": [
            {
                "id": "rex",
                "slot": "deployed",
                "resonance_atk": 5
            }
        ],
        "collectibles": [
            { "unlocks_custom_collection_slot": true }
        ],
        "lme_turf": { "nodes": [] },
        "mode": "ee",
        "conditional_state": {},
        "xeno_transmute_modifier": {
            "source_id": "twin_lance_xeno_effect_table",
            "active_effects": [
                { "stat_channel": "damageBoss" }
            ],
            "stat_channel_delta": {
                "damageBoss": 0.20
            }
        }
    });

    let actual = tttg_forge_wasm::v3_damage_value(&input);
    let expected_multiplier = 1.30 * 1.05 * 1.20;

    assert_close(actual["final_damage"].as_f64().unwrap(), 100.0 * expected_multiplier);
    assert_close(actual["damage_multiplier"].as_f64().unwrap(), expected_multiplier);
    assert_close(actual["channel_breakdown"]["en1"].as_f64().unwrap(), 1.30);
    assert_close(actual["channel_breakdown"]["en22"].as_f64().unwrap(), 1.20);
    assert_close(actual["channel_breakdown"]["en24"].as_f64().unwrap(), 1.05);
    assert_eq!(actual["applied_conditionals"], json!(["king_crit_expectation", "lme_phase_weight"]));
}

#[test]
fn v3_damage_uses_31_stage_sio_multiplier_chain() {
    let input = json!({
        "base_attack": 100.0,
        "stats": {
            "atkEquip": 20.0,
            "atkEquipPercent": 10.0,
            "atkHero": 30.0,
            "atkHeroPercent": 20.0,
            "atkPercent": 50.0,
            "atkFinal": 5.0,
            "critRate": 0.25,
            "critDamage": 3.0,
            "vulnerability": 20.0,
            "shieldDamage": 10.0,
            "shieldDamageUptime": 0.5,
            "poisoned": 5.0,
            "poisonedUptime": 1.0,
            "weakened": 4.0,
            "weakenedUptime": 0.5,
            "chilled": 3.0,
            "chilledUptime": 0.25,
            "exposedDamage": 2.0,
            "clarity": 7.0,
            "eternalMultiplier": 8.0,
            "glacialBloodline": 9.0,
            "laceration": 6.0,
            "lacerationUptime": 0.5,
            "divineFire": 5.0,
            "divineFireUptime": 0.5,
            "joeyWeakSpot": 11.0,
            "ssGlovesLaser": 12.0,
            "flashriftRip": 13.0,
            "taloxaOverload": 14.0,
            "eternalSuitBoost": 1.15,
            "voidNeckBoost": 1.2,
            "voidNeckBoostUptime": 0.75,
            "voidGlovesInstakill": 1.3,
            "voidBootsBoost": 1.4,
            "chaosBeltBoost": 1.5,
            "hpBulletBoost": 1.6,
            "damageDealt": 15.0,
            "adrenaline": 16.0,
            "damageTransmute": 17.0,
            "damageBoss": 18.0,
            "xenoResMultiplier": 19.0,
            "lme1Damage": 20.0
        },
        "damageModeMultipliers": {
            "totalCount": 1.1,
            "otherDamage": 1.2,
            "exoBracerMult": 0.9,
            "ammoThrusterMult": 1.05,
            "heFuelMult": 1.06,
            "energyCubeMult": 1.07
        },
        "mode": "damage",
        "ss_equipment": [],
        "weapons": [],
        "tech_parts": [],
        "pets": [],
        "collectibles": [],
        "lme_turf": { "nodes": [] },
        "conditional_state": {},
        "xeno_transmute_modifier": null
    });

    let actual = tttg_forge_wasm::v3_damage_value(&input);
    let stages = actual["sio_multiplier_stages"].as_array().unwrap();
    assert_eq!(stages.len(), 31);

    let expected = stages
        .iter()
        .map(|stage| stage.as_f64().unwrap())
        .product::<f64>();
    assert_close(actual["final_damage"].as_f64().unwrap(), expected);
    assert_eq!(actual["damage_calc_mode"], json!("damage"));
}

#[test]
fn ss_conditional_effects_cover_11_formula_slots() {
    let input = json!({
        "base_attack": 100.0,
        "selected_hero": { "id": "venato" },
        "stats": { "critRate": 1.5, "critDamage": 1.0 },
        "ss_equipment": [
            { "id": "twinLance", "slot": "weapon", "astral_forge_eaf_level": 5, "astral_forge_vaf_level": 4, "chaos_fusion_level": 10, "xeno_transmute_level": 10 },
            { "id": "eternalSuit", "slot": "armor", "astral_forge_eaf_level": 5, "astral_forge_vaf_level": 0, "chaos_fusion_level": 0 },
            { "id": "voidwakerEmblem", "slot": "necklace", "astral_forge_eaf_level": 5, "astral_forge_vaf_level": 0, "chaos_fusion_level": 10 },
            { "id": "twistingBelt", "slot": "belt", "astral_forge_eaf_level": 5, "astral_forge_vaf_level": 0, "chaos_fusion_level": 0 },
            { "id": "moonscarBracer", "slot": "gloves", "astral_forge_eaf_level": 5, "astral_forge_vaf_level": 4, "chaos_fusion_level": 10 },
            { "id": "glacialWarboots", "slot": "boots", "astral_forge_eaf_level": 5, "astral_forge_vaf_level": 0, "chaos_fusion_level": 10 }
        ],
        "collectibleSets": {
            "summonTheDivineDragon": { "totalStars": 25, "goldStars": 8 },
            "conductExperiments": { "minStars": 3 },
            "eruditeHeirloom": { "enabled": true },
            "summonTheStandIn": { "enabled": true },
            "luckyCharm": { "stars": 3 }
        },
        "customSets": { "ssSlotCount": 54 },
        "mode": "ee",
        "weapons": [],
        "tech_parts": [],
        "pets": [],
        "collectibles": [],
        "lme_turf": { "nodes": [] },
        "conditional_state": {},
        "xeno_transmute_modifier": null
    });

    let actual = tttg_forge_wasm::v3_damage_value(&input);
    let effects = actual["ss_conditional_effects"].as_array().unwrap();
    assert_eq!(effects.len(), 11);
    assert!(effects.contains(&json!("twinLanceCustomSetChain")));
    assert!(effects.contains(&json!("necklaceArmorCombinedShield")));
    assert!(actual["derived_stats"]["skillDamage"].as_f64().unwrap() > 0.0);
    assert_eq!(actual["ss_conditional_effect_formula_count"], json!(11));
}

#[test]
fn worm_cdr_multiplies_evotree_energy_cube_worm_and_rex() {
    let input = json!({
        "base_attack": 100.0,
        "selected_hero": { "id": "worm", "stars": 12 },
        "teamwork": [],
        "evotree": { "overreaction": true },
        "activeSkills": { "energyCube": true, "evolvePassives": true },
        "pets": [
            { "id": "rex", "slot": "deployed", "stars": 6, "battleLustRarity": "Super", "garyRarity": "Excellent" }
        ],
        "ss_equipment": [],
        "weapons": [],
        "tech_parts": [],
        "collectibles": [],
        "lme_turf": { "nodes": [] },
        "mode": "damage",
        "conditional_state": {},
        "xeno_transmute_modifier": null
    });

    let actual = tttg_forge_wasm::v3_damage_value(&input);
    let expected_a = 0.95 * 0.52 * 0.8 * 0.94 * 0.98 * 0.99;
    let expected = 1.0 / expected_a;
    assert_close(actual["worm_cooldown_reduction"].as_f64().unwrap(), expected);
    assert_eq!(actual["worm_cdr_stage_count"], json!(6));
}
