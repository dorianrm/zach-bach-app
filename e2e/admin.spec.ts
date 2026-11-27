import { expect, test, type Page } from '@playwright/test';
import { pinFingerprint } from '../lib/pin';
import { signSession, SESSION_COOKIE } from '../lib/session';
import { guestId, resetPins } from './db';
import { ADMIN_PIN, ADMIN_PIN_HASH, SESSION_SECRET } from './env';
import { enter, expectSignedInAs, join, joinAsOrganizer, secondPhone, submitAction } from './helpers';

async function signInAsOrganizer(page: Page) {
  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/admin');
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

test('the organizer signs in with the admin PIN, which also unlocks admin', async ({ page }) => {
  // Nothing on /join marks the organizer: same label, same message as any guest.
  await page.goto('/join');
  await page.getByRole('button', { name: 'Organizer', exact: true }).click();
  await expect(page.getByLabel('Your PIN')).toBeVisible();
  await expect(page.getByText('Pick a PIN for your profile.')).toHaveCount(0);
  await joinAsOrganizer(page, '000000');
  await expect(page.getByText('Wrong PIN.')).toBeVisible();

  await signInAsOrganizer(page);
  await page.goto('/more');
  await expect(page.getByText('Signed in as Organizer.')).toBeVisible();
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Guest PINs' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Alex' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Organizer' })).toHaveCount(0);
});

test('10 wrong tries at /join lock the organizer, but not the re-prompt on their own phone', async ({
  page,
  browser,
}, testInfo) => {
  // The organizer's phone: signed in, but the 12-hour admin window has passed.
  const expired = await signSession(
    {
      guestId: await guestId('Organizer'),
      pinVersion: pinFingerprint(ADMIN_PIN_HASH),
      adminUntil: Math.floor(Date.now() / 1000) - 60,
    },
    Buffer.from(SESSION_SECRET, 'base64'),
  );
  await page.context().addCookies([{ name: SESSION_COOKIE, value: expired, url: page.url() }]);
  await expectSignedInAs(page, 'Organizer');

  // A troll on another phone.
  const troll = await secondPhone(browser, testInfo);
  for (let i = 1; i <= 9; i++) {
    await joinAsOrganizer(troll, '000000');
    await expect(troll.getByText('Wrong PIN.')).toBeVisible();
  }
  await joinAsOrganizer(troll, '000000');
  await expect(troll.getByText(/Too many wrong tries/)).toBeVisible();
  await joinAsOrganizer(troll, ADMIN_PIN);
  await expect(troll.getByText(/Too many wrong tries/)).toBeVisible();
  await troll.context().close();

  await page.goto('/admin');
  await page.getByLabel('Admin PIN').fill(ADMIN_PIN);
  await submitAction(page, 'Unlock admin');
  await expect(page.getByText('Admin is unlocked on this device for 12 hours.')).toBeVisible();
});

test('the organizer views a guest PIN', async ({ page, browser }, testInfo) => {
  const phone2 = await secondPhone(browser, testInfo);
  await join(phone2, 'Blair', '2468', { setup: true });
  await phone2.context().close();

  await signInAsOrganizer(page);
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

  await signInAsOrganizer(page);
  await page.goto('/admin/pins');
  const casey = page.getByRole('listitem').filter({ hasText: 'Casey' });
  await casey.getByRole('button', { name: 'Reset' }).click();
  await expect(casey.getByText('No PIN yet')).toBeVisible();

  await expectSignedInAs(phone2, null);
  await phone2.context().close();
});
