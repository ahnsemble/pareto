use serde::Serialize;
use serde_json::Value;
use std::{error::Error, fmt};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductionErrorCode {
    MalformedJson,
    EmptyInput,
    InputTooLarge,
    WasmInitFailed,
    InvalidInput,
    ObjectiveUnsupported,
    SearchSpaceEmpty,
    Timeout,
    Network,
    Unknown,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ProductionError {
    pub code: ProductionErrorCode,
    #[serde(rename = "i18nKey")]
    pub i18n_key: &'static str,
    pub message: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ErrorLocale {
    En,
    Ko,
}

impl ProductionErrorCode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::MalformedJson => "malformed_json",
            Self::EmptyInput => "empty_input",
            Self::InputTooLarge => "input_too_large",
            Self::WasmInitFailed => "wasm_init_failed",
            Self::InvalidInput => "invalid_input",
            Self::ObjectiveUnsupported => "objective_unsupported",
            Self::SearchSpaceEmpty => "search_space_empty",
            Self::Timeout => "timeout",
            Self::Network => "network",
            Self::Unknown => "unknown",
        }
    }

    pub fn i18n_key(self) -> &'static str {
        match self {
            Self::MalformedJson => "error.malformed_json",
            Self::EmptyInput => "error.empty_input",
            Self::InputTooLarge => "error.input_too_large",
            Self::WasmInitFailed => "error.wasm_init_failed",
            Self::InvalidInput => "error.invalid_input",
            Self::ObjectiveUnsupported => "error.objective_unsupported",
            Self::SearchSpaceEmpty => "error.search_space_empty",
            Self::Timeout => "error.timeout",
            Self::Network => "error.network",
            Self::Unknown => "error.unknown",
        }
    }
}

impl ProductionError {
    pub fn new(code: ProductionErrorCode) -> Self {
        Self {
            code,
            i18n_key: code.i18n_key(),
            message: code.as_str().to_string(),
        }
    }

    pub fn code(&self) -> ProductionErrorCode {
        self.code
    }
}

impl fmt::Display for ProductionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code.as_str(), self.message)
    }
}

impl Error for ProductionError {}

pub fn safe_parse_json(input: &str, max_bytes: usize) -> Result<Value, ProductionError> {
    if input.trim().is_empty() {
        return Err(ProductionError::new(ProductionErrorCode::EmptyInput));
    }
    if input.len() > max_bytes {
        return Err(ProductionError::new(ProductionErrorCode::InputTooLarge));
    }
    let value: Value = serde_json::from_str(input)
        .map_err(|_| ProductionError::new(ProductionErrorCode::MalformedJson))?;
    if !value.is_object() {
        return Err(ProductionError::new(ProductionErrorCode::InvalidInput));
    }
    Ok(value)
}

pub fn wasm_init_guard(initialized: bool) -> Result<(), ProductionError> {
    if initialized {
        Ok(())
    } else {
        Err(ProductionError::new(ProductionErrorCode::WasmInitFailed))
    }
}

pub fn friendly_error_message(locale: ErrorLocale, key: &str) -> &'static str {
    match locale {
        ErrorLocale::En => english_message(key),
        ErrorLocale::Ko => korean_message(key),
    }
}

fn english_message(key: &str) -> &'static str {
    match key {
        "error.malformed_json" => "The imported data is not valid JSON.",
        "error.empty_input" => "Add data before running optimization.",
        "error.input_too_large" => "The input is too large to process safely.",
        "error.wasm_init_failed" => "The optimizer runtime could not start.",
        "error.invalid_input" => "The input shape is not supported.",
        "error.objective_unsupported" => "The selected objective is not supported.",
        "error.search_space_empty" => "No build choices are available.",
        "error.timeout" => "The optimization timed out.",
        "error.network" => "Network data could not be loaded.",
        "error.unknown" => "Something went wrong.",
        _ => english_message("error.unknown"),
    }
}

fn korean_message(key: &str) -> &'static str {
    match key {
        "error.malformed_json" => "가져온 데이터가 올바른 JSON이 아닙니다.",
        "error.empty_input" => "최적화를 실행하기 전에 데이터를 입력하세요.",
        "error.input_too_large" => "입력이 너무 커서 안전하게 처리할 수 없습니다.",
        "error.wasm_init_failed" => "최적화 런타임을 시작하지 못했습니다.",
        "error.invalid_input" => "지원하지 않는 입력 구조입니다.",
        "error.objective_unsupported" => "선택한 objective를 지원하지 않습니다.",
        "error.search_space_empty" => "사용 가능한 빌드 선택지가 없습니다.",
        "error.timeout" => "최적화 시간이 초과되었습니다.",
        "error.network" => "네트워크 데이터를 불러오지 못했습니다.",
        "error.unknown" => "문제가 발생했습니다.",
        _ => korean_message("error.unknown"),
    }
}
