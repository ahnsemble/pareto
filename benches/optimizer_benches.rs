use criterion::{black_box, criterion_group, criterion_main, Criterion};
use serde_json::json;
use tttg_forge_core::decode_public_raw;
use tttg_forge_optimizer::{find_best_bb, find_best_beam, make_synthetic_search_space};

const RAW_WCRS4V: &str = "XQAAAAK3CQAAAAAAAABtAlIGDy3Uia2uW1yO129jxwXjiHQU-WPVSgiewGDR8Fd-3R7yZI4n7rLp7oN7ao3cmLS-wzrnrvVaSR1jOG8ODb5GQZukxavIHhiSBWdRuFQtD91RoRdRWtgMwsZMlm9LinG3SLQaL9Z98gArg51s_eVqy5K0qIvSdai6508DQsWZXT_7d7eSqB6K5FyqdidFCj309acDmUhepTiFwItr8Z82RLq-FgtdwzoeDNGDw9c2N6l_yocBKZDcyvc4NK0qJG5-fWY_Vcd2qGQJjjRCtaPCMxQMwFjcu28G6QN7HIRqgG3X7MP_nBPK67iBVSGbnGDgF0lJqcgzBoE0vYAATvpt0dX9zD_Cz-613NG-WRsCvs0KlDcJjFZIAnpA13khzV0IfXc5-s6-lSx0VN7DFcc1QFtTsiouNwDuzQ0lR4XvLgtHAz0n8H638WtCR5URqqT1hI6f5V2_zXjpY0Cz-TyPhXwGw_WNUitf64VUPttWp9HFpGsXLcBQpMyQDPAiewxGz6dvhKzGU091zLG9FfZP98rfCFx5qxj2Qf5-VDGQs3yb9XHtlMcVOu_k9lLwzfMOEGajwvBEvNs24UT88GURjtSnxKLY8OfFRgvtf8WquUu2QhCFQNYvdh1wAwQ_hcKrQn4TxrXD4wykcqnDP2bvxIATAk0PxE1dgE2_egVF0PxGqkvWlDl6q__6_Sb0";

fn benches(c: &mut Criterion) {
    let mut group = c.benchmark_group("sprint_e_matrix");
    group.sample_size(10);
    let prepared = json!({"score": 1000.0, "damageFactor": 100.0});

    for size in ["1e6", "1e9", "1e12", "1e15"] {
        group.bench_function(format!("decode/{size}"), |b| {
            b.iter(|| decode_public_raw(black_box(RAW_WCRS4V)).unwrap())
        });
    }
    for (size, slots) in [("1e6", 8), ("1e9", 9), ("1e12", 10), ("1e15", 11)] {
        group.bench_function(format!("branch_bound/{size}"), |b| {
            let space = make_synthetic_search_space(slots, true, false, 10);
            b.iter(|| find_best_bb(black_box(&prepared), black_box(&json!({})), black_box(&space), black_box(10)).unwrap())
        });
    }
    for (size, slots) in [("1e6", 8), ("1e9", 9), ("1e12", 10), ("1e15", 11)] {
        group.bench_function(format!("beam/{size}"), |b| {
            let space = make_synthetic_search_space(slots, true, true, 10);
            b.iter(|| find_best_beam(black_box(&prepared), black_box(&json!({})), black_box(&space), black_box(64), black_box(10)).unwrap())
        });
    }
    group.finish();
}

criterion_group!(benches_group, benches);
criterion_main!(benches_group);
