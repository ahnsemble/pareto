use serde_json::{Map, Value};

pub(super) fn core_ce_damage(
    stats: &Map<String, Value>,
    ce_damage_techs: &Map<String, Value>,
) -> Map<String, Value> {
    tttg_forge_core::calculate_damage_factor(
        &Value::Object(stats.clone()),
        &Value::Object(ce_damage_techs.clone()),
    )
    .expect("sio_lm CE damage inputs are object maps")
    .ce_damage
    .as_object()
    .cloned()
    .unwrap_or_default()
}
