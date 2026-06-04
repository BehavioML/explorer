# Feature-local BehavioML Draft

This directory contains the proposed feature-local BehavioML model draft derived from `../spec.md`.

The content under `model/` is not the accepted system-level BehavioML model until it has been reviewed and promoted into `../../../behavioml/model/`.

## Directory roles

- `model/` is reserved for proposed BehavioML model entities for this feature.
- `traceability/` may contain external mappings from source spec anchors to model elements.
- `generated/` may contain derived diagrams, validation output, and reports.

## Draft modeling rules

- Do not hide behavior in implementation notes.
- Do not model UI layout.
- Do not choose a framework.
- Do not turn BehavioML entities into an ERD.
- Events must be real observable occurrences.
- Generated artifacts are derived views, not source of truth.
- If behavior matters, model it explicitly.
- If implementation details are missing, report an implementation planning gap instead of inventing behavior.

## Promotion rule

Feature-local draft content should be reviewed for behavior-first quality, reference consistency, event discipline, and source-spec alignment before any content is promoted into the accepted system model.
