use serde_json::{json, Value};
use tttg_forge_optimizer::tech::{
    reconstruct_sio_lm_inputs, sio_lm_context_from_player_state_with_options, SioLmContextOptions,
};
use tttg_forge_optimizer::tech_search::{
    run_tech_optimizer, SioModeEntry, SioSkillPreference, SioTechInventoryInput,
    SioTechsOptimizerProfile, TechOptimizerOptions,
};

const SIO_LM_NON_SCORING_MUTABLE_TRACE_STATS: &[&str] = &["critRateFlux"];

fn is_sio_lm_non_scoring_mutable_trace_stat(key: &str) -> bool {
    SIO_LM_NON_SCORING_MUTABLE_TRACE_STATS.contains(&key)
}

fn sio_lm_stats_equivalence_failures(path: &str, actual: &Value, expected: &Value) -> Vec<String> {
    let actual = actual.as_object().expect("actual stats object");
    let expected = expected.as_object().expect("expected stats object");
    let mut failures = Vec::new();
    for (key, expected_value) in expected {
        if is_sio_lm_non_scoring_mutable_trace_stat(key) {
            continue;
        }
        let actual_number = actual.get(key).and_then(Value::as_f64).unwrap_or(0.0);
        let expected_number = expected_value.as_f64().unwrap_or(0.0);
        let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
        if (actual_number - expected_number).abs() > tolerance {
            failures.push(format!(
                "{path}.{key}: actual {actual_number} expected {expected_number}"
            ));
        }
    }
    for (key, actual_value) in actual {
        if expected.contains_key(key) || is_sio_lm_non_scoring_mutable_trace_stat(key) {
            continue;
        }
        let actual_number = actual_value.as_f64().unwrap_or(0.0);
        if actual_number.abs() > 1e-9 {
            failures.push(format!("{path}.{key}: unexpected actual {actual_number}"));
        }
    }
    failures
}

fn assert_sio_lm_stats_equivalent(path: &str, actual: &Value, expected: &Value) {
    let failures = sio_lm_stats_equivalence_failures(path, actual, expected);
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

fn trace_summary_has_current_replay(trace: &Value) -> bool {
    let case_count = trace["summary"]["cases"]
        .as_u64()
        .unwrap_or_else(|| trace["cases"].as_array().map(Vec::len).unwrap_or(0) as u64);
    let replayed = trace["summary"]["replayedPassed"]
        .as_u64()
        .or_else(|| trace["replayedPassed"].as_u64())
        .unwrap_or(case_count);
    case_count == 0 || replayed == case_count
}

fn skip_stale_trace_summary(trace: &Value, label: &str) -> bool {
    if trace_summary_has_current_replay(trace) {
        return false;
    }
    let case_count = trace["summary"]["cases"]
        .as_u64()
        .unwrap_or_else(|| trace["cases"].as_array().map(Vec::len).unwrap_or(0) as u64);
    let replayed = trace["summary"]["replayedPassed"]
        .as_u64()
        .or_else(|| trace["replayedPassed"].as_u64())
        .unwrap_or(0);
    eprintln!(
        "skipping {label}; trace replayedPassed={replayed}/{case_count}, fixture source is stale against current worker replay"
    );
    true
}

fn reconstruct_td11_compact_fixture_with_options(
    fixture_dir: &str,
    options: SioLmContextOptions,
    skip_label: &str,
) -> Option<(Value, Value)> {
    let repo_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join(format!(
        "frontend/artifacts/td11/{fixture_dir}/lm_trace_summary.json"
    ));
    let worker_path = repo_root.join(format!(
        "frontend/artifacts/td11/{fixture_dir}/worker_decoded_summary.json"
    ));
    if !trace_path.exists() || !worker_path.exists() {
        eprintln!(
            "skipping {skip_label}; artifacts missing: {} {}",
            trace_path.display(),
            worker_path.display()
        );
        return None;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    if skip_stale_trace_summary(&trace, skip_label) {
        return None;
    }
    let case = &trace["cases"][0];
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");

    let context = sio_lm_context_from_player_state_with_options(
        &json!({
            "sioLm": {
                "compactConfig": compact
            }
        }),
        &options,
    )
    .expect("compact-only sioLm context");
    let enabled_skills = case["enabledSkills"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(Value::as_str)
        .map(str::to_string)
        .collect::<Vec<_>>();
    Some((
        reconstruct_sio_lm_inputs(
            &context.base_stats,
            &case["techs"],
            &enabled_skills,
            &context.transform,
        ),
        case["nonZeroStats"].clone(),
    ))
}

fn reconstruct_td11_calibration_off_fixture(
    fixture_dir: &str,
    skip_label: &str,
) -> Option<(Value, Value)> {
    reconstruct_td11_compact_fixture_with_options(
        fixture_dir,
        SioLmContextOptions {
            disable_equipment_calibration_for_probe: true,
        },
        skip_label,
    )
}

fn reconstructed_td11_calibration_off_stats(fixture_dir: &str, skip_label: &str) -> Option<Value> {
    reconstruct_td11_calibration_off_fixture(fixture_dir, skip_label)
        .map(|(reconstructed, _live_stats)| reconstructed["stats"].clone())
}

fn reconstructed_td11_calibration_off_stat(
    fixture_dir: &str,
    key: &str,
    skip_label: &str,
) -> Option<f64> {
    reconstructed_td11_calibration_off_stats(fixture_dir, skip_label)?
        .get(key)?
        .as_f64()
}

#[test]
fn sio_lm_reconstructs_antimatter_rocket_row_drill_alias_ce_damage() {
    use tttg_forge_optimizer::tech::SioLmStatTransform;

    let reconstructed = reconstruct_sio_lm_inputs(
        &json!({}),
        &json!({
            "Antimatter Maintainer": {
                "deployed": true,
                "mode": "Rocket Mode",
                "resonance": 0,
                "overload": 0,
                "rarity": "Legend"
            }
        }),
        &["Drill".to_string()],
        &SioLmStatTransform::empty(),
    );

    assert!(
        reconstructed["ceDamage"]["Drill"].as_f64().unwrap_or(0.0) > 0.0,
        "Drill fallback should contribute CE damage for Antimatter Maintainer rocket rows"
    );
}

#[test]
fn sio_lm_stats_equivalence_ignores_only_registered_non_scoring_mutable_trace_artifacts() {
    let actual = json!({
        "critRate": 213.6,
        "critDamage": 1102.48,
        "critRateFlux": 10.0
    });
    let expected = json!({
        "critRate": 213.6,
        "critDamage": 1102.48,
        "critRateFlux": 4_064_560.0
    });
    assert_sio_lm_stats_equivalent("policy", &actual, &expected);

    let scoring_mismatch = json!({
        "critRate": 212.6,
        "critDamage": 1102.48,
        "critRateFlux": 10.0
    });
    assert!(
        !sio_lm_stats_equivalence_failures("policy", &scoring_mismatch, &expected).is_empty(),
        "scoring stats must not be hidden by the mutable trace artifact policy"
    );
}

#[test]
fn tech_optimizer_returns_fast_first_answer_for_normal_case() {
    let player_state = json!({
        "tech_configs": {
            "energyGuidanceSystem": {"resonance": 3000, "mode": "droneMode", "equipped": true, "twinbornLevel": 3},
            "quantumNanobot": {"resonance": 3000, "mode": "durianMode", "equipped": true, "twinbornLevel": 3}
        }
    });
    let options = TechOptimizerOptions {
        top_k: 5,
        first_answer_budget_ms: 3000,
        total_budget_ms: 60_000,
        beam_width: 32,
        max_exact_nodes: 100_000,
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();

    assert!(!result.builds.is_empty());
    assert!(result.exact);
    assert_eq!(result.quality.guarantee, "exact_joint_provisional");
    assert_eq!(result.quality.score_gap_percent, 0.0);
    assert_eq!(result.scope.problem_scope, "tech_joint_provisional_search");
    assert!(!result.scope.full_sio_equivalent);
    assert_eq!(result.scope.enumerated_candidate_nodes, 24336);
    assert_eq!(result.metrics.visited_nodes, 24336);
    assert!(
        result.scope.estimated_full_joint_nodes > 1.0e4,
        "{:?}",
        result.scope
    );
    assert!(
        result
            .scope
            .limitations
            .iter()
            .any(|limitation| limitation.contains("joint")),
        "{:?}",
        result.scope
    );
    assert!(
        result.builds[0].label.contains('+'),
        "{:?}",
        result.builds[0]
    );
    assert!(
        result.builds[0].config.get("loadout").is_some(),
        "{:?}",
        result.builds[0]
    );
    assert!(
        result
            .builds
            .windows(2)
            .all(|pair| pair[0].score >= pair[1].score),
        "{:?}",
        result.builds
    );
    assert!(
        result.metrics.first_answer_ms < 3000.0,
        "{:?}",
        result.metrics
    );
    assert!(result.metrics.latency_ms < 60_000.0, "{:?}", result.metrics);
    assert!(result.metrics.visited_nodes > 0);
}

#[test]
fn tech_optimizer_labels_huge_case_as_beam_when_exact_cap_is_exceeded() {
    let player_state = json!({"tech_configs": {}});
    let options = TechOptimizerOptions {
        top_k: 10,
        first_answer_budget_ms: 3000,
        total_budget_ms: 180_000,
        beam_width: 16,
        max_exact_nodes: 10,
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();

    assert!(!result.exact);
    assert_eq!(result.reason.as_deref(), Some("search_space_cap"));
    assert_eq!(result.quality.guarantee, "beam_bounded_provisional");
    assert_eq!(result.scope.problem_scope, "tech_joint_provisional_search");
    assert!(!result.scope.full_sio_equivalent);
    assert!(
        result.scope.estimated_full_joint_nodes > 1.0e20,
        "{:?}",
        result.scope
    );
    assert!(
        result.quality.score_gap_percent >= 0.0,
        "{:?}",
        result.quality
    );
    assert!(
        result.metrics.first_answer_ms < 3000.0,
        "{:?}",
        result.metrics
    );
}

#[test]
fn tech_optimizer_uses_sio_damage_formula_adapter_when_damage_state_is_present() {
    let player_state = json!({
        "damage": {
            "base_attack": 1000.0,
            "crit_rate_percent": 50.0,
            "crit_damage_percent": 200.0,
            "damage_percent": 25.0,
            "skill_damage_percent": 40.0,
            "boss_damage_percent": 10.0
        },
        "mode": "damage",
        "selected_hero": {"id": "king"},
        "conditional_state": {},
        "xeno_transmute_modifier": null,
        "ss_equipment": [],
        "tech_configs": {
            "energyGuidanceSystem": {"resonance": 3000, "mode": "droneMode", "equipped": true, "twinbornLevel": 3},
            "quantumNanobot": {"resonance": 3000, "mode": "durianMode", "equipped": true, "twinbornLevel": 3}
        }
    });

    let result = run_tech_optimizer(
        &player_state,
        &TechOptimizerOptions {
            top_k: 3,
            max_exact_nodes: 100_000,
            ..TechOptimizerOptions::default()
        },
    )
    .unwrap();

    assert_eq!(result.scope.scoring_model, "sio_v3_damage_formula_adapter");
    assert!(
        result
            .scope
            .covered_dimensions
            .iter()
            .any(|dimension| dimension == "sio_damage_formula"),
        "{:?}",
        result.scope
    );
    assert!(
        result.builds[0].damage_factor > 1.0,
        "{:?}",
        result.builds[0]
    );
    assert_eq!(
        result.builds[0].config["scoreModel"],
        json!("sio_v3_damage_formula_adapter")
    );
    assert_eq!(
        result.builds[0].config["damageFormula"]["dps_formula_multiplier_stages_count"],
        json!(31)
    );
}

#[test]
fn tech_optimizer_applies_sio_domain_modes_overload_and_skill_preferences() {
    let player_state = json!({
        "damage": {"base_attack": 1000.0, "skill_damage_percent": 10.0},
        "mode": "damage",
        "selected_hero": {"id": "common"},
        "conditional_state": {},
        "xeno_transmute_modifier": null,
        "ss_equipment": [],
        "tech_configs": {
            "energyGuidanceSystem": {"resonance": 3000, "mode": "laserMode", "equipped": true, "twinbornLevel": 3}
        }
    });
    let options = TechOptimizerOptions {
        top_k: 5,
        max_exact_nodes: 10,
        beam_width: 16,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            speed_mode: "full".to_string(),
            overloadable: true,
            overload: "full".to_string(),
            modes: vec!["laserMode".to_string(), "rocketMode".to_string()],
            mode_entries: vec![SioModeEntry {
                mode: "rocketMode".to_string(),
                min_resonance: 1000,
                max_resonance: 3000,
                min_overload: 0,
                max_overload: 2,
            }],
            skills_map: vec![
                SioSkillPreference {
                    skill: "Laser".to_string(),
                    status: "disabled".to_string(),
                },
                SioSkillPreference {
                    skill: "Rocket".to_string(),
                    status: "preferred".to_string(),
                },
            ],
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();
    let loadout = result.builds[0].config["loadout"].as_array().unwrap();

    assert_eq!(result.scope.optimizer_schema, "sio_techs_optimizer");
    assert_eq!(result.quality.guarantee, "beam_bounded_formula");
    assert!(
        result
            .scope
            .covered_dimensions
            .iter()
            .any(|dimension| dimension == "skills_map_preferences"),
        "{:?}",
        result.scope
    );
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
fn tech_optimizer_accepts_sio_mode_named_skill_preferences() {
    let player_state = json!({
        "tech_configs": {
            "energyGuidanceSystem": {
                "resonance": 3000,
                "mode": "droneMode",
                "equipped": true,
                "twinbornLevel": 0
            }
        }
    });
    let options = TechOptimizerOptions {
        top_k: 1,
        max_exact_nodes: 10_000,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            modes: vec!["droneMode".to_string(), "rocketMode".to_string()],
            skills_map: vec![SioSkillPreference {
                skill: "Drone Mode".to_string(),
                status: "disabled".to_string(),
            }],
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();
    let loadout = result.builds[0].config["loadout"].as_array().unwrap();

    assert!(
        loadout
            .iter()
            .all(|choice| choice["mode"].as_str() != Some("droneMode")),
        "{loadout:?}"
    );
}

#[test]
fn tech_optimizer_treats_sio_forced_skill_preferences_as_preferred() {
    let player_state = json!({
        "tech_configs": {
            "energyGuidanceSystem": {
                "resonance": 0,
                "mode": "droneMode",
                "equipped": false,
                "twinbornLevel": 0
            }
        }
    });
    let options = TechOptimizerOptions {
        top_k: 1,
        max_exact_nodes: 10_000,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            modes: vec!["droneMode".to_string(), "rocketMode".to_string()],
            skills_map: vec![SioSkillPreference {
                skill: "Rocket Mode".to_string(),
                status: "forced".to_string(),
            }],
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();
    let loadout = result.builds[0].config["loadout"].as_array().unwrap();

    assert_eq!(
        loadout[0]["mode"].as_str(),
        Some("rocketMode"),
        "{loadout:?}"
    );
}

#[test]
fn tech_optimizer_uses_sio_candidate_generation_for_optimize_strategy() {
    let player_state = json!({
        "tech_configs": {
            "energyGuidanceSystem": {"resonance": 3000, "mode": "droneMode", "equipped": true, "twinbornLevel": 0},
            "antimatterMaintainer": {"resonance": 3000, "mode": "drillShotMode", "equipped": true, "twinbornLevel": 0},
            "quantumNanobot": {"resonance": 3000, "mode": "durianMode", "equipped": true, "twinbornLevel": 0}
        }
    });
    let options = TechOptimizerOptions {
        top_k: 3,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "normal".to_string(),
            skills: 4,
            chips: 40,
            rarity_inputs: vec![
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Legend".to_string(),
                    count: 1,
                },
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Epic".to_string(),
                    count: 6,
                },
            ],
            modes: vec![
                "molotovMode".to_string(),
                "durianMode".to_string(),
                "soccerMode".to_string(),
                "droneMode".to_string(),
                "forcefieldMode".to_string(),
                "drillShotMode".to_string(),
                "rocketMode".to_string(),
                "lightningMode".to_string(),
                "boomerangMode".to_string(),
                "guardianMode".to_string(),
                "laserMode".to_string(),
                "brickMode".to_string(),
            ],
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();
    let loadout = result.builds[0].config["loadout"].as_array().unwrap();

    assert_eq!(result.scope.scoring_model, "sio_captured_lm_trace_bridge");
    assert_eq!(
        result.scope.problem_scope,
        "sio_candidate_generation_search"
    );
    assert_eq!(result.quality.guarantee, "sio_captured_lm_trace_bridge");
    let preselect_top_k = result.builds[0].config["sioCandidate"]["preselectTopK"]
        .as_u64()
        .expect("SIO LM scorer should expose preselect size");
    assert_eq!(preselect_top_k, options.top_k as u64);
    assert!(result
        .scope
        .covered_dimensions
        .contains(&"sio_lm_preselect_rescoring".to_string()));
    assert!(loadout.len() >= 4, "{loadout:?}");
    assert_eq!(loadout[0]["id"], json!("energyGuidanceSystem"));
    assert_eq!(loadout[0]["mode"], json!("droneMode"));
    assert!(
        loadout
            .iter()
            .any(|row| row["mode"] == json!("drillShotMode")),
        "{loadout:?}"
    );
    assert!(
        loadout.iter().any(|row| row["mode"] == json!("soccerMode")),
        "{loadout:?}"
    );
}

#[test]
fn tech_optimizer_can_widen_sio_lm_preselect_when_context_requests_it() {
    let player_state = json!({
        "tech_configs": {
            "energyGuidanceSystem": {"resonance": 3000, "mode": "droneMode", "equipped": true, "twinbornLevel": 0},
            "antimatterMaintainer": {"resonance": 3000, "mode": "drillShotMode", "equipped": true, "twinbornLevel": 0},
            "quantumNanobot": {"resonance": 3000, "mode": "durianMode", "equipped": true, "twinbornLevel": 0}
        },
        "sioLm": {
            "baseStats": tttg_forge_optimizer::tech::captured_sio_lm_default_base_stats(),
            "attackMeta": tttg_forge_optimizer::tech::captured_sio_lm_default_attack_meta(),
            "enabledSkills": tttg_forge_optimizer::tech::captured_sio_lm_default_enabled_skills(),
            "candidatePreselectTopK": 32
        }
    });
    let options = TechOptimizerOptions {
        top_k: 3,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "normal".to_string(),
            skills: 4,
            chips: 40,
            rarity_inputs: vec![
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Legend".to_string(),
                    count: 1,
                },
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Epic".to_string(),
                    count: 6,
                },
            ],
            modes: vec![
                "molotovMode".to_string(),
                "durianMode".to_string(),
                "soccerMode".to_string(),
                "droneMode".to_string(),
                "forcefieldMode".to_string(),
                "drillShotMode".to_string(),
                "rocketMode".to_string(),
                "lightningMode".to_string(),
                "boomerangMode".to_string(),
                "guardianMode".to_string(),
                "laserMode".to_string(),
                "brickMode".to_string(),
            ],
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();
    let preselect_top_k = result.builds[0].config["sioCandidate"]["preselectTopK"]
        .as_u64()
        .expect("explicit SIO LM preselect should be surfaced");

    assert_eq!(result.scope.scoring_model, "sio_full_lm_equivalence");
    assert!(result.scope.full_sio_equivalent);
    assert_eq!(preselect_top_k, 32);
    assert!(preselect_top_k > options.top_k as u64);
    assert!(result
        .scope
        .limitations
        .iter()
        .any(|item| item.contains("widened Rust preselect")));
}

#[test]
fn sio_inventory_input_contract_validates_and_translates_to_optimizer_profile() {
    let inventory = SioTechInventoryInput {
        rarity_counts: vec![("Legend".to_string(), 2), ("Epic".to_string(), 8)],
        chips: 40,
        skill_slots: 4,
        overloadable: true,
        max_overload: 6,
        modes: vec!["droneMode".to_string(), "rocketMode".to_string()],
        forced_skills: vec!["Drone".to_string()],
        disabled_skills: vec!["Laser Mode".to_string()],
        preferred_skills: vec!["Rocket".to_string()],
        speed_mode: "normal".to_string(),
        limit: "advanced".to_string(),
        candidate_preselect_top_k: Some(32),
    };

    let validation = inventory.validate();
    assert_eq!(validation.valid, true, "{validation:?}");
    assert_eq!(validation.errors, Vec::<String>::new());
    assert_eq!(validation.warnings, Vec::<String>::new());

    let profile = inventory.to_optimizer_profile().unwrap();

    assert!(profile.schema_active);
    assert_eq!(profile.strategy, "optimize");
    assert_eq!(profile.speed_mode, "normal");
    assert_eq!(profile.limit, "advanced");
    assert_eq!(profile.chips, 40);
    assert_eq!(profile.skills, 4);
    assert_eq!(profile.overloadable, true);
    assert_eq!(profile.overload, "full");
    assert_eq!(profile.rarity_inputs.len(), 2);
    assert_eq!(profile.input_rarity_total, 10);
    assert_eq!(profile.modes, vec!["droneMode", "rocketMode"]);
    assert_eq!(
        profile
            .mode_entries
            .iter()
            .map(|entry| (entry.mode.as_str(), entry.min_overload, entry.max_overload))
            .collect::<Vec<_>>(),
        vec![("droneMode", 0, 6), ("rocketMode", 0, 6)]
    );
    assert_eq!(
        profile.skills_map,
        vec![
            SioSkillPreference {
                skill: "Drone".to_string(),
                status: "forced".to_string()
            },
            SioSkillPreference {
                skill: "Rocket".to_string(),
                status: "preferred".to_string()
            },
            SioSkillPreference {
                skill: "Laser Mode".to_string(),
                status: "disabled".to_string()
            }
        ]
    );
    assert_eq!(
        profile
            .inventory_contract
            .as_ref()
            .and_then(|contract| contract.candidate_preselect_top_k),
        Some(32)
    );
}

#[test]
fn sio_inventory_input_contract_reports_invalid_fields_without_silent_coercion() {
    let inventory = SioTechInventoryInput {
        rarity_counts: vec![("Mythic".to_string(), 1), ("Legend".to_string(), 0)],
        chips: 1_500,
        skill_slots: 9,
        overloadable: false,
        max_overload: 3,
        modes: vec!["unknownMode".to_string()],
        forced_skills: vec![
            "Drone".to_string(),
            "Rocket".to_string(),
            "Laser".to_string(),
        ],
        disabled_skills: vec!["Drone Mode".to_string()],
        preferred_skills: vec![],
        speed_mode: "instant".to_string(),
        limit: "advanced".to_string(),
        candidate_preselect_top_k: Some(0),
    };

    let validation = inventory.validate();

    assert!(!validation.valid, "{validation:?}");
    assert!(validation
        .errors
        .contains(&"rarity_counts.Mythic.unknown".to_string()));
    assert!(validation
        .errors
        .contains(&"rarity_counts.Legend.count_zero".to_string()));
    assert!(validation.errors.contains(&"chips.gt_999".to_string()));
    assert!(validation.errors.contains(&"skill_slots.gt_6".to_string()));
    assert!(validation
        .errors
        .contains(&"modes.unknownMode.unknown".to_string()));
    assert!(validation
        .errors
        .contains(&"overload.max_requires_overloadable".to_string()));
    assert!(validation
        .errors
        .contains(&"speed_mode.instant.unknown".to_string()));
    assert!(validation
        .errors
        .contains(&"candidate_preselect_top_k.lt_1".to_string()));
    assert!(
        validation
            .warnings
            .contains(&"skill.Drone.conflicts_forced_and_disabled".to_string()),
        "{validation:?}"
    );
    assert!(inventory.to_optimizer_profile().is_err());
}

#[test]
fn tech_optimizer_inventory_contract_keeps_full_sio_lm_equivalence_scorer() {
    let inventory = SioTechInventoryInput {
        rarity_counts: vec![("Legend".to_string(), 1), ("Epic".to_string(), 6)],
        chips: 40,
        skill_slots: 4,
        overloadable: true,
        max_overload: 4,
        modes: vec![
            "droneMode".to_string(),
            "drillShotMode".to_string(),
            "soccerMode".to_string(),
            "boomerangMode".to_string(),
            "rocketMode".to_string(),
        ],
        forced_skills: vec!["Drone".to_string()],
        preferred_skills: vec!["Drill Shot".to_string()],
        disabled_skills: vec![],
        speed_mode: "normal".to_string(),
        limit: "basic".to_string(),
        candidate_preselect_top_k: Some(16),
    };
    let profile = inventory.to_optimizer_profile().unwrap();
    let player_state = json!({
        "tech_configs": {},
        "sioLm": {
            "baseStats": tttg_forge_optimizer::tech::captured_sio_lm_default_base_stats(),
            "attackMeta": tttg_forge_optimizer::tech::captured_sio_lm_default_attack_meta(),
            "enabledSkills": tttg_forge_optimizer::tech::captured_sio_lm_default_enabled_skills()
        }
    });
    let result = run_tech_optimizer(
        &player_state,
        &TechOptimizerOptions {
            top_k: 3,
            max_exact_nodes: 10,
            sio_profile: profile,
            ..TechOptimizerOptions::default()
        },
    )
    .unwrap();

    assert_eq!(result.scope.scoring_model, "sio_full_lm_equivalence");
    assert!(result.scope.full_sio_equivalent);
    assert_eq!(
        result.builds[0].config["sioCandidate"]["preselectTopK"],
        json!(16)
    );
    assert!(
        result.builds[0].config["loadout"].as_array().unwrap().len() >= 4,
        "{:?}",
        result.builds[0]
    );
}

#[test]
fn tech_optimizer_uses_boomerang_for_low_resonance_phase_driver_like_live_fixture() {
    let player_state = json!({"tech_configs": {}});
    let options = TechOptimizerOptions {
        top_k: 1,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "normal".to_string(),
            skills: 4,
            chips: 40,
            rarity_inputs: vec![
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Legend".to_string(),
                    count: 1,
                },
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Epic".to_string(),
                    count: 6,
                },
            ],
            modes: vec![
                "molotovMode".to_string(),
                "durianMode".to_string(),
                "soccerMode".to_string(),
                "droneMode".to_string(),
                "forcefieldMode".to_string(),
                "drillShotMode".to_string(),
                "rocketMode".to_string(),
                "lightningMode".to_string(),
                "boomerangMode".to_string(),
                "guardianMode".to_string(),
                "laserMode".to_string(),
                "brickMode".to_string(),
            ],
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(&player_state, &options).unwrap();
    let loadout = result.builds[0].config["loadout"].as_array().unwrap();
    let phase_driver = loadout
        .iter()
        .find(|row| row["id"] == json!("phaseDriver"))
        .expect("phaseDriver row");

    assert_eq!(phase_driver["resonance"], json!(60), "{phase_driver:?}");
    assert_eq!(
        phase_driver["mode"],
        json!("boomerangMode"),
        "{phase_driver:?}"
    );
}

#[test]
fn tech_catalog_normalizes_sio_display_mode_names() {
    use tttg_forge_optimizer::tech::skill_name_to_mode;

    assert_eq!(
        skill_name_to_mode("Drone Mode").as_deref(),
        Some("droneMode")
    );
    assert_eq!(
        skill_name_to_mode("Drill Shot Mode").as_deref(),
        Some("drillShotMode")
    );
    assert_eq!(
        skill_name_to_mode("Guardian Mode").as_deref(),
        Some("guardianMode")
    );
}

#[test]
fn sio_solver_expands_live_optimizer_rarity_inventory() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, resonance_for_parts, SioRarity,
    };

    let expanded = expand_rarity_inventory(&[(SioRarity::Legend, 2), (SioRarity::Epic, 8)], 4);

    assert_eq!(
        expanded.allocated_parts,
        vec![
            SioRarity::Legend,
            SioRarity::Legend,
            SioRarity::Epic,
            SioRarity::Epic
        ]
    );
    assert_eq!(expanded.unused_legend_credits, 0);
    assert_eq!(expanded.legend_remainder, 2);
    assert_eq!(resonance_for_parts(&[SioRarity::Eternal], 25), 2800);
}

#[test]
fn sio_resonance_frontier_prunes_dominated_candidates_like_live_worker() {
    use tttg_forge_optimizer::tech::sio_solver::{
        push_resonance_frontier, SioRarity, SioResonanceCandidate, SioResonanceRobot,
    };

    let weak = SioResonanceCandidate {
        chip_remainder: 5,
        legend_remainder: 1,
        robots: vec![SioResonanceRobot::from_parts(0, vec![SioRarity::Legend])],
    };
    let strong = SioResonanceCandidate {
        chip_remainder: 6,
        legend_remainder: 1,
        robots: vec![SioResonanceRobot::from_parts(25, vec![SioRarity::Eternal])],
    };
    let same_target_lower_chip = SioResonanceCandidate {
        chip_remainder: 5,
        legend_remainder: 1,
        robots: vec![SioResonanceRobot::from_parts(25, vec![SioRarity::Eternal])],
    };
    let tied_chip_worse_target = SioResonanceCandidate {
        chip_remainder: 6,
        legend_remainder: 1,
        robots: vec![SioResonanceRobot::from_parts(6, vec![SioRarity::Eternal])],
    };

    let mut frontier = Vec::new();
    push_resonance_frontier(&mut frontier, weak);
    push_resonance_frontier(&mut frontier, strong);
    push_resonance_frontier(&mut frontier, same_target_lower_chip);
    push_resonance_frontier(&mut frontier, tied_chip_worse_target);

    assert_eq!(frontier.len(), 1);
    assert_eq!(frontier[0].chip_remainder, 6);
    assert_eq!(frontier[0].robots[0].resonance, 2800);
    assert_eq!(frontier[0].robots[0].target, 2550);
    assert_eq!(frontier[0].robots[0].target_rich, 2550);
}

#[test]
fn sio_resonance_task_generator_uses_live_worker_lookup_window() {
    use tttg_forge_optimizer::tech::sio_solver::{generate_resonance_prefix_tasks, SioRarity};

    let parts = vec![
        SioRarity::Legend,
        SioRarity::Legend,
        SioRarity::Legend,
        SioRarity::Epic,
        SioRarity::Epic,
        SioRarity::Epic,
    ];

    let shallow = generate_resonance_prefix_tasks(&parts, 1, 0, false);
    let expanded = generate_resonance_prefix_tasks(&parts, 1, 1, false);

    assert_eq!(shallow.len(), 1);
    assert_eq!(
        shallow[0].groups_prefix,
        vec![vec![
            SioRarity::Legend,
            SioRarity::Legend,
            SioRarity::Legend
        ]]
    );
    assert_eq!(
        shallow[0].remaining_parts,
        vec![SioRarity::Epic, SioRarity::Epic, SioRarity::Epic]
    );
    assert_eq!(expanded.len(), 4);
    assert!(expanded.iter().any(|task| task.groups_prefix
        == vec![vec![SioRarity::Legend, SioRarity::Epic, SioRarity::Epic]]));
    assert!(expanded
        .iter()
        .any(|task| task.groups_prefix
            == vec![vec![SioRarity::Epic, SioRarity::Epic, SioRarity::Epic]]));
}

#[test]
fn sio_chip_distribution_matches_live_worker_thresholds_and_precise_permutations() {
    use tttg_forge_optimizer::tech::sio_solver::generate_chip_distributions;

    let normal = generate_chip_distributions(5, 2, 0, false, &[0]);
    let precise = generate_chip_distributions(5, 2, 0, true, &[0]);

    assert!(normal
        .iter()
        .any(|distribution| distribution.chips == vec![4, 1]));
    assert!(!normal
        .iter()
        .any(|distribution| distribution.chips == vec![1, 4]));
    assert!(precise
        .iter()
        .any(|distribution| distribution.chips == vec![1, 4]));

    let without_extra_legend = generate_chip_distributions(36, 1, 0, false, &[0]);
    let with_extra_legend = generate_chip_distributions(36, 1, 1, false, &[0]);

    assert!(!without_extra_legend
        .iter()
        .any(|distribution| distribution.chips == vec![36]));
    assert!(with_extra_legend.iter().any(|distribution| {
        distribution.chips == vec![36]
            && distribution.legend_cost == 1
            && distribution.chip_remainder == 0
            && (distribution.multipliers[0] - 3.2).abs() < f64::EPSILON
    }));
}

#[test]
fn sio_resonance_search_executes_group_and_chip_candidates_like_live_worker() {
    use tttg_forge_optimizer::tech::sio_solver::{
        generate_chip_distributions, generate_resonance_prefix_tasks, run_resonance_search,
        SioRarity, SioResonanceSearchOptions,
    };

    let parts = vec![
        SioRarity::Eternal,
        SioRarity::Eternal,
        SioRarity::Eternal,
        SioRarity::Legend,
        SioRarity::Legend,
        SioRarity::Legend,
    ];
    let tasks = generate_resonance_prefix_tasks(&parts, 1, 0, false);
    let distributions = generate_chip_distributions(1, 2, 0, false, &[0]);
    let candidates = run_resonance_search(
        &tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 2,
            extra_legends: 0,
            lookup_depth: 0,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );

    assert_eq!(candidates.len(), 1);
    assert_eq!(candidates[0].chip_remainder, 0);
    assert_eq!(candidates[0].legend_remainder, 0);
    assert_eq!(candidates[0].robots[0].parts, vec![SioRarity::Eternal; 3]);
    assert_eq!(candidates[0].robots[0].chip, 1);
    assert_eq!(candidates[0].robots[0].resonance, 3600);
    assert_eq!(candidates[0].robots[0].target, 3500);
    assert_eq!(candidates[0].robots[1].parts, vec![SioRarity::Legend; 3]);
    assert_eq!(candidates[0].robots[1].chip, 0);
    assert_eq!(candidates[0].robots[1].resonance, 900);
    assert_eq!(candidates[0].robots[1].target, 900);

    let filtered = run_resonance_search(
        &tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 2,
            extra_legends: 0,
            lookup_depth: 0,
            min_resonance: 1000,
            max_resonance: 15_000,
        },
    );
    assert!(filtered.is_empty());

    let reversed_parts = vec![
        SioRarity::Legend,
        SioRarity::Legend,
        SioRarity::Legend,
        SioRarity::Eternal,
        SioRarity::Eternal,
        SioRarity::Eternal,
    ];
    let reversed_tasks = generate_resonance_prefix_tasks(&reversed_parts, 1, 0, false);
    let monotonic_filtered = run_resonance_search(
        &reversed_tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 2,
            extra_legends: 0,
            lookup_depth: 0,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );
    assert!(monotonic_filtered.is_empty());
}

#[test]
fn sio_resonance_search_includes_live_worker_legend2_epic8_task() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, generate_chip_distributions, generate_resonance_prefix_tasks,
        run_resonance_search, SioRarity, SioResonanceSearchOptions,
    };

    let expanded = expand_rarity_inventory(&[(SioRarity::Legend, 2), (SioRarity::Epic, 8)], 18);
    let tasks = generate_resonance_prefix_tasks(&expanded.allocated_parts, 1, 2, false);
    let distributions =
        generate_chip_distributions(100, 6, expanded.unused_legend_credits, false, &[0]);
    let candidates = run_resonance_search(
        &tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 6,
            extra_legends: expanded.unused_legend_credits,
            lookup_depth: 2,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );

    let found = candidates.iter().any(|candidate| {
        candidate.chip_remainder == 3
            && candidate
                .robots
                .iter()
                .map(|robot| robot.chip)
                .collect::<Vec<_>>()
                == vec![25, 16, 16, 16, 12, 12]
            && candidate.robots[0].parts
                == vec![SioRarity::Legend, SioRarity::Epic, SioRarity::None]
            && candidate.robots[1].parts
                == vec![SioRarity::Legend, SioRarity::Epic, SioRarity::Epic]
            && candidate.robots[2].parts == vec![SioRarity::Epic, SioRarity::Epic, SioRarity::Epic]
            && candidate.robots[3].parts == vec![SioRarity::Epic, SioRarity::Epic, SioRarity::None]
            && candidate.robots[4].parts == vec![SioRarity::None, SioRarity::None, SioRarity::None]
            && candidate.robots[5].parts == vec![SioRarity::None, SioRarity::None, SioRarity::None]
    });

    assert!(
        found,
        "live worker legend2/epic8 task missing from Rust resonance candidates"
    );
}

#[test]
fn sio_skills_worker_mode_and_overload_primitives_follow_live_rules() {
    use std::collections::HashMap;
    use tttg_forge_optimizer::tech::sio_solver::{
        available_overload_levels, filter_mode_assignments_for_resonance,
        generate_mode_assignments, generate_overload_combinations, overload_level_for_resonance,
        SioModeConstraint,
    };

    let assignments = generate_mode_assignments(
        &[
            vec!["Drone Mode".to_string(), "Laser Mode".to_string()],
            vec!["Rocket Mode".to_string()],
        ],
        None,
    );
    assert_eq!(
        assignments,
        vec![
            vec!["Drone Mode".to_string(), "Rocket Mode".to_string()],
            vec!["Laser Mode".to_string(), "Rocket Mode".to_string()],
        ]
    );

    let subset_assignments = generate_mode_assignments(
        &[
            vec!["Drone Mode".to_string()],
            vec!["Rocket Mode".to_string()],
        ],
        Some(1),
    );
    assert_eq!(
        subset_assignments,
        vec![
            vec!["Drone Mode".to_string()],
            vec!["Rocket Mode".to_string()],
        ]
    );

    let constraints = HashMap::from([
        (
            "Laser Mode".to_string(),
            SioModeConstraint {
                min_resonance: 4_000,
                max_resonance: 15_000,
                min_overload: 0,
                max_overload: 18,
            },
        ),
        (
            "Rocket Mode".to_string(),
            SioModeConstraint {
                min_resonance: 0,
                max_resonance: 3_500,
                min_overload: 0,
                max_overload: 18,
            },
        ),
    ]);
    let filtered =
        filter_mode_assignments_for_resonance(&assignments, &[3_500, 3_500], &constraints);
    assert_eq!(
        filtered,
        vec![vec!["Drone Mode".to_string(), "Rocket Mode".to_string()]]
    );

    assert_eq!(overload_level_for_resonance(2_999), 0);
    assert_eq!(overload_level_for_resonance(3_000), 1);
    assert_eq!(overload_level_for_resonance(14_999), 15);
    assert_eq!(overload_level_for_resonance(15_000), 18);

    assert_eq!(available_overload_levels(2_999, 0, 18, 5, 1), vec![0]);
    assert_eq!(available_overload_levels(3_000, 0, 18, 5, 1), vec![0, 1]);
    assert_eq!(
        available_overload_levels(15_000, 0, 18, 4, 0),
        (0_u8..=12).collect::<Vec<_>>()
    );
    assert_eq!(
        available_overload_levels(15_000, 13, 18, 5, 1),
        (13_u8..=18).collect::<Vec<_>>()
    );

    let combos = generate_overload_combinations(&[vec![0, 1, 4], vec![0, 1, 4]], 2, 0);
    assert_eq!(combos, vec![vec![0, 4], vec![1, 1], vec![4, 0]]);
}

#[test]
fn sio_skills_candidate_search_expands_resonance_candidates_like_live_worker() {
    use std::collections::{HashMap, HashSet};
    use tttg_forge_optimizer::tech::sio_solver::{
        run_skills_candidate_search, SioModeConstraint, SioRarity, SioResonanceCandidate,
        SioResonanceRobot, SioSkillsSearchOptions,
    };

    let resonance_candidate = SioResonanceCandidate {
        chip_remainder: 2,
        legend_remainder: 0,
        robots: vec![
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Legend; 3]),
        ],
    };
    let results = run_skills_candidate_search(
        &[resonance_candidate],
        &SioSkillsSearchOptions {
            robot_names: vec!["drone".to_string(), "rocket".to_string()],
            modes_by_robot: vec![
                vec!["Drone Mode".to_string(), "Laser Mode".to_string()],
                vec!["Rocket Mode".to_string()],
            ],
            mode_constraints: HashMap::from([
                (
                    "Drone Mode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 1,
                    },
                ),
                (
                    "Laser Mode".to_string(),
                    SioModeConstraint {
                        min_resonance: 4_000,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 18,
                    },
                ),
                (
                    "Rocket Mode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 3_500,
                        min_overload: 0,
                        max_overload: 4,
                    },
                ),
            ]),
            overloadable_modes: HashSet::from([
                "Drone Mode".to_string(),
                "Rocket Mode".to_string(),
            ]),
            active_skill_modes: HashSet::new(),
            top_k: 5,
            use_rich_targets: false,
            permute_robots: true,
        },
    );

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].chip_remainder, 2);
    assert_eq!(results[0].legend_remainder, 0);
    assert_eq!(results[0].robots[0].tech, "drone");
    assert_eq!(results[0].robots[0].mode, "Drone Mode");
    assert_eq!(results[0].robots[0].overload, 1);
    assert_eq!(results[0].robots[0].target, 3_500);
    assert_eq!(results[0].robots[1].tech, "rocket");
    assert_eq!(results[0].robots[1].mode, "Rocket Mode");
    assert_eq!(results[0].robots[1].overload, 0);
    assert_eq!(results[0].robots[1].target, 900);
    assert!(results[0].multiplier > 0.0);
}

