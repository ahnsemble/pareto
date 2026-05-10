use tttg_forge_optimizer::{
    benchmark_regression_rows, compare_bench_reports, BenchRegressionPolicy,
    BenchRegressionReport, BenchRegressionRow,
};

#[test]
fn benchmark_regression_rows_cover_five_samples() {
    let rows = benchmark_regression_rows(1);

    assert_eq!(rows.len(), 5);
    assert!(rows.iter().all(|row| row.exact_match));
}

#[test]
fn tight_estimator_improves_average_pruning_rate_by_ten_points() {
    let rows = benchmark_regression_rows(1);
    let average_delta = rows
        .iter()
        .map(|row| row.tight_pruning_rate - row.loose_pruning_rate)
        .sum::<f64>()
        / rows.len() as f64;

    assert!(average_delta >= 0.10, "average_delta={average_delta}");
}

#[test]
fn bench_policy_allows_tiny_wall_clock_noise_with_absolute_floor() {
    let baseline = report_with_row("tiny", 0.010, 0.90, true);
    let current = report_with_row("tiny", 0.040, 0.90, true);
    let policy = BenchRegressionPolicy {
        wall_clock_regression_limit: 1.50,
        min_wall_clock_abs_floor_ms: 0.050,
        pruning_rate_regression_limit: 0.05,
    };

    let failures = compare_bench_reports(&baseline, &current, &policy);

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn bench_policy_rejects_large_wall_clock_regression_after_floor() {
    let baseline = report_with_row("medium", 1.0, 0.90, true);
    let current = report_with_row("medium", 1.7, 0.90, true);
    let policy = BenchRegressionPolicy {
        wall_clock_regression_limit: 1.50,
        min_wall_clock_abs_floor_ms: 0.050,
        pruning_rate_regression_limit: 0.05,
    };

    let failures = compare_bench_reports(&baseline, &current, &policy);

    assert_eq!(failures.len(), 1);
    assert!(failures[0].contains("wall-clock"));
}

#[test]
fn bench_policy_rejects_exact_mismatch() {
    let baseline = report_with_row("sample", 1.0, 0.90, true);
    let current = report_with_row("sample", 1.0, 0.90, false);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert_eq!(failures, vec!["sample exact_match=false".to_string()]);
}

#[test]
fn bench_policy_rejects_missing_sample() {
    let baseline = report_with_row("expected", 1.0, 0.90, true);
    let current = report_with_row("other", 1.0, 0.90, true);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert_eq!(failures, vec!["missing sample expected".to_string()]);
}

#[test]
fn bench_policy_rejects_pruning_regression_beyond_limit() {
    let baseline = report_with_row("sample", 1.0, 0.90, true);
    let current = report_with_row("sample", 1.0, 0.80, true);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert_eq!(failures.len(), 1);
    assert!(failures[0].contains("pruning"));
}

#[test]
fn bench_policy_allows_pruning_regression_at_limit() {
    let baseline = report_with_row("sample", 1.0, 0.90, true);
    let current = report_with_row("sample", 1.0, 0.85, true);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn bench_policy_default_uses_one_point_five_wall_clock_limit() {
    assert_eq!(
        BenchRegressionPolicy::default().wall_clock_regression_limit,
        1.50
    );
}

#[test]
fn bench_policy_default_uses_absolute_floor() {
    assert_eq!(
        BenchRegressionPolicy::default().min_wall_clock_abs_floor_ms,
        0.050
    );
}

#[test]
fn bench_policy_collects_multiple_failures_for_same_sample() {
    let baseline = report_with_row("sample", 1.0, 0.90, true);
    let current = report_with_row("sample", 2.0, 0.50, false);

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert_eq!(failures.len(), 3);
}

#[test]
fn bench_policy_can_be_tightened_for_local_experiments() {
    let baseline = report_with_row("sample", 1.0, 0.90, true);
    let current = report_with_row("sample", 1.2, 0.90, true);
    let policy = BenchRegressionPolicy {
        wall_clock_regression_limit: 1.10,
        min_wall_clock_abs_floor_ms: 0.0,
        pruning_rate_regression_limit: 0.05,
    };

    let failures = compare_bench_reports(&baseline, &current, &policy);

    assert_eq!(failures.len(), 1);
}

fn report_with_row(sample: &str, tight_mean_ms: f64, pruning_rate: f64, exact: bool) -> BenchRegressionReport {
    BenchRegressionReport {
        generated_by: "test".to_string(),
        iterations: 1,
        rows: vec![BenchRegressionRow {
            sample: sample.to_string(),
            combinations: 1,
            top_k: 1,
            loose_visited_nodes: 1,
            loose_pruned_nodes: 0,
            loose_pruning_rate: pruning_rate,
            loose_mean_ms: tight_mean_ms,
            tight_visited_nodes: 1,
            tight_pruned_nodes: 0,
            tight_pruning_rate: pruning_rate,
            tight_mean_ms,
            exact_match: exact,
        }],
        average_pruning_delta: 0.0,
        average_wall_clock_delta: 0.0,
        all_exact_match: exact,
    }
}
