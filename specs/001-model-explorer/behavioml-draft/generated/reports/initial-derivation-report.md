# Initial BehavioML Derivation Report

## Summary

Created the first feature-local, behavior-first BehavioML draft for the Model Explorer. The draft models read-only archive loading, workspace root detection, semantic model indexing, reference and backlink navigation, entity inspection, contextual search, validation through the reused Validator, diagnostic/source navigation, and generated/supporting artifact inspection. The accepted root model was not modified and the draft was not promoted.

## Files created

- `specs/001-model-explorer/behavioml-draft/model/capabilities/artifacts/show_generated_artifact.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/context/show_supporting_artifact.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/model/index_backlinks.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/model/index_entities.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/model/resolve_references.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/navigation/follow_backlink.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/navigation/follow_reference.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/navigation/preserve_context.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/navigation/select_entity.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/navigation/show_backlinks.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/navigation/switch_view.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/search/open_search_result.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/search/search_workspace.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/source/open_yaml.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/validation/open_diagnostic_target.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/validation/run_validation.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/validation/show_diagnostics.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/workspace/detect_workspace_root.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/workspace/discover_generated_artifacts.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/workspace/discover_supporting_artifacts.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/workspace/extract_archive.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/workspace/load_remote_archive.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/workspace/load_uploaded_archive.yaml`
- `specs/001-model-explorer/behavioml-draft/model/capabilities/workspace/show_overview.yaml`
- `specs/001-model-explorer/behavioml-draft/model/components/browser_archive_adapter.yaml`
- `specs/001-model-explorer/behavioml-draft/model/components/explorer_core.yaml`
- `specs/001-model-explorer/behavioml-draft/model/components/react_ui.yaml`
- `specs/001-model-explorer/behavioml-draft/model/components/validator_adapter.yaml`
- `specs/001-model-explorer/behavioml-draft/model/decisions/keep_explorer_read_only_and_archive_based.yaml`
- `specs/001-model-explorer/behavioml-draft/model/decisions/keep_react_as_replaceable_ui_adapter.yaml`
- `specs/001-model-explorer/behavioml-draft/model/decisions/keep_supporting_and_generated_artifacts_external.yaml`
- `specs/001-model-explorer/behavioml-draft/model/decisions/reuse_validator_as_semantic_engine.yaml`
- `specs/001-model-explorer/behavioml-draft/model/decisions/use_explicit_object_workflow_steps.yaml`
- `specs/001-model-explorer/behavioml-draft/model/entities/diagnostic.yaml`
- `specs/001-model-explorer/behavioml-draft/model/entities/generated_artifact.yaml`
- `specs/001-model-explorer/behavioml-draft/model/entities/model_entity.yaml`
- `specs/001-model-explorer/behavioml-draft/model/entities/semantic_reference.yaml`
- `specs/001-model-explorer/behavioml-draft/model/entities/supporting_artifact.yaml`
- `specs/001-model-explorer/behavioml-draft/model/entities/workspace.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/artifacts/generated_artifact_opened.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/artifacts/supporting_artifact_opened.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/model/model_index_available.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/navigation/backlink_followed.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/navigation/entity_selected.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/navigation/entity_view_changed.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/navigation/reference_followed.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/search/search_result_selected.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/source/source_yaml_opened.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/validation/diagnostics_refreshed.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/validation/validation_requested.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/validation/validation_unavailable.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/workspace/ambiguous_roots_detected.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/workspace/archive_bytes_available.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/workspace/archive_extraction_blocked.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/workspace/archive_load_requested.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/workspace/no_root_detected.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/workspace/root_detected.yaml`
- `specs/001-model-explorer/behavioml-draft/model/events/workspace/unsupported_archive_identified.yaml`
- `specs/001-model-explorer/behavioml-draft/model/interfaces/archive/archive_extraction.yaml`
- `specs/001-model-explorer/behavioml-draft/model/interfaces/archive/archive_input.yaml`
- `specs/001-model-explorer/behavioml-draft/model/interfaces/archive/remote_archive_fetch.yaml`
- `specs/001-model-explorer/behavioml-draft/model/interfaces/artifacts/generated_artifact_reader.yaml`
- `specs/001-model-explorer/behavioml-draft/model/interfaces/artifacts/supporting_artifact_reader.yaml`
- `specs/001-model-explorer/behavioml-draft/model/interfaces/source/source_yaml_reader.yaml`
- `specs/001-model-explorer/behavioml-draft/model/interfaces/validator/validator_engine.yaml`
- `specs/001-model-explorer/behavioml-draft/model/modules/browser_adapters.yaml`
- `specs/001-model-explorer/behavioml-draft/model/modules/core.yaml`
- `specs/001-model-explorer/behavioml-draft/model/modules/ui.yaml`
- `specs/001-model-explorer/behavioml-draft/model/modules/validator_integration.yaml`
- `specs/001-model-explorer/behavioml-draft/model/roles/archive_source.yaml`
- `specs/001-model-explorer/behavioml-draft/model/roles/explorer.yaml`
- `specs/001-model-explorer/behavioml-draft/model/roles/user.yaml`
- `specs/001-model-explorer/behavioml-draft/model/roles/validator.yaml`
- `specs/001-model-explorer/behavioml-draft/model/state-machines/workspace/lifecycle.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/artifacts/inspect_generated_artifact.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/context/inspect_supporting_artifact.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/navigation/inspect_backlinks.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/navigation/inspect_model_entity.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/navigation/navigate_reference.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/navigation/switch_entity_view.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/search/search_workspace.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/source/inspect_source_yaml.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/validation/inspect_diagnostic.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/validation/run_validation.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/workspace/inspect_overview.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/workspace/load_from_remote_archive_url.yaml`
- `specs/001-model-explorer/behavioml-draft/model/workflows/workspace/load_from_uploaded_archive.yaml`
- `specs/001-model-explorer/behavioml-draft/generated/reports/initial-derivation-report.md`

