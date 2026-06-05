import { expect, test } from '@playwright/test';

test('renders the Explorer workbench shell', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(`console error: ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    browserErrors.push(`page error: ${error.message}`);
  });

  await page.goto('/explorer/');

  await expect(page.getByRole('main', { name: 'BehavioML Explorer workbench' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Workbench activity bar' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Explorer panel' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Workspace tabs and content' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Inspector panel' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Diagnostics panel' })).toBeVisible();

  await expect(page.getByText('BehavioML Explorer')).toBeVisible();
  await expect(page.getByRole('button', { name: /Explorer/i })).toBeVisible();
  await expect(page.getByText('Load archive')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Load a BehavioML workspace' })).toBeVisible();
  await expect(page.getByText('Diagnostics will appear here after validation completes.')).toBeVisible();

  await page.screenshot({ fullPage: true, path: testInfo.outputPath('explorer-empty-workbench.png') });

  expect(browserErrors).toEqual([]);
});
