use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeSet;
use thiserror::Error;

pub type JsonValue = Value;
pub type JsonResult<T> = Result<T, ForgeCoreError>;

#[derive(Debug, Error)]
pub enum ForgeCoreError {
    #[error("fixture not found for JS-only operation: {0}")]
    FixtureNotFound(&'static str),
    #[error("decode error: {0}")]
    Decode(String),
    #[error("expected object for {0}")]
    ExpectedObject(&'static str),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DamageResult {
    #[serde(rename = "damageFactor")]
    pub damage_factor: f64,
    #[serde(rename = "ceDamage")]
    pub ce_damage: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CooldownResult {
    #[serde(rename = "cooldownReduction")]
    pub cooldown_reduction: f64,
    pub notes: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TechResult {
    pub stats: Value,
    #[serde(rename = "ceDamage")]
    pub ce_damage: Value,
    #[serde(rename = "passivePools")]
    pub passive_pools: Vec<f64>,
}

pub fn empty_object() -> Value {
    Value::Object(serde_json::Map::new())
}

pub fn as_object<'a>(
    value: &'a Value,
    label: &'static str,
) -> JsonResult<&'a serde_json::Map<String, Value>> {
    value
        .as_object()
        .ok_or(ForgeCoreError::ExpectedObject(label))
}

pub fn num(value: &Value, key: &str) -> f64 {
    value
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(|entry| {
            if entry.is_null() {
                Some(0.0)
            } else {
                entry.as_f64()
            }
        })
        .unwrap_or(0.0)
}

pub fn bool_value(value: &Value, key: &str) -> bool {
    value
        .as_object()
        .and_then(|object| object.get(key))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

pub fn set_to_json(set: BTreeSet<String>) -> Value {
    Value::Array(set.into_iter().map(Value::String).collect())
}
