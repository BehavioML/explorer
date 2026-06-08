# BehavioML Model Explorer

This repository is the future home of the BehavioML Model Explorer: a web-based,
read-only semantic navigation and review tool for BehavioML workspaces.

The current implementation is a Vite + React + TypeScript workbench slice. It
establishes application boundaries and supports uploaded archive validation, a
path-based workspace overview, a scope-oriented entity explorer, diagnostic
navigation, local search, Validator-backed relationships/backlinks, document-style workspace tabs, built-in canonical example loading, a raw read-only selected-entity source view, and a Generator-backed selected-entity Diagram view without implementing Explorer-owned
BehavioML semantics.

## Current status

Implemented in this first vertical slice:

- Vite + React + TypeScript application shell.
- Framework-independent `src/core/` types for workspace files, archive extraction
  results, workspace root detection results, load/validation status, validation
  view models, Validator-backed relationship view models, path-based workspace overview models, path-derived entity index
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
- Generator integration boundary under `src/adapters/generator/`, with
  `@behavioml/generator` isolated to that adapter and used as the source of
  generated Mermaid diagram artifacts and optional source-map metadata.
- Mermaid browser rendering boundary under `src/adapters/mermaid/`, with the
  official `mermaid` package isolated to that adapter and initialized with
  strict security settings for user-provided workspaces.
- React workbench UI under `src/ui-react/` with a compact top bar, left activity
  bar, scope-oriented explorer panel, tabbed central workspace, contextual
  inspector, and bottom diagnostics panel.
- Document-style workspace tabs with Overview as the always-available first
  workspace document and one tab per opened path-derived entity. Entity tabs stay
  open while users navigate and expose per-document Source, Relationships, and
  Diagram views. The Source view reuses the raw read-only source
  viewer; the Relationships view reuses Validator-backed references/backlinks;
  the Diagram view lazily requests Generator-owned Mermaid artifacts, renders
  them to SVG in the browser, preserves source-map metadata, and keeps the
  generated Mermaid source available as a fallback.
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
- Generated artifact discovery and supporting artifact discovery beyond the
  selected-entity Diagram view.
- Editing.
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
- A tabbed central workspace with document-style tabs. Overview is a normal
  workspace document that opens automatically after loading and summarizes
  workspace identity, detected root, scope counts, validation health, and entry
  points. Selecting an entity from the explorer, search results, diagnostics, or
  relationship/backlink navigation opens or activates a matching entity document
  tab without duplicating existing tabs. Each entity document has compact Source,
  Relationships, and Generator-backed Diagram views.
- A compact Inspector panel for selected entity identity, scope, file path,
  extension, selected diagnostic/search context, and diagnostics for the selected
  source file.
- A bottom Diagnostics panel modeled after an IDE Problems panel, with validation
  state, severity summaries, and clickable diagnostics when exact path-based
  navigation is available.

Explorer does not generate diagrams itself, edit models, parse YAML semantically, or infer references from raw source text, Mermaid text, or rendered SVG structure. The selected-entity Diagram view consumes Generator-owned artifacts through `src/adapters/generator/`, renders Mermaid through `src/adapters/mermaid/`, and preserves Generator-provided source-map metadata for future click handling. Relationships and backlinks shown by Explorer come from Validator output rather than Explorer-owned reference-resolution semantics.

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
`modules`, `semantic-areas`, `events`, `entities`, `state-machines`, or
`decisions`). It does not inspect YAML or JSON content to infer entity kinds,
references, generated artifacts, supporting artifacts, or model semantics.

The BehavioML Validator remains the authority for parsing, model loading,
reference resolution, validation rules, diagnostics semantics, summaries, and
coverage. Explorer supports local text/path search over already extracted
workspace files and path-derived entity metadata. Reference/backlink display is limited to Validator's structured semantic reference
index; semantic search, generated artifact discovery, supporting artifact
discovery, and editing remain deferred. Diagram rendering is available for
Generator-produced workflow Mermaid artifacts, and semantic-area display metadata
is consumed only when Validator exposes it.

## Entity browser skeleton

After archive extraction, Explorer also builds a minimal entity index from the
validated in-memory workspace file paths. The browser groups model files under
known BehavioML scope directories, shows a count per scope, and lets users select
an entity to see a path-derived summary containing scope, identity, display name,
file path, extension, and a minimal exact-file diagnostic count when Validator
diagnostics are available.

