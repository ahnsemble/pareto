use serde::Serialize;
use serde_json::{json, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AnalyticsEventType {
    OptimizeRun,
    ShareUrl,
    BuildDiffView,
    HeatmapView,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsEvent {
    #[serde(rename = "eventType")]
    pub event_type: AnalyticsEventType,
    pub payload: AnalyticsEventPayload,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsEventPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub candidate_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frontier_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub surface: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changed_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cell_count: Option<u64>,
}

impl AnalyticsEvent {
    pub fn new(event_type: AnalyticsEventType, payload: AnalyticsEventPayload) -> Self {
        Self {
            event_type,
            payload,
        }
    }
}

impl AnalyticsEventPayload {
    pub fn optimize_run(candidate_count: i64, frontier_count: i64, duration_ms: u64) -> Self {
        Self {
            candidate_count: Some(clamp_count(candidate_count)),
            frontier_count: Some(clamp_count(frontier_count)),
            duration_ms: Some(duration_ms),
            surface: None,
            changed_count: None,
            cell_count: None,
        }
    }

    pub fn share_url(surface: &str) -> Self {
        Self {
            candidate_count: None,
            frontier_count: None,
            duration_ms: None,
            surface: Some(surface.to_string()),
            changed_count: None,
            cell_count: None,
        }
    }

    pub fn build_diff_view(changed_count: i64) -> Self {
        Self {
            candidate_count: None,
            frontier_count: None,
            duration_ms: None,
            surface: None,
            changed_count: Some(clamp_count(changed_count)),
            cell_count: None,
        }
    }

    pub fn heatmap_view(cell_count: i64) -> Self {
        Self {
            candidate_count: None,
            frontier_count: None,
            duration_ms: None,
            surface: None,
            changed_count: None,
            cell_count: Some(clamp_count(cell_count)),
        }
    }
}

pub fn analytics_event_names() -> Vec<&'static str> {
    vec![
        "optimize_run",
        "share_url",
        "build_diff_view",
        "heatmap_view",
    ]
}

pub fn analytics_spec_json() -> Value {
    json!({
        "schema": "pareto.analytics.v1",
        "events": analytics_event_names(),
        "privacy": {
            "pii": false,
            "optOut": true,
            "rawBuildPayload": false
        }
    })
}

fn clamp_count(count: i64) -> u64 {
    count.max(0) as u64
}
