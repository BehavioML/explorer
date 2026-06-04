# behavioml.promote

## Purpose

Promote reviewed BehavioML draft content into the accepted model.

This command-shaped prompt owns controlled promotion from draft model content to accepted model content. It requires review evidence, validation success or explicitly documented known exceptions, and traceability consistency before accepted model files are changed.

This prompt is generic and should remain reusable across BehavioML projects. Repository-specific accepted-model paths or promotion conventions should be discovered from inspected project files when they differ from the common paths below.

## Inputs

Required inputs:

- Reviewed draft model, commonly under `specs/<feature>/behavioml-draft/model/`
- Accepted model root, commonly under `behavioml/model/`
- Review report or explicit review evidence identifying content approved for promotion
- Validation report showing success, or validation report with known exceptions explicitly accepted by the user or project maintainers
- Traceability map or traceability evidence showing source-to-draft consistency

Supporting inputs when present:

- Source artifacts needed to verify traceability anchors
- Previous promotion notes or accepted-model conventions
- Existing accepted-model traceability map, commonly `behavioml/traceability/source-map.yaml`
- BehavioML modeling rules and repository conventions

## Outputs

- Targeted changes to the accepted model root
- Optional external traceability updates for promoted content
- Promotion report or final summary explaining:
  - what was promoted;
  - why it was eligible for promotion;
  - what remains draft-only;
  - validation status and accepted exceptions;
  - traceability consistency;
  - conflicts, risks, and open questions.

## Preconditions

Before editing the accepted model, confirm that:

1. The draft content has been reviewed.
2. Validation succeeded, or each validation exception is known, documented, and accepted for promotion.
3. Traceability is consistent enough to justify the promoted content.
4. The promotion scope is explicit.
5. Accepted-model conflicts, duplicate identities, and stale references have been checked.

If any precondition is not met, do not promote. Report the blocker and the required next step.

## Instructions

1. Inspect the draft model, accepted model, review evidence, validation report, traceability maps, source artifacts needed for traceability, and repository modeling rules before editing.
2. Determine the exact draft elements approved for promotion.
3. Promote only reviewed and eligible model content.
4. Preserve path identity and accepted-model organization.
5. Avoid overwriting unrelated accepted model files.
6. Resolve conflicts only when the resolution is directly supported by review evidence or explicit user direction.
7. Keep traceability external when the repository uses external traceability.
8. Update accepted traceability mappings only for promoted content and only when mappings can be made consistently.
9. Keep generated artifacts out of accepted model source roots.
10. Explain what remains draft-only and why, including unreviewed content, validation exceptions, traceability gaps, conflicts, or deferred scope.
11. Recommend validation of the accepted model after promotion.

## Non-goals

Do not:

- perform derivation;
- perform broad redesign;
- perform general refinement unrelated to promotion blockers;
- promote unreviewed draft content;
- promote content with unresolved validation failure unless the exception is explicitly accepted;
- invent source justification or product behavior;
- modify source specs;
- modify the BehavioML metamodel;
- generate application code;
- modify package configuration;
- treat generated artifacts as accepted model source.

## Acceptance criteria

- Promotion requires reviewed draft evidence.
- Promotion requires validation success or documented known exceptions.
- Traceability consistency is checked and reported.
- Accepted-model changes are limited to eligible promoted content.
- Existing accepted model content is preserved unless a deliberate conflict resolution is documented.
- The report explains what was promoted and what remains draft-only.
- No derivation or broad redesign is performed.

## Failure reporting

Report missing review evidence, missing or failed validation, unaccepted validation exceptions, traceability gaps, conflicting path identities, unresolved references, ambiguous promotion scope, unreadable files, unsafe overwrite risks, draft-only content that cannot be promoted, and any promotion step that could not be completed safely.
