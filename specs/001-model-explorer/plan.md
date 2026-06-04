# Model Explorer Technical Plan

## Status

Placeholder technical plan for the future BehavioML Model Explorer.

No implementation stack, runtime, packaging strategy, deployment shape, or frontend framework has been selected. This file exists to reserve the Spec Kit-inspired planning artifact and to record technical decisions only after the source spec and BehavioML draft are mature enough to support planning.

## Inputs

- Source product specification: `specs/001-model-explorer/spec.md`
- Experiment notes: `specs/001-model-explorer/notes.md`
- Feature-local BehavioML draft: `specs/001-model-explorer/behavioml-draft/model/` once derived
- Feature-local traceability map: `specs/001-model-explorer/behavioml-draft/traceability/source-map.yaml`
- Accepted system model: `behavioml/model/` once reviewed content is promoted
- Repo-wide command-shaped prompts: `prompts/commands/`

## Technical context

TODO: Fill in technical context after the source spec has been reviewed and the BehavioML draft identifies the behavioral boundaries that need implementation support.

Not decided yet:

- frontend, desktop, web, CLI, or hybrid runtime;
- programming language;
- persistence strategy;
- model loading strategy;
- validator output format;
- generated diagram format beyond the placeholder `generated/mermaid/` convention;
- packaging and distribution model.

## Architecture notes

TODO: Derive architecture notes from the reviewed BehavioML model, not from framework preferences.

Current constraints:

- The first Explorer scope is read-only.
- The Explorer is a BehavioML model explorer, not a full editor.
- BehavioML model files remain the behavioral source of truth.
- Generated artifacts are views, not source-of-truth model content.
- Technical planning must report missing behavior as a source spec gap or modeling gap instead of inventing it.

## BehavioML inputs

TODO: Populate after `/behavioml.derive`-style work creates a feature-local draft and `/behavioml.review`-style work has identified gaps.

Expected inputs later:

- workflows that describe behaviorally meaningful Explorer scenarios;
- capabilities that describe Explorer responsibilities;
- interfaces that identify architectural dependency boundaries;
- entities and state machines only where state ownership or lifecycle behavior matters;
- decisions that capture modeling or behaviorally relevant rationale;
- validation and review reports from `generated/` directories.

## Contracts

No contracts are defined yet.

`specs/001-model-explorer/contracts/` is intentionally empty. Future contracts may describe API schemas, command schemas, payloads, integration boundaries, or generated artifact formats after the behavioral model and technical plan justify them.

## Data model

No final technical data model exists yet.

Use `specs/001-model-explorer/data-model.md` to distinguish implementation data entities from BehavioML behaviorally relevant entities before creating technical structures.

## Testing strategy

TODO: Define testing strategy after technical architecture and contracts exist.

Potential future test categories may include:

- model workspace loading tests;
- reference resolution tests;
- backlink indexing tests;
- validator diagnostic rendering tests;
- generated diagram discovery tests;
- traceability display tests when external mappings exist.

These are planning placeholders, not implementation tasks.

## Open technical decisions

- Which runtime or application shape should the Explorer use?
- Which model workspace layout should be supported first?
- What validator report format should the Explorer consume?
- What diagram artifact formats should the Explorer consume?
- Should feature-local drafts be explorable, or only accepted root models?
- What minimum traceability coverage format is useful?
- What technical contracts are required before implementation can be planned safely?
