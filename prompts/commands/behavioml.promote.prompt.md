# behavioml.promote

## Purpose

Promote reviewed feature-local BehavioML draft content into the accepted system-level BehavioML model.

## Inputs

- Reviewed feature-local draft under `specs/<feature>/behavioml-draft/model/`
- Accepted root model under `behavioml/model/`
- Validation and review reports under generated directories
- Traceability maps where present

## Outputs

- Proposed changes to `behavioml/model/`
- Optional updates to `behavioml/traceability/source-map.yaml`
- Conflict and open-question report

## Instructions

1. Inspect the feature source spec, draft model, validation reports, review reports, traceability, and accepted root model before editing.
2. Promote only reviewed model elements.
3. Preserve behavior-first boundaries.
4. Avoid overwriting unrelated accepted model files.
5. Keep generated artifacts out of the accepted model source root.
6. Report conflicts, duplicate identities, unresolved references, and open questions.
7. Keep traceability external if accepted mappings are updated.

## Non-goals

- Do not promote unreviewed model elements.
- Do not make unrelated accepted model changes.
- Do not generate application code.
- Do not choose implementation frameworks or contracts.
- Do not modify the BehavioML metamodel.

## Acceptance criteria

- Proposed accepted-model changes are limited to reviewed behavior-first model content.
- Existing accepted model content is preserved unless a deliberate conflict resolution is documented.
- Conflicts and open questions are reported honestly.
- No generated artifacts are treated as accepted model source.

## Failure reporting

Report missing review evidence, failed validation, conflicting path identities, unresolved references, unreadable files, and any promotion step that could not be completed safely.
