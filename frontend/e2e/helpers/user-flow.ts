import { expect, type Page } from '@playwright/test';

export async function chooseRepresentativeInputs(
  page: Page,
  options: { collectibleCount?: number } = {},
) {
  const collectibleCount = options.collectibleCount ?? 10;
  await page.locator('#hero-select').selectOption('overlord');
  await page.getByTestId('equipment-weapon').selectOption({ index: 1 });
  await page.getByTestId('equipment-ring').selectOption({ index: 2 });
  await page.getByTestId('equipment-necklace').selectOption({ index: 3 });
  await page.locator('#pet-select').selectOption('rex');
  await page.getByTestId('pet-state-endgame').click();

  const toggles = page.locator('button[role="switch"]:visible');
  for (let i = 0; i < collectibleCount; i += 1) {
    await toggles.nth(i).click();
  }
}

export async function optimizeAndWait(page: Page) {
  const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
  await expect(optimizeBtn).toBeEnabled({ timeout: 10_000 });
  const startedAt = Date.now();
  await optimizeBtn.click();
  await page.waitForSelector('article', { timeout: 5_000 });
  return Date.now() - startedAt;
}

export async function firstBuildSignature(page: Page) {
  const text = await page.locator('article').first().textContent();
  return text?.replace(/\s+/g, ' ').trim();
}

export async function runRepresentativeOptimize(
  page: Page,
  options: { collectibleCount?: number } = {},
) {
  await page.goto('/en/optimize', { waitUntil: 'domcontentloaded' });
  await chooseRepresentativeInputs(page, options);
  return optimizeAndWait(page);
}
