import { test, expect } from '@playwright/test';

test.describe('Mobile responsiveness (Sprint G.2 Session 3 carryover #5)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile 375px — full optimize flow renders without horizontal scroll', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });

    await page.locator('#hero-select').selectOption('overlord');

    const toggles = page.locator('button[role="switch"]:visible');
    await expect(toggles).toHaveCount(64);
    for (let i = 0; i < 12; i += 1) {
      await toggles.nth(i).click();
    }

    const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
    await expect(optimizeBtn).toBeEnabled({ timeout: 10_000 });
    await optimizeBtn.click();

    await page.waitForSelector('article', { timeout: 5_000 });

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    console.log(`[mobile] scrollWidth=${scrollWidth} clientWidth=${clientWidth}`);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });

  test('mobile 375px — collectible toggle grid reflows to 2 columns', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });

    // Sprint G.6 A T2.1: mobile defaults to list view; switch to grid to verify 2-col reflow
    await page.getByTestId('collectible-view-toggle').click();

    const gridToggles = page.locator('[data-testid="collectible-grid"] button[role="switch"]');
    const firstToggle = gridToggles.first();
    const secondToggle = gridToggles.nth(1);
    const thirdToggle = gridToggles.nth(2);

    await firstToggle.waitFor({ state: 'visible' });
    const box1 = await firstToggle.boundingBox();
    const box2 = await secondToggle.boundingBox();
    const box3 = await thirdToggle.boundingBox();
    if (!box1 || !box2 || !box3) throw new Error('toggle boundingBox missing');

    expect(box1.y).toBe(box2.y);
    expect(box3.y).toBeGreaterThan(box1.y);
    console.log(
      `[mobile-grid] toggle1.y=${box1.y} toggle2.y=${box2.y} toggle3.y=${box3.y} ` +
        `→ confirmed 2-column reflow`,
    );
  });
});
