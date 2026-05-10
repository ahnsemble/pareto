use tttg_forge_optimizer::{
    bench_pass_rate, benchmark_regression_rows, compare_bench_reports, sample_stddev_ms,
    BenchMachineProfile, BenchRegressionPolicy, BenchRegressionReport, BenchRegressionRow,
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
        ..BenchRegressionPolicy::default()
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
        ..BenchRegressionPolicy::default()
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
        ..BenchRegressionPolicy::default()
    };

    let failures = compare_bench_reports(&baseline, &current, &policy);

    assert_eq!(failures.len(), 1);
}

#[test]
fn sample_stddev_is_zero_for_empty_measurements() {
    assert_eq!(sample_stddev_ms(&[]), 0.0);
}

#[test]
fn sample_stddev_is_zero_for_single_measurement() {
    assert_eq!(sample_stddev_ms(&[1.0]), 0.0);
}

#[test]
fn sample_stddev_tracks_variance_for_multiple_measurements() {
    let stddev = sample_stddev_ms(&[1.0, 2.0, 3.0]);

    assert!((stddev - 0.8164965809).abs() < 0.000001);
}

#[test]
fn bench_pass_rate_is_one_when_no_runs_execute() {
    assert_eq!(bench_pass_rate(0, 0), 1.0);
}

#[test]
fn bench_pass_rate_counts_successes() {
    assert_eq!(bench_pass_rate(50, 2), 0.96);
}

#[test]
fn bench_pass_rate_never_drops_below_zero() {
    assert_eq!(bench_pass_rate(5, 10), 0.0);
}

#[test]
fn bench_machine_profile_default_uses_fifty_iterations() {
    assert_eq!(BenchMachineProfile::default().iterations, 50);
}

#[test]
fn bench_machine_profile_default_uses_three_warmups() {
    assert_eq!(BenchMachineProfile::default().warm_up_iterations, 3);
}

#[test]
fn bench_machine_profile_names_current_machine() {
    assert!(!BenchMachineProfile::default().machine_id.is_empty());
}

#[test]
fn benchmark_rows_include_tight_stddev_tracking() {
    let rows = benchmark_regression_rows(1);

    assert!(rows.iter().all(|row| row.tight_stddev_ms >= 0.0));
}

#[test]
fn benchmark_rows_include_loose_stddev_tracking() {
    let rows = benchmark_regression_rows(1);

    assert!(rows.iter().all(|row| row.loose_stddev_ms >= 0.0));
}

#[test]
fn bench_policy_reports_sample_name_when_variance_is_high() {
    let baseline = report_with_row("sample", 1.0, 0.90, true);
    let mut current = report_with_row("sample", 1.0, 0.90, true);
    current.rows[0].tight_stddev_ms = 10.0;
    let policy = BenchRegressionPolicy {
        max_relative_stddev: 1.0,
        ..BenchRegressionPolicy::default()
    };

    let failures = compare_bench_reports(&baseline, &current, &policy);

    assert_eq!(failures.len(), 1);
    assert!(failures[0].contains("sample variance"));
}

#[test]
fn bench_policy_allows_low_relative_variance() {
    let baseline = report_with_row("sample", 10.0, 0.90, true);
    let mut current = report_with_row("sample", 10.0, 0.90, true);
    current.rows[0].tight_stddev_ms = 0.2;

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn bench_policy_ignores_variance_for_zero_mean() {
    let baseline = report_with_row("sample", 0.0, 0.90, true);
    let mut current = report_with_row("sample", 0.0, 0.90, true);
    current.rows[0].tight_stddev_ms = 10.0;

    let failures = compare_bench_reports(&baseline, &current, &BenchRegressionPolicy::default());

    assert!(failures.is_empty(), "{failures:?}");
}

#[test]
fn bench_policy_default_requires_ninety_five_percent_pass_rate() {
    assert_eq!(BenchRegressionPolicy::default().minimum_pass_rate, 0.95);
}

#[test]
fn bench_policy_default_limits_relative_stddev() {
    assert_eq!(BenchRegressionPolicy::default().max_relative_stddev, 1.0);
}

#[test]
fn bench_pass_rate_for_fifty_runs_accepts_two_failures() {
    assert!(bench_pass_rate(50, 2) >= BenchRegressionPolicy::default().minimum_pass_rate);
}

#[test]
fn bench_pass_rate_for_fifty_runs_rejects_three_failures() {
    assert!(bench_pass_rate(50, 3) < BenchRegressionPolicy::default().minimum_pass_rate);
}

#[test]
fn benchmark_report_records_machine_profile() {
    let report = tttg_forge_optimizer::benchmark_regression_report(1);

    assert!(!report.machine_id.is_empty());
}

#[test]
fn benchmark_report_records_warm_up_iterations() {
    let report = tttg_forge_optimizer::benchmark_regression_report(1);

    assert_eq!(report.warm_up_iterations, 3);
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
            loose_stddev_ms: 0.0,
            tight_visited_nodes: 1,
            tight_pruned_nodes: 0,
            tight_pruning_rate: pruning_rate,
            tight_mean_ms,
            tight_stddev_ms: 0.0,
            exact_match: exact,
        }],
        machine_id: "test-machine".to_string(),
        warm_up_iterations: 0,
        average_pruning_delta: 0.0,
        average_wall_clock_delta: 0.0,
        all_exact_match: exact,
    }
}
