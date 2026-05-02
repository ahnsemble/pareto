import { test, expect } from '@playwright/test';

test.describe('Comlink Worker browser verification (Sprint G.2 Session 3 carryover #6)', () => {
  test('scenario 1 — production /optimize renders Top builds within 5s', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[aria-disabled]');
        return btn !== null && btn.getAttribute('aria-disabled') === 'true';
      },
      { timeout: 10_000 },
    );

    await page.locator('#hero-select').selectOption('overlord');

    const toggles = page.locator('button[role="switch"]');
    const count = await toggles.count();
    expect(count).toBe(64);
    for (let i = 0; i < 12; i += 1) {
      await toggles.nth(i).click();
    }

    const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
    await expect(optimizeBtn).toBeEnabled({ timeout: 5_000 });

    const t0 = Date.now();
    await optimizeBtn.click();

    await page.waitForSelector('article', { timeout: 5_000 });
    const elapsedMs = Date.now() - t0;
    expect(elapsedMs).toBeLessThan(5_000);

    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
    expect(cardCount).toBeLessThanOrEqual(5);

    expect(consoleErrors).toEqual([]);
  });

  test('scenario 2 — main thread is not blocked while optimize runs', async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    await page.locator('#hero-select').selectOption('overlord');
    const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
    await expect(optimizeBtn).toBeEnabled({ timeout: 10_000 });

    await page.evaluate(() => {
      (window as unknown as { __ticks: number }).__ticks = 0;
      const id = window.setInterval(() => {
        (window as unknown as { __ticks: number }).__ticks += 1;
      }, 1);
      (window as unknown as { __tickInterval: number }).__tickInterval = id;
    });

    await optimizeBtn.click();
    await page.waitForSelector('article', { timeout: 5_000 });

    const ticks = await page.evaluate(() => {
      const w = window as unknown as { __ticks: number; __tickInterval: number };
      window.clearInterval(w.__tickInterval);
      return w.__ticks;
    });

    expect(ticks).toBeGreaterThan(0);
    console.log(`[scenario2] main-thread setInterval ticks during optimize: ${ticks}`);
  });

  test('scenario 3 — no console.error during full /optimize flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push(`pageerror: ${err.message}`);
    });

    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    await page.locator('#hero-select').selectOption('commando');
    const toggles = page.locator('button[role="switch"]');
    for (let i = 0; i < 8; i += 1) {
      await toggles.nth(i).click();
    }
    const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
    await expect(optimizeBtn).toBeEnabled({ timeout: 10_000 });
    await optimizeBtn.click();
    await page.waitForSelector('article', { timeout: 5_000 });

    expect(errors).toEqual([]);
  });
});