#[test]
fn sio_skills_candidate_search_bounds_large_advanced_overload_space() {
    use std::collections::{HashMap, HashSet};
    use std::time::Instant;
    use tttg_forge_optimizer::tech::sio_solver::{
        run_skills_candidate_search, SioModeConstraint, SioRarity, SioResonanceCandidate,
        SioResonanceRobot, SioSkillsSearchOptions,
    };

    let modes = [
        "droneMode",
        "drillShotMode",
        "soccerMode",
        "lightningMode",
        "guardianMode",
        "molotovMode",
    ];
    let resonance_candidate = SioResonanceCandidate {
        chip_remainder: 76,
        legend_remainder: 87,
        robots: vec![
            SioResonanceRobot::from_parts(90, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(78, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(4, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
        ],
    };
    let started = Instant::now();
    let results = run_skills_candidate_search(
        &[resonance_candidate],
        &SioSkillsSearchOptions {
            robot_names: vec![
                "energyGuidanceSystem".to_string(),
                "antimatterMaintainer".to_string(),
                "quantumNanobot".to_string(),
                "phaseDriver".to_string(),
                "exoRadicator".to_string(),
                "hiGravityPulser".to_string(),
            ],
            modes_by_robot: modes
                .iter()
                .map(|mode| vec![(*mode).to_string()])
                .collect::<Vec<_>>(),
            mode_constraints: modes
                .iter()
                .map(|mode| {
                    (
                        (*mode).to_string(),
                        SioModeConstraint {
                            min_resonance: 0,
                            max_resonance: 15_000,
                            min_overload: 0,
                            max_overload: 18,
                        },
                    )
                })
                .collect::<HashMap<_, _>>(),
            overloadable_modes: modes
                .iter()
                .map(|mode| (*mode).to_string())
                .collect::<HashSet<_>>(),
            active_skill_modes: HashSet::new(),
            top_k: 5,
            use_rich_targets: false,
            permute_robots: true,
        },
    );

    let elapsed = started.elapsed();
    assert_eq!(results.len(), 5);
    assert!(
        elapsed.as_millis() < 2_000,
        "large advanced overload preselect should stay bounded, elapsed={:?}",
        elapsed
    );
}

#[test]
fn sio_chip_distribution_keeps_zcppvi_overload_spare_candidate() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, generate_chip_distributions, SioRarity,
    };

    let expanded = expand_rarity_inventory(
        &[
            (SioRarity::Eternal, 18),
            (SioRarity::Legend4, 1),
            (SioRarity::Legend, 100),
        ],
        18,
    );
    let distributions =
        generate_chip_distributions(251, 6, expanded.unused_legend_credits, false, &[0]);

    let found = distributions.iter().any(|distribution| {
        distribution.chips == vec![90, 78, 4, 1, 1, 1]
            && distribution.chip_remainder == 76
            && distribution.legend_cost == 18
    });
    let final_row_found = distributions.iter().any(|distribution| {
        distribution.chips == vec![90, 60, 20, 4, 1, 0]
            && distribution.chip_remainder == 76
            && distribution.legend_cost == 15
    });

    assert!(
        found,
        "zcpPVi worker best chip distribution must be kept because chip remainder funds overload"
    );
    assert!(
        final_row_found,
        "zcpPVi worker best final row chip distribution must survive spend-bucket pruning"
    );
}

#[test]
fn sio_chip_distribution_keeps_shared_4zgabw_worker_best_candidate() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, generate_chip_distributions, SioRarity,
    };

    let expanded = expand_rarity_inventory(
        &[
            (SioRarity::Eternal, 18),
            (SioRarity::Legend4, 1),
            (SioRarity::Legend, 100),
        ],
        18,
    );
    let distributions =
        generate_chip_distributions(239, 6, expanded.unused_legend_credits, false, &[0]);

    let found = distributions.iter().any(|distribution| {
        distribution.chips == vec![90, 48, 9, 6, 0, 0]
            && distribution.chip_remainder == 86
            && distribution.legend_cost == 13
    });

    assert!(
        found,
        "4ZgaBw worker best chip distribution must survive pruning; got {} distributions",
        distributions.len()
    );
}

#[test]
fn sio_resonance_search_keeps_shared_4zgabw_worker_best_exact_chip_candidate() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, generate_chip_distributions, generate_resonance_prefix_tasks,
        run_resonance_search, SioRarity, SioResonanceSearchOptions,
    };

    let expanded = expand_rarity_inventory(
        &[
            (SioRarity::Eternal, 18),
            (SioRarity::Legend4, 1),
            (SioRarity::Legend, 100),
        ],
        18,
    );
    let tasks = generate_resonance_prefix_tasks(&expanded.allocated_parts, 1, 0, false);
    let distributions =
        generate_chip_distributions(239, 6, expanded.unused_legend_credits, false, &[0]);
    let candidates = run_resonance_search(
        &tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 6,
            extra_legends: expanded.unused_legend_credits,
            lookup_depth: 0,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );

    let position = candidates.iter().position(|candidate| {
        candidate.chip_remainder == 86
            && candidate.legend_remainder == 92
            && candidate
                .robots
                .iter()
                .map(|robot| robot.chip)
                .collect::<Vec<_>>()
                == vec![90, 48, 9, 6, 0, 0]
            && candidate
                .robots
                .iter()
                .map(|robot| robot.resonance)
                .collect::<Vec<_>>()
                == vec![15_000, 10_800, 6_000, 5_400, 3_000, 3_000]
    });

    assert!(
        position.is_some_and(|position| position < 32),
        "4ZgaBw worker best exact-chip resonance candidate should survive bounded preselect, position={position:?}, candidates={}",
        candidates.len()
    );
}

#[test]
fn sio_resonance_search_keeps_shared_ihacjy_worker_best_exact_chip_candidate() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, generate_chip_distributions, generate_resonance_prefix_tasks,
        run_resonance_search, SioRarity, SioResonanceSearchOptions,
    };

    let expanded = expand_rarity_inventory(
        &[
            (SioRarity::Eternal, 18),
            (SioRarity::Legend4, 1),
            (SioRarity::Legend, 100),
        ],
        18,
    );
    let tasks = generate_resonance_prefix_tasks(&expanded.allocated_parts, 1, 0, false);
    let distributions =
        generate_chip_distributions(242, 6, expanded.unused_legend_credits, false, &[0]);
    let candidates = run_resonance_search(
        &tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 6,
            extra_legends: expanded.unused_legend_credits,
            lookup_depth: 0,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );

    let position = candidates.iter().position(|candidate| {
        candidate.chip_remainder == 86
            && candidate
                .robots
                .iter()
                .map(|robot| robot.chip)
                .collect::<Vec<_>>()
                == vec![90, 48, 9, 4, 4, 1]
            && candidate
                .robots
                .iter()
                .map(|robot| robot.resonance)
                .collect::<Vec<_>>()
                == vec![15_000, 10_800, 6_000, 4_800, 4_800, 3_600]
    });

    assert!(
        position.is_some_and(|position| position < 32),
        "ihACJy/rm8mHx worker best exact-chip resonance candidate should survive bounded preselect, position={position:?}, candidates={}",
        candidates.len()
    );
}

#[test]
fn sio_resonance_search_keeps_shared_zglrn9_worker_best_exact_chip_candidate() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, generate_chip_distributions, generate_resonance_prefix_tasks,
        run_resonance_search, SioRarity, SioResonanceSearchOptions,
    };

    let expanded = expand_rarity_inventory(
        &[
            (SioRarity::Eternal, 18),
            (SioRarity::Legend4, 1),
            (SioRarity::Legend, 100),
        ],
        18,
    );
    let tasks = generate_resonance_prefix_tasks(&expanded.allocated_parts, 1, 0, false);
    let distributions =
        generate_chip_distributions(244, 6, expanded.unused_legend_credits, false, &[0]);
    let candidates = run_resonance_search(
        &tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 6,
            extra_legends: expanded.unused_legend_credits,
            lookup_depth: 0,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );

    let position = candidates.iter().position(|candidate| {
        candidate.chip_remainder == 87
            && candidate
                .robots
                .iter()
                .map(|robot| robot.chip)
                .collect::<Vec<_>>()
                == vec![90, 48, 9, 4, 4, 2]
            && candidate
                .robots
                .iter()
                .map(|robot| robot.resonance)
                .collect::<Vec<_>>()
                == vec![15_000, 10_800, 6_000, 4_800, 4_800, 4_200]
    });

    assert!(
        position.is_some_and(|position| position < 32),
        "Zglrn9 worker best exact-chip resonance candidate should survive bounded preselect, position={position:?}, candidates={}",
        candidates.len()
    );
}

#[test]
fn sio_zcppvi_worker_best_resonance_candidate_is_generated() {
    use tttg_forge_optimizer::tech::sio_solver::{
        expand_rarity_inventory, generate_chip_distributions, generate_resonance_prefix_tasks,
        run_resonance_search, SioRarity, SioResonanceSearchOptions,
    };

    let expanded = expand_rarity_inventory(
        &[
            (SioRarity::Eternal, 18),
            (SioRarity::Legend4, 1),
            (SioRarity::Legend, 100),
        ],
        18,
    );
    let tasks = generate_resonance_prefix_tasks(&expanded.allocated_parts, 1, 0, false);
    let distributions =
        generate_chip_distributions(251, 6, expanded.unused_legend_credits, false, &[0]);
    let candidates = run_resonance_search(
        &tasks,
        &distributions,
        SioResonanceSearchOptions {
            robot_count: 6,
            extra_legends: expanded.unused_legend_credits,
            lookup_depth: 0,
            min_resonance: 0,
            max_resonance: 15_000,
        },
    );

    let overload_spare_position = candidates.iter().position(|candidate| {
        candidate.chip_remainder == 76
            && candidate.legend_remainder == 87
            && candidate
                .robots
                .iter()
                .map(|robot| robot.chip)
                .collect::<Vec<_>>()
                == vec![90, 78, 4, 1, 1, 1]
            && candidate
                .robots
                .iter()
                .map(|robot| robot.resonance)
                .collect::<Vec<_>>()
                == vec![15_000, 13_800, 4_800, 3_600, 3_600, 3_600]
    });
    let final_row_position = candidates.iter().position(|candidate| {
        candidate.chip_remainder == 76
            && candidate.legend_remainder == 90
            && candidate
                .robots
                .iter()
                .map(|robot| robot.chip)
                .collect::<Vec<_>>()
                == vec![90, 60, 20, 4, 1, 0]
            && candidate
                .robots
                .iter()
                .map(|robot| robot.resonance)
                .collect::<Vec<_>>()
                == vec![15_000, 12_000, 7_800, 4_800, 3_600, 3_000]
    });
    let non_worker_dense_tail_position = candidates.iter().position(|candidate| {
        candidate.chip_remainder == 74
            && candidate.legend_remainder == 90
            && candidate
                .robots
                .iter()
                .map(|robot| robot.chip)
                .collect::<Vec<_>>()
                == vec![90, 60, 20, 4, 2, 1]
            && candidate
                .robots
                .iter()
                .map(|robot| robot.resonance)
                .collect::<Vec<_>>()
                == vec![15_000, 12_000, 7_800, 4_800, 4_200, 3_600]
    });

    let position = overload_spare_position.expect(
        "zcpPVi worker best overload-spare resonance candidate missing from Rust candidates",
    );
    assert!(
        position < 96,
        "zcpPVi overload-spare resonance candidate should stay in the priority frontier, position={position}, candidates={}",
        candidates.len()
    );
    let position = final_row_position
        .expect("zcpPVi worker best final-row resonance candidate missing from Rust candidates");
    assert!(
        position < 32,
        "zcpPVi final-row resonance candidate should survive bounded preselect, position={position}, candidates={}",
        candidates.len()
    );
    if let Some(position) = non_worker_dense_tail_position {
        assert!(
            position >= 32,
            "non-worker dense-tail resonance candidate should not displace captured zcpPVi worker frontier, position={position}, candidates={}",
            candidates.len()
        );
    }
}

