# Model Explorer Source Specification

## Feature

BehavioML Model Explorer: a web-based, read-only semantic navigation and review tool for BehavioML workspaces.

The Explorer helps users load a BehavioML workspace from an archive, understand the model through contextual views, navigate between model entities, inspect references and backlinks, run validation, review diagnostics, and access generated or supporting artifacts without treating those artifacts as the model source of truth.

This is a source product specification, not a BehavioML model. A BehavioML draft may later be derived from this spec, reviewed, validated, and promoted into the accepted system model.

## Status

Initial agreed product scope for the Model Explorer level-0 experiment.

This spec intentionally defines product behavior and constraints without defining implementation tasks, technical contracts, framework choices, package setup, or detailed UI layout.

## Product principles

- The Explorer should feel like a semantic model browser, not a file tree with previews.
- The Explorer should be web-based.
- The initial product scope is read-only.
- The Explorer should make BehavioML models understandable, navigable, reviewable, and diagnosable.
- Users should be able to switch between complementary views of the same selected model element.
- Navigation should preserve context where possible.
- Every meaningful displayed BehavioML reference should be clickable when its target can be resolved.
- The UI should prioritize clarity, visual hierarchy, and progressive disclosure over dense raw data presentation.
- Raw YAML should remain accessible, but it should not be the primary way to understand the model.
- Validator diagnostics should be actionable and navigable, not just listed.
- Generated diagrams and reports are views or artifacts, not source-of-truth model content.
- Source specs and compliance artifacts are supporting context, not BehavioML model content.

## Goals

- Help users load a BehavioML workspace into a web-based Explorer.
- Help users understand model entities and their relationships.
- Help users navigate workflows, roles, capabilities, interfaces, components, modules, entities, events, state machines, and decisions.
- Help users move between entity detail, source YAML, diagnostics, generated artifacts, references, backlinks, and search results without losing context.
- Help users search model content contextually.
- Help users validate a loaded workspace by reusing the BehavioML Validator as the semantic model engine.
- Help users inspect validation diagnostics and navigate to the affected entity or source file when possible.
- Help users optionally inspect source specification and compliance artifacts when present in the loaded archive.
- Preserve BehavioML as the behavior-first model source of truth.
- Keep source specifications, compliance artifacts, generated artifacts, technical planning, and BehavioML model content clearly separated.

## Non-goals

- Build a full BehavioML editor.
- Build a requirements management tool.
- Build a Spec Kit frontend.
- Build a diagram editor.
- Generate implementation code.
- Choose a frontend framework, desktop runtime, backend runtime, package manager, or implementation stack.
- Define API contracts, command contracts, storage schemas, or task breakdowns.
- Add direct GitHub API integration for the MVP.
- Support private repositories or authenticated remote archive URLs in the MVP.
- Require server-side archive fetching in the MVP.
- Implement repository-provider-specific browsing in the MVP.
- Generate or modify the BehavioML metamodel.
- Reimplement validator semantics independently inside the Explorer.
- Treat generated diagrams, validation output, reports, source specs, compliance artifacts, or traceability indexes as source-of-truth model content.
- Model detailed UI layout or screen structure.

## Users

- Model authors who want to inspect and review a BehavioML workspace.
- Reviewers who need to validate model consistency and behavioral coverage.
- Implementers who need to understand workflows, capabilities, interfaces, state ownership, and decisions before planning code.
- Future tool integrators who may connect source specs, BehavioML drafts, compliance artifacts, generated artifacts, and implementation planning artifacts.

## Input sources

The Explorer should load workspace content from archives, not directly from repository providers.

Supported MVP input sources:

- uploaded `.tgz` or `.tar.gz` archive;
- URL that directly resolves to a public unauthenticated `.tgz` or `.tar.gz` archive.

Remote archive retrieval should be performed directly by the browser when possible.

The product specification should not impose a fixed archive size limit. Practical size, browser memory, timeout, or hosting limits may be addressed later as implementation constraints.

Repository providers such as GitHub may be supported indirectly when they expose downloadable archive URLs. Direct GitHub repository URL support, GitHub API integration, branch/ref selection, subdirectory selection, private repositories, and authenticated fetch are deferred.

## Workspace detection

The Explorer should automatically detect a BehavioML workspace after archive extraction.

For the MVP, the Explorer should recognize at least:

- a BehavioML model workspace directly at the extracted archive root;
- a `behavioml/` directory containing the model workspace.

The Explorer should report a clear error when:

- the archive cannot be fetched;
- the archive cannot be extracted;
- the archive is not a supported archive type;
- no recognizable BehavioML workspace can be found;
- more than one plausible workspace root is found and automatic selection would be ambiguous.

## Supporting artifacts

When present, the Explorer should automatically discover source specification artifacts and compliance-related artifacts.

