import { expect, test, type Page } from '@playwright/test';
import { resetPins } from './db';
import { ADMIN_PIN } from './env';
import { enter, expectSignedInAs, join, secondPhone, submitAction } from './helpers';

const ORGANIZER_PIN = '8642';

async function unlockAdmin(page: Page) {
  await join(page, 'Organizer', ORGANIZER_PIN, { setup: true });
  await page.goto('/admin');
  await page.getByLabel('Admin PIN').fill(ADMIN_PIN);
  await submitAction(page, 'Unlock admin');
  await expect(page.getByText('Admin is unlocked on this device for 12 hours.')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetPins();
  await enter(page);
});

test('a guest cannot reach admin', async ({ page }) => {
  await join(page, 'Alex', '1234', { setup: true });

  await page.goto('/more');
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  await page.goto('/admin');
  await expect(page.getByText('This page is for the organizer only.')).toBeVisible();

  await page.goto('/admin/pins');
  await expect(page).toHaveURL('/admin');
});

test('the organizer sees Admin on More, and a wrong admin PIN is refused', async ({ page }) => {
  await join(page, 'Organizer', ORGANIZER_PIN, { setup: true });
  await page.goto('/more');
  await page.getByRole('link', { name: 'Admin' }).click();

  await page.getByLabel('Admin PIN').fill('000000');
  await submitAction(page, 'Unlock admin');
  await expect(page.getByText('Wrong admin PIN.')).toBeVisible();
});

test('the organizer views a guest PIN', async ({ page, browser }, testInfo) => {
  const phone2 = await secondPhone(browser, testInfo);
  await join(phone2, 'Blair', '2468', { setup: true });
  await phone2.context().close();

  await unlockAdmin(page);
  await page.getByRole('link', { name: 'Guest PINs' }).click();
  const blair = page.getByRole('listitem').filter({ hasText: 'Blair' });
  await blair.getByText('Show PIN').click();
  await expect(blair.getByText('2468')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Casey' }).getByText('No PIN yet')).toBeVisible();
});

test('reset clears the PIN and signs the guest out on their phone', async ({ page, browser }, testInfo) => {
  const phone2 = await secondPhone(browser, testInfo);
  await join(phone2, 'Casey', '1111', { setup: true });
  await expectSignedInAs(phone2, 'Casey');

  await unlockAdmin(page);
  await page.goto('/admin/pins');
  const casey = page.getByRole('listitem').filter({ hasText: 'Casey' });
  await casey.getByRole('button', { name: 'Reset' }).click();
  await expect(casey.getByText('No PIN yet')).toBeVisible();

  await expectSignedInAs(phone2, null);
  await phone2.context().close();
});
