use serde_json::{json, Value};
use tttg_forge_core::{
    calculate_damage_factor, calculate_score, coerce_pool_vector, coerce_stat_dict, get_base_stats,
    merge_stat_dicts,
};

fn stats(entries: &[(&str, f64)]) -> Value {
    let mut value = json!({"voidNeckBoostUptime": 1.0});
    let object = value.as_object_mut().unwrap();
    for (key, entry) in entries {
        object.insert((*key).to_string(), json!(entry));
    }
    value
}

fn score_for(stats: &Value, calc_mode: &str, game_mode: &str, damage_factor: f64) -> f64 {
    calculate_score(
        stats,
        &json!({"atkBase": 100.0, "atkFinal": 0.0}),
        damage_factor,
        &json!({}),
        calc_mode,
        &json!({}),
        &[],
        game_mode,
    )
    .unwrap()
}

#[test]
fn score_clamps_crit_rate_above_one_hundred_percent() {
    let actual = score_for(
        &stats(&[("critRate", 250.0), ("critDamage", 300.0)]),
        "score",
        "",
        1.0,
    );

    assert_eq!(actual, 300.0);
}

#[test]
fn score_clamps_negative_crit_rate_to_zero() {
    let actual = score_for(
        &stats(&[("critRate", -20.0), ("critDamage", 300.0)]),
        "score",
        "",
        1.0,
    );

    assert_eq!(actual, 100.0);
}

#[test]
fn score_floors_crit_damage_at_two_hundred_percent() {
    let actual = score_for(
        &stats(&[("critRate", 100.0), ("critDamage", 150.0)]),
        "score",
        "",
        1.0,
    );

    assert_eq!(actual, 200.0);
}

#[test]
fn score_applies_positive_skill_damage_multiplier() {
    let actual = score_for(&stats(&[("skillDamage", 50.0)]), "score", "", 1.0);

    assert_eq!(actual, 150.0);
}

#[test]
fn score_clamps_negative_skill_damage_to_neutral() {
    let actual = score_for(&stats(&[("skillDamage", -50.0)]), "score", "", 1.0);

    assert_eq!(actual, 100.0);
}

#[test]
fn score_applies_vulnerability_multiplier() {
    let actual = score_for(&stats(&[("vulnerability", 25.0)]), "score", "", 1.0);

    assert_eq!(actual, 125.0);
}

#[test]
fn score_applies_lme1_damage_only_in_lme1_mode() {
    let actual = score_for(&stats(&[("lme1Damage", 40.0)]), "score", "lme1", 1.0);

    assert_eq!(actual, 140.0);
}

#[test]
fn score_ignores_lme1_damage_outside_lme1_mode() {
    let actual = score_for(&stats(&[("lme1Damage", 40.0)]), "score", "", 1.0);

    assert_eq!(actual, 100.0);
}

#[test]
fn damage_mode_multiplies_by_nonzero_damage_factor() {
    let actual = score_for(&stats(&[]), "damage", "", 2.0);

    assert_eq!(actual, 200.0);
}

#[test]
fn damage_mode_treats_zero_damage_factor_as_neutral() {
    let actual = score_for(&stats(&[]), "damage", "", 0.0);

    assert_eq!(actual, 100.0);
}

#[test]
fn merge_stat_dicts_sums_negative_and_positive_values() {
    let actual = merge_stat_dicts(&[json!({"atk": 4.0}), json!({"atk": -1.5})]);

    assert_eq!(actual["atk"], json!(2.5));
}

#[test]
fn merge_stat_dicts_ignores_array_entries() {
    let actual = merge_stat_dicts(&[json!({"atk": 4.0}), json!(["ignored"])]);

    assert_eq!(actual, json!({"atk": 4.0}));
}

#[test]
fn coerce_stat_dict_returns_zero_for_null_values() {
    let actual = coerce_stat_dict(&json!({"atk": null, "hp": 2.0}));

    assert_eq!(actual, json!({"atk": 0.0, "hp": 2.0}));
}

#[test]
fn coerce_pool_vector_returns_empty_for_object_input() {
    assert!(coerce_pool_vector(&json!({"0": 1.0})).is_empty());
}

#[test]
fn damage_factor_sums_numeric_ce_damage_entries() {
    let actual =
        calculate_damage_factor(&get_base_stats(), &json!({"x": 2.0, "bad": "zero"})).unwrap();

    assert!(actual.damage_factor >= 2.0);
    assert_eq!(actual.ce_damage["x"], json!(2.0));
    assert_eq!(actual.ce_damage["bad"], json!(0.0));
}
