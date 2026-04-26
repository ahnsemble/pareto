use approx::assert_relative_eq;
use serde_json::{json, Value};
use tttg_forge_core::*;

const FIXTURE_ROOT: &str = "/Users/woosung/Desktop/Dev/Woosdom_Brain/01_Domains/System/codex_output/tttg_forge_sprint_b_2026-04-19/geotool_reimplementation/tests/fixtures";

fn load_fixture(name: &str) -> Value {
    serde_json::from_str(&std::fs::read_to_string(std::path::Path::new(FIXTURE_ROOT).join(name)).unwrap()).unwrap()
}

fn assert_synthetic_score(name: &str) {
    let case = load_fixture(name);
    let damage = calculate_damage_factor(&case["stats"], &case["ceDamageTechs"]).unwrap();
    let score = calculate_score(
        &case["stats"],
        &case["meta"],
        damage.damage_factor,
        &damage.ce_damage,
        case["calcMode"].as_str().unwrap(),
        &case["skills"],
        case["passivePools"].as_array().unwrap(),
        case["gameMode"].as_str().unwrap(),
    )
    .unwrap();
    assert_relative_eq!(score, case["expected"]["score"].as_f64().unwrap(), epsilon = 1e-9);
}

#[test]
fn synthetic_damage_b_score_matches_python() {
    assert_synthetic_score("synthetic_damage_b.json");
}

#[test]
fn synthetic_multiplier_c_score_matches_python() {
    assert_synthetic_score("synthetic_multiplier_c.json");
}

#[test]
fn merge_stat_dicts_sums_numeric_keys() {
    assert_eq!(merge_stat_dicts(&[json!({"atk": 2.0}), json!({"atk": 3.5, "hp": 1})]), json!({"atk": 5.5, "hp": 1.0}));
}

#[test]
fn coerce_pool_vector_preserves_numeric_entries() {
    assert_eq!(coerce_pool_vector(&json!([1, 2.5, null])), vec![1.0, 2.5, 0.0]);
}

macro_rules! core_smoke {
    ($name:ident, $index:expr) => {
        #[test]
        fn $name() {
            let value = $index as f64;
            let merged = merge_stat_dicts(&[
                json!({"atkPercent": value, "critRate": value / 2.0}),
                json!({"atkPercent": 1.0, "skillDamage": 2.0}),
            ]);
            assert_eq!(merged["atkPercent"], json!(value + 1.0));
            assert_eq!(coerce_stat_dict(&merged)["skillDamage"], json!(2.0));
            assert!(get_base_stats().as_object().unwrap().contains_key("critDamage"));
            assert_eq!(bridge_set(&[json!({"x": value}), json!({"x": 1.0})])["x"], json!(value + 1.0));
        }
    };
}

core_smoke!(core_smoke_00, 0);
core_smoke!(core_smoke_01, 1);
core_smoke!(core_smoke_02, 2);
core_smoke!(core_smoke_03, 3);
core_smoke!(core_smoke_04, 4);
core_smoke!(core_smoke_05, 5);
core_smoke!(core_smoke_06, 6);
core_smoke!(core_smoke_07, 7);
core_smoke!(core_smoke_08, 8);
core_smoke!(core_smoke_09, 9);
core_smoke!(core_smoke_10, 10);
core_smoke!(core_smoke_11, 11);
core_smoke!(core_smoke_12, 12);
core_smoke!(core_smoke_13, 13);
core_smoke!(core_smoke_14, 14);
core_smoke!(core_smoke_15, 15);
core_smoke!(core_smoke_16, 16);
core_smoke!(core_smoke_17, 17);
core_smoke!(core_smoke_18, 18);
core_smoke!(core_smoke_19, 19);
core_smoke!(core_smoke_20, 20);
core_smoke!(core_smoke_21, 21);
core_smoke!(core_smoke_22, 22);
core_smoke!(core_smoke_23, 23);
core_smoke!(core_smoke_24, 24);
core_smoke!(core_smoke_25, 25);
core_smoke!(core_smoke_26, 26);
core_smoke!(core_smoke_27, 27);
core_smoke!(core_smoke_28, 28);
core_smoke!(core_smoke_29, 29);
core_smoke!(core_smoke_30, 30);
core_smoke!(core_smoke_31, 31);
core_smoke!(core_smoke_32, 32);
core_smoke!(core_smoke_33, 33);
core_smoke!(core_smoke_34, 34);
core_smoke!(core_smoke_35, 35);
core_smoke!(core_smoke_36, 36);
core_smoke!(core_smoke_37, 37);
core_smoke!(core_smoke_38, 38);
core_smoke!(core_smoke_39, 39);
core_smoke!(core_smoke_40, 40);
core_smoke!(core_smoke_41, 41);
core_smoke!(core_smoke_42, 42);
core_smoke!(core_smoke_43, 43);
core_smoke!(core_smoke_44, 44);
core_smoke!(core_smoke_45, 45);
core_smoke!(core_smoke_46, 46);
core_smoke!(core_smoke_47, 47);
core_smoke!(core_smoke_48, 48);
core_smoke!(core_smoke_49, 49);
core_smoke!(core_smoke_50, 50);
core_smoke!(core_smoke_51, 51);
core_smoke!(core_smoke_52, 52);
core_smoke!(core_smoke_53, 53);
core_smoke!(core_smoke_54, 54);
core_smoke!(core_smoke_55, 55);
core_smoke!(core_smoke_56, 56);
core_smoke!(core_smoke_57, 57);
core_smoke!(core_smoke_58, 58);
core_smoke!(core_smoke_59, 59);
