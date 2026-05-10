use tttg_forge_optimizer::{
    diff_game_data_snapshots, load_game_data_source_fixtures, GameDataChangeStatus,
    GameDataSnapshot,
};

#[test]
fn game_data_fixture_contains_five_raw_url_samples() {
    let sources = load_game_data_source_fixtures();

    assert_eq!(sources.len(), 5);
    assert!(sources
        .iter()
        .all(|source| source.url.starts_with("https://raw.githubusercontent.com/")));
}

#[test]
fn game_data_fixture_ids_are_unique() {
    let sources = load_game_data_source_fixtures();
    let mut ids = sources
        .iter()
        .map(|source| source.id.as_str())
        .collect::<Vec<_>>();
    ids.sort_unstable();
    ids.dedup();

    assert_eq!(ids.len(), sources.len());
}

#[test]
fn detector_reports_changed_hash_for_existing_source() {
    let before = vec![snapshot("alpha", "https://raw.githubusercontent.com/example/a.json", "h1")];
    let after = vec![snapshot("alpha", "https://raw.githubusercontent.com/example/a.json", "h2")];

    let changes = diff_game_data_snapshots(&before, &after);

    assert_eq!(changes.len(), 1);
    assert_eq!(changes[0].status, GameDataChangeStatus::Changed);
}

#[test]
fn detector_reports_added_and_removed_sources() {
    let before = vec![snapshot("old", "https://raw.githubusercontent.com/example/old.json", "h1")];
    let after = vec![snapshot("new", "https://raw.githubusercontent.com/example/new.json", "h2")];

    let changes = diff_game_data_snapshots(&before, &after);

    assert!(changes
        .iter()
        .any(|change| change.id == "old" && change.status == GameDataChangeStatus::Removed));
    assert!(changes
        .iter()
        .any(|change| change.id == "new" && change.status == GameDataChangeStatus::Added));
}

#[test]
fn detector_keeps_unchanged_sources_when_hash_matches() {
    let before = vec![snapshot("same", "https://raw.githubusercontent.com/example/same.json", "h1")];
    let after = vec![snapshot("same", "https://raw.githubusercontent.com/example/same.json", "h1")];

    let changes = diff_game_data_snapshots(&before, &after);

    assert_eq!(changes[0].status, GameDataChangeStatus::Unchanged);
}

#[test]
fn detector_output_is_sorted_by_id() {
    let before = vec![
        snapshot("zeta", "https://raw.githubusercontent.com/example/z.json", "h1"),
        snapshot("alpha", "https://raw.githubusercontent.com/example/a.json", "h1"),
    ];
    let after = before.clone();

    let ids = diff_game_data_snapshots(&before, &after)
        .into_iter()
        .map(|change| change.id)
        .collect::<Vec<_>>();

    assert_eq!(ids, vec!["alpha", "zeta"]);
}

#[test]
fn detector_changed_source_keeps_before_and_after_hashes() {
    let before = vec![snapshot("alpha", "https://raw.githubusercontent.com/example/a.json", "old")];
    let after = vec![snapshot("alpha", "https://raw.githubusercontent.com/example/a.json", "new")];

    let changes = diff_game_data_snapshots(&before, &after);

    assert_eq!(changes[0].before_hash.as_deref(), Some("old"));
    assert_eq!(changes[0].after_hash.as_deref(), Some("new"));
}

#[test]
fn detector_added_source_has_no_before_hash() {
    let changes = diff_game_data_snapshots(
        &[],
        &[snapshot("new", "https://raw.githubusercontent.com/example/new.json", "h2")],
    );

    assert_eq!(changes[0].before_hash, None);
    assert_eq!(changes[0].after_hash.as_deref(), Some("h2"));
}

#[test]
fn detector_removed_source_has_no_after_hash() {
    let changes = diff_game_data_snapshots(
        &[snapshot("old", "https://raw.githubusercontent.com/example/old.json", "h1")],
        &[],
    );

    assert_eq!(changes[0].before_hash.as_deref(), Some("h1"));
    assert_eq!(changes[0].after_hash, None);
}

#[test]
fn fixture_snapshots_use_fixture_baseline_hashes() {
    let sources = load_game_data_source_fixtures();
    let snapshots = tttg_forge_optimizer::fixture_snapshots();

    assert_eq!(snapshots.len(), sources.len());
    assert_eq!(snapshots[0].content_hash, sources[0].baseline_hash);
}

#[test]
fn fixture_urls_are_unique() {
    let sources = load_game_data_source_fixtures();
    let mut urls = sources
        .iter()
        .map(|source| source.url.as_str())
        .collect::<Vec<_>>();
    urls.sort_unstable();
    urls.dedup();

    assert_eq!(urls.len(), sources.len());
}

#[test]
fn fixture_baseline_hashes_are_nonempty() {
    let sources = load_game_data_source_fixtures();

    assert!(sources
        .iter()
        .all(|source| !source.baseline_hash.trim().is_empty()));
}

fn snapshot(id: &str, url: &str, content_hash: &str) -> GameDataSnapshot {
    GameDataSnapshot {
        id: id.to_string(),
        url: url.to_string(),
        content_hash: content_hash.to_string(),
    }
}
