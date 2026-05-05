import { expect, test } from '@playwright/test';

test.describe('Sprint G.6 mini-sprint K2 — Korean community landing (/ko/community)', () => {
  test('/ko/community renders Hero (H1 + CTA primary), 4 Features, 6 FAQ accordions', async ({
    page,
  }) => {
    const response = await page.goto('/ko/community', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');

    await expect(
      page.getByRole('heading', { level: 1, name: '빌드, 계산하지 말고 비교하세요' }),
    ).toBeVisible();

    await expect(page.getByTestId('cta-primary')).toBeVisible();
    await expect(page.getByTestId('cta-primary')).toHaveText('지금 최적화 시작');
    await expect(page.getByTestId('cta-secondary')).toHaveText('데모 보기');

    const features = page.getByTestId('features-grid').locator('> li');
    await expect(features).toHaveCount(4);
    await expect(features.nth(0)).toContainText('파레토 프론티어');
    await expect(features.nth(1)).toContainText('덱 비교');
    await expect(features.nth(2)).toContainText('빌드 공유');
    await expect(features.nth(3)).toContainText('한국어 UI');

    const faqItems = page.getByTestId('faq-item');
    await expect(faqItems).toHaveCount(6);
    await expect(faqItems.nth(0)).toContainText('파레토 프론티어가 뭔가요?');
    await expect(faqItems.nth(5)).toContainText('모바일에서도 쓸 수 있나요?');

    const body = await page.locator('body').textContent();
    expect(body).toContain('탕탕특공대');
  });

  test('/ko/community — mobile viewport 375px renders Hero + 4 Features + 6 FAQ toggle + CTA min-h 44px', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-mobile-375',
      'Sprint G.6 A T4: mobile-only viewport responsiveness check',
    );

    await page.goto('/ko/community', { waitUntil: 'domcontentloaded' });

    // Hero H1 visible at 375px
    await expect(
      page.getByRole('heading', { level: 1, name: '빌드, 계산하지 말고 비교하세요' }),
    ).toBeVisible();

    // Features grid: 4 items render at mobile (stacked or 2-col)
    const features = page.getByTestId('features-grid').locator('> li');
    await expect(features).toHaveCount(4);
    const firstFeatureBox = await features.nth(0).boundingBox();
    if (!firstFeatureBox) throw new Error('feature boundingBox missing');
    expect(firstFeatureBox.width).toBeLessThanOrEqual(375);

    // FAQ 6 accordions: first click toggles open
    const faqItems = page.getByTestId('faq-item');
    await expect(faqItems).toHaveCount(6);
    const firstFaqSummary = faqItems.nth(0).locator('summary');
    await firstFaqSummary.click();
    const firstFaqOpen = await faqItems.nth(0).evaluate(
      (el) => (el as HTMLDetailsElement).open,
    );
    expect(firstFaqOpen).toBe(true);

    // CTA primary: visible + min-h ≥ 44px (touch target)
    const ctaPrimary = page.getByTestId('cta-primary');
    await expect(ctaPrimary).toBeVisible();
    await expect(ctaPrimary).toHaveText('지금 최적화 시작');
    const ctaBox = await ctaPrimary.boundingBox();
    if (!ctaBox) throw new Error('cta-primary boundingBox missing');
    expect(ctaBox.height).toBeGreaterThanOrEqual(44);

    // No horizontal overflow at 375px viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});
