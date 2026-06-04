# 0001 - Derive Model Explorer BehavioML Draft Prompt

## Purpose

This feature-local prompt defines Model Explorer-specific derivation instructions for a later Codex task.

This prompt does not itself derive the model. It defines the feature-specific derivation instructions to use in a later Codex task.

Use the generic base prompt at `prompts/commands/behavioml.derive.prompt.md`, then apply the Model Explorer-specific source artifacts, constraints, candidate model elements, and non-goals below.

## Inputs to inspect in the later derivation task

Inspect the generic base prompt first:

- `prompts/commands/behavioml.derive.prompt.md`

Then inspect the Model Explorer source artifacts:

- `specs/001-model-explorer/spec.md`
- `specs/001-model-explorer/information-architecture.md`
- `specs/001-model-explorer/plan.md`
- `specs/001-model-explorer/notes.md`
- `specs/001-model-explorer/behavioml-draft/README.md`

Also inspect BehavioML modeling rules and conventions available in this repository or in the BehavioML specifications repository when available.

If any referenced file cannot be inspected, continue best-effort and report exactly what could not be read.

## Scope

The later derivation task should create a feature-local BehavioML draft only. It must not promote content into the accepted root model.

Future derivation outputs belong under:

- `specs/001-model-explorer/behavioml-draft/model/`
- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`
- `specs/001-model-explorer/behavioml-draft/generated/reports/`

## Model Explorer-specific context

Use this feature context only after applying the generic base prompt:

- The Explorer is web-based.
- The Explorer is read-only.
- The Explorer is a semantic navigation and review tool for BehavioML workspaces.
- The Explorer loads archives, not repositories.
- Input sources are:
  - uploaded `.tgz` or `.tar.gz` archives;
  - public unauthenticated remote `.tgz` or `.tar.gz` URLs.
- Remote archive retrieval should happen directly in browser when possible.
- Workspace root autodetection supports:
  - a model workspace at archive root;
  - a `behavioml/` directory containing the model workspace.
- Source specs and compliance artifacts are auto-discovered when present and treated as supporting context.
- Generated diagrams and reports are displayed when present but are not source of truth.
- Validation is supported by embedding or reusing the BehavioML Validator as the semantic engine.
- The Explorer should not reimplement parser, resolver, reference graph, or diagnostics semantics.
- Navigation includes:
  - clickable references;
  - backlinks;
  - entity selection;
  - contextual search;
  - diagnostics-to-entity/source navigation;
  - view switching;
  - context preservation.
- UI should be pleasant, readable, and progressively disclosed, but BehavioML must not model visual layout.
- React, Vite, and TypeScript are technical plan choices.
- React is a replaceable UI adapter, not the semantic core.
- The semantic core must remain UI-independent.

## Explorer-specific non-goals

Do not model:

- React component trees;
- CSS, tabs, panels, layout grids, or styling;
- low-level click handlers or framework state;
- GitHub API integration;
- private repositories or authenticated fetch;
- backend archive fetching;
- editing;
- diagram generation on demand;
- full graph visualization beyond reference/backlink navigation unless explicitly justified;
- every technical data object as a BehavioML entity.

## Candidate workflows

The following workflow names are likely candidates and are guidance, not mandatory output. Include, rename, split, merge, or omit them based on inspected source material and BehavioML modeling rules:

- `load_workspace_from_uploaded_archive`
- `load_workspace_from_remote_archive_url`
- `detect_workspace_root`
- `inspect_workspace_overview`
- `inspect_model_entity`
- `switch_entity_view`
- `navigate_reference`
- `inspect_backlinks`
- `search_workspace`
- `run_validation`
- `inspect_diagnostic`
- `inspect_generated_artifact`
- `inspect_supporting_artifact`

## Candidate roles

Likely candidate roles:

- `user`
- `explorer`
- `validator`
- `archive_source`

Only add roles if they make workflow interactions clearer.

## Candidate capabilities

Likely candidate capabilities:

- `workspace/load_uploaded_archive`
- `workspace/load_remote_archive`
- `workspace/extract_archive`
- `workspace/detect_workspace_root`
- `workspace/discover_supporting_artifacts`
- `model/index_entities`
- `model/resolve_references`
- `model/index_backlinks`
- `navigation/select_entity`
- `navigation/switch_view`
- `navigation/follow_reference`
- `navigation/show_backlinks`
- `search/search_workspace`
- `validation/run_validation`
- `validation/show_diagnostics`
- `artifacts/show_generated_artifact`
- `context/show_supporting_artifact`
- `source/open_yaml`

Include only capabilities that represent behaviorally meaningful responsibilities justified by inspected source material.

## Candidate interfaces

Likely candidate interfaces:

- `archive_input`
- `remote_archive_fetch`
- `archive_extraction`
- `validator_engine`
- `generated_artifact_reader`
- `supporting_artifact_reader`

Include only interfaces that represent meaningful architectural dependency or contract boundaries.

## Candidate components

Likely candidate components:

- `explorer_core`
- `browser_archive_adapter`
- `validator_adapter`
- `react_ui`

`react_ui` is an adapter/component boundary only. It must not be modeled as the semantic owner of workspace loading, parsing, resolving, indexing, validation semantics, navigation semantics, or diagnostics semantics.

## Candidate modules

Likely candidate modules:

- `core`
- `browser_adapters`
- `validator_integration`
- `ui`

Use modules only for ownership, packaging, or organization boundaries justified by the source artifacts.

## Candidate entities

Likely candidate entities:

- `loaded_archive`
- `workspace`
- `model_entity`
- `reference`
- `diagnostic`
- `generated_artifact`
- `supporting_artifact`
- `navigation_context`
- `search_result`

Only model entities if behaviorally relevant. Do not mirror every technical data object into the BehavioML model.

## Candidate state machines

Likely candidate state machines:

- `workspace_loading_lifecycle`
- `validation_lifecycle`
- `navigation_context_lifecycle`

Only add state machines when they clarify behaviorally meaningful lifecycle constraints.

## Candidate decisions

Likely candidate decisions:

- Explorer is read-only.
- Explorer is web-based.
- Explorer loads archives, not repositories.
- Explorer embeds/reuses Validator.
- React is a replaceable UI adapter.
- Generated artifacts are views, not source of truth.
- Source specs/compliance artifacts are supporting context.

Represent decisions as rationale and tradeoffs, not as duplicated requirements.

## Traceability expectations

If the later derivation creates model content, it should also create or update external traceability at:

- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`

Traceability should map source artifact anchors to model elements. Do not add `derived_from`, `based_on`, or similar traceability fields inside model files unless the BehavioML metamodel explicitly adopts them later.

## Acceptance criteria for the later derivation task

- The generic base prompt is followed before applying this feature-local guidance.
- The derivation stays under `specs/001-model-explorer/behavioml-draft/`.
- No content is promoted into `behavioml/model/`.
- No application code is added.
- No package setup is added.
- No React, Vite, or TypeScript configuration is added.
- No `.specify/` directory is added.
- No Spec Kit extension is created.
- The BehavioML metamodel is not modified.
- Model content remains behavior-first and does not model visual layout or framework internals.
- The semantic core remains UI-independent.
- Gaps and uncertainties are reported instead of inventing behavior.
