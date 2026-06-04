# Model Explorer Data Model

## Status

Placeholder technical data model document.

No final implementation data entities, persistence schema, API schema, or storage format is defined yet.

## Spec/implementation data model entities versus BehavioML entities

Spec Kit-inspired `data-model.md` artifacts and BehavioML both use the word "entity," but they do not own the same information.

| Concept | Spec/implementation data model | BehavioML behavior model |
| --- | --- | --- |
| Entity | Data object, view model, persisted record, in-memory index item, transport payload, or implementation-facing domain object | Behaviorally relevant owner of state or domain concept |
| Field | Attribute needed by implementation, storage, contracts, or UI presentation | Usually outside the model unless it changes meaningful behavior |
| Relationship | Structural or data relationship needed by implementation | Not an ERD; model references represent behavioral architecture semantics |
| Validation rule | Data, schema, UX, or input constraint | Modeled only when it changes behaviorally meaningful outcomes |
| State transition | Data lifecycle or implementation rule | Behaviorally meaningful lifecycle owned by a BehavioML state machine |

## Current data entities

None defined yet.

Potential implementation data structures such as model indexes, reference indexes, backlinks, diagnostics, diagrams, or traceability coverage must wait until the reviewed BehavioML draft and technical plan justify them.

## Rules

- Do not turn BehavioML entities into an ERD.
- Do not generate implementation data entities from every BehavioML file type.
- Do not define persistence or transport schemas before contracts and technical planning are ready.
- If a data structure implies behavior absent from the source spec or BehavioML model, report a source spec gap or modeling gap instead of adding the structure silently.
