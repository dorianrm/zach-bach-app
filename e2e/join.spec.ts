import { expect, test } from '@playwright/test';
import { resetPins } from './db';
import { enter, expectSignedInAs, join, secondPhone, submitAction } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetPins();
  await enter(page);
});

test('first visit sets a PIN, and a mismatch is caught', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true, confirm: '4321' });
  await expect(page.getByText('The two PINs do not match.')).toBeVisible();

  await join(page, 'Alex Weirth', '1234', { setup: true });
  await expect(page).toHaveURL('/');
  await expectSignedInAs(page, 'Alex Weirth');
});

test('the setup screen shows the simple copy', async ({ page }) => {
  await page.goto('/join');
  await page.getByRole('button', { name: 'Alex Weirth', exact: true }).click();
  await expect(page.getByText('Pick a PIN for your profile.')).toBeVisible();
});

test('a second phone signs in with the same PIN', async ({ page, browser }, testInfo) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await expectSignedInAs(page, 'Alex Weirth');

  const phone2 = await secondPhone(browser, testInfo);
  await expectSignedInAs(phone2, null);
  await join(phone2, 'Alex Weirth', '1234');
  await expectSignedInAs(phone2, 'Alex Weirth');
  await phone2.context().close();
});

test('5 wrong PINs lock the name, even for the right PIN', async ({ page, browser }, testInfo) => {
  await join(page, 'Benjamin Burton', '2468', { setup: true });

  const phone2 = await secondPhone(browser, testInfo);
  for (let i = 1; i <= 4; i++) {
    await join(phone2, 'Benjamin Burton', '0000');
    await expect(phone2.getByText('Wrong PIN.')).toBeVisible();
  }
  await join(phone2, 'Benjamin Burton', '0000');
  await expect(phone2.getByText(/Too many wrong tries\. Try again in 10 minutes/)).toBeVisible();

  await join(phone2, 'Benjamin Burton', '2468');
  await expect(phone2.getByText(/Too many wrong tries/)).toBeVisible();
  await expectSignedInAs(phone2, null);
  await phone2.context().close();
});

test('/join?next= returns to the page that asked', async ({ page }) => {
  await page.goto('/join?next=/more');
  await page.getByRole('button', { name: 'Chris Acosta', exact: true }).click();
  await page.getByLabel('New 4-digit PIN').fill('1111');
  await page.getByLabel('Type it again').fill('1111');
  await submitAction(page, 'Set PIN');
  await expect(page).toHaveURL('/more');
});

test('next= cannot send a guest to another site', async ({ page }) => {
  await page.goto('/join?next=//evil.example');
  await page.getByRole('button', { name: 'Chris Acosta', exact: true }).click();
  await page.getByLabel('New 4-digit PIN').fill('1111');
  await page.getByLabel('Type it again').fill('1111');
  await submitAction(page, 'Set PIN');
  await expect(page).toHaveURL('/');
});

test('a signed-in phone can switch only to names that have a PIN', async ({ page, browser }, testInfo) => {
  const phone2 = await secondPhone(browser, testInfo);
  await join(phone2, 'Chris Acosta', '1111', { setup: true });
  await phone2.context().close();

  // Tab 1 opens the setup form for Benjamin Burton before the phone signs in.
  const tab1 = await page.context().newPage();
  await tab1.goto('/join');
  await tab1.getByRole('button', { name: 'Benjamin Burton', exact: true }).click();

  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/join');
  await expect(page.getByRole('button', { name: 'Chris Acosta', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Benjamin Burton', exact: true })).toHaveCount(0);

  // The server refuses too, not only the list.
  await tab1.getByLabel('New 4-digit PIN').fill('2468');
  await tab1.getByLabel('Type it again').fill('2468');
  await submitAction(tab1, 'Set PIN');
  await expect(tab1.getByText('Only a phone that is not signed in can set up a new name.')).toBeVisible();

  await join(page, 'Chris Acosta', '1111');
  await expectSignedInAs(page, 'Chris Acosta');
});
