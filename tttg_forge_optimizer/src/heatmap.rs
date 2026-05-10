use crate::OptimizationSearchSpace;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HeatmapBucket {
    Baseline,
    Score,
    Damage,
    Balanced,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct HeatmapCell {
    pub slot: String,
    pub choice: String,
    pub score_delta: f64,
    pub damage_delta: f64,
    pub total_delta: f64,
    pub bucket: HeatmapBucket,
}

pub fn build_search_space_heatmap(search_space: &OptimizationSearchSpace) -> Vec<HeatmapCell> {
    search_space
        .slots
        .iter()
        .flat_map(|slot| {
            slot.choices.iter().map(|choice| {
                let total_delta = choice.score_delta + choice.damage_delta;
                HeatmapCell {
                    slot: slot.name.clone(),
                    choice: choice.name.clone(),
                    score_delta: choice.score_delta,
                    damage_delta: choice.damage_delta,
                    total_delta,
                    bucket: classify(choice.score_delta, choice.damage_delta),
                }
            })
        })
        .collect()
}

fn classify(score_delta: f64, damage_delta: f64) -> HeatmapBucket {
    if score_delta == 0.0 && damage_delta == 0.0 {
        return HeatmapBucket::Baseline;
    }
    let score = score_delta.abs();
    let damage = damage_delta.abs();
    let max_value = score.max(damage);
    if max_value == 0.0 {
        return HeatmapBucket::Baseline;
    }
    if (score - damage).abs() / max_value <= 0.20 {
        HeatmapBucket::Balanced
    } else if score > damage {
        HeatmapBucket::Score
    } else {
        HeatmapBucket::Damage
    }
}
