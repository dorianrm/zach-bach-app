import { expect, test, type Page } from '@playwright/test';
import { bingoAwards, claimBingoPlace, giveFullLine, resetBingo, resetCrawl, resetPins } from './db';
import { ADMIN_PIN } from './env';
import { enter, join, joinAsOrganizer, secondPhone, submitAction } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetPins();
  await resetCrawl();
  await resetBingo();
  await enter(page);
});

const card = (page: Page) => page.getByRole('list', { name: 'Your bingo card' });
const tiles = (page: Page) => card(page).getByRole('button');

// Waits for the server action's answer, so a reload cannot abort it mid-flight.
async function tapTile(page: Page, index: number) {
  const done = page.waitForResponse((r) => r.request().method() === 'POST');
  await tiles(page).nth(index).click();
  await done;
}

test('the bingo tab asks a visitor to join first', async ({ page }) => {
  await page.goto('/bingo');
  await expect(page).toHaveURL('/join?next=%2Fbingo');
});

test('a card has 24 tiles and a marked free center', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.getByRole('link', { name: 'Bingo' }).click();
  await expect(tiles(page)).toHaveCount(24);
  await expect(card(page).getByText('Free', { exact: true })).toBeVisible();
  await expect(card(page).getByRole('button', { pressed: true })).toHaveCount(0);
});

test('two guests get different layouts, and a reload keeps the same one', async ({ page, browser }, testInfo) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/bingo');
  const alex = await tiles(page).allTextContents();

  const other = await secondPhone(browser, testInfo);
  await join(other, 'Benjamin Burton', '1234', { setup: true });
  await other.goto('/bingo');
  const ben = await tiles(other).allTextContents();

  expect(ben).toHaveLength(24);
  expect(ben).not.toEqual(alex);
  expect([...ben].sort()).toEqual([...alex].sort());

  await page.reload();
  expect(await tiles(page).allTextContents()).toEqual(alex);
  await other.context().close();
});

test('marks survive a reload and a second browser, and a second tap undoes', async ({ page, browser }, testInfo) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/bingo');
  await tapTile(page, 0);
  await tapTile(page, 5);
  await tapTile(page, 23);
  await expect(tiles(page).nth(0)).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(card(page).getByRole('button', { pressed: true })).toHaveCount(3);
  for (const i of [0, 5, 23]) await expect(tiles(page).nth(i)).toHaveAttribute('aria-pressed', 'true');

  // Same guest on a second phone sees the same marks.
  const other = await secondPhone(browser, testInfo);
  await join(other, 'Alex Weirth', '1234');
  await other.goto('/bingo');
  expect(await tiles(other).allTextContents()).toEqual(await tiles(page).allTextContents());
  for (const i of [0, 5, 23]) await expect(tiles(other).nth(i)).toHaveAttribute('aria-pressed', 'true');

  // Unmark on the second phone, then the first phone sees it after a reload.
  await tapTile(other, 5);
  await expect(tiles(other).nth(5)).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(tiles(page).nth(5)).toHaveAttribute('aria-pressed', 'false');
  await expect(card(page).getByRole('button', { pressed: true })).toHaveCount(2);
  await other.context().close();
});

test('quick taps in a row all save', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/bingo');
  let answered = 0;
  page.on('response', (r) => {
    if (r.request().method() === 'POST') answered++;
  });
  // No waiting between taps: the server answers one at a time, after the screen changed.
  for (const i of [1, 2, 3, 4, 6]) await tiles(page).nth(i).click();
  await expect(card(page).getByRole('button', { pressed: true })).toHaveCount(5);
  // Let every answer arrive, then check what the server kept.
  await expect.poll(() => answered).toBe(5);
  await expect(card(page).getByRole('button', { pressed: true })).toHaveCount(5);
  await page.reload();
  await expect(card(page).getByRole('button', { pressed: true })).toHaveCount(5);
});

test('Zach gets no card', async ({ page }) => {
  await join(page, 'Zach Luis', '1234', { setup: true });
  await page.goto('/bingo');
  await expect(page.getByText('Winners show here.')).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

test('the tab bar never hides the last row of tiles', async ({ page }, testInfo) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/bingo');
  await tapTile(page, 0);
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-bingo.png` });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = await tiles(page).nth(23).boundingBox();
  const tabBar = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
  expect(last!.y + last!.height).toBeLessThanOrEqual(tabBar!.y);
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-bingo-bottom.png` });
});

// The middle row: positions 10, 11, 13, 14 around the free center. Buttons skip the
// center, so they are buttons 10 to 13.
async function finishMiddleRow(page: Page) {
  for (const i of [10, 11, 12, 13]) await tapTile(page, i);
}

