# behavioml.derive

## Purpose

Derive a proposed feature-local BehavioML model draft from a source product specification.

## Inputs

- `specs/<feature>/spec.md`
- Optional `specs/<feature>/notes.md`
- BehavioML modeling rules and repository conventions

## Outputs

- Proposed model files under `specs/<feature>/behavioml-draft/model/`
- Optional draft traceability entries under `specs/<feature>/behavioml-draft/traceability/source-map.yaml`
- Honest gap report in the final response or a generated report when requested

## Instructions

1. Inspect the source spec, notes, existing feature-local draft, accepted root model, traceability maps, and BehavioML modeling rules before editing.
2. Derive a proposed behavior-first model from source spec content.
3. Model workflows, roles, capabilities, interfaces, components, modules, events, entities, state machines, and decisions only when justified by the source spec.
4. Preserve path identity and semantic reference rules.
5. Report source spec gaps instead of inventing missing behavior.
6. Keep traceability external if mappings are added.

## Non-goals

- Do not choose an implementation framework.
- Do not generate application code.
- Do not create technical contracts.
- Do not create implementation tasks.
- Do not modify the BehavioML metamodel.
- Do not treat generated artifacts as source of truth.

## Acceptance criteria

- The draft model is derived only from inspected source material.
- Missing or ambiguous behavior is reported as a source spec gap.
- The output stays within `specs/<feature>/behavioml-draft/` unless explicitly requested.
- No framework, runtime, package, or application code is introduced.

## Failure reporting

Report exactly which inputs could not be inspected, which behaviors could not be modeled safely, and which gaps block a trustworthy draft.