Entity identities are derived only from workspace-relative paths. For example,
`capabilities/connection/send_initial.yaml` becomes scope `capabilities` and
identity `connection/send_initial`; `semantic-areas/packet/protected_receive.yaml`
becomes scope `semantic-areas` and identity `packet/protected_receive`. The
entity browser recognizes `.yaml`, `.yml`, and `.json` files under known scope
directories and ignores unknown directories plus non-model files.

Semantic-area files are shown in the entity browser and raw Source view like any
other path-derived source file. When Validator exposes semantic-area entity data,
Explorer displays its name, description, and directly listed `workflows[]`
references in the Inspector. Explorer does not parse semantic-area YAML itself,
infer semantic areas from directories, resolve workflow references, validate
forbidden fields, or synthesize semantic-area metadata. Semantic-area diagnostics
must come from Validator diagnostics, and semantic-area relationships/backlinks
must come from Validator `referenceIndex` output.

These identities are non-authoritative beyond the current workspace file
structure. Explorer does not parse YAML or JSON contents for entity fields, generated artifacts, supporting artifacts, diagrams, or
semantic metadata. Relationship/backlink data comes from Validator's semantic reference index. If Explorer needs more semantic entity metadata later, that data
should come from Validator API output rather than an Explorer-owned parser.


## Generator-backed Diagram view

The selected-entity **Diagram** view is backed by `@behavioml/generator`, not by
Explorer-owned diagram logic. Explorer passes the already-loaded in-memory
workspace files to the Generator adapter and maps the returned structured
artifacts into small view models. Explorer does not parse BehavioML YAML or JSON
for diagram semantics and does not manually assemble Mermaid.

Current behavior:

- Workflow entity tabs lazily request a single `workflow-sequence:<workflow-id>`
  artifact for the selected workflow identity, render the returned Mermaid source
  to SVG in the browser, and keep the Mermaid source available as a fallback.
- Mermaid rendering is owned by Explorer through `src/adapters/mermaid/`, uses the
  official browser `mermaid` package, disables global auto-rendering, and runs
  with `securityLevel: 'strict'` and HTML labels disabled before the UI injects
  renderer-owned SVG into an isolated canvas component.
- If Generator includes `sourceMap`, Explorer preserves that metadata alongside
  the artifact/rendered diagram and exposes it in a collapsed metadata panel.
  Explorer does not parse SVG ids or Mermaid text to discover model semantics.
- State-machine entity tabs ask Generator for state-machine artifacts, but the
  current Generator SDK returns aggregate state-machine output rather than a
  per-state-machine artifact. Explorer therefore shows a clear Generator
  limitation message instead of parsing or splitting Mermaid itself.
- The Diagrams activity lists workflow entities compactly. Selecting a workflow
  opens its entity tab on the Diagram view and requests the workflow sequence
  artifact through Generator.
- Semantic-area entity tabs currently show a Generator-artifact limitation
  message. Semantic-area diagrams depend on Generator support for a
  `semantic-area-workflows:<semantic-area-id>` artifact (or a future equivalent
  Generator contract). Explorer does not infer semantic areas from directories
  and does not generate SemanticArea Mermaid itself.
- Unsupported entity scopes keep a clear unsupported placeholder.
- Generator diagnostics, Mermaid render errors, empty artifact content,
  package/adapter failures, and malformed artifacts are surfaced as Diagram-view
  messages.

Clickable diagram navigation is intentionally deferred. It should be implemented
only from an explicit, stable Generator source-map contract and must not infer
model references from Mermaid text, SVG element structure, or BehavioML YAML.


## Relationships and backlinks

The Relationships activity panel is backed by Validator's structured semantic reference index. For the selected path-derived entity, Explorer displays:

- outgoing references,
- incoming references/backlinks,
- unresolved references involving the selected entity, and
- unresolved references grouped by target scope and identity.

Each row shows the source entity, Validator field path, target scope/identity, resolved/unresolved status, and target file when Validator provides one. Clicking a resolved target selects the matching path-derived entity if that entity exists in the loaded workspace. Missing path-derived targets are handled as non-navigable rather than guessed. Semantic-area workflow relationships and backlinks are displayed only when Validator includes them in `referenceIndex`; Explorer does not parse YAML, scan raw text, or reimplement reference-resolution rules to populate this panel.


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
artifacts, render diagrams, generate diagrams, or enable editing.