## Files modified

- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`

## Source inputs inspected

- `README.md`
- `prompts/commands/behavioml.derive.prompt.md`
- `prompts/commands/behavioml.review.prompt.md`
- `specs/001-model-explorer/prompts/0001-derive-model-explorer-draft.prompt.md`
- `specs/001-model-explorer/spec.md`
- `specs/001-model-explorer/information-architecture.md`
- `specs/001-model-explorer/plan.md`
- `specs/001-model-explorer/notes.md`
- `specs/001-model-explorer/behavioml-draft/README.md`
- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`
- `behavioml/README.md`
- BehavioML specifications repository at `https://github.com/BehavioML/specifications`, cloned at commit `05588ac` for inspection.
- BehavioML specifications: `README.md`
- BehavioML specifications: `docs/model-rules.md`
- BehavioML specifications: `docs/design-notes/0005-sequence-diagrammable-workflows.md`
- BehavioML specifications: `docs/design-notes/0006-behavioml-and-uml-boundary.md`
- BehavioML specifications: `docs/design-notes/0007-implementation-guidance-boundary.md`
- BehavioML specifications: `docs/design-notes/0008-lessons-from-whip.md`
- BehavioML specifications: `docs/design-notes/0009-behavioml-in-sdd-pipeline.md`
- BehavioML specifications: `examples/whip/model/`
- BehavioML specifications: `examples/oauth-authorization-code/model/`
- BehavioML specifications: `examples/quic/model/`

No requested source input was unreadable. I inspected the requested example model directories by reading their YAML files; no external file access failure blocked the derivation.

## What was modeled

- Workflows for uploaded archive loading, remote archive URL loading, workspace overview inspection, entity inspection, entity view switching, reference navigation, backlink inspection, contextual search, validation, diagnostic inspection, generated artifact inspection, supporting artifact inspection, and source YAML inspection.
- Roles for the user, Explorer, Validator, and archive source.
- Capabilities for archive input, extraction, root detection, supporting/generated artifact discovery, semantic indexing, reference resolution, backlink indexing, navigation, search, validation, diagnostics, source YAML access, and artifact/context inspection.
- Interfaces for archive input/fetch/extraction, Validator engine access, generated/supporting artifact readers, and source YAML access.
- Components and modules for Explorer core, browser archive adapter, Validator adapter, and replaceable React UI adapter, keeping semantic ownership outside React.
- Behaviorally relevant entities for workspace, model entity, semantic reference, diagnostic, generated artifact, and supporting artifact.
- Observable events for archive loading/root detection/index availability/navigation/search/validation/artifact/source occurrences.
- A workspace lifecycle state machine derived from the IA product states, using observable events rather than UI display flags.
- Decisions documenting archive-based read-only scope, Validator reuse, external generated/supporting artifacts, replaceable React UI, and explicit object workflow steps.

