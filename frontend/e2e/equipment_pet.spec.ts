import { test, expect } from '@playwright/test';

test.describe('Sprint G.6 Session 2 — Equipment + Pet (Option Y)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
    await page.locator('#hero-select').selectOption('overlord');
    const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
    await expect(optimizeBtn).toBeEnabled({ timeout: 10_000 });
  });

  test('equipment T1 — weapon slot: select first item updates state', async ({ page }) => {
    const select = page.getByTestId('equipment-weapon');
    await expect(select).toBeVisible();
    const opts = await select.locator('option').count();
    expect(opts).toBeGreaterThanOrEqual(11);
    await select.selectOption({ index: 1 });
    expect(await select.inputValue()).not.toBe('');
  });

  test('equipment T2 — ring slot: select propagates and clears', async ({ page }) => {
    const select = page.getByTestId('equipment-ring');
    await expect(select).toBeVisible();
    await select.selectOption({ index: 2 });
    const v1 = await select.inputValue();
    expect(v1).not.toBe('');
    await select.selectOption('');
    expect(await select.inputValue()).toBe('');
  });

  test('equipment T3 — necklace slot: select third item updates state', async ({ page }) => {
    const select = page.getByTestId('equipment-necklace');
    await expect(select).toBeVisible();
    await select.selectOption({ index: 3 });
    expect(await select.inputValue()).not.toBe('');
  });

  test('pet T1 — early state activates and tagline shows on selection', async ({ page }) => {
    const petSelect = page.locator('#pet-select');
    await petSelect.selectOption('rex');
    await expect(page.getByTestId('pet-tagline')).toBeVisible();
    const earlyBtn = page.getByTestId('pet-state-early');
    await earlyBtn.click();
    await expect(earlyBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('pet T2 — mid state press and active toggle', async ({ page }) => {
    await page.locator('#pet-select').selectOption('frost-fox');
    const midBtn = page.getByTestId('pet-state-mid');
    await midBtn.click();
    await expect(midBtn).toHaveAttribute('aria-pressed', 'true');
    const earlyBtn = page.getByTestId('pet-state-early');
    await expect(earlyBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('pet T3 — endgame state press and active toggle', async ({ page }) => {
    await page.locator('#pet-select').selectOption('volt-cat');
    const endgameBtn = page.getByTestId('pet-state-endgame');
    await endgameBtn.click();
    await expect(endgameBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('integration T1 — equipment-only run produces non-empty frontier', async ({ page }) => {
    await page.getByTestId('equipment-weapon').selectOption({ index: 1 });
    await page.getByTestId('equipment-ring').selectOption({ index: 2 });
    await page.getByTestId('equipment-necklace').selectOption({ index: 3 });
    await page.getByRole('button', { name: /^Optimize$/ }).click();
    await page.waitForSelector('article', { timeout: 5_000 });
    const cards = page.locator('article');
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('integration T2 — pet-only endgame run produces non-empty frontier', async ({ page }) => {
    await page.locator('#pet-select').selectOption('rex');
    await page.getByTestId('pet-state-endgame').click();
    await page.getByRole('button', { name: /^Optimize$/ }).click();
    await page.waitForSelector('article', { timeout: 5_000 });
    expect(await page.locator('article').count()).toBeGreaterThanOrEqual(1);
  });

  test('integration T3 — equipment + pet combination produces non-empty frontier', async ({
    page,
  }) => {
    await page.getByTestId('equipment-weapon').selectOption({ index: 4 });
    await page.getByTestId('equipment-necklace').selectOption({ index: 5 });
    await page.locator('#pet-select').selectOption('pyra');
    await page.getByTestId('pet-state-mid').click();
    await page.getByRole('button', { name: /^Optimize$/ }).click();
    await page.waitForSelector('article', { timeout: 5_000 });
    expect(await page.locator('article').count()).toBeGreaterThanOrEqual(1);
  });
});