Source specs and compliance artifacts may be used as supporting context for review and navigation, but they must remain separate from BehavioML model content.

The Explorer should not require source specs, compliance artifacts, generated diagrams, or traceability maps to load a valid BehavioML model workspace.

## Primary scenarios

1. A user opens the web-based Explorer and uploads a `.tgz` or `.tar.gz` archive containing a BehavioML workspace.
2. A user provides a public unauthenticated URL to a `.tgz` or `.tar.gz` archive and the Explorer loads it directly in the browser when possible.
3. The Explorer extracts the archive, detects the BehavioML workspace root, and indexes model entities.
4. A user sees a workspace overview with available scopes, model health, diagnostics summary, and useful entry points.
5. A user selects a model entity and sees a concise contextual summary.
6. A user switches between complementary views for the selected entity, such as summary, references, backlinks, source YAML, diagnostics, and generated artifacts.
7. A user clicks a displayed BehavioML reference and navigates to the referenced entity when the reference can be resolved.
8. A user follows backlinks to understand which model elements reference the selected entity.
9. A user searches for model entities, references, diagnostics, generated artifacts, or source locations and navigates from the result.
10. A user runs or reviews validation for the loaded workspace and navigates from diagnostics to affected model entities or source files when possible.
11. A user reviews generated diagrams or reports when those artifacts are present.
12. A user optionally inspects source specs or compliance artifacts discovered in the archive.

## Views

The Explorer should support complementary views over the same loaded model.

Expected product-level views include:

- workspace overview;
- entity browser;
- entity detail;
- workflow view;
- references and backlinks view;
- diagnostics view;
- generated artifacts view;
- source YAML view;
- contextual search results;
- optional source spec and compliance context view when supporting artifacts exist.

These are product views, not prescribed UI screens or component layouts.

## Navigation model

The Explorer should support semantic navigation across BehavioML entities and supporting artifacts.

Navigation should include:

- entity to outgoing references;
- entity to incoming backlinks;
- workflow step to referenced role or capability;
- diagnostic to affected entity or source file when possible;
- search result to target entity, artifact, diagnostic, or source file;
- generated artifact to relevant model entity when the relationship is known;
- optional source spec or compliance context to related model entity when external traceability exists.

The Explorer should preserve the selected entity and surrounding context when switching views where possible.

## Search

The Explorer should provide contextual search across indexed workspace content.

Search should cover, where available:

- model entity identifiers;
- BehavioML scopes;
- path identities;
- labels or names;
- descriptions or summaries;
- references;
- backlinks;
- diagnostics;
- generated artifact names or metadata;
- source spec or compliance artifact references when discovered.

Search results should be actionable and navigate to the selected model entity, source file, diagnostic, generated artifact, or supporting artifact when possible.

## Validation and diagnostics

The Explorer should support validating a loaded BehavioML workspace.

The Explorer should embed and reuse the BehavioML Validator as the semantic model engine. The Explorer should not implement an independent BehavioML parser, resolver, reference graph, or validation subsystem unless there is a strong reason to do so.

The Validator should remain the source of truth for model interpretation and validation.

The Explorer should display diagnostics in a dedicated diagnostics view and surface diagnostic status contextually in relevant entity views.

Diagnostics should be navigable and linked to the affected model entity or source file when possible.

The product specification does not require deciding whether validation runs automatically after load, only on explicit user action, or both. That remains an implementation/product detail to resolve during planning.

## Functional requirements

