# Model Explorer Source Specification

## Feature

BehavioML Model Explorer: a read-only tool for inspecting and navigating a BehavioML model workspace.

This is a source product specification, not a BehavioML model. A BehavioML draft may later be derived from this spec, reviewed, validated, and promoted into the accepted system model.

## Status

Placeholder source specification for a level-0 Spec Kit -> BehavioML integration experiment.

This spec is intentionally high-level. It does not define implementation tasks, technical contracts, framework choices, or detailed UI layout.

## Goals

- Help users load a BehavioML model workspace.
- Help users understand model entities and their relationships.
- Help users navigate workflows, capabilities, entities, events, state machines, and decisions.
- Help users see reference resolution, backlinks, validator diagnostics, and generated diagrams.
- Preserve BehavioML as the behavior-first model source of truth.
- Keep source specification material separate from BehavioML model content.

## Non-goals

- Build a full BehavioML editor.
- Build a requirements management tool.
- Choose a frontend framework, desktop runtime, web runtime, or implementation stack.
- Define API contracts, command contracts, storage schemas, or task breakdowns.
- Generate or modify the BehavioML metamodel.
- Treat generated diagrams or reports as source-of-truth model content.
- Model detailed UI layout or screen structure.

## Users

- Model authors who want to inspect a BehavioML workspace.
- Reviewers who need to validate model consistency and behavioral coverage.
- Implementers who need to understand workflows, capabilities, interfaces, state ownership, and decisions before planning code.
- Future tool integrators who may connect source specs, BehavioML drafts, and implementation planning artifacts.

## Primary scenarios

1. A user loads a BehavioML model workspace and sees the model scopes that are available.
2. A user selects a model entity and sees its source YAML.
3. A user inspects references from a workflow to roles, capabilities, and events.
4. A user follows backlinks to understand which model elements reference a selected entity.
5. A user reviews generated diagrams for workflows, state machines, or other derived views.
6. A user reviews validator diagnostics and navigates from a diagnostic to the relevant source YAML.
7. A user optionally sees links back to source specs when external traceability metadata exists.

## Functional requirements

- FR-001: The Explorer should support loading a BehavioML model workspace.
- FR-002: The Explorer should index model entities by BehavioML scope and path identity.
- FR-003: The Explorer should resolve references according to BehavioML semantic field scopes.
- FR-004: The Explorer should show backlinks for model entities when references can be indexed.
- FR-005: The Explorer should show workflows, capabilities, entities, events, state machines, and decisions.
- FR-006: The Explorer should show validator diagnostics when validation output is available.
- FR-007: The Explorer should show generated diagrams when generated diagram artifacts are available.
- FR-008: The Explorer should allow users to open the source YAML for a model entity.
- FR-009: The Explorer may later show links back to source specs when external traceability mappings exist.
- FR-010: The initial Explorer scope is read-only.

## Acceptance criteria

- The initial product scope is described without selecting a framework or implementation runtime.
- The Explorer is clearly scoped as a read-only BehavioML model explorer.
- The Explorer is not described as a full editor or a requirements management tool.
- Source specs, BehavioML model content, generated artifacts, and traceability metadata remain distinct.
- Any future implementation plan must use the reviewed source spec and BehavioML model rather than inventing behavior.

## Constraints

- This document is source specification material, not a BehavioML model.
- The initial Explorer is read-only.
- No detailed UI layout is defined here.
- No frontend framework, desktop runtime, backend runtime, or package manager is selected here.
- No API contracts are defined here.
- No code tasks are defined here.
- The Explorer must preserve BehavioML model files as the behavioral source of truth.
- Generated diagrams, validation output, reports, and traceability indexes are derived or external artifacts, not model source files.

## Open questions

- What exact workspace root shapes should the Explorer recognize first?
- Should the Explorer load only accepted `behavioml/model/` workspaces, or also feature-local `behavioml-draft/model/` workspaces?
- What validator output format should be displayed?
- What generated diagram formats should be supported first?
- What traceability mapping shape is sufficient before considering metamodel fields such as `derived_from` or `based_on`?
- Which BehavioML scopes are required for the first useful read-only Explorer pass?
