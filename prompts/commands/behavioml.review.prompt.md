# behavioml.review

## Purpose

Review a feature-local BehavioML model draft against its source artifacts, traceability metadata, and BehavioML modeling rules before validation, diagram generation, promotion, planning, or implementation.

This command-shaped prompt is generic and should remain reusable across BehavioML projects. Feature-specific review constraints belong in feature-local prompts under `specs/<feature>/prompts/`.

## Inputs

Primary feature inputs:

- Source spec: `specs/<feature>/spec.md`
- Optional notes: `specs/<feature>/notes.md`
- Optional planning/design artifacts such as information architecture, plan, research, contracts, or data-model documents when present

Repository inputs:

- Feature-local draft model: `specs/<feature>/behavioml-draft/model/`
- Feature-local traceability map when present: `specs/<feature>/behavioml-draft/traceability/source-map.yaml`
- Accepted root model when relevant: `behavioml/model/`
- BehavioML modeling rules and repository conventions

## Outputs

- Review report under `specs/<feature>/behavioml-draft/generated/reports/` when useful or requested
- Gap classification in the final response or report
- Readiness assessment for validation, diagrams, promotion, planning, or implementation
- Honest failure report for checks that could not be completed

## Instructions

1. Inspect source artifacts, optional notes, optional planning/design artifacts, the draft model, traceability map, accepted root model when relevant, and BehavioML modeling rules before reviewing.
2. Check source spec coverage: identify required behaviors, constraints, non-goals, and acceptance criteria that are missing, under-modeled, over-modeled, or contradicted by the draft.
3. Review behavior-first correctness: ensure the model captures behavior, responsibilities, observable occurrences, state constraints, and rationale rather than implementation structure alone.
4. Identify hidden interactions or invented behavior, including callbacks, retries, redirects, broker deliveries, protocol follow-ups, responses, data flow, scheduling, or UI flow that are not justified by inspected source material.
5. Review workflow step shape and `Workflow.steps` versus `Capability.uses` usage.
6. Review event discipline and state-machine shape.
7. Review reference integrity, path identity, semantic references, and traceability.
8. Identify implementation leakage from frameworks, code organization, storage schemas, generated file formats, visual layout, low-level handlers, or technical data objects.
9. Confirm generated artifacts are treated as derived views, not as source of truth.
10. Classify gaps before recommending validation, diagram generation, promotion, planning, or implementation.

## Review checks

### Source spec coverage

- Every modeled behavior is justified by inspected source material.
- Required source-spec behavior has a corresponding workflow, capability, entity, state machine, event, decision, or explicitly reported gap.
- Source constraints and non-goals are not contradicted by the model.
- Acceptance criteria are either represented behaviorally or reported as outside the current modeling scope.
- Ambiguous source requirements are reported instead of resolved by invention.

### Behavior-first correctness

- Workflows describe behaviorally meaningful scenarios, not full programs or exhaustive execution graphs.
- Roles describe functional participants in workflows.
- Capabilities describe responsibilities.
- Interfaces describe architectural dependency or contract boundaries.
- Components describe implementation elements only when relevant at architecture level.
- Modules describe ownership, packaging, or organization boundaries.
- Entities describe behaviorally relevant state owners or domain concepts, not every data object.
- Decisions capture rationale or tradeoffs rather than restating requirements.

### Workflow step shape

Object workflow steps should use this shape:

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

Check that:

- `from` is present on object steps.
- `to` is used only for observable role-to-role interactions.
- `from` without `to` represents a local action by that role.
- `capability` references an existing capability.
- `label` provides contextual presentation text.
- `at` is not used.
- Separate `interactions` lists are not used to hide the scenario spine.
- No implicit current role is required to understand the workflow.

### Hidden interactions

Flag any role-to-role behavior hidden in:

- capability decomposition;
- entity fields;
- component notes;
- implementation guidance;
- generated artifacts;
- prose-only explanations;
- inferred callbacks, retries, redirects, broker deliveries, protocol follow-ups, or responses.

If an interaction matters behaviorally, it should appear explicitly in a workflow step or be reported as a modeling gap.

### Workflow.steps vs Capability.uses

- `Workflow.steps` must carry the ordered observable scenario spine with explicit role context.
- `Capability.uses` may decompose a parent capability only when workflow and parent capability context already make execution context clear.
- `Capability.uses` must not hide role-to-role interactions, branching, loops, retries, concurrency, exceptions, data flow, transaction boundaries, scheduling, or UI interaction flow.

### Event discipline

Events should represent meaningful observable occurrences that happened in the system.

Flag events that merely represent:

- return values;
- generic success/failure labels;
- branch names;
- status labels;
- helper completions;
- display states;
- implementation task completion.

### Reference integrity

- Path identity is derived from file location, not top-level internal IDs.
- References use path identity inside the target scope, not filesystem-relative paths.
- Typed reference fields point to the correct target scopes.
- Referenced model elements exist.
- Removed or renamed entities do not leave stale references.
- The draft does not duplicate accepted root model content without a clear reason.

### State-machine shape

- State machines attach to behaviorally relevant entities.
- States represent lifecycle conditions, not UI display modes or implementation flags.
- Transitions are justified by source behavior and reference meaningful events or capabilities when appropriate.
- State machines do not encode exhaustive implementation branching better left to source code.

### Traceability

- Source-to-model mappings remain external unless the metamodel explicitly supports model-local traceability.
- Traceability entries reference inspected source anchors and existing model targets.
- Missing or stale mappings are reported.
- Traceability gaps are distinguished from modeling gaps and source spec gaps.

### Generated artifacts

- Generated diagrams, validation output, reports, indexes, and derived views are not treated as source model content.
- Generated artifacts may inform review only as evidence of derivation or validation status, not as authority over source specs or model files.

### Readiness

State whether the draft is ready for:

- validation;
- diagram generation;
- promotion to an accepted model;
- technical planning;
- implementation.

For each readiness category, report blockers, warnings, and recommended next steps.

## Non-goals

Do not:

- make unrelated model changes;
- promote draft files into the accepted model;
- generate application code;
- create package setup;
- choose implementation frameworks;
- create implementation tasks;
- create technical contracts unless explicitly requested;
- modify the BehavioML metamodel;
- treat generated artifacts as source of truth;
- invent behavior absent from inspected source material.

## Acceptance criteria

- The review remains generic and reusable across BehavioML projects.
- Source spec coverage is assessed explicitly.
- Behavior-first correctness is assessed explicitly.
- Workflow object-step shape is checked.
- Hidden interactions are reported explicitly.
- `Workflow.steps` and `Capability.uses` are distinguished correctly.
- Event discipline is reviewed.
- Reference integrity and state-machine shape are reviewed.
- Implementation leakage is reported explicitly.
- Traceability is checked without moving traceability into model files.
- Generated artifacts are classified as derived views, not source of truth.
- The report states readiness for validation, diagrams, promotion, planning, or implementation.

## Failure reporting

Report exactly:

- which inputs could not be inspected;
- which checks could not be completed;
- which source spec gaps block review confidence;
- which modeling gaps block validation, diagrams, promotion, planning, or implementation;
- which traceability entries are missing, stale, or unverifiable;
- which assumptions were made;
- what was intentionally not reviewed or changed.
