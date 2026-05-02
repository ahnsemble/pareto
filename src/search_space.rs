use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SearchChoice {
    pub name: String,
    pub score_delta: f64,
    pub damage_delta: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SearchSlot {
    pub name: String,
    pub choices: Vec<SearchChoice>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct OptimizationSearchSpace {
    pub slots: Vec<SearchSlot>,
    pub top_k: usize,
}

pub fn search_space_total(search_space: &OptimizationSearchSpace) -> usize {
    search_space
        .slots
        .iter()
        .map(|slot| slot.choices.len().max(1))
        .product()
}

pub fn make_synthetic_search_space(
    slot_count: usize,
    include_baseline: bool,
    tradeoff: bool,
    top_k: usize,
) -> OptimizationSearchSpace {
    let mut slots = Vec::with_capacity(slot_count);
    for index in 0..slot_count {
        let step = (index + 1) as f64;
        let choices = if tradeoff {
            vec![
                SearchChoice {
                    name: "precision".to_string(),
                    score_delta: 12.0 + step,
                    damage_delta: 3.0 + step * 0.1,
                },
                SearchChoice {
                    name: "overload".to_string(),
                    score_delta: 5.0 + step * 0.2,
                    damage_delta: 15.0 + step,
                },
            ]
        } else if include_baseline {
            vec![
                SearchChoice {
                    name: "baseline".to_string(),
                    score_delta: 0.0,
                    damage_delta: 0.0,
                },
                SearchChoice {
                    name: "upgrade".to_string(),
                    score_delta: 10.0 + step,
                    damage_delta: 1.0 + step * 0.1,
                },
            ]
        } else {
            vec![SearchChoice {
                name: "upgrade".to_string(),
                score_delta: 10.0 + step,
                damage_delta: 1.0 + step * 0.1,
            }]
        };
        slots.push(SearchSlot {
            name: format!("slot_{index:02}"),
            choices,
        });
    }
    OptimizationSearchSpace { slots, top_k }
}

pub fn normalize_search_space(search_space: &OptimizationSearchSpace) -> OptimizationSearchSpace {
    let mut normalized = search_space.clone();
    for slot in &mut normalized.slots {
        slot.choices.sort_by(|left, right| {
            (right.score_delta + right.damage_delta)
                .total_cmp(&(left.score_delta + left.damage_delta))
                .then(left.name.cmp(&right.name))
        });
    }
    normalized
}

pub fn optimistic_case(prepared_case: &Value, remaining_slots: &[SearchSlot]) -> Value {
    let mut score = prepared_case
        .get("score")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let mut damage_factor = prepared_case
        .get("damageFactor")
        .or_else(|| prepared_case.get("damage_factor"))
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    for slot in remaining_slots {
        if let Some(best) = slot.choices.iter().max_by(|left, right| {
            (left.score_delta + left.damage_delta)
                .total_cmp(&(right.score_delta + right.damage_delta))
        }) {
            score += best.score_delta;
            damage_factor += best.damage_delta;
        }
    }
    json!({ "score": score, "damageFactor": damage_factor })
}
