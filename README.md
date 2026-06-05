# BehavioML Model Explorer

This repository is the future home of the BehavioML Model Explorer: a web-based,
read-only semantic navigation and review tool for BehavioML workspaces.

The current implementation is a Vite + React + TypeScript workbench slice. It
establishes application boundaries and supports uploaded archive validation, a
path-based workspace overview, a scope-oriented entity explorer, diagnostic
navigation, local search, workspace tabs, built-in canonical example loading, and
a raw read-only selected-entity source view without implementing Explorer-owned
BehavioML semantics.

## Current status

Implemented in this first vertical slice:

- Vite + React + TypeScript application shell.
- Framework-independent `src/core/` types for workspace files, archive extraction
  results, workspace root detection results, load/validation status, validation
  view models, path-based workspace overview models, path-derived entity index
  and selection helpers, raw source file view models, application errors, and
  command/port boundaries.
- Browser-only uploaded `.tgz`, `.tar.gz`, and `.zip` archive extraction plus
  canonical example ZIP loading under `src/adapters/browser/`.
- Minimal workspace root detection for model roots at the archive root, under
  `behavioml/` or `behavioml/model/`, under feature-local
  `specs/<feature>/behavioml-draft/model/` drafts, or under the same layouts
  inside a GitHub “Download ZIP” top-level wrapper directory, based on known
  BehavioML scope directories.
- Validator integration boundary under `src/adapters/validator/`, with the
  Validator package isolated to that adapter.
- React workbench UI under `src/ui-react/` with a compact top bar, left activity
  bar, scope-oriented explorer panel, tabbed central workspace, contextual
  inspector, and bottom diagnostics panel.
- Default workspace tabs for Overview, Source, and a Diagram placeholder. The
  Source tab reuses the raw read-only source viewer; the Diagram tab reserves the
  future diagram surface without rendering or generating diagrams.
- Archive selection, loading state, workspace overview, grouped path-derived
  entity browsing, selected entity summaries, local text/path search, selected-file
  diagnostics, validation status, diagnostic counts, diagnostic details, exact-path
  diagnostic navigation, selected diagnostic source context, selected source search
  context, and adapter errors.
- Build, typecheck, architecture boundary tests, and non-UI workspace loading
  tests.

Deferred intentionally:

- General-purpose remote archive URL fetching/loading.
- Full semantic entity navigation.
- Line highlighting and semantic field navigation for diagnostics.
- Semantic search, reference resolution, and backlinks.
- Generated artifact discovery, supporting artifact discovery, and diagram
  rendering.
- Editing.
- Diagram rendering.
- Any Explorer-owned BehavioML parser, resolver, validator, or diagnostics
  semantics.

## Workbench layout

The default UI is a read-only Explorer workbench rather than a stacked report. It
uses persistent navigation and internal scrolling so source, diagnostics, and
selection context remain visible while users explore a loaded workspace.

The workbench shell contains:

- A compact top bar with the BehavioML Explorer identity, loaded model root or
  load state, validation health, global search entry point, archive load action,
  and built-in example loader.
- A narrow activity bar reserving major work modes: Explorer, Search, Validation,
  Diagrams, and Relationships. Explorer is the primary functional mode in this
  slice; the other modes either expose already-available search/validation context
  or intentional placeholders for future work.
- A scope-oriented Explorer panel that groups path-derived entities under known
  BehavioML model scopes and shows counts for each scope.
- A tabbed central workspace with Overview, Source, and Diagram tabs. The
  Overview tab opens after a successful load and summarizes workspace identity,
  detected root, scope counts, validation health, and entry points. The Source
  tab shows the existing raw read-only source viewer for the selected entity. The
  Diagram tab is a placeholder only.
- A compact Inspector panel for selected entity identity, scope, file path,
  extension, selected diagnostic/search context, and diagnostics for the selected
  source file.
- A bottom Diagnostics panel modeled after an IDE Problems panel, with validation
  state, severity summaries, and clickable diagnostics when exact path-based
  navigation is available.

Diagram rendering remains future work. Explorer does not generate diagrams, infer
relationships, resolve references, compute backlinks, edit models, or parse YAML
semantically in this UI slice.

For comparison or troubleshooting, the previous stacked layout remains available
with `?layout=classic`.


## Loading built-in examples

