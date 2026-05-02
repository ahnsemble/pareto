use serde_json::Value;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct PreparedUndo {
    pub before: Value,
}

pub fn apply_delta_in_place(prepared_case: &mut Value, delta: &Value) -> PreparedUndo {
    let before = prepared_case.clone();
    if let (Some(target), Some(source)) = (prepared_case.as_object_mut(), delta.as_object()) {
        for (section, section_delta) in source {
            if let (Some(target_section), Some(delta_section)) = (
                target
                    .entry(section.clone())
                    .or_insert_with(|| Value::Object(Default::default()))
                    .as_object_mut(),
                section_delta.as_object(),
            ) {
                for (key, value) in delta_section {
                    let next = target_section
                        .get(key)
                        .and_then(Value::as_f64)
                        .unwrap_or(0.0)
                        + value.as_f64().unwrap_or(0.0);
                    target_section.insert(key.clone(), Value::from(next));
                }
            }
        }
    }
    PreparedUndo { before }
}

pub fn undo_delta_in_place(prepared_case: &mut Value, undo: &PreparedUndo) {
    *prepared_case = undo.before.clone();
}
