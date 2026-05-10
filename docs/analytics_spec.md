# Privacy-First Analytics Spec

This backend-only spec defines four aggregate events:

| Event | Purpose | Payload |
|---|---|---|
| `optimize_run` | Optimization completed | candidate count, frontier count, duration in ms |
| `share_url` | Share action used | surface only |
| `build_diff_view` | Diff view opened | changed count |
| `heatmap_view` | Heatmap view opened | cell count |

Privacy rules:

- No user identifier.
- No raw build payload.
- No device fingerprint.
- Opt-out must be available before frontend integration.
- Events are aggregate product telemetry only.
