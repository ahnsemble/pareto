import { test, expect } from '@playwright/test';

const RELIC_URL = '/en/v3/optimizer/relic-core';
const TWINBORN_URL = '/en/v3/optimizer/twinborn-auto-assign';

test.describe('Sprint Z — Relic Core Optimizer route', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? 'http://localhost:3032'}${RELIC_URL}`);
  });

  test('R1 renders the route and boots the optimizer surface', async ({ page }) => {
    await expect(page.locator('[data-testid="relic-core-optimizer"]')).toBeVisible();
    await expect(page.locator('[data-testid="relic-core-run"]')).toBeEnabled();
  });

  test('R2 exposes five resource constraints', async ({ page }) => {
    await expect(page.locator('[data-testid^="relic-constraint-"]')).toHaveCount(5);
  });

  test('R3 runs WASM optimization and shows ranked results', async ({ page }) => {
    await page.locator('[data-testid="relic-core-run"]').click();
    await expect(page.locator('[data-testid="relic-core-result-row"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="relic-core-latency"]')).toContainText('ms');
  });

  test('R4 shows Pareto set visualization after run', async ({ page }) => {
    await page.locator('[data-testid="relic-core-run"]').click();
    await expect(page.locator('[data-testid="relic-core-pareto-point"]')).toHaveCount(2);
  });

  test('R5 links back to the V3 hub', async ({ page }) => {
    await expect(page.locator('[data-testid="v3-hub-link"]')).toHaveAttribute('href', '/en/v3');
  });
});

test.describe('Sprint Z — Twinborn Auto-Assign route', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? 'http://localhost:3032'}${TWINBORN_URL}`);
  });

  test('T1 renders the route and chip pool editor', async ({ page }) => {
    await expect(page.locator('[data-testid="twinborn-auto-assign"]')).toBeVisible();
    await expect(page.locator('[data-testid="twinborn-chip-pool"]')).toBeVisible();
  });

  test('T2 exposes solver iteration cap', async ({ page }) => {
    await expect(page.locator('[data-testid="twinborn-iteration-cap"]')).toHaveValue('10000');
  });

  test('T3 runs auto assignment and shows assignments', async ({ page }) => {
    await page.locator('[data-testid="twinborn-auto-assign-run"]').click();
    await expect(page.locator('[data-testid="twinborn-assignment-row"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="twinborn-iterations"]')).toContainText('10000');
  });

  test('T4 compares manual and auto allocation', async ({ page }) => {
    await page.locator('[data-testid="twinborn-auto-assign-run"]').click();
    await expect(page.locator('[data-testid="twinborn-comparison"]')).toContainText('Auto');
    await expect(page.locator('[data-testid="twinborn-comparison"]')).toContainText('Manual');
  });

  test('T5 links back to the V3 hub', async ({ page }) => {
    await expect(page.locator('[data-testid="v3-hub-link"]')).toHaveAttribute('href', '/en/v3');
  });
});
