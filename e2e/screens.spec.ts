import { expect, test } from '@playwright/test';
import { resetPins } from './db';
import { enter } from './helpers';

// Phone-screen screenshots for a visual check: test-results/screens/
// Viewport shots, not full-page: full-page capture misplaces the fixed tab bar.
// Each shot waits for streamed content, so it never captures a "Loading…" state.
test('phone screenshots', async ({ page }, testInfo) => {
  await resetPins();
  await enter(page);
  const shot = (name: string) => page.screenshot({ path: `test-results/screens/${testInfo.project.name}-${name}.png` });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Friday, Dec 18' })).toBeVisible();
  await shot('plan');

  await page.goto('/join');
  await expect(page.getByRole('button', { name: 'Alex', exact: true })).toBeVisible();
  await shot('join');

  await page.getByRole('button', { name: 'Alex', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Set PIN' })).toBeVisible();
  await shot('join-setup');
  // The guest must reach Set PIN without scrolling: it has to end above the fixed tab bar.
  const button = await page.getByRole('button', { name: 'Set PIN' }).boundingBox();
  const tabBar = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(tabBar!.y);

  await page.goto('/more');
  await expect(page.getByText('Not signed in yet.')).toBeVisible();
  await shot('more');
});
