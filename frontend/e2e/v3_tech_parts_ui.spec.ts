import { expect, test } from '@playwright/test';

const V3_URL = '/en/v3';

test.describe('TD-11 — sio-style Tech Parts UI', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? 'http://localhost:3032'}${V3_URL}`);
    await page.waitForSelector('[data-testid="v3-boot-status"]');
  });

  test('renders twinborn, active skill, and mode grids', async ({ page }) => {
    await expect(page.getByTestId('v3-tech-parts-panel')).toBeVisible();
    await expect(page.getByTestId('tech-parts-optimize-action')).toBeVisible();
    await expect(page.getByTestId('tech-parts-track-action')).toBeVisible();
    await expect(page.getByTestId('tech-twinborn-grid').locator('[data-testid^="tech-card-"]')).toHaveCount(10);
    await expect(page.getByTestId('tech-active-skills-grid').locator('[data-testid^="tech-card-"]')).toHaveCount(18);
    await expect(page.getByTestId('tech-mode-variants-grid').locator('[data-testid^="tech-card-"]')).toHaveCount(12);
  });

  test('opens Tech parts Configuration modal with sio controls', async ({ page }) => {
    await page.getByTestId('tech-card-energyGuidanceSystem').click();

    await expect(page.getByRole('dialog', { name: /Tech parts Configuration/i })).toBeVisible();
    await expect(page.getByLabel(/Equip Energy Guidance System/i)).toBeVisible();
    await expect(page.getByLabel(/Drone Mode/i)).toBeVisible();
    await expect(page.getByLabel(/Total Resonance Energy/i)).toHaveValue('3000');
    await expect(page.getByLabel(/Enter support parts manually/i)).toBeVisible();
    await expect(page.getByLabel(/Overload/i)).toBeVisible();
    await expect(page.getByText(/max: 1 → 2 at 3500/i)).toBeVisible();
    await expect(page.getByTestId('tech-mode-hexagon-preview')).toBeVisible();
  });
});
