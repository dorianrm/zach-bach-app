import { expect, test } from '@playwright/test';
import { resetPins } from './db';
import { enter, expectSignedInAs, join, secondPhone, submitAction } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetPins();
  await enter(page);
});

test('first visit sets a PIN, and a mismatch is caught', async ({ page }) => {
  await join(page, 'Alex', '1234', { setup: true, confirm: '4321' });
  await expect(page.getByText('The two PINs do not match.')).toBeVisible();

  await join(page, 'Alex', '1234', { setup: true });
  await expect(page).toHaveURL('/');
  await expectSignedInAs(page, 'Alex');
});

test('the setup screen shows the simple copy', async ({ page }) => {
  await page.goto('/join');
  await page.getByRole('button', { name: 'Alex', exact: true }).click();
  await expect(page.getByText('Pick a PIN for your profile.')).toBeVisible();
});

test('a second phone signs in with the same PIN', async ({ page, browser }, testInfo) => {
  await join(page, 'Alex', '1234', { setup: true });
  await expectSignedInAs(page, 'Alex');

  const phone2 = await secondPhone(browser, testInfo);
  await expectSignedInAs(phone2, null);
  await join(phone2, 'Alex', '1234');
  await expectSignedInAs(phone2, 'Alex');
  await phone2.context().close();
});

test('5 wrong PINs lock the name, even for the right PIN', async ({ page, browser }, testInfo) => {
  await join(page, 'Blair', '2468', { setup: true });

  const phone2 = await secondPhone(browser, testInfo);
  for (let i = 1; i <= 4; i++) {
    await join(phone2, 'Blair', '0000');
    await expect(phone2.getByText('Wrong PIN.')).toBeVisible();
  }
  await join(phone2, 'Blair', '0000');
  await expect(phone2.getByText(/Too many wrong tries\. Try again in 10 minutes/)).toBeVisible();

  await join(phone2, 'Blair', '2468');
  await expect(phone2.getByText(/Too many wrong tries/)).toBeVisible();
  await expectSignedInAs(phone2, null);
  await phone2.context().close();
});

test('/join?next= returns to the page that asked', async ({ page }) => {
  await page.goto('/join?next=/more');
  await page.getByRole('button', { name: 'Casey', exact: true }).click();
  await page.getByLabel('New 4-digit PIN').fill('1111');
  await page.getByLabel('Type it again').fill('1111');
  await submitAction(page, 'Set PIN');
  await expect(page).toHaveURL('/more');
});

test('next= cannot send a guest to another site', async ({ page }) => {
  await page.goto('/join?next=//evil.example');
  await page.getByRole('button', { name: 'Casey', exact: true }).click();
  await page.getByLabel('New 4-digit PIN').fill('1111');
  await page.getByLabel('Type it again').fill('1111');
  await submitAction(page, 'Set PIN');
  await expect(page).toHaveURL('/');
});
