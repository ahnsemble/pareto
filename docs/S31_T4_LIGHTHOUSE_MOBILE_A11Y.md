# S31 T4 Lighthouse + Mobile + A11y Ledger

- Date: 2026-05-10 KST
- Branch: `sprint-g-rust-integration`
- Task: S31 T4 Lighthouse, mobile viewport, accessibility, CJK cutoff
- Status: `CONDITIONAL`

## Lighthouse

Measured against the production static export.

```text
optimize mobile:  Performance 83 / Accessibility 100 / Best Practices 100 / SEO 100
optimize desktop: Performance 75 / Accessibility 100 / Best Practices 100 / SEO 100
optimize mobile with cache-like headers: Performance 84 / Accessibility 100 / Best Practices 100 / SEO 100
home mobile with cache-like headers: Performance 88 / Accessibility 100 / Best Practices 100 / SEO 100
community mobile with cache-like headers: Performance 89 / Accessibility 100 / Best Practices 100 / SEO 66
```

The requested Lighthouse target is not met because Performance remains below 90 on the measured pages. Main optimize-page signals:

```text
FCP 1.2s
LCP 4.7s mobile / 4.4s desktop
TBT 0ms
CLS 0
```

Primary audit causes are unused JavaScript, cache lifetime when served without CDN headers, render-blocking CSS, and LCP latency.

## Mobile And CJK

Three viewports were measured through Playwright:

```text
iPhone 13 390x844: horizontal overflow false, small targets 8, cutoff 0
Pixel 5   393x851: horizontal overflow false, small targets 8, cutoff 0
iPad      820x1180: horizontal overflow false, small targets 7, cutoff detector 64
```

The iPhone and Pixel runs show no Korean text cutoff. The iPad cutoff detector flagged the 64 numeric collectible grid buttons because the existing pseudo-element hit-area extension increases scroll dimensions; the visible labels are numeric and not Korean text. This is recorded as a detector caveat, not a confirmed Korean cutoff.

Touch-target gaps are real. Several interactive controls are under 44px in at least one dimension:

```text
back link: ~11-14 x 32
hero/pet selects: ~300-730 x 41
equipment selects: ~224-654 x 37
grid/list toggle: ~34 x 80
all button: ~37 x 44
```

## Accessibility

Lighthouse Accessibility category score is 100, but one audit still reports visible-label/accessibility-name mismatch on mobile collectible list buttons. The visible label includes the index plus collectible name, while the accessible name contains only the collectible name. This is a T6 fix candidate.

## T4 Findings

| ID | Severity | Finding | Disposition |
|---|---:|---|---|
| T4-F1 | P1 | Lighthouse Performance below 90 on production export measurements. | T6 candidate; may require deeper JS/LCP work. |
| T4-F2 | P1 | Some interactive controls do not meet 44px touch-target dimensions. | T6 candidate. |
| T4-F3 | P1 | Visible label / accessible name mismatch on mobile collectible list buttons. | T6 candidate. |
| T4-F4 | P2 | iPad cutoff detector flags pseudo-element hit-area side effects on numeric grid buttons. | Reported as measurement caveat. |

## Result

T4 is `CONDITIONAL`: mobile horizontal overflow is 0 and Lighthouse a11y/best-practices are strong, but Performance, touch-target dimensions, and one accessible-name audit require self-fix consideration.