## What was intentionally not modeled

- React component trees, CSS/layout, tabs/panels as layout, low-level click handlers, framework state, package setup, React/Vite configuration, and application code.
- Database tables, implementation classes, backend fetching, private repository authentication, direct GitHub API integration, or repository-provider browsing.
- Editing workflows, writing traceability from the UI, generated diagram creation on demand, full graph visualization beyond reference/backlink navigation, implementation tasks, and technical contracts.
- `derived_from`, `based_on`, or any model-local traceability fields; traceability remains external in `source-map.yaml`.
- Promotion to the accepted root model under `behavioml/model/` or any BehavioML metamodel changes.

## Source spec gaps

- Validation timing remains unspecified: automatic after load, explicit only, or both.
- Exact Validator programmatic result shape, semantic index shape, backlink representation, and source-location format are not defined.
- Accepted archive layouts beyond archive root and `behavioml/` directory remain open.
- How to handle archives containing both accepted root workspaces and feature-local draft workspaces remains open.
- Source spec and compliance artifact discovery paths/names are not defined.
- Generated artifact formats and metadata needed for artifact-to-model navigation are not defined.
- Traceability mapping coverage and minimum useful mapping shape remain experimental.

## Modeling uncertainties

- Some technical data concepts from the plan, such as loaded archive and search result, were not promoted to BehavioML entities unless they carried behaviorally relevant state ownership. They appear as capabilities/events where appropriate.
- The workspace lifecycle state machine captures product-level review states from the IA, but intentionally avoids prescribing implementation state management.
- Events for navigation and artifact/source opening are modeled because they are observable review occurrences, not because they represent UI display states.
- Model indexing, reference resolution, and backlink indexing are modeled as Explorer capabilities requiring the Validator engine where applicable, while preserving the Validator as source of semantic truth.

## Technical planning gaps

- No technical contracts exist for validator embedding, workspace index results, diagnostics, source locations, generated artifact metadata, supporting artifact discovery, archive input, or decompression.
- Archive decompression library, fetch/CORS behavior, streaming versus full-buffer extraction, memory behavior, and error reporting are deferred.
- Search indexing strategy, routing/navigation persistence, browser history integration, YAML/source viewer, diagram rendering library, and static hosting strategy are deferred.
- Implementation testing categories are suggested by the plan but no implementation tests or tasks exist yet, consistent with the requested modeling-only scope.

## Assumptions

- The source spec status "Initial agreed product scope" is sufficient to derive a feature-local draft rather than stopping for product approval.
- The feature-specific prompt explicitly requests this first draft, so the draft is intentionally proposed and reviewable, not accepted system model content.
- `archive_source` is modeled as a role to make remote archive retrieval observable; uploaded archive selection is modeled as a user-to-Explorer interaction.
- React is modeled only as a replaceable UI adapter component because the technical plan already names it while constraining it away from semantic ownership.

## Recommended review focus

- Confirm whether workflow granularity is right for a first Explorer draft, especially whether workspace loading should remain in two workflows or split further around root detection and indexing.
- Review event discipline for navigation, validation, artifact opening, and workspace lifecycle events.
- Validate that all reference paths resolve under the current BehavioML path identity rules.
- Review the workspace lifecycle state machine to ensure product states are useful without leaking UI/framework state.
- Confirm whether the modeled entities are behaviorally relevant state owners or should be reduced before promotion.
- Confirm whether Validator dependency boundaries are strong enough to prevent parser/resolver/diagnostics reimplementation in Explorer core.
