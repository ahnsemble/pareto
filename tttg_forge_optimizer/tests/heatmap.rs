use tttg_forge_optimizer::{
    build_search_space_heatmap, make_synthetic_search_space, HeatmapBucket,
    OptimizationSearchSpace, SearchChoice, SearchSlot,
};

#[test]
fn heatmap_emits_one_cell_per_slot_choice() {
    let space = make_synthetic_search_space(3, true, false, 5);

    let cells = build_search_space_heatmap(&space);

    assert_eq!(cells.len(), 6);
    assert_eq!(cells[0].slot, "slot_00");
    assert_eq!(cells[0].choice, "baseline");
    assert_eq!(cells[0].bucket, HeatmapBucket::Baseline);
    assert!(cells.iter().any(|cell| cell.bucket == HeatmapBucket::Score));
}

#[test]
fn heatmap_classifies_balanced_and_damage_heavy_choices() {
    let space = make_synthetic_search_space(2, true, true, 5);

    let cells = build_search_space_heatmap(&space);

    assert!(cells
        .iter()
        .any(|cell| cell.choice == "precision" && cell.bucket == HeatmapBucket::Score));
    assert!(cells
        .iter()
        .any(|cell| cell.choice == "overload" && cell.bucket == HeatmapBucket::Damage));
}

#[test]
fn heatmap_preserves_slot_order_then_choice_order() {
    let space = custom_space(vec![
        ("first", vec![("a", 1.0, 0.0), ("b", 0.0, 1.0)]),
        ("second", vec![("c", 1.0, 1.0)]),
    ]);

    let names = build_search_space_heatmap(&space)
        .into_iter()
        .map(|cell| format!("{}:{}", cell.slot, cell.choice))
        .collect::<Vec<_>>();

    assert_eq!(names, vec!["first:a", "first:b", "second:c"]);
}

#[test]
fn heatmap_classifies_exact_tie_as_balanced() {
    let cells = build_search_space_heatmap(&custom_space(vec![("slot", vec![("tie", 4.0, 4.0)])]));

    assert_eq!(cells[0].bucket, HeatmapBucket::Balanced);
}

#[test]
fn heatmap_classifies_twenty_percent_gap_as_balanced() {
    let cells =
        build_search_space_heatmap(&custom_space(vec![("slot", vec![("near", 10.0, 8.0)])]));

    assert_eq!(cells[0].bucket, HeatmapBucket::Balanced);
}

#[test]
fn heatmap_classifies_more_than_twenty_percent_gap_as_score() {
    let cells =
        build_search_space_heatmap(&custom_space(vec![("slot", vec![("score", 10.0, 7.0)])]));

    assert_eq!(cells[0].bucket, HeatmapBucket::Score);
}

#[test]
fn heatmap_classifies_more_than_twenty_percent_gap_as_damage() {
    let cells =
        build_search_space_heatmap(&custom_space(vec![("slot", vec![("damage", 7.0, 10.0)])]));

    assert_eq!(cells[0].bucket, HeatmapBucket::Damage);
}

#[test]
fn heatmap_total_delta_sums_score_and_damage() {
    let cells =
        build_search_space_heatmap(&custom_space(vec![("slot", vec![("total", 3.5, 4.5)])]));

    assert_eq!(cells[0].total_delta, 8.0);
}

#[test]
fn heatmap_empty_space_emits_no_cells() {
    let cells = build_search_space_heatmap(&OptimizationSearchSpace {
        slots: Vec::new(),
        top_k: 5,
    });

    assert!(cells.is_empty());
}

#[test]
fn heatmap_empty_slot_emits_no_cells_for_that_slot() {
    let cells = build_search_space_heatmap(&OptimizationSearchSpace {
        slots: vec![SearchSlot {
            name: "empty".to_string(),
            choices: Vec::new(),
        }],
        top_k: 5,
    });

    assert!(cells.is_empty());
}

fn custom_space(slots: Vec<(&str, Vec<(&str, f64, f64)>)>) -> OptimizationSearchSpace {
    OptimizationSearchSpace {
        slots: slots
            .into_iter()
            .map(|(slot, choices)| SearchSlot {
                name: slot.to_string(),
                choices: choices
                    .into_iter()
                    .map(|(choice, score_delta, damage_delta)| SearchChoice {
                        name: choice.to_string(),
                        score_delta,
                        damage_delta,
                    })
                    .collect(),
            })
            .collect(),
        top_k: 5,
    }
}
