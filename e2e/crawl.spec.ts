import { expect, test } from '@playwright/test';
import { insertAward, resetCrawl, resetPins, setTeamsRevealed } from './db';
import { ADMIN_PIN } from './env';
import { enter, join, joinAsOrganizer, secondPhone, submitAction } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetPins();
  await resetCrawl();
  await enter(page);
});

test('the crawl tab asks a visitor to join first', async ({ page }) => {
  await page.goto('/crawl');
  await expect(page).toHaveURL('/join?next=%2Fcrawl');
});

test('before the reveal, guests see no rosters, even in /api/state', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/crawl');
  await expect(page.getByText('Teams revealed soon.')).toBeVisible();

  const state = await page.request.get('/api/state');
  expect(await state.json()).toEqual({ teamsRevealed: false });
});

test('/api/state needs a joined guest', async ({ page }) => {
  const res = await page.request.get('/api/state');
  expect(res.status()).toBe(401);
});

test('a guest cannot reach crawl admin', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/admin/crawl');
  await expect(page).toHaveURL('/admin?next=%2Fadmin%2Fcrawl');
  await expect(page.getByText('This page is for the organizer only.')).toBeVisible();
});

test('Dorian reveals the teams, a guest phone shows them within ~5 s, and hiding takes them back', async ({ page, browser }, testInfo) => {
  // The guest phone stays on /crawl and is never reloaded.
  const guest = await secondPhone(browser, testInfo);
  await join(guest, 'Alex Weirth', '1234', { setup: true });
  await guest.goto('/crawl');
  await expect(guest.getByText('Teams revealed soon.')).toBeVisible();

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/more');
  // One tap from More's Organizer section.
  await page.getByRole('link', { name: 'Crawl admin' }).click();
  // Rosters show to Dorian before the reveal.
  await expect(page.getByText('Alex Weirth, Dorian Raboy')).toBeVisible();
  await page.getByText('Reveal teams').click();
  await submitAction(page, 'Yes, reveal to everyone');
  await expect(page.getByText('Teams are revealed.')).toBeVisible();

  const red = guest.getByRole('listitem', { name: /Red Squad: 0 points, your squad/ });
  await expect(red).toBeVisible({ timeout: 8_000 });
  await expect(red.getByText('Alex Weirth, Dorian Raboy')).toBeVisible();
  await expect(guest.getByRole('listitem', { name: /Gray Squad: 0 points$/ })).toBeVisible();
  await guest.screenshot({ path: `test-results/screens/${testInfo.project.name}-crawl.png` });

  // A reveal tapped too early can be hidden again.
  await page.getByText('Hide teams').click();
  await submitAction(page, 'Yes, hide from everyone');
  await expect(page.getByText('Teams are hidden.')).toBeVisible();
  await expect(guest.getByText('Teams revealed soon.')).toBeVisible({ timeout: 8_000 });
  await guest.context().close();
});

