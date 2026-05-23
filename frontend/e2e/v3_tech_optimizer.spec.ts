import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OPTIMIZER_URL = '/en/v3/optimizer/tech-parts';

function readFixture(name: string) {
  return readFileSync(resolve(process.cwd(), 'fixtures', name), 'utf8').trim();
}

test.describe('TD-11 — Tech optimizer route', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? 'http://localhost:3032'}${OPTIMIZER_URL}`);
    await expect(page.getByTestId('v3-optimizer-boot-status')).toContainText('Boot OK');
  });

  test('uses Tangtang public branding without source-specific visible copy', async ({ page }) => {
    await expect(page.getByTestId('tech-parts-optimizer')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tangtang / tech parts' })).toBeVisible();
    await expect(page.getByText(/^Pareto$/)).toHaveCount(0);
    await expect(page.getByText(/SIO/)).toHaveCount(0);
    await expect(page.getByText('SIO LM context')).toHaveCount(0);
    await expect(page.getByTestId('tech-sio-lm-context')).toHaveCount(0);
  });

  test('shows profile import without exposing raw SIO LM JSON', async ({ page }) => {
    await expect(page.getByTestId('tech-profile-import')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import profile' })).toBeVisible();
    await expect(page.getByTestId('tech-profile-import-input')).toBeVisible();
    await expect(page.getByTestId('tech-profile-import')).toContainText('screenshot text');
    await expect(page.getByText('SIO LM context')).toHaveCount(0);
    await expect(page.getByTestId('tech-sio-lm-context')).toHaveCount(0);
  });

  test('imports profile wallet autofill into tech spend and account resources', async ({ page }) => {
    await page.getByTestId('tech-profile-import-input').fill(JSON.stringify({
      wallet: {
        techResonanceChips: 88,
        relicArtifactCores: 6,
        survivorAwakeningCores: 3,
        otherworldForgeCores: 11,
        mountCores: 5,
      },
    }));
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-wallet-tech-resonance-chips')).toHaveValue('88');
    await expect(page.getByTestId('tech-inventory-chips')).toHaveValue('88');
    await expect(page.getByTestId('tech-wallet-relic-artifact-cores')).toHaveValue('6');
    await expect(page.getByTestId('tech-wallet-survivor-awakening-cores')).toHaveValue('3');
    await expect(page.getByTestId('tech-wallet-otherworld-forge-cores')).toHaveValue('11');
    await expect(page.getByTestId('tech-wallet-mount-cores')).toHaveValue('5');
  });

  test('imports profile account autofill into tech and account context fields', async ({ page }) => {
    await page.getByTestId('tech-profile-import-input').fill(JSON.stringify({
      tech: {
        skillSlots: 5,
        rarityCounts: { Legend: 2, Epic: 8 },
      },
      account: {
        collectionSets: 31,
        survivorLevel: 111,
        petAwakening: 4,
        mountAtk: 17,
        weaponEaf: 5,
        lmeTurf: 19,
      },
    }));
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-inventory-skill-slots')).toHaveValue('5');
    await expect(page.getByTestId('tech-account-collection-sets')).toHaveValue('31');
    await expect(page.getByTestId('tech-account-survivor-level')).toHaveValue('111');
    await expect(page.getByTestId('tech-account-pet-awakening')).toHaveValue('4');
    await expect(page.getByTestId('tech-account-mount-atk')).toHaveValue('17');
    await expect(page.getByTestId('tech-account-weapon-eaf')).toHaveValue('5');
    await expect(page.getByTestId('tech-account-lme-turf')).toHaveValue('19');
  });

  test('shows product import summary and concise error copy', async ({ page }) => {
    await page.getByTestId('tech-profile-import-input').fill(JSON.stringify({
      wallet: { techResonanceChips: 91 },
      account: { baseAtk: 7300, finalAtk: 126000 },
      sioLm: { hidden: true },
    }));
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Imported wallet');
    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Imported account context');
    await expect(page.getByTestId('tech-profile-import-summary')).not.toContainText('sioLm');

    await page.getByTestId('tech-profile-import-input').fill('{not json');
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Profile import failed');
    await expect(page.getByTestId('tech-profile-import-summary')).not.toContainText(/SyntaxError|JSON\.parse|at /);
  });

  test('imports an external calculation raw link and keeps fields editable', async ({ page }) => {
    const raw = readFixture('external-calculation-links/4ZgaBw.raw.txt');
    await page.getByTestId('tech-profile-import-input').fill(`https://sio-tools.vercel.app?raw=${raw}`);
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Imported calculation link');
    await expect(page.getByTestId('tech-profile-import-coverage')).toContainText('Build stats');
    await expect(page.getByTestId('tech-inventory-chips')).not.toHaveValue('40');

    await page.getByTestId('tech-inventory-chips').fill('12');
    await expect(page.getByTestId('tech-inventory-chips')).toHaveValue('12');
    await expect(page.getByText(/SIO/)).toHaveCount(0);
    await expect(page.getByText(/sioLm|sio_full_lm_equivalence/)).toHaveCount(0);
  });

  test('imports a mocked short calculation code without live network', async ({ page }) => {
    const raw = readFixture('external-calculation-links/4ZgaBw.raw.txt');
    await page.route('https://is.gd/forward.php**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ url: `https://sio-tools.vercel.app?raw=${raw}` }),
      });
    });

    await page.getByTestId('tech-profile-import-input').fill('https://sio-tools.vercel.app?code=4ZgaBw');
    await page.getByRole('button', { name: 'Import profile' }).click();
    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Imported calculation link');
  });

  test('imports in-game screenshot text as editable account defaults', async ({ page }) => {
    await page.getByTestId('tech-profile-import-input').fill(`
특공대 속성
기본 공격력 126424
공격력 보너스 126%
최후의 공격 550220
치명타 확률 147%
치명타 피해량 822%
스킬 피해 477%
보호막 데미지 증가 165%
중독 대상 데미지 증가 45%
약화 대상 데미지 증가 195%
빙결 대상 데미지 증가 257.5%
열상 대상 데미지 증가 85%
이동 속도 13
이동 속도 상한 16
펫 공격력 355274
이세계 펫 동조율 42.5%
코어 보유량
이세계 코어 2 / 0
신기 핵심 74 / 67
공진 칩 21 / 0
특공대 각성 코어 26 / 0
`);
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Imported screenshot text');
    await expect(page.getByTestId('tech-profile-import-review')).toContainText('Imported 2');
    await expect(page.getByTestId('tech-profile-import-review')).toContainText('Review 1');
    await expect(page.getByTestId('tech-profile-import-review')).toContainText('Editable after import');
    await expect(page.getByTestId('tech-profile-import-field-review')).toContainText('Final ATK');
    await expect(page.getByTestId('tech-profile-import-field-review')).toContainText('550220');
    await expect(page.getByTestId('tech-profile-import-field-review')).toContainText('Shield damage');
    await expect(page.getByTestId('tech-profile-import-field-review')).toContainText('165');
    await expect(page.getByTestId('tech-profile-import-field-review')).toContainText('Otherworld pet sync');
    await expect(page.getByTestId('tech-profile-import-field-review')).toContainText('42.5');
    await expect(page.getByTestId('tech-account-summary')).toContainText('Final ATK');
    await expect(page.getByTestId('tech-account-summary')).toContainText('550,220');
    await expect(page.getByTestId('tech-account-summary')).toContainText('Crit');
    await expect(page.getByTestId('tech-account-summary')).toContainText('147 / 822');
    await expect(page.getByTestId('tech-account-summary')).toContainText('Conditions');
    await expect(page.getByTestId('tech-account-summary')).toContainText('5');
    await expect(page.getByTestId('tech-account-summary')).toContainText('Review');
    await expect(page.getByTestId('tech-account-summary')).toContainText('3');
    await expect(page.getByTestId('tech-account-base-atk')).toHaveValue('126424');
    await expect(page.getByTestId('tech-account-final-atk')).toHaveValue('550220');
    await expect(page.getByTestId('tech-account-atk-percent')).toHaveValue('126');
    await expect(page.getByTestId('tech-account-crit-rate')).toHaveValue('147');
    await expect(page.getByTestId('tech-account-crit-damage')).toHaveValue('822');
    await expect(page.getByTestId('tech-account-skill-damage')).toHaveValue('477');
    await expect(page.getByTestId('tech-account-shield-damage')).toHaveValue('165');
    await expect(page.getByTestId('tech-account-poisoned-damage')).toHaveValue('45');
    await expect(page.getByTestId('tech-account-weakened-damage')).toHaveValue('195');
    await expect(page.getByTestId('tech-account-chilled-damage')).toHaveValue('257.5');
    await expect(page.getByTestId('tech-account-laceration-damage')).toHaveValue('85');
    await expect(page.getByTestId('tech-account-movement-speed')).toHaveValue('13');
    await expect(page.getByTestId('tech-account-movement-speed-cap')).toHaveValue('16');
    await expect(page.getByTestId('tech-account-pet-atk')).toHaveValue('355274');
    await expect(page.getByTestId('tech-account-otherworld-pet-sync-rate')).toHaveValue('42.5');
    await expect(page.getByTestId('tech-inventory-chips')).toHaveValue('21');
    await expect(page.getByTestId('tech-wallet-relic-artifact-cores')).toHaveValue('74');
    await expect(page.getByTestId('tech-wallet-survivor-awakening-cores')).toHaveValue('26');
    await expect(page.getByTestId('tech-wallet-otherworld-forge-cores')).toHaveValue('2');

    await page.getByTestId('tech-account-final-atk').fill('550221');
    await expect(page.getByTestId('tech-account-final-atk')).toHaveValue('550221');
    await page.getByTestId('tech-account-chilled-damage').fill('258');
    await expect(page.getByTestId('tech-account-chilled-damage')).toHaveValue('258');
    await page.getByRole('button', { name: 'Clear import' }).click();
    await expect(page.getByTestId('tech-profile-import-input')).toHaveValue('');
    await expect(page.getByTestId('tech-profile-import-field-review')).toHaveCount(0);
    await expect(page.getByTestId('tech-account-final-atk')).toHaveValue('550221');
    await expect(page.getByText(/SIO/)).toHaveCount(0);
  });

  test('recalculates imported profile quickly and recommends next upgrades', async ({ page }) => {
    const raw = readFixture('external-calculation-links/4ZgaBw.raw.txt');
    await page.getByTestId('tech-profile-import-input').fill(`https://sio-tools.vercel.app?raw=${raw}`);
    await page.getByRole('button', { name: 'Import profile' }).click();
    await page.getByRole('button', { name: 'Run imported profile' }).click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-upgrade-recommendations')).toContainText('Next upgrades');
    await expect(page.getByTestId('tech-upgrade-recommendations')).toContainText(/Confidence: (high|medium|low)/);
    await expect(page.getByTestId('tech-upgrade-recommendations')).not.toContainText(/energyGuidanceSystem|droneMode|sio/i);

    const firstAnswerText = await page.getByTestId('tech-optimizer-first-answer').innerText();
    expect(Number.parseFloat(firstAnswerText)).toBeLessThan(3000);
  });

  test('shows concise calculation link errors without internals', async ({ page }) => {
    await page.route('https://is.gd/forward.php**', async (route) => {
      await route.fulfill({ status: 500, body: 'nope' });
    });

    await page.getByTestId('tech-profile-import-input').fill('https://sio-tools.vercel.app?code=bad123');
    await page.getByRole('button', { name: 'Import profile' }).click();
    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Profile import failed');
    await expect(page.getByTestId('tech-profile-import-summary')).not.toContainText(/stack|SyntaxError|lzma|msgpack|sio/i);
  });

  test('uses product validation copy without raw codes or stack traces', async ({ page }) => {
    await page.getByTestId('tech-inventory-chips').fill('1000');

    await expect(page.getByTestId('tech-inventory-validation')).toContainText('Tech resonance chips must be 999 or lower');
    await expect(page.getByTestId('tech-inventory-validation')).not.toContainText(/chips\.gt_999|chips\.too_high|Error:|at /);
    await expect(page.getByTestId('tech-optimizer-run')).toBeDisabled();

    await page.getByTestId('tech-profile-import-input').fill('{not json');
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Profile import failed');
    await expect(page.getByTestId('tech-profile-import-summary')).not.toContainText(/SyntaxError|JSON\.parse|at /);
  });

  test('keeps the mobile optimizer layout within the viewport', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile-375', 'mobile layout guard');

    await expect(page.getByTestId('tech-profile-import')).toBeVisible();
    await expect(page.getByTestId('tech-resource-wallet')).toBeVisible();
    await expect(page.getByTestId('tech-account-context')).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('keeps import projection stable through optimizer run', async ({ page }) => {
    await page.getByTestId('tech-profile-import-input').fill(JSON.stringify({
      state: {
        damage: {
          base_attack: 8100,
          final_attack: 130000,
        },
        tech: {
          chips_available: 66,
        },
        equipment: {
          weapon: {
            astral_forge_eaf_level: 4,
          },
        },
      },
    }));
    await page.getByRole('button', { name: 'Import profile' }).click();
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-scoring-model', 'sio_full_lm_equivalence');
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-full-sio-equivalent', 'true');
    await expect(page.getByTestId('tech-inventory-chips')).toHaveValue('66');
    await expect(page.getByTestId('tech-account-base-atk')).toHaveValue('8100');
    await expect(page.getByTestId('tech-account-final-atk')).toHaveValue('130000');
    await expect(page.getByTestId('tech-account-weapon-eaf')).toHaveValue('4');
  });

  test('imports named account selections into state-changing controls', async ({ page }) => {
    await page.getByTestId('tech-profile-import-input').fill(JSON.stringify({
      state: {
        hero: { selected_hero_id: 'king' },
        collectible: { target_collectible_id: 'atomicMech' },
        pet: {
          deployed_pet_id: 'croaky',
          assist_pet_1_id: 'gary',
          assist_pet_2_id: 'capy',
        },
        mount: { selected_mount_id: 'electricScooter' },
        equipment: {
          necklace: { item_id: 'voidwakerEmblem' },
          boots: { item_id: 'voidwakerTreads' },
        },
      },
    }));
    await page.getByRole('button', { name: 'Import profile' }).click();

    await expect(page.getByTestId('tech-survivor-select')).toHaveValue('king');
    await expect(page.getByTestId('tech-collection-target-select')).toHaveValue('atomicMech');
    await expect(page.getByTestId('tech-pet-deployed-select')).toHaveValue('croaky');
    await expect(page.getByTestId('tech-pet-assist-1-select')).toHaveValue('gary');
    await expect(page.getByTestId('tech-pet-assist-2-select')).toHaveValue('capy');
    await expect(page.getByTestId('tech-mount-select')).toHaveValue('electricScooter');
    await expect(page.getByTestId('tech-equipment-item-selector-necklace')).toHaveValue('voidwakerEmblem');
    await expect(page.getByTestId('tech-equipment-item-selector-boots')).toHaveValue('voidwakerTreads');
  });

  test('explains the top result in product terms', async ({ page }) => {
    await page.getByTestId('tech-optimizer-run').click();

    const summary = page.getByTestId('tech-optimizer-result-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Top build');
    await expect(summary).toContainText('Chips used');
    await expect(summary).toContainText('Chips left');
    await expect(summary).toContainText('Active skills');
    await expect(summary).toContainText('Energy Guidance System');
    await expect(summary).toContainText('Drone Mode');
    await expect(summary).not.toContainText(/sio_candidate_generation|sio_full_lm_equivalence|energyGuidanceSystem|droneMode/);
  });

  test('shows stable empty and error states for repeated use', async ({ page }) => {
    await expect(page.getByTestId('tech-optimizer-empty-state')).toContainText('Run the optimizer');

    await page.getByTestId('tech-inventory-skill-slots').fill('0');
    await expect(page.getByTestId('tech-optimizer-run')).toBeDisabled();
    await expect(page.getByTestId('tech-inventory-validation')).toContainText('Active skills must be at least 1');

    await page.getByTestId('tech-profile-import-input').fill('{not json');
    await page.getByRole('button', { name: 'Import profile' }).click();
    await expect(page.getByTestId('tech-profile-import-summary')).toContainText('Profile import failed');
  });

  test('runs inventory-backed WASM tech optimizer with full SIO scorer', async ({ page }) => {
    await expect(page.getByTestId('tech-inventory-contract')).toBeVisible();
    await expect(page.getByTestId('tech-inventory-validation')).toContainText('Inventory valid');
    await expect(page.getByText('SIO LM context')).toHaveCount(0);
    await expect(page.getByTestId('tech-sio-lm-context')).toHaveCount(0);
    await page.getByTestId('tech-inventory-chips').fill('40');
    await page.getByTestId('tech-inventory-skill-slots').fill('4');
    await page.getByRole('checkbox', { name: 'Overload' }).check();
    await page.getByTestId('tech-inventory-max-overload').fill('4');
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-mode-used', 'sio_candidate_generation');
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-scoring-model', 'sio_full_lm_equivalence');
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-full-sio-equivalent', 'true');
    await expect(page.getByTestId('tech-optimizer-results')).not.toContainText('sio_candidate_generation');
    await expect(page.getByTestId('tech-optimizer-results')).not.toContainText('sio_full_lm_equivalence');
    await expect(page.getByTestId('tech-optimizer-chip-used')).not.toContainText('n/a');
    await expect(page.getByTestId('tech-optimizer-chip-remainder')).not.toContainText('n/a');
    await expect(page.getByTestId('tech-optimizer-active-skills')).not.toContainText('none');
    const latencyText = await page.getByTestId('tech-optimizer-first-answer').innerText();
    const latencyMs = Number.parseFloat(latencyText);
    expect(Number.isFinite(latencyMs)).toBeTruthy();
    expect(latencyMs).toBeLessThan(3000);
  });

  test('uses SIO product vocabulary and exposes account context axes', async ({ page }) => {
    const inventory = page.getByTestId('tech-inventory-contract');
    await expect(page.getByRole('heading', { name: 'Owned tech materials' })).toBeVisible();
    await expect(inventory.getByText('Sub-parts excluding equipped main parts')).toBeVisible();
    await expect(inventory.getByText('Tech resonance chips')).toBeVisible();
    await expect(inventory.getByText('Active skills')).toBeVisible();
    await expect(inventory.getByText('Legend +4')).toBeVisible();
    await expect(inventory.getByText('Epic +3')).toBeVisible();

    await expect(page.getByText(/^Legend4$/)).toHaveCount(0);
    await expect(page.getByText(/^Epic3$/)).toHaveCount(0);
    await expect(page.getByText(/^Skill slots$/)).toHaveCount(0);
    await expect(page.getByText(/^Chips$/)).toHaveCount(0);
    await expect(page.getByText(/^Resonance chips$/)).toHaveCount(0);
    await expect(page.getByText(/^Forced skills$/)).toHaveCount(0);
    await expect(page.getByText(/^Preferred skills$/)).toHaveCount(0);
    await expect(page.getByText(/^Disabled skills$/)).toHaveCount(0);
    await expect(page.getByText(/^Preselect$/)).toHaveCount(0);
    await expect(page.getByText(/^Beam width$/)).toHaveCount(0);
    await expect(page.getByText(/^Exact node cap$/)).toHaveCount(0);
    await expect(page.getByText(/^Chip rem$/)).toHaveCount(0);
    await expect(page.getByText(/^Rows$/)).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Chips used' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Chips left' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Parts' })).toBeVisible();

    const accountContext = page.getByTestId('tech-account-context');
    await expect(accountContext).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account context' })).toBeVisible();
    await expect(page.getByText('Base ATK')).toBeVisible();
    await expect(accountContext.locator('span').filter({ hasText: /^Final ATK$/ })).toBeVisible();
    await expect(page.getByText('Collections')).toBeVisible();
    await expect(page.getByText('Survivors')).toBeVisible();
    await expect(page.getByText('Pet awakening')).toBeVisible();
    await expect(page.getByText('Mounts')).toBeVisible();
    await expect(page.getByText('Equipment forging')).toBeVisible();
    await expect(page.getByText('Lunar Mine')).toBeVisible();
  });

  test('shows a resource wallet and separates tech spend from account resources', async ({ page }) => {
    const wallet = page.getByTestId('tech-resource-wallet');
    await expect(wallet).toBeVisible();
    await expect(wallet.getByText('Tech resonance chips')).toBeVisible();
    await expect(wallet.getByText('Relic / artifact cores')).toBeVisible();
    await expect(wallet.getByText('Survivor awakening cores')).toBeVisible();
    await expect(wallet.getByText('Otherworld / forge cores')).toBeVisible();
    await expect(wallet.getByText('Mount cores')).toBeVisible();
    await expect(wallet.getByText('Direct tech optimizer spend')).toBeVisible();
    await expect(wallet.getByText('Account context')).toHaveCount(4);

    await page.getByTestId('tech-wallet-tech-resonance-chips').fill('55');
    await expect(page.getByTestId('tech-inventory-chips')).toHaveValue('55');
  });

  test('accepts account context inputs alongside tech inventory', async ({ page }) => {
    await page.getByTestId('tech-account-base-atk').fill('7200');
    await page.getByTestId('tech-account-final-atk').fill('125000');
    await page.getByTestId('tech-account-collection-sets').fill('38');
    await page.getByTestId('tech-account-survivor-awakening').fill('4');
    await page.getByTestId('tech-account-pet-awakening').fill('3');
    await page.getByTestId('tech-account-mount-atk').fill('12');
    await page.getByTestId('tech-account-weapon-xeno').fill('6');
    await page.getByTestId('tech-account-lme-turf').fill('18');

    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-scoring-model', 'sio_full_lm_equivalence');
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-full-sio-equivalent', 'true');
  });

  test('edits collection set, star, and custom set account context', async ({ page }) => {
    const account = page.getByTestId('tech-account-context');
    await expect(account.getByText('Collection detail')).toBeVisible();
    await expect(page.getByTestId('tech-account-collection-sets')).toBeVisible();
    await expect(page.getByTestId('tech-account-collection-stars')).toBeVisible();
    await expect(page.getByTestId('tech-account-collection-custom-sets')).toBeVisible();

    await page.getByTestId('tech-account-collection-sets').fill('32');
    await page.getByTestId('tech-account-collection-stars').fill('184');
    await page.getByTestId('tech-account-collection-custom-sets').fill('4');
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-scoring-model', 'sio_full_lm_equivalence');
  });

  test('shows a collection named editor alongside collection numeric fields', async ({ page }) => {
    await expect(page.getByTestId('tech-collection-named-editor')).toBeVisible();
    await expect(page.getByTestId('tech-collection-named-row').first()).toContainText(/Collection|Event|Set/);
    await expect(page.getByTestId('tech-account-collection-stars')).toBeVisible();
    await expect(page.getByTestId('tech-account-collection-custom-sets')).toBeVisible();
  });

  test('edits survivor level, star, awakening, teamwork, and passive context', async ({ page }) => {
    const account = page.getByTestId('tech-account-context');
    await expect(account.getByText('Survivor detail')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-level')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-star')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-awakening')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-teamwork')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-passive')).toBeVisible();

    await page.getByTestId('tech-account-survivor-level').fill('115');
    await page.getByTestId('tech-account-survivor-star').fill('6');
    await page.getByTestId('tech-account-survivor-awakening').fill('4');
    await page.getByTestId('tech-account-survivor-teamwork').fill('3');
    await page.getByTestId('tech-account-survivor-passive').fill('12');
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-full-sio-equivalent', 'true');
  });

  test('shows a survivor selector while preserving survivor detail fields', async ({ page }) => {
    await expect(page.getByTestId('tech-survivor-selector')).toBeVisible();
    await expect(page.getByTestId('tech-survivor-selector')).toContainText(/Venato|Selected survivor/);
    await expect(page.getByTestId('tech-account-survivor-level')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-star')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-awakening')).toBeVisible();
  });

  test('changes selected survivor and linked survivor controls from named inputs', async ({ page }) => {
    await page.getByTestId('tech-survivor-select').selectOption('king');
    await page.getByTestId('tech-teamwork-select').selectOption('4');
    await page.getByTestId('tech-passive-select').selectOption('18');

    await expect(page.getByTestId('tech-survivor-selected-name')).toContainText('King');
    await expect(page.getByTestId('tech-account-survivor-teamwork')).toHaveValue('4');
    await expect(page.getByTestId('tech-account-survivor-passive')).toHaveValue('18');

    await page.getByTestId('tech-optimizer-run').click();
    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-full-sio-equivalent', 'true');
  });

  test('shows teamwork and passive pickers alongside numeric survivor controls', async ({ page }) => {
    await expect(page.getByTestId('tech-teamwork-passive-picker')).toBeVisible();
    await expect(page.getByTestId('tech-teamwork-row').first()).toContainText(/Teamwork|passive/i);
    await expect(page.getByTestId('tech-passive-row').first()).toContainText(/Passive|crit/i);
    await expect(page.getByTestId('tech-account-survivor-teamwork')).toBeVisible();
    await expect(page.getByTestId('tech-account-survivor-passive')).toBeVisible();
  });

  test('shows survivor teamwork and passive choices with product meaning', async ({ page }) => {
    await expect(page.getByTestId('tech-teamwork-select')).toContainText('0 slots / none');
    await expect(page.getByTestId('tech-teamwork-select')).toContainText('4 slots / full');
    await expect(page.getByTestId('tech-passive-select')).toContainText('No passive crit');
    await expect(page.getByTestId('tech-passive-select')).toContainText('Crit +24%');

    await page.getByTestId('tech-teamwork-select').selectOption('4');
    await page.getByTestId('tech-passive-select').selectOption('24');
    await expect(page.getByTestId('tech-survivor-context-summary')).toContainText('full');
    await expect(page.getByTestId('tech-survivor-context-summary')).toContainText('Crit +24%');
  });

  test('edits pet awakening, assist pets, xeno, and resonance context', async ({ page }) => {
    const account = page.getByTestId('tech-account-context');
    await expect(account.getByText('Pet detail')).toBeVisible();
    await expect(page.getByTestId('tech-account-pet-awakening')).toBeVisible();
    await expect(page.getByTestId('tech-account-pet-assist-pets')).toBeVisible();
    await expect(page.getByTestId('tech-account-pet-xeno')).toBeVisible();
    await expect(page.getByTestId('tech-account-pet-resonance-chance')).toBeVisible();
    await expect(page.getByTestId('tech-account-pet-resonance-atk')).toBeVisible();

    await page.getByTestId('tech-account-pet-awakening').fill('4');
    await page.getByTestId('tech-account-pet-assist-pets').fill('2');
    await page.getByTestId('tech-account-pet-xeno').fill('1');
    await page.getByTestId('tech-account-pet-resonance-chance').fill('35');
    await page.getByTestId('tech-account-pet-resonance-atk').fill('2100');
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-scoring-model', 'sio_full_lm_equivalence');
  });

  test('shows deployed and assist pet named controls', async ({ page }) => {
    await expect(page.getByTestId('tech-pet-selector')).toBeVisible();
    await expect(page.getByTestId('tech-pet-selector')).toContainText(/Rex|Pet/);
    await expect(page.getByTestId('tech-pet-assist-1')).toBeVisible();
    await expect(page.getByTestId('tech-pet-assist-2')).toBeVisible();
    await expect(page.getByTestId('tech-account-pet-xeno')).toBeVisible();
    await expect(page.getByTestId('tech-account-pet-resonance-atk')).toBeVisible();
  });

  test('changes deployed and assist pets from named controls', async ({ page }) => {
    await page.getByTestId('tech-pet-deployed-select').selectOption('croaky');
    await page.getByTestId('tech-pet-assist-1-select').selectOption('gary');
    await page.getByTestId('tech-pet-assist-2-select').selectOption('capy');

    await expect(page.getByTestId('tech-pet-deployed-select')).toHaveValue('croaky');
    await expect(page.getByTestId('tech-pet-assist-1-select')).toHaveValue('gary');
    await expect(page.getByTestId('tech-pet-assist-2-select')).toHaveValue('capy');

    await page.getByTestId('tech-optimizer-run').click();
    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-scoring-model', 'sio_full_lm_equivalence');
  });

  test('keeps pet assist selections valid and explains xeno state', async ({ page }) => {
    await page.getByTestId('tech-pet-deployed-select').selectOption('croaky');

    await expect(page.getByTestId('tech-pet-assist-1-select').locator('option[value="croaky"]')).toHaveCount(0);
    await expect(page.getByTestId('tech-pet-assist-2-select').locator('option[value="croaky"]')).toHaveCount(0);

    await page.getByTestId('tech-pet-assist-1-select').selectOption('gary');
    await expect(page.getByTestId('tech-account-pet-assist-pets')).toHaveValue('1');
    await expect(page.getByTestId('tech-pet-assist-2-select').locator('option[value="gary"]')).toHaveCount(0);

    await page.getByTestId('tech-pet-assist-2-select').selectOption('capy');
    await expect(page.getByTestId('tech-account-pet-assist-pets')).toHaveValue('2');

    await page.getByTestId('tech-account-pet-xeno').fill('1');
    await expect(page.getByTestId('tech-pet-xeno-status')).toContainText('Xeno preview on');
    await page.getByTestId('tech-account-pet-resonance-chance').fill('35');
    await page.getByTestId('tech-account-pet-resonance-atk').fill('2100');
    await expect(page.getByTestId('tech-pet-xeno-status')).toContainText('Xeno resonance ready');
  });

  test('edits mount core, puzzle, and stat context', async ({ page }) => {
    const account = page.getByTestId('tech-account-context');
    await expect(account.getByText('Mount detail')).toBeVisible();
    await expect(page.getByTestId('tech-account-mount-cores')).toBeVisible();
    await expect(page.getByTestId('tech-account-mount-puzzle')).toBeVisible();
    await expect(page.getByTestId('tech-account-mount-stat')).toBeVisible();
    await expect(page.getByTestId('tech-account-mount-atk')).toBeVisible();
    await expect(page.getByTestId('tech-account-mount-skill')).toBeVisible();

    await page.getByTestId('tech-account-mount-cores').fill('9');
    await page.getByTestId('tech-account-mount-puzzle').fill('12');
    await page.getByTestId('tech-account-mount-stat').fill('18');
    await page.getByTestId('tech-account-mount-atk').fill('24');
    await page.getByTestId('tech-account-mount-skill').fill('14');
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-full-sio-equivalent', 'true');
  });

  test('shows a compact mount puzzle editor alongside mount account fields', async ({ page }) => {
    await expect(page.getByTestId('tech-mount-puzzle-editor')).toBeVisible();
    await expect(page.getByTestId('tech-mount-puzzle-row').first()).toContainText(/Puzzle|Mount/);
    await expect(page.getByTestId('tech-account-mount-cores')).toBeVisible();
    await expect(page.getByTestId('tech-account-mount-puzzle')).toBeVisible();
    await expect(page.getByTestId('tech-account-mount-stat')).toBeVisible();
  });

  test('changes selected mount from named controls', async ({ page }) => {
    await page.getByTestId('tech-mount-select').selectOption('techHoverboard');

    await expect(page.getByTestId('tech-mount-select')).toHaveValue('techHoverboard');
    await expect(page.getByTestId('tech-mount-selected-name')).toContainText('Tech Hoverboard');
    await expect(page.getByTestId('tech-account-mount-cores')).toBeVisible();
  });

  test('shows mount puzzle review depth without changing scoring semantics', async ({ page }) => {
    await page.getByTestId('tech-mount-select').selectOption('techHoverboard');
    await page.getByTestId('tech-account-mount-cores').fill('9');
    await page.getByTestId('tech-account-mount-puzzle').fill('12');
    await expect(page.getByTestId('tech-mount-review-summary')).toContainText('Puzzle slots 12');
    await expect(page.getByTestId('tech-mount-review-summary')).toContainText('Mount cores 9');
    await expect(page.getByTestId('tech-mount-puzzle-row').first()).toBeVisible();
  });

  test('edits six-slot equipment forge, chaos, xeno, and otherworld context', async ({ page }) => {
    const account = page.getByTestId('tech-account-context');
    await expect(account.getByText('Six-slot equipment')).toBeVisible();
    for (const slot of ['weapon', 'armor', 'necklace', 'belt', 'gloves', 'boots']) {
      await expect(page.getByTestId(`tech-equipment-slot-${slot}`)).toBeVisible();
    }
    await expect(page.getByTestId('tech-account-equipment-otherworld-cores')).toBeVisible();
    await expect(page.getByTestId('tech-account-weapon-eaf')).toBeVisible();
    await expect(page.getByTestId('tech-account-weapon-vaf')).toBeVisible();
    await expect(page.getByTestId('tech-account-weapon-xeno')).toBeVisible();
    await expect(page.getByTestId('tech-account-necklace-chaos')).toBeVisible();
    await expect(page.getByTestId('tech-account-armor-eaf')).toBeVisible();
    await expect(page.getByTestId('tech-account-boots-xeno')).toBeVisible();

    await page.getByTestId('tech-account-equipment-otherworld-cores').fill('18');
    await page.getByTestId('tech-account-weapon-eaf').fill('5');
    await page.getByTestId('tech-account-weapon-vaf').fill('4');
    await page.getByTestId('tech-account-weapon-xeno').fill('6');
    await page.getByTestId('tech-account-necklace-chaos').fill('3');
    await page.getByTestId('tech-account-armor-eaf').fill('2');
    await page.getByTestId('tech-account-boots-xeno').fill('1');
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-scoring-model', 'sio_full_lm_equivalence');
  });

  test('shows equipment item selectors for all six slots', async ({ page }) => {
    for (const slot of ['weapon', 'armor', 'necklace', 'belt', 'gloves', 'boots']) {
      await expect(page.getByTestId(`tech-equipment-item-selector-${slot}`)).toBeVisible();
      await expect(page.getByTestId(`tech-equipment-slot-${slot}`)).toBeVisible();
      await expect(page.getByTestId(`tech-account-${slot}-eaf`)).toBeVisible();
      await expect(page.getByTestId(`tech-account-${slot}-vaf`)).toBeVisible();
      await expect(page.getByTestId(`tech-account-${slot}-chaos`)).toBeVisible();
      await expect(page.getByTestId(`tech-account-${slot}-xeno`)).toBeVisible();
    }
  });

  test('changes equipment items from six-slot selectors', async ({ page }) => {
    await page.getByTestId('tech-equipment-item-selector-necklace').selectOption('voidwakerEmblem');
    await page.getByTestId('tech-equipment-item-selector-boots').selectOption('voidwakerTreads');

    await expect(page.getByTestId('tech-equipment-item-selector-necklace')).toHaveValue('voidwakerEmblem');
    await expect(page.getByTestId('tech-equipment-item-selector-boots')).toHaveValue('voidwakerTreads');

    await page.getByTestId('tech-optimizer-run').click();
    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-full-sio-equivalent', 'true');
  });

  test('changes collectible target from named collection controls', async ({ page }) => {
    await page.getByTestId('tech-collection-target-select').selectOption('atomicMech');

    await expect(page.getByTestId('tech-collection-target-select')).toHaveValue('atomicMech');
    await expect(page.getByTestId('tech-collection-selected-target')).toContainText('Atomic Mech');
    await expect(page.getByTestId('tech-account-collection-custom-sets')).toBeVisible();
  });

  test('shows a compact per-item collectible editor', async ({ page }) => {
    await expect(page.getByTestId('tech-collection-item-editor')).toBeVisible();
    await expect(page.getByTestId('tech-collection-item-row').first()).toBeVisible();
    await page.getByTestId('tech-collection-target-select').selectOption('atomicMech');
    await expect(page.getByTestId('tech-collection-item-editor')).toContainText('Atomic Mech');
    await expect(page.getByTestId('tech-collection-selected-target')).toContainText('Atomic Mech');
  });

  test('keeps default search usable without exposing diagnostic controls', async ({ page }) => {
    await expect(page.getByTestId('tech-optimizer-node-cap')).toHaveCount(0);
    await expect(page.getByTestId('tech-optimizer-beam-width')).toHaveCount(0);
    await page.getByTestId('tech-optimizer-run').click();

    await expect(page.getByTestId('tech-optimizer-result-row').first()).toBeVisible();
    await expect(page.getByTestId('tech-optimizer-results')).toHaveAttribute('data-mode-used', 'sio_candidate_generation');
    await expect(page.getByTestId('tech-optimizer-results')).not.toContainText('gap');
    await expect(page.getByTestId('tech-optimizer-results')).not.toContainText('full SIO equivalent');
  });

  test('sets LME turf nodes from compact presets', async ({ page }) => {
    const presets = page.getByTestId('tech-lme-turf-presets');
    await expect(presets).toBeVisible();
    await presets.getByRole('button', { name: '12 nodes' }).click();
    await expect(page.getByTestId('tech-account-lme-turf')).toHaveValue('12');
  });

  test('presents result part rows with display names instead of internal ids', async ({ page }) => {
    await page.getByTestId('tech-optimizer-run').click();

    const results = page.getByTestId('tech-optimizer-results');
    const firstPart = results.getByTestId('tech-optimizer-part-row').first();
    await expect(firstPart).toBeVisible();
    await expect(firstPart).toContainText('Energy Guidance System');
    await expect(firstPart).toContainText('Drone Mode');
    await expect(firstPart).toContainText('Chip allocation');
    await expect(firstPart).toContainText('Overload');
    await expect(results).not.toContainText(/energyGuidanceSystem|droneMode/);
  });

  test('does not block inventory when overload is disabled with a stale max overload value', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Overload' }).uncheck();

    await expect(page.getByTestId('tech-inventory-validation')).toContainText('Inventory valid');
    await expect(page.getByTestId('tech-inventory-validation')).not.toContainText('overload.max_requires_overloadable');
    await expect(page.getByTestId('tech-optimizer-run')).toBeEnabled();
  });
});
