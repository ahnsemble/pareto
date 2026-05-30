---
title: "tanggall 네이밍 현황 조사 (Tangtang 툴 브랜드 → tanggall)"
task_id: "E-PARETO-CC-VERIFY-CODEX-SIO-I18N-HANDOFF-2026-05-30"
created: "2026-05-30T13:55:00+09:00"
scope: "조사·보고 ONLY — rename 실행 0, 매핑 추측 0"
rename_executed: false
---

# tanggall 네이밍 현황 조사 (조사 ONLY)

> 우성님 고려 중 "Tangtang → tanggall" 리네이밍의 현황 grep 전수 + 3분류. 🔴 실행은 우성님 결정 후 별도.
> grep: `rg 'tangtang|Tangtang|TANGTANG|탕탕|탕탕특공대|tanggall'` (제외 .git/node_modules/.next/target/dist/내 보고 md)

## 🔑 가장 중요한 사실 2가지

**① 도메인은 이미 `tanggall.vercel.app`로 마이그레이션 완료** — 리네임의 인프라/배포 단계는 끝남. 남은 건 **앱 내 표시 브랜드 텍스트**(`Tangtang`)뿐.
```
frontend/app/robots.ts:5                          const SITE_URL = 'https://tanggall.vercel.app';
frontend/app/sitemap.ts:6                         const SITE_URL = 'https://tanggall.vercel.app';
frontend/app/[locale]/layout.tsx:17               const SITE_URL = 'https://tanggall.vercel.app';
frontend/scripts/generate-og-image.mjs:206        tanggall.vercel.app/ko/community
frontend/scripts/tangtang_legacy_optimize_redirect_unit_test.mjs:14  'https://tanggall.vercel.app'
```

**② 두 개의 "탕탕"을 구분해야 함:**
| 토큰 | 의미 | 리네임? |
|---|---|---|
| `Tangtang`/`tangtang` | **이 도구(툴) 브랜드** | ✅ 대상 |
| `탕탕특공대` | **게임명**(Survivor.io 한국 정식명) | ❌ **보존** |

→ 맹목 sed 금지(게임명·내부키 깨짐).

## 통계 (CC raw)
| 패턴 | 건수 |  | 패턴 | 건수 |
|---|---|---|---|---|
| `tangtang` | 730 |  | `탕탕특공대`(게임명) | 16 |
| `Tangtang` | 278 |  | `탕탕` | 16 |
| `TANGTANG` | 30 |  | `tanggall`(도메인) | 5 |

**60파일** — frontend 54, docs 6. (Rust/Cargo/README/wasm = **0건**). ext: mjs 32, ts 12, tsx 7, md 6, json 3.
고빈도는 대부분 `frontend/scripts/*_unit_test.mjs`(테스트) = DO-NOT-CHANGE.

---

## 🟢 MUST-CHANGE — 툴 브랜드 "Tangtang" 사용자 노출 (도메인은 이미 완료, UI 텍스트만 남음)

| 파일:줄 | 내용 |
|---|---|
| `frontend/messages/en.json:94,97,127,128,129` | appName `Tangtang` / author `Tangtang Team` / subtitle `Tangtang calculator workspace` / statusPending `Preparing Tangtang…` / statusReady `Tangtang ready.` |
| `frontend/messages/ko.json:94,97,127,128,129` | appName `Tangtang` / author `Tangtang Team` / subtitle `Tangtang 계산 작업공간` / statusPending `Tangtang 준비 중…` / statusReady `Tangtang 준비 완료.` |
| `frontend/app/[locale]/layout.tsx:26,28,31,33,57` | title/ogAlt(en+ko)·`siteName: 'Tangtang'` — **`Tangtang`만 변경, `탕탕특공대`(게임명)·`Survivor.io` 보존** |
| `frontend/app/[locale]/v3/page.tsx:46` | 화면 헤딩 `<span>Tangtang</span>` |
| `frontend/public/manifest.json:2,3` | PWA `name`/`short_name: "Tangtang"` |
| `frontend/components/v3/tech/techLocaleCopy.ts:168,353,404,589` | `Tangtang profile import`·`Tangtang calculation`·`Tangtang 프로필 가져오기`·`Tangtang 계산` (라벨) |
| `frontend/app/[locale]/community/page.tsx` | `Tangtang Community`·`Tangtang · …` 등 툴 브랜드(같은 파일 `탕탕특공대`=게임명 보존) |

⚠ 연동: statusReady/appName 변경 시 `e2e/v3_smoke_test.spec.ts` 어서션(`Tangtang 준비 완료.` 등) 동반 수정.

---

## 🔴 DO-NOT-CHANGE — 내부·데이터·게임명 (대다수)
| 위치 | 사유 |
|---|---|
| **`app/lib/pareto-store/tech-profile-storage.ts:13,18`** `storageKey 'tangtang:tech-profile:*'` | 🔴 변경 시 **기존 유저 localStorage 프로필 손실** — 마이그레이션 없이 금지 |
| `app/lib/pareto-store/tech-profile-share.ts` KIND `'tangtang-tech-profile-share'` | 공유/백업 직렬화 호환 |
| `*tangtangDamage*` (store/calc/tech-upgrade) | 코드 필드명 |
| `techLocaleCopy.ts:122` `tangtang: string` | 타입 키 |
| `frontend/scripts/*_unit_test.mjs` (다수, 최다 hit) | 테스트 파일명·픽스처·어서션 |
| `frontend/e2e/*.spec.ts` | 어서션(문자열과 동반만) |
| `frontend/artifacts/td11/*.json` | 데이터/픽스처(경로 로드) |
| 전체 `탕탕특공대` | 게임 정식명 — 보존 |

---

## 🟡 DEFER
| 위치 | 사유 |
|---|---|
| `docs/superpowers/plans/*.md` (6) | 과거 기록 |
| repo/package/crate name | **불필요** — Rust/Cargo/README에 tangtang 0건(식별자 `tttg_forge_*`, pkg `pareto-ui`) |

---

## 핵심 요약 (우성님 결정용)
1. **도메인 리네임(tanggall.vercel.app)은 이미 완료** — 남은 작업은 **앱 내 표시 브랜드 텍스트**뿐(소규모).
2. **게임명 `탕탕특공대` 보존 / 툴 브랜드 `Tangtang`만 변경** — 맹목 치환 금지.
3. **`tangtang:tech-profile:*` localStorage 키 절대 단순치환 금지** — 유저 데이터 손실(마이그레이션 설계 필요).
4. repo/package/크레이트 리네이밍 불필요.
5. 🔴 본 조사 = 현황 GT만. 신규명 표기 규칙·실행은 우성님 결정 후 별도 sprint.
