import { expect, test } from '@playwright/test';
import { BASE_URL } from './env';
import { enter } from './helpers';

test.describe('event code gate', () => {
  test('no cookie shows the gate on every page', async ({ page }) => {
    // Content, not status: Vercel answers 403, but local `next start` answers 200 for a
    // rewrite to a static page. Either way the visitor sees only the gate.
    for (const path of ['/', '/join', '/admin', '/more']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Ask Dorian for the link' }), path).toBeVisible();
    }
  });

  test('a wrong code shows the gate', async ({ page }) => {
    await page.goto('/?c=wrong-code');
    await expect(page.getByRole('heading', { name: 'Ask Dorian for the link' })).toBeVisible();
  });

  test('a forged event cookie shows the gate', async ({ page, context }) => {
    await context.addCookies([{ name: 'event', value: 'eyJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJldmVudCJ9.AAAA', url: BASE_URL }]);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Ask Dorian for the link' })).toBeVisible();
  });

  test('the link opens the plan and removes the code from the URL', async ({ page }) => {
    await enter(page);
    await expect(page).toHaveURL((url) => !url.searchParams.has('c'));
    await expect(page.getByRole('heading', { name: 'Friday, Dec 18' })).toBeVisible();
  });

  test('the cookie keeps working on the next visit', async ({ page }) => {
    await enter(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Saturday, Dec 19' })).toBeVisible();
  });

  test('health check and link-preview image stay public', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(await health.json()).toEqual({ ok: true });
    const image = await request.get('/opengraph-image');
    expect(image.headers()['content-type']).toBe('image/png');
  });

  test('the calendar file needs the cookie', async ({ page, request }) => {
    const without = await request.get('/api/calendar.ics');
    expect(without.headers()['content-type']).toContain('text/html');

    await enter(page);
    const ics = await page.request.get('/api/calendar.ics');
    expect(ics.headers()['content-type']).toBe('text/calendar; charset=utf-8');
    const body = await ics.text();
    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(body).toContain('SUMMARY:Dinner at Fogo de Chao');
  });
});
