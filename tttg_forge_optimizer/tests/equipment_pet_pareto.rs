use serde_json::json;
use tttg_forge_core::cards::{equipment_delta, pet_delta, pet_state_multiplier};
use tttg_forge_optimizer::{pareto_frontier_smoke, ParetoSmokeCandidate};

fn build_candidates(
    equipment_inputs: &[(&str, serde_json::Value)],
    pet_inputs: &[serde_json::Value],
) -> Vec<ParetoSmokeCandidate> {
    let mut candidates = Vec::new();
    for (label, eq_in) in equipment_inputs {
        let eq = equipment_delta(eq_in);
        let score = eq
            .get("atk")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0);
        let damage = eq
            .get("critRate")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0);
        candidates.push(ParetoSmokeCandidate {
            label: Some(format!("eq:{label}")),
            score: 100.0 + score * 100.0,
            damage_factor: 50.0 + damage * 100.0,
        });
    }
    for pet_in in pet_inputs {
        let pet = pet_delta(pet_in);
        let score = pet
            .get("atk")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0);
        let damage = pet
            .get("hp")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0);
        candidates.push(ParetoSmokeCandidate {
            label: Some(format!(
                "pet:{}",
                pet_in
                    .get("state")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or("?")
            )),
            score: 100.0 + score * 100.0,
            damage_factor: 50.0 + damage * 100.0,
        });
    }
    candidates
}

#[test]
fn integration_empty_inputs_emit_no_candidates() {
    let candidates = build_candidates(&[], &[]);
    let frontier = pareto_frontier_smoke(&candidates);
    assert!(frontier.is_empty());
}

#[test]
fn integration_single_equipment_candidate_is_self_frontier() {
    let candidates = build_candidates(&[("weapon-only", json!({"weapon": {"atk": 0.20}}))], &[]);
    let frontier = pareto_frontier_smoke(&candidates);
    assert_eq!(frontier, vec![0]);
}

#[test]
fn integration_endgame_pet_dominates_early_pet_when_base_equal() {
    let base = json!({"atk": 0.10, "hp": 0.10});
    let early = json!({"state": "early", "baseStats": base});
    let endgame = json!({"state": "endgame", "baseStats": base});
    let candidates = build_candidates(&[], &[early, endgame]);
    let frontier = pareto_frontier_smoke(&candidates);
    assert!(frontier.contains(&1), "endgame should remain on frontier");
    assert!(
        !frontier.contains(&0),
        "early should be dominated by endgame"
    );
}

#[test]
fn integration_equipment_plus_pet_yields_nonempty_frontier() {
    let candidates = build_candidates(
        &[
            (
                "balanced",
                json!({"weapon": {"atk": 0.10, "critRate": 0.10}}),
            ),
            (
                "crit-spec",
                json!({"ring": {"critRate": 0.18}, "necklace": {"critRate": 0.04}}),
            ),
        ],
        &[
            json!({"state": "mid", "baseStats": {"atk": 0.08, "hp": 0.06}}),
            json!({"state": "endgame", "baseStats": {"atk": 0.05, "hp": 0.10}}),
        ],
    );
    let frontier = pareto_frontier_smoke(&candidates);
    assert!(!frontier.is_empty());
    assert!(frontier.len() <= candidates.len());
}

#[test]
fn integration_unknown_pet_state_treated_as_early_for_frontier() {
    let known = json!({"state": "early", "baseStats": {"atk": 0.07, "hp": 0.05}});
    let unknown = json!({"state": "phantom", "baseStats": {"atk": 0.07, "hp": 0.05}});
    let candidates = build_candidates(&[], &[known, unknown]);
    let frontier = pareto_frontier_smoke(&candidates);
    let known_score = candidates[0].score;
    let unknown_score = candidates[1].score;
    assert!((known_score - unknown_score).abs() < 1e-9);
    assert!(frontier.len() <= 2);
    assert!(!frontier.is_empty());
}

#[test]
fn integration_pet_state_multipliers_are_strictly_monotonic() {
    let early = pet_state_multiplier("early");
    let mid = pet_state_multiplier("mid");
    let endgame = pet_state_multiplier("endgame");
    assert!(
        early < mid,
        "early {early} must be strictly less than mid {mid}"
    );
    assert!(
        mid < endgame,
        "mid {mid} must be strictly less than endgame {endgame}"
    );

    let base = json!({"atk": 0.10, "hp": 0.10});
    let candidates = build_candidates(
        &[],
        &[
            json!({"state": "early", "baseStats": base}),
            json!({"state": "mid", "baseStats": base}),
            json!({"state": "endgame", "baseStats": base}),
        ],
    );
    let frontier = pareto_frontier_smoke(&candidates);
    assert!(
        frontier.contains(&2),
        "endgame must survive frontier vs lower states"
    );
    assert!(
        !frontier.contains(&0),
        "early must not survive vs endgame on equal base"
    );
}
