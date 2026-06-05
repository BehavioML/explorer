import { defineConfig, devices } from '@playwright/test';
import { resolveChromiumExecutablePath } from './playwright.browser';

const chromiumExecutablePath = resolveChromiumExecutablePath();

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  globalSetup: './playwright.global-setup.ts',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    env: {
      // Build smoke artifacts for Vite preview's root server while still visiting /explorer/.
      VITE_BASE_PATH: '/',
    },
    url: 'http://127.0.0.1:4173/explorer/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
      },
    },
  ],
});
