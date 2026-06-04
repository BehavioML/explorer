# Model Explorer Technical Plan

## Status

Initial technical plan for the future BehavioML Model Explorer.

The product scope is defined in `specs/001-model-explorer/spec.md`, and information organization is refined in `specs/001-model-explorer/information-architecture.md`.

This plan records the initial technical constraints and stack decision. It does not define implementation tasks, API contracts, storage schemas, or detailed component design yet.

## Inputs

- Source product specification: `specs/001-model-explorer/spec.md`
- Information architecture: `specs/001-model-explorer/information-architecture.md`
- Experiment notes: `specs/001-model-explorer/notes.md`
- Feature-local BehavioML draft: `specs/001-model-explorer/behavioml-draft/model/` once derived
- Feature-local traceability map: `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`
- Accepted system model: `behavioml/model/` once reviewed content is promoted
- Repo-wide command-shaped prompts: `prompts/commands/`

## Technical decision: initial UI stack

Use Vite + React + TypeScript for the initial web UI shell.

Rationale:

- The Explorer is web-based and does not require SSR or a fullstack framework.
- Vite provides a simple, fast static web-app development model.
- React has a strong ecosystem for complex technical UIs such as entity browsers, panels, tabs, command palettes, virtualized lists, YAML viewers, diagrams, and graph-like navigation surfaces.
- React + TypeScript is a good fit for Codex-assisted implementation and review.
- TypeScript aligns well with the expected validator/generator ecosystem if those tools expose embeddable JS/TS APIs.
- A static client-side app fits the current archive-based input model.

Constraint:

- React owns rendering and interaction adaptation only.
- React must not own BehavioML parsing, validation, indexing, navigation semantics, search semantics, diagnostics semantics, or workspace interpretation.

## Architecture principle: replaceable UI

The Explorer should be implemented as a UI-independent semantic application core plus replaceable UI adapters.

The core principle is:

```text
UI is a replaceable view over the Explorer application model.
```

Not:

```text
UI owns navigation, validation, indexing, search, or diagnostics state.
```

This should allow the initial React UI to be replaced later with minimal changes to archive loading, workspace detection, validator integration, indexing, navigation, search, diagnostics, and view-model generation.

## Proposed layers

Conceptual layers:

```text
archive/input layer
        -> workspace loading
        -> validator / semantic engine
        -> explorer application model
        -> view models
        -> UI adapter
```

Possible module boundaries:

```text
src/core/
  workspace/
  model-index/
  navigation/
  search/
  diagnostics/
  generated-artifacts/
  supporting-artifacts/
  view-models/

src/adapters/browser/
  archive-upload/
  remote-archive-fetch/
  decompression/

src/adapters/validator/
  behavioml-validator adapter

src/ui-react/
  components/
  views/
  interaction bindings
```

These paths are planning guidance, not final implementation tasks.

## Technical constraints

- TC-001: The Explorer must separate semantic model processing from UI rendering.
- TC-002: The Explorer must expose UI-agnostic application state and view models so the visual UI can be replaced without rewriting archive loading, validation, indexing, navigation, search, or diagnostics logic.
- TC-003: Archive loading, workspace detection, validation, indexing, navigation, search, generated artifact discovery, supporting artifact discovery, and diagnostics should live outside UI components.
- TC-004: UI components should be thin presentation and interaction-adaptation layers over the Explorer application model.
- TC-005: The Explorer should embed the BehavioML Validator as the semantic model engine rather than reimplementing parser, resolver, reference graph, or diagnostics logic.
- TC-006: The core should not depend on React.
- TC-007: The core should not depend on browser DOM APIs except at explicit adapter boundaries.
- TC-008: Browser-specific concerns such as file upload, remote archive fetch, decompression, and rendering should be isolated behind ports/adapters.
- TC-009: The initial implementation should avoid backend requirements unless a later constraint makes them necessary.
- TC-010: Generated diagrams, validation output, reports, source specs, compliance artifacts, and traceability maps should remain separate from BehavioML model content.
- TC-011: Technical planning must report missing behavior as a source spec gap or modeling gap instead of inventing it.

