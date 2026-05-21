use serde_json::json;

#[test]
fn get_tech_parts_full_returns_sio_gt_catalog() {
    let actual = tttg_forge_wasm::tech_parts::get_tech_parts_full_value();

    assert_eq!(actual["twinbornParts"].as_array().unwrap().len(), 10);
    assert_eq!(actual["activeSkills"].as_array().unwrap().len(), 18);
    assert_eq!(actual["modeVariants"].as_array().unwrap().len(), 12);
    assert_eq!(actual["rarities"].as_array().unwrap().len(), 10);
    assert_eq!(actual["techModifierMatrix"].as_array().unwrap().len(), 37);
}

#[test]
fn compute_tech_modifier_value_uses_core_matrix() {
    let actual = tttg_forge_wasm::tech_parts::compute_tech_modifier_value(
        &json!("Exo Bracer"),
        &json!("Drill"),
        &json!(5.0),
    );

    assert!((actual.as_f64().unwrap() - (1.0 + 0.3636 * 5.0)).abs() < 0.000001);
}

#[test]
fn validate_tech_part_config_rejects_bad_twinborn_level() {
    let actual = tttg_forge_wasm::tech_parts::validate_tech_part_config_value(&json!({
        "id": "energyGuidanceSystem",
        "twinbornLevel": 8,
        "resonance": 3000,
        "overload": 0
    }));

    assert_eq!(actual["valid"], json!(false));
}

#[test]
fn tech_optimizer_run_value_reports_cap_fallback_metrics() {
    let actual = tttg_forge_wasm::tech_parts::tech_optimizer_run_value(
        &json!({"tech_configs": {}}),
        &json!({"topK": 5, "maxExactNodes": 10, "beamWidth": 16}),
    );

    assert_eq!(actual["algorithm"], json!("tech_optimizer"));
    assert_eq!(actual["exact"], json!(false));
    assert_eq!(actual["reason"], json!("search_space_cap"));
    assert_eq!(
        actual["quality"]["guarantee"],
        json!("beam_bounded_provisional")
    );
    assert!(actual["quality"]["score_gap_percent"].as_f64().unwrap() >= 0.0);
    assert_eq!(
        actual["scope"]["problem_scope"],
        json!("tech_joint_provisional_search")
    );
    assert_eq!(actual["scope"]["full_sio_equivalent"], json!(false));
    assert!(
        actual["scope"]["estimated_full_joint_nodes"]
            .as_f64()
            .unwrap()
            > 1.0e20
    );
    assert!(!actual["builds"].as_array().unwrap().is_empty());
    assert!(
        actual["metrics"]["first_answer_ms"].as_f64().unwrap() < 3000.0,
        "{actual:?}"
    );
}

#[test]
fn tech_optimizer_run_value_accepts_sio_techs_optimizer_schema() {
    let actual = tttg_forge_wasm::tech_parts::tech_optimizer_run_value(
        &json!({"tech_configs": {}}),
        &json!({
            "topK": 5,
            "maxExactNodes": 10,
            "beamWidth": 16,
            "techsOptimizer": {
                "strategy": "precise+",
                "speedMode": "full",
                "fodder": "smart",
                "skills": 6,
                "chips": 100,
                "overloadable": true,
                "overload": "full",
                "inputs": {"legend": 2, "epic": 8},
                "modes": ["droneMode", "rocketMode"],
                "limit": "advanced",
                "modeEntries": {
                    "droneMode": {
                        "minResonance": 0,
                        "maxResonance": 3000,
                        "minOverload": 0,
                        "maxOverload": 2
                    }
                },
                "skillsMap": {
                    "Drone": "forced",
                    "Molotov": "enabled",
                    "Laser": "disabled"
                }
            }
        }),
    );

    assert_eq!(
        actual["scope"]["optimizer_schema"],
        json!("sio_techs_optimizer")
    );
    assert_eq!(actual["scope"]["full_sio_equivalent"], json!(false));
    assert!(actual["scope"]["schema_dimensions"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item == "rarity_inputs"));
    assert!(
        actual["scope"]["estimated_schema_multiplier"]
            .as_f64()
            .unwrap()
            > 1.0
    );
    assert_eq!(
        actual["scope"]["estimated_schema_multiplier"],
        json!(186648.0)
    );
    assert!(
        actual["scope"]["estimated_full_joint_nodes"]
            .as_f64()
            .unwrap()
            > 1.0e22
    );
}

#[test]
fn validate_sio_tech_inventory_value_exposes_contract_errors() {
    let actual = tttg_forge_wasm::tech_parts::validate_sio_tech_inventory_value(&json!({
        "rarityCounts": {"Mythic": 1, "Legend": 0},
        "chips": 1500,
        "skillSlots": 9,
        "overloadable": false,
        "maxOverload": 3,
        "modes": ["unknownMode"],
        "forcedSkills": ["Drone"],
        "disabledSkills": ["Drone Mode"],
        "speedMode": "instant",
        "limit": "advanced",
        "candidatePreselectTopK": 0
    }));

    assert_eq!(actual["valid"], json!(false));
    assert!(actual["errors"]
        .as_array()
        .unwrap()
        .contains(&json!("rarity_counts.Mythic.unknown")));
    assert!(actual["errors"]
        .as_array()
        .unwrap()
        .contains(&json!("chips.gt_999")));
    assert!(actual["warnings"]
        .as_array()
        .unwrap()
        .contains(&json!("skill.Drone.conflicts_forced_and_disabled")));
}