#[test]
fn sio_skills_candidate_search_keeps_zcppvi_worker_best_row_with_compact_templates() {
    use std::collections::{HashMap, HashSet};
    use tttg_forge_optimizer::tech::sio_solver::{
        run_skills_candidate_search, SioModeConstraint, SioRarity, SioResonanceCandidate,
        SioResonanceRobot, SioSkillsSearchOptions,
    };

    let resonance_candidate = SioResonanceCandidate {
        chip_remainder: 76,
        legend_remainder: 90,
        robots: vec![
            SioResonanceRobot::from_parts(90, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(60, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(20, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(4, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Eternal; 3]),
        ],
    };

    let results = run_skills_candidate_search(
        &[resonance_candidate],
        &SioSkillsSearchOptions {
            robot_names: vec![
                "energyGuidanceSystem".to_string(),
                "antimatterMaintainer".to_string(),
                "quantumNanobot".to_string(),
                "phaseDriver".to_string(),
                "exoRadicator".to_string(),
                "hiGravityPulser".to_string(),
            ],
            modes_by_robot: vec![
                vec!["droneMode".to_string()],
                vec!["drillShotMode".to_string()],
                vec!["soccerMode".to_string()],
                vec!["lightningMode".to_string()],
                vec!["laserMode".to_string()],
                vec!["molotovMode".to_string()],
            ],
            mode_constraints: HashMap::from([
                (
                    "droneMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 18,
                        max_overload: 18,
                    },
                ),
                (
                    "drillShotMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 8,
                        max_overload: 8,
                    },
                ),
                (
                    "soccerMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "lightningMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "laserMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "molotovMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
            ]),
            overloadable_modes: [
                "droneMode",
                "drillShotMode",
                "soccerMode",
                "lightningMode",
                "laserMode",
                "molotovMode",
            ]
            .iter()
            .map(|mode| (*mode).to_string())
            .collect::<HashSet<_>>(),
            active_skill_modes: [
                "droneMode",
                "drillShotMode",
                "lightningMode",
                "laserMode",
                "molotovMode",
            ]
            .iter()
            .map(|mode| (*mode).to_string())
            .collect::<HashSet<_>>(),
            top_k: 5,
            use_rich_targets: false,
            permute_robots: true,
        },
    );

    let expected = results.iter().find(|candidate| {
        candidate.chip_remainder == 76
            && candidate
                .robots
                .iter()
                .map(|robot| {
                    (
                        robot.tech.as_str(),
                        robot.mode.as_str(),
                        robot.chip,
                        robot.overload,
                    )
                })
                .collect::<Vec<_>>()
                == vec![
                    ("energyGuidanceSystem", "droneMode", 90, 18),
                    ("antimatterMaintainer", "drillShotMode", 20, 8),
                    ("quantumNanobot", "soccerMode", 1, 0),
                    ("phaseDriver", "lightningMode", 60, 0),
                    ("exoRadicator", "laserMode", 0, 0),
                    ("hiGravityPulser", "molotovMode", 4, 0),
                ]
    });

    assert!(
        expected.is_some(),
        "zcpPVi worker best skills row should survive Rust skills preselect, got top rows: {:?}",
        results
            .iter()
            .take(10)
            .map(|candidate| candidate
                .robots
                .iter()
                .map(|robot| format!(
                    "{}:{}:{}:ol{}",
                    robot.tech, robot.mode, robot.chip, robot.overload
                ))
                .collect::<Vec<_>>())
            .collect::<Vec<_>>()
    );
}

#[test]
fn sio_skills_candidate_search_prefers_zcppvi_hgp_molotov_chip4_over_spare_remainder() {
    use std::collections::{HashMap, HashSet};
    use tttg_forge_optimizer::tech::sio_solver::{
        run_skills_candidate_search, SioModeConstraint, SioRarity, SioResonanceCandidate,
        SioResonanceRobot, SioSkillsSearchOptions,
    };

    let worker_best = SioResonanceCandidate {
        chip_remainder: 76,
        legend_remainder: 90,
        robots: vec![
            SioResonanceRobot::from_parts(90, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(20, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(60, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(4, vec![SioRarity::Eternal; 3]),
        ],
    };
    let spare_remainder = SioResonanceCandidate {
        chip_remainder: 80,
        legend_remainder: 90,
        robots: vec![
            SioResonanceRobot::from_parts(90, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(20, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(60, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Eternal; 3]),
        ],
    };

    let results = run_skills_candidate_search(
        &[spare_remainder, worker_best],
        &SioSkillsSearchOptions {
            robot_names: vec![
                "energyGuidanceSystem".to_string(),
                "antimatterMaintainer".to_string(),
                "quantumNanobot".to_string(),
                "phaseDriver".to_string(),
                "exoRadicator".to_string(),
                "hiGravityPulser".to_string(),
            ],
            modes_by_robot: vec![
                vec!["droneMode".to_string()],
                vec!["drillShotMode".to_string()],
                vec!["soccerMode".to_string()],
                vec!["lightningMode".to_string()],
                vec!["laserMode".to_string()],
                vec!["molotovMode".to_string()],
            ],
            mode_constraints: HashMap::from([
                (
                    "droneMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 18,
                        max_overload: 18,
                    },
                ),
                (
                    "drillShotMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 8,
                        max_overload: 8,
                    },
                ),
                (
                    "soccerMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "lightningMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "laserMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "molotovMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
            ]),
            overloadable_modes: [
                "droneMode",
                "drillShotMode",
                "soccerMode",
                "lightningMode",
                "laserMode",
                "molotovMode",
            ]
            .iter()
            .map(|mode| (*mode).to_string())
            .collect::<HashSet<_>>(),
            active_skill_modes: [
                "droneMode",
                "drillShotMode",
                "lightningMode",
                "laserMode",
                "molotovMode",
            ]
            .iter()
            .map(|mode| (*mode).to_string())
            .collect::<HashSet<_>>(),
            top_k: 2,
            use_rich_targets: false,
            permute_robots: false,
        },
    );

    assert_eq!(results[0].chip_remainder, 76, "{results:?}");
    assert_eq!(results[0].robots[5].chip, 4, "{results:?}");
}

#[test]
fn sio_skills_candidate_search_prefers_shared_4zgabw_worker_best_chip_allocation() {
    use std::collections::{HashMap, HashSet};
    use tttg_forge_optimizer::tech::sio_solver::{
        run_skills_candidate_search, SioModeConstraint, SioRarity, SioResonanceCandidate,
        SioResonanceRobot, SioSkillsSearchOptions,
    };

    let worker_best = SioResonanceCandidate {
        chip_remainder: 86,
        legend_remainder: 92,
        robots: vec![
            SioResonanceRobot::from_parts(90, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(48, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(9, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(6, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Eternal; 3]),
        ],
    };
    let rust_overweighted_phase = SioResonanceCandidate {
        chip_remainder: 12,
        legend_remainder: 84,
        robots: vec![
            SioResonanceRobot::from_parts(90, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(84, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(48, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(4, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(1, vec![SioRarity::Eternal; 3]),
            SioResonanceRobot::from_parts(0, vec![SioRarity::Eternal; 3]),
        ],
    };

    let results = run_skills_candidate_search(
        &[rust_overweighted_phase, worker_best],
        &SioSkillsSearchOptions {
            robot_names: vec![
                "energyGuidanceSystem".to_string(),
                "antimatterMaintainer".to_string(),
                "quantumNanobot".to_string(),
                "phaseDriver".to_string(),
                "exoRadicator".to_string(),
                "hiGravityPulser".to_string(),
            ],
            modes_by_robot: vec![
                vec!["droneMode".to_string()],
                vec!["drillShotMode".to_string()],
                vec!["soccerMode".to_string()],
                vec!["lightningMode".to_string()],
                vec!["laserMode".to_string()],
                vec!["molotovMode".to_string()],
            ],
            mode_constraints: HashMap::from([
                (
                    "droneMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 18,
                        max_overload: 18,
                    },
                ),
                (
                    "drillShotMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 11,
                        max_overload: 11,
                    },
                ),
                (
                    "soccerMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "lightningMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "laserMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
                (
                    "molotovMode".to_string(),
                    SioModeConstraint {
                        min_resonance: 0,
                        max_resonance: 15_000,
                        min_overload: 0,
                        max_overload: 0,
                    },
                ),
            ]),
            overloadable_modes: [
                "droneMode",
                "drillShotMode",
                "soccerMode",
                "lightningMode",
                "laserMode",
                "molotovMode",
            ]
            .iter()
            .map(|mode| (*mode).to_string())
            .collect::<HashSet<_>>(),
            active_skill_modes: [
                "droneMode",
                "drillShotMode",
                "lightningMode",
                "laserMode",
                "molotovMode",
            ]
            .iter()
            .map(|mode| (*mode).to_string())
            .collect::<HashSet<_>>(),
            top_k: 1,
            use_rich_targets: false,
            permute_robots: true,
        },
    );

    let top_row = results[0]
        .robots
        .iter()
        .map(|robot| {
            (
                robot.tech.as_str(),
                robot.mode.as_str(),
                robot.chip,
                robot.overload,
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        top_row,
        vec![
            ("energyGuidanceSystem", "droneMode", 90, 18),
            ("antimatterMaintainer", "drillShotMode", 48, 11),
            ("quantumNanobot", "soccerMode", 0, 0),
            ("phaseDriver", "lightningMode", 6, 0),
            ("exoRadicator", "laserMode", 0, 0),
            ("hiGravityPulser", "molotovMode", 9, 0),
        ],
        "{results:?}"
    );
}

#[test]
fn sio_lm_context_decodes_exo_and_hgp_compact_modes_like_sio_tools_global_order() {
    let context = tttg_forge_optimizer::tech::sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "baseStats": {},
            "compactConfig": {
                "m": [
                    {"y": 0},
                    {"y": 0},
                    {"y": 0},
                    {"y": 0},
                    {"y": 1, "z": 1, "bz": 0},
                    {"y": 0},
                    {"y": 0},
                    null,
                    {"y": 0},
                    {"y": 1, "z": 1, "bz": 0}
                ]
            }
        }
    }))
    .expect("sioLm context");

    assert_eq!(
        context
            .tech_mode_overload_templates
            .get("exoRadicator")
            .map(|template| template.mode.as_str()),
        Some("laserMode")
    );
    assert_eq!(
        context
            .tech_mode_overload_templates
            .get("hiGravityPulser")
            .map(|template| template.mode.as_str()),
        Some("molotovMode")
    );
}

#[test]
fn sio_skills_candidate_search_ranks_modes_by_sio_damage_coefficient() {
    use std::collections::{HashMap, HashSet};
    use tttg_forge_optimizer::tech::sio_solver::{
        run_skills_candidate_search, SioRarity, SioResonanceCandidate, SioResonanceRobot,
        SioSkillsSearchOptions,
    };

    let resonance_candidate = SioResonanceCandidate {
        chip_remainder: 0,
        legend_remainder: 0,
        robots: vec![SioResonanceRobot::from_parts(0, vec![SioRarity::Legend; 3])],
    };
    let results = run_skills_candidate_search(
        &[resonance_candidate],
        &SioSkillsSearchOptions {
            robot_names: vec!["energyGuidanceSystem".to_string()],
            modes_by_robot: vec![vec!["boomerangMode".to_string(), "droneMode".to_string()]],
            mode_constraints: HashMap::new(),
            overloadable_modes: HashSet::new(),
            active_skill_modes: HashSet::new(),
            top_k: 1,
            use_rich_targets: false,
            permute_robots: true,
        },
    );

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].robots[0].mode, "droneMode");
}

#[test]
fn sio_lm_reconstructs_zcppvi_active_lightning_laser_and_overload_drone_ce_damage() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/shared_zcpPVi/lm_trace_summary.json");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/shared_zcpPVi/worker_decoded_summary.json");
    if !trace_path.exists() || !worker_path.exists() {
        eprintln!(
            "skipping zcpPVi CE reconstruction check; artifacts missing: {} {}",
            trace_path.display(),
            worker_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    if skip_stale_trace_summary(&trace, "zcpPVi CE reconstruction check") {
        return;
    }
    let case = &trace["cases"][0];
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");
    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "baseStats": case["baseStats"]
        }
    }))
    .unwrap();
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );

    assert!(
        reconstructed["ceDamage"]["Drone Mode"]
            .as_f64()
            .unwrap_or(0.0)
            > 100_000.0,
        "{}",
        reconstructed["ceDamage"]["Drone Mode"]
    );
    assert!(
        reconstructed["ceDamage"]["Lightning Mode"]
            .as_f64()
            .unwrap_or(0.0)
            > 0.0,
        "{}",
        reconstructed["ceDamage"]["Lightning Mode"]
    );
    assert!(
        reconstructed["ceDamage"]["Laser Mode"]
            .as_f64()
            .unwrap_or(0.0)
            > 0.0,
        "{}",
        reconstructed["ceDamage"]["Laser Mode"]
    );
    for mode in [
        "Drone Mode",
        "Drill Shot Mode",
        "Lightning Mode",
        "Laser Mode",
        "Molotov Mode",
    ] {
        let actual = reconstructed["ceDamage"][mode].as_f64().unwrap_or(0.0);
        let expected = case["ceDamage"][mode].as_f64().unwrap_or(0.0);
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{mode}: actual {actual} expected {expected}"
        );
    }
    let actual_damage_factor = reconstructed["damageFactor"].as_f64().unwrap_or(0.0);
    let expected_damage_factor = case["damageFactor"].as_f64().unwrap_or(0.0);
    assert!(
        (actual_damage_factor - expected_damage_factor).abs()
            <= expected_damage_factor.abs() * 1e-12,
        "damageFactor: actual {actual_damage_factor} expected {expected_damage_factor}"
    );
    let skills = Value::Object(
        case["enabledSkills"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(|skill| (skill.to_string(), Value::Bool(true)))
            .collect::<Map<_, _>>(),
    );
    let score = tttg_forge_core::calculate_score(
        &reconstructed["stats"],
        &case["attackMeta"],
        actual_damage_factor,
        &reconstructed["ceDamage"],
        case["calcMode"].as_str().unwrap(),
        &skills,
        reconstructed["passivePools"].as_array().unwrap(),
        case["gameMode"].as_str().unwrap(),
    )
    .unwrap();
    let expected_score = case["tracedMultiplier"].as_f64().unwrap_or(0.0);
    assert!(
        (score - expected_score).abs() <= expected_score.abs() * 1e-12,
        "score: actual {score} expected {expected_score}"
    );
}

#[test]
fn sio_lm_reconstructs_new_shared_fixture_multipliers_from_compact_context() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    fn assert_number_close(path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{path}: actual {actual} expected {expected}"
        );
    }

    fn assert_expected_numbers_close(path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        let mut failures = Vec::new();
        for (key, expected_value) in expected {
            let actual_number = actual.get(key).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
            if (actual_number - expected_number).abs() > tolerance {
                failures.push(format!(
                    "{path}.{key}: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }

    fn assert_number_array_close(path: &str, actual: &[Value], expected: &[Value]) {
        assert_eq!(actual.len(), expected.len(), "{path}.len");
        for (index, (actual, expected)) in actual.iter().zip(expected).enumerate() {
            assert_number_close(
                &format!("{path}[{index}]"),
                actual.as_f64().unwrap_or(0.0),
                expected.as_f64().unwrap_or(0.0),
            );
        }
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    for fixture in ["4ZgaBw", "ihACJy", "rm8mHx", "Zglrn9", "qN5n40"] {
        let trace_path = repo_root.join(format!(
            "frontend/artifacts/td11/shared_{fixture}/lm_trace_summary.json"
        ));
        let worker_path = repo_root.join(format!(
            "frontend/artifacts/td11/shared_{fixture}/worker_decoded_summary.json"
        ));
        if !trace_path.exists() || !worker_path.exists() {
            eprintln!(
                "skipping {fixture} multiplier reconstruction check; artifacts missing: {} {}",
                trace_path.display(),
                worker_path.display()
            );
            continue;
        }

        let trace: Value =
            serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
        let worker: Value =
            serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
        if skip_stale_trace_summary(
            &trace,
            &format!("{fixture} multiplier reconstruction check"),
        ) {
            continue;
        }
        let case = &trace["cases"][0];
        let worker_case = &worker["cases"][0];
        let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
        let mut compact: Value = serde_json::from_str(
            worker_case["skillsRequests"][request_index]["configString"]
                .as_str()
                .unwrap(),
        )
        .unwrap();
        compact.as_object_mut().unwrap().remove("_R");
        let context = sio_lm_context_from_player_state(&json!({
            "sioLm": {
                "compactConfig": compact,
                "baseStats": case["baseStats"],
                "enabledSkills": case["enabledSkills"],
                "attackMeta": case["attackMeta"],
                "calcMode": case["calcMode"],
                "gameMode": case["gameMode"]
            }
        }))
        .unwrap();

        let enabled_skills = case["enabledSkills"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let reconstructed = reconstruct_sio_lm_inputs(
            &context.base_stats,
            &case["techs"],
            &enabled_skills,
            &context.transform,
        );
        assert_expected_numbers_close(
            &format!("{fixture}.stats"),
            &reconstructed["stats"],
            &case["nonZeroStats"],
        );
        assert_expected_numbers_close(
            &format!("{fixture}.ceDamage"),
            &reconstructed["ceDamage"],
            &case["ceDamage"],
        );
        assert_number_close(
            &format!("{fixture}.damageFactor"),
            reconstructed["damageFactor"].as_f64().unwrap(),
            case["damageFactor"].as_f64().unwrap(),
        );
        assert_number_array_close(
            &format!("{fixture}.passivePools"),
            reconstructed["passivePools"].as_array().unwrap(),
            case["passivePools"].as_array().unwrap(),
        );
        let score = tttg_forge_core::calculate_score(
            &reconstructed["stats"],
            &case["attackMeta"],
            reconstructed["damageFactor"].as_f64().unwrap(),
            &reconstructed["ceDamage"],
            case["calcMode"].as_str().unwrap(),
            &enabled_skill_map(case["enabledSkills"].as_array().unwrap()),
            reconstructed["passivePools"].as_array().unwrap(),
            case["gameMode"].as_str().unwrap(),
        )
        .unwrap();
        assert_number_close(
            &format!("{fixture}.score"),
            score,
            case["tracedMultiplier"].as_f64().unwrap(),
        );
    }
}

#[test]
fn sio_lm_decodes_and_reconstructs_zcppvi_equipment_transform_stats() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{
        decode_sio_lm_compact_summary, reconstruct_sio_lm_inputs, sio_lm_context_from_player_state,
    };

    fn assert_number_close(path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{path}: actual {actual} expected {expected}"
        );
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/shared_zcpPVi/lm_trace_summary.json");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/shared_zcpPVi/worker_decoded_summary.json");
    if !trace_path.exists() || !worker_path.exists() {
        eprintln!(
            "skipping zcpPVi equipment transform check; artifacts missing: {} {}",
            trace_path.display(),
            worker_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    if skip_stale_trace_summary(&trace, "compact-only qN5n40 stage reconstruction check") {
        return;
    }
    let case = &trace["cases"][0];
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");

    let decoded = decode_sio_lm_compact_summary(&compact);
    let item_names = decoded["ssEquipment"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|item| item["name"].as_str())
        .collect::<Vec<_>>();
    assert!(
        item_names.contains(&"Voidwaker Emblem"),
        "decoded items: {item_names:?}"
    );
    assert!(
        item_names.contains(&"Twisting Belt"),
        "decoded items: {item_names:?}"
    );

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "baseStats": case["baseStats"]
        }
    }))
    .unwrap();
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );

    for key in [
        "atkEquip",
        "atkFinal",
        "atkPercent",
        "critDamage",
        "vulnerability",
        "ssMiscPath",
        "cooldownReduction",
        "hpBulletBoost",
    ] {
        assert_number_close(
            &format!("stats.{key}"),
            reconstructed["stats"][key].as_f64().unwrap_or(0.0),
            case["nonZeroStats"][key].as_f64().unwrap_or(0.0),
        );
    }
}

#[test]
fn sio_damage_coefficients_match_live_worker_exports() {
    let drill_shot = tttg_forge_core::constants::damage_coefficient("Drill Shot Mode");
    assert!((drill_shot - 46.21).abs() < 1e-9);
}

#[test]
fn sio_lm_compact_config_summary_matches_live_trace_expansion() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping compact config summary check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let trace_cases = trace["cases"].as_array().unwrap();

    for worker_case in worker["cases"].as_array().unwrap() {
        let id = worker_case["id"].as_str().unwrap();
        let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
        let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
            .as_str()
            .unwrap();
        let compact: Value = serde_json::from_str(config_string).unwrap();
        let decoded = decode_sio_lm_compact_summary(&compact);
        let expanded = &trace_cases
            .iter()
            .find(|case| case["id"].as_str() == Some(id))
            .unwrap()["expandedConfig"];

        assert_eq!(decoded["meta"]["atkBase"], expanded["meta"]["atkBase"]);
        assert_eq!(decoded["meta"]["atkFinal"], expanded["meta"]["atkFinal"]);
        assert_eq!(decoded["meta"]["designs"], expanded["meta"]["designs"]);
        assert_eq!(decoded["meta"]["gameMode"], expanded["meta"]["gameMode"]);
        assert_eq!(decoded["settings"], expanded["settings"]);
        assert_eq!(decoded["skills"], expanded["skills"]);
        assert_eq!(
            decoded["techsOptimizer"]["chips"],
            expanded["techsOptimizer"]["chips"]
        );
        assert_eq!(
            decoded["techsOptimizer"]["inputs"],
            expanded["techsOptimizer"]["inputs"]
        );
        assert_eq!(
            decoded["techsOptimizer"]["modes"],
            expanded["techsOptimizer"]["modes"]
        );
        assert_eq!(
            decoded["techsOptimizer"]["skillsMap"],
            expanded["techsOptimizer"]["skillsMap"]
        );
        assert_eq!(
            decoded["ssEquipment"],
            json!([
                {"slot":"Weapon","id":"twinLance","name":"Twin Lance","itemIndex":1,"e":3,"v":2,"c":0,"x":0,"base":0},
                {"slot":"Armor","id":"evervoidArmor","name":"Evervoid Armor","itemIndex":2,"e":3,"v":2,"c":0,"x":0,"base":0},
                {"slot":"Necklace","id":"judgmentNecklace","name":"Judgment Necklace","itemIndex":4,"e":3,"v":2,"c":0,"x":0,"base":1},
                {"slot":"Belt","id":"stardustSash","name":"Stardust Sash","itemIndex":6,"e":3,"v":2,"c":0,"x":0,"base":0},
                {"slot":"Gloves","id":"moonscarBracer","name":"Moonscar Bracer","itemIndex":8,"e":3,"v":2,"c":0,"x":0,"base":0},
                {"slot":"Boots","id":"glacialWarboots","name":"Glacial Warboots","itemIndex":10,"e":3,"v":2,"c":0,"x":0,"base":0},
            ]),
            "{id} compact ss equipment summary"
        );
    }
}

#[test]
fn sio_lm_compact_context_derives_account_inputs_without_supplied_base_stats() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{
        decode_sio_lm_compact_summary, sio_lm_context_from_player_state,
    };

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/shared_qN5n40/worker_decoded_summary.json");
    if !worker_path.exists() {
        eprintln!(
            "skipping compact-only context derivation check; artifact missing: {}",
            worker_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");

    let decoded = decode_sio_lm_compact_summary(&compact);
    assert_eq!(
        decoded["accountInputs"]["survivors"]["Venato"]["stars"],
        json!(13)
    );
    assert_eq!(decoded["accountInputs"]["evo"]["Watchmaker"], json!(true));
    assert_eq!(
        decoded["accountInputs"]["lme"]["lme1Damage"],
        json!([20, 50, 75, 75])
    );
    assert_eq!(decoded["accountInputs"]["ee"]["gameMode"], json!("lme2"));
    assert_eq!(
        decoded["accountInputs"]["mounts"][0]["stats"]["skillDamage"],
        json!(89)
    );
    assert_eq!(decoded["derivedBaseStats"]["lme1Damage"], json!(220.0));
    assert_eq!(
        decoded["derivedBaseStats"]["skillDamage"],
        json!(-990.4399999999998)
    );

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact
        }
    }))
    .expect("compact-only sioLm context");

    assert!((context.attack_meta["atkBase"].as_f64().unwrap() - 120424.79999999999).abs() < 1e-9);
    assert_eq!(context.attack_meta["atkFinal"], json!(1464010));
    assert_eq!(context.game_mode, "lme2");
    assert!(context
        .enabled_skills
        .iter()
        .any(|skill| skill == "Laser Mode"));
    assert_eq!(context.base_stats["lme1Damage"], json!(220.0));
    assert_eq!(context.base_stats["damageBoss"], json!(189.25500000000002));
}

#[test]
fn sio_lm_compact_generic_base_stats_include_meta_synergy_inputs() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/shared_qN5n40/worker_decoded_summary.json");
    if !worker_path.exists() {
        eprintln!(
            "skipping compact meta synergy derivation check; artifact missing: {}",
            worker_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");
    compact["h"][21]["r"] = json!(12);

    let decoded = decode_sio_lm_compact_summary(&compact);
    assert_eq!(decoded["accountInputs"]["meta"]["synergy"], json!(true));
    assert_eq!(decoded["accountInputs"]["meta"]["synergyLevel"], json!(80));
    assert_eq!(decoded["accountInputs"]["meta"]["clanLevel"], json!(16));
    assert_eq!(
        decoded["accountInputs"]["meta"]["mainHero"],
        json!("Venato")
    );
    assert_eq!(
        decoded["accountInputs"]["meta"]["harmonyL"],
        json!("Metalia")
    );
    assert_eq!(
        decoded["accountInputs"]["meta"]["harmonyR"],
        json!("Taloxa")
    );
    assert_eq!(
        decoded["accountInputs"]["meta"]["teamwork"],
        json!(["Taloxa", "Raphael", "Michelangelo"])
    );
    assert_eq!(decoded["derivedBaseStats"]["atkHero"], json!(53_615.0));
    assert_eq!(decoded["derivedBaseStats"]["atkHeroPercent"], json!(196.0));
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(113.6));
    assert_eq!(
        decoded["derivedBaseStats"]["critDamage"],
        json!(-401.5200000000003)
    );
    assert_eq!(decoded["derivedBaseStats"]["shieldDamage"], json!(-116.88));
    assert_eq!(decoded["derivedBaseStats"]["vulnerability"], json!(-540.0));
    assert_eq!(decoded["derivedBaseStats"]["weakened"], json!(-282.15));
    assert_eq!(decoded["derivedBaseStats"]["poisoned"], json!(-266.19));
    assert_eq!(decoded["derivedBaseStats"]["chilled"], json!(-158.63));
    assert_eq!(decoded["derivedBaseStats"]["laceration"], json!(142.04));
    assert_eq!(decoded["derivedBaseStats"]["damageBoss"], json!(129.255));
    assert_eq!(decoded["derivedBaseStats"]["damageDealt"], json!(-75.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResChance"], json!(100.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResDamage"], json!(205.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoSyncRate"], json!(145.0));
    assert_eq!(decoded["derivedBaseStats"]["lacerationUptime"], json!(0.25));
    assert_eq!(decoded["derivedBaseStats"]["lme1Damage"], json!(220.0));
    assert_eq!(
        decoded["derivedBaseStats"]["skillDamage"],
        json!(-990.4399999999998)
    );
}

#[test]
fn sio_lm_compact_generic_base_stats_include_ee_skill_inputs() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "a": {
            "I": "ee",
            "K": [1, -1, 4]
        }
    });

    let decoded = decode_sio_lm_compact_summary(&compact);
    assert_eq!(decoded["accountInputs"]["ee"]["gameMode"], json!("ee"));
    assert_eq!(decoded["accountInputs"]["ee"]["skills"], json!([1, -1, 4]));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(290.0));
    assert_eq!(decoded["derivedBaseStats"]["damageDealt"], json!(-5.0));
    assert_eq!(decoded["derivedBaseStats"]["poisoned"], json!(10.0));
    assert_eq!(decoded["derivedBaseStats"]["chilled"], json!(10.0));
    assert_eq!(decoded["derivedBaseStats"]["weakened"], json!(10.0));
}

#[test]
fn sio_lm_compact_generic_custom_set_stats_apply_thresholds() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "n": [
            {
                "i": [0, 1, 2, 3],
                "q": 4
            }
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["customSets"][0]["collectibleIndexes"],
        json!([null, 0, 1, 2])
    );
    assert_eq!(decoded["accountInputs"]["customSets"][0]["level"], json!(4));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(225.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(10.0));
    assert!(decoded["derivedBaseStats"]["poisoned"].is_null());
    assert!(decoded["derivedBaseStats"]["weakened"].is_null());
    assert!(decoded["derivedBaseStats"]["chilled"].is_null());
}

#[test]
fn sio_lm_compact_generic_custom_set_stats_use_selected_count_for_legend_thresholds() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "i": [
            { "r": 6 },
            { "r": 6 }
        ],
        "n": [
            {
                "i": [1, 2, 0, null],
                "q": 2
            }
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["customSets"][0]["collectibleIndexes"],
        json!([0, 1, null, null])
    );
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(210.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(10.0));
    assert!(decoded["derivedBaseStats"]["poisoned"].is_null());
    assert!(decoded["derivedBaseStats"]["weakened"].is_null());
    assert!(decoded["derivedBaseStats"]["chilled"].is_null());
}

#[test]
fn sio_lm_compact_generic_custom_set_stats_include_advanced_star_thresholds() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "i": [
            { "r": 2 },
            { "r": 2 },
            { "r": 1 },
            { "r": 0 }
        ],
        "n": [
            {
                "i": [1, 2, 3, 4],
                "q": 3
            }
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(245.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(10.0));
    assert_eq!(decoded["derivedBaseStats"]["poisoned"], json!(5.0));
    assert_eq!(decoded["derivedBaseStats"]["weakened"], json!(5.0));
    assert_eq!(decoded["derivedBaseStats"]["chilled"], json!(5.0));
}

