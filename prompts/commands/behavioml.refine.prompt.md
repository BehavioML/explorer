# behavioml.refine

## Purpose

Apply focused improvements to an existing BehavioML draft after validation and review have identified concrete issues.

This command-shaped prompt owns incremental refinement of draft model content. It preserves traceability and modeling intent while addressing specific validation findings, review findings, or explicitly requested modeling-quality improvements.

This prompt is generic and should remain reusable across BehavioML projects. Feature-specific product decisions belong in source artifacts, not in this prompt.

## Inputs

Required inputs:

- Existing BehavioML draft under `specs/<feature>/behavioml-draft/model/` or another explicitly supplied draft model root
- Validation report or validation findings
- Review report or review findings
- Source artifacts that justify the draft behavior, such as `specs/<feature>/spec.md` and related notes or planning/design artifacts

Supporting inputs when present:

- Feature-local traceability map, commonly `specs/<feature>/behavioml-draft/traceability/source-map.yaml`
- Accepted root model under `behavioml/model/` for conflict awareness only
- BehavioML modeling rules and repository conventions
- Reusable profile prompts relevant to the source system class

## Outputs

- Focused updates to the existing draft model
- Focused updates to external traceability only when required to preserve or repair mappings
- Refinement report or final summary describing:
  - findings addressed;
  - files changed;
  - traceability effects;
  - issues intentionally left unresolved;
  - recommended next validation command.

## Instructions

1. Inspect the existing draft, validation report, review report, source artifacts, traceability map, and relevant modeling rules before editing.
2. Identify the smallest set of draft changes needed to address the supplied findings or explicitly requested refinement target.
3. Refine incrementally. Preserve existing path identities, file organization, naming patterns, and modeling intent unless a finding requires a targeted change.
4. Do not regenerate the model from scratch.
5. Preserve traceability:
   - keep mappings external where the repository uses external traceability;
   - update mappings when model targets are renamed, moved, split, or removed;
   - report mappings that cannot be repaired safely;
   - do not invent source anchors.
6. Keep each refinement justified by inspected source material, validation findings, review findings, or explicit user direction.
7. When a requested improvement requires a product decision not present in the source artifacts, stop or report the gap instead of inventing behavior.
8. Distinguish fixed findings from deferred findings.
9. After editing, recommend running `behavioml.validate` again before promotion, planning, or implementation.

## Typical refinement targets

Use refinement for focused improvements such as:

- event discipline, including removing event noise and preserving only behaviorally meaningful occurrences;
- capability granularity, including merging micro-capabilities or splitting overly broad responsibilities when review evidence supports it;
- state-machine quality, including coherent lifecycle ownership, valid transitions, and avoiding UI or implementation state;
- responsibility boundaries across roles, modules, components, interfaces, and adapters;
- entity quality, including removing presentation/view-model entities and clarifying behaviorally relevant state owners;
- workflow clarity, including clearer behavior-first steps and consistent use of structured workflow step shape;
- reference cleanup required by targeted model changes;
- traceability repair caused by targeted model changes.

## Non-goals

Do not:

- invent new product behavior absent from inspected source artifacts;
- promote draft content into the accepted model;
- perform broad redesign unrelated to supplied findings;
- replace the draft with a newly derived model;
- derive from source artifacts as if no draft exists;
- perform official validation as a substitute for `behavioml.validate`;
- perform broad semantic review as a substitute for `behavioml.review`;
- modify source specs;
- modify the BehavioML metamodel;
- generate application code;
- modify package configuration.

## Acceptance criteria

- Refinement is limited to the existing draft and required external traceability updates.
- Each change is tied to a validation finding, review finding, source artifact, or explicit request.
- Traceability is preserved or traceability gaps are reported.
- The model is not regenerated from scratch.
- No draft content is promoted.
- No new product behavior is invented.
- Remaining issues and recommended next validation are reported.

## Failure reporting

Report missing drafts, missing validation or review evidence, unreadable source artifacts, ambiguous findings, conflicting findings, traceability that cannot be repaired, required product decisions absent from source artifacts, and any requested refinement that would require derivation, promotion, broad redesign, or implementation work.
