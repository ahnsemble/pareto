use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

const GAME_DATA_SOURCES: &str = include_str!("../fixtures/game_data_sources.json");

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct GameDataSource {
    pub id: String,
    pub url: String,
    pub baseline_hash: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct GameDataSnapshot {
    pub id: String,
    pub url: String,
    pub content_hash: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GameDataChangeStatus {
    Added,
    Removed,
    Changed,
    Unchanged,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct GameDataChange {
    pub id: String,
    pub url: String,
    pub before_hash: Option<String>,
    pub after_hash: Option<String>,
    pub status: GameDataChangeStatus,
}

pub fn load_game_data_source_fixtures() -> Vec<GameDataSource> {
    serde_json::from_str(GAME_DATA_SOURCES).unwrap_or_default()
}

pub fn fixture_snapshots() -> Vec<GameDataSnapshot> {
    load_game_data_source_fixtures()
        .into_iter()
        .map(|source| GameDataSnapshot {
            id: source.id,
            url: source.url,
            content_hash: source.baseline_hash,
        })
        .collect()
}

pub fn diff_game_data_snapshots(
    before: &[GameDataSnapshot],
    after: &[GameDataSnapshot],
) -> Vec<GameDataChange> {
    let before_by_id = by_id(before);
    let after_by_id = by_id(after);
    let ids = before_by_id
        .keys()
        .chain(after_by_id.keys())
        .cloned()
        .collect::<BTreeSet<_>>();

    ids.into_iter()
        .map(|id| {
            let before = before_by_id.get(&id);
            let after = after_by_id.get(&id);
            let status = match (before, after) {
                (None, Some(_)) => GameDataChangeStatus::Added,
                (Some(_), None) => GameDataChangeStatus::Removed,
                (Some(left), Some(right)) if left.content_hash != right.content_hash => {
                    GameDataChangeStatus::Changed
                }
                (Some(_), Some(_)) => GameDataChangeStatus::Unchanged,
                (None, None) => GameDataChangeStatus::Unchanged,
            };
            GameDataChange {
                id,
                url: after
                    .or(before)
                    .map(|snapshot| snapshot.url.clone())
                    .unwrap_or_default(),
                before_hash: before.map(|snapshot| snapshot.content_hash.clone()),
                after_hash: after.map(|snapshot| snapshot.content_hash.clone()),
                status,
            }
        })
        .collect()
}

fn by_id(snapshots: &[GameDataSnapshot]) -> BTreeMap<String, &GameDataSnapshot> {
    snapshots
        .iter()
        .map(|snapshot| (snapshot.id.clone(), snapshot))
        .collect()
}
