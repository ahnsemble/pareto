use serde_json::json;
use tttg_forge_optimizer::{build_diff, DiffDirection};

#[test]
fn build_diff_reports_added_removed_and_changed_paths() {
    let before = json!({
        "weapon": {"name": "Kunai", "atk": 10.0},
        "pet": {"name": "Rex", "hp": 4.0},
        "obsolete": true
    });
    let after = json!({
        "weapon": {"name": "Kunai", "atk": 13.5},
        "pet": {"name": "Murica", "hp": 4.0},
        "newPassive": "Exo Bracer"
    });

    let diff = build_diff(&before, &after);

    assert_eq!(diff.changed_count, 4);
    assert!(diff.entries.iter().any(|entry| entry.path == "weapon.atk"
        && entry.direction == DiffDirection::Increased
        && entry.magnitude == 3.5));
    assert!(diff
        .entries
        .iter()
        .any(|entry| entry.path == "pet.name" && entry.direction == DiffDirection::Changed));
    assert!(diff
        .entries
        .iter()
        .any(|entry| entry.path == "newPassive" && entry.direction == DiffDirection::Added));
    assert!(diff
        .entries
        .iter()
        .any(|entry| entry.path == "obsolete" && entry.direction == DiffDirection::Removed));
}

#[test]
fn build_diff_is_stably_ordered_by_path() {
    let before = json!({"z": 1, "a": 1, "m": {"b": 1}});
    let after = json!({"z": 2, "a": 2, "m": {"b": 2}});

    let diff = build_diff(&before, &after);
    let paths = diff
        .entries
        .iter()
        .map(|entry| entry.path.as_str())
        .collect::<Vec<_>>();

    assert_eq!(paths, vec!["a", "m.b", "z"]);
}

macro_rules! numeric_diff_case {
    ($name:ident, $before:expr, $after:expr, $direction:expr, $magnitude:expr) => {
        #[test]
        fn $name() {
            let diff = build_diff(&json!({"stat": $before}), &json!({"stat": $after}));

            assert_eq!(diff.changed_count, 1);
            assert_eq!(diff.entries[0].path, "stat");
            assert_eq!(diff.entries[0].direction, $direction);
            assert_eq!(diff.entries[0].magnitude, $magnitude);
        }
    };
}

numeric_diff_case!(
    build_diff_numeric_increase_small,
    1.0,
    1.5,
    DiffDirection::Increased,
    0.5
);
numeric_diff_case!(
    build_diff_numeric_increase_large,
    10.0,
    25.0,
    DiffDirection::Increased,
    15.0
);
numeric_diff_case!(
    build_diff_numeric_decrease_small,
    2.0,
    1.25,
    DiffDirection::Decreased,
    0.75
);
numeric_diff_case!(
    build_diff_numeric_decrease_large,
    50.0,
    10.0,
    DiffDirection::Decreased,
    40.0
);

#[test]
fn build_diff_identical_objects_have_zero_entries() {
    let value = json!({"equipment": {"weapon": "Kunai"}, "stats": {"atk": 1.0}});

    let diff = build_diff(&value, &value);

    assert_eq!(diff.changed_count, 0);
    assert!(diff.entries.is_empty());
}

#[test]
fn build_diff_array_values_are_compared_as_leaf_values() {
    let diff = build_diff(
        &json!({"skills": ["a", "b"]}),
        &json!({"skills": ["a", "c"]}),
    );

    assert_eq!(diff.changed_count, 1);
    assert_eq!(diff.entries[0].path, "skills");
    assert_eq!(diff.entries[0].direction, DiffDirection::Changed);
}

#[test]
fn build_diff_counts_added_and_removed_entries() {
    let diff = build_diff(
        &json!({"removed": 1, "same": 2}),
        &json!({"added": 3, "same": 2}),
    );

    assert_eq!(diff.changed_count, 2);
    assert_eq!(diff.added_count, 1);
    assert_eq!(diff.removed_count, 1);
}

#[test]
fn build_diff_added_numeric_magnitude_uses_absolute_value() {
    let diff = build_diff(&json!({}), &json!({"penalty": -7.0}));

    assert_eq!(diff.entries[0].direction, DiffDirection::Added);
    assert_eq!(diff.entries[0].magnitude, 7.0);
}

#[test]
fn build_diff_removed_numeric_magnitude_uses_absolute_value() {
    let diff = build_diff(&json!({"penalty": -4.0}), &json!({}));

    assert_eq!(diff.entries[0].direction, DiffDirection::Removed);
    assert_eq!(diff.entries[0].magnitude, 4.0);
}

#[test]
fn build_diff_nested_removed_path_is_preserved() {
    let diff = build_diff(&json!({"stats": {"crit": 2.0}}), &json!({"stats": {}}));

    assert_eq!(diff.entries[0].path, "stats.crit");
    assert_eq!(diff.entries[0].direction, DiffDirection::Removed);
}

#[test]
fn build_diff_nested_added_path_is_preserved() {
    let diff = build_diff(&json!({"stats": {}}), &json!({"stats": {"crit": 2.0}}));

    assert_eq!(diff.entries[0].path, "stats.crit");
    assert_eq!(diff.entries[0].direction, DiffDirection::Added);
}
