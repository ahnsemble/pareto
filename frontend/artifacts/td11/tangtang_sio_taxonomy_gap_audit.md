# Tangtang / Internal Source Taxonomy Gap Audit

Date: 2026-05-26

## Decision

- Scoring changed: no.
- UI wording changed: no.
- Full equivalence contract preserved: yes.
- Direct source-backed taxonomy gaps after this pass: 0.

## Summary

| Metric | Count |
|---|---:|
| Source collectible rows | 118 |
| Tangtang collectible rows | 122 |
| Collection source-missing rows | 0 |
| Collection catalog-only pending rows | 4 |
| Collection event slots | 42 |
| Source set rows | 38 |
| Tangtang set rows | 38 |
| Source item rows | 11 |
| Tangtang item rows | 11 |
| Source hero rows | 23 |
| Tangtang hero rows | 23 |
| Source pet rows | 8 |
| Tangtang pet rows | 9 |
| Source tech rows | 10 |
| Tangtang tech rows | 10 |
| Product/source alias rows kept | 3 |
| Direct gap rows | 0 |

## Effect Source Coverage

| Domain | Numeric source leaves |
|---|---:|
| collectibles | 270 |
| sets | 94 |
| items | 528 |
| heroes | 623 |
| pets | 147 |
| techs | 1211 |

## Notes

- Collections are the priority domain: all 118 internal source collectible keys are covered by Tangtang rows; the four zodiac catalog-only rows remain explicitly pending because the source table has no effect rows for them yet.
- Product-facing pet aliases stay as Clucker and Blizzblast while internal source aliases remain Crucker and King Blizzblast.
- Formula effects are already source-backed through the scoring/evidence table. Human-readable in-game effect copy is not promoted without direct capture.
