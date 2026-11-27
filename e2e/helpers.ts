import { expect, type Browser, type Page, type TestInfo } from '@playwright/test';
import { BASE_URL, DEVICES, EVENT_CODE } from './env';

// Tap the group-chat link.
export async function enter(page: Page, path = '/') {
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}c=${EVENT_CODE}`);
}

// Pick a name on /join and set or enter a PIN.
// Waits for the server action's answer, so the next step cannot abort it mid-flight.
export async function join(page: Page, name: string, pin: string, opts: { setup?: boolean; confirm?: string } = {}) {
  await page.goto('/join');
  await page.getByRole('button', { name, exact: true }).click();
  if (opts.setup) {
    await page.getByLabel('New 4-digit PIN').fill(pin);
    await page.getByLabel('Type it again').fill(opts.confirm ?? pin);
  } else {
    await page.getByLabel('Your PIN').fill(pin);
  }
  await submitAction(page, opts.setup ? 'Set PIN' : 'Join');
}

// The organizer uses the same form as any guest, with the 6-digit admin PIN.
export async function joinAsOrganizer(page: Page, pin: string) {
  await join(page, 'Organizer', pin);
}

// Clicks a form button and waits for the server action's POST to finish.
export async function submitAction(page: Page, button: string) {
  const done = page.waitForResponse((r) => r.request().method() === 'POST');
  await page.getByRole('button', { name: button }).click();
  await done;
}

export async function expectSignedInAs(page: Page, name: string | null) {
  await page.goto('/more');
  await expect(page.getByText(name ? `Signed in as ${name}.` : 'Not signed in yet.')).toBeVisible();
}

// A second phone: same device type, separate cookies.
export async function secondPhone(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const device = DEVICES[testInfo.project.name as keyof typeof DEVICES];
  const context = await browser.newContext({ ...device, baseURL: BASE_URL });
  const page = await context.newPage();
  await enter(page);
  return page;
}
