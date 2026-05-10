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
    VersionMismatch,
    BrowserCompat,
    OfflineCacheMiss,
    SharedArrayBufferUnsupported,
    MemoryLimitExceeded,
    WorkerRace,
    FetchUnauthorized,
    FetchForbidden,
    FetchServerError,
    ObjectiveNonFinite,
    ParetoFrontierEmpty,
    StorageQuotaExceeded,
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

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct SchemaMigrationSummary {
    pub from_version: String,
    pub to_version: String,
    pub added_fields: usize,
    pub removed_fields: usize,
    pub renamed_fields: usize,
    pub breaking_change: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
pub struct BrowserRuntimeCapabilities {
    pub webassembly: bool,
    pub web_workers: bool,
    pub local_storage: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ProductionEdgeCase {
    pub id: u8,
    pub slug: &'static str,
    pub error_code: Option<ProductionErrorCode>,
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
            Self::VersionMismatch => "version_mismatch",
            Self::BrowserCompat => "browser_compat",
            Self::OfflineCacheMiss => "offline_cache_miss",
            Self::SharedArrayBufferUnsupported => "shared_array_buffer_unsupported",
            Self::MemoryLimitExceeded => "memory_limit_exceeded",
            Self::WorkerRace => "worker_race",
            Self::FetchUnauthorized => "fetch_unauthorized",
            Self::FetchForbidden => "fetch_forbidden",
            Self::FetchServerError => "fetch_server_error",
            Self::ObjectiveNonFinite => "objective_non_finite",
            Self::ParetoFrontierEmpty => "pareto_frontier_empty",
            Self::StorageQuotaExceeded => "storage_quota_exceeded",
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
            Self::VersionMismatch => "error.version_mismatch",
            Self::BrowserCompat => "error.browser_compat",
            Self::OfflineCacheMiss => "error.offline_cache_miss",
            Self::SharedArrayBufferUnsupported => "error.shared_array_buffer_unsupported",
            Self::MemoryLimitExceeded => "error.memory_limit_exceeded",
            Self::WorkerRace => "error.worker_race",
            Self::FetchUnauthorized => "error.fetch_unauthorized",
            Self::FetchForbidden => "error.fetch_forbidden",
            Self::FetchServerError => "error.fetch_server_error",
            Self::ObjectiveNonFinite => "error.objective_non_finite",
            Self::ParetoFrontierEmpty => "error.pareto_frontier_empty",
            Self::StorageQuotaExceeded => "error.storage_quota_exceeded",
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

pub fn schema_migration_summary(
    from_version: &str,
    to_version: &str,
    added_fields: &[&str],
    removed_fields: &[&str],
    renamed_fields: &[(&str, &str)],
) -> Result<SchemaMigrationSummary, ProductionError> {
    if from_version.trim().is_empty() || to_version.trim().is_empty() || from_version == to_version
    {
        return Err(ProductionError::new(ProductionErrorCode::VersionMismatch));
    }

    Ok(SchemaMigrationSummary {
        from_version: from_version.to_string(),
        to_version: to_version.to_string(),
        added_fields: added_fields.len(),
        removed_fields: removed_fields.len(),
        renamed_fields: renamed_fields.len(),
        breaking_change: !removed_fields.is_empty() || !renamed_fields.is_empty(),
    })
}

pub fn browser_compat_guard(
    capabilities: &BrowserRuntimeCapabilities,
) -> Result<(), ProductionError> {
    if capabilities.webassembly && capabilities.web_workers && capabilities.local_storage {
        Ok(())
    } else {
        Err(ProductionError::new(ProductionErrorCode::BrowserCompat))
    }
}

pub fn offline_cache_fallback(
    network_fetch_succeeded: bool,
    cached_payload: Option<&str>,
    max_bytes: usize,
) -> Result<Value, ProductionError> {
    if network_fetch_succeeded {
        return Err(ProductionError::new(ProductionErrorCode::Network));
    }
    let payload = cached_payload
        .ok_or_else(|| ProductionError::new(ProductionErrorCode::OfflineCacheMiss))?;
    safe_parse_json(payload, max_bytes)
}

pub fn shared_array_buffer_guard(available: bool) -> Result<(), ProductionError> {
    if available {
        Ok(())
    } else {
        Err(ProductionError::new(
            ProductionErrorCode::SharedArrayBufferUnsupported,
        ))
    }
}

pub fn memory_budget_guard(
    estimated_bytes: usize,
    max_bytes: usize,
) -> Result<(), ProductionError> {
    if estimated_bytes <= max_bytes {
        Ok(())
    } else {
        Err(ProductionError::new(
            ProductionErrorCode::MemoryLimitExceeded,
        ))
    }
}

pub fn worker_concurrency_guard(
    active_workers: usize,
    max_parallel_workers: usize,
) -> Result<(), ProductionError> {
    if max_parallel_workers > 0 && active_workers < max_parallel_workers {
        Ok(())
    } else {
        Err(ProductionError::new(ProductionErrorCode::WorkerRace))
    }
}

pub fn fetch_status_guard(status: u16) -> Result<(), ProductionError> {
    match status {
        200..=299 => Ok(()),
        401 => Err(ProductionError::new(ProductionErrorCode::FetchUnauthorized)),
        403 => Err(ProductionError::new(ProductionErrorCode::FetchForbidden)),
        500..=599 => Err(ProductionError::new(ProductionErrorCode::FetchServerError)),
        _ => Err(ProductionError::new(ProductionErrorCode::Network)),
    }
}

pub fn objective_score_guard(score: f64) -> Result<(), ProductionError> {
    if score.is_finite() {
        Ok(())
    } else {
        Err(ProductionError::new(
            ProductionErrorCode::ObjectiveNonFinite,
        ))
    }
}

pub fn pareto_frontier_result_guard(frontier_len: usize) -> Result<(), ProductionError> {
    if frontier_len > 0 {
        Ok(())
    } else {
        Err(ProductionError::new(
            ProductionErrorCode::ParetoFrontierEmpty,
        ))
    }
}

pub fn storage_quota_guard(
    available_bytes: usize,
    required_bytes: usize,
) -> Result<(), ProductionError> {
    if available_bytes >= required_bytes {
        Ok(())
    } else {
        Err(ProductionError::new(
            ProductionErrorCode::StorageQuotaExceeded,
        ))
    }
}

pub fn production_edge_case_catalog() -> Vec<ProductionEdgeCase> {
    use ProductionErrorCode as Code;

    vec![
        ProductionEdgeCase {
            id: 1,
            slug: "malformed_json",
            error_code: Some(Code::MalformedJson),
        },
        ProductionEdgeCase {
            id: 2,
            slug: "empty_input",
            error_code: Some(Code::EmptyInput),
        },
        ProductionEdgeCase {
            id: 3,
            slug: "large_input",
            error_code: Some(Code::InputTooLarge),
        },
        ProductionEdgeCase {
            id: 4,
            slug: "wasm_init_failure",
            error_code: Some(Code::WasmInitFailed),
        },
        ProductionEdgeCase {
            id: 5,
            slug: "graceful_handling",
            error_code: Some(Code::Unknown),
        },
        ProductionEdgeCase {
            id: 6,
            slug: "schema_migration_v17_1_to_v18_0",
            error_code: Some(Code::VersionMismatch),
        },
        ProductionEdgeCase {
            id: 7,
            slug: "browser_compat_lockdown",
            error_code: Some(Code::BrowserCompat),
        },
        ProductionEdgeCase {
            id: 8,
            slug: "offline_cache_fallback",
            error_code: Some(Code::OfflineCacheMiss),
        },
        ProductionEdgeCase {
            id: 9,
            slug: "shared_array_buffer_missing",
            error_code: Some(Code::SharedArrayBufferUnsupported),
        },
        ProductionEdgeCase {
            id: 10,
            slug: "memory_limit_exceeded",
            error_code: Some(Code::MemoryLimitExceeded),
        },
        ProductionEdgeCase {
            id: 11,
            slug: "worker_race_condition",
            error_code: Some(Code::WorkerRace),
        },
        ProductionEdgeCase {
            id: 12,
            slug: "fetch_auth_forbidden_server_error",
            error_code: Some(Code::FetchServerError),
        },
        ProductionEdgeCase {
            id: 13,
            slug: "objective_nan_infinity",
            error_code: Some(Code::ObjectiveNonFinite),
        },
        ProductionEdgeCase {
            id: 14,
            slug: "empty_pareto_frontier",
            error_code: Some(Code::ParetoFrontierEmpty),
        },
        ProductionEdgeCase {
            id: 15,
            slug: "local_storage_quota_private_mode",
            error_code: Some(Code::StorageQuotaExceeded),
        },
    ]
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
        "error.version_mismatch" => "The game data version needs a supported migration.",
        "error.browser_compat" => "This browser mode does not support the optimizer.",
        "error.offline_cache_miss" => "Offline mode has no cached game data to use.",
        "error.shared_array_buffer_unsupported" => {
            "SharedArrayBuffer is unavailable in this browser context."
        }
        "error.memory_limit_exceeded" => "The search space exceeds the configured memory limit.",
        "error.worker_race" => "Another optimizer worker is already running.",
        "error.fetch_unauthorized" => "The game data request requires authorization.",
        "error.fetch_forbidden" => "The game data request was forbidden.",
        "error.fetch_server_error" => "The game data service returned a server error.",
        "error.objective_non_finite" => "The objective score must be a finite number.",
        "error.pareto_frontier_empty" => "No non-dominated builds were produced.",
        "error.storage_quota_exceeded" => "Browser storage quota is not available.",
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
        "error.version_mismatch" => "게임 데이터 버전 마이그레이션이 필요합니다.",
        "error.browser_compat" => "현재 브라우저 모드에서는 최적화기를 지원하지 않습니다.",
        "error.offline_cache_miss" => "오프라인 모드에서 사용할 캐시 데이터가 없습니다.",
        "error.shared_array_buffer_unsupported" => {
            "현재 브라우저 컨텍스트에서 SharedArrayBuffer를 사용할 수 없습니다."
        }
        "error.memory_limit_exceeded" => "탐색 공간이 설정된 메모리 한도를 초과했습니다.",
        "error.worker_race" => "다른 최적화 worker가 이미 실행 중입니다.",
        "error.fetch_unauthorized" => "게임 데이터 요청에 인증이 필요합니다.",
        "error.fetch_forbidden" => "게임 데이터 요청이 거부되었습니다.",
        "error.fetch_server_error" => "게임 데이터 서비스가 서버 오류를 반환했습니다.",
        "error.objective_non_finite" => "objective 점수는 유한한 숫자여야 합니다.",
        "error.pareto_frontier_empty" => "non-dominated 빌드가 생성되지 않았습니다.",
        "error.storage_quota_exceeded" => "브라우저 저장소 quota를 사용할 수 없습니다.",
        "error.objective_unsupported" => "선택한 objective를 지원하지 않습니다.",
        "error.search_space_empty" => "사용 가능한 빌드 선택지가 없습니다.",
        "error.timeout" => "최적화 시간이 초과되었습니다.",
        "error.network" => "네트워크 데이터를 불러오지 못했습니다.",
        "error.unknown" => "문제가 발생했습니다.",
        _ => korean_message("error.unknown"),
    }
}
