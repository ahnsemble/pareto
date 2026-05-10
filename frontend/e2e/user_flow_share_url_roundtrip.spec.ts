import { expect, test } from '@playwright/test';
import { firstBuildSignature, runRepresentativeOptimize } from './helpers/user-flow';

test.describe('User flow share URL roundtrip', () => {
  test('generated optimize URL restores inputs and reproduces the first top build', async ({
    page,
  }) => {
    await runRepresentativeOptimize(page);
    const before = await firstBuildSignature(page);
    expect(before).toBeTruthy();

    await page.getByTestId('share-url-button').click();
    const shareUrl = await page.getByTestId('share-url-output').inputValue();
    expect(shareUrl).toContain('/en/optimize?');
    expect(shareUrl).toContain('hero=overlord');

    const parsed = new URL(shareUrl);
    await page.goto(`${parsed.pathname}${parsed.search}`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#hero-select')).toHaveValue('overlord');
    await expect(page.getByTestId('equipment-weapon')).not.toHaveValue('');
    await expect(page.getByTestId('equipment-ring')).not.toHaveValue('');
    await expect(page.locator('#pet-select')).toHaveValue('rex');
    await expect(page.getByTestId('pet-state-endgame')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const optimizeBtn = page.getByRole('button', { name: /^Optimize$/ });
    await expect(optimizeBtn).toBeEnabled({ timeout: 10_000 });
    await optimizeBtn.click();
    await page.waitForSelector('article', { timeout: 5_000 });

    const after = await firstBuildSignature(page);
    expect(after).toBe(before);
  });
});