Explorer includes a compact **Load example** control beside the archive loader.
Choose **QUIC**, **OAuth Authorization Code**, or **WHIP**, then select **Load
example**. Explorer fetches the current GitHub ZIP for
[`BehavioML/specifications`](https://github.com/BehavioML/specifications) from:

```text
https://github.com/BehavioML/specifications/archive/refs/heads/main.zip
```

The browser adapter extracts the ZIP in memory and selects only the requested
canonical model subtree:

```text
specifications-main/examples/quic/model/
specifications-main/examples/oauth-authorization-code/model/
specifications-main/examples/whip/model/
```

Paths are preserved relative to the selected example model root before the same
validation, path-derived entity indexing, overview, source view, diagnostics, and
search pipeline used by uploaded archives runs. The source label identifies the
canonical upstream path, such as `BehavioML/specifications/examples/quic`.

The canonical source remains `BehavioML/specifications`. Explorer does **not**
vendor, copy, or duplicate those examples into this repository, and the example
loader does not add Explorer-owned BehavioML parsing or semantics. It is an
onboarding/loading convenience; caching and offline mode remain out of scope.

## Uploaded archive support

The first vertical slice accepts uploaded `.tgz`, `.tar.gz`, and `.zip` files in
the browser UI. The browser adapter decompresses gzip-compressed tar archives or
unzips ZIP archives, reads regular archive entries, keeps UTF-8 `.yaml`, `.yml`,
and `.json` files relevant for validation, normalizes paths to POSIX-style
workspace-relative paths, detects the model root, and passes in-memory file
entries to the Validator adapter.

GitHub “Download ZIP” archives are supported. Explorer accounts for the single
top-level wrapper directory GitHub adds around repository contents, such as
`explorer-main/`, before it passes validation files to the Validator.

Supported model root layouts for this slice:

```text
workflows/
roles/
...
```

or:

```text
behavioml/workflows/
behavioml/roles/
...
```

or the conventional repository layout:

```text
behavioml/model/workflows/
behavioml/model/roles/
...
```

or a feature-local BehavioML draft layout:

```text
specs/<feature>/behavioml-draft/model/workflows/
specs/<feature>/behavioml-draft/model/roles/
...
```

The same layouts are also supported under a GitHub ZIP top-level wrapper
directory:

```text
<repo-name>/workflows/
<repo-name>/behavioml/workflows/
<repo-name>/behavioml/model/workflows/
<repo-name>/specs/<feature>/behavioml-draft/model/workflows/
...
```

A recognizable model root must contain at least one known BehavioML model scope
directory, such as `workflows`, `roles`, `capabilities`, `interfaces`,
`components`, `modules`, `entities`, `events`, `state-machines`, or `decisions`.
GitHub Actions workflow directories such as `.github/workflows/` are not treated
as BehavioML model roots. If no root is found, or multiple populated model roots
are plausible, Explorer reports a clear adapter error instead of guessing.

Archive extraction uses [`fflate`](https://www.npmjs.com/package/fflate) for
gzip decompression and ZIP extraction. It was selected because it is small,
browser-compatible, and focused on compression/decompression. Explorer keeps tar
entry reading and ZIP extraction local to the browser adapter so no extraction
behavior leaks into `src/core/` or the Validator adapter. General-purpose remote
archive URL loading remains deferred; the only built-in network loader is the
canonical BehavioML/specifications example ZIP path described above. The build
also aliases the Validator package's Node filesystem dependency to a browser-only unavailable-filesystem shim; Explorer
uses the Validator through its in-memory workspace path and does not ask the
browser to read local filesystem paths.


## Workspace overview

After a supported uploaded archive or built-in example is extracted and a model
root is detected, Explorer shows a workspace overview for the in-memory
validation workspace. The overview includes the source label, detected model root, validation file count,
known BehavioML scope counts, validation status, and a diagnostic summary.

Scope counts are intentionally path-based and non-authoritative: Explorer counts
workspace-relative files whose first path segment is one of the known model scope
directories (`workflows`, `roles`, `capabilities`, `interfaces`, `components`,
`modules`, `entities`, `events`, `state-machines`, or `decisions`). It does not
inspect YAML or JSON content to infer entity kinds, references, generated
artifacts, supporting artifacts, or model semantics.

The BehavioML Validator remains the authority for parsing, model loading,
reference resolution, validation rules, diagnostics semantics, summaries, and
coverage. Explorer supports local text/path search over already extracted
workspace files and path-derived entity metadata, but semantic search, reference
resolution, backlinks, generated artifact discovery, supporting artifact
discovery, diagram rendering, editing, and semantic entity metadata remain
deferred.

## Entity browser skeleton

After archive extraction, Explorer also builds a minimal entity index from the
validated in-memory workspace file paths. The browser groups model files under
known BehavioML scope directories, shows a count per scope, and lets users select
an entity to see a path-derived summary containing scope, identity, display name,
file path, extension, and a minimal exact-file diagnostic count when Validator
diagnostics are available.

Entity identities are derived only from workspace-relative paths. For example,
`capabilities/connection/send_initial.yaml` becomes scope `capabilities` and
identity `connection/send_initial`. The entity browser recognizes `.yaml`,
`.yml`, and `.json` files under known scope directories and ignores unknown
directories plus non-model files.

These identities are non-authoritative beyond the current workspace file
structure. Explorer does not parse YAML or JSON contents for entity fields,
references, backlinks, generated artifacts, supporting artifacts, diagrams, or
semantic metadata. If Explorer needs semantic entity metadata later, that data
should come from Validator API output rather than an Explorer-owned parser.

## Local search

Explorer includes a local read-only search panel for the currently loaded
in-memory workspace. Search is case-insensitive substring matching over
path-derived entity identity, scope, display name, file path, and raw extracted
source text. Source content matches report the matching file path, line number,
and line text so users can navigate to the corresponding selected source when a
path-derived entity exists.

Search is intentionally text/path-based only. YAML and JSON files are treated as
plain text; Explorer does not interpret fields, resolve references, infer
backlinks, rank semantic relevance, or build graph navigation from search
results. Source matches in extracted files that are not part of the
path-derived entity index are shown gracefully without changing the current
entity selection.

## Selected entity source view

Selecting a path-derived entity now opens a raw source panel for the matching
workspace file. Source lookup is exact-file/path-based after the same workspace
path normalization used by the path-derived entity index. The source view shows
the normalized file path, extension, line count, character count, and raw file
content in a read-only `<pre><code>` block.

This view is intentionally not a semantic YAML or JSON parser. It displays the
already extracted in-memory workspace entry exactly as text and does not inspect
fields, resolve references, infer backlinks, discover generated/supporting
artifacts, render diagrams, or enable editing.

When Validator diagnostics are available, Explorer also shows diagnostics whose
file path exactly matches the selected source file path. Diagnostic list entries
with file paths are now clickable: Explorer normalizes the diagnostic file path,
looks for an exact match in the path-derived entity index, selects that entity
when one exists, keeps the matching source file focused, and displays the
selected diagnostic context near the source panel.

Diagnostic matching is exact-path based only. Explorer does not parse YAML or
JSON contents and does not interpret Validator field paths semantically. Field
paths are displayed as opaque Validator output, alongside severity, message, and
file path. If a diagnostic file path is not part of the path-derived entity
index, Explorer keeps the current entity selection and reports that no matching
entity was found.

Source line highlighting, semantic field navigation, reference resolution, and
backlinks remain deferred. Explorer does not invent line numbers from Validator
field paths, and local search line numbers come only from raw source text
matches.

## Architecture layers

```text
src/core/
  Framework-independent application contracts and view-model types.

src/adapters/browser/
  Browser-specific archive upload and extraction boundaries. Uploaded `.tgz`,
  `.tar.gz`, and `.zip` extraction is implemented; remote archive URL fetching
  remains deferred.

src/adapters/validator/
  Boundary over @behavioml/validator. This is the only source directory that may
  reference the Validator package.

src/ui-react/
  React-specific UI shell. It talks to core/adapters through boundaries and does
  not import @behavioml/validator directly.
```

### Why Validator is behind an adapter

The BehavioML Validator remains the semantic engine for parsing, model loading,
reference resolution, validation rules, diagnostics, summaries, and coverage. The
Explorer must not duplicate those responsibilities or parse BehavioML YAML for
semantic purposes.

The adapter in `src/adapters/validator/` accepts workspace-relative in-memory
file entries, creates an `InMemoryWorkspace`, calls `validateWorkspace`, and maps
Validator output into a minimal Explorer validation view model. Adapter failures
are returned separately from Validator diagnostics so the UI can distinguish
"the model has diagnostics" from "validation could not run."

## Validator dependency status

`@behavioml/validator` is not currently published to the public npm registry, so
Explorer does not use a registry semver dependency or pretend that package is
available from npm. For local development and CI, Explorer consumes the Validator
repository directly as a pinned Git dependency:

```json
"@behavioml/validator": "git+https://github.com/BehavioML/validator.git#be6814f169c0e46245394956fbe21548233b2797"
```

The pinned commit is the current `main` revision inspected for this integration.
It includes the public package metadata and workspace-provider API expected by
the adapter: `InMemoryWorkspace` and `validateWorkspace`. Pinning a commit keeps
Explorer installs reproducible while Validator remains unpublished; updating the
pin should be a deliberate dependency-integration change.

The import remains deferred inside `src/adapters/validator/` so the React app and
core layers continue to avoid direct Validator coupling. This dependency should
be switched to a normal npm semver range once `@behavioml/validator` is published
to the registry.

## GitHub Pages deployment

This repository deploys the Vite production build from `dist/` through GitHub
Actions using GitHub's official Pages artifact flow. Repository settings must be
configured as **GitHub Pages -> Source: GitHub Actions**; the deployment workflow
does not push built assets to a `gh-pages` branch.

The Pages workflow runs on pushes to `main` and manual `workflow_dispatch`
triggers, then installs dependencies, typechecks, runs tests, builds the app,
uploads `dist/` with `actions/upload-pages-artifact`, and deploys it with
`actions/deploy-pages`. Production Vite builds use the GitHub Pages repository
base path `/explorer/`, so generated asset URLs resolve under
`/explorer/assets/`.

## Running the scaffold

Install dependencies:

```sh
npm install
```

Run the development server:

```sh
npm run dev
```

Serve the production build locally after `npm run build`:

```sh
npm run preview
```

Typecheck:

```sh
npm run typecheck
```

Build:

```sh
npm run build
```

Run architecture boundary and workspace loading tests:

```sh
npm test
```

Run the Playwright browser smoke test:

```sh
npx playwright install --with-deps chromium
npm run test:smoke
```

The smoke command builds the production Vite app and serves it with
`npm run preview`, then opens the GitHub Pages base route at `/explorer/`. It
checks that the empty Explorer workbench shell renders, including the top bar,
activity bar, Explorer panel, workspace area, Inspector panel, and Diagnostics
panel. It also fails on browser page errors and console errors observed during
the smoke run.

Playwright writes its HTML report to `playwright-report/` and per-test artifacts
including screenshots and retained failure traces to `test-results/`. The smoke
test always captures an empty-workbench screenshot in `test-results/`; CI uploads
`playwright-report/` and `test-results/` when the browser smoke job fails.

Limitations: this is intentionally a lightweight smoke test, not visual
regression testing. It does not compare screenshots against baselines, does not
upload archive fixtures, and does not validate archive extraction, root
detection, Validator diagnostics semantics, entity indexing, diagrams,
references, backlinks, or editing workflows.

## Workspace conventions

- Source specs live under `specs/`.
- Spec Kit-inspired planning artifacts, such as `plan.md`, `research.md`,
  `data-model.md`, `contracts/`, and `tasks.md`, live under `specs/<feature>/`.
- Feature-local BehavioML drafts live under `specs/<feature>/behavioml-draft/`.
- Accepted system-level BehavioML model content lives under `behavioml/model/`.
- Generated diagrams, validation output, and reports live under `generated/`
  directories.
- Traceability is external for now and may live under `traceability/`
  directories.
- Repo-wide reusable prompts live under `prompts/`.
- Command-shaped BehavioML workflow prompts live under `prompts/commands/`.
- Feature-specific prompts live under `specs/<feature>/prompts/`.

## Prompts as first-class artifacts

Prompts are first-class project artifacts for ChatGPT/Codex collaboration. They
should be deterministic, reviewable, explicit about non-goals, and honest about
failure reporting.

The BehavioML workflow prompts are intentionally shaped like future Spec Kit
extension commands:

- `/behavioml.derive`
- `/behavioml.validate`
- `/behavioml.review`
- `/behavioml.diagrams`
- `/behavioml.traceability`
- `/behavioml.promote`

At Level 0, these are plain Markdown prompts, not installed commands.

## Intended pipeline

```text
source specs / SDD artifacts
        -> feature-local BehavioML behavioral model draft
        -> validation, diagrams, traceability, model review
        -> promotion into the accepted BehavioML model
        -> technical planning / contracts / tasks
        -> implementation
```

The Explorer should help users inspect, navigate, validate, and understand
BehavioML models. It should not start as a full editor, a requirements management
tool, or a framework-specific application.

## Compatibility levels

- Level 0: repository conventions, manual prompts, command-shaped prompt files,
  docs, and initial Explorer scaffold.
- Level 1: local reusable commands or prompts, still without a packaged
  extension.
- Level 2: reusable Spec Kit extension or tooling package, potentially invoking
  BehavioML validator/generator scripts and traceability coverage tooling.

Future Spec Kit compatibility should be added only after the command-shaped
prompt semantics stabilize.
