# Playwright Smoke Tests

## Purpose

Use Playwright to perform lightweight browser smoke validation for web UI changes.

This skill complements `browser-ui-validation.md`:

- `browser-ui-validation.md` defines what good UI validation means.
- `playwright-smoke-tests.md` defines a practical execution pattern.

Use this skill when a task changes:

- layout
- styling
- navigation
- interaction flows
- viewport behavior
- browser-only adapters
- build/deployment paths

## Inspect First

Before adding or running Playwright, inspect:

- `package.json`
- `package-lock.json`
- existing `playwright.config.*`
- existing `tests/` or `e2e/` directories
- existing CI workflows
- README development commands

Do not add duplicate tooling if the repository already has browser smoke tests.

## Preferred Setup

Prefer Playwright over Puppeteer when no browser tooling exists.

Keep the setup minimal:

- one Playwright config
- one smoke test file
- screenshots on failure or explicit capture
- no heavy visual-regression framework initially

Do not introduce screenshot pixel-diff baselines unless explicitly requested.

## Test Shape

A minimal smoke test should:

1. Start the app with the documented command.
2. Open the root route.
3. Assert the app shell renders.
4. Assert no fatal page errors occur.
5. Capture at least one screenshot artifact when useful.

For Vite apps, prefer testing the production build when possible:

```bash
npm run build
npm run preview
```

Use the development server only when the repo's workflow depends on it.

## Suggested Checks

Check visible UI landmarks rather than brittle implementation details:

- app title
- upload/load control
- main workbench shell
- explorer panel
- workspace area
- inspector panel
- diagnostics panel

Avoid relying on exact CSS class names unless the project already treats them as stable.

## Screenshots

Capture screenshots for:

- initial empty state
- loaded state, when fixtures exist
- changed UI area
- narrow viewport, when responsiveness is part of the task

Store screenshots in a predictable artifact directory such as:

```text
playwright-report/
test-results/
```

Follow the repository's existing convention if present.

## Fixtures

If the app needs input files:

- prefer small committed fixtures;
- prefer generated fixtures when the repository already has fixture-generation scripts;
- avoid large binary artifacts;
- document how the fixture was produced.

For BehavioML Explorer, a small archive fixture should exercise:

- archive upload
- root detection
- validation
- entity browsing
- source viewing

Do not embed full upstream repositories as fixtures unless explicitly justified.

## CI

If adding Playwright to CI:

- keep it separate from unit tests if runtime is significant;
- use official Playwright browser installation steps;
- upload screenshots/reports as artifacts on failure;
- do not block non-UI work with flaky browser tests unless the smoke test is stable.


## Browser Availability

Browser smoke tests should prefer Playwright-managed Chromium in CI via:

```bash
npx playwright install --with-deps chromium
```

Restricted local or Codex-style environments may block that download. In those
cases, use a preinstalled Chromium/Chrome binary by setting one of these
environment variables before running the browser smoke command:

```bash
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
```

If neither Playwright-managed Chromium nor a configured system browser is
available, report that browser validation did not run. Do not claim browser smoke
validation succeeded, and keep unit/type/build results separate from the browser
availability failure.

## Reporting

Report:

- commands run
- browser used
- URL visited
- viewport sizes tested
- screenshots captured
- issues observed
- limitations

Do not claim browser validation succeeded if the browser did not launch.

## BehavioML Explorer Notes

For Explorer UI smoke tests, prioritize these states:

1. Empty app loaded at `/explorer/` or local equivalent.
2. Archive selected/uploaded when a fixture exists.
3. Workspace overview visible.
4. Entity selected.
5. Source view visible.
6. Diagnostics panel visible.

The smoke test should protect against:

- blank page after deployment
- broken Vite base path
- missing app shell
- overlapping major panels
- unreachable upload control
- source view hidden behind other panels
