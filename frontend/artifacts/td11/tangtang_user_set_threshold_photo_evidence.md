# Tangtang User Set Threshold Photo Evidence

generatedAtKst: 2026-05-24
status: [TANGTANG-USER-SET-THRESHOLD-PHOTO-EVIDENCE-GREEN]
claim: `user-supplied-set-threshold-photo-evidence`
behaviorChange: `false`
scoringChanged: `false`

## Summary

- Photo count: 7
- Parsed rows: 28
- Sets: 좋은 음료와 독서, 반짝이는 분쇄물, 감춰진 신비
- Threshold 18 rows: 3
- Threshold 19 rows: 4
- HP percent rows: 4
- Final ATK/HP rows: 24
- Direct observed damage trials: 0

## Decision

- Status: `evidence-only-not-applied`
- Rationale: User-supplied photos corroborate mixed 18/19 collectible set threshold patterns, but they are not controlled observed damage trials and include HP/final ATK/HP rows outside the current 15-to-19 atkPercent correction contract.

Required before application:

- map each photo row to an exact collectible set id and source atom row
- separate HP/final ATK/HP rows from atkPercent damage formula correction rows
- add controlled observed damage evidence or an approved description-only correction policy before scoring changes

## Parsed Rows

| Photo | Set | Condition | Parsed stat text | Active |
|---|---|---|---|---|
| user-photo-2026-05-24-good-drinks-reading-page-1 | 좋은 음료와 독서 | 4개의 각성색 획득 | 최종 공격 +200, 최종 HP +800 | true |
| user-photo-2026-05-24-good-drinks-reading-page-1 | 좋은 음료와 독서 | 각 컬렉션 당 3개의 금 별 획득 | 최종 공격 +300, 최종 HP +1200 | false |
| user-photo-2026-05-24-good-drinks-reading-page-1 | 좋은 음료와 독서 | 누적으로 19개의 금 별 획득 | HP +4% | false |
| user-photo-2026-05-24-good-drinks-reading-page-1 | 좋은 음료와 독서 | 각 컬렉션 당 3개의 빨간 별 획득 | 최종 공격 +500, 최종 HP +2000 | false |
| user-photo-2026-05-24-good-drinks-reading-page-2 | 좋은 음료와 독서 | 누적으로 19개의 빨간 별 획득 | HP +6% | false |
| user-photo-2026-05-24-good-drinks-reading-page-2 | 좋은 음료와 독서 | 8개의 별 획득 | 최종 공격 +200, 최종 HP +800 | true |
| user-photo-2026-05-24-good-drinks-reading-page-2 | 좋은 음료와 독서 | 16개의 별 획득 | 최종 공격 +300, 최종 HP +1200 | true |
| user-photo-2026-05-24-good-drinks-reading-page-2 | 좋은 음료와 독서 | 24개의 별 획득 | 최종 공격 +500, 최종 HP +2000 | true |
| user-photo-2026-05-24-sparkling-crush-page-1 | 반짝이는 분쇄물 | 4개의 각성색 획득 | 최종 공격 +50, 최종 HP +200 | true |
| user-photo-2026-05-24-sparkling-crush-page-1 | 반짝이는 분쇄물 | 각 컬렉션 당 3개의 금 별 획득 | 최종 공격 +100, 최종 HP +400 | true |
| user-photo-2026-05-24-sparkling-crush-page-1 | 반짝이는 분쇄물 | 누적으로 18개의 금 별 획득 | 최종 공격 +150, 최종 HP +600 | true |
| user-photo-2026-05-24-sparkling-crush-page-1 | 반짝이는 분쇄물 | 각 컬렉션 당 3개의 빨간 별 획득 | 최종 공격 +150, 최종 HP +600 | true |
| user-photo-2026-05-24-sparkling-crush-page-2 | 반짝이는 분쇄물 | 각 컬렉션 당 3개의 빨간 별 획득 | 최종 공격 +150, 최종 HP +600 | true |
| user-photo-2026-05-24-sparkling-crush-page-2 | 반짝이는 분쇄물 | 누적으로 18개의 빨간 별 획득 | 최종 공격 +250, 최종 HP +1000 | true |
| user-photo-2026-05-24-sparkling-crush-page-2 | 반짝이는 분쇄물 | 8개의 별 획득 | 최종 공격 +50, 최종 HP +200 | true |
| user-photo-2026-05-24-sparkling-crush-page-2 | 반짝이는 분쇄물 | 16개의 별 획득 | 최종 공격 +100, 최종 HP +400 | true |
| user-photo-2026-05-24-sparkling-crush-page-3 | 반짝이는 분쇄물 | 누적으로 18개의 빨간 별 획득 | 최종 공격 +250, 최종 HP +1000 | true |
| user-photo-2026-05-24-sparkling-crush-page-3 | 반짝이는 분쇄물 | 8개의 별 획득 | 최종 공격 +50, 최종 HP +200 | true |
| user-photo-2026-05-24-sparkling-crush-page-3 | 반짝이는 분쇄물 | 16개의 별 획득 | 최종 공격 +100, 최종 HP +400 | true |
| user-photo-2026-05-24-sparkling-crush-page-3 | 반짝이는 분쇄물 | 24개의 별 획득 | 최종 공격 +150, 최종 HP +600 | true |
| user-photo-2026-05-24-hidden-mystery-page-1 | 감춰진 신비 | 4개의 각성색 획득 | 최종 공격 +200, 최종 HP +800 | true |
| user-photo-2026-05-24-hidden-mystery-page-1 | 감춰진 신비 | 각 컬렉션 당 3개의 금 별 획득 | 최종 공격 +300, 최종 HP +1200 | false |
| user-photo-2026-05-24-hidden-mystery-page-1 | 감춰진 신비 | 누적으로 19개의 금 별 획득 | HP +4% | false |
| user-photo-2026-05-24-hidden-mystery-page-1 | 감춰진 신비 | 각 컬렉션 당 3개의 빨간 별 획득 | 최종 공격 +500, 최종 HP +2000 | false |
| user-photo-2026-05-24-hidden-mystery-page-2 | 감춰진 신비 | 누적으로 19개의 빨간 별 획득 | HP +6% | false |
| user-photo-2026-05-24-hidden-mystery-page-2 | 감춰진 신비 | 8개의 별 획득 | 최종 공격 +200, 최종 HP +800 | true |
| user-photo-2026-05-24-hidden-mystery-page-2 | 감춰진 신비 | 16개의 별 획득 | 최종 공격 +300, 최종 HP +1200 | true |
| user-photo-2026-05-24-hidden-mystery-page-2 | 감춰진 신비 | 24개의 별 획득 | 최종 공격 +500, 최종 HP +2000 | true |