## Validator embedding

The Explorer should embed and reuse the BehavioML Validator as its semantic engine.

The Validator should remain the source of truth for:

- workspace parsing;
- model loading;
- entity indexing where available;
- reference resolution;
- backlinks where available;
- diagnostics;
- source locations where available.

The Explorer should not maintain an independent interpretation of BehavioML semantics.

Expected future validator integration needs:

- programmatic validation API;
- filesystem-independent workspace input;
- in-memory workspace support for extracted archives;
- diagnostics with stable entity/file/source-location references;
- semantic index suitable for navigation and search.

## Browser archive handling

The MVP input model is archive-based.

Supported input sources:

- uploaded `.tgz` or `.tar.gz` archive;
- public unauthenticated URL directly resolving to a `.tgz` or `.tar.gz` archive.

Browser-specific handling should be isolated behind adapters.

Open implementation details:

- archive decompression library;
- streaming versus full-buffer extraction;
- memory behavior for large archives;
- browser fetch limitations and CORS behavior;
- user-facing error reporting for failed fetch/extraction.

The product specification intentionally does not define a hardcoded archive size limit.

## BehavioML inputs

Expected BehavioML inputs later:

- workflows that describe behaviorally meaningful Explorer scenarios;
- capabilities that describe Explorer responsibilities;
- interfaces that identify architectural dependency boundaries;
- entities and state machines only where state ownership or lifecycle behavior matters;
- decisions that capture modeling or behaviorally relevant rationale;
- validation and review reports from `generated/` directories.

The BehavioML draft should be derived after this plan and the information architecture have been reviewed.

## Contracts

No contracts are defined yet.

`specs/001-model-explorer/contracts/` is intentionally empty. Future contracts may describe:

- validator embedding API shape;
- workspace/index result shape;
- diagnostic result shape;
- generated artifact metadata shape;
- supporting artifact discovery shape;
- archive input adapter boundaries.

Contracts should be created only when needed for implementation or integration clarity.

## Data model

No final technical data model exists yet.

Use `specs/001-model-explorer/data-model.md` to distinguish implementation data entities from BehavioML behaviorally relevant entities before creating technical structures.

Likely future technical data concepts include:

- loaded archive;
- detected workspace;
- model file;
- model entity;
- reference;
- backlink;
- diagnostic;
- generated artifact;
- supporting artifact;
- navigation state;
- search result.

These are technical planning concepts and should not be blindly mirrored as BehavioML entities.

## Testing strategy

Testing strategy should reflect the layered architecture.

Potential future test categories:

- archive upload adapter tests;
- remote archive URL adapter tests;
- workspace detection tests;
- in-memory validator integration tests;
- model indexing tests;
- reference navigation tests;
- backlink indexing tests;
- contextual search tests;
- validator diagnostic rendering tests;
- generated artifact discovery tests;
- source YAML navigation tests;
- traceability/supporting artifact display tests when external mappings exist;
- React UI smoke tests over stable view models.

UI tests should not be the only tests for semantic behavior. Core behavior should be tested below the UI layer.

## Deferred technical decisions

- Exact React component library, if any.
- Routing strategy.
- State management library, if any.
- Archive decompression library.
- YAML/source viewer library.
- Diagram rendering library.
- Search indexing strategy.
- Validator API package boundary.
- Static hosting strategy.
- Browser storage/session persistence.
- Error reporting and telemetry.

## Open technical decisions

- What exact validator result format should the Explorer consume?
- What workspace index shape should the Validator expose for Explorer embedding?
- What source location information is needed for reliable diagnostics-to-source navigation?
- Should validation run automatically after workspace load, only through explicit user action, or both?
- Should the application use URL-addressable navigation for selected entities and views?
- What minimum view-model API keeps React replaceable without over-abstracting?
- What generated diagram artifact formats should the Explorer consume first?
- Should feature-local drafts be explorable, or only accepted root models?
- What minimum traceability coverage format is useful?
- What technical contracts are required before implementation can be planned safely?
