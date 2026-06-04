# Browser UI Validation

## Purpose

Validate browser-based applications through direct execution rather than source inspection alone.

Use this skill whenever a task changes:

- UI layout
- navigation
- styling
- responsiveness
- interaction flows
- visual hierarchy
- component rendering

Do not assume the UI works because code compiles.

Always verify behavior in a browser.

## Workflow

### 1. Inspect first

Understand:

- framework
- build system
- test setup
- available browser tooling

Inspect:

- `package.json`
- `playwright.config.*`, if present
- Puppeteer configuration, if present
- test directories
- documentation

Do not assume Playwright or Chromium already exist.

### 2. Build and start the application

Run the normal development workflow documented by the repository.

Examples:

```bash
npm install
npm run dev
```

or:

```bash
npm ci
npm run build
npm run preview
```

Use the project's documented approach rather than inventing a parallel one.

### 3. Launch a browser

Preferred order:

1. Existing browser tooling already used by the repository
2. Playwright
3. Puppeteer
4. System Chromium or Chrome, if available

Avoid introducing new dependencies if equivalent tooling already exists.

### 4. Validate behavior

Verify:

- page loads successfully
- no fatal runtime errors appear
- expected navigation surfaces exist
- expected panels render
- expected controls are visible
- expected interactions work

Do not rely only on DOM presence.

Actually navigate the application.

### 5. Capture screenshots

Capture screenshots for:

- initial application state
- modified UI areas
- significant workflow states
- responsive/narrow viewport states when relevant

Use screenshots to validate:

- layout
- spacing
- visual hierarchy
- panel sizing
- overflow issues
- responsiveness

### 6. Review visual quality

Look for:

- overlapping elements
- clipped text
- unexpected scrollbars
- broken layouts
- unusable panel sizes
- visual regressions
- poor hierarchy

Report findings explicitly.

### 7. Report honestly

Include:

- commands executed
- pages visited
- screenshots captured
- issues found
- limitations encountered

Never claim visual validation was performed if no browser was actually executed.

## UI Review Checklist

### Layout

- no overlapping panels
- no hidden content
- no clipping
- no broken scrolling
- long paths and long lines do not break the layout

### Navigation

- navigation elements are visible
- selection states are obvious
- current location is understandable
- keyboard or pointer interactions work for changed controls

### Workspace

- primary content is visually dominant
- contextual information is secondary
- layout supports future growth
- panels can remain visible simultaneously where intended

### Responsiveness

- layout remains usable on smaller viewports
- content does not overlap or disappear catastrophically
- important controls remain reachable

## BehavioML Explorer Notes

For BehavioML Explorer, verify:

- archive upload
- workspace overview
- entity navigation
- source viewer
- diagnostics panel
- inspector panel
- search, if implemented
- diagram placeholder surface, if layout-related work touches it

When reviewing layouts, prefer:

- workbench-style navigation
- IDE-like information density
- source and diagram surfaces as primary workspace content
- compact contextual metadata

Avoid:

- report-like layouts
- dashboard-heavy layouts
- excessive card nesting
- inspector panels that dominate the workspace

The source view and future diagram surfaces should remain the primary focus of the workspace.

## Completion Standard

For any UI-related task, source inspection alone is insufficient.

A task that changes layout, styling, navigation, interaction flows, or responsiveness should not be considered complete until browser validation has been attempted and the result has been reported honestly.