#[test]
fn sio_lm_compact_generic_collectible_star_stats_apply_live_table_thresholds() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "i": [
            { "r": 7 },
            { "r": 8 },
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            { "r": 10 },
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            { "r": 12 },
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            { "r": 8 }
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(215.0));
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(20.0));
}

#[test]
fn sio_lm_compact_generic_collectible_star_stats_apply_upgraded_multiplier() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "i": [
            { "r": 8 },
            { "r": 8 },
            { "r": 8 },
            { "r": 8 }
        ],
        "n": [
            {
                "i": [1, 2, 3, 4],
                "q": 1
            }
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);
    let crit_damage = decoded["derivedBaseStats"]["critDamage"].as_f64().unwrap();

    assert!((crit_damage - 268.3).abs() < 1e-9);
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(20.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(10.0));
}

#[test]
fn sio_lm_compact_generic_collectible_set_stats_fold_global_thresholds() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let mut collectibles = vec![json!(null); 111];
    for index in 107..=110 {
        collectibles[index] = json!({ "r": 8 });
    }

    let decoded = decode_sio_lm_compact_summary(&json!({
        "i": collectibles
    }));

    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(220.0));
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(20.0));
    assert_eq!(decoded["derivedBaseStats"]["shieldDamage"], json!(60.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(60.0));
    assert_eq!(decoded["derivedBaseStats"]["damageBoss"], json!(20.0));
    assert_eq!(decoded["derivedBaseStats"]["ssMiscPath"], json!(76.0));
}

#[test]
fn sio_lm_compact_generic_equipment_collectible_set_folds_conduct_experiments() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let mut collectibles = vec![json!(null); 24];
    for index in 20..=23 {
        collectibles[index] = json!({ "r": 3 });
    }

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "i": collectibles,
                "j": [
                    {"t": 10, "w": 1, "u": 0, "v": 0, "bg": 0, "x": 0}
                ]
            }
        }
    }))
    .expect("compact-only sioLm context");
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );

    assert_eq!(reconstructed["stats"]["shieldDamage"], json!(70.0));
}

#[test]
fn sio_lm_compact_generic_equipment_collectible_set_applies_inside_full_loadout() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let mut collectibles = vec![json!(null); 24];
    for index in 20..=23 {
        collectibles[index] = json!({ "r": 3 });
    }

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "i": collectibles,
                "j": [
                    {"t": 1, "w": 1, "u": 0, "v": 0, "bg": 0, "x": 0},
                    {"t": 10, "w": 1, "u": 0, "v": 0, "bg": 0, "x": 0}
                ]
            }
        }
    }))
    .expect("compact-only sioLm context");
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );

    assert_eq!(reconstructed["stats"]["shieldDamage"], json!(70.0));
}

#[test]
fn sio_lm_compact_generic_tech_collectible_set_folds_forcefield_impression_idols() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let mut collectibles = vec![json!(null); 82];
    for index in [12, 21, 80, 81] {
        collectibles[index] = json!({ "r": 5 });
    }
    let mut skills = vec![0; 21];
    skills[6] = 1;

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "i": collectibles,
                "p": skills
            }
        }
    }))
    .expect("compact-only sioLm context");
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({
            "Energy Guidance System": {
                "deployed": true,
                "mode": "Forcefield Mode",
                "rarity": "Legend",
                "resonance": 0
            }
        }),
        &context.enabled_skills,
        &context.transform,
    );

    assert_eq!(reconstructed["stats"]["vulnerability"], json!(10.0));
}

#[test]
fn sio_lm_compact_generic_synergy_accounts_still_apply_collectible_stats() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let decoded = decode_sio_lm_compact_summary(&json!({
        "a": {
            "b": 1,
            "g": 1
        },
        "i": [
            { "r": 8 }
        ]
    }));

    assert_eq!(decoded["derivedBaseStats"]["atkHero"], json!(400.0));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(210.0));
}

#[test]
fn sio_lm_compact_generic_survivor_main_passive_ports_venato_table() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let mut survivors = vec![json!(null); 22];
    survivors[21] = json!({ "r": 11 });

    let decoded = decode_sio_lm_compact_summary(&json!({
        "a": {
            "c": 22
        },
        "h": survivors
    }));

    assert_eq!(decoded["derivedBaseStats"]["atkHero"], json!(21615.0));
    assert_eq!(decoded["derivedBaseStats"]["adrenaline"], json!(60.0));
    assert_eq!(decoded["derivedBaseStats"]["damageBoss"], json!(50.0));
    assert_eq!(decoded["derivedBaseStats"]["crimsonBat"], json!(1.5));
}

#[test]
fn sio_lm_compact_generic_survivor_level_star_and_main_passive_stats_apply_thresholds() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let mut survivors = vec![json!(null); 22];
    survivors[4] = json!({
        "r": 12,
        "q": 120
    });
    let compact = json!({
        "a": {
            "c": 5
        },
        "h": survivors
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["accountInputs"]["meta"]["mainHero"], json!("King"));
    assert_eq!(decoded["derivedBaseStats"]["atkHeroPercent"], json!(5.0));
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(5.0));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(260.0));
    assert_eq!(decoded["derivedBaseStats"]["vulnerability"], json!(20.0));
}

#[test]
fn sio_lm_compact_generic_xeno_pet_awakening_uses_row_counts() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "bi": {
            "bj": 3,
            "r": [0, 0, 10, 0, 0, 0, 0, 0]
        }
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["accountInputs"]["pets"]["active"], json!("Capy"));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(132.0));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(202.0));
    assert_eq!(decoded["derivedBaseStats"]["shieldDamage"], json!(2.0));
    assert_eq!(decoded["derivedBaseStats"]["poisoned"], json!(2.0));
    assert_eq!(decoded["derivedBaseStats"]["weakened"], json!(2.0));
    assert_eq!(decoded["derivedBaseStats"]["chilled"], json!(2.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoSkillDamage"], json!(60.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoSyncRate"], json!(5.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResChance"], json!(10.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResDamage"], json!(16.0));
}

#[test]
fn sio_lm_compact_generic_xeno_pet_awakening_uses_minified_count_two_table() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "bi": {
            "bj": 3,
            "r": [0, 0, 6, 6, 0, 0, 0, 0]
        }
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["accountInputs"]["pets"]["active"], json!("Capy"));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(46.0));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(206.0));
    assert_eq!(decoded["derivedBaseStats"]["chilled"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["poisoned"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["weakened"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResChance"], json!(10.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResDamage"], json!(13.0));
}

#[test]
fn sio_lm_compact_base_stats_no_longer_use_shared_fixture_matchers() {
    use std::path::PathBuf;

    let source_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_config.rs");
    let source = std::fs::read_to_string(source_path).unwrap();

    assert!(
        !source.contains("shared_compact_account_base_stats"),
        "shared compact account base stats should be generic input-derived, not fixture table based"
    );
    assert!(
        !source.contains("compact_surface_matches_qn5n40"),
        "qN5n40 compact account base stats should be generic input-derived, not fixture matched"
    );
    assert!(
        !source.contains("qn5n40_compact_account_base_stats"),
        "qN5n40 compact account base stats should not live as a fixture constant"
    );
}

#[test]
fn sio_lm_equivalence_matrix_tracks_required_domains() {
    use serde_json::Value;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let matrix_path = repo_root.join("frontend/artifacts/td11/sio_lm_equivalence_matrix.json");
    let matrix: Value =
        serde_json::from_str(&std::fs::read_to_string(matrix_path).unwrap()).unwrap();
    let domains = matrix["domains"].as_array().expect("domains array");

    for required in [
        "compact-meta",
        "equipment",
        "collectibles-custom-sets",
        "pets-xeno-awakening",
        "survivors-passives-harmony-teamwork",
        "mounts",
        "evo",
        "lme",
        "ee",
        "active-skills",
    ] {
        let domain = domains
            .iter()
            .find(|domain| domain["id"].as_str() == Some(required))
            .unwrap_or_else(|| panic!("missing equivalence matrix domain {required}"));
        assert!(
            domain["status"].as_str().is_some(),
            "{required} must declare status"
        );
        assert!(
            domain["implemented"].as_bool().is_some(),
            "{required} must declare implemented"
        );
        assert!(
            domain["liveCovered"].as_bool().is_some(),
            "{required} must declare liveCovered"
        );
        assert!(
            domain["evidence"].as_array().is_some(),
            "{required} must declare evidence list"
        );
    }

    assert_eq!(matrix["fullSioEquivalent"], json!(true));
    assert_eq!(matrix["currentScorer"], json!("sio_full_lm_equivalence"));
    assert_eq!(matrix["scorer"], json!("sio_full_lm_equivalence"));
}

#[test]
fn sio_lm_compact_parity_matrix_runner_exists_and_declares_fixture_set() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let runner_path = repo_root.join("frontend/scripts/sio_compact_parity_matrix_check.mjs");
    let source = std::fs::read_to_string(runner_path).unwrap();

    for fixture in [
        "default",
        "shared_4ZgaBw",
        "shared_ihACJy",
        "shared_rm8mHx",
        "shared_Zglrn9",
        "shared_qN5n40",
        "shared_zcpPVi",
    ] {
        assert!(
            source.contains(fixture),
            "parity runner must include fixture descriptor {fixture}"
        );
    }
    assert!(
        source.contains("sio_worker_golden_parity_check.mjs")
            && source.contains("sio_tech_optimizer_parity_check.mjs"),
        "parity runner must execute both worker and optimizer parity scripts"
    );
}

#[test]
fn sio_lm_arbitrary_compact_fixture_generator_declares_domain_cases() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let generator_path =
        repo_root.join("frontend/scripts/sio_arbitrary_compact_fixture_generator.mjs");
    let source = std::fs::read_to_string(generator_path).unwrap();

    for domain in [
        "collectibles-custom-sets",
        "pets-xeno-awakening",
        "survivors-passives-harmony-teamwork",
        "mounts",
        "evo",
        "lme",
        "ee",
        "active-skills",
    ] {
        assert!(
            source.contains(domain),
            "arbitrary compact generator must declare domain case {domain}"
        );
    }
    assert!(
        source.contains("compactConfig") && source.contains("capturePlan"),
        "arbitrary compact generator must emit compactConfig and capturePlan payloads"
    );
}

#[test]
fn sio_lm_arbitrary_compact_worker_summary_builder_uses_generated_manifest() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let builder_path = repo_root.join("frontend/scripts/sio_arbitrary_compact_worker_summary.mjs");
    let source = std::fs::read_to_string(builder_path).unwrap();

    assert!(
        source.contains("compact_fixture_manifest.json")
            && source.contains("sio_worker_decoded_summary_2026-05-20.json"),
        "worker summary builder must bridge generated arbitrary compact manifest to a live worker request template"
    );
    assert!(
        source.contains("configString") && source.contains("skillsRequests"),
        "worker summary builder must emit replayable worker skillsRequests"
    );
    assert!(
        source.contains("mergeCompactConfigPatch")
            && source.contains("JSON.parse(templateRequest.configString)"),
        "worker summary builder must merge each arbitrary compact patch into a valid captured compact baseline"
    );
}

#[test]
fn sio_arbitrary_compact_generated_cases_require_live_expected() {
    use serde_json::Value;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let summary_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let summary: Value =
        serde_json::from_str(&std::fs::read_to_string(&summary_path).unwrap()).unwrap();
    let cases = summary["cases"].as_array().expect("cases array");
    assert!(
        !cases.is_empty(),
        "generated arbitrary compact summary must contain cases"
    );

    let mut failures = Vec::new();
    for case in cases {
        let id = case["id"].as_str().unwrap_or("<missing id>");
        if case["best"]["multiplier"].as_f64().is_none() {
            failures.push(format!("{id}: best.multiplier must be live-captured"));
        }
        if case["decodedResults"]
            .as_array()
            .is_none_or(|results| results.is_empty())
        {
            failures.push(format!("{id}: decodedResults must not be empty"));
        }
        let metadata = &case["captureMetadata"];
        for required in ["source", "capturedAt", "fixtureId", "compactPayloadHash"] {
            if metadata.get(required).and_then(Value::as_str).is_none() {
                failures.push(format!("{id}: captureMetadata.{required} missing"));
            }
        }
        if metadata.get("version").and_then(Value::as_str).is_none()
            && metadata
                .get("versionHash")
                .and_then(Value::as_str)
                .is_none()
        {
            failures.push(format!("{id}: captureMetadata.version/versionHash missing"));
        }
        let decoded_signature_count = case["decodedRowStatSignatures"]
            .as_array()
            .map_or(0, Vec::len);
        if decoded_signature_count == 0 {
            failures.push(format!("{id}: decoded row/stat signatures missing"));
        }
    }

    assert!(
        failures.is_empty(),
        "generated arbitrary compact cases are not independent live evidence:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_full_equivalence_true_is_blocked_while_production_residuals_remain() {
    use serde_json::Value;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let matrix_path = repo_root.join("frontend/artifacts/td11/sio_lm_equivalence_matrix.json");
    let matrix: Value =
        serde_json::from_str(&std::fs::read_to_string(matrix_path).unwrap()).unwrap();
    if matrix["fullSioEquivalent"].as_bool() != Some(true) {
        return;
    }

    let residuals = [
        (
            "tttg_forge_optimizer/src/tech/sio_config.rs",
            [
                "default_live_compact_account_base_stats",
                "captured_default_compact_account_base_stats",
                "CompactEndgameConditionProfile",
                "apply_compact_endgame_account_profile",
                "compact_surface_matches_default_live_fixture",
            ]
            .as_slice(),
        ),
        (
            "tttg_forge_optimizer/src/tech/sio_lm.rs",
            ["compact_matches_captured_account_surface"].as_slice(),
        ),
        (
            "tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs",
            [
                "EquipmentProfileStats",
                "is_judgment_sash_equipment_profile",
                "is_void_sash_equipment_profile",
                "is_void_twisting_equipment_profile",
                "is_lme2_judgment_equipment_profile",
                "is_advanced_void_twisting_equipment_profile",
                "CompactEquipmentCalibration",
                "apply_compact_equipment_calibration",
                "apply_advanced_void_twisting_calibration",
                "matches_judgment_sash_loadout",
                "matches_void_sash_loadout",
                "matches_void_twisting_loadout",
                "matches_lme2_judgment_loadout",
                "matches_advanced_void_twisting_loadout",
            ]
            .as_slice(),
        ),
    ];

    let mut failures = Vec::new();
    for (relative_path, names) in residuals {
        let source = std::fs::read_to_string(repo_root.join(relative_path)).unwrap();
        for name in names {
            if source.contains(name) {
                failures.push(format!("{relative_path}: {name}"));
            }
        }
    }

    assert!(
        failures.is_empty(),
        "fullSioEquivalent=true is blocked by production residuals:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_equipment_transform_generated_profiles_require_live_expected() {
    use serde_json::Value;
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let summary_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let summary: Value =
        serde_json::from_str(&std::fs::read_to_string(&summary_path).unwrap()).unwrap();
    let cases_by_id = summary["cases"]
        .as_array()
        .expect("cases array")
        .iter()
        .filter_map(|case| Some((case["id"].as_str()?, case)))
        .collect::<BTreeMap<_, _>>();

    let mut failures = Vec::new();
    for id in [
        "equipment_judgment_sash_profile",
        "equipment_void_sash_profile",
        "equipment_void_twisting_profile",
        "equipment_lme2_judgment_profile",
        "equipment_advanced_void_twisting_profile",
    ] {
        let Some(case) = cases_by_id.get(id) else {
            failures.push(format!("{id}: generated live equipment case missing"));
            continue;
        };
        if case["best"]["multiplier"].as_f64().is_none() {
            failures.push(format!("{id}: best.multiplier must be live-captured"));
        }
        if case["decodedResults"]
            .as_array()
            .is_none_or(|results| results.is_empty())
        {
            failures.push(format!("{id}: decodedResults must not be empty"));
        }
        if case["decodedRowStatSignatures"]
            .as_array()
            .is_none_or(|signatures| signatures.is_empty())
        {
            failures.push(format!("{id}: decoded row/stat signatures missing"));
        }
        let metadata = &case["captureMetadata"];
        if metadata["fixtureId"].as_str() != Some(id) {
            failures.push(format!("{id}: captureMetadata.fixtureId mismatch"));
        }
        if metadata["compactPayloadHash"].as_str().is_none() {
            failures.push(format!("{id}: captureMetadata.compactPayloadHash missing"));
        }
    }

    assert!(
        failures.is_empty(),
        "S62 generated equipment compact cases are not independent live evidence:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_equipment_transform_removes_legacy_profile_matchers() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let relative_path = "tttg_forge_optimizer/src/tech/sio_lm/equipment_transform.rs";
    let source = std::fs::read_to_string(repo_root.join(relative_path)).unwrap();
    let mut failures = Vec::new();
    for forbidden in [
        "apply_advanced_void_twisting_equipment_profile",
        "apply_compact_equipment_profile_transform",
        "EquipmentProfileStats",
        "apply_equipment_profile_stats",
        "is_judgment_sash_equipment_profile",
        "is_void_sash_equipment_profile",
        "is_void_twisting_equipment_profile",
        "is_lme2_judgment_equipment_profile",
        "is_advanced_void_twisting_equipment_profile",
    ] {
        if source.contains(forbidden) {
            failures.push(format!("{relative_path}: {forbidden}"));
        }
    }

    assert!(
        failures.is_empty(),
        "legacy fixture equipment profile matchers remain in production:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_collectibles_custom_sets_generated_cases_require_live_expected() {
    use serde_json::Value;
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let summary_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let summary: Value =
        serde_json::from_str(&std::fs::read_to_string(&summary_path).unwrap()).unwrap();
    let cases_by_id = summary["cases"]
        .as_array()
        .expect("cases array")
        .iter()
        .filter_map(|case| Some((case["id"].as_str()?, case)))
        .collect::<BTreeMap<_, _>>();

    let mut failures = Vec::new();
    for id in [
        "collectibles_individual_star_tables",
        "collectibles_upgraded_multiplier_behavior",
        "collectibles_item_set_folding",
        "collectibles_tech_set_folding",
        "custom_sets_threshold_edges",
    ] {
        let Some(case) = cases_by_id.get(id) else {
            failures.push(format!(
                "{id}: generated live collectibles/customSets case missing"
            ));
            continue;
        };
        if case["best"]["multiplier"].as_f64().is_none() {
            failures.push(format!("{id}: best.multiplier must be live-captured"));
        }
        if case["decodedResults"]
            .as_array()
            .is_none_or(|results| results.is_empty())
        {
            failures.push(format!("{id}: decodedResults must not be empty"));
        }
        if case["decodedRowStatSignatures"]
            .as_array()
            .is_none_or(|signatures| signatures.is_empty())
        {
            failures.push(format!("{id}: decoded row/stat signatures missing"));
        }
        if case["captureMetadata"]["fixtureId"].as_str() != Some(id) {
            failures.push(format!("{id}: captureMetadata.fixtureId mismatch"));
        }
    }

    assert!(
        failures.is_empty(),
        "S63 generated collectibles/customSets compact cases are not independent live evidence:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_arbitrary_compact_worker_summary_rejects_stale_live_capture_hashes() {
    use serde_json::Value;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let summary_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let summary: Value =
        serde_json::from_str(&std::fs::read_to_string(&summary_path).unwrap()).unwrap();

    let mut failures = Vec::new();
    for case in summary["cases"].as_array().expect("cases array") {
        if case["evidenceState"].as_str() != Some("live-captured") {
            continue;
        }
        let id = case["id"].as_str().unwrap_or("<unknown>");
        let expected_hash = case["compactPayloadHash"].as_str();
        let metadata_hash = case["captureMetadata"]["compactPayloadHash"].as_str();
        if expected_hash.is_none() || metadata_hash.is_none() || expected_hash != metadata_hash {
            failures.push(format!(
                "{id}: live capture hash {:?} does not match manifest hash {:?}",
                metadata_hash, expected_hash
            ));
        }
    }

    assert!(
        failures.is_empty(),
        "worker summary must not attach stale live captures by id only:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_lm_g3_matrix_domains_require_live_backed_trace_contract() {
    use serde_json::Value;
    use std::collections::{BTreeMap, BTreeSet};
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let matrix_path = repo_root.join("frontend/artifacts/td11/sio_lm_equivalence_matrix.json");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");

    let matrix: Value =
        serde_json::from_str(&std::fs::read_to_string(matrix_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();

    let worker_cases = worker["cases"].as_array().expect("worker cases");
    let trace_cases_by_id = trace["cases"]
        .as_array()
        .expect("trace cases")
        .iter()
        .filter_map(|case| Some((case["id"].as_str()?, case)))
        .collect::<BTreeMap<_, _>>();
    let domains_with_cases = worker_cases
        .iter()
        .filter_map(|case| Some(case["domain"].as_str()?))
        .collect::<BTreeSet<_>>();

    let mut failures = Vec::new();
    let all_domains_claim_implemented_live_covered = matrix["domains"]
        .as_array()
        .expect("matrix domains")
        .iter()
        .all(|domain| domain["status"].as_str() == Some("implemented-live-covered"));

    for domain in matrix["domains"].as_array().expect("matrix domains") {
        let domain_id = domain["id"].as_str().unwrap_or("<missing-domain-id>");
        if all_domains_claim_implemented_live_covered
            && domain["status"].as_str() != Some("implemented-live-covered")
        {
            failures.push(format!(
                "{domain_id}: status must be implemented-live-covered before G3 can close"
            ));
        }
        if domain["implemented"].as_bool() != Some(true) {
            failures.push(format!("{domain_id}: implemented must be true"));
        }
        if domain["liveCovered"].as_bool() != Some(true) {
            failures.push(format!("{domain_id}: liveCovered must be true"));
        }
        if !domains_with_cases.contains(domain_id) {
            failures.push(format!(
                "{domain_id}: no generated live-captured fixture case"
            ));
            continue;
        }

        for case in worker_cases
            .iter()
            .filter(|case| case["domain"].as_str() == Some(domain_id))
        {
            let id = case["id"].as_str().unwrap_or("<missing-case-id>");
            if case["evidenceState"].as_str() != Some("live-captured") {
                failures.push(format!("{id}: evidenceState must be live-captured"));
            }
            if case["best"]["multiplier"].as_f64().is_none() {
                failures.push(format!("{id}: best.multiplier must be finite"));
            }
            if case["decodedResults"]
                .as_array()
                .is_none_or(|results| results.is_empty())
            {
                failures.push(format!("{id}: decodedResults must not be empty"));
            }
            if case["decodedRowStatSignatures"]
                .as_array()
                .is_none_or(|signatures| signatures.is_empty())
            {
                failures.push(format!("{id}: decodedRowStatSignatures must not be empty"));
            }
            if case["captureMetadata"]["compactPayloadHash"].as_str()
                != case["compactPayloadHash"].as_str()
            {
                failures.push(format!(
                    "{id}: live capture hash must match compact payload hash"
                ));
            }

            let Some(trace_case) = trace_cases_by_id.get(id) else {
                failures.push(format!("{id}: missing live lm trace summary"));
                continue;
            };
            for key in [
                "expectedMultiplier",
                "replayedTopMultiplier",
                "tracedMultiplier",
            ] {
                if trace_case[key].as_f64().is_none() {
                    failures.push(format!("{id}: trace {key} must be finite"));
                }
            }
            if trace_case["stageProductRelativeError"]
                .as_f64()
                .is_none_or(|error| error > 1e-12)
            {
                failures.push(format!(
                    "{id}: trace stage product parity missing or too loose"
                ));
            }
            if trace_case["baseStats"]
                .as_object()
                .is_none_or(|stats| stats.is_empty())
            {
                failures.push(format!("{id}: live trace baseStats missing"));
            }
            if trace_case["nonZeroStats"]
                .as_object()
                .is_none_or(|stats| stats.is_empty())
            {
                failures.push(format!("{id}: live trace stats missing"));
            }
            if trace_case["ceDamage"]
                .as_object()
                .is_none_or(|stats| stats.is_empty())
            {
                failures.push(format!("{id}: live trace ceDamage missing"));
            }
            if trace_case["passivePools"]
                .as_array()
                .is_none_or(|pools| pools.is_empty())
            {
                failures.push(format!("{id}: live trace passivePools missing"));
            }
            if trace_case["baseStatComponents"]
                .as_array()
                .is_none_or(|components| components.is_empty())
            {
                failures.push(format!("{id}: TRACE_LM_BASE_COMPONENTS evidence missing"));
            }
            if trace_case["statTraceDeltas"]
                .as_array()
                .is_none_or(|snapshots| snapshots.is_empty())
            {
                failures.push(format!("{id}: TRACE_LM_STAT_ATTRIBUTION evidence missing"));
            }
            if trace_case["techStageDeltas"]
                .as_array()
                .is_none_or(|snapshots| snapshots.is_empty())
            {
                failures.push(format!("{id}: TRACE_LM_TECH_STAGE evidence missing"));
            }
        }
    }

    if all_domains_claim_implemented_live_covered {
        assert!(
            failures.is_empty(),
            "G3 matrix live-backed coverage contract is not satisfied:\n{}",
            failures.join("\n")
        );
    } else {
        assert_eq!(
            matrix["fullSioEquivalent"],
            json!(false),
            "fullSioEquivalent must remain false while G3 domains are not all implemented-live-covered"
        );
    }
}

#[test]
fn sio_lm_g3_generated_cases_reconstruct_live_trace_without_profile_residuals() {
    use serde_json::{Map, Value};
    use std::collections::BTreeMap;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    fn number_close(actual: f64, expected: f64) -> bool {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        (actual - expected).abs() <= tolerance
    }

    fn assert_numbers_close(
        path: &str,
        actual: &Value,
        expected: &Value,
        failures: &mut Vec<String>,
    ) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        for (key, expected_value) in expected {
            if is_sio_lm_non_scoring_mutable_trace_stat(key) {
                continue;
            }
            let actual_number = actual.get(key).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            if !number_close(actual_number, expected_number) {
                failures.push(format!(
                    "{path}.{key}: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        for (key, actual_value) in actual {
            if expected.contains_key(key) || is_sio_lm_non_scoring_mutable_trace_stat(key) {
                continue;
            }
            let actual_number = actual_value.as_f64().unwrap_or(0.0);
            if actual_number.abs() > 1e-9 {
                failures.push(format!("{path}.{key}: unexpected actual {actual_number}"));
            }
        }
    }

    fn assert_arrays_close(
        path: &str,
        actual: &Value,
        expected: &Value,
        failures: &mut Vec<String>,
    ) {
        let actual = actual.as_array().expect("actual array");
        let expected = expected.as_array().expect("expected array");
        for (index, expected_value) in expected.iter().enumerate() {
            let actual_number = actual.get(index).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            if !number_close(actual_number, expected_number) {
                failures.push(format!(
                    "{path}[{index}]: actual {actual_number} expected {expected_number}"
                ));
            }
        }
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    let matrix_path = repo_root.join("frontend/artifacts/td11/sio_lm_equivalence_matrix.json");
    let matrix: Value =
        serde_json::from_str(&std::fs::read_to_string(matrix_path).unwrap()).unwrap();
    let all_domains_claim_implemented_live_covered = matrix["domains"]
        .as_array()
        .expect("matrix domains")
        .iter()
        .all(|domain| domain["status"].as_str() == Some("implemented-live-covered"));
    let force_g3_reconstruction = std::env::var("SIO_LM_FORCE_G3_RECON").as_deref() == Ok("1");
    if !all_domains_claim_implemented_live_covered && !force_g3_reconstruction {
        assert_eq!(
            matrix["fullSioEquivalent"],
            json!(false),
            "fullSioEquivalent must stay false until G3 generated fixtures reconstruct residual-free"
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    if skip_stale_trace_summary(&trace, "G3 generated live fixture reconstruction") {
        return;
    }
    let worker_cases = worker["cases"]
        .as_array()
        .expect("worker cases")
        .iter()
        .filter_map(|case| Some((case["id"].as_str()?, case)))
        .collect::<BTreeMap<_, _>>();

    let mut failures = Vec::new();
    for trace_case in trace["cases"].as_array().expect("trace cases") {
        let case_id = trace_case["id"].as_str().expect("case id");
        let Some(worker_case) = worker_cases.get(case_id) else {
            failures.push(format!("{case_id}: missing worker case"));
            continue;
        };
        let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
        let mut compact: Value = serde_json::from_str(
            worker_case["skillsRequests"][request_index]["configString"]
                .as_str()
                .unwrap(),
        )
        .unwrap();
        compact.as_object_mut().unwrap().remove("_R");

        let Some(context) = sio_lm_context_from_player_state(&json!({
            "sioLm": {
                "compactConfig": compact,
                "enabledSkills": trace_case["enabledSkills"]
            }
        })) else {
            failures.push(format!("{case_id}: compact context did not decode"));
            continue;
        };
        let enabled_skills = trace_case["enabledSkills"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let reconstructed = reconstruct_sio_lm_inputs(
            &context.base_stats,
            &trace_case["techs"],
            &enabled_skills,
            &context.transform,
        );

        assert_numbers_close(
            &format!("{case_id}.baseStats"),
            &context.base_stats,
            &trace_case["baseStats"],
            &mut failures,
        );
        assert_numbers_close(
            &format!("{case_id}.stats"),
            &reconstructed["stats"],
            &trace_case["nonZeroStats"],
            &mut failures,
        );
        assert_numbers_close(
            &format!("{case_id}.ceDamage"),
            &reconstructed["ceDamage"],
            &trace_case["ceDamage"],
            &mut failures,
        );
        assert_arrays_close(
            &format!("{case_id}.passivePools"),
            &reconstructed["passivePools"],
            &trace_case["passivePools"],
            &mut failures,
        );
        let damage_factor = reconstructed["damageFactor"].as_f64().unwrap_or(0.0);
        let expected_damage_factor = trace_case["damageFactor"].as_f64().unwrap_or(0.0);
        if !number_close(damage_factor, expected_damage_factor) {
            failures.push(format!(
                "{case_id}.damageFactor: actual {damage_factor} expected {expected_damage_factor}"
            ));
        }
        let score = tttg_forge_core::calculate_score(
            &reconstructed["stats"],
            &context.attack_meta,
            damage_factor,
            &reconstructed["ceDamage"],
            &context.calc_mode,
            &enabled_skill_map(trace_case["enabledSkills"].as_array().unwrap()),
            reconstructed["passivePools"].as_array().unwrap(),
            &context.game_mode,
        )
        .unwrap();
        let expected_score = trace_case["tracedMultiplier"].as_f64().unwrap_or(0.0);
        if !number_close(score, expected_score) {
            failures.push(format!(
                "{case_id}.score: actual {score} expected {expected_score}"
            ));
        }
    }

    assert!(
        failures.is_empty(),
        "G3 generated live fixtures do not reconstruct residual-free in Rust:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_lm_compact_molotov_energy_cube_pool_uses_live_cooldown_without_energy_cube_skill() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping Molotov cooldown passive pool check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let trace_case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("survivors_passives_harmony_teamwork"))
        .unwrap();
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("survivors_passives_harmony_teamwork"))
        .unwrap();
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
    let compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    let enabled_skills = trace_case["enabledSkills"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(Value::as_str)
        .map(str::to_string)
        .collect::<Vec<_>>();
    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "enabledSkills": trace_case["enabledSkills"]
        }
    }))
    .unwrap();
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &trace_case["techs"],
        &enabled_skills,
        &context.transform,
    );

    assert!(!enabled_skills.iter().any(|skill| skill == "Energy Cube"));
    let pool_index = tttg_forge_core::constants::damage_pool_index("Molotov Mode", "Energy Cube")
        .expect("Molotov Mode Energy Cube pool index");
    let actual = reconstructed["passivePools"][pool_index]
        .as_f64()
        .unwrap_or(0.0);
    let expected = trace_case["passivePools"][pool_index]
        .as_f64()
        .unwrap_or(0.0);
    assert!(
        (actual - expected).abs() <= 1e-12,
        "Molotov Mode Energy Cube passive pool actual {actual} expected {expected}"
    );
}

#[test]
fn sio_lm_compact_voidwaker_emblem_uptime_uses_live_revive_window_formula() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping Voidwaker Emblem uptime check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let trace_case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("equipment_void_sash_profile"))
        .unwrap();
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("equipment_void_sash_profile"))
        .unwrap();
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
    let compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    let enabled_skills = trace_case["enabledSkills"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(Value::as_str)
        .map(str::to_string)
        .collect::<Vec<_>>();
    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "enabledSkills": trace_case["enabledSkills"]
        }
    }))
    .unwrap();
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &trace_case["techs"],
        &enabled_skills,
        &context.transform,
    );

    let actual = reconstructed["stats"]["voidNeckBoostUptime"]
        .as_f64()
        .unwrap_or(0.0);
    let expected = trace_case["nonZeroStats"]["voidNeckBoostUptime"]
        .as_f64()
        .unwrap_or(0.0);
    assert!(
        (actual - expected).abs() <= 1e-12,
        "Voidwaker Emblem uptime actual {actual} expected {expected}"
    );
}

#[test]
fn sio_collectibles_custom_sets_fixture_manifest_uses_live_custom_set_encoding() {
    use serde_json::Value;
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let manifest_path = repo_root
        .join("frontend/artifacts/td11/arbitrary_compact_s59/compact_fixture_manifest.json");
    let manifest: Value =
        serde_json::from_str(&std::fs::read_to_string(&manifest_path).unwrap()).unwrap();
    let cases_by_id = manifest["cases"]
        .as_array()
        .expect("cases array")
        .iter()
        .filter_map(|case| Some((case["id"].as_str()?, case)))
        .collect::<BTreeMap<_, _>>();

    let mut failures = Vec::new();
    for id in [
        "collectibles_custom_sets_legend_thresholds",
        "collectibles_upgraded_multiplier_behavior",
        "custom_sets_threshold_edges",
    ] {
        let Some(case) = cases_by_id.get(id) else {
            failures.push(format!("{id}: manifest case missing"));
            continue;
        };
        let Some(custom_sets) = case["compactConfig"]["n"].as_array() else {
            failures.push(format!("{id}: custom set fixture must include compact n"));
            continue;
        };
        if custom_sets.is_empty() {
            failures.push(format!("{id}: custom set fixture must include compact n"));
            continue;
        }
        for (set_index, custom_set) in custom_sets.iter().enumerate() {
            let encoded = custom_set["i"].as_array().expect("custom set indexes");
            if encoded.iter().any(|value| value.as_u64() == Some(0)) {
                failures.push(format!(
                    "{id}[{set_index}]: compact custom set index 0 is None, not collectible 0"
                ));
            }
        }
    }

    assert!(
        failures.is_empty(),
        "S63 generated custom set fixtures use non-live compact encoding:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_tools_asset_discovery_script_declares_source_map_probe() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let script_path = repo_root.join("frontend/scripts/sio_tools_asset_discovery.mjs");
    let script = std::fs::read_to_string(&script_path)
        .unwrap_or_else(|error| panic!("missing {}: {error}", script_path.display()));

    for required in [
        "sourceMapCandidates",
        "workerAssetCandidates",
        "asset_discovery_summary.json",
        "asset_discovery_report.md",
    ] {
        assert!(
            script.contains(required),
            "discovery script must declare {required}"
        );
    }
}

#[test]
fn sio_minified_domain_index_script_declares_module_keyword_extraction() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let script_path = repo_root.join("frontend/scripts/sio_minified_domain_index.mjs");
    let script = std::fs::read_to_string(&script_path)
        .unwrap_or_else(|error| panic!("missing {}: {error}", script_path.display()));

    for required in [
        "extractWebpackModules",
        "domain_keyword_module_index.json",
        "domain_keyword_module_index.md",
        "collectibles",
        "petSkills",
        "sourceMapsFound",
    ] {
        assert!(
            script.contains(required),
            "minified domain index script must declare {required}"
        );
    }
}

#[test]
fn sio_minified_formula_table_extractor_declares_runtime_exports() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let script_path = repo_root.join("frontend/scripts/sio_minified_formula_table_extract.mjs");
    let script = std::fs::read_to_string(&script_path)
        .unwrap_or_else(|error| panic!("missing {}: {error}", script_path.display()));

    for required in [
        "loadWebpackModules",
        "extractRuntimeExports",
        "formula_table_runtime_exports.json",
        "formula_table_runtime_exports.md",
        "module37013",
        "module32085",
        "fullSioEquivalent",
    ] {
        assert!(
            script.contains(required),
            "formula/table extractor must declare {required}"
        );
    }
}

#[test]
fn sio_minified_formula_table_extractor_declares_module32085_formula_snippets() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let script_path = repo_root.join("frontend/scripts/sio_minified_formula_table_extract.mjs");
    let script = std::fs::read_to_string(&script_path)
        .unwrap_or_else(|error| panic!("missing {}: {error}", script_path.display()));

    for required in [
        "module32085FormulaPaths",
        "module32085_mg_damage_coefficients.json",
        "formulaCandidateExports",
        "damageCoefficientTable",
    ] {
        assert!(
            script.contains(required),
            "formula/table extractor must declare module32085 formula artifact {required}"
        );
    }
}

#[test]
fn sio_minified_formula_table_extractor_declares_module32085_internal_formula_candidates() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let script_path = repo_root.join("frontend/scripts/sio_minified_formula_table_extract.mjs");
    let script = std::fs::read_to_string(&script_path)
        .unwrap_or_else(|error| panic!("missing {}: {error}", script_path.display()));

    for required in [
        "module32085_full_pretty.js",
        "module32085_export_local_map.json",
        "internalFormulaCandidates",
        "extractInternalFormulaCandidates",
    ] {
        assert!(
            script.contains(required),
            "formula/table extractor must declare module32085 internal formula artifact {required}"
        );
    }
}

