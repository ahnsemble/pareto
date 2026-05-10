import { expect, type Locator, test } from '@playwright/test';

async function expectTouchTargetAtLeast44(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width, `${await locator.evaluate((el: Element) => el.outerHTML)} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${await locator.evaluate((el: Element) => el.outerHTML)} height`).toBeGreaterThanOrEqual(44);
}

test.describe('Self-fix mobile accessibility guards', () => {
  test('mobile optimize controls expose visible names and 44px touch targets', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile-375', 'mobile-only guard');

    await page.goto('/en/optimize', { waitUntil: 'domcontentloaded' });

    const firstCollectible = page
      .getByTestId('collectible-list')
      .locator('button')
      .first();
    await expect(firstCollectible).toBeVisible();
    await expect(firstCollectible).toHaveAccessibleName(/01\s+Strike-01/);

    const requiredTargets = [
      page.locator('header a').first(),
      page.locator('#hero-select'),
      page.getByTestId('collectible-view-toggle'),
      page.getByRole('button', { name: 'all' }),
      page.getByRole('button', { name: 'clear' }),
      page.getByTestId('equipment-weapon'),
      page.getByTestId('equipment-ring'),
      page.getByTestId('equipment-necklace'),
      page.locator('#pet-select'),
    ];

    for (const target of requiredTargets) {
      await expectTouchTargetAtLeast44(target);
    }
  });
});
