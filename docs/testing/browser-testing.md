# Browser smoke testing

Browser smoke tests validate that the production Vite build can launch in a real
Chromium-family browser and render the Explorer workbench shell. They are
separate from unit, type, and build checks so browser availability problems do
not hide non-browser results.

## Normal setup

Install project dependencies, then install the Playwright-managed Chromium build:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

`npm run test:browser` and the existing `npm run test:smoke` command both run
`playwright test`.

CI should continue to use the official Playwright install path:

```bash
npx playwright install --with-deps chromium
```

Do not skip CI browser validation unless the CI environment itself cannot support
Playwright browsers.

## Restricted environment fallback

Some local, sandboxed, or Codex-style environments block Playwright browser
downloads with errors such as HTTP 403. If Chromium or Chrome is already
installed on the system, point Playwright at that executable instead of using a
Playwright-managed browser.

Supported environment variables, in precedence order:

1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
2. `CHROMIUM_EXECUTABLE_PATH`

Example:

```bash
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
```

Equivalent with the Playwright-specific variable:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
```

The configured path must be an executable Chromium/Chrome binary. Common paths to
check include `/usr/bin/chromium`, `/usr/bin/chromium-browser`,
`/usr/bin/google-chrome`, or a distro-specific Chrome/Chromium location.

## When no browser is available

If neither Playwright-managed Chromium nor a configured system executable is
available, the browser smoke command must fail with a diagnostic that says browser
validation did not run. Report that explicitly instead of treating the smoke test
as successful.

A useful report includes:

- the exact command that was run;
- whether `npx playwright install --with-deps chromium` was attempted and what it
  returned;
- whether `CHROMIUM_EXECUTABLE_PATH` or
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` was set;
- the path that was checked, if any;
- unit/type/build results from their separate commands.

Example report:

```text
Browser smoke test did not run: Playwright Chromium was not installed and no
system Chromium executable was configured. Unit tests, typecheck, and build were
run separately; browser validation is pending until Chromium is available.
```

Do not claim browser validation succeeded unless Playwright launched a browser and
completed the smoke test.
