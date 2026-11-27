// Test-only settings for the Playwright suite. Nothing here is used by the deployed site.
// The suite talks to a separate Supabase project, read from .env.test.local.

import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { devices } from '@playwright/test';

export const PORT = 3020;
export const BASE_URL = `http://localhost:${PORT}`;
export const EVENT_CODE = 'e2e-event-code';
export const ADMIN_PIN = '135790';

export const DEVICES = { iphone: devices['iPhone 16'], android: devices['Pixel 9'] };

// Fixture guests, loaded into the test database before each run.
export const TEAMS = [
  { id: 'red', name: 'Red Squad', color: '#ff6b5e', sort: 0 },
  { id: 'gray', name: 'Gray Squad', color: '#c3cad6', sort: 1 },
];
export const GUESTS = [
  { name: 'Organizer', team_id: 'red', is_admin: true, plays_bingo: true },
  { name: 'Alex', team_id: 'red', is_admin: false, plays_bingo: true },
  { name: 'Blair', team_id: 'gray', is_admin: false, plays_bingo: true },
  { name: 'Casey', team_id: 'gray', is_admin: false, plays_bingo: true },
  { name: 'Zach', team_id: null, is_admin: false, plays_bingo: false },
];

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

// The test database. Refuses to run against the real one, because the suite wipes guests.
export function testDb(): { url: string; key: string } {
  const test = readEnvFile('.env.test.local');
  const real = readEnvFile('.env.local');
  const url = test.SUPABASE_URL;
  const key = test.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Create .env.test.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY of the test project');
  }
  if (real.SUPABASE_URL && new URL(url).host === new URL(real.SUPABASE_URL).host) {
    throw new Error('.env.test.local points at the real database. The e2e suite only runs against the test project.');
  }
  return { url, key };
}

// Same format as lib/pin.ts hashAdminPin(), made synchronously for the config file.
// Fixed salt, so tests can sign their own session cookies for the server under test.
function hashAdminPin(pin: string): string {
  const salt = Buffer.alloc(16, 7);
  const hash = scryptSync(pin, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', 2 ** 15, 8, 1, salt.toString('base64'), hash.toString('base64')].join(':');
}

// Test-only values. A fixed session secret lets a test sign a cookie, for example an
// organizer session whose 12-hour admin window has already passed.
export const SESSION_SECRET = Buffer.alloc(32, 1).toString('base64');
export const ADMIN_PIN_HASH = hashAdminPin(ADMIN_PIN);

// Env for the server under test. Process env wins over .env.local in Next.js,
// so these values replace the real ones for this server only.
export function serverEnv(): Record<string, string> {
  const { url, key } = testDb();
  return {
    SUPABASE_URL: url,
    SUPABASE_SERVICE_ROLE_KEY: key,
    EVENT_CODE,
    SESSION_SECRET,
    PIN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    ADMIN_PIN_HASH,
    E2E_INSECURE_COOKIES: '1',
  };
}
