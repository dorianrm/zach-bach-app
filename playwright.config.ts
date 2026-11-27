import { defineConfig } from '@playwright/test';
import { BASE_URL, DEVICES, PORT, serverEnv } from './e2e/env';

// End-to-end tests on phone-sized WebKit (Safari engine) and Chromium (Android).
// Run: npm run e2e. Uses the test Supabase project from .env.test.local, never the real one.
export default defineConfig({
  testDir: 'e2e',
  // One worker: tests share one test database.
  fullyParallel: false,
  workers: 1,
  timeout: 20_000,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  projects: Object.entries(DEVICES).map(([name, device]) => ({ name, use: { ...device } })),
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${BASE_URL}/api/health`,
    env: serverEnv(),
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
