// Generate og-community.png (1200×630) using Playwright Chromium.
// Usage: node scripts/generate-og-image.mjs
// Output: public/og-community.png

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: 1200px; height: 630px;
    background: #0a0e1a;
    font-family: 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #f9fafb;
    overflow: hidden;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }
  .grid {
    display: grid;
    grid-template-columns: 660px 540px;
    height: 560px;
  }
  .zone-a {
    margin: 40px 0 40px 40px;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 40px;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
  }
  .chart-title {
    font-size: 18px;
    font-weight: 600;
    color: #c8ff5a;
    margin-bottom: 16px;
    letter-spacing: 0.04em;
  }
  .chart-axes {
    position: absolute;
    left: 80px;
    top: 80px;
    right: 40px;
    bottom: 80px;
    border-left: 2px solid #374151;
    border-bottom: 2px solid #374151;
  }
  .axis-label-x {
    position: absolute;
    bottom: 40px;
    right: 60px;
    font-size: 12px;
    color: #6b7280;
    letter-spacing: 0.08em;
  }
  .axis-label-y {
    position: absolute;
    top: 70px;
    left: 50px;
    font-size: 12px;
    color: #6b7280;
    transform: rotate(-90deg);
    transform-origin: top left;
    letter-spacing: 0.08em;
  }
  .curve {
    position: absolute;
    width: 100%; height: 100%;
    top: 0; left: 0;
  }
  .legend {
    position: absolute;
    bottom: 40px;
    left: 80px;
    display: flex;
    gap: 24px;
    font-size: 13px;
  }
  .legend-item { display: flex; align-items: center; gap: 8px; color: #9ca3af; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }

  .zone-b {
    padding: 80px 60px 40px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .logo {
    color: #c8ff5a;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.1em;
    margin-bottom: 32px;
  }
  .slogan-line1 {
    color: #f9fafb;
    font-size: 46px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.01em;
    margin-bottom: 4px;
  }
  .slogan-line2 {
    color: #c8ff5a;
    font-size: 46px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.01em;
    margin-bottom: 32px;
  }
  .subcopy {
    color: #9ca3af;
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.005em;
  }

  .zone-c {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 70px;
    background: rgba(17, 24, 39, 0.92);
    border-top: 1px solid #1f2937;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 60px;
    box-sizing: border-box;
  }
  .url {
    color: #9ca3af;
    font-size: 16px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .badge {
    color: #6b7280;
    font-size: 14px;
    border: 1px solid #374151;
    padding: 6px 14px;
    border-radius: 999px;
  }
</style>
</head>
<body>
  <div class="grid">
    <div class="zone-a">
      <div class="chart-title">PARETO FRONTIER · DECK COMPARISON</div>
      <svg class="curve" viewBox="0 0 580 480" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0" stop-color="#c8ff5a" stop-opacity="0.0"/>
            <stop offset="0.5" stop-color="#c8ff5a" stop-opacity="0.18"/>
            <stop offset="1" stop-color="#c8ff5a" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="g2" x1="0" x2="1">
            <stop offset="0" stop-color="#6ee7b7" stop-opacity="0.0"/>
            <stop offset="0.5" stop-color="#6ee7b7" stop-opacity="0.14"/>
            <stop offset="1" stop-color="#6ee7b7" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <g transform="translate(80,60)">
          <line x1="0" y1="0" x2="0" y2="340" stroke="#1f2937" stroke-width="1"/>
          <line x1="0" y1="340" x2="450" y2="340" stroke="#1f2937" stroke-width="1"/>
          <line x1="0" y1="85" x2="450" y2="85" stroke="#1f2937" stroke-width="0.5" stroke-dasharray="2 4"/>
          <line x1="0" y1="170" x2="450" y2="170" stroke="#1f2937" stroke-width="0.5" stroke-dasharray="2 4"/>
          <line x1="0" y1="255" x2="450" y2="255" stroke="#1f2937" stroke-width="0.5" stroke-dasharray="2 4"/>
          <path d="M0,310 C80,260 140,180 200,140 S320,70 450,40"
                fill="none" stroke="#c8ff5a" stroke-width="3" stroke-linecap="round"/>
          <path d="M0,320 C80,300 140,250 200,200 S320,140 450,110"
                fill="none" stroke="#6ee7b7" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 4"/>
          <circle cx="0" cy="310" r="4" fill="#c8ff5a"/>
          <circle cx="100" cy="240" r="4" fill="#c8ff5a"/>
          <circle cx="200" cy="140" r="5" fill="#c8ff5a" stroke="#0a0e1a" stroke-width="2"/>
          <circle cx="320" cy="80" r="4" fill="#c8ff5a"/>
          <circle cx="450" cy="40" r="5" fill="#c8ff5a" stroke="#0a0e1a" stroke-width="2"/>
          <circle cx="0" cy="320" r="4" fill="#6ee7b7"/>
          <circle cx="120" cy="280" r="4" fill="#6ee7b7"/>
          <circle cx="240" cy="190" r="4" fill="#6ee7b7"/>
          <circle cx="360" cy="140" r="4" fill="#6ee7b7"/>
          <circle cx="450" cy="110" r="4" fill="#6ee7b7"/>
          <circle cx="200" cy="240" r="14" fill="#ff6b6b" fill-opacity="0.18" stroke="#ff6b6b" stroke-width="1"/>
          <text x="220" y="246" font-size="11" fill="#ff6b6b" font-weight="600">DIFF</text>
        </g>
      </svg>
      <div class="legend">
        <div class="legend-item"><span class="legend-dot" style="background:#c8ff5a"></span>덱 A (current)</div>
        <div class="legend-item"><span class="legend-dot" style="background:#6ee7b7"></span>덱 B (alt)</div>
      </div>
    </div>
    <div class="zone-b">
      <div class="logo">PARETO</div>
      <div class="slogan-line1">빌드, 계산하지 말고</div>
      <div class="slogan-line2">비교하세요</div>
      <div class="subcopy">탕탕특공대 빌드 최적화 도구</div>
    </div>
  </div>
  <div class="zone-c">
    <div class="url">pareto.app/ko/community</div>
    <div class="badge">무료 웹 도구</div>
  </div>
</body>
</html>`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outPath = path.resolve(__dirname, '..', 'public', 'og-community.png');

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.setContent(HTML, { waitUntil: 'networkidle' });
await page.screenshot({ path: outPath, type: 'png', omitBackground: false, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log('wrote', outPath);
