# behavioml.validate

## Purpose

Validate a feature-local or accepted BehavioML model for structural consistency and behavior-first modeling discipline.

## Inputs

- Feature-local BehavioML model under `specs/<feature>/behavioml-draft/model/`, or
- Accepted BehavioML model under `behavioml/model/`, or
- Another explicitly supplied BehavioML `model/` root

## Outputs

- Validation report under the corresponding `generated/validation/` directory
- Honest final summary of validation status and limitations

## Instructions

1. Inspect the selected model root and its surrounding generated and traceability directories.
2. Check references according to semantic field scopes.
3. Check workflow object-step shape where workflows use object steps.
4. Check event discipline: events should be real observable occurrences.
5. Check state-machine shape, including entity references, transition events, and valid source/target shape.
6. Check that generated directories are not treated as model source of truth.
7. Report issues honestly.

## Non-goals

- Do not modify the model unless explicitly requested.
- Do not infer hidden interactions.
- Do not choose implementation details.
- Do not validate final schema completeness unless a schema is explicitly supplied.

## Acceptance criteria

- A validation report is written under `generated/validation/` when editing is requested.
- Reference, workflow, event, and state-machine issues are reported clearly.
- Validation limitations are explicit.
- No unrelated model changes are made.

## Failure reporting

Report unreadable files, parse failures, missing model roots, unsupported YAML shapes, and checks that could not be performed.
