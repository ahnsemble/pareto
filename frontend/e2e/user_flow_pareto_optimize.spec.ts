import { expect, test } from '@playwright/test';
import { chooseRepresentativeInputs, optimizeAndWait } from './helpers/user-flow';

test.describe('User flow — Pareto optimize end to end', () => {
  test('defers the WASM worker fetch until the first optimize run', async ({ page }) => {
    const wasmUrls: string[] = [];
    page.on('requestfinished', (request) => {
      const url = request.url();
      if (url.includes('.wasm') || url.includes('tttg_forge_wasm')) {
        wasmUrls.push(url);
      }
    });

    await page.goto('/en/optimize', { waitUntil: 'networkidle' });
    expect(wasmUrls).toEqual([]);

    await chooseRepresentativeInputs(page, { collectibleCount: 4 });
    await optimizeAndWait(page);
    expect(wasmUrls.length).toBeGreaterThan(0);
  });

  test('loads WASM, accepts equipment/pet/collectible inputs, renders top-N details, and generates a share URL', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const finishedUrls: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });
    page.on('requestfinished', (request) => {
      finishedUrls.push(request.url());
    });

    await page.goto('/en/optimize', { waitUntil: 'domcontentloaded' });

    await chooseRepresentativeInputs(page, { collectibleCount: 12 });
    await expect(page.locator('#hero-select')).toHaveValue('overlord');
    await expect(page.getByTestId('equipment-weapon')).not.toHaveValue('');
    await expect(page.getByTestId('equipment-ring')).not.toHaveValue('');
    await expect(page.getByTestId('equipment-necklace')).not.toHaveValue('');
    await expect(page.locator('#pet-select')).toHaveValue('rex');

    const elapsedMs = await optimizeAndWait(page);
    expect(elapsedMs).toBeLessThan(5_000);
    console.log(`[user-flow-optimize] elapsedMs=${elapsedMs}`);
    expect(
      finishedUrls.some(
        (url) => url.includes('.wasm') || url.includes('tttg_forge_wasm'),
      ),
    ).toBe(true);

    const cards = page.locator('article');
    await expect(cards).toHaveCount(5);
    await expect(cards.first()).toContainText('#1');
    await expect(cards.first()).toContainText('score');
    await expect(cards.first()).toContainText('damage');
    await expect(cards.first()).toContainText('upgrades');

    const firstDetails = cards.first().locator('details');
    await firstDetails.locator('summary').click();
    await expect(firstDetails.locator('li').first()).toContainText('slot_');

    await page.getByTestId('share-url-button').click();
    const shareUrl = await page.getByTestId('share-url-output').inputValue();
    expect(shareUrl).toContain('/en/optimize?');
    expect(shareUrl).toContain('hero=overlord');
    expect(shareUrl).toContain('owned=');

    expect(consoleErrors).toEqual([]);
  });
});
