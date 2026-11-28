import { expect, test, type Page } from '@playwright/test';
import { resetBingo, resetPins } from './db';
import { enter, join, secondPhone } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetPins();
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
