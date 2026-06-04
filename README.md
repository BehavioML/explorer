# BehavioML Model Explorer

This repository is the future home of the BehavioML Model Explorer: a web-based,
read-only semantic navigation and review tool for BehavioML workspaces.

The current implementation is an initial Vite + React + TypeScript scaffold. It
establishes application boundaries for future Explorer work without implementing
the full product, archive extraction, remote fetching, or Explorer-owned
BehavioML semantics.

## Current status

Implemented in this scaffold:

- Vite + React + TypeScript application shell.
- Framework-independent `src/core/` types for workspace files, validation view
  models, application errors, and command/port boundaries.
- Browser-only archive input adapter stubs under `src/adapters/browser/`.
- Validator integration boundary under `src/adapters/validator/`.
- Minimal React UI shell under `src/ui-react/` that shows the project title,
  placeholder workspace loading, and placeholder validation status.
- Build, typecheck, and architecture boundary test scripts.

Deferred intentionally:

- Archive extraction for `.tgz` / `.tar.gz` uploads.
- Remote archive URL fetching.
- Workspace root detection.
- Full semantic navigation, search, backlinks, generated artifact discovery, and
  supporting artifact discovery.
- Full Explorer UI.
- Any Explorer-owned BehavioML parser, resolver, validator, or diagnostics
  semantics.

## Architecture layers

```text
src/core/
  Framework-independent application contracts and view-model types.

src/adapters/browser/
  Browser-specific archive upload, remote URL, fetch, and extraction boundaries.
  These are stubs in this PR.

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

Run architecture boundary tests:

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
