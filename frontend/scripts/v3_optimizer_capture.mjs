import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.resolve(
  repoRoot,
  '..',
  '..',
  'Woosdom_Brain',
  '01_Domains',
  'System',
  'codex_output',
  'pareto_v3_optimizer_ui_relic_twinborn_2026-05-17',
  'screenshots',
);
const localBase = process.env.PARETO_LOCAL_BASE ?? 'http://localhost:3037';
const sioBase = process.env.SIO_TOOLS_BASE ?? 'https://sio-tools.vercel.app/';

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

async function capture(name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

async function captureLocalRelic() {
  await page.goto(`${localBase}/en/v3/optimizer/relic-core`);
  await page.waitForSelector('[data-testid="relic-core-run"]:not([disabled])');
  await capture('relic_core_01_route.png');
  await page.locator('[data-testid="relic-constraint-eternalCores"]').fill('20');
  await capture('relic_core_02_constraints.png');
  await page.locator('[data-testid="relic-core-run"]').click();
  await page.waitForSelector('[data-testid="relic-core-result-row"]');
  await capture('relic_core_03_results.png');
  await page.locator('[data-testid="relic-core-pareto-point"]').first().waitFor();
  await capture('relic_core_04_pareto.png');
  await page.setViewportSize({ width: 390, height: 840 });
  await capture('relic_core_05_mobile.png');
  await page.setViewportSize({ width: 1440, height: 1100 });
}

async function captureLocalTwinborn() {
  await page.goto(`${localBase}/en/v3/optimizer/twinborn-auto-assign`);
  await page.waitForSelector('[data-testid="twinborn-auto-assign-run"]:not([disabled])');
  await capture('twinborn_01_route.png');
  await page.locator('[data-testid="twinborn-chip-pool"]').fill('30');
  await capture('twinborn_02_chip_pool.png');
  await page.locator('[data-testid="twinborn-auto-assign-run"]').click();
  await page.waitForSelector('[data-testid="twinborn-assignment-row"]');
  await capture('twinborn_03_assignments.png');
  await page.locator('[data-testid="twinborn-comparison"]').waitFor();
  await capture('twinborn_04_comparison.png');
  await page.setViewportSize({ width: 390, height: 840 });
  await capture('twinborn_05_mobile.png');
  await page.setViewportSize({ width: 1440, height: 1100 });
}

async function captureSioReference() {
  await page.goto(sioBase, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  for (const name of [
    'sio_relic_compare_01.png',
    'sio_relic_compare_02.png',
    'sio_relic_compare_03.png',
    'sio_twinborn_compare_01.png',
    'sio_twinborn_compare_02.png',
    'sio_twinborn_compare_03.png',
  ]) {
    await capture(name);
  }
}

try {
  await captureLocalRelic();
  await captureLocalTwinborn();
  await captureSioReference();
} finally {
  await browser.close();
}
