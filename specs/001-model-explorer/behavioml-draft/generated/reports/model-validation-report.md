# Model Validation Report

## 1. Validation target and inspected inputs

Target draft model:

- `specs/001-model-explorer/behavioml-draft/model/`

Inspected supporting inputs:

- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`
- `specs/001-model-explorer/behavioml-draft/generated/reports/initial-derivation-report.md`
- `README.md`
- `behavioml/README.md`
- `specs/001-model-explorer/notes.md`
- `prompts/commands/behavioml.validate.prompt.md`

## 2. Official validator discovery

Official validator discovery was attempted before fallback checks.

Repository evidence found:

- `specs/001-model-explorer/notes.md` states that no `/behavioml.validate` executable command exists in this repository and no script invokes a BehavioML validator or diagram generator.
- `README.md` lists `/behavioml.validate` as a desired future prompt/command, not as an installed executable.
- No `package.json`, Makefile target, CI validator command, schema runner, or local validator executable was found for the feature-local draft.

Validator command attempted:

```bash
behavioml.validate specs/001-model-explorer/behavioml-draft/model
```

The command was attempted from repository root and failed with `command not found`.

## 3. Official validator results

Official validation did not run.

- Command: `behavioml.validate specs/001-model-explorer/behavioml-draft/model`
- Working directory: `/workspace/explorer`
- Exit status observed by the shell: `127`
- Diagnostic summary: `/bin/bash: line 2: behavioml.validate: command not found`

## 4. Fallback checks performed

Because the official Validator could not be run, only fallback structural checks were performed. These fallback checks are not official BehavioML validation.

Fallback checks performed:

- YAML parse/readability check using Python and PyYAML.
- Model directory shape check for expected draft model categories.
- Duplicate path identity check based on file paths under the model root.
- Workflow object-step shape check for `from`, `to`, `capability`, `label`, and prohibited `at` usage.
- Reference existence checks for workflow step capabilities, capability `requires`, capability events, state-machine entities, state-machine transition events, roles in workflow steps, and traceability model targets.
- State-machine structural check for duplicate states, transition source/target state existence, and event references.
- Traceability YAML parseability, source-path existence, source-anchor presence by heading/text anchor, and target existence.

## 5. Fallback check findings

Fallback structural findings:

- All draft YAML files were readable by PyYAML.
- The selected model root exists and contains the expected draft categories: capabilities, components, decisions, entities, events, interfaces, modules, roles, state machines, and workflows.
- No duplicate path identities were detected under the draft model root.
- Workflow steps use object-step shape and include `from`, `capability`, and `label`; no `at` field or separate hidden `interactions` spine was found.
- Fallback reference checks found no missing workflow step capability references, no missing capability event references, no missing capability interface requirements, no missing workflow step role references, and no missing state-machine event references after interpreting BehavioML path identity conventions.
- The workspace lifecycle contains an unused state: `indexing_model` is declared but no transition enters or leaves it.
- The workspace lifecycle uses the unquoted key `on` for transition events. PyYAML treats `on` as boolean `true` under YAML 1.1 rules, so the file is readable but structurally ambiguous for YAML 1.1-compatible tooling.
- Generated artifacts are modeled as inspectable artifacts and supporting context, not as accepted source-of-truth model files.

## 6. Traceability validation

Traceability file:

- `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`

Fallback traceability findings:

- The traceability map is readable YAML.
- All mapped source files exist.
- Source heading anchors were found for mapped heading-based anchors.
- Functional-requirement anchors such as `#FR-003` are not Markdown headings, but the referenced labels are present in `spec.md`; they were treated as text anchors by fallback validation.
- All mapped model targets exist in the selected draft model root before refinement.
- Traceability remains external to the model and no model-local traceability fields were found.

## 7. Limitations and skipped checks

Skipped or limited checks:

- Official BehavioML schema/metamodel validation was skipped because no runnable official Validator was available in this environment.
- Fallback checks cannot prove semantic model correctness, behavioral completeness, diagram generation readiness, or promotion readiness.
- Fallback reference checks rely on observed repository path conventions because no machine-readable metamodel schema was discovered.
- Fallback source-anchor checks cannot verify non-heading anchors beyond textual label presence.

## 8. Overall validation status

Fallback structural validation status: **passes with findings**.

Objective issues to address before relying on the draft for promotion or diagrams:

1. Remove or connect the unused `indexing_model` workspace lifecycle state.
2. Quote state-machine transition `on` keys or otherwise align them with repository YAML parser conventions.

## 9. Recommended next step

Run `behavioml.review` with the `interactive-tool` profile, then apply focused refinement for the objective lifecycle/YAML findings and any review-confirmed modeling-quality issues.
