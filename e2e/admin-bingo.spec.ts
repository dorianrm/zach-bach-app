import { expect, test } from '@playwright/test';
import { bingoAwards, bingoCardCount, claimBingoPlace, giveFullLine, resetBingo, resetCrawl, resetPins } from './db';
import { ADMIN_PIN } from './env';
import { enter, join, joinAsOrganizer, secondPhone, submitAction } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetPins();
  await resetCrawl();
  await resetBingo();
  await enter(page);
});

test('a guest cannot reach bingo admin', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/admin/bingo');
  await expect(page).toHaveURL('/admin?next=%2Fadmin%2Fbingo');
});

test('Dorian sees every player, and removing a wrong win keeps the other places', async ({ page }, testInfo) => {
  for (const name of ['Alex Weirth', 'Benjamin Burton', 'Chris Acosta']) {
    await giveFullLine(name);
    await claimBingoPlace(name);
  }

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/more');
  await page.getByRole('link', { name: 'Bingo admin' }).click();
  const players = page.getByRole('list', { name: 'Players' }).getByRole('listitem');
  // Winners first, then the rest. Zach does not play, so he is not listed.
  await expect(players).toHaveCount(4);
  await expect(players.nth(0)).toContainText('Alex Weirth1st');
  await expect(players.nth(1)).toContainText('Benjamin Burton2nd');
  await expect(players.nth(2)).toContainText('Chris Acosta3rd');
  await expect(players.nth(0)).toContainText('5 of 24 marked');
  await expect(players.nth(3)).toContainText('Dorian RaboyNo card yet');
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-admin-bingo.png` });

  await page.getByText("Remove Benjamin Burton's win").click();
  await submitAction(page, 'Yes, remove 2nd');
  // The answer shows where Dorian tapped, and the panel is gone.
  const ben = players.filter({ hasText: 'Benjamin Burton' });
  await expect(ben.getByRole('status')).toHaveText("Removed Benjamin Burton's 2nd. Points taken back, card cleared.");
  await expect(page.getByText("Remove Benjamin Burton's win")).toHaveCount(0);
  await expect(ben).toContainText('0 of 24 marked');
  await expect(ben.getByText('2nd', { exact: true })).toHaveCount(0);
  expect(await bingoAwards()).toEqual([
    { team_id: 'red', points: 3, note: 'Bingo 1st: Alex Weirth' },
    { team_id: 'gray', points: 1, note: 'Bingo 3rd: Chris Acosta' },
  ]);
  // 2nd was not the last place taken, so it stays empty. Ben can still play.
  await giveFullLine('Dorian Raboy');
  expect(await claimBingoPlace('Dorian Raboy')).toBeNull();

  // Removing the last place taken opens the places after the highest one left:
  // only 1st remains, so the next lines get 2nd, then 3rd.
  await page.reload();
  await page.getByText("Remove Chris Acosta's win").click();
  await submitAction(page, 'Yes, remove 3rd');
  expect(await claimBingoPlace('Dorian Raboy')).toBe(2);
});

test('a removed winner does not win again on the next tap', async ({ page, browser }, testInfo) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/bingo');
  for (const i of [10, 11, 12, 13]) {
    const done = page.waitForResponse((r) => r.request().method() === 'POST');
    await page.getByRole('list', { name: 'Your bingo card' }).getByRole('button').nth(i).click();
    await done;
  }
  await expect(page.getByText('Bingo! You got 1st.')).toBeVisible();

  const dorian = await secondPhone(browser, testInfo);
  await joinAsOrganizer(dorian, ADMIN_PIN);
  await dorian.goto('/admin/bingo');
  await dorian.getByText("Remove Alex Weirth's win").click();
  await submitAction(dorian, 'Yes, remove 1st');
  await dorian.context().close();

  // The card on Alex's screen is out of date. One more tap brings back the cleared card, no win.
  const done = page.waitForResponse((r) => r.request().method() === 'POST');
  await page.getByRole('list', { name: 'Your bingo card' }).getByRole('button').nth(0).click();
  await done;
  await page.reload();
  await expect(page.getByText(/^Bingo!/)).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Your bingo card' }).getByRole('button', { pressed: true })).toHaveCount(1);
  expect(await bingoAwards()).toEqual([]);
});

test('clear all bingo deletes every card and bingo point', async ({ page }) => {
  await giveFullLine('Alex Weirth');
  await claimBingoPlace('Alex Weirth');
  await giveFullLine('Chris Acosta');

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/admin/bingo');
  await page.getByText('Clear all bingo').click();
  await submitAction(page, 'Yes, clear every card');
  // The answer shows right under the button, which sits below the player list.
  await expect(page.getByRole('status').filter({ hasText: 'Cleared' })).toHaveText('Cleared 2 cards and 1 bingo award.');
  await expect(page.getByRole('status').filter({ hasText: 'Cleared' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Yes, clear every card' })).toBeHidden();
  await expect(page.getByRole('list', { name: 'Players' }).getByText('No card yet')).toHaveCount(4);
  expect(await bingoCardCount()).toBe(0);
  expect(await bingoAwards()).toEqual([]);

  // A second clear says there was nothing left.
  await page.getByText('Clear all bingo').click();
  await submitAction(page, 'Yes, clear every card');
  await expect(page.getByRole('status').filter({ hasText: 'Nothing' })).toHaveText('Nothing to clear. No one has a card yet.');
});
