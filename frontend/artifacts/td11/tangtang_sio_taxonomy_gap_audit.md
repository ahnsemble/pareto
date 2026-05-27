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
| Source collectible rows | 119 |
| Source collectible effect rows | 118 |
| Collection source placeholder rows | 1 |
| Tangtang collectible rows | 122 |
| Collection source-missing rows | 0 |
| Collection catalog-only pending rows | 4 |
| Collection event slots | 42 |
| Custom collection source slots | 4 |
| Custom collection expected slots | 4 |
| Source set rows | 38 |
| Tangtang set rows | 38 |
| Source item rows | 11 |
| Tangtang item rows | 11 |
| Source hero rows | 23 |
| Tangtang hero rows | 23 |
| Nezha source/product covered | 1 |
| Nita current-source rows | 0 |
| Source pet rows | 8 |
| Tangtang pet rows | 9 |
| Source tech rows | 10 |
| Tangtang tech rows | 10 |
| Product/source alias rows kept | 3 |
| Direct gap rows | 0 |

## Effect Source Coverage

| Domain | Numeric source leaves |
|---|---:|
| collectibles | 271 |
| customSets | 275 |
| sets | 94 |
| items | 528 |
| heroes | 623 |
| pets | 147 |
| techs | 1211 |

## Notes

- Collections are the priority domain: all 118 effect-bearing internal source collectible keys are covered by Tangtang rows; 1 no-effect source placeholder row is tracked separately; the four zodiac catalog-only rows remain explicitly pending because the source table has no effect rows for them yet.
- Custom Collection Sets are covered as four source slots through the customSets formula/import path.
- Nezha is present in the current source and Tangtang schema; Nita is not present in the current source table as of this audit.
- Product-facing pet aliases stay as Clucker and Blizzblast while internal source aliases remain Crucker and King Blizzblast.
- Formula effects are already source-backed through the scoring/evidence table. Human-readable in-game effect copy is not promoted without direct capture.
