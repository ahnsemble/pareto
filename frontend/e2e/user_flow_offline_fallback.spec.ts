import { expect, test } from '@playwright/test';
import {
  chooseRepresentativeInputs,
  firstBuildSignature,
  optimizeAndWait,
} from './helpers/user-flow';

test.describe('User flow — offline fallback', () => {
  test('warm WASM/game-data path still optimizes after the browser context goes offline', async ({
    context,
    page,
  }) => {
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    await page.goto('/en/optimize', { waitUntil: 'domcontentloaded' });
    await chooseRepresentativeInputs(page, { collectibleCount: 8 });
    await optimizeAndWait(page);
    const onlineSignature = await firstBuildSignature(page);
    expect(onlineSignature).toBeTruthy();

    await context.setOffline(true);
    try {
      await page.locator('#hero-select').selectOption('commando');
      const elapsedMs = await optimizeAndWait(page);
      expect(elapsedMs).toBeLessThan(5_000);
      console.log(`[user-flow-offline] elapsedMs=${elapsedMs}`);

      const offlineSignature = await firstBuildSignature(page);
      expect(offlineSignature).toBeTruthy();
      await expect(page.locator('article')).toHaveCount(5);
    } finally {
      await context.setOffline(false);
    }

    expect(failedRequests).toEqual([]);
  });
});