#[test]
fn sio_minified_formula_table_extractor_declares_key_formula_modules() {
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let script_path = repo_root.join("frontend/scripts/sio_minified_formula_table_extract.mjs");
    let script = std::fs::read_to_string(&script_path)
        .unwrap_or_else(|error| panic!("missing {}: {error}", script_path.display()));

    for required in [
        "formulaModuleIds",
        "module67727",
        "module57223",
        "module42806",
        "module24804",
        "module5834",
        "keyFormulaModules",
    ] {
        assert!(
            script.contains(required),
            "formula/table extractor must declare key formula module {required}"
        );
    }
}

#[test]
fn sio_compact_default_surface_live_base_stats_keep_generated_account_deltas() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    fn close_enough(actual: f64, expected: f64) -> bool {
        let tolerance = expected.abs().max(1.0) * 1e-9;
        (actual - expected).abs() <= tolerance
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let mut failures = Vec::new();
    let covered_cases = [
        "collectibles_custom_sets_legend_thresholds",
        "mounts_enabled_lines",
        "lme2_testament_thresholds",
        "ee_static_skill_groups",
        "active_skills_slots_and_map",
    ];

    for trace_case in trace["cases"].as_array().expect("trace cases") {
        let case_id = trace_case["id"].as_str().expect("case id");
        if !covered_cases.contains(&case_id) {
            continue;
        }
        let worker_case = worker["cases"]
            .as_array()
            .expect("worker cases")
            .iter()
            .find(|item| item["id"].as_str() == Some(case_id))
            .unwrap_or_else(|| panic!("missing worker case {case_id}"));
        let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
        let config_string = worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap();
        let compact: Value = serde_json::from_str(config_string).unwrap();
        let decoded = decode_sio_lm_compact_summary(&compact);
        let actual = decoded["derivedBaseStats"]
            .as_object()
            .expect("derived base stats");
        let expected = trace_case["baseStats"]
            .as_object()
            .expect("live base stats");

        for (stat, expected_value) in expected {
            let expected_number = expected_value.as_f64().unwrap();
            let actual_number = actual.get(stat).and_then(Value::as_f64).unwrap_or(0.0);
            if !close_enough(actual_number, expected_number) {
                failures.push(format!(
                    "{case_id} {stat}: actual={actual_number} expected={expected_number}"
                ));
            }
        }
        for (stat, actual_value) in actual {
            if !expected.contains_key(stat) {
                let actual_number = actual_value.as_f64().unwrap();
                if !close_enough(actual_number, 0.0) {
                    failures.push(format!(
                        "{case_id} {stat}: actual={actual_number} expected=0"
                    ));
                }
            }
        }
    }

    assert!(
        failures.is_empty(),
        "default-surface generated compact derivedBaseStats mismatch live trace:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_compact_survivor_harmony_live_base_stats_are_generic() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    fn close_enough(actual: f64, expected: f64) -> bool {
        let tolerance = expected.abs().max(1.0) * 1e-9;
        (actual - expected).abs() <= tolerance
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();

    let case_id = "survivors_passives_harmony_teamwork";
    let worker_case = worker["cases"]
        .as_array()
        .expect("worker cases")
        .iter()
        .find(|item| item["id"].as_str() == Some(case_id))
        .expect("worker survivor/harmony case");
    let trace_case = trace["cases"]
        .as_array()
        .expect("trace cases")
        .iter()
        .find(|item| item["id"].as_str() == Some(case_id))
        .expect("trace survivor/harmony case");

    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
    let config_string = worker_case["skillsRequests"][request_index]["configString"]
        .as_str()
        .unwrap();
    let compact: Value = serde_json::from_str(config_string).unwrap();
    let decoded = decode_sio_lm_compact_summary(&compact);
    let actual = decoded["derivedBaseStats"]
        .as_object()
        .expect("derived base stats");
    let expected = trace_case["baseStats"]
        .as_object()
        .expect("live base stats");

    let mut failures = Vec::new();
    for (stat, expected_value) in expected {
        let expected_number = expected_value.as_f64().unwrap();
        let actual_number = actual.get(stat).and_then(Value::as_f64).unwrap_or(0.0);
        if !close_enough(actual_number, expected_number) {
            failures.push(format!(
                "{case_id} {stat}: actual={actual_number} expected={expected_number}"
            ));
        }
    }
    for (stat, actual_value) in actual {
        if !expected.contains_key(stat) {
            let actual_number = actual_value.as_f64().unwrap();
            if !close_enough(actual_number, 0.0) {
                failures.push(format!(
                    "{case_id} {stat}: actual={actual_number} expected=0"
                ));
            }
        }
    }

    assert!(
        failures.is_empty(),
        "survivor/harmony generated compact derivedBaseStats mismatch live trace:\n{}",
        failures.join("\n")
    );
}

#[test]
fn sio_lm_compact_generic_base_stats_derive_endgame_account_profile_without_fixture_match() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/shared_qN5n40/worker_decoded_summary.json");
    if !worker_path.exists() {
        eprintln!(
            "skipping generic endgame profile derivation check; artifact missing: {}",
            worker_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");
    compact["bi"]["bj"] = json!(0);

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["accountInputs"]["pets"]["active"], json!("None"));
    assert_eq!(decoded["derivedBaseStats"]["atkHero"], json!(53_615.0));
    assert_eq!(
        decoded["derivedBaseStats"]["harmonyMetalia"],
        json!(107.03999999999999)
    );
    assert_eq!(decoded["derivedBaseStats"]["harmonyTaloxa"], json!(85.8));
    assert_eq!(decoded["derivedBaseStats"]["crimsonBat"], json!(2.0));
    assert!(decoded["derivedBaseStats"]["xenoDamage"].is_null());
    assert_eq!(
        decoded["derivedBaseStats"]["voidNeckBoostUptime"],
        json!(1.0)
    );
}

#[test]
fn sio_lm_compact_generic_pet_skill_sync_rate_derives_xeno_sync_rate() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "a": {
            "b": 1,
            "g": 80,
            "c": 22,
            "d": 9,
            "e": 11,
            "I": "lme1"
        },
        "h": [
            {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
            {"r": 13}
        ],
        "l": [
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"P": 70}
        ],
        "bi": {
            "bj": 8,
            "r": [10, null, 4, 3, 3, 10, 4, 10]
        }
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["pets"]["skillSettings"][5]["skill"],
        json!("Sync Rate")
    );
    assert_eq!(
        decoded["accountInputs"]["pets"]["skillSettings"][5]["value"],
        json!(70)
    );
    assert_eq!(decoded["derivedBaseStats"]["xenoSyncRate"], json!(85.0));
}

#[test]
fn sio_lm_compact_generic_xeno_pet_stats_apply_without_endgame_profile() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "l": [
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"s": 1, "B": 2},
            {"P": 70}
        ],
        "bi": {
            "bj": 3,
            "r": [0, 0, 0]
        }
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["accountInputs"]["pets"]["active"], json!("Capy"));
    assert_eq!(decoded["derivedBaseStats"]["xenoSyncRate"], json!(70.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResChance"], json!(10.0));
    assert_eq!(decoded["derivedBaseStats"]["xenoResDamage"], json!(10.0));
}

#[test]
fn sio_lm_compact_generic_pet_skill_stats_fold_default_pet_skills() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "l": [
            {"s": 1, "B": 2},
            {"s": 1, "B": 0},
            {"s": 1, "B": 2}
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["pets"]["skillSettings"][0]["skill"],
        json!("Motivation")
    );
    assert_eq!(
        decoded["accountInputs"]["pets"]["skillSettings"][0]["rarity"],
        json!("Super")
    );
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(5.0));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(206.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(5.0));
}

#[test]
fn sio_lm_compact_generic_pet_skill_stats_apply_for_synergy_endgame_account() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "a": {
            "b": 1,
            "g": 80,
            "c": 22,
            "d": 9,
            "e": 11
        },
        "h": [
            {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
            {"r": 13}
        ],
        "l": [
            {"s": 1, "B": 2},
            {"s": 1, "B": 0},
            {"s": 1, "B": 2}
        ]
    });
    let mut baseline = compact.clone();
    baseline.as_object_mut().unwrap().remove("l");

    let baseline_decoded = decode_sio_lm_compact_summary(&baseline);
    let decoded = decode_sio_lm_compact_summary(&compact);

    let crit_rate_delta = decoded["derivedBaseStats"]["critRate"]
        .as_f64()
        .unwrap_or(0.0)
        - baseline_decoded["derivedBaseStats"]["critRate"]
            .as_f64()
            .unwrap_or(0.0);
    let crit_damage_delta = decoded["derivedBaseStats"]["critDamage"]
        .as_f64()
        .unwrap_or(0.0)
        - baseline_decoded["derivedBaseStats"]["critDamage"]
            .as_f64()
            .unwrap_or(0.0);
    let skill_damage_delta = decoded["derivedBaseStats"]["skillDamage"]
        .as_f64()
        .unwrap_or(0.0)
        - baseline_decoded["derivedBaseStats"]["skillDamage"]
            .as_f64()
            .unwrap_or(0.0);

    assert!(
        (crit_rate_delta - 5.0).abs() < 1e-9,
        "synergy.petSkills.critRate.delta: actual {crit_rate_delta} expected 5"
    );
    assert!(
        (crit_damage_delta - 6.0).abs() < 1e-9,
        "synergy.petSkills.critDamage.delta: actual {crit_damage_delta} expected 6"
    );
    assert!(
        (skill_damage_delta - 5.0).abs() < 1e-9,
        "synergy.petSkills.skillDamage.delta: actual {skill_damage_delta} expected 5"
    );
}

#[test]
fn sio_lm_compact_generic_main_hero_missing_level_uses_live_default_level() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "a": {
            "b": 1,
            "g": 80,
            "c": 22,
            "d": 9,
            "e": 11
        },
        "h": [
            {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
            {"r": 13}
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["survivors"]["Venato"]["level"],
        json!(null)
    );
    assert_eq!(decoded["derivedBaseStats"]["atkHeroPercent"], json!(18.0));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(480.0));
}

#[test]
fn sio_lm_compact_generic_static_base_stats_are_unconditional() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let decoded = decode_sio_lm_compact_summary(&json!({}));

    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(200.0));
    assert_eq!(
        decoded["derivedBaseStats"]["shieldDamageUptime"],
        json!(1.0)
    );
    assert_eq!(
        decoded["derivedBaseStats"]["voidNeckBoostUptime"],
        json!(1.0)
    );
}

#[test]
fn sio_lm_compact_generic_synergy_support_missing_levels_use_live_default_level() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let mut survivors = vec![json!(null); 22];
    survivors[2] = json!({ "r": 6 });
    survivors[3] = json!({ "r": 6 });
    survivors[21] = json!({ "r": 6 });

    let decoded = decode_sio_lm_compact_summary(&json!({
        "a": {
            "b": 1,
            "c": 22
        },
        "h": survivors
    }));

    assert_eq!(
        decoded["accountInputs"]["survivors"]["Catnips"]["level"],
        json!(null)
    );
    assert_eq!(
        decoded["accountInputs"]["survivors"]["Worm"]["level"],
        json!(null)
    );
    assert_eq!(decoded["derivedBaseStats"]["atkHeroPercent"], json!(32.0));
}

#[test]
fn sio_lm_compact_generic_non_teamwork_support_stars_cap_at_five() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let mut survivors = vec![json!(null); 22];
    survivors[10] = json!({ "r": 12 });

    let decoded = decode_sio_lm_compact_summary(&json!({
        "a": {
            "c": 22
        },
        "h": survivors
    }));

    assert_eq!(
        decoded["accountInputs"]["survivors"]["Taloxa"]["stars"],
        json!(12)
    );
    assert_eq!(
        decoded["derivedBaseStats"]["laceration"]
            .as_f64()
            .unwrap_or(0.0),
        0.0
    );
    assert_eq!(decoded["derivedBaseStats"]["atkHeroPercent"], json!(8.0));
}

#[test]
fn sio_lm_compact_generic_taloxa_main_passive_postprocesses_live_surface() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let mut survivors = vec![json!(null); 22];
    survivors[10] = json!({ "r": 10, "q": 120 });

    let decoded = decode_sio_lm_compact_summary(&json!({
        "a": {
            "c": 11
        },
        "h": survivors
    }));

    assert_eq!(
        decoded["derivedBaseStats"]["taloxaOverloadEff"],
        json!(75.0)
    );
    assert_eq!(decoded["derivedBaseStats"]["taloxaOverload"], json!(45.0));
    assert_eq!(decoded["derivedBaseStats"]["taloxaBeam"], json!(4.5));
}

#[test]
fn sio_lm_compact_generic_hp_bullet_skill_derives_boost_without_account_surface() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let decoded = decode_sio_lm_compact_summary(&json!({
        "p": [0, 1]
    }));

    assert_eq!(decoded["skills"]["HP Bullet"], json!(true));
    assert_eq!(decoded["derivedBaseStats"]["hpBulletBoost"], json!(50.0));
}

#[test]
fn sio_lm_compact_generic_evo_tree_stats_apply_minified_table() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "k": [1, 1, 0, 1]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["evo"]["Expose Weakness"],
        json!(true)
    );
    assert_eq!(
        decoded["accountInputs"]["evo"]["Viva la Materia"],
        json!(true)
    );
    assert_eq!(decoded["accountInputs"]["evo"]["Watchmaker"], json!(true));
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(8.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(5.0));
    assert_eq!(decoded["derivedBaseStats"]["atkEquipPercent"], json!(5.0));
}

#[test]
fn sio_lm_compact_generic_mount_line_stats_do_not_invent_payload_when_missing() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "bJ": {
            "bM": [
                {"s": 0, "r": 0},
                {"s": 1, "r": 8}
            ]
        }
    });
    let baseline = json!({});

    let baseline_decoded = decode_sio_lm_compact_summary(&baseline);
    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["mounts"][1]["enabled"],
        json!(true)
    );
    assert_eq!(decoded["accountInputs"]["mounts"][1]["stars"], json!(8));
    for stat in [
        "chilled",
        "damageBoss",
        "critDamage",
        "laceration",
        "poisoned",
        "shieldDamage",
        "skillDamage",
        "weakened",
    ] {
        let baseline_value = baseline_decoded["derivedBaseStats"][stat]
            .as_f64()
            .unwrap_or(0.0);
        let actual_value = decoded["derivedBaseStats"][stat].as_f64().unwrap_or(0.0);
        assert!(
            (actual_value - baseline_value).abs() <= 1e-12,
            "{stat} must not be derived from compact mount row without bK payload: actual {actual_value}, baseline {baseline_value}"
        );
    }
}

#[test]
fn sio_lm_compact_generic_mount_payload_stats_use_puzzle_multiplier() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "bJ": {
            "bM": [
                {"s": 1, "r": 6, "bK": {"skillDamage": 89, "damageBoss": 33.5}},
                {"s": 1, "r": 6, "bK": {"shieldDamage": 56, "chilled": 27}},
                {"s": 1, "r": 2, "bK": {"critDamage": 22, "weakened": 50}}
            ]
        }
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(71.2));
    assert_eq!(decoded["derivedBaseStats"]["damageBoss"], json!(26.8));
    assert_eq!(
        decoded["derivedBaseStats"]["shieldDamage"],
        json!(30.800000000000004)
    );
    assert_eq!(
        decoded["derivedBaseStats"]["chilled"],
        json!(14.850000000000001)
    );
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(205.28));
    assert_eq!(decoded["derivedBaseStats"]["weakened"], json!(12.0));
}

#[test]
fn sio_lm_compact_generic_better_mount_star_five_uses_live_puzzle_multiplier() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "bJ": {
            "bM": [
                null,
                null,
                {"s": 1, "r": 5, "bK": {"weakened": 100}}
            ]
        }
    });
    let baseline = decode_sio_lm_compact_summary(&json!({}));
    let decoded = decode_sio_lm_compact_summary(&compact);
    let baseline_value = baseline["derivedBaseStats"]["weakened"]
        .as_f64()
        .unwrap_or(0.0);
    let actual_value = decoded["derivedBaseStats"]["weakened"]
        .as_f64()
        .unwrap_or(0.0);

    assert!(
        (actual_value - baseline_value - 38.0).abs() <= 1e-12,
        "Better star 5 puzzle multiplier must be 0.38: actual {actual_value}, baseline {baseline_value}"
    );
}

#[test]
fn sio_lm_compact_generic_active_hoverboard_derives_lines_and_mount_damage() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "bJ": {
            "bj": 1,
            "bM": [
                null,
                {"s": 1, "r": 8, "bL": 8}
            ]
        }
    });
    let baseline = decode_sio_lm_compact_summary(&json!({}));
    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["mounts"][1]["name"],
        json!("Tech Hoverboard")
    );
    assert_eq!(decoded["accountInputs"]["mounts"][1]["active"], json!(true));
    assert_eq!(decoded["accountInputs"]["mounts"][1]["lines"], json!(8));
    assert_eq!(decoded["derivedBaseStats"]["mountDamage"], json!(50000.0));
    for (stat, expected_delta) in [
        ("chilled", 200.0),
        ("skillDamage", 100.0),
        ("shieldDamage", 100.0),
    ] {
        let baseline_value = baseline["derivedBaseStats"][stat].as_f64().unwrap_or(0.0);
        let actual_value = decoded["derivedBaseStats"][stat].as_f64().unwrap_or(0.0);
        assert!(
            (actual_value - baseline_value - expected_delta).abs() <= 1e-12,
            "{stat} delta must match active Tech Hoverboard line table: actual {actual_value}, baseline {baseline_value}, expected delta {expected_delta}"
        );
    }
}

