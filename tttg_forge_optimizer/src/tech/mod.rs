mod catalog;
mod schema;
pub mod sio_config;
pub mod sio_lm;
pub mod sio_solver;

pub use catalog::skill_name_to_mode;
pub use schema::{
    SioInventoryContract, SioInventoryValidationResult, SioModeEntry, SioRarityInput,
    SioSkillPreference, SioTechInventoryInput, SioTechsOptimizerProfile, TechOptimizerMode,
    TechOptimizerOptions,
};
pub use sio_config::decode_sio_lm_compact_summary;
pub use sio_lm::{
    captured_sio_lm_default_attack_meta, captured_sio_lm_default_base_stats,
    captured_sio_lm_default_enabled_skills, reconstruct_captured_sio_lm_inputs,
    reconstruct_sio_lm_inputs, sio_lm_context_from_player_state,
    sio_lm_context_from_player_state_with_options, SioLmContextOptions, SioLmScoringContext,
    SioLmStatTransform, SioLmTechModeOverloadTemplate, SIO_LM_CAPTURED_TRACE_BRIDGE_SCORER,
    SIO_LM_COMPACT_BASE_STATS_TRANSFORMER_SCORER, SIO_LM_FULL_EQUIVALENCE_SCORER,
};

pub(crate) use catalog::{mode_weight, TECH_MODES, TECH_PART_IDS};
