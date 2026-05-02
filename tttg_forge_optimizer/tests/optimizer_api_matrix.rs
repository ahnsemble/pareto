use serde_json::json;
use tttg_forge_optimizer::*;

fn prepared() -> serde_json::Value {
    json!({"score": 1000.0, "damageFactor": 100.0})
}

#[test]
fn brute_and_bb_share_top_result_on_synthetic_space() {
    let space = make_synthetic_search_space(6, true, false, 10);
    let brute = find_best_brute(&prepared(), &json!({}), &space, 10_000).unwrap();
    let bb = find_best_bb(&prepared(), &json!({}), &space, 10).unwrap();
    assert_eq!(brute[0], bb[0]);
}

#[test]
fn beam_returns_top_k() {
    let space = make_synthetic_search_space(7, true, true, 10);
    let beam = find_best_beam(&prepared(), &json!({}), &space, 64, 5).unwrap();
    assert_eq!(beam.len(), 5);
}

#[test]
fn schema_validation_accepts_minimal_valid_space() {
    let space = OptimizationSearchSpaceV2 {
        hero_candidates: vec!["Taloxa".into(), "King".into()],
        collectible_inventory: json!({"Otherworld Key": {"stars": 0, "upgraded": false}}),
        tech_deployed: vec!["Energy Guidance System".into()],
        custom_set_fills: vec![
            vec!["None".into(); 4],
            vec!["None".into(); 8],
            vec!["None".into(); 8],
        ],
        skill_toggles: json!({}),
        pet_slots: json!({"active":"None","support_1":"None","support_2":"None","support_3":"None","support_4":"None","support_5":"None","support_6":"None","support_7":"None"}),
        evo_tree: vec!["A".into(), "B".into(), "C".into(), "D".into()],
        constraints: valid_minimal_constraints(),
    };
    assert!(space.validate().is_ok());
}

macro_rules! optimizer_smoke {
    ($name:ident, $slots:expr) => {
        #[test]
        fn $name() {
            let space = make_synthetic_search_space($slots, true, $slots % 2 == 0, 10);
            assert_eq!(search_space_total(&space), 2_usize.pow($slots as u32));
            let brute = find_best_brute(&prepared(), &json!({}), &space, 1 << 20).unwrap();
            assert!(!brute.is_empty());
            let frontier = pareto_frontier_strict(&brute);
            assert!(!frontier.is_empty());
            let bound = default_upper_bound(&prepared(), &space.slots, &prepared());
            assert!(bound >= brute[0].score);
        }
    };
}

optimizer_smoke!(optimizer_smoke_00, 1);
optimizer_smoke!(optimizer_smoke_01, 2);
optimizer_smoke!(optimizer_smoke_02, 3);
optimizer_smoke!(optimizer_smoke_03, 4);
optimizer_smoke!(optimizer_smoke_04, 5);
optimizer_smoke!(optimizer_smoke_05, 6);
optimizer_smoke!(optimizer_smoke_06, 7);
optimizer_smoke!(optimizer_smoke_07, 8);
optimizer_smoke!(optimizer_smoke_08, 9);
optimizer_smoke!(optimizer_smoke_09, 10);
optimizer_smoke!(optimizer_smoke_10, 11);
optimizer_smoke!(optimizer_smoke_11, 12);
optimizer_smoke!(optimizer_smoke_12, 13);
optimizer_smoke!(optimizer_smoke_13, 14);
optimizer_smoke!(optimizer_smoke_14, 15);
optimizer_smoke!(optimizer_smoke_15, 16);
optimizer_smoke!(optimizer_smoke_16, 3);
optimizer_smoke!(optimizer_smoke_17, 4);
optimizer_smoke!(optimizer_smoke_18, 5);
optimizer_smoke!(optimizer_smoke_19, 6);
optimizer_smoke!(optimizer_smoke_20, 7);
optimizer_smoke!(optimizer_smoke_21, 8);
optimizer_smoke!(optimizer_smoke_22, 9);
optimizer_smoke!(optimizer_smoke_23, 10);
optimizer_smoke!(optimizer_smoke_24, 11);
optimizer_smoke!(optimizer_smoke_25, 12);
optimizer_smoke!(optimizer_smoke_26, 13);
optimizer_smoke!(optimizer_smoke_27, 14);
optimizer_smoke!(optimizer_smoke_28, 15);
optimizer_smoke!(optimizer_smoke_29, 16);
optimizer_smoke!(optimizer_smoke_30, 3);
optimizer_smoke!(optimizer_smoke_31, 4);
optimizer_smoke!(optimizer_smoke_32, 5);
optimizer_smoke!(optimizer_smoke_33, 6);
optimizer_smoke!(optimizer_smoke_34, 7);
optimizer_smoke!(optimizer_smoke_35, 8);
optimizer_smoke!(optimizer_smoke_36, 9);
optimizer_smoke!(optimizer_smoke_37, 10);
optimizer_smoke!(optimizer_smoke_38, 11);
optimizer_smoke!(optimizer_smoke_39, 12);
