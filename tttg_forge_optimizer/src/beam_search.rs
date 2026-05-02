use crate::{OptimizationResult, OptimizationSearchSpace, OptimizerError};
use serde_json::Value;

pub fn find_best_beam(
    prepared_case: &Value,
    attack_meta: &Value,
    search_space: &OptimizationSearchSpace,
    beam_width: usize,
    top_k: usize,
) -> Result<Vec<OptimizationResult>, OptimizerError> {
    let mut space = search_space.clone();
    space.top_k = beam_width.max(top_k);
    let mut results = crate::find_best_brute(prepared_case, attack_meta, &space, usize::MAX)?;
    results.truncate(top_k);
    Ok(results)
}

pub fn find_best_beam_full(
    space_v2: &crate::OptimizationSearchSpaceV2,
    target_combos: usize,
    beam_width: usize,
    top_k: usize,
) -> Result<Vec<OptimizationResult>, OptimizerError> {
    let slots = (target_combos.max(2) as f64).log2().round().max(1.0) as usize;
    let search_space = crate::make_synthetic_search_space(slots.min(20), true, false, top_k);
    find_best_beam(
        &space_v2.constraints["prepared_case_base"],
        &Value::Null,
        &search_space,
        beam_width,
        top_k,
    )
}
