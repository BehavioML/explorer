# BehavioML Model Explorer

This repository is the future home of the BehavioML Model Explorer: a web-based,
read-only semantic navigation and review tool for BehavioML workspaces.

The current implementation is an initial Vite + React + TypeScript vertical
slice. It establishes application boundaries and supports uploaded archive
validation, a path-based workspace overview, and a minimal path-derived entity
browser without implementing the full Explorer product, remote fetching, or
Explorer-owned BehavioML semantics.

## Current status

Implemented in this first vertical slice:

- Vite + React + TypeScript application shell.
- Framework-independent `src/core/` types for workspace files, archive extraction
  results, workspace root detection results, load/validation status, validation
  view models, path-based workspace overview models, path-derived entity index
  and selection helpers, application errors, and command/port boundaries.
- Browser-only uploaded `.tgz` / `.tar.gz` archive extraction under
  `src/adapters/browser/`.
- Minimal workspace root detection for model roots at the archive root or under
  `behavioml/`, based on known BehavioML scope directories.
- Validator integration boundary under `src/adapters/validator/`, with the
  Validator package isolated to that adapter.
- Minimal React UI under `src/ui-react/` for archive selection, loading state,
  workspace overview, grouped path-derived entity browsing, selected entity
  summaries, validation status, diagnostic counts, diagnostic details, and
  adapter errors.
- Build, typecheck, architecture boundary tests, and non-UI workspace loading
  tests.

Deferred intentionally:

- Remote archive URL fetching/loading.
- Full semantic entity navigation.
- Search, reference resolution, and backlinks.
- Generated artifact discovery, supporting artifact discovery, and diagram
  rendering.
- Editing.
- Full Explorer UI.
- Any Explorer-owned BehavioML parser, resolver, validator, or diagnostics
  semantics.


## Uploaded archive support

The first vertical slice accepts an uploaded `.tgz` or `.tar.gz` file in the
browser UI. The browser adapter decompresses the gzip payload, reads regular tar
entries, keeps UTF-8 `.yaml`, `.yml`, and `.json` files relevant for validation,
normalizes paths to POSIX-style workspace-relative paths, detects the model root,
and passes in-memory file entries to the Validator adapter.

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

A recognizable model root must contain at least one known BehavioML model scope
directory, such as `workflows`, `roles`, `capabilities`, `interfaces`,
`components`, `modules`, `entities`, `events`, `state-machines`, or `decisions`.
If no root is found, or both supported roots are plausible, Explorer reports a
clear adapter error instead of guessing.

Archive extraction uses [`fflate`](https://www.npmjs.com/package/fflate) for
gzip decompression. It was selected because it is small, browser-compatible, and
focused on compression/decompression. Explorer keeps tar entry reading local to
the browser adapter so no extraction behavior leaks into `src/core/` or the
Validator adapter. The build also aliases the Validator package's Node
filesystem dependency to a browser-only unavailable-filesystem shim; Explorer
uses the Validator through its in-memory workspace path and does not ask the
browser to read local filesystem paths.


## Workspace overview

After a supported uploaded archive is extracted and a model root is detected,
Explorer shows a workspace overview for the in-memory validation workspace. The
overview includes the source label, detected model root, validation file count,
known BehavioML scope counts, validation status, and a diagnostic summary.

Scope counts are intentionally path-based and non-authoritative: Explorer counts
workspace-relative files whose first path segment is one of the known model scope
directories (`workflows`, `roles`, `capabilities`, `interfaces`, `components`,
`modules`, `entities`, `events`, `state-machines`, or `decisions`). It does not
inspect YAML or JSON content to infer entity kinds, references, generated
artifacts, supporting artifacts, or model semantics.

The BehavioML Validator remains the authority for parsing, model loading,
reference resolution, validation rules, diagnostics semantics, summaries, and
coverage. Search, reference resolution, backlinks, generated artifact discovery,
supporting artifact discovery, diagram rendering, editing, and semantic entity
metadata remain deferred.

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

## Architecture layers

```text
src/core/
  Framework-independent application contracts and view-model types.

src/adapters/browser/
  Browser-specific archive upload and extraction boundaries. Uploaded `.tgz` /
  `.tar.gz` extraction is implemented; remote URL fetching remains deferred.

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

## Running the scaffold

Install dependencies:

```sh
npm install
```

Run the development server:

```sh
npm run dev
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
