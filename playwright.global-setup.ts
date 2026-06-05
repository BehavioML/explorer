import { resolveChromiumExecutablePath, validateManagedChromiumInstall } from './playwright.browser';

export default function globalSetup(): void {
  if (resolveChromiumExecutablePath()) {
    return;
  }

  validateManagedChromiumInstall();
}
