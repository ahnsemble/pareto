use serde_json::{json, Value};
use std::time::Instant;
use tttg_forge_core::decode_public_raw;
use tttg_forge_optimizer::{find_best_bb, find_best_beam, make_synthetic_search_space};

const RAW_WCRS4V: &str = "XQAAAAK3CQAAAAAAAABtAlIGDy3Uia2uW1yO129jxwXjiHQU-WPVSgiewGDR8Fd-3R7yZI4n7rLp7oN7ao3cmLS-wzrnrvVaSR1jOG8ODb5GQZukxavIHhiSBWdRuFQtD91RoRdRWtgMwsZMlm9LinG3SLQaL9Z98gArg51s_eVqy5K0qIvSdai6508DQsWZXT_7d7eSqB6K5FyqdidFCj309acDmUhepTiFwItr8Z82RLq-FgtdwzoeDNGDw9c2N6l_yocBKZDcyvc4NK0qJG5-fWY_Vcd2qGQJjjRCtaPCMxQMwFjcu28G6QN7HIRqgG3X7MP_nBPK67iBVSGbnGDgF0lJqcgzBoE0vYAATvpt0dX9zD_Cz-613NG-WRsCvs0KlDcJjFZIAnpA13khzV0IfXc5-s6-lSx0VN7DFcc1QFtTsiouNwDuzQ0lR4XvLgtHAz0n8H638WtCR5URqqT1hI6f5V2_zXjpY0Cz-TyPhXwGw_WNUitf64VUPttWp9HFpGsXLcBQpMyQDPAiewxGz6dvhKzGU091zLG9FfZP98rfCFx5qxj2Qf5-VDGQs3yb9XHtlMcVOu_k9lLwzfMOEGajwvBEvNs24UT88GURjtSnxKLY8OfFRgvtf8WquUu2QhCFQNYvdh1wAwQ_hcKrQn4TxrXD4wykcqnDP2bvxIATAk0PxE1dgE2_egVF0PxGqkvWlDl6q__6_Sb0";

fn main() {
    let prepared = json!({"score": 1000.0, "damageFactor": 100.0});
    let mut rows = Vec::new();

    for (space_size, python_ms, target_ms) in [
        ("1e6", 0.056, 0.003735),
        ("1e9", 0.056, 0.003735),
        ("1e12", 0.056, 0.003735),
        ("1e15", 0.056, 0.003735),
    ] {
        rows.push(measure("decode", space_size, python_ms, target_ms, 100, || {
            let _ = decode_public_raw(RAW_WCRS4V).unwrap();
        }));
    }

    for (space_size, slots, python_ms, target_ms) in [
        ("1e6", 8, 1.35, 0.16875),
        ("1e9", 9, 4.28, 0.535),
        ("1e12", 10, 8.74, 1.0925),
        ("1e15", 11, 20.32, 2.540701),
    ] {
        let space = make_synthetic_search_space(slots, true, false, 10);
        rows.push(measure("branch_bound", space_size, python_ms, target_ms, 10, || {
            let _ = find_best_bb(&prepared, &json!({}), &space, 10).unwrap();
        }));
    }

    for (space_size, slots, python_ms, target_ms) in [
        ("1e6", 8, 38.5, 6.416),
        ("1e9", 9, 121.0, 20.166),
        ("1e12", 10, 450.0, 75.0),
        ("1e15", 11, 981.28, 163.546972),
    ] {
        let space = make_synthetic_search_space(slots, true, true, 10);
        rows.push(measure("beam", space_size, python_ms, target_ms, 10, || {
            let _ = find_best_beam(&prepared, &json!({}), &space, 64, 10).unwrap();
        }));
    }

    let output = json!({
        "generated_by": "tttg_forge_optimizer::export_bench_results",
        "measurements": rows,
        "target_pass_count": rows.iter().filter(|row| row["target_met"].as_bool().unwrap_or(false)).count(),
        "target_total": rows.len()
    });
    let path = "/Users/woosung/Desktop/Dev/Projects/pareto/RUST_BENCHMARK_RESULTS.json";
    std::fs::write(path, serde_json::to_string_pretty(&output).unwrap()).unwrap();
}

fn measure<F: FnMut()>(
    algorithm: &str,
    space_size: &str,
    python_mean_ms: f64,
    rust_target_ms: f64,
    iterations: usize,
    mut f: F,
) -> Value {
    let mut samples = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let started = Instant::now();
        f();
        samples.push(started.elapsed().as_secs_f64() * 1000.0);
    }
    let mean_ms = samples.iter().sum::<f64>() / samples.len() as f64;
    let min_ms = samples.iter().copied().fold(f64::INFINITY, f64::min);
    let max_ms = samples.iter().copied().fold(0.0, f64::max);
    let variance = samples
        .iter()
        .map(|sample| {
            let delta = sample - mean_ms;
            delta * delta
        })
        .sum::<f64>()
        / samples.len() as f64;
    json!({
        "algorithm": algorithm,
        "space_size": space_size,
        "iterations": iterations,
        "mean_ms": mean_ms,
        "std_ms": variance.sqrt(),
        "min_ms": min_ms,
        "max_ms": max_ms,
        "python_mean_ms": python_mean_ms,
        "rust_target_ms": rust_target_ms,
        "speedup_vs_python": python_mean_ms / mean_ms.max(1e-12),
        "target_met": mean_ms <= rust_target_ms
    })
}