#[test]
fn tech_optimizer_run_value_accepts_inventory_contract_and_preserves_full_sio_scorer() {
    let actual = tttg_forge_wasm::tech_parts::tech_optimizer_run_value(
        &json!({
            "tech_configs": {},
            "sioLm": {
                "baseStats": tttg_forge_optimizer::tech::captured_sio_lm_default_base_stats(),
                "attackMeta": tttg_forge_optimizer::tech::captured_sio_lm_default_attack_meta(),
                "enabledSkills": tttg_forge_optimizer::tech::captured_sio_lm_default_enabled_skills()
            }
        }),
        &json!({
            "topK": 3,
            "maxExactNodes": 10,
            "sioTechInventory": {
                "rarityCounts": {"Legend": 1, "Epic": 6},
                "chips": 40,
                "skillSlots": 4,
                "overloadable": true,
                "maxOverload": 4,
                "modes": ["droneMode", "drillShotMode", "soccerMode", "boomerangMode", "rocketMode"],
                "forcedSkills": ["Drone"],
                "preferredSkills": ["Drill Shot"],
                "disabledSkills": [],
                "speedMode": "normal",
                "limit": "basic",
                "candidatePreselectTopK": 16
            }
        }),
    );

    assert_eq!(
        actual["scope"]["optimizer_schema"],
        json!("sio_techs_optimizer")
    );
    assert_eq!(
        actual["scope"]["scoring_model"],
        json!("sio_full_lm_equivalence")
    );
    assert_eq!(actual["scope"]["full_sio_equivalent"], json!(true));
    assert_eq!(actual["inventoryValidation"]["valid"], json!(true));
    assert_eq!(
        actual["builds"][0]["config"]["sioCandidate"]["preselectTopK"],
        json!(16)
    );
    assert!(!actual["builds"][0]["config"]["loadout"]
        .as_array()
        .unwrap()
        .is_empty());
}

#[test]
fn tech_optimizer_run_value_expands_sio_schema_into_active_domain() {
    let actual = tttg_forge_wasm::tech_parts::tech_optimizer_run_value(
        &json!({
            "damage": {"base_attack": 1000.0, "skill_damage_percent": 10.0},
            "mode": "damage",
            "selected_hero": {"id": "common"},
            "conditional_state": {},
            "xeno_transmute_modifier": null,
            "ss_equipment": [],
            "tech_configs": {
                "energyGuidanceSystem": {
                    "resonance": 3000,
                    "mode": "laserMode",
                    "equipped": true,
                    "twinbornLevel": 3
                }
            }
        }),
        &json!({
            "topK": 5,
            "maxExactNodes": 10,
            "beamWidth": 16,
            "techsOptimizer": {
                "strategy": "precise+",
                "speedMode": "full",
                "fodder": "smart",
                "skills": 6,
                "chips": 100,
                "overloadable": true,
                "overload": "full",
                "inputs": {"legend": 2, "epic": 8},
                "modes": ["laserMode", "rocketMode"],
                "limit": "advanced",
                "modeEntries": {
                    "rocketMode": {
                        "minResonance": 1000,
                        "maxResonance": 3000,
                        "minOverload": 0,
                        "maxOverload": 2
                    }
                },
                "skillsMap": {
                    "Laser": "disabled",
                    "Rocket": "preferred"
                }
            }
        }),
    );

    let loadout = actual["builds"][0]["config"]["loadout"].as_array().unwrap();

    assert_eq!(
        actual["scope"]["scoring_model"],
        json!("sio_v3_damage_formula_adapter")
    );
    assert_eq!(
        actual["quality"]["guarantee"],
        json!("beam_bounded_formula")
    );
    assert!(actual["scope"]["covered_dimensions"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item == "mode_entries_constraints"));
    assert!(
        loadout
            .iter()
            .all(|choice| choice["mode"].as_str() != Some("laserMode")),
        "{loadout:?}"
    );
    assert!(
        loadout
            .iter()
            .any(|choice| choice["mode"].as_str() == Some("rocketMode")
                && choice["overload"].as_u64().unwrap_or(0) == 2),
        "{loadout:?}"
    );
}

#[test]
fn tech_optimizer_matches_sio_shaped_golden_fixture() {
    let fixture: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/sio_techs_optimizer_golden.json")).unwrap();
    let actual = tttg_forge_wasm::tech_parts::tech_optimizer_run_value(
        &fixture["playerState"],
        &fixture["options"],
    );
    let expected = &fixture["expected"];

    assert_eq!(
        actual["scope"]["optimizer_schema"],
        expected["optimizerSchema"]
    );
    assert_eq!(actual["scope"]["scoring_model"], expected["scoringModel"]);
    assert_eq!(actual["quality"]["guarantee"], expected["guarantee"]);
    assert_eq!(actual["builds"][0]["label"], expected["topLabel"]);
    assert!(
        (actual["builds"][0]["damageFactor"].as_f64().unwrap()
            - expected["topDamageFactor"].as_f64().unwrap())
        .abs()
            < 0.000001,
        "{actual:?}"
    );
}
