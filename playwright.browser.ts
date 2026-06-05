import { accessSync, constants, existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

export const chromiumExecutablePathEnvironmentVariables = [
  'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH',
  'CHROMIUM_EXECUTABLE_PATH',
] as const;

export function resolveChromiumExecutablePath(): string | undefined {
  for (const environmentVariableName of chromiumExecutablePathEnvironmentVariables) {
    const executablePath = process.env[environmentVariableName]?.trim();

    if (executablePath) {
      validateChromiumExecutablePath(executablePath, environmentVariableName);
      return executablePath;
    }
  }

  return undefined;
}

export function validateManagedChromiumInstall(): void {
  const executablePath = chromium.executablePath();

  if (existsSync(executablePath)) {
    return;
  }

  throw new Error(
    [
      'Playwright Chromium is not installed and no system Chromium executable was configured.',
      '',
      'Install the Playwright-managed browser:',
      '  npx playwright install --with-deps chromium',
      '',
      'Restricted environments may use a preinstalled browser instead:',
      '  CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser',
      '',
      `Also supported: ${chromiumExecutablePathEnvironmentVariables.join(', ')}`,
      `Expected Playwright-managed Chromium at: ${executablePath}`,
    ].join('\n'),
  );
}

function validateChromiumExecutablePath(executablePath: string, environmentVariableName: string): void {
  try {
    accessSync(executablePath, constants.X_OK);
  } catch {
    throw new Error(
      [
        `${environmentVariableName} points to a Chromium executable that cannot be launched: ${executablePath}`,
        '',
        'Set it to an executable Chromium/Chrome binary, for example:',
        `  ${environmentVariableName}=/usr/bin/chromium npm run test:browser`,
        '',
        'Or install the Playwright-managed browser:',
        '  npx playwright install --with-deps chromium',
      ].join('\n'),
    );
  }
}
