# behavioml.validate

## Purpose

Validate a BehavioML model or draft before review, refinement, promotion, planning, or implementation.

This command-shaped prompt owns validator discovery, official validator execution, fallback structural checks, traceability validation, and validation reporting. It does not perform semantic modeling review.

This prompt is generic and should remain reusable across BehavioML projects. Repository-specific validator commands, schema locations, or report paths should be discovered from inspected project files instead of hard-coded here.

## Inputs

Model inputs:

- Feature-local BehavioML draft under `specs/<feature>/behavioml-draft/model/`, or
- Accepted BehavioML model under `behavioml/model/`, or
- Another explicitly supplied BehavioML `model/` root

Supporting inputs when present:

- Traceability map associated with the selected model, commonly `traceability/source-map.yaml`
- Previously generated validation reports
- BehavioML schema, metamodel, validator documentation, Makefile targets, package scripts, CI configuration, or repository validation instructions
- Source artifacts only as needed to verify traceability anchors, not to judge semantic modeling quality

## Outputs

- Validation report under the corresponding generated reports or validation directory when editing or report generation is requested
- Clearly separated official validator results and fallback check results
- Traceability validation status
- Honest final summary of validation status, limitations, skipped checks, and next-step blockers

## Instructions

1. Inspect the selected model root, associated traceability files, generated/report directories, and repository validation instructions before running checks.
2. Discover the official validator from repository evidence such as documentation, scripts, Makefile targets, package scripts, CI configuration, or validator-specific files.
3. If an official validator is discovered, run it exactly as the repository documents unless the user supplied a more specific command.
4. If no official validator is discovered, or if it cannot run in the environment, state that clearly and proceed only with explicitly labeled fallback checks.
5. Keep official validator results and fallback checks in separate report sections. Do not merge fallback findings into official validator status.
6. For official validator results, record the command, working directory, exit status, and summarized diagnostics.
7. For fallback structural checks, inspect only machine-checkable or structurally checkable properties, such as:
   - YAML or source file readability and parseability;
   - expected model directory shape;
   - duplicate file/path identities within the selected model root;
   - reference fields that point to missing or out-of-scope model elements;
   - workflow step shape when workflows use structured object steps;
   - state-machine shape, including entity references, state uniqueness, and transition source/target/event references;
   - generated artifacts not being treated as model source of truth.
8. Validate traceability structurally when traceability is present:
   - traceability files are readable and parseable;
   - mapped source anchors are present or clearly unverifiable;
   - mapped model targets exist in the selected model root or accepted model scope as appropriate;
   - stale, orphaned, ambiguous, or out-of-scope mappings are reported.
9. Do not decide whether the model is behaviorally appropriate, complete, well-factored, or product-correct. Those are review or refinement concerns.
10. Do not edit model or traceability files unless the user explicitly requests validation fixes.
11. Report every skipped or partial check honestly.

## Report structure

Use this structure for written reports and final summaries:

1. Validation target and inspected inputs
2. Official validator discovery
3. Official validator results
4. Fallback checks performed
5. Fallback check findings
6. Traceability validation
7. Limitations and skipped checks
8. Overall validation status
9. Recommended next step

## Non-goals

Do not:

- perform semantic modeling review;
- assess whether workflows, capabilities, entities, events, or boundaries are the right modeling choices except where structural validity requires it;
- derive new model content;
- refine modeling quality;
- promote draft content;
- infer hidden product behavior;
- choose implementation details;
- modify source specs;
- modify the BehavioML metamodel;
- treat generated artifacts as source of truth.

## Acceptance criteria

- Official validator discovery is attempted and reported.
- Official validator execution is reported separately from fallback checks.
- Fallback checks are explicitly labeled as fallback, not official validation.
- Traceability validation is performed or explicitly marked unavailable.
- Validation limitations are explicit.
- No semantic modeling review is performed.
- No unrelated files are changed.

## Failure reporting

Report unreadable files, parse failures, missing model roots, missing validator instructions, official validator failures, unsupported YAML shapes, unavailable traceability files, unverifiable anchors, unresolved model targets, environment limitations, and checks that could not be performed.