When Validator diagnostics are available, Explorer also shows diagnostics whose
file path exactly matches the selected source file path. Diagnostic list entries
with file paths are now clickable: Explorer normalizes the diagnostic file path,
looks for an exact match in the path-derived entity index, selects that entity
when one exists, keeps the matching source file focused, and displays the
selected diagnostic context near the source panel.

Diagnostic matching is exact-path based only. Explorer does not parse YAML or
JSON contents and does not change Validator diagnostic semantics. Field paths are displayed as opaque Validator output, alongside severity, message, file path, and relationship context when an unresolved Validator reference for the selected entity shares the same field path. If a diagnostic file path is not part of the path-derived entity
index, Explorer keeps the current entity selection and reports that no matching
entity was found.

Source line highlighting, semantic field navigation into exact YAML fields, and
document-style diagnostic tabs remain deferred. Explorer does not invent line numbers from Validator
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

src/adapters/generator/
  Boundary over @behavioml/generator. This is the only source directory that may
  reference the Generator package.

src/ui-react/
  React-specific UI shell. It talks to core/adapters through boundaries and does
  not import @behavioml/validator or @behavioml/generator directly.
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

### Why Generator is behind an adapter

The BehavioML Generator owns diagram artifact semantics. Explorer must not
reimplement those semantics, parse BehavioML source for diagram meaning, or
manually generate Mermaid. The adapter in `src/adapters/generator/` accepts
workspace-relative in-memory file entries, calls `generateWorkspaceArtifacts`,
and maps Generator output, including optional `sourceMap` entries, into Explorer
diagram view models without interpreting source-map semantics. Adapter failures
are kept separate from Generator diagnostics so the UI can distinguish "the diagram
artifact has diagnostics" from "Generator could not run."

## Generator dependency status

`@behavioml/generator` is not currently published to the public npm registry, so
Explorer does not use a registry semver dependency or pretend that package is
available from npm. For local development and CI, Explorer consumes the Generator
repository directly as a pinned Git dependency, mirroring the Validator strategy:

```json
"@behavioml/generator": "git+https://github.com/BehavioML/generator.git#bfecb030922691c2c4b0629b39e0d0e393cb03e1"
```

The pinned commit is the `main` revision inspected for this integration. It
exports `generateWorkspaceArtifacts`, `generateModelArtifacts`, and
`loadWorkspaceModel` from `src/index.js`, accepts already-loaded in-memory
workspace files, performs no filesystem IO, and supports Mermaid artifact
requests such as `workflow-sequence:<workflow-id>`. This commit also includes
source-map metadata on diagram artifacts. The inspected pinned Generator does not
include a `semantic-area-workflows:<semantic-area-id>` artifact or semantic-area
source entity contract, so Explorer intentionally shows a limitation message for
semantic-area diagrams instead of making a fake Generator request. Updating this
pin should be a deliberate dependency-integration change.

The import remains deferred inside `src/adapters/generator/` so the React app and
core layers continue to avoid direct Generator coupling. This dependency should
be switched to a normal npm semver range once `@behavioml/generator` is
published to the registry.


## Validator dependency status

`@behavioml/validator` is not currently published to the public npm registry, so
Explorer does not use a registry semver dependency or pretend that package is
available from npm. For local development and CI, Explorer consumes the Validator
repository directly as a pinned Git dependency:

```json
"@behavioml/validator": "git+https://github.com/BehavioML/validator.git#56185a5e89cb9aabb9cdaf18671a45e5d905ffe5"
```

The pinned commit is the current `main` revision inspected for this integration.
It includes the public package metadata, workspace-provider API expected by the
adapter (`InMemoryWorkspace` and `validateWorkspace`), semantic-area source scope
loading, `SemanticArea.workflows[]` references in `referenceIndex`, and
typed-reference support for `semantic-areas:<path>`. Explorer consumes that
canonical output for summaries and backlinks; it does not duplicate
semantic-area validation rules locally. Pinning a commit keeps Explorer installs
reproducible while Validator remains unpublished; updating the pin should be a
deliberate dependency-integration change.

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