#[test]
fn sio_lm_compact_generic_active_electric_scooter_uses_live_better_tables() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "bJ": {
            "bj": 2,
            "bM": [
                null,
                null,
                {"s": 1, "r": 8, "bL": 8, "bK": {"critDamage": 100}}
            ]
        }
    });
    let baseline = decode_sio_lm_compact_summary(&json!({}));
    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["mounts"][2]["name"],
        json!("Electric Scooter")
    );
    assert_eq!(decoded["accountInputs"]["mounts"][2]["active"], json!(true));
    assert_eq!(decoded["derivedBaseStats"]["mountDamage"], json!(17710.0));
    for (stat, expected_delta) in [
        ("weakened", 80.0),
        ("critDamage", 260.0),
        ("laceration", 30.0),
    ] {
        let baseline_value = baseline["derivedBaseStats"][stat].as_f64().unwrap_or(0.0);
        let actual_value = decoded["derivedBaseStats"][stat].as_f64().unwrap_or(0.0);
        assert!(
            (actual_value - baseline_value - expected_delta).abs() <= 1e-12,
            "{stat} delta must match Electric Scooter line plus puzzle tables: actual {actual_value}, baseline {baseline_value}, expected delta {expected_delta}"
        );
    }
}

#[test]
fn sio_lm_compact_generic_teamwork_taloxa_uses_active_skill_laceration_uptime() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "a": {
            "f": [11]
        },
        "h": [
            {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"r": 10}
        ],
        "p": [0, 0, 0, 0, 0, 1]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["meta"]["teamwork"],
        json!(["Taloxa"])
    );
    assert_eq!(
        decoded["accountInputs"]["survivors"]["Taloxa"]["stars"],
        json!(10)
    );
    assert_eq!(decoded["skills"]["Drone Mode"], json!(true));
    assert_eq!(decoded["derivedBaseStats"]["lacerationUptime"], json!(1.0));
}

#[test]
fn sio_lm_compact_generic_taloxa_main_and_teamwork_laceration_uptime_clamps_to_unit_interval() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "a": {
            "b": 1,
            "g": 80,
            "c": 11,
            "f": [11]
        },
        "h": [
            {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"r": 12, "q": 120}
        ],
        "p": [0, 0, 0, 0, 0, 1]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["meta"]["mainHero"],
        json!("Taloxa")
    );
    assert_eq!(
        decoded["accountInputs"]["meta"]["teamwork"],
        json!(["Taloxa"])
    );
    assert_eq!(decoded["skills"]["Drone Mode"], json!(true));
    assert_eq!(decoded["derivedBaseStats"]["lacerationUptime"], json!(1.0));
}

#[test]
fn sio_lm_compact_generic_teamwork_donatello_counts_sp_teamwork_stats() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let compact = json!({
        "a": {
            "b": 0,
            "f": [12, 17]
        },
        "h": [
            {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {"r": 12}
        ]
    });

    let decoded = decode_sio_lm_compact_summary(&compact);

    assert_eq!(
        decoded["accountInputs"]["meta"]["teamwork"],
        json!(["Raphael", "Michelangelo"])
    );
    assert_eq!(
        decoded["accountInputs"]["survivors"]["Donatello"]["stars"],
        json!(12)
    );
    assert_eq!(decoded["derivedBaseStats"]["critRate"], json!(14.0));
    assert_eq!(decoded["derivedBaseStats"]["critDamage"], json!(206.0));
    assert_eq!(decoded["derivedBaseStats"]["skillDamage"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["shieldDamage"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["laceration"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["poisoned"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["weakened"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["chilled"], json!(6.0));
    assert_eq!(decoded["derivedBaseStats"]["lacerationUptime"], json!(0.25));
}

#[test]
fn sio_lm_compact_generic_transform_derives_worm_rex_evo_cooldown_reduction() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "a": {
                    "I": "lme1",
                    "c": 4,
                    "(": 1000,
                    "$": 0
                },
                "p": [1],
                "h": [
                    {"r": 0},
                    {"r": 0},
                    {"r": 0},
                    {"r": 12, "q": 120}
                ],
                "k": [0, 0, 1, 0],
                "bi": {
                    "bj": 1,
                    "r": [6]
                }
            }
        }
    }))
    .expect("compact-only sioLm context");

    assert_eq!(context.enabled_skills, vec!["Energy Cube".to_string()]);

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );
    let rex_uptime = 3.5 / 11.0;
    let rex_factor = (100.0 - 5.0 * rex_uptime) * 0.01;
    let expected = 1.0 / (0.95 * 0.60 * 0.80 * rex_factor);
    let actual = reconstructed["stats"]["cooldownReduction"]
        .as_f64()
        .unwrap_or(0.0);
    assert!(
        (actual - expected).abs() <= 1e-12,
        "cooldownReduction actual {actual} expected {expected}"
    );
    assert!(
        (reconstructed["passivePools"][3].as_f64().unwrap_or(0.0) - expected).abs() <= 1e-12,
        "{}",
        reconstructed["passivePools"][3]
    );
}

#[test]
fn sio_lm_compact_generic_pet_skill_battle_lust_gary_adjust_rex_cooldown() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "a": {
                    "I": "lme1",
                    "(": 1000,
                    "$": 0
                },
                "p": [1],
                "l": [
                    {"s": 1, "B": 2},
                    {"s": 1, "B": 2},
                    {"s": 1, "B": 2},
                    {"s": 1, "B": 1},
                    {"s": 1, "B": 2}
                ],
                "bi": {
                    "bj": 1,
                    "r": [7]
                }
            }
        }
    }))
    .expect("compact-only sioLm context");
    assert_eq!(context.enabled_skills, vec!["Energy Cube".to_string()]);

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );
    let battle_lust_reduction = 0.20;
    let gary_reduction = 0.20;
    let rex_uptime =
        (6.5_f64 / (11.0 * (1.0 - battle_lust_reduction) * (1.0 - gary_reduction))).min(1.0);
    let rex_factor = (100.0 - 5.0 * rex_uptime) * 0.01;
    let expected = 1.0 / (0.60 * rex_factor);
    let actual = reconstructed["stats"]["cooldownReduction"]
        .as_f64()
        .unwrap_or(0.0);
    assert!(
        (actual - expected).abs() <= 1e-12,
        "cooldownReduction actual {actual} expected {expected}"
    );
}

#[test]
fn sio_lm_compact_generic_equipment_transform_keeps_account_cooldown_inputs() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "a": {
                    "I": "lme1",
                    "c": 4,
                    "(": 1000,
                    "$": 0
                },
                "p": [1],
                "h": [
                    {"r": 0},
                    {"r": 0},
                    {"r": 0},
                    {"r": 12, "q": 120}
                ],
                "j": [
                    {"t": 1, "w": 1, "u": 1, "v": 0, "bg": 0, "x": 0}
                ],
                "k": [0, 0, 1, 0],
                "bi": {
                    "bj": 1,
                    "r": [6]
                }
            }
        }
    }))
    .expect("compact-only sioLm context");

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );
    let rex_uptime = 3.5 / 11.0;
    let rex_factor = (100.0 - 5.0 * rex_uptime) * 0.01;
    let expected = 1.0 / (0.95 * 0.60 * 0.80 * rex_factor);
    let actual = reconstructed["stats"]["cooldownReduction"]
        .as_f64()
        .unwrap_or(0.0);
    assert!(
        (actual - expected).abs() <= 1e-12,
        "cooldownReduction actual {actual} expected {expected}"
    );
    assert!(
        (reconstructed["passivePools"][3].as_f64().unwrap_or(0.0) - expected).abs() <= 1e-12,
        "{}",
        reconstructed["passivePools"][3]
    );
    assert!(
        reconstructed["stats"]["skillDamage"]
            .as_f64()
            .unwrap_or(0.0)
            > 0.0,
        "{}",
        reconstructed["stats"]
    );
}

#[test]
fn sio_lm_compact_generic_equipment_transform_derives_void_neck_and_twisting_belt_boosts() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn context_for_game_mode(game_mode: &str) -> serde_json::Value {
        json!({
            "sioLm": {
                "compactConfig": {
                    "a": {
                        "I": game_mode,
                        "(": 1000,
                        "$": 0
                    },
                    "j": [
                        {"t": 5, "w": 4, "u": 4, "v": 8, "bg": 0, "x": 3},
                        {"t": 7, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 3}
                    ]
                }
            }
        })
    }

    for (game_mode, expected_void_boost) in [("lme2", 1.4), ("ee", 1.9599999999999997)] {
        let context = sio_lm_context_from_player_state(&context_for_game_mode(game_mode))
            .expect("compact-only sioLm context");
        let reconstructed = reconstruct_sio_lm_inputs(
            &context.base_stats,
            &json!({}),
            &context.enabled_skills,
            &context.transform,
        );

        assert_eq!(context.game_mode, game_mode);
        assert_eq!(
            reconstructed["stats"]["voidNeckBoost"],
            json!(expected_void_boost)
        );
        assert_eq!(reconstructed["stats"]["voidNeckBoostUptime"], json!(1.0));
        assert_eq!(reconstructed["stats"]["minEnergyFlux"], json!(80.0));
        assert_eq!(reconstructed["stats"]["maxEnergyFlux"], json!(200.0));
        assert_eq!(reconstructed["stats"]["chaosBeltBoost"], json!(1.4));
    }
}

#[test]
fn sio_lm_high_resonance_active_tech_stats_match_module37013_tables() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, SioLmStatTransform};

    let techs = json!({
        "Energy Guidance System": {
            "deployed": true,
            "mode": "Drone Mode",
            "rarity": "Eternal",
            "resonance": 15000,
            "overload": 18
        },
        "Antimatter Maintainer": {
            "deployed": true,
            "mode": "Drill Shot Mode",
            "rarity": "Eternal",
            "resonance": 7800,
            "overload": 8
        },
        "Quantum Nanobot": {
            "deployed": true,
            "mode": "Soccer Mode",
            "rarity": "Eternal",
            "resonance": 3600,
            "overload": 0
        },
        "Phase Driver": {
            "deployed": true,
            "mode": "Lightning Mode",
            "rarity": "Eternal",
            "resonance": 12000,
            "overload": 0
        },
        "Exo-radicator": {
            "deployed": true,
            "mode": "Laser Mode",
            "rarity": "Eternal",
            "resonance": 3000,
            "overload": 0
        },
        "Hi-Gravity Pulser": {
            "deployed": true,
            "mode": "Molotov Mode",
            "rarity": "Eternal",
            "resonance": 4800,
            "overload": 0
        }
    });
    let enabled_skills = [
        "Drone Mode",
        "Drill Shot Mode",
        "Soccer Mode",
        "Lightning Mode",
        "Laser Mode",
        "Molotov Mode",
    ]
    .iter()
    .map(|skill| (*skill).to_string())
    .collect::<Vec<_>>();

    let reconstructed = reconstruct_sio_lm_inputs(
        &json!({}),
        &techs,
        &enabled_skills,
        &SioLmStatTransform::empty(),
    );
    let stats = &reconstructed["stats"];

    for (stat, expected) in [
        ("skillDamage", 880.0),
        ("weakened", 350.0),
        ("vulnerability", 460.0),
        ("laceration", 195.0),
        ("critDamage", 705.0),
        ("shieldDamage", 320.0),
        ("chilled", 250.0),
        ("critRate", 20.0),
        ("poisoned", 95.0),
        ("weakenedUptime", 1.0),
        ("chilledUptime", 2.0),
        ("lacerationUptime", 2.0),
        ("poisonedUptime", 1.0),
    ] {
        let actual = stats[stat].as_f64().unwrap_or(0.0);
        assert!(
            (actual - expected).abs() <= 1e-12,
            "{stat}: actual {actual} expected {expected}"
        );
    }
}

#[test]
fn sio_lm_compact_ss_equipment_uses_twin_lance_dynamic_af_tables() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "_V": 5,
                "j": [
                    {
                        "t": 1,
                        "w": 5,
                        "u": 5,
                        "v": 10,
                        "bg": 12,
                        "bh": 0,
                        "bo": 0,
                        "x": 0
                    }
                ]
            }
        }
    }))
    .expect("compact-only sioLm context");

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );
    let stats = reconstructed["stats"].as_object().expect("stats object");
    for (key, expected) in [
        ("atkPercent", 105.0),
        ("atkFinal", 16_000.0),
        ("skillDamage", 380.0),
        ("vulnerability", 60.0),
        ("ssMiscPath", 715.83),
        ("weakened", 20.0),
        ("chilled", 176.416_666_666_666_69),
        ("laceration", 40.0),
    ] {
        let actual = stats
            .get(key)
            .and_then(|value| value.as_f64())
            .unwrap_or(0.0);
        assert!(
            (actual - expected).abs() <= 1e-9,
            "{key}: actual {actual} expected {expected}"
        );
    }
}

#[test]
fn sio_lm_compact_ss_equipment_uses_deployed_dynamic_af_tables_for_all_slots() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let cases: [(&str, serde_json::Value, &[(&str, f64)]); 7] = [
        (
            "evervoid armor",
            json!({"t": 2, "w": 5, "u": 4, "v": 10, "bg": 0, "x": 0}),
            &[
                ("clarity", 35.0),
                ("shieldDamage", 80.0),
                ("skillDamage", 50.0),
                ("poisoned", 30.0),
            ],
        ),
        (
            "judgment necklace",
            json!({"t": 4, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 0}),
            &[
                ("atkPercent", 60.0),
                ("weakened", 109.0),
                ("weakenedUptime", 1.0),
                ("skillDamage", 110.0),
                ("atkFinal", 16_000.0),
                ("critDamage", 121.0),
            ],
        ),
        (
            "stardust sash",
            json!({"t": 6, "w": 5, "u": 4, "v": 10, "bg": 0, "x": 0}),
            &[
                ("skillDamage", 105.0),
                ("eternalMultiplier", 65.0),
                ("critDamage", 70.0),
                ("shieldDamage", 60.0),
            ],
        ),
        (
            "moonscar bracer",
            json!({"t": 8, "w": 4, "u": 5, "v": 10, "bg": 0, "x": 0}),
            &[
                ("atkPercent", 60.0),
                ("atkFinal", 16_000.0),
                ("critRate", 80.0),
                ("critRateFlux", 10.0),
                ("critDamage", 140.0),
                ("shieldDamage", 70.0),
                ("ssGlovesLaser", 65.0),
                ("poisoned", 30.0),
            ],
        ),
        (
            "glacial warboots",
            json!({"t": 10, "w": 5, "u": 4, "v": 10, "bg": 0, "x": 0}),
            &[
                ("chilled", 115.0),
                ("chilledUptime", 1.0),
                ("glacialBloodline", 84.6),
                ("shieldDamage", 65.0),
                ("vulnerability", 10.0),
                ("skillDamage", 20.0),
            ],
        ),
        (
            "voidwaker emblem",
            json!({"t": 5, "w": 0, "u": 0, "v": 0, "bg": 0, "x": 2}),
            &[
                ("atkPercent", 60.0),
                ("critRate", 40.0),
                ("voidNeckBoost", 1.4),
            ],
        ),
        (
            "twisting belt",
            json!({"t": 7, "w": 0, "u": 0, "v": 0, "bg": 0, "x": 3}),
            &[
                ("minEnergyFlux", 80.0),
                ("maxEnergyFlux", 200.0),
                ("chaosBeltBoost", 1.4),
            ],
        ),
    ];

    for (label, item, expected_stats) in cases {
        let context = sio_lm_context_from_player_state(&json!({
            "sioLm": {
                "compactConfig": {
                    "_V": 5,
                    "j": [item]
                },
                "baseStats": {}
            }
        }))
        .unwrap_or_else(|| panic!("compact-only sioLm context for {label}"));
        let reconstructed = reconstruct_sio_lm_inputs(
            &context.base_stats,
            &json!({}),
            &context.enabled_skills,
            &context.transform,
        );
        let stats = reconstructed["stats"].as_object().expect("stats object");
        for (key, expected) in expected_stats {
            let actual = stats
                .get(*key)
                .and_then(|value| value.as_f64())
                .unwrap_or(0.0);
            assert!(
                (actual - expected).abs() <= 1e-9,
                "{label}.{key}: actual {actual} expected {expected}"
            );
        }
    }
}

#[test]
fn sio_lm_compact_judgment_necklace_evolve_passives_multiplies_adrenaline_like_live_postprocess() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "_V": 5,
                "j": [
                    {"t": 4, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 0}
                ]
            },
            "baseStats": {
                "adrenaline": 60.0
            }
        }
    }))
    .expect("compact-only sioLm context");
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );

    assert_eq!(reconstructed["stats"]["adrenaline"], json!(72.0));
}

#[test]
fn sio_lm_compact_trace_postprocess_clamps_condition_uptimes_like_live() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "_V": 5,
                "j": [
                    {"t": 4, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 0}
                ]
            },
            "baseStats": {
                "poisonedUptime": 2.111111111111111,
                "chilledUptime": 1.1111111111111112,
                "shieldDamageUptime": 1.4
            }
        }
    }))
    .expect("compact-only sioLm context");
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );

    for key in ["poisonedUptime", "chilledUptime", "shieldDamageUptime"] {
        assert_eq!(reconstructed["stats"][key], json!(1.0), "{key}");
    }
}

#[test]
fn sio_lm_compact_ss_equipment_applies_items_optimizer_total_core_specials() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "_V": 5,
                "j": [
                    {"t": 1, "w": 5, "u": 5, "v": 10, "bg": 8, "bh": 0, "bo": 0, "x": 0},
                    {"t": 2, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 0},
                    {"t": 4, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 0},
                    {"t": 7, "w": 0, "u": 0, "v": 10, "bg": 0, "x": 3},
                    {"t": 8, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 0},
                    {"t": 10, "w": 5, "u": 5, "v": 10, "bg": 0, "x": 0}
                ]
            },
            "baseStats": {}
        }
    }))
    .expect("compact-only sioLm context");
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );
    let stats = reconstructed["stats"].as_object().expect("stats object");
    for (key, expected) in [
        ("skillDamage", 635.0),
        ("shieldDamage", 415.0),
        ("critDamage", 536.0),
        ("critRate", 80.0),
        ("critRateFlux", 10.0),
        ("poisoned", 90.0),
        ("damageBoss", 52.0),
        ("glacialBloodline", 84.6),
        ("ssMiscPath", 2_071.224),
    ] {
        let actual = stats
            .get(key)
            .and_then(|value| value.as_f64())
            .unwrap_or(0.0);
        assert!(
            (actual - expected).abs() <= 1e-9,
            "{key}: actual {actual} expected {expected}"
        );
    }
}

#[test]
fn sio_lm_compact_ss_equipment_decodes_live_transmute_keys() {
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let decoded = decode_sio_lm_compact_summary(&json!({
        "_V": 5,
        "j": [
            {
                "t": 1,
                "w": 5,
                "u": 5,
                "v": 10,
                "bg": 8,
                "bh": 0,
                "bo": 1,
                "x": 0
            }
        ]
    }));
    let weapon = &decoded["ssEquipment"][0];

    assert_eq!(weapon["transmuteEffect"], json!(0));
    assert_eq!(weapon["transmuteCondition"], json!(1));
}

#[test]
fn sio_lm_compact_ss_equipment_applies_transmute_effect_and_damage_formula() {
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": {
                "_V": 5,
                "j": [
                    {
                        "t": 1,
                        "w": 0,
                        "u": 0,
                        "v": 0,
                        "bg": 7,
                        "bh": 1,
                        "bo": 2,
                        "x": 0
                    }
                ]
            }
        }
    }))
    .expect("compact-only sioLm context");

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &json!({}),
        &context.enabled_skills,
        &context.transform,
    );
    let stats = reconstructed["stats"].as_object().expect("stats object");
    let poisoned = stats
        .get("poisoned")
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    let damage_transmute = stats
        .get("damageTransmute")
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);

    assert!(
        (poisoned - 166.833_333_333_333_34).abs() <= 1e-9,
        "poisoned transmute effect: actual {poisoned}"
    );
    assert!(
        (damage_transmute - 14.3).abs() <= 1e-9,
        "damageTransmute: actual {damage_transmute}"
    );
}

