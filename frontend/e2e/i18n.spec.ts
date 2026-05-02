import { expect, test } from '@playwright/test';

test.describe('Sprint G.6 Session 1.5 — i18n infrastructure (en / ko placeholder / locale redirect)', () => {
  test('/en/twodeck renders English labels (Pareto Frontier, Top 5, Diff Highlight)', async ({ page }) => {
    await page.goto('/en/twodeck', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('tab', { name: 'Pareto Frontier' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Top 5' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Diff Highlight' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('/ko/twodeck renders Korean placeholder (English text retained, lang=ko)', async ({ page }) => {
    await page.goto('/ko/twodeck', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
    // ko.json placeholders use English values pre-swap; assert tabs render English text under lang=ko
    await expect(page.getByRole('tab', { name: 'Pareto Frontier' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Top 5' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Diff Highlight' })).toBeVisible();
  });

  test('/twodeck without locale redirects to /en/twodeck (defaultLocale)', async ({ page }) => {
    const response = await page.goto('/twodeck', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toMatch(/\/en\/twodeck\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