- FR-001: The Explorer should be web-based.
- FR-002: The Explorer should be read-only for the initial product scope.
- FR-003: The Explorer should support loading a BehavioML workspace from an uploaded `.tgz` or `.tar.gz` archive.
- FR-004: The Explorer should support loading a BehavioML workspace from a URL that directly resolves to a public unauthenticated `.tgz` or `.tar.gz` archive.
- FR-005: Remote archive retrieval should be performed directly by the browser when possible.
- FR-006: The Explorer should not require repository-provider-specific integrations for the MVP.
- FR-007: The Explorer should automatically detect a BehavioML workspace when the archive root directly contains a model workspace.
- FR-008: The Explorer should automatically detect a BehavioML workspace when the archive contains a `behavioml/` directory containing the model workspace.
- FR-009: The Explorer should report clear errors for unsupported archives, failed fetches, failed extraction, missing workspace roots, or ambiguous workspace roots.
- FR-010: The Explorer should automatically discover source specification artifacts when present.
- FR-011: The Explorer should automatically discover compliance-related artifacts when present.
- FR-012: Source specification and compliance artifacts should be displayed as supporting context, not as BehavioML model source of truth.
- FR-013: The Explorer should index model entities by BehavioML scope and path identity.
- FR-014: The Explorer should resolve references according to BehavioML semantic field scopes.
- FR-015: Any displayed BehavioML reference should be clickable when its target can be resolved.
- FR-016: Clicking a model entity or resolvable reference should navigate to that entity while preserving context where possible.
- FR-017: The Explorer should show backlinks for model entities when references can be indexed.
- FR-018: The Explorer should support switching between complementary views of the same selected model entity.
- FR-019: The Explorer should preserve selected entity and navigation context when switching views where possible.
- FR-020: The Explorer should show workflows, roles, capabilities, interfaces, components, modules, entities, events, state machines, and decisions when present.
- FR-021: The Explorer should allow users to open the source YAML for a model entity.
- FR-022: The Explorer should provide contextual search across model entities, references, backlinks, diagnostics, generated artifacts, and supporting artifacts when present.
- FR-023: Search results should be actionable and navigate to the selected target when possible.
- FR-024: The Explorer should support validating a loaded BehavioML workspace.
- FR-025: The Explorer should reuse the BehavioML Validator as its semantic model engine.
- FR-026: The Explorer should show validator diagnostics in a dedicated diagnostics view.
- FR-027: The Explorer should surface diagnostic status contextually in relevant entity views where possible.
- FR-028: The Explorer should support navigation from diagnostics to the relevant model entity or source file when possible.
- FR-029: The Explorer should show generated diagrams or reports when generated artifacts are available.
- FR-030: The Explorer should present concise contextual summaries by default and reveal detailed YAML, diagnostics, backlinks, generated artifacts, and related entities on demand.
- FR-031: The Explorer UI should be visually pleasant, readable, and calm enough for design review sessions.

## Acceptance criteria

- The product scope is described without selecting a framework, runtime, package manager, backend, or implementation stack.
- The Explorer is clearly scoped as a web-based, read-only BehavioML semantic model explorer.
- The Explorer is not described as a full editor, requirements management tool, Spec Kit frontend, diagram editor, or code generator.
- The Explorer input model is archive-based: uploaded `.tgz` or `.tar.gz`, or public unauthenticated remote archive URL.
- Direct GitHub repository integration is not required for the MVP.
- Source specs, compliance artifacts, BehavioML model content, generated artifacts, validation output, and traceability metadata remain distinct.
- BehavioML model files remain the behavioral source of truth.
- The Explorer is expected to reuse the BehavioML Validator rather than duplicating parser, resolver, reference graph, or validation semantics.
- Navigation requirements include clickable references, backlinks, diagnostics-to-entity navigation, search-result navigation, and context-preserving view switching.
- The UI requirements emphasize clarity, progressive disclosure, and avoiding information overload without prescribing detailed layout.
- Any future implementation plan must use the reviewed source spec and BehavioML model rather than inventing behavior.

## Constraints

- This document is source specification material, not a BehavioML model.
- The initial Explorer is read-only.
- The Explorer is web-based.
- No detailed UI layout is defined here.
- No frontend framework, desktop runtime, backend runtime, package manager, or hosting model is selected here.
- No API contracts are defined here.
- No code tasks are defined here.
- No hardcoded archive size limit is specified at product-spec level.
- Remote archive URLs are public and unauthenticated for the MVP.
- Remote archive retrieval should happen directly in the browser when possible.
- The MVP loads archives, not repositories.
- The Explorer must preserve BehavioML model files as the behavioral source of truth.
- The Explorer should embed/reuse the Validator as its semantic model engine.
- Generated diagrams, validation output, reports, source specs, compliance artifacts, and traceability indexes are derived, external, or supporting artifacts, not model source files.

## Deferred scope

- Direct GitHub repository URL loading.
- GitHub API integration.
- Branch, tag, commit SHA, or repository subdirectory selection.
- Private repositories or authenticated archive URLs.
- Server-side archive fetching.
- Backend service architecture.
- Full graph visualization beyond reference/backlink navigation.
- Editing BehavioML models.
- Writing source specs, compliance artifacts, or traceability maps from the UI.
- Generating diagrams on demand if generated artifacts are not already present.
- Packaging as a Spec Kit extension.
- Choosing UI framework, runtime, package manager, hosting model, or deployment architecture.

## Open questions

- Should validation run automatically after workspace load, only through explicit user action, or both?
- What exact validator result format should the Explorer consume?
- What workspace index shape should the Validator expose for Explorer embedding?
- What source location information is needed for reliable diagnostics-to-source navigation?
- What exact archive layouts should be accepted beyond root workspace and `behavioml/` workspace?
- How should the Explorer handle archives containing both accepted model workspaces and feature-local draft model workspaces?
- What source spec paths should be auto-detected first?
- What compliance artifact names or locations should be auto-detected first?
- What generated diagram and report formats should be supported first?
- What traceability mapping shape is sufficient before considering metamodel fields such as `derived_from` or `based_on`?
- Which BehavioML scopes are required for the first useful read-only Explorer pass?
