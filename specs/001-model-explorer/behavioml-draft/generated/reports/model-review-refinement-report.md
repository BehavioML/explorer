# Model Review Refinement Report

## 1. Refinement target and basis

Target draft:

- `specs/001-model-explorer/behavioml-draft/model/`

Refinement basis:

- Initial fallback validation findings in `model-validation-report.md`.
- Review findings in `model-review-report.md`.
- Source behavior and constraints in `spec.md`, `information-architecture.md`, `plan.md`, and `notes.md`.
- Interactive-tool profile guidance on event discipline, lifecycle scope, capability granularity, entities, and adapter boundaries.

This was a focused refinement of the existing draft. The model was not regenerated wholesale, no content was promoted into `behavioml/model/`, and no source artifacts, reusable prompts, metamodel files, application code, or package configuration were modified.

## 2. Validation findings addressed

Addressed objective validation findings:

- Removed the unused `indexing_model` state from `state-machines/workspace/lifecycle.yaml`.
- Quoted all workspace lifecycle transition `on` keys as `"on"` to avoid YAML 1.1 parser ambiguity where unquoted `on` may be interpreted as boolean `true`.

## 3. Review findings addressed

Addressed modeling-quality findings:

- Narrowed the workspace lifecycle to archive loading, extraction/root detection, index readiness, and terminal load/detection errors.
- Removed validation-run states (`validation_running`, `validation_failed`) and related transitions from the workspace lifecycle because they mixed validation-run status into the workspace loading/readiness lifecycle.
- Preserved validation behavior as workflows, capabilities, and events rather than introducing a new validation-run entity or state machine that the source artifacts do not yet require.
- Removed `navigation/entity_view_changed` as an event because it was presentation-adjacent and the workflow/capability sufficiently model complementary-view switching.
- Removed `search/search_result_selected` as an event because it represented transient result selection; the behavior remains modeled by `search/open_search_result` and the search workflow.
- Removed event references from `navigation/switch_view` and `search/open_search_result`.
- Removed the empty `implements:` field from `components/react_ui.yaml`; React remains modeled as a replaceable UI adapter only.
- Updated the `workspace` entity description from `validation status` to `diagnostic availability` so the entity no longer implies ownership of validation-run lifecycle.

## 4. Events kept, changed, and removed

Kept events:

- `workspace/archive_load_requested`
- `workspace/archive_bytes_available`
- `workspace/unsupported_archive_identified`
- `workspace/archive_extraction_blocked`
- `workspace/root_detected`
- `workspace/ambiguous_roots_detected`
- `workspace/no_root_detected`
- `model/model_index_available`
- `navigation/entity_selected`
- `navigation/reference_followed`
- `navigation/backlink_followed`
- `validation/validation_requested`
- `validation/diagnostics_refreshed`
- `validation/validation_unavailable`
- `artifacts/generated_artifact_opened`
- `artifacts/supporting_artifact_opened`
- `source/source_yaml_opened`

Changed event usage:

- `navigation/switch_view` no longer emits a separate event.
- `search/open_search_result` no longer emits a separate event.

Removed events:

- `navigation/entity_view_changed`
- `search/search_result_selected`

Rationale:

- Complementary view switching and actionable search-result opening remain source-backed behaviors, but the removed events were not needed beyond labeling workflow steps and were too close to presentation/transient selection state under the interactive-tool profile.

## 5. Lifecycle changes

Workspace lifecycle before refinement included:

- archive loading states;
- root detection states;
- an unused `indexing_model` state;
- readiness;
- validation-running and validation-failed states.

Workspace lifecycle after refinement includes only:

- `empty`
- `loading_archive`
- `archive_available`
- `root_detected`
- `ready`
- `invalid_archive`
- `no_workspace_found`
- `ambiguous_workspace`

Lifecycle rationale:

- The lifecycle now constrains one coherent entity condition: whether the loaded workspace archive has become an index-ready BehavioML review context or failed during archive/root detection.
- Validation remains behaviorally modeled, but not as part of the workspace loading/readiness lifecycle.

## 6. Capabilities changed

Capabilities changed:

- `navigation/switch_view`: retained as a source-backed responsibility for complementary entity views and context preservation, but no longer declares an event.
- `search/open_search_result`: retained as a source-backed responsibility for actionable result navigation, but no longer declares an event.

Capabilities intentionally kept despite being small:

- `navigation/preserve_context` remains because context preservation is explicit in the product principles, FR-016, FR-019, and the IA.
- `navigation/switch_view` remains because complementary entity views are explicit in the product principles and FR-018.
- `search/open_search_result` remains because search results are required to be actionable and cross multiple target types.
- Artifact/source/context inspection capabilities remain because generated and supporting artifacts must be inspectable without becoming source-of-truth model content.

No capabilities were merged, renamed, moved, or deleted.

## 7. Entity changes

Entity changed:

- `entities/workspace.yaml` now describes `diagnostic availability` instead of `validation status`, aligning the entity with the narrowed workspace lifecycle while preserving workspace overview/model-health context.

Entities intentionally kept:

- `generated_artifact` and `supporting_artifact` remain because they are behaviorally relevant inspectable context, but they remain outside the source-of-truth BehavioML model.

## 8. Component, interface, and module changes

Component changed:

- `components/react_ui.yaml` no longer contains an empty `implements:` key.

Boundary decisions preserved:

- React remains only a replaceable UI adapter/component.
- `explorer_core` remains the UI-independent semantic application boundary.
- `validator_adapter` and `validator/validator_engine` continue to preserve the Validator as the semantic engine dependency.
- No interface or module path was renamed, moved, split, or removed.

## 9. Traceability changes

Traceability changed only where a model path was removed:

- Removed `events:search/search_result_selected` from the `spec.md#search` mapping because the event file was removed.

Traceability not changed:

- No traceability update was needed for `navigation/entity_view_changed` because no source-map target referenced it.
- No traceability path update was needed for workspace lifecycle state removals because `state-machines:workspace/lifecycle` remains the same target.
- No traceability update was needed for event usage removals because capability/workflow path identities were preserved.

## 10. Deferred issues and remaining uncertainties

Remaining uncertainties:

- Official Validator availability remains unresolved; fallback checks cannot replace official semantic validation.
- Exact Validator result shape, source-location shape, index/backlink representation, generated artifact metadata, and supporting artifact discovery rules remain open source/product questions.
- A future `validation_run` entity/state machine may be justified if source artifacts later require explicit validation run lifecycle, cancellation, retries, or detailed validation status transitions.
- The model still represents generated/supporting artifacts as entities; this remains acceptable for inspection behavior but should be watched during promotion to ensure they remain contextual and external.

## 11. Recommended next validation

Run the validation prompt again against:

```bash
behavioml.validate specs/001-model-explorer/behavioml-draft/model
```

If the official Validator remains unavailable, run fallback structural checks and clearly label them as fallback.