test('three guests win in order, every phone shows the winners, and teams get a head start', async ({ page, browser }, testInfo) => {
  test.setTimeout(90_000);
  // Zach watches. He has no card, only the banner.
  const zach = page;
  await join(zach, 'Zach Luis', '1234', { setup: true });
  await zach.goto('/bingo');
  await expect(zach.getByRole('list', { name: 'Bingo winners' })).toHaveCount(0);

  const players: Page[] = [];
  for (const name of ['Alex Weirth', 'Benjamin Burton', 'Chris Acosta']) {
    const phone = await secondPhone(browser, testInfo);
    await join(phone, name, '1234', { setup: true });
    await phone.goto('/bingo');
    players.push(phone);
  }
  const [alex, ben, chris] = players;

  // Three taps is not a line yet.
  for (const i of [10, 11, 12]) await tapTile(alex, i);
  await expect(alex.getByText(/^Bingo!/)).toHaveCount(0);
  await tapTile(alex, 13);
  await expect(alex.getByText('Bingo! You got 1st.')).toBeVisible();
  await finishMiddleRow(ben);
  await expect(ben.getByText('Bingo! You got 2nd.')).toBeVisible();
  await finishMiddleRow(chris);
  await expect(chris.getByText('Bingo! You got 3rd.')).toBeVisible();

  // Every phone, none reloaded, shows all three within ~5 s.
  for (const phone of [zach, alex, ben, chris]) {
    await expect(phone.getByRole('list', { name: 'Bingo winners' }).getByRole('listitem')).toHaveText(
      ['1st: Alex Weirth', '2nd: Benjamin Burton', '3rd: Chris Acosta'],
      { timeout: 8_000 },
    );
  }
  await alex.screenshot({ path: `test-results/screens/${testInfo.project.name}-bingo-win.png` });

  // A 4th line gets no place and no points.
  const dorian = await secondPhone(browser, testInfo);
  await joinAsOrganizer(dorian, ADMIN_PIN);
  await dorian.goto('/bingo');
  await finishMiddleRow(dorian);
  await expect(dorian.getByText('Bingo! The three places were already taken.')).toBeVisible();

  expect(await bingoAwards()).toEqual([
    { team_id: 'red', points: 3, note: 'Bingo 1st: Alex Weirth' },
    { team_id: 'gray', points: 2, note: 'Bingo 2nd: Benjamin Burton' },
    { team_id: 'gray', points: 1, note: 'Bingo 3rd: Chris Acosta' },
  ]);
  // The head start stays hidden until the reveal.
  const state = await alex.request.get('/api/state');
  expect(await state.json()).toMatchObject({ teamsRevealed: false });

  for (const phone of [...players, dorian]) await phone.context().close();
});

test('the head start shows on the scoreboard after the reveal', async ({ page }) => {
  await giveFullLine('Alex Weirth');
  await giveFullLine('Benjamin Burton');
  expect(await claimBingoPlace('Alex Weirth')).toBe(1);
  expect(await claimBingoPlace('Benjamin Burton')).toBe(2);

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/crawl');
  await expect(page.getByText('Teams revealed soon.')).toBeVisible();
  await page.goto('/admin/crawl');
  await page.getByText('Reveal teams').click();
  await submitAction(page, 'Yes, reveal to everyone');
  await page.goto('/crawl');
  await expect(page.getByRole('listitem', { name: /Red Squad: 3 points, your squad/ })).toBeVisible();
  await expect(page.getByRole('listitem', { name: /Gray Squad: 2 points$/ })).toBeVisible();
});

test('unmarking after a win keeps the place', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/bingo');
  await finishMiddleRow(page);
  await expect(page.getByText('Bingo! You got 1st.')).toBeVisible();
  await tapTile(page, 10);
  await page.reload();
  await expect(page.getByText('Bingo! You got 1st.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Bingo winners' }).getByRole('listitem')).toHaveText(['1st: Alex Weirth']);

  // Finishing the line again does not claim a second place or a second award.
  await tapTile(page, 10);
  expect(await bingoAwards()).toHaveLength(1);
});

test('5 claims at the same moment give exactly 1st, 2nd and 3rd', async () => {
  const names = ['Dorian Raboy', 'Alex Weirth', 'Benjamin Burton', 'Chris Acosta', 'Zach Luis'];
  for (const name of names) await giveFullLine(name);
  const places = await Promise.all(names.map((name) => claimBingoPlace(name)));
  expect(places.filter((p) => p !== null).sort()).toEqual([1, 2, 3]);
  expect(places.filter((p) => p === null)).toHaveLength(2);
  // One row per winner with a team, with that winner's points. Zach has no team.
  const teams: Record<string, string | null> = { 'Dorian Raboy': 'red', 'Alex Weirth': 'red', 'Benjamin Burton': 'gray', 'Chris Acosta': 'gray', 'Zach Luis': null };
  const expected = names.flatMap((name, i) => {
    const place = places[i];
    const team_id = teams[name];
    if (!place || !team_id) return [];
    return [{ team_id, points: 4 - place, note: `Bingo ${['1st', '2nd', '3rd'][place - 1]}: ${name}` }];
  });
  expect(await bingoAwards()).toEqual(expected.sort((a, b) => b.points - a.points));
});

test('a guest with no team gets a place but no award row', async () => {
  await giveFullLine('Zach Luis');
  expect(await claimBingoPlace('Zach Luis')).toBe(1);
  expect(await bingoAwards()).toEqual([]);
});
