import { expect, test } from '@playwright/test';

test.describe('Sprint G.6 Session 1.5 — i18n infrastructure (en / ko placeholder / locale redirect)', () => {
  test('/en/twodeck renders English labels (Pareto Frontier, Top 5, Diff Highlight)', async ({ page }) => {
    await page.goto('/en/twodeck', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('tab', { name: 'Pareto Frontier' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Top 5' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Diff Highlight' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('/ko/twodeck renders Korean labels (파레토 프론티어, 상위 5, 차이점 강조)', async ({ page }) => {
    await page.goto('/ko/twodeck', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
    await expect(page.getByRole('tab', { name: '파레토 프론티어' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '상위 5' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '차이점 강조' })).toBeVisible();
  });

  test('/twodeck without locale redirects to /en/twodeck (defaultLocale)', async ({ page }) => {
    const response = await page.goto('/twodeck', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toMatch(/\/en\/twodeck\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('Sprint G.6 mini-sprint K1 — Korean label pack (ko.json swap PASS)', () => {
  test('/ko/twodeck — English labels NOT exposed (no Pareto Frontier / Two-Deck Compare / Diff Highlight in English)', async ({ page }) => {
    await page.goto('/ko/twodeck', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
    await expect(page.getByRole('tab', { name: 'Pareto Frontier', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Top 5', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Diff Highlight', exact: true })).toHaveCount(0);
    const body = await page.locator('body').textContent();
    expect(body).toContain('파레토');
    expect(body).toContain('프론티어');
    expect(body).toContain('차이점');
  });
});
