# behavioml.traceability

## Purpose

Review or update external traceability between source specs and BehavioML model elements.

## Inputs

- Source spec: `specs/<feature>/spec.md`
- Feature-local model draft or accepted model
- Existing `source-map.yaml` traceability file

## Outputs

- Updated or reviewed `source-map.yaml`
- Coverage report under the corresponding `generated/reports/` directory
- Honest list of unmapped requirements and orphan model elements

## Instructions

1. Inspect the source spec, model files, existing traceability map, and BehavioML rules.
2. Trace source spec anchors to model references externally.
3. Use stable source anchors where available, such as requirement IDs or Markdown headings.
4. Use BehavioML typed reference syntax for model targets where appropriate.
5. Report unmapped requirements.
6. Report orphan model elements that lack source justification.
7. Keep traceability experimental and external.

## Non-goals

- Do not add `derived_from` or `based_on` fields to model elements.
- Do not modify the BehavioML metamodel.
- Do not invent source anchors or model elements to improve coverage numbers.
- Do not treat traceability as the source specification or behavior model.

## Acceptance criteria

- Traceability remains in `source-map.yaml` or a requested external report.
- Coverage findings distinguish unmapped source requirements from orphan model elements.
- No model-local traceability fields are added.
- Limitations and uncertain mappings are reported.

## Failure reporting

Report missing source anchors, missing model targets, ambiguous mappings, malformed YAML, and any coverage checks that could not be completed.
