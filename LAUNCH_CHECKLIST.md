# Launch Checklist

## Automated Checks (20)

- [ ] AUTO-01 `cargo test --workspace --release` passes.
- [ ] AUTO-02 Production WASM build passes.
- [ ] AUTO-03 Raw WASM size is at or below `162,860 B`.
- [ ] AUTO-04 Gzip WASM size is at or below launch cap.
- [ ] AUTO-05 Bench regression check passes for the selected profile.
- [ ] AUTO-06 i18n key consistency test passes.
- [ ] AUTO-07 Frontend production build passes.
- [ ] AUTO-08 Game data detector dry-run passes.
- [ ] AUTO-09 Core workflow files are present.
- [ ] AUTO-10 Public confidentiality value grep returns 0 matches.
- [ ] AUTO-11 CSP header config is present.
- [ ] AUTO-12 `robots.txt` route is present.
- [ ] AUTO-13 `sitemap.xml` route is present.
- [ ] AUTO-14 OG image is present.
- [ ] AUTO-15 Web manifest JSON is valid.
- [ ] AUTO-16 README has Korean and English sections.
- [ ] AUTO-17 LICENSE and NOTICE are present.
- [ ] AUTO-18 CHANGELOG covers G.10.
- [ ] AUTO-19 This checklist remains split into 20 auto and 10 manual items.
- [ ] AUTO-20 Git diff whitespace check passes.

## Manual Checks (10)

- [ ] MANUAL-01 Mobile UX screenshot attached.
- [ ] MANUAL-02 Korean text cutoff screenshot attached.
- [ ] MANUAL-03 Dark mode screenshot attached.
- [ ] MANUAL-04 Accessibility audit evidence attached.
- [ ] MANUAL-05 Launch post checklist reviewed.
- [ ] MANUAL-06 Telegram brief delivery confirmed.
- [ ] MANUAL-07 GA event delivery confirmed.
- [ ] MANUAL-08 Lighthouse production measurement attached.
- [ ] MANUAL-09 Production domain reaches expected page.
- [ ] MANUAL-10 SSL grade checked on production domain.

## Execution

Run automated checks with:

```bash
scripts/launch_verify.sh
```

Nightly launch verification runs through `.github/workflows/launch_verify.yml`. Manual checks remain release-owner responsibilities because they require visual screenshots, external delivery channels, or production-domain evidence.
