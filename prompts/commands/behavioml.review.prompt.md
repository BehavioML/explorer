# behavioml.review

## Purpose

Review a BehavioML model draft against its source spec and traceability metadata before technical planning or promotion.

## Inputs

- Source spec: `specs/<feature>/spec.md`
- Model draft: `specs/<feature>/behavioml-draft/model/`
- Traceability map if present: `specs/<feature>/behavioml-draft/traceability/source-map.yaml`

## Outputs

- Review report under `specs/<feature>/behavioml-draft/generated/reports/`
- Gap classification in the final response or report

## Instructions

1. Inspect the source spec, notes, draft model, traceability map, and relevant BehavioML rules.
2. Identify modeling gaps where required behavior is missing or ambiguous.
3. Identify implementation leakage such as framework choices, UI layout, storage schemas, or code details in the model.
4. Identify source spec gaps where product intent or acceptance criteria are not clear enough to model.
5. Identify event misuse, including events that are not observable occurrences.
6. Identify `Capability.uses` misuse, especially hidden role interactions, branching, loops, retries, concurrency, or data flow.
7. Classify gaps before recommending technical planning work.

## Non-goals

- Do not make unrelated model changes.
- Do not promote draft files into the accepted model.
- Do not generate implementation tasks.
- Do not choose technical contracts or frameworks.

## Acceptance criteria

- The review distinguishes source spec gaps, modeling gaps, technical planning gaps, contract gaps, task gaps, prompt gaps, and out-of-scope items where applicable.
- Implementation leakage and event/capability misuse are reported explicitly.
- The report states whether the draft is ready for validation, diagrams, promotion, or planning.

## Failure reporting

Report missing or unreadable source specs, missing draft model files, missing traceability maps, and any checks that could not be completed.
