# behavioml.derive

## Purpose

Derive a proposed feature-local BehavioML model draft from reviewed source product and design artifacts.

This command-shaped prompt is generic and should remain reusable across BehavioML projects. Feature-specific constraints belong in feature-local prompts under `specs/<feature>/prompts/`.

## Inputs

Primary feature inputs:

- Source spec: `specs/<feature>/spec.md`
- Optional notes: `specs/<feature>/notes.md`
- Optional planning/design artifacts such as information architecture, plan, research, contracts, or data-model documents when present

Repository inputs:

- Existing feature-local draft: `specs/<feature>/behavioml-draft/model/`
- Feature-local traceability map: `specs/<feature>/behavioml-draft/traceability/source-map.yaml`
- Accepted root model: `behavioml/model/`
- BehavioML modeling rules and repository conventions

## Outputs

- Proposed model files under `specs/<feature>/behavioml-draft/model/`
- Optional draft traceability entries under `specs/<feature>/behavioml-draft/traceability/source-map.yaml`
- Derivation report under `specs/<feature>/behavioml-draft/generated/reports/` when useful or requested
- Honest gap report in the final response

## Instructions

1. Inspect source artifacts, notes, optional planning/design artifacts, the existing feature-local draft, the accepted root model, traceability maps, and BehavioML modeling rules before editing.
2. Check whether the source spec is marked placeholder, strawman, draft, or not product-approved. If it is not approved, either stop and report that the source spec needs review, or create only a clearly marked speculative draft if explicitly requested.
3. Derive a proposed behavior-first model from inspected source material.
4. Model workflows, roles, capabilities, interfaces, components, modules, events, entities, state machines, and decisions only when justified by inspected source material.
5. Preserve path identity and semantic reference rules.
6. Report source spec gaps instead of inventing missing behavior.
7. Report modeling uncertainties instead of filling gaps with assumptions.
8. Keep traceability external if mappings are added.
9. Keep generated artifacts outside the source model.
10. Do not promote feature-local draft content into the accepted root model unless explicitly requested.

## Modeling guidance

Use BehavioML concepts by responsibility, not by implementation shape.

- Workflows describe behaviorally meaningful scenarios, not full programs or exhaustive graphs.
- Roles describe functional participants in workflows, not necessarily services, classes, users, or deployment units.
- Capabilities describe responsibilities.
- Interfaces describe architectural dependency or contract boundaries.
- Components describe implementation elements only when they are relevant at architecture level.
- Modules describe ownership, packaging, or organization boundaries.
- Entities describe behaviorally relevant state owners or domain concepts, not every data object.
- State machines describe lifecycle constraints for entities.
- Events describe observable occurrences that happened in the system.
- Decisions capture rationale, tradeoffs, or modeling choices.

## Workflow step rules

Use object steps for sequence-diagrammable workflows.

Preferred shape:

```yaml
steps:
  - from: requester
    to: responder
    capability: domain/perform_action
    label: Request action
  - from: responder
    capability: domain/process_action
    label: Process action locally
```

Rules:

- `from` is required for object steps.
- `to` is optional.
- `from + to` means observable role-to-role interaction.
- `from` only means local action by that role.
- `capability` references a capability.
- `label` is contextual presentation text.
- Do not use `at`.
- Do not infer an implicit current role.
- Do not add separate `interactions` lists.
- Do not infer hidden callbacks, retries, redirects, broker deliveries, protocol follow-ups, or hidden responses.

## Workflow.steps vs Capability.uses

- `Workflow.steps` = ordered observable scenario spine with explicit role context.
- `Capability.uses` = ordered internal decomposition under parent capability context.
- Use workflow steps when the model must explain who does what, with whom, and in what observable order.
- Use `Capability.uses` when parent capability and workflow context already make execution context clear.
- Do not use `Capability.uses` to hide role-to-role interactions, branching, loops, retries, concurrency, exceptions, data flow, transaction boundaries, scheduling, or UI interaction flow.

## Events

Use events only for meaningful observable occurrences that happened in the system.

Events should not merely represent:

- return values;
- generic success/failure labels;
- branch names;
- HTTP status labels;
- helper completions;
- UI display states;
- implementation task completion.

Only add events if they are behaviorally meaningful for the model.

## Traceability

Use external traceability maps.

Allowed:

```yaml
mappings:
  - source: specs/001-feature/spec.md#FR-001
    targets:
      - workflows:example/workflow
      - capabilities:example/capability
```

Do not add `derived_from`, `based_on`, or similar source-traceability fields to model files unless the BehavioML metamodel explicitly adopts them later.

## Implementation leakage guardrails

Do not let implementation detail define hidden behavior.

Avoid modeling:

- code classes;
- framework component trees;
- CSS/layout details;
- database tables;
- low-level handlers;
- generated file formats as source model content;
- every technical data object as a BehavioML entity.

Model implementation components, modules, and interfaces only when source artifacts justify them as architectural responsibility or dependency boundaries.

## Non-goals

Do not:

- choose an implementation framework;
- generate application code;
- create technical contracts unless explicitly requested;
- create implementation tasks;
- modify the BehavioML metamodel;
- treat generated artifacts as source of truth;
- promote draft files into `behavioml/model/`;
- turn source specs, compliance artifacts, or planning docs into BehavioML model content;
- model UI layout or visual styling;
- invent behavior absent from inspected source material.

## Acceptance criteria

- The draft model is derived only from inspected source material.
- Missing or ambiguous behavior is reported as a source spec gap or modeling uncertainty.
- The output stays within `specs/<feature>/behavioml-draft/` unless explicitly requested.
- No framework, runtime, package, or application code is introduced.
- Workflow object steps use explicit `from`, optional `to`, `capability`, and `label`.
- No `at` field is introduced.
- No hidden interactions are inferred.
- `Capability.uses` is not used to hide role-to-role interactions or UI flow.
- Events represent observable occurrences, not generic outcome labels.
- Implementation details do not leak into core BehavioML model files.
- Traceability remains external.
- A derivation report is created when useful or requested.

## Failure reporting

Report exactly:

- which inputs could not be inspected;
- which behaviors could not be modeled safely;
- which source spec gaps block a trustworthy draft;
- which modeling uncertainties remain;
- which technical planning gaps were encountered;
- which assumptions were made;
- what was intentionally not modeled.
