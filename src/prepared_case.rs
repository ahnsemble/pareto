use serde_json::{json, Value};
use thiserror::Error;
use tttg_forge_core::{calculate_damage_factor, calculate_score};

#[derive(Debug, Error)]
pub enum OptimizerError {
    #[error("{0}")]
    Message(String),
}

pub fn clone_prepared_case(prepared_case: &Value) -> Value {
    prepared_case.clone()
}

pub fn evaluate_prepared_case(prepared_case: &Value, attack_meta: Option<&Value>) -> Result<Value, OptimizerError> {
    let stats = prepared_case.get("stats").unwrap_or(prepared_case);
    let damage_stats = prepared_case.get("damageStats").unwrap_or(stats);
    let ce_damage_techs = prepared_case.get("ceDamageTechs").unwrap_or(&Value::Null);
    let skills = prepared_case.get("skills").unwrap_or(&Value::Null);
    let passive_pools = prepared_case
        .get("passivePools")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let attack = attack_meta
        .or_else(|| prepared_case.get("attackMeta"))
        .unwrap_or(&Value::Null);
    let damage = calculate_damage_factor(damage_stats, ce_damage_techs)
        .map_err(|error| OptimizerError::Message(error.to_string()))?;
    let score = calculate_score(
        stats,
        attack,
        damage.damage_factor,
        &damage.ce_damage,
        prepared_case.get("calcMode").and_then(Value::as_str).unwrap_or("damage"),
        skills,
        &passive_pools,
        prepared_case.get("gameMode").and_then(Value::as_str).unwrap_or(""),
    )
    .map_err(|error| OptimizerError::Message(error.to_string()))?;
    Ok(json!({
        "score": score,
        "damageFactor": damage.damage_factor,
        "ceDamage": damage.ce_damage
    }))
}

pub fn build_prepared_case(expanded_config: &Value, attack_meta: Option<&Value>) -> Result<Value, OptimizerError> {
    if expanded_config.get("stats").is_some() && expanded_config.get("ceDamageTechs").is_some() {
        let mut prepared = expanded_config.clone();
        if let Some(attack_meta) = attack_meta {
            prepared["attackMeta"] = attack_meta.clone();
        }
        let metrics = evaluate_prepared_case(&prepared, prepared.get("attackMeta"))?;
        prepared["score"] = metrics["score"].clone();
        prepared["damageFactor"] = metrics["damageFactor"].clone();
        prepared["ceDamage"] = metrics["ceDamage"].clone();
        return Ok(prepared);
    }
    Ok(json!({
        "stats": expanded_config.get("stats").cloned().unwrap_or_else(|| json!({})),
        "damageStats": expanded_config.get("damageStats").cloned().unwrap_or_else(|| json!({})),
        "ceDamageTechs": expanded_config.get("ceDamageTechs").cloned().unwrap_or_else(|| json!({})),
        "attackMeta": attack_meta.cloned().unwrap_or_else(|| json!({})),
        "skills": expanded_config.get("skills").cloned().unwrap_or_else(|| json!({})),
        "passivePools": expanded_config.get("passivePools").cloned().unwrap_or_else(|| json!([])),
        "calcMode": expanded_config.get("calcMode").cloned().unwrap_or_else(|| json!("damage")),
        "gameMode": expanded_config.get("gameMode").cloned().unwrap_or_else(|| json!(""))
    }))
}