test('Dorian awards +2, a guest phone shows it within ~5 s, and undo takes it back', async ({ page, browser }, testInfo) => {
  await setTeamsRevealed(true);
  const guest = await secondPhone(browser, testInfo);
  await join(guest, 'Alex Weirth', '1234', { setup: true });
  await guest.goto('/crawl');
  await expect(guest.getByRole('listitem', { name: /Red Squad: 0 points, your squad/ })).toBeVisible();

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/admin/crawl');
  await expect(page.getByText('No awards to undo.')).toBeVisible();
  await page.getByRole('group', { name: 'Squad' }).getByText('Red Squad').click();
  await page.getByRole('group', { name: 'Points' }).getByText('+2').click();
  await page.getByLabel('Note (optional)').fill("Groom's choice");
  await submitAction(page, 'Give points');
  await expect(page.getByRole('status')).toHaveText("+2 Red Squad: Groom's choice");
  await expect(page.getByText("Last award: +2 Red Squad: Groom's choice")).toBeVisible();
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-crawl-admin.png` });

  // The guest phone is never reloaded.
  const red = guest.getByRole('listitem', { name: /Red Squad: 2 points, your squad/ });
  await expect(red).toBeVisible({ timeout: 8_000 });
  await red.getByText('Point history (1)').click();
  await expect(red.getByRole('list', { name: 'Red Squad point history' })).toContainText("Groom's choice+2");
  await guest.screenshot({ path: `test-results/screens/${testInfo.project.name}-crawl-history.png` });

  await submitAction(page, 'Undo last');
  await expect(page.getByRole('status')).toHaveText("Undid +2 Red Squad: Groom's choice");
  await expect(page.getByText('No awards to undo.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo last' })).toBeDisabled();

  await expect(guest.getByRole('listitem', { name: /Red Squad: 0 points, your squad/ })).toBeVisible({ timeout: 8_000 });
  // Undone rows leave the history too.
  await expect(guest.getByText('Point history')).toHaveCount(0);
  await guest.context().close();
});

test('undo skips bingo rows, which come from guests', async ({ page }) => {
  await setTeamsRevealed(true);
  await insertAward({ team_id: 'red', points: 1, source: 'bonus', created_at: '2026-12-19T05:00:00Z' });
  await insertAward({ team_id: 'gray', points: 3, source: 'bingo', note: 'Bingo 1st', created_at: '2026-12-19T05:10:00Z' });

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/admin/crawl');
  // The newest row is bingo, so undo offers the older bonus.
  await expect(page.getByText('Last award: +1 Red Squad: Bonus')).toBeVisible();
  await submitAction(page, 'Undo last');
  await expect(page.getByRole('status')).toHaveText('Undid +1 Red Squad: Bonus');
  await expect(page.getByText('No awards to undo.')).toBeVisible();

  const gray = page.getByRole('listitem').filter({ hasText: 'Gray Squad' }).filter({ hasText: 'Point history' });
  await expect(gray.getByText('3', { exact: true })).toBeVisible();
});

test('a mock crawl runs end to end with a guest phone watching', async ({ page, browser }, testInfo) => {
  test.setTimeout(90_000);
  await setTeamsRevealed(true);
  const guest = await secondPhone(browser, testInfo);
  await join(guest, 'Alex Weirth', '1234', { setup: true });
  await guest.goto('/crawl');
  await expect(guest.getByText('First stop revealed soon.')).toBeVisible();
  await expect(guest.getByText('Squad chant')).toBeVisible();
  // Upcoming stops never reach the browser.
  expect(JSON.stringify(await (await guest.request.get('/api/state')).json())).not.toContain('Test Stop');

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/admin/crawl');
  const toast = page.getByRole('status');

  // Reveal stop A: two taps.
  await page.getByText('Reveal next stop: Test Stop A').click();
  await submitAction(page, 'Yes, reveal the stop');
  await expect(page.getByText('Reveal next stop: Test Stop B')).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Test Stop A' })).toBeVisible({ timeout: 8_000 });
  await expect(guest.getByRole('link', { name: '1 Main St, Portland, OR' })).toHaveAttribute('href', /maps\.google\.com/);
  expect(JSON.stringify(await (await guest.request.get('/api/state')).json())).not.toContain('Test Stop B');

  // Award: pick the challenge, then tap the squad.
  await page.getByText('Photo with the bartender · +2').click();
  await submitAction(page, '+2 Red Squad');
  await expect(toast).toHaveText('+2 Red Squad: Photo with the bartender');

  // Placement: Gray 1st (+3), Red 2nd (+2). Then undo takes back both rows at once.
  await page.getByText('Darts · 3/2/1').click();
  await page.getByRole('group', { name: '1st (+3)' }).getByText('Gray Squad').click();
  await page.getByRole('group', { name: '2nd (+2)' }).getByText('Red Squad').click();
  await submitAction(page, 'Save placement');
  await expect(toast).toHaveText('Darts: 1st Gray Squad, 2nd Red Squad');
  await expect(guest.getByRole('listitem', { name: /Red Squad: 4 points, your squad/ })).toBeVisible({ timeout: 8_000 });
  await submitAction(page, 'Undo last');
  await expect(toast).toHaveText('Undid +3 Gray Squad: 1st: Darts, +2 Red Squad: 2nd: Darts');
  await expect(guest.getByRole('listitem', { name: /Red Squad: 2 points, your squad/ })).toBeVisible({ timeout: 8_000 });
  await expect(guest.getByRole('listitem', { name: /Gray Squad: 0 points$/ })).toBeVisible();

  // Stop B: stop A moves to past stops on the guest phone.
  await page.getByText('Reveal next stop: Test Stop B').click();
  await submitAction(page, 'Yes, reveal the stop');
  await expect(guest.getByRole('heading', { name: 'Test Stop B' })).toBeVisible({ timeout: 8_000 });
  await expect(guest.getByText('Past stops')).toBeVisible();
  await guest.screenshot({ path: `test-results/screens/${testInfo.project.name}-crawl-stop.png` });

  // A tie at the top blocks the final. A +1 tiebreaker clears it.
  await page.getByRole('group', { name: 'Squad' }).getByText('Gray Squad').click();
  await page.getByRole('group', { name: 'Points' }).getByText('+2').click();
  await submitAction(page, 'Give points');
  await page.getByText('Final', { exact: true }).click();
  await submitAction(page, 'Yes, end the crawl');
  await expect(toast).toContainText('Red Squad and Gray Squad are tied at 2');
  await page.getByRole('group', { name: 'Squad' }).getByText('Gray Squad').click();
  await page.getByLabel('Note (optional)').fill('Tiebreaker');
  await submitAction(page, 'Give points');
  await submitAction(page, 'Yes, end the crawl');
  await expect(page.getByText('The crawl is final. Points are locked.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Give points' })).toHaveCount(0);
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-crawl-admin-final.png` });

  await expect(guest.getByText('Final: Gray Squad wins with 3 points!')).toBeVisible({ timeout: 8_000 });
  await guest.screenshot({ path: `test-results/screens/${testInfo.project.name}-crawl-final.png` });
  await guest.context().close();
});

test('hiding the last stop takes it off guest phones', async ({ page }) => {
  await setTeamsRevealed(true);
  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/admin/crawl');
  await page.getByText('Reveal next stop: Test Stop A').click();
  await submitAction(page, 'Yes, reveal the stop');
  await page.getByText('Hide last stop: Test Stop A').click();
  await submitAction(page, 'Yes, hide the stop');
  await expect(page.getByText('Reveal next stop: Test Stop A')).toBeVisible();
  await page.goto('/crawl');
  await expect(page.getByText('First stop revealed soon.')).toBeVisible();
});
