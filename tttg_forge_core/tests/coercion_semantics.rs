use serde_json::json;
use tttg_forge_core::{bridge_set, coerce_pool_vector, coerce_stat_dict, merge_stat_dicts};

#[test]
fn merge_stat_dicts_sums_array_of_numeric_objects() {
    assert_eq!(
        merge_stat_dicts(&[json!({"atk": 2.0}), json!({"atk": 3.5})]),
        json!({"atk": 5.5})
    );
}

#[test]
fn merge_stat_dicts_coerces_nonnumeric_object_value_to_zero() {
    assert_eq!(
        merge_stat_dicts(&[json!({"atk": "x"})]),
        json!({"atk": 0.0})
    );
}

#[test]
fn merge_stat_dicts_ignores_non_object_array_entry() {
    assert_eq!(
        merge_stat_dicts(&[json!(["bad"]), json!({"atk": 1.0})]),
        json!({"atk": 1.0})
    );
}

#[test]
fn merge_stat_dicts_empty_input_matches_non_array_wrapper_fallback() {
    assert_eq!(merge_stat_dicts(&[]), json!({}));
}

#[test]
fn bridge_set_sums_array_of_numeric_objects() {
    assert_eq!(
        bridge_set(&[json!({"x": 1.0}), json!({"x": 2.0})]),
        json!({"x": 3.0})
    );
}

#[test]
fn bridge_set_coerces_nonnumeric_object_value_to_zero() {
    assert_eq!(
        bridge_set(&[json!({"x": null}), json!({"x": 1.0})]),
        json!({"x": 1.0})
    );
}

#[test]
fn coerce_stat_dict_keeps_numeric_and_converts_null_to_zero() {
    assert_eq!(
        coerce_stat_dict(&json!({"a": 1.0, "b": null})),
        json!({"a": 1.0, "b": 0.0})
    );
}

#[test]
fn coerce_stat_dict_returns_empty_for_non_object() {
    assert_eq!(coerce_stat_dict(&json!(["bad"])), json!({}));
}

#[test]
fn coerce_pool_vector_keeps_numeric_and_converts_mixed_values_to_zero() {
    assert_eq!(
        coerce_pool_vector(&json!([1.0, 2.5, null, "x"])),
        vec![1.0, 2.5, 0.0, 0.0]
    );
}

#[test]
fn coerce_pool_vector_returns_empty_for_non_array() {
    assert_eq!(coerce_pool_vector(&json!({"x": 1.0})), Vec::<f64>::new());
}