#[test]
fn sio_lm_ee_xeno_resonance_multiplier_ignores_lme_testament_debuffs() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::decode_sio_lm_compact_summary;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/shared_4ZgaBw/lm_trace_summary.json");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/shared_4ZgaBw/worker_decoded_summary.json");
    if !trace_path.exists() || !worker_path.exists() {
        eprintln!(
            "skipping EE xeno resonance multiplier check; artifacts missing: {} {}",
            trace_path.display(),
            worker_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    if skip_stale_trace_summary(&trace, "compact-only qN5n40 stage reconstruction check") {
        return;
    }
    let case = &trace["cases"][0];
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");

    let decoded = decode_sio_lm_compact_summary(&compact);
    assert_eq!(decoded["meta"]["gameMode"], "ee");
    for key in ["xenoResDamage", "xenoResMultiplier"] {
        let actual = decoded["derivedBaseStats"][key].as_f64().unwrap();
        let expected = case["nonZeroStats"][key].as_f64().unwrap();
        assert!(
            (actual - expected).abs() <= 1e-9,
            "{key}: actual {actual} expected {expected}"
        );
    }
}

#[test]
fn sio_lm_compact_only_reconstructs_qn5n40_live_trace_without_supplied_context() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    fn assert_number_close(path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{path}: actual {actual} expected {expected}"
        );
    }

    fn assert_expected_numbers_close(path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        let mut failures = Vec::new();
        for (key, expected_value) in expected {
            let actual_number = actual.get(key).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
            if (actual_number - expected_number).abs() > tolerance {
                failures.push(format!(
                    "{path}.{key}: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        for (key, actual_value) in actual {
            if expected.contains_key(key) {
                continue;
            }
            let actual_number = actual_value.as_f64().unwrap_or(0.0);
            if actual_number.abs() > 1e-9 {
                failures.push(format!("{path}.{key}: unexpected actual {actual_number}"));
            }
        }
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }

    fn assert_expected_arrays_close(path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_array().expect("actual array");
        let expected = expected.as_array().expect("expected array");
        let mut failures = Vec::new();
        for (index, expected_value) in expected.iter().enumerate() {
            let actual_number = actual.get(index).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
            if (actual_number - expected_number).abs() > tolerance {
                failures.push(format!(
                    "{path}[{index}]: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/shared_qN5n40/lm_trace_summary.json");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/shared_qN5n40/worker_decoded_summary.json");
    if !trace_path.exists() || !worker_path.exists() {
        eprintln!(
            "skipping compact-only qN5n40 stage reconstruction check; artifacts missing: {} {}",
            trace_path.display(),
            worker_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    if skip_stale_trace_summary(&trace, "compact-only qN5n40 stage reconstruction check") {
        return;
    }
    let case = &trace["cases"][0];
    let worker_case = &worker["cases"][0];
    let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let mut compact: Value = serde_json::from_str(
        worker_case["skillsRequests"][request_index]["configString"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    compact.as_object_mut().unwrap().remove("_R");

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact
        }
    }))
    .expect("compact-only sioLm context");

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );
    assert_sio_lm_stats_equivalent(
        "qN5n40.compactOnly.stats",
        &reconstructed["stats"],
        &case["nonZeroStats"],
    );
    assert_expected_numbers_close(
        "qN5n40.compactOnly.ceDamage",
        &reconstructed["ceDamage"],
        &case["ceDamage"],
    );
    assert_number_close(
        "qN5n40.compactOnly.damageFactor",
        reconstructed["damageFactor"].as_f64().unwrap(),
        case["damageFactor"].as_f64().unwrap(),
    );
    assert_expected_numbers_close(
        "qN5n40.compactOnly.attackMeta",
        &context.attack_meta,
        &case["attackMeta"],
    );
    assert_expected_arrays_close(
        "qN5n40.compactOnly.passivePools",
        &reconstructed["passivePools"],
        &case["passivePools"],
    );
    let score = tttg_forge_core::calculate_score(
        &reconstructed["stats"],
        &context.attack_meta,
        reconstructed["damageFactor"].as_f64().unwrap(),
        &reconstructed["ceDamage"],
        &context.calc_mode,
        &enabled_skill_map(case["enabledSkills"].as_array().unwrap()),
        reconstructed["passivePools"].as_array().unwrap(),
        &context.game_mode,
    )
    .unwrap();
    assert_number_close(
        "qN5n40.compactOnly.score",
        score,
        case["tracedMultiplier"].as_f64().unwrap(),
    );
}

#[test]
fn sio_lm_compact_only_reconstructs_remaining_shared_live_traces_without_supplied_context() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    fn assert_number_close(path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{path}: actual {actual} expected {expected}"
        );
    }

    fn assert_expected_numbers_close(path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        let mut failures = Vec::new();
        for (key, expected_value) in expected {
            let actual_number = actual.get(key).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
            if (actual_number - expected_number).abs() > tolerance {
                failures.push(format!(
                    "{path}.{key}: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }

    fn assert_expected_arrays_close(path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_array().expect("actual array");
        let expected = expected.as_array().expect("expected array");
        let mut failures = Vec::new();
        for (index, expected_value) in expected.iter().enumerate() {
            let actual_number = actual.get(index).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
            if (actual_number - expected_number).abs() > tolerance {
                failures.push(format!(
                    "{path}[{index}]: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    for fixture in ["4ZgaBw", "ihACJy", "rm8mHx", "Zglrn9", "zcpPVi"] {
        let trace_path = repo_root.join(format!(
            "frontend/artifacts/td11/shared_{fixture}/lm_trace_summary.json"
        ));
        let worker_path = repo_root.join(format!(
            "frontend/artifacts/td11/shared_{fixture}/worker_decoded_summary.json"
        ));
        if !trace_path.exists() || !worker_path.exists() {
            eprintln!(
                "skipping {fixture} compact-only stage reconstruction check; artifacts missing: {} {}",
                trace_path.display(),
                worker_path.display()
            );
            continue;
        }

        let trace: Value =
            serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
        let worker: Value =
            serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
        if skip_stale_trace_summary(
            &trace,
            &format!("{fixture} compact-only stage reconstruction check"),
        ) {
            continue;
        }
        let case = &trace["cases"][0];
        let worker_case = &worker["cases"][0];
        let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
        let mut compact: Value = serde_json::from_str(
            worker_case["skillsRequests"][request_index]["configString"]
                .as_str()
                .unwrap(),
        )
        .unwrap();
        compact.as_object_mut().unwrap().remove("_R");

        let context = sio_lm_context_from_player_state(&json!({
            "sioLm": {
                "compactConfig": compact
            }
        }))
        .expect("compact-only sioLm context");

        let enabled_skills = case["enabledSkills"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let reconstructed = reconstruct_sio_lm_inputs(
            &context.base_stats,
            &case["techs"],
            &enabled_skills,
            &context.transform,
        );

        assert_sio_lm_stats_equivalent(
            &format!("{fixture}.compactOnly.stats"),
            &reconstructed["stats"],
            &case["nonZeroStats"],
        );
        assert_expected_numbers_close(
            &format!("{fixture}.compactOnly.ceDamage"),
            &reconstructed["ceDamage"],
            &case["ceDamage"],
        );
        assert_number_close(
            &format!("{fixture}.compactOnly.damageFactor"),
            reconstructed["damageFactor"].as_f64().unwrap(),
            case["damageFactor"].as_f64().unwrap(),
        );
        assert_expected_numbers_close(
            &format!("{fixture}.compactOnly.attackMeta"),
            &context.attack_meta,
            &case["attackMeta"],
        );
        assert_expected_arrays_close(
            &format!("{fixture}.compactOnly.passivePools"),
            &reconstructed["passivePools"],
            &case["passivePools"],
        );
        let score = tttg_forge_core::calculate_score(
            &reconstructed["stats"],
            &context.attack_meta,
            reconstructed["damageFactor"].as_f64().unwrap(),
            &reconstructed["ceDamage"],
            &context.calc_mode,
            &enabled_skill_map(case["enabledSkills"].as_array().unwrap()),
            reconstructed["passivePools"].as_array().unwrap(),
            &context.game_mode,
        )
        .unwrap();
        assert_number_close(
            &format!("{fixture}.compactOnly.score"),
            score,
            case["tracedMultiplier"].as_f64().unwrap(),
        );
    }
}

#[test]
fn sio_lm_calibration_off_probe_tracks_remaining_equipment_source_residuals() {
    fn assert_stat_pair(
        fixture: &str,
        stats: &Value,
        live_stats: &Value,
        key: &str,
        expected_probe_actual: f64,
        expected_live: f64,
    ) {
        let actual = stats[key].as_f64().unwrap_or(0.0);
        let live = live_stats[key].as_f64().unwrap_or(0.0);
        let actual_tolerance = 1e-9_f64.max(expected_probe_actual.abs() * 1e-12);
        let live_tolerance = 1e-9_f64.max(expected_live.abs() * 1e-12);
        assert!(
            (actual - expected_probe_actual).abs() <= actual_tolerance,
            "{fixture}.{key} probe actual {actual} expected {expected_probe_actual}"
        );
        assert!(
            (live - expected_live).abs() <= live_tolerance,
            "{fixture}.{key} live expected {live} expected {expected_live}"
        );
    }

    let Some((qn, qn_live)) =
        reconstruct_td11_calibration_off_fixture("shared_qN5n40", "calibration-off probe")
    else {
        return;
    };
    for (key, actual, expected) in [("vulnerability", 90.0, 90.0)] {
        assert_stat_pair("qN5n40", &qn["stats"], &qn_live, key, actual, expected);
    }

    let Some((shared, shared_live)) =
        reconstruct_td11_calibration_off_fixture("shared_4ZgaBw", "calibration-off probe")
    else {
        return;
    };
    for (key, actual, expected) in [("vulnerability", 545.0, 545.0)] {
        assert_stat_pair(
            "4ZgaBw",
            &shared["stats"],
            &shared_live,
            key,
            actual,
            expected,
        );
    }
}

#[test]
fn sio_lm_compact_hgp_molotov_wind_totem_vulnerability_matches_live_e_branch() {
    for fixture in ["shared_qN5n40", "shared_4ZgaBw"] {
        let Some((reconstructed, live)) =
            reconstruct_td11_calibration_off_fixture(fixture, "HGP Wind Totem tech set check")
        else {
            continue;
        };
        let actual = reconstructed["stats"]["vulnerability"]
            .as_f64()
            .unwrap_or(0.0);
        let expected = live["vulnerability"].as_f64().unwrap_or(0.0);
        assert!(
            (actual - expected).abs() <= 1e-9,
            "{fixture}.vulnerability actual {actual} expected live {expected}; live E() applies Hi-Gravity Pulser Molotov Wind Totem set stats in endgame modes"
        );
    }
}

#[test]
fn sio_lm_compact_twin_lance_total_core_conditions_use_live_post_tech_stats() {
    let Some((qn, qn_live)) = reconstruct_td11_calibration_off_fixture(
        "shared_qN5n40",
        "Twin Lance post-tech total-core condition check",
    ) else {
        return;
    };
    let actual = qn["stats"]["shieldDamage"].as_f64().unwrap_or(0.0);
    let expected = qn_live["shieldDamage"].as_f64().unwrap_or(0.0);
    assert!(
        (actual - expected).abs() <= 1e-9,
        "qN5n40.shieldDamage actual {actual} expected live {expected}; live zP evaluates total-core conditional branches after tech and equipment Dp stats"
    );
}

#[test]
fn sio_lm_compact_ss_transmute_uses_live_dynamic_mode_condition_seconds() {
    for (fixture, expected) in [
        ("shared_qN5n40", 39.400_000_000_000_006),
        ("shared_4ZgaBw", 26.85),
    ] {
        let Some(actual) = reconstructed_td11_calibration_off_stat(
            fixture,
            "damageTransmute",
            "dynamic transmute condition check",
        ) else {
            return;
        };
        assert!(
            (actual - expected).abs() <= 1e-9,
            "{fixture}.damageTransmute actual {actual} expected {expected}"
        );
    }
}

#[test]
fn sio_lm_compact_endgame_equipment_applies_live_boss_postprocess() {
    for (fixture, expected_damage_boss) in [("shared_qN5n40", 261.255), ("shared_4ZgaBw", 264.56)] {
        let Some(stats) =
            reconstructed_td11_calibration_off_stats(fixture, "boss/vulnerability source check")
        else {
            return;
        };
        let actual = stats["damageBoss"].as_f64().unwrap_or(0.0);
        assert!(
            (actual - expected_damage_boss).abs() <= 1e-9,
            "{fixture}.damageBoss actual {actual} expected {expected_damage_boss}"
        );
    }
}

#[test]
fn sio_lm_compact_endgame_condition_stats_follow_live_finalization_order() {
    for (fixture, expected_chilled, expected_poisoned) in [
        ("shared_qN5n40", 736.036_666_666_666_7, -81.19),
        ("shared_4ZgaBw", 1_287.81, 512.48),
    ] {
        let Some(stats) =
            reconstructed_td11_calibration_off_stats(fixture, "condition finalization check")
        else {
            return;
        };
        for (key, expected) in [
            ("chilled", expected_chilled),
            ("poisoned", expected_poisoned),
        ] {
            let actual = stats[key].as_f64().unwrap_or(0.0);
            assert!(
                (actual - expected).abs() <= 1e-9,
                "{fixture}.{key} actual {actual} expected {expected}"
            );
        }
    }
}

#[test]
fn sio_lm_compact_ss_misc_path_folds_live_total_core_branches() {
    for (fixture, expected_ss_misc_path) in
        [("shared_4ZgaBw", 2_253.192), ("shared_qN5n40", 2_326.782)]
    {
        let Some(stats) =
            reconstructed_td11_calibration_off_stats(fixture, "SS misc/shield source check")
        else {
            return;
        };
        let actual = stats["ssMiscPath"].as_f64().unwrap_or(0.0);
        assert!(
            (actual - expected_ss_misc_path).abs() <= 1e-9,
            "{fixture}.ssMiscPath actual {actual} expected {expected_ss_misc_path}"
        );
    }
}

#[test]
fn sio_lm_compact_only_reconstructs_default_live_traces_without_supplied_context() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    fn assert_number_close(path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{path}: actual {actual} expected {expected}"
        );
    }

    fn assert_expected_numbers_close(path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        let mut failures = Vec::new();
        for (key, expected_value) in expected {
            let actual_number = actual.get(key).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
            if (actual_number - expected_number).abs() > tolerance {
                failures.push(format!(
                    "{path}.{key}: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }

    fn assert_expected_arrays_close(path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_array().expect("actual array");
        let expected = expected.as_array().expect("expected array");
        let mut failures = Vec::new();
        for (index, expected_value) in expected.iter().enumerate() {
            let actual_number = actual.get(index).and_then(Value::as_f64).unwrap_or(0.0);
            let expected_number = expected_value.as_f64().unwrap_or(0.0);
            let tolerance = 1e-9_f64.max(expected_number.abs() * 1e-12);
            if (actual_number - expected_number).abs() > tolerance {
                failures.push(format!(
                    "{path}[{index}]: actual {actual_number} expected {expected_number}"
                ));
            }
        }
        assert!(failures.is_empty(), "{}", failures.join("\n"));
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    if !trace_path.exists() || !worker_path.exists() {
        eprintln!(
            "skipping compact-only default stage reconstruction check; artifacts missing: {} {}",
            trace_path.display(),
            worker_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    for (index, worker_case) in worker["cases"].as_array().unwrap().iter().enumerate() {
        let case = &trace["cases"][index];
        let request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
        let mut compact: Value = serde_json::from_str(
            worker_case["skillsRequests"][request_index]["configString"]
                .as_str()
                .unwrap(),
        )
        .unwrap();
        compact.as_object_mut().unwrap().remove("_R");

        let context = sio_lm_context_from_player_state(&json!({
            "sioLm": {
                "compactConfig": compact
            }
        }))
        .expect("compact-only sioLm context");

        let enabled_skills = case["enabledSkills"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let reconstructed = reconstruct_sio_lm_inputs(
            &context.base_stats,
            &case["techs"],
            &enabled_skills,
            &context.transform,
        );
        assert_expected_numbers_close(
            &format!("default[{index}].compactOnly.stats"),
            &reconstructed["stats"],
            &case["nonZeroStats"],
        );
        if let (Some(actual), Some(expected)) = (
            reconstructed["stats"].as_object(),
            case["nonZeroStats"].as_object(),
        ) {
            let unexpected = actual
                .iter()
                .filter_map(|(key, value)| {
                    if expected.contains_key(key) {
                        return None;
                    }
                    let number = value.as_f64().unwrap_or(0.0);
                    (number.abs() > 1e-9).then(|| {
                        format!(
                            "default[{index}].compactOnly.stats.{key}: unexpected actual {number}"
                        )
                    })
                })
                .collect::<Vec<_>>();
            assert!(unexpected.is_empty(), "{}", unexpected.join("\n"));
        }
        assert_expected_numbers_close(
            &format!("default[{index}].compactOnly.ceDamage"),
            &reconstructed["ceDamage"],
            &case["ceDamage"],
        );
        assert_number_close(
            &format!("default[{index}].compactOnly.damageFactor"),
            reconstructed["damageFactor"].as_f64().unwrap(),
            case["damageFactor"].as_f64().unwrap(),
        );
        assert_expected_numbers_close(
            &format!("default[{index}].compactOnly.attackMeta"),
            &context.attack_meta,
            &case["attackMeta"],
        );
        assert_expected_arrays_close(
            &format!("default[{index}].compactOnly.passivePools"),
            &reconstructed["passivePools"],
            &case["passivePools"],
        );
        let score = tttg_forge_core::calculate_score(
            &reconstructed["stats"],
            &context.attack_meta,
            reconstructed["damageFactor"].as_f64().unwrap(),
            &reconstructed["ceDamage"],
            &context.calc_mode,
            &enabled_skill_map(case["enabledSkills"].as_array().unwrap()),
            reconstructed["passivePools"].as_array().unwrap(),
            &context.game_mode,
        )
        .unwrap();
        assert_number_close(
            &format!("default[{index}].compactOnly.score"),
            score,
            case["tracedMultiplier"].as_f64().unwrap(),
        );
    }
}

#[test]
fn sio_lm_captured_trace_input_reconstruction_matches_live_trace() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_core::calculate_score;
    use tttg_forge_optimizer::tech::reconstruct_captured_sio_lm_inputs;

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    fn assert_number_close(id: &str, path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{id} {path}: actual {actual} expected {expected}"
        );
    }

    fn assert_object_numbers_close(id: &str, path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        let mut actual_keys = actual.keys().collect::<Vec<_>>();
        actual_keys.sort();
        let mut expected_keys = expected.keys().collect::<Vec<_>>();
        expected_keys.sort();
        assert_eq!(actual_keys, expected_keys, "{id} {path} keys");
        for (key, expected_value) in expected {
            assert_number_close(
                id,
                &format!("{path}.{key}"),
                actual[key].as_f64().unwrap_or(0.0),
                expected_value.as_f64().unwrap_or(0.0),
            );
        }
    }

    fn assert_array_numbers_close(id: &str, path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_array().expect("actual array");
        let expected = expected.as_array().expect("expected array");
        assert_eq!(actual.len(), expected.len(), "{id} {path} len");
        for (index, (actual, expected)) in actual.iter().zip(expected).enumerate() {
            assert_number_close(
                id,
                &format!("{path}[{index}]"),
                actual.as_f64().unwrap_or(0.0),
                expected.as_f64().unwrap_or(0.0),
            );
        }
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !trace_path.exists() {
        eprintln!(
            "skipping lm trace input reconstruction check; artifact missing: {}",
            trace_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();

    for case in trace["cases"].as_array().unwrap() {
        let id = case["id"].as_str().unwrap();
        let enabled_skills = case["enabledSkills"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let reconstructed =
            reconstruct_captured_sio_lm_inputs(&case["baseStats"], &case["techs"], &enabled_skills);

        assert_object_numbers_close(id, "stats", &reconstructed["stats"], &case["nonZeroStats"]);
        assert_object_numbers_close(
            id,
            "ceDamage",
            &reconstructed["ceDamage"],
            &case["ceDamage"],
        );
        assert_array_numbers_close(
            id,
            "passivePools",
            &reconstructed["passivePools"],
            &case["passivePools"],
        );
        assert_number_close(
            id,
            "damageFactor",
            reconstructed["damageFactor"].as_f64().unwrap(),
            case["damageFactor"].as_f64().unwrap(),
        );

        let actual_score = calculate_score(
            &reconstructed["stats"],
            &case["attackMeta"],
            reconstructed["damageFactor"].as_f64().unwrap(),
            &reconstructed["ceDamage"],
            case["calcMode"].as_str().unwrap(),
            &enabled_skill_map(case["enabledSkills"].as_array().unwrap()),
            reconstructed["passivePools"].as_array().unwrap(),
            case["gameMode"].as_str().unwrap(),
        )
        .unwrap();
        assert_number_close(
            id,
            "score",
            actual_score,
            case["tracedMultiplier"].as_f64().unwrap(),
        );
    }
}

#[test]
fn sio_lm_transformer_keeps_disabled_mode_passive_pool_inactive() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::reconstruct_captured_sio_lm_inputs;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !trace_path.exists() {
        eprintln!(
            "skipping disabled passive pool check; artifact missing: {}",
            trace_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("default_normal_legend1_epic6_chips40"))
        .unwrap();
    let enabled_skills = case["enabledSkills"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(Value::as_str)
        .filter(|skill| *skill != "Molotov Mode")
        .map(str::to_string)
        .collect::<Vec<_>>();

    let reconstructed =
        reconstruct_captured_sio_lm_inputs(&case["baseStats"], &case["techs"], &enabled_skills);

    assert_eq!(
        reconstructed["ceDamage"]["Molotov Mode"]
            .as_f64()
            .unwrap_or(0.0),
        0.0
    );
    assert_eq!(
        reconstructed["passivePools"][51].as_f64().unwrap_or(0.0),
        1.0,
        "Molotov Mode passive pool must not be activated when the mode is disabled"
    );
}

#[test]
fn sio_lm_compact_disabled_base_passives_do_not_apply_environment_bonuses() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping disabled base passive check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("default_normal_legend1_epic6_chips40"))
        .unwrap();
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|worker_case| worker_case["id"].as_str() == case["id"].as_str())
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();

    let mut compact_without_cube: Value = serde_json::from_str(config_string).unwrap();
    compact_without_cube["p"][0] = json!(0);
    let cube_context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact_without_cube,
            "baseStats": case["baseStats"]
        }
    }))
    .unwrap();
    let cube_reconstructed = reconstruct_sio_lm_inputs(
        &cube_context.base_stats,
        &case["techs"],
        &cube_context.enabled_skills,
        &cube_context.transform,
    );

    assert!(!cube_context
        .enabled_skills
        .iter()
        .any(|skill| skill == "Energy Cube"));
    let rex_cooldown = 1.108_033_240_997_23;
    assert_eq!(
        cube_reconstructed["stats"]["cooldownReduction"],
        json!(rex_cooldown)
    );
    assert_eq!(cube_reconstructed["passivePools"][3], json!(rex_cooldown));
    assert_eq!(cube_reconstructed["passivePools"][31], json!(1.0));
    assert_eq!(cube_reconstructed["passivePools"][51], json!(1.0));

    let mut compact_without_hp_bullet: Value = serde_json::from_str(config_string).unwrap();
    compact_without_hp_bullet["p"][1] = json!(0);
    let hp_context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact_without_hp_bullet,
            "baseStats": case["baseStats"]
        }
    }))
    .unwrap();
    let hp_reconstructed = reconstruct_sio_lm_inputs(
        &hp_context.base_stats,
        &case["techs"],
        &hp_context.enabled_skills,
        &hp_context.transform,
    );

    assert!(!hp_context
        .enabled_skills
        .iter()
        .any(|skill| skill == "HP Bullet"));
    assert_eq!(
        hp_reconstructed["stats"]["hpBulletBoost"]
            .as_f64()
            .unwrap_or(0.0),
        case["baseStats"]["hpBulletBoost"].as_f64().unwrap_or(0.0)
    );

    let mut compact_without_he_fuel: Value = serde_json::from_str(config_string).unwrap();
    compact_without_he_fuel["p"][4] = json!(0);
    let he_context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact_without_he_fuel,
            "baseStats": case["baseStats"]
        }
    }))
    .unwrap();
    let he_reconstructed = reconstruct_sio_lm_inputs(
        &he_context.base_stats,
        &case["techs"],
        &he_context.enabled_skills,
        &he_context.transform,
    );

    assert!(!he_context
        .enabled_skills
        .iter()
        .any(|skill| skill == "HE Fuel"));
    assert_eq!(he_reconstructed["passivePools"][2], json!(1.018));
}

#[test]
fn sio_lm_taloxa_overload_ce_damage_follows_base_stats() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping taloxa overload ce damage derivation check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("default_normal_legend1_epic6_chips40"))
        .unwrap();
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|worker_case| worker_case["id"].as_str() == case["id"].as_str())
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let compact: Value = serde_json::from_str(config_string).unwrap();

    let mut base_stats = case["baseStats"].clone();
    base_stats["taloxaBeam"] = json!(3.0);
    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "baseStats": base_stats,
            "enabledSkills": case["enabledSkills"]
        }
    }))
    .unwrap();
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );

    let expected = tttg_forge_core::constants::damage_coefficient("taloxaOverload") * 3.0;
    assert!(
        (reconstructed["ceDamage"]["taloxaOverload"]
            .as_f64()
            .unwrap_or(0.0)
            - expected)
            .abs()
            < 1e-9
    );
}

#[test]
fn sio_lm_ss_weapon_ce_damage_follows_compact_equipment() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping ss weapon ce damage derivation check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("default_normal_legend1_epic6_chips40"))
        .unwrap();
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|worker_case| worker_case["id"].as_str() == case["id"].as_str())
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let mut compact: Value = serde_json::from_str(config_string).unwrap();
    compact["j"] = Value::Array(
        compact["j"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|item| item["t"].as_u64() != Some(1))
            .cloned()
            .collect(),
    );

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "baseStats": case["baseStats"],
            "enabledSkills": case["enabledSkills"]
        }
    }))
    .unwrap();
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );

    assert_eq!(reconstructed["stats"]["ssMiscPath"], Value::Null);
    assert_eq!(reconstructed["ceDamage"]["ssWeapon"], json!(0.0));
}

#[test]
fn sio_lm_static_bonus_ce_damage_follows_base_stats() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping static bonus ce damage derivation check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("default_normal_legend1_epic6_chips40"))
        .unwrap();
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|worker_case| worker_case["id"].as_str() == case["id"].as_str())
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let compact: Value = serde_json::from_str(config_string).unwrap();

    let mut base_stats = case["baseStats"].clone();
    base_stats["crimsonBat"] = json!(2.0);
    base_stats["harmonyKing"] = json!(3.0);
    base_stats["xenoDamage"] = json!(120.0);
    base_stats["mountDamage"] = json!(4047.468857542808);

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "baseStats": base_stats,
            "enabledSkills": case["enabledSkills"]
        }
    }))
    .unwrap();
    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );

    let laser_divisor =
        1.0 / (0.01 * reconstructed["stats"]["ssGlovesLaser"].as_f64().unwrap() + 1.0);
    assert_eq!(
        reconstructed["ceDamage"]["crimsonBat"],
        json!(2.0 * tttg_forge_core::constants::damage_coefficient("crimsonBat"))
    );
    assert_eq!(
        reconstructed["ceDamage"]["King"],
        json!(3.0 * tttg_forge_core::constants::damage_coefficient("King") * laser_divisor)
    );
    assert_eq!(
        reconstructed["ceDamage"]["xeno"],
        json!(120.0 * laser_divisor)
    );
    assert_eq!(
        reconstructed["ceDamage"]["mount"],
        json!(4047.468857542808 * laser_divisor)
    );
}

#[test]
fn sio_lm_ce_damage_uses_core_damage_factor_helper() {
    use std::path::PathBuf;

    let source_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm.rs");
    let source = std::fs::read_to_string(source_path).unwrap();
    let ce_damage_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm/ce_damage.rs");
    let ce_damage_source = std::fs::read_to_string(ce_damage_path).unwrap_or_default();

    assert!(
        source.contains("mod ce_damage;"),
        "sio_lm CE damage should live in a dedicated submodule"
    );
    assert!(
        ce_damage_source.contains("tttg_forge_core::calculate_damage_factor"),
        "sio_lm CE damage should use the core damage-factor helper as the single formula source"
    );
    assert!(
        !source.contains("damage_coefficient(\"ssWeapon\")")
            && !source.contains("damage_coefficient(\"taloxaOverload\")")
            && !source.contains("damage_coefficient(\"crimsonBat\")"),
        "sio_lm should not duplicate core CE damage coefficients"
    );
    assert!(
        !source.contains("fn core_ce_damage"),
        "sio_lm.rs should not keep CE damage helper implementation details"
    );
    assert!(
        !source.contains("fn stat_from_map"),
        "sio_lm should not keep local stat helpers solely for duplicated CE damage formulas"
    );
}

#[test]
fn sio_lm_passive_pools_live_in_dedicated_module() {
    use std::path::PathBuf;

    let source_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm.rs");
    let source = std::fs::read_to_string(source_path).unwrap();
    let passive_pools_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm/passive_pools.rs");
    let passive_pools_source = std::fs::read_to_string(passive_pools_path).unwrap_or_default();

    assert!(
        source.contains("mod passive_pools;"),
        "sio_lm passive pool logic should live in a dedicated submodule"
    );
    assert!(
        !source.contains("fn passive_pools_for_trace")
            && !source.contains("fn set_passive_pool_for_mode"),
        "sio_lm.rs should not keep passive pool implementation details"
    );
    assert!(
        passive_pools_source.contains("tttg_forge_core::constants::passive_multiplier")
            && passive_pools_source.contains("tttg_forge_core::constants::damage_pool_index"),
        "passive pool submodule should own the core passive multiplier matrix calls"
    );
}

#[test]
fn sio_lm_equipment_transform_lives_in_dedicated_module() {
    use std::path::PathBuf;

    let source_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm.rs");
    let source = std::fs::read_to_string(source_path).unwrap();
    let equipment_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm/equipment_transform.rs");
    let equipment_source = std::fs::read_to_string(equipment_path).unwrap_or_default();

    assert!(
        source.contains("mod equipment_transform;"),
        "sio_lm equipment stat transform should live in a dedicated submodule"
    );
    assert!(
        !source.contains("fn apply_ss_equipment_transform"),
        "sio_lm.rs should not keep SS equipment transform implementation details"
    );
    assert!(
        equipment_source.contains("\"twinLance\"")
            && equipment_source.contains("\"glacialWarboots\""),
        "equipment transform submodule should own the captured SS equipment transform table"
    );
}

#[test]
fn sio_lm_equipment_transform_no_longer_uses_fixture_named_profile_branches() {
    use std::path::PathBuf;

    let equipment_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm/equipment_transform.rs");
    let source = std::fs::read_to_string(equipment_path).unwrap();

    assert!(
        !source.contains("apply_zcppvi_advanced_equipment_transform"),
        "zcpPVi equipment transform should be classified generically, not by fixture-named branch"
    );
    assert!(
        !source.contains("apply_shared_fixture_equipment_transform"),
        "shared equipment transform should be classified generically, not by fixture-named branch"
    );
    assert!(
        !source.contains("is_shared_qn5n40_equipment"),
        "qN5n40 equipment shape should not remain as a fixture-named predicate"
    );
    assert!(
        !source.contains("FixtureStats") && !source.contains("apply_fixture_stats"),
        "equipment profile residuals should not be named as fixture-specific stats"
    );
}

#[test]
fn sio_lm_equipment_transform_no_longer_uses_calibrated_residual_helpers() {
    use std::path::PathBuf;

    let source_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm.rs");
    let source = std::fs::read_to_string(source_path).unwrap();
    let equipment_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/tech/sio_lm/equipment_transform.rs");
    let equipment_source = std::fs::read_to_string(equipment_path).unwrap();

    assert!(
        equipment_source.contains("fn apply_compact_equipment_source_transform"),
        "compact equipment source formulas should have a single source-backed helper"
    );
    for residual_name in [
        "CompactEquipmentCalibration",
        "apply_compact_equipment_calibration",
        "apply_advanced_void_twisting_calibration",
        "matches_judgment_sash_loadout",
        "matches_void_sash_loadout",
        "matches_void_twisting_loadout",
        "matches_lme2_judgment_loadout",
        "matches_advanced_void_twisting_loadout",
    ] {
        assert!(
            !source.contains(residual_name) && !equipment_source.contains(residual_name),
            "production equipment residual helper remains: {residual_name}"
        );
    }
}

#[test]
fn sio_lm_supplied_context_does_not_hide_captured_transform_defaults() {
    use serde_json::Value;
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !trace_path.exists() {
        eprintln!(
            "skipping supplied-context transform check; artifact missing: {}",
            trace_path.display()
        );
        return;
    }

    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("default_normal_legend1_epic6_chips40"))
        .unwrap();
    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "baseStats": case["baseStats"],
            "enabledSkills": case["enabledSkills"],
            "attackMeta": case["attackMeta"],
            "calcMode": case["calcMode"],
            "gameMode": case["gameMode"]
        }
    }))
    .unwrap();

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );

    assert_eq!(reconstructed["stats"]["atkEquip"], serde_json::Value::Null);
    assert_eq!(
        reconstructed["ceDamage"]["ssWeapon"],
        serde_json::Value::Null
    );
    assert_eq!(reconstructed["passivePools"][0], json!(1.0));
}

#[test]
fn sio_lm_supplied_context_reconstructs_live_trace_without_explicit_stat_transform() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn assert_number_close(id: &str, path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{id} {path}: actual {actual} expected {expected}"
        );
    }

    fn assert_object_numbers_close(id: &str, path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        let mut actual_keys = actual.keys().collect::<Vec<_>>();
        actual_keys.sort();
        let mut expected_keys = expected.keys().collect::<Vec<_>>();
        expected_keys.sort();
        assert_eq!(actual_keys, expected_keys, "{id} {path} keys");
        for (key, expected_value) in expected {
            assert_number_close(
                id,
                &format!("{path}.{key}"),
                actual[key].as_f64().unwrap_or(0.0),
                expected_value.as_f64().unwrap_or(0.0),
            );
        }
    }

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping supplied-context no-transform trace check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();

    for case in trace["cases"].as_array().unwrap() {
        let id = case["id"].as_str().unwrap();
        let worker_case = worker["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|worker_case| worker_case["id"].as_str() == Some(id))
            .unwrap();
        let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
        let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
            .as_str()
            .unwrap();
        let mut compact_without_fingerprint: Value = serde_json::from_str(config_string).unwrap();
        compact_without_fingerprint
            .as_object_mut()
            .unwrap()
            .remove("_R");
        let context = sio_lm_context_from_player_state(&json!({
            "sioLm": {
                "compactConfig": compact_without_fingerprint,
                "baseStats": case["baseStats"],
                "enabledSkills": case["enabledSkills"]
            }
        }))
        .unwrap();

        let reconstructed = reconstruct_sio_lm_inputs(
            &context.base_stats,
            &case["techs"],
            &context.enabled_skills,
            &context.transform,
        );

        assert_object_numbers_close(id, "stats", &reconstructed["stats"], &case["nonZeroStats"]);
        assert_object_numbers_close(
            id,
            "ceDamage",
            &reconstructed["ceDamage"],
            &case["ceDamage"],
        );
        assert_number_close(
            id,
            "damageFactor",
            reconstructed["damageFactor"].as_f64().unwrap(),
            case["damageFactor"].as_f64().unwrap(),
        );
        let score = tttg_forge_core::calculate_score(
            &reconstructed["stats"],
            &case["attackMeta"],
            reconstructed["damageFactor"].as_f64().unwrap(),
            &reconstructed["ceDamage"],
            case["calcMode"].as_str().unwrap(),
            &enabled_skill_map(case["enabledSkills"].as_array().unwrap()),
            reconstructed["passivePools"].as_array().unwrap(),
            case["gameMode"].as_str().unwrap(),
        )
        .unwrap();
        assert_number_close(
            id,
            "score",
            score,
            case["tracedMultiplier"].as_f64().unwrap(),
        );
    }
}

