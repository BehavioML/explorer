# Level-0 Spec Kit -> BehavioML Experiment Notes

This feature is being used as a level-0 ChatGPT/Codex-native experiment for integrating Spec Kit-inspired source specifications, planning artifacts, command-shaped prompts, and BehavioML model derivation/review.

## What this experiment is trying to learn

- Whether a source product spec can be kept separate from a feature-local BehavioML draft without confusing ownership.
- Whether `specs/<feature>/behavioml-draft/` is a useful place to review proposed behavioral model content before promotion.
- Whether external traceability files are enough to relate source spec anchors to BehavioML model elements during early experimentation.
- Whether generated diagrams, validation output, and reports can remain derived artifacts without becoming source of truth.
- Which gaps appear between product specification, behavioral modeling, technical planning, contracts, and tasks.

## What is intentionally not automated yet

- No `/behavioml.derive`, `/behavioml.review`, `/behavioml.validate`, `/behavioml.diagrams`, `/behavioml.traceability`, or `/behavioml.promote` executable command exists here.
- Command-shaped prompt files exist as reviewable Markdown artifacts, not installed tooling.
- No Spec Kit extension is packaged or registered.
- No `.specify/` directory is added.
- No script invokes a BehavioML validator or diagram generator.
- No model coverage or traceability report is generated automatically.
- No full BehavioML model is generated from the source spec.

## What would justify a future Spec Kit extension

A future extension would be justified if this manual workflow repeatedly shows that teams need the same operations:

- derive a feature-local BehavioML draft from source specs;
- review the draft for behavior-first modeling quality;
- validate references, event discipline, state machines, and diagrammability;
- generate diagrams and reports;
- classify gaps before technical planning;
- check coverage between source specs, BehavioML model elements, contracts, and tasks.

## What remains unknown

- The minimum useful traceability mapping format.
- Whether traceability should remain external or later become model-local metadata.
- Which validator and generated artifact formats the Explorer should consume first.
- Whether `behavioml/model/` should become a first-class default model root for all BehavioML tools.
- How strict promotion from a feature-local draft to the accepted model should be.
- How much Spec Kit command integration is needed before a reusable extension is worth maintaining.

## Why this is not yet level 1 or level 2

This is not level 1 because the repository has command-shaped prompt files, but no local reusable command wrappers or installed prompt runner yet.

This is not level 2 because there is no reusable extension package, no packaged command set, no validator/generator script integration, and no automated traceability or coverage tooling.

At level 0, the repository only defines conventions, placeholder artifacts, command-shaped prompt files, and documentation for a manual workflow.
