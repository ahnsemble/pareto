import { test, expect, type Page } from '@playwright/test';

// Sprint G.6 T4 (carryover) — TwoDeckOverlay /optimize integration.
// 3 modes (pareto / top5 / diff) × 2 projects (chromium-desktop + chromium-mobile-375) = 6 instances.

async function runOptimizeAndSnapshot(
  page: Page,
  hero: string,
  toggleCount: number,
  saveAs: 'a' | 'b',
) {
  await page.locator('#hero-select').selectOption(hero);
  const toggles = page.locator('button[role="switch"]:visible');
  await expect(toggles).toHaveCount(64);
  for (let i = 0; i < toggleCount; i += 1) {
    await toggles.nth(i).click();
  }
  const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
  await expect(optimizeBtn).toBeEnabled({ timeout: 10_000 });
  await optimizeBtn.click();
  await page.waitForSelector('article', { timeout: 10_000 });
  const saveBtn = page.getByTestId(saveAs === 'a' ? 'save-as-deck-a' : 'save-as-deck-b');
  await expect(saveBtn).toBeVisible();
  await saveBtn.click();
}

async function setupTwoDecks(page: Page) {
  await page.goto('/optimize', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button[aria-disabled]');
      return btn !== null && btn.getAttribute('aria-disabled') === 'true';
    },
    { timeout: 10_000 },
  );
  await runOptimizeAndSnapshot(page, 'overlord', 8, 'a');
  await runOptimizeAndSnapshot(page, 'commando', 4, 'b');
  // Both snapshots set → TwoDeckOverlay must render
  await expect(page.getByTestId('two-deck-section')).toBeVisible();
  await expect(page.getByTestId('two-deck-overlay')).toBeVisible();
}

test.describe('Sprint G.6 T4 — TwoDeckOverlay (/optimize integration)', () => {
  test('mode pareto — frontier overlay scatter chart renders for two decks', async ({ page }) => {
    await setupTwoDecks(page);
    const paretoTab = page.getByTestId('two-deck-mode-pareto');
    await expect(paretoTab).toBeVisible();
    await paretoTab.click();
    await expect(paretoTab).toHaveAttribute('aria-selected', 'true');
    // The frontier chart wrapper (role=img + chart title in sr-only)
    await expect(
      page.locator('[aria-labelledby="two-deck-overlay-chart-title"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('mode top5 — side-by-side OptimizeResultGrid renders for both decks', async ({ page }) => {
    await setupTwoDecks(page);
    const top5Tab = page.getByTestId('two-deck-mode-top5');
    await top5Tab.click();
    await expect(top5Tab).toHaveAttribute('aria-selected', 'true');
    const top5Container = page.getByTestId('two-deck-top5');
    await expect(top5Container).toBeVisible();
    // Each side renders cards; with topK=5, expect at least 1 article per side
    const articles = top5Container.locator('article');
    const count = await articles.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('mode diff — symmetric difference summary + 3-color cards render', async ({ page }) => {
    await setupTwoDecks(page);
    const diffTab = page.getByTestId('two-deck-mode-diff');
    await diffTab.click();
    await expect(diffTab).toHaveAttribute('aria-selected', 'true');
    const diffContainer = page.getByTestId('two-deck-diff');
    await expect(diffContainer).toBeVisible();
    const summary = page.getByTestId('two-deck-diff-summary');
    await expect(summary).toBeVisible();
    // Summary always renders 3 spans: A unique / B unique / shared (count text)
    const summarySpans = summary.locator('span').filter({ hasNotText: '·' });
    expect(await summarySpans.count()).toBeGreaterThanOrEqual(3);
    // Distinct hero choices (overlord vs commando) must produce at least one only_a or only_b card
    const onlyACards = diffContainer.locator('[data-variant="only_a"]');
    const onlyBCards = diffContainer.locator('[data-variant="only_b"]');
    const totalUnique = (await onlyACards.count()) + (await onlyBCards.count());
    expect(totalUnique).toBeGreaterThan(0);
  });
});
