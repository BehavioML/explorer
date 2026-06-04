# Model Validation After Refinement Report

## 1. Validation target and inspected inputs

Target draft model:

- `specs/001-model-explorer/behavioml-draft/model/`

Inspected supporting inputs:

- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`
- `specs/001-model-explorer/behavioml-draft/generated/reports/model-validation-report.md`
- `specs/001-model-explorer/behavioml-draft/generated/reports/model-review-report.md`
- `specs/001-model-explorer/behavioml-draft/generated/reports/model-review-refinement-report.md`
- `README.md`
- `behavioml/README.md`
- `specs/001-model-explorer/notes.md`
- `prompts/commands/behavioml.validate.prompt.md`

## 2. Official validator discovery

Official validator discovery was attempted again before fallback checks.

Repository evidence remains unchanged:

- No official Validator executable, package script, Makefile target, CI command, schema runner, or local documented validator command is available for this feature-local draft.
- Existing repository notes state that no `/behavioml.validate` executable command exists here and no script invokes a BehavioML validator or diagram generator.

Validator command attempted:

```bash
behavioml.validate specs/001-model-explorer/behavioml-draft/model
```

## 3. Official validator results

Official validation did not run.

- Command: `behavioml.validate specs/001-model-explorer/behavioml-draft/model`
- Working directory: `/workspace/explorer`
- Exit status observed by the shell: `127`
- Diagnostic summary: `/bin/bash: line 2: behavioml.validate: command not found`

## 4. Fallback checks performed

Because the official Validator still could not be run, only fallback structural checks were performed. These fallback checks are not official BehavioML validation.

Fallback checks performed:

- YAML parse/readability check using Python and PyYAML.
- Expected model directory shape check.
- Duplicate path identity check based on files under the model root.
- Workflow object-step shape check for required fields and prohibited `at` usage.
- Reference existence checks for workflow capabilities, workflow roles, capability `requires`, capability events, state-machine entities, state-machine events, and traceability targets.
- State-machine checks for duplicate states, missing source/target states, missing event references, boolean `true` keys caused by unquoted `on`, and unused states.
- Traceability YAML parseability, source file existence, source-anchor presence by heading/text anchor, and model target existence.

## 5. Fallback check findings

Fallback structural findings after refinement:

- All draft YAML files are readable by PyYAML.
- The selected model root exists and contains the expected categories: capabilities, components, decisions, entities, events, interfaces, modules, roles, state machines, and workflows.
- No duplicate path identities were detected under the draft model root.
- Workflow steps use object-step shape, include required `from`, `capability`, and `label` fields, and do not use `at`.
- All checked workflow step capabilities resolve to existing capability files.
- All checked workflow step roles and workflow role declarations resolve to existing role files.
- All checked capability `requires` references resolve to existing interface files.
- All checked capability event references resolve to existing event files.
- The workspace lifecycle state machine has no duplicate states, missing transition source/target states, missing event references, boolean `true` transition keys, or unused states.
- Removed event files have no remaining capability references.
- Generated artifacts remain modeled as inspectable derived/context artifacts rather than source-of-truth model files.

## 6. Traceability validation

Traceability file:

- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`

Fallback traceability findings after refinement:

- The traceability map is readable YAML.
- All mapped source files exist.
- Source heading anchors were found for mapped heading-based anchors.
- Functional-requirement anchors such as `#FR-003` are not Markdown headings, but the referenced labels are present in `spec.md`; they were treated as text anchors by fallback validation.
- All mapped model targets exist in the selected draft model root.
- The stale mapping to removed `events:search/search_result_selected` has been removed.
- Traceability remains external to the model and no model-local traceability fields were found.

## 7. Limitations and skipped checks

Skipped or limited checks:

- Official BehavioML schema/metamodel validation was skipped because no runnable official Validator is available in this environment.
- Fallback checks cannot prove semantic model correctness, behavioral completeness, promotion readiness, or diagram-generation correctness.
- Fallback checks rely on observed repository path identity conventions because no machine-readable metamodel schema was discovered.
- Fallback anchor checks treat functional requirement labels as textual anchors, not formal Markdown heading anchors.

## 8. Overall validation status

Fallback structural validation status after refinement: **passes**.

Official validation status: **not run** because the official Validator command is unavailable in this repository/environment.

## 9. Recommended next step

The draft is structurally cleaner after focused refinement. Before promotion into `behavioml/model/`, run the official BehavioML Validator when a documented executable command or package integration becomes available.
