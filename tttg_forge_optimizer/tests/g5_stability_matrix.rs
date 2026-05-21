use serde_json::json;
use tttg_forge_optimizer::{
    build_diff, build_search_space_heatmap, compare_bench_reports, BenchRegressionPolicy,
    BenchRegressionReport, BenchRegressionRow, DiffDirection, HeatmapBucket,
    OptimizationSearchSpace, SearchChoice, SearchSlot,
};

macro_rules! root_diff_case {
    ($name:ident, $before:expr, $after:expr, $direction:expr, $magnitude:expr) => {
        #[test]
        fn $name() {
            let diff = build_diff(&json!($before), &json!($after));

            assert_eq!(diff.changed_count, 1);
            assert_eq!(diff.entries[0].path, "$");
            assert_eq!(diff.entries[0].direction, $direction);
            assert_eq!(diff.entries[0].magnitude, $magnitude);
        }
    };
}

root_diff_case!(
    g5_root_number_increase,
    1.0,
    2.25,
    DiffDirection::Increased,
    1.25
);
root_diff_case!(
    g5_root_number_decrease,
    5.0,
    3.0,
    DiffDirection::Decreased,
    2.0
);
root_diff_case!(g5_root_string_change, "a", "b", DiffDirection::Changed, 0.0);
root_diff_case!(
    g5_root_bool_change,
    true,
    false,
    DiffDirection::Changed,
    0.0
);

macro_rules! heatmap_bucket_case {
    ($name:ident, $score:expr, $damage:expr, $bucket:expr) => {
        #[test]
        fn $name() {
            let space = OptimizationSearchSpace {
                slots: vec![SearchSlot {
                    name: "slot".to_string(),
                    choices: vec![SearchChoice {
                        name: "choice".to_string(),
                        score_delta: $score,
                        damage_delta: $damage,
                    }],
                }],
                top_k: 1,
            };

            let cells = build_search_space_heatmap(&space);

            assert_eq!(cells[0].bucket, $bucket);
        }
    };
}

heatmap_bucket_case!(
    g5_heatmap_negative_score_dominant,
    -9.0,
    2.0,
    HeatmapBucket::Score
);
heatmap_bucket_case!(
    g5_heatmap_negative_damage_dominant,
    2.0,
    -9.0,
    HeatmapBucket::Damage
);
heatmap_bucket_case!(
    g5_heatmap_negative_balanced,
    -5.0,
    -4.5,
    HeatmapBucket::Balanced
);
heatmap_bucket_case!(
    g5_heatmap_zero_score_damage_dominant,
    0.0,
    3.0,
    HeatmapBucket::Damage
);
heatmap_bucket_case!(
    g5_heatmap_score_only_dominant,
    3.0,
    0.0,
    HeatmapBucket::Score
);
heatmap_bucket_case!(
    g5_heatmap_negative_zero_baseline,
    -0.0,
    0.0,
    HeatmapBucket::Baseline
);

#[test]
fn g5_bench_policy_allows_multiple_samples_when_all_pass() {
    let baseline = report(vec![row("a", 1.0, 0.90, true), row("b", 2.0, 0.80, true)]);
    let current = report(vec![row("a", 1.4, 0.90, true), row("b", 2.9, 0.80, true)]);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn g5_bench_policy_checks_each_sample_independently() {
    let baseline = report(vec![row("a", 1.0, 0.90, true), row("b", 2.0, 0.80, true)]);
    let current = report(vec![row("a", 1.0, 0.90, true), row("b", 4.0, 0.80, true)]);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert_eq!(failures.len(), 1);
    assert!(failures[0].contains("b wall-clock"));
}

#[test]
fn g5_bench_policy_floor_handles_zero_baseline() {
    let baseline = report(vec![row("zero", 0.0, 0.90, true)]);
    let current = report(vec![row("zero", 0.049, 0.90, true)]);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn g5_bench_policy_rejects_zero_baseline_beyond_floor() {
    let baseline = report(vec![row("zero", 0.0, 0.90, true)]);
    let current = report(vec![row("zero", 0.051, 0.90, true)]);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert_eq!(failures.len(), 1);
}

#[test]
fn g5_bench_policy_custom_pruning_limit_can_relax_check() {
    let baseline = report(vec![row("sample", 1.0, 0.90, true)]);
    let current = report(vec![row("sample", 1.0, 0.82, true)]);
    let policy = BenchRegressionPolicy {
        wall_clock_regression_limit: 1.50,
        min_wall_clock_abs_floor_ms: 0.050,
        pruning_rate_regression_limit: 0.10,
        ..BenchRegressionPolicy::default()
    };

    let failures = compare_bench_reports(&baseline, &current, &policy);

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn g5_bench_policy_custom_floor_can_relax_tiny_sample() {
    let baseline = report(vec![row("tiny", 0.01, 0.90, true)]);
    let current = report(vec![row("tiny", 0.20, 0.90, true)]);
    let policy = BenchRegressionPolicy {
        wall_clock_regression_limit: 1.50,
        min_wall_clock_abs_floor_ms: 0.25,
        pruning_rate_regression_limit: 0.05,
        ..BenchRegressionPolicy::default()
    };

    let failures = compare_bench_reports(&baseline, &current, &policy);

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn g5_bench_policy_keeps_failure_text_actionable() {
    let baseline = report(vec![row("sample", 1.0, 0.90, true)]);
    let current = report(vec![row("sample", 2.0, 0.90, true)]);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert!(failures[0].contains("baseline 1.000000ms"));
    assert!(failures[0].contains("floor 0.050ms"));
}

#[test]
fn g5_bench_policy_exact_mismatch_does_not_mask_wall_clock_failure() {
    let baseline = report(vec![row("sample", 1.0, 0.90, true)]);
    let current = report(vec![row("sample", 2.0, 0.90, false)]);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert_eq!(failures.len(), 2);
}

fn report(rows: Vec<BenchRegressionRow>) -> BenchRegressionReport {
    BenchRegressionReport {
        generated_by: "g5-test".to_string(),
        iterations: 1,
        machine_id: "g5-test-machine".to_string(),
        warm_up_iterations: 0,
        rows,
        average_pruning_delta: 0.0,
        average_wall_clock_delta: 0.0,
        all_exact_match: true,
    }
}

fn row(sample: &str, tight_mean_ms: f64, pruning_rate: f64, exact: bool) -> BenchRegressionRow {
    BenchRegressionRow {
        sample: sample.to_string(),
        combinations: 1,
        top_k: 1,
        loose_visited_nodes: 1,
        loose_pruned_nodes: 0,
        loose_pruning_rate: pruning_rate,
        loose_mean_ms: tight_mean_ms,
        loose_stddev_ms: 0.0,
        tight_visited_nodes: 1,
        tight_pruned_nodes: 0,
        tight_pruning_rate: pruning_rate,
        tight_mean_ms,
        tight_stddev_ms: 0.0,
        exact_match: exact,
    }
}
