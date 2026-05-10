use tttg_forge_optimizer::benchmark_regression_rows;

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