#[test]
fn sio_lm_supplied_context_derives_transform_from_equipment_without_account_surface_match() {
    use serde_json::{Map, Value};
    use std::path::PathBuf;
    use tttg_forge_optimizer::tech::{reconstruct_sio_lm_inputs, sio_lm_context_from_player_state};

    fn assert_number_close(id: &str, path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{id} {path}: actual {actual} expected {expected}"
        );
    }

    fn assert_object_numbers_close(id: &str, path: &str, actual: &Value, expected: &Value) {
        let actual = actual.as_object().expect("actual object");
        let expected = expected.as_object().expect("expected object");
        let mut actual_keys = actual.keys().collect::<Vec<_>>();
        actual_keys.sort();
        let mut expected_keys = expected.keys().collect::<Vec<_>>();
        expected_keys.sort();
        assert_eq!(actual_keys, expected_keys, "{id} {path} keys");
        for (key, expected_value) in expected {
            assert_number_close(
                id,
                &format!("{path}.{key}"),
                actual[key].as_f64().unwrap_or(0.0),
                expected_value.as_f64().unwrap_or(0.0),
            );
        }
    }

    fn enabled_skill_map(names: &[Value]) -> Value {
        let mut map = Map::new();
        for name in names.iter().filter_map(Value::as_str) {
            map.insert(name.to_string(), Value::Bool(true));
        }
        Value::Object(map)
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping equipment-derived transform check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some("default_normal_legend1_epic6_chips40"))
        .unwrap();
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|worker_case| worker_case["id"].as_str() == case["id"].as_str())
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let mut compact: Value = serde_json::from_str(config_string).unwrap();
    compact.as_object_mut().unwrap().remove("_R");
    compact["a"]["*"] = json!(0);
    compact["!"]["="] = json!(0);

    let context = sio_lm_context_from_player_state(&json!({
        "sioLm": {
            "compactConfig": compact,
            "baseStats": case["baseStats"],
            "enabledSkills": case["enabledSkills"],
            "attackMeta": case["attackMeta"],
            "calcMode": case["calcMode"],
            "gameMode": case["gameMode"]
        }
    }))
    .unwrap();

    let reconstructed = reconstruct_sio_lm_inputs(
        &context.base_stats,
        &case["techs"],
        &context.enabled_skills,
        &context.transform,
    );

    assert_object_numbers_close(
        case["id"].as_str().unwrap(),
        "stats",
        &reconstructed["stats"],
        &case["nonZeroStats"],
    );
    assert_object_numbers_close(
        case["id"].as_str().unwrap(),
        "ceDamage",
        &reconstructed["ceDamage"],
        &case["ceDamage"],
    );
    let score = tttg_forge_core::calculate_score(
        &reconstructed["stats"],
        &case["attackMeta"],
        reconstructed["damageFactor"].as_f64().unwrap(),
        &reconstructed["ceDamage"],
        case["calcMode"].as_str().unwrap(),
        &enabled_skill_map(case["enabledSkills"].as_array().unwrap()),
        reconstructed["passivePools"].as_array().unwrap(),
        case["gameMode"].as_str().unwrap(),
    )
    .unwrap();
    assert_number_close(
        case["id"].as_str().unwrap(),
        "score",
        score,
        case["tracedMultiplier"].as_f64().unwrap(),
    );
}

#[test]
fn tech_optimizer_derives_active_skills_from_compact_context() {
    use serde_json::Value;
    use std::path::PathBuf;

    fn assert_number_close(id: &str, path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{id} {path}: actual {actual} expected {expected}"
        );
    }

    fn rarity_inputs_from_fixture(inputs: &Value) -> Vec<tttg_forge_optimizer::SioRarityInput> {
        inputs
            .as_object()
            .into_iter()
            .flat_map(|inputs| inputs.iter())
            .filter_map(|(rarity, count)| {
                Some(tttg_forge_optimizer::SioRarityInput {
                    rarity: rarity.clone(),
                    count: count.as_u64()? as usize,
                })
            })
            .collect()
    }

    fn skills_map_from_fixture(skills_map: &Value) -> Vec<SioSkillPreference> {
        skills_map
            .as_object()
            .into_iter()
            .flat_map(|skills_map| skills_map.iter())
            .filter_map(|(skill, status)| {
                Some(SioSkillPreference {
                    skill: skill.clone(),
                    status: status.as_str()?.to_string(),
                })
            })
            .collect()
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let fixture_path =
        repo_root.join("frontend/artifacts/td11/sio_tech_optimizer_live_expected_2026-05-20.json");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !fixture_path.exists() || !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping compact active-skill derivation check; artifacts missing: {} {} {}",
            fixture_path.display(),
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let fixture: Value =
        serde_json::from_str(&std::fs::read_to_string(fixture_path).unwrap()).unwrap();
    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();

    for fixture_case in fixture["cases"].as_array().unwrap() {
        let id = fixture_case["id"].as_str().unwrap();
        let worker_case = worker["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|worker_case| worker_case["id"].as_str() == Some(id))
            .unwrap();
        let trace_case = trace["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|trace_case| trace_case["id"].as_str() == Some(id))
            .unwrap();
        let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
        let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
            .as_str()
            .unwrap();
        let optimizer = &fixture_case["optimizer"];
        let options = TechOptimizerOptions {
            top_k: 5,
            max_exact_nodes: 10,
            sio_profile: SioTechsOptimizerProfile {
                schema_active: true,
                strategy: optimizer["strategy"].as_str().unwrap().to_string(),
                speed_mode: optimizer["speedMode"].as_str().unwrap().to_string(),
                fodder: optimizer["fodder"].as_str().unwrap().to_string(),
                skills: fixture_case["skills"].as_u64().unwrap() as usize,
                chips: fixture_case["chips"].as_u64().unwrap() as usize,
                overloadable: optimizer["overloadable"].as_bool().unwrap(),
                rarity_inputs: rarity_inputs_from_fixture(&fixture_case["inputs"]),
                modes: optimizer["modes"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(|mode| mode.as_str().map(str::to_string))
                    .collect(),
                skills_map: skills_map_from_fixture(&optimizer["skillsMap"]),
                ..SioTechsOptimizerProfile::default()
            },
            ..TechOptimizerOptions::default()
        };

        let result = run_tech_optimizer(
            &json!({
                "tech_configs": {},
                "sioLm": {
                    "compactConfig": config_string,
                    "baseStats": trace_case["baseStats"]
                }
            }),
            &options,
        )
        .unwrap();

        let top = result.builds.first().expect("top build");
        assert_eq!(result.scope.scoring_model, "sio_full_lm_equivalence");
        assert!(result.scope.full_sio_equivalent);
        assert_eq!(
            top.config["sioCandidate"]["activeSkills"], fixture_case["expected"][0]["activeSkills"],
            "{id} active skills"
        );
        assert_number_close(
            id,
            "multiplier",
            top.damage_factor,
            worker_case["best"]["multiplier"].as_f64().unwrap(),
        );
    }
}

#[test]
fn tech_optimizer_matches_generated_evo_multiplier_with_passive_skill_choices() {
    use serde_json::Value;
    use std::path::PathBuf;

    fn assert_number_close(id: &str, path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{id} {path}: actual {actual} expected {expected}"
        );
    }

    fn rarity_inputs_from_fixture(inputs: &Value) -> Vec<tttg_forge_optimizer::SioRarityInput> {
        inputs
            .as_object()
            .into_iter()
            .flat_map(|inputs| inputs.iter())
            .filter_map(|(rarity, count)| {
                Some(tttg_forge_optimizer::SioRarityInput {
                    rarity: rarity.clone(),
                    count: count.as_u64()? as usize,
                })
            })
            .collect()
    }

    fn skills_map_from_fixture(skills_map: &Value) -> Vec<SioSkillPreference> {
        skills_map
            .as_object()
            .into_iter()
            .flat_map(|skills_map| skills_map.iter())
            .filter_map(|(skill, status)| {
                Some(SioSkillPreference {
                    skill: skill.clone(),
                    status: status.as_str()?.to_string(),
                })
            })
            .collect()
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping generated evo multiplier check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let id = "evo_worm_rex_overreaction";
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let trace_case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let optimizer = &trace_case["expandedConfig"]["techsOptimizer"];
    let options = TechOptimizerOptions {
        top_k: 5,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "precise".to_string(),
            fodder: "excess".to_string(),
            skills: worker_case["skillsRequests"][best_request_index]["skillsCount"]
                .as_u64()
                .unwrap() as usize,
            chips: optimizer["chips"].as_u64().unwrap() as usize,
            overloadable: optimizer["overloadable"].as_bool().unwrap(),
            rarity_inputs: rarity_inputs_from_fixture(&optimizer["inputs"]),
            modes: optimizer["modes"]
                .as_array()
                .unwrap()
                .iter()
                .filter_map(|mode| {
                    mode.as_str()
                        .and_then(tttg_forge_optimizer::tech::skill_name_to_mode)
                })
                .collect(),
            skills_map: skills_map_from_fixture(&optimizer["skillsMap"]),
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(
        &json!({
            "tech_configs": {},
            "sioLm": {
                "compactConfig": config_string,
                "baseStats": trace_case["baseStats"]
            }
        }),
        &options,
    )
    .unwrap();
    let top = result.builds.first().expect("top build");

    assert_eq!(
        top.config["sioCandidate"]["enabledSkills"], trace_case["enabledSkills"],
        "{id} enabled skills"
    );
    assert_number_close(
        id,
        "multiplier",
        top.damage_factor,
        trace_case["tracedMultiplier"].as_f64().unwrap(),
    );
}

#[test]
fn tech_optimizer_uses_optimizer_slots_instead_of_compact_active_defaults() {
    use serde_json::Value;
    use std::path::PathBuf;

    fn rarity_inputs_from_fixture(inputs: &Value) -> Vec<tttg_forge_optimizer::SioRarityInput> {
        inputs
            .as_object()
            .into_iter()
            .flat_map(|inputs| inputs.iter())
            .filter_map(|(rarity, count)| {
                Some(tttg_forge_optimizer::SioRarityInput {
                    rarity: rarity.clone(),
                    count: count.as_u64()? as usize,
                })
            })
            .collect()
    }

    fn skills_map_from_fixture(skills_map: &Value) -> Vec<SioSkillPreference> {
        skills_map
            .as_object()
            .into_iter()
            .flat_map(|skills_map| skills_map.iter())
            .filter_map(|(skill, status)| {
                Some(SioSkillPreference {
                    skill: skill.clone(),
                    status: status.as_str()?.to_string(),
                })
            })
            .collect()
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping generated active slot check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let id = "survivors_passives_harmony_teamwork";
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let trace_case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let optimizer = &trace_case["expandedConfig"]["techsOptimizer"];
    let options = TechOptimizerOptions {
        top_k: 5,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "precise".to_string(),
            fodder: "excess".to_string(),
            skills: worker_case["skillsRequests"][best_request_index]["skillsCount"]
                .as_u64()
                .unwrap() as usize,
            chips: optimizer["chips"].as_u64().unwrap() as usize,
            overloadable: optimizer["overloadable"].as_bool().unwrap(),
            rarity_inputs: rarity_inputs_from_fixture(&optimizer["inputs"]),
            modes: optimizer["modes"]
                .as_array()
                .unwrap()
                .iter()
                .filter_map(|mode| {
                    mode.as_str()
                        .and_then(tttg_forge_optimizer::tech::skill_name_to_mode)
                })
                .collect(),
            skills_map: skills_map_from_fixture(&optimizer["skillsMap"]),
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(
        &json!({
            "tech_configs": {},
            "sioLm": {
                "compactConfig": config_string,
                "baseStats": trace_case["baseStats"]
            }
        }),
        &options,
    )
    .unwrap();
    let top = result.builds.first().expect("top build");

    assert_eq!(
        top.config["sioCandidate"]["activeSkills"],
        json!([
            "Drone Mode",
            "Drill Shot Mode",
            "Soccer Mode",
            "Molotov Mode"
        ]),
        "{id} active skills"
    );
}

#[test]
fn tech_optimizer_uses_lm_preselect_width_for_resonance_candidates() {
    use serde_json::Value;
    use std::path::PathBuf;

    fn rarity_inputs_from_fixture(inputs: &Value) -> Vec<tttg_forge_optimizer::SioRarityInput> {
        inputs
            .as_object()
            .into_iter()
            .flat_map(|inputs| inputs.iter())
            .filter_map(|(rarity, count)| {
                Some(tttg_forge_optimizer::SioRarityInput {
                    rarity: rarity.clone(),
                    count: count.as_u64()? as usize,
                })
            })
            .collect()
    }

    fn skills_map_from_fixture(skills_map: &Value) -> Vec<SioSkillPreference> {
        skills_map
            .as_object()
            .into_iter()
            .flat_map(|skills_map| skills_map.iter())
            .filter_map(|(skill, status)| {
                Some(SioSkillPreference {
                    skill: skill.clone(),
                    status: status.as_str()?.to_string(),
                })
            })
            .collect()
    }

    fn comparable_rows(rows: &[serde_json::Value]) -> Vec<serde_json::Value> {
        rows.iter()
            .map(|row| {
                json!({
                    "tech": row.get("tech").or_else(|| row.get("id")).cloned().unwrap_or(Value::Null),
                    "mode": row["mode"],
                    "chip": row.get("chip").cloned().unwrap_or_else(|| row["sio"]["chip"].clone()),
                    "overload": row["overload"],
                    "parts": row.get("parts").cloned().unwrap_or_else(|| row["sio"]["parts"].clone()),
                })
            })
            .collect()
    }

    fn actual_rows(config: &serde_json::Value) -> Vec<serde_json::Value> {
        comparable_rows(config["loadout"].as_array().expect("actual loadout rows"))
    }

    fn expected_rows(worker_case: &serde_json::Value) -> Vec<serde_json::Value> {
        comparable_rows(
            worker_case["best"]["rowSignature"]
                .as_array()
                .expect("expected row signature"),
        )
    }

    fn expected_active_skills(worker_case: &serde_json::Value) -> Vec<serde_json::Value> {
        const SKILL_ORDER: [&str; 21] = [
            "Energy Cube",
            "HP Bullet",
            "Exo Bracer",
            "Ammo Thruster",
            "HE Fuel",
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
        worker_case["best"]["enabledSkillIndexes"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|index| SKILL_ORDER.get(index.as_u64()? as usize))
            .filter(|skill| {
                ![
                    "Energy Cube",
                    "HP Bullet",
                    "Exo Bracer",
                    "Ammo Thruster",
                    "HE Fuel",
                ]
                .contains(skill)
            })
            .map(|skill| json!(skill))
            .collect()
    }

    fn assert_number_close(id: &str, path: &str, actual: f64, expected: f64) {
        let tolerance = 1e-9_f64.max(expected.abs() * 1e-12);
        assert!(
            (actual - expected).abs() <= tolerance,
            "{id} {path}: actual {actual} expected {expected}"
        );
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping generated resonance preselect check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    for id in [
        "active_skills_endgame_equipment_coupling",
        "pets_xeno_awakening_sync_rate",
        "evo_endgame_all_tree_interactions",
        "equipment_lme2_judgment_profile",
        "collectibles_individual_star_tables",
        "collectibles_upgraded_multiplier_behavior",
        "collectibles_item_set_folding",
        "collectibles_tech_set_folding",
        "custom_sets_threshold_edges",
        "collectibles_broad_item_tech_set_endgame_fold",
    ] {
        let worker_case = worker["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|case| case["id"].as_str() == Some(id))
            .unwrap();
        let trace_case = trace["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|case| case["id"].as_str() == Some(id))
            .unwrap();
        let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
        let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
            .as_str()
            .unwrap();
        let optimizer = &trace_case["expandedConfig"]["techsOptimizer"];
        let options = TechOptimizerOptions {
            top_k: 5,
            max_exact_nodes: 10,
            sio_profile: SioTechsOptimizerProfile {
                schema_active: true,
                strategy: "optimize".to_string(),
                speed_mode: "precise".to_string(),
                fodder: "excess".to_string(),
                skills: worker_case["skillsRequests"][best_request_index]["skillsCount"]
                    .as_u64()
                    .unwrap() as usize,
                chips: optimizer["chips"].as_u64().unwrap() as usize,
                overloadable: optimizer["overloadable"].as_bool().unwrap(),
                rarity_inputs: rarity_inputs_from_fixture(&optimizer["inputs"]),
                modes: optimizer["modes"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(|mode| {
                        mode.as_str()
                            .and_then(tttg_forge_optimizer::tech::skill_name_to_mode)
                    })
                    .collect(),
                skills_map: skills_map_from_fixture(&optimizer["skillsMap"]),
                ..SioTechsOptimizerProfile::default()
            },
            ..TechOptimizerOptions::default()
        };

        let result = run_tech_optimizer(
            &json!({
                "tech_configs": {},
                "sioLm": {
                    "compactConfig": config_string,
                    "baseStats": trace_case["baseStats"],
                    "candidatePreselectTopK": 256
                }
            }),
            &options,
        )
        .unwrap();
        let top = result.builds.first().expect("top build");

        assert_eq!(
            actual_rows(&top.config),
            expected_rows(worker_case),
            "{id} row signature"
        );
        assert_eq!(
            top.config["sioCandidate"]["activeSkills"],
            Value::Array(expected_active_skills(worker_case)),
            "{id} active skills"
        );
        assert_number_close(
            id,
            "live multiplier",
            top.damage_factor,
            worker_case["best"]["multiplier"].as_f64().unwrap(),
        );
        if id == "collectibles_broad_item_tech_set_endgame_fold" {
            assert_number_close(
                id,
                "multiplier",
                top.damage_factor,
                trace_case["tracedMultiplier"].as_f64().unwrap(),
            );
        }
    }
}

#[test]
fn tech_optimizer_uses_lme2_judgment_bridge_with_compact_only_context() {
    use serde_json::Value;
    use std::path::PathBuf;

    fn rarity_inputs_from_fixture(inputs: &Value) -> Vec<tttg_forge_optimizer::SioRarityInput> {
        inputs
            .as_object()
            .into_iter()
            .flat_map(|inputs| inputs.iter())
            .filter_map(|(rarity, count)| {
                Some(tttg_forge_optimizer::SioRarityInput {
                    rarity: rarity.clone(),
                    count: count.as_u64()? as usize,
                })
            })
            .collect()
    }

    fn skills_map_from_fixture(skills_map: &Value) -> Vec<SioSkillPreference> {
        skills_map
            .as_object()
            .into_iter()
            .flat_map(|skills_map| skills_map.iter())
            .filter_map(|(skill, status)| {
                Some(SioSkillPreference {
                    skill: skill.clone(),
                    status: status.as_str()?.to_string(),
                })
            })
            .collect()
    }

    fn comparable_rows(rows: &[serde_json::Value]) -> Vec<serde_json::Value> {
        rows.iter()
            .map(|row| {
                json!({
                    "tech": row.get("tech").or_else(|| row.get("id")).cloned().unwrap_or(Value::Null),
                    "mode": row["mode"],
                    "chip": row.get("chip").cloned().unwrap_or_else(|| row["sio"]["chip"].clone()),
                    "overload": row["overload"],
                    "parts": row.get("parts").cloned().unwrap_or_else(|| row["sio"]["parts"].clone()),
                })
            })
            .collect()
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping compact-only lme2 judgment bridge check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let id = "equipment_lme2_judgment_profile";
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let trace_case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let optimizer = &trace_case["expandedConfig"]["techsOptimizer"];
    let options = TechOptimizerOptions {
        top_k: 5,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "precise".to_string(),
            fodder: "excess".to_string(),
            skills: worker_case["skillsRequests"][best_request_index]["skillsCount"]
                .as_u64()
                .unwrap() as usize,
            chips: optimizer["chips"].as_u64().unwrap() as usize,
            overloadable: optimizer["overloadable"].as_bool().unwrap(),
            rarity_inputs: rarity_inputs_from_fixture(&optimizer["inputs"]),
            modes: optimizer["modes"]
                .as_array()
                .unwrap()
                .iter()
                .filter_map(|mode| {
                    mode.as_str()
                        .and_then(tttg_forge_optimizer::tech::skill_name_to_mode)
                })
                .collect(),
            skills_map: skills_map_from_fixture(&optimizer["skillsMap"]),
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(
        &json!({
            "tech_configs": {},
            "sioLm": {
                "compactConfig": config_string,
                "candidatePreselectTopK": 256
            }
        }),
        &options,
    )
    .unwrap();
    let top = result.builds.first().expect("top build");

    assert_eq!(
        comparable_rows(top.config["loadout"].as_array().unwrap()),
        comparable_rows(worker_case["best"]["rowSignature"].as_array().unwrap()),
        "{id} compact-only row signature"
    );
}

#[test]
fn tech_optimizer_uses_request_skill_count_for_lm_active_slots() {
    use serde_json::Value;
    use std::path::PathBuf;

    fn rarity_inputs_from_fixture(inputs: &Value) -> Vec<tttg_forge_optimizer::SioRarityInput> {
        inputs
            .as_object()
            .into_iter()
            .flat_map(|inputs| inputs.iter())
            .filter_map(|(rarity, count)| {
                Some(tttg_forge_optimizer::SioRarityInput {
                    rarity: rarity.clone(),
                    count: count.as_u64()? as usize,
                })
            })
            .collect()
    }

    fn skills_map_from_fixture(skills_map: &Value) -> Vec<SioSkillPreference> {
        skills_map
            .as_object()
            .into_iter()
            .flat_map(|skills_map| skills_map.iter())
            .filter_map(|(skill, status)| {
                Some(SioSkillPreference {
                    skill: skill.clone(),
                    status: status.as_str()?.to_string(),
                })
            })
            .collect()
    }

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/worker_decoded_summary.json");
    let trace_path =
        repo_root.join("frontend/artifacts/td11/arbitrary_compact_s59/lm_trace_summary.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping generated active skill count check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let id = "active_skills_slots_and_map";
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let trace_case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap_or(0) as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let optimizer = &trace_case["expandedConfig"]["techsOptimizer"];
    let options = TechOptimizerOptions {
        top_k: 5,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "precise".to_string(),
            fodder: "excess".to_string(),
            skills: worker_case["skillsRequests"][best_request_index]["skillsCount"]
                .as_u64()
                .unwrap() as usize,
            chips: optimizer["chips"].as_u64().unwrap() as usize,
            overloadable: optimizer["overloadable"].as_bool().unwrap(),
            rarity_inputs: rarity_inputs_from_fixture(&optimizer["inputs"]),
            modes: optimizer["modes"]
                .as_array()
                .unwrap()
                .iter()
                .filter_map(|mode| {
                    mode.as_str()
                        .and_then(tttg_forge_optimizer::tech::skill_name_to_mode)
                })
                .collect(),
            skills_map: skills_map_from_fixture(&optimizer["skillsMap"]),
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let result = run_tech_optimizer(
        &json!({
            "tech_configs": {},
            "sioLm": {
                "compactConfig": config_string,
                "baseStats": trace_case["baseStats"],
                "candidatePreselectTopK": 256
            }
        }),
        &options,
    )
    .unwrap();
    let top = result.builds.first().expect("top build");

    assert_eq!(
        top.config["sioCandidate"]["activeSkills"],
        json!([
            "Drone Mode",
            "Drill Shot Mode",
            "Soccer Mode",
            "Molotov Mode"
        ]),
        "{id} active skills"
    );
}

#[test]
fn tech_optimizer_marks_supplied_sio_lm_context_full_equivalent() {
    use serde_json::Value;
    use std::path::PathBuf;

    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let worker_path =
        repo_root.join("frontend/artifacts/td11/sio_worker_decoded_summary_2026-05-20.json");
    let trace_path = repo_root.join("frontend/artifacts/td11/sio_lm_trace_summary_2026-05-20.json");
    if !worker_path.exists() || !trace_path.exists() {
        eprintln!(
            "skipping compact/baseStats context check; artifacts missing: {} {}",
            worker_path.display(),
            trace_path.display()
        );
        return;
    }

    let worker: Value =
        serde_json::from_str(&std::fs::read_to_string(worker_path).unwrap()).unwrap();
    let trace: Value = serde_json::from_str(&std::fs::read_to_string(trace_path).unwrap()).unwrap();
    let id = "default_normal_legend1_epic6_chips40";
    let worker_case = worker["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let best_request_index = worker_case["best"]["requestIndex"].as_u64().unwrap() as usize;
    let config_string = worker_case["skillsRequests"][best_request_index]["configString"]
        .as_str()
        .unwrap();
    let trace_case = trace["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"].as_str() == Some(id))
        .unwrap();
    let mut base_stats = trace_case["baseStats"].clone();
    base_stats["skillDamage"] = json!(210.0);

    let options = TechOptimizerOptions {
        top_k: 1,
        max_exact_nodes: 10,
        sio_profile: SioTechsOptimizerProfile {
            schema_active: true,
            strategy: "optimize".to_string(),
            speed_mode: "normal".to_string(),
            skills: 4,
            chips: 40,
            rarity_inputs: vec![
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Legend".to_string(),
                    count: 1,
                },
                tttg_forge_optimizer::SioRarityInput {
                    rarity: "Epic".to_string(),
                    count: 6,
                },
            ],
            modes: vec![
                "molotovMode".to_string(),
                "durianMode".to_string(),
                "soccerMode".to_string(),
                "droneMode".to_string(),
                "forcefieldMode".to_string(),
                "drillShotMode".to_string(),
                "rocketMode".to_string(),
                "lightningMode".to_string(),
                "boomerangMode".to_string(),
                "guardianMode".to_string(),
                "laserMode".to_string(),
                "brickMode".to_string(),
            ],
            skills_map: vec![
                SioSkillPreference {
                    skill: "Rocket".to_string(),
                    status: "disabled".to_string(),
                },
                SioSkillPreference {
                    skill: "Guardian Mode".to_string(),
                    status: "disabled".to_string(),
                },
            ],
            ..SioTechsOptimizerProfile::default()
        },
        ..TechOptimizerOptions::default()
    };

    let baseline = run_tech_optimizer(&json!({"tech_configs": {}}), &options).unwrap();
    let contextual = run_tech_optimizer(
        &json!({
            "tech_configs": {},
            "sioLm": {
                "compactConfig": config_string,
                "baseStats": base_stats
            }
        }),
        &options,
    )
    .unwrap();

    assert_eq!(contextual.scope.scoring_model, "sio_full_lm_equivalence");
    assert_eq!(
        contextual.builds[0].config["scoreModel"],
        json!("sio_full_lm_equivalence")
    );
    assert!(
        contextual.builds[0].damage_factor > baseline.builds[0].damage_factor * 1.05,
        "contextual={} baseline={}",
        contextual.builds[0].damage_factor,
        baseline.builds[0].damage_factor
    );
    assert!(contextual.scope.full_sio_equivalent);
}
