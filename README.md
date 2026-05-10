# Pareto

Pareto is a build optimization tool that uses Rust, WASM, branch-and-bound search, and a Pareto frontier to help compare high-value build choices quickly.

## 한국어

Pareto는 빌드 후보를 빠르게 만들고, 점수와 데미지 축의 Pareto frontier를 계산해 상위 후보를 비교하는 도구입니다. Rust optimizer와 WASM 패키지를 사용해 브라우저에서도 빠르게 실행되도록 설계했습니다.

### 핵심 기능

- Rust/WASM 기반 build optimizer
- Branch-and-bound search와 brute-force parity 검증
- Pareto frontier 시각화용 데이터
- 빌드 A/B diff 데이터
- 검색 공간 heatmap 데이터
- `ee`, `turf`, `boss`, `lme1` objective 확장
- Game data 변경 감지 workflow
- WASM size PR check

### 사용법

```bash
cargo test --workspace --release
wasm-pack build tttg_forge_wasm --target web --release
cd frontend && npm run build
```

### 스크린샷 자리

- screenshot-placeholder-1: optimizer input
- screenshot-placeholder-2: Pareto frontier chart
- screenshot-placeholder-3: build diff view
- screenshot-placeholder-4: heatmap view
- screenshot-placeholder-5: launch checklist pass screen

### 자주 묻는 질문

**Q. 공식 도구인가요?**

A. 아니요. Pareto는 비공식 최적화/분석 도구입니다.

**Q. 어떤 데이터를 저장하나요?**

A. 기본 analytics spec은 PII와 raw build payload를 저장하지 않도록 설계했습니다.

**Q. WASM size 기준은 무엇인가요?**

A. production default package는 raw `145,000 B`, gzip `60,000 B` 이하를 목표로 합니다.

## English

Pareto generates build candidates quickly and computes a Pareto frontier across score and damage axes so users can compare high-value builds. It is designed around a Rust optimizer and a small production WASM package.

### Core Features

- Rust/WASM build optimizer
- Branch-and-bound search with brute-force parity checks
- Data for Pareto frontier visualization
- Build A/B diff data
- Search-space heatmap data
- Extended `ee`, `turf`, `boss`, and `lme1` objectives
- Game data change detection workflow
- WASM size PR check

### Usage

```bash
cargo test --workspace --release
wasm-pack build tttg_forge_wasm --target web --release
cd frontend && npm run build
```

### Screenshot Placeholders

- screenshot-placeholder-1: optimizer input
- screenshot-placeholder-2: Pareto frontier chart
- screenshot-placeholder-3: build diff view
- screenshot-placeholder-4: heatmap view
- screenshot-placeholder-5: launch checklist pass screen

### FAQ

**Q. Is this an official tool?**

A. No. Pareto is an unofficial optimization and analysis tool.

**Q. What data is stored?**

A. The default analytics spec is designed to avoid PII and raw build payloads.

**Q. What is the WASM size target?**

A. The production default package targets raw `145,000 B` and gzip `60,000 B` or less.
