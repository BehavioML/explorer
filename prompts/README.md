# Prompts

Prompts are first-class project artifacts for ChatGPT/Codex collaboration.

This repository is intentionally level 0: prompts are reviewable files, not installed commands, hooks, or packaged Spec Kit extensions.

## Directory roles

- Repo-wide reusable prompts live here.
- Command-shaped prompts live under `prompts/commands/`.
- Reusable modeling profiles live under `prompts/profiles/`.
- Feature source artifacts live under `specs/<feature>/`.

## Prompt layering

Prompt responsibilities are layered.

### Command prompts

Command prompts define process.

Examples:

- `behavioml.derive`
- `behavioml.validate`
- `behavioml.review`
- `behavioml.refine`
- `behavioml.promote`

They own:

- workflow of the activity;
- required inputs and outputs;
- BehavioML-wide modeling rules;
- acceptance criteria;
- failure reporting.

They should remain reusable across projects.

### Profile prompts

Profile prompts define reusable guidance for a class of systems.

Examples:

- interactive tools;
- protocol specifications;
- service architectures;
- compliance-oriented systems.

They own:

- reusable modeling heuristics;
- common pitfalls;
- domain-specific interpretation guidance.

They should remain reusable across multiple features and repositories.

### Feature artifacts

Feature source artifacts define product facts.

Examples:

- spec.md
- information-architecture.md
- plan.md
- notes.md

They own:

- goals;
- requirements;
- constraints;
- scope;
- product decisions.

Avoid creating large feature-specific derivation prompts when reusable profiles are sufficient.

## Suggested BehavioML workflow

Use command prompts as a lightweight pipeline:

```text
derive
    -> validate
    -> review
    -> refine
    -> validate
    -> promote
```

Command ownership:

- `derive`: creates or updates a feature-local draft from approved source artifacts; it owns behavior-first derivation and gap reporting, not validation, review, refinement, or promotion.
- `validate`: validates a draft or accepted model before review, refinement, promotion, planning, or implementation; it owns validator discovery, official validator execution, clearly labeled fallback structural checks, traceability validation, and validation reporting, not semantic modeling review.
- `review`: assesses behavior-first modeling quality, source coverage, boundaries, event discipline, reference integrity, traceability health, and readiness; it owns semantic modeling review, not automated validation or model edits.
- `refine`: applies focused improvements to an existing draft using validation and review findings; it owns incremental draft cleanup while preserving traceability, not regeneration from scratch or promotion.
- `promote`: moves reviewed and validated draft content into the accepted model; it owns promotion eligibility checks, accepted-model updates, traceability consistency, and explaining what remains draft-only.

Profiles can be composed with commands when the source system belongs to a reusable class.

Example:

```text
behavioml.review
    + interactive-tool profile
    + specs/001-model-explorer source artifacts
```

## Prompt quality rules

Prompts should be deterministic and reviewable. They should avoid hidden context where possible and should name the files, directories, reports, and reference material that must be inspected before work begins.

Prompts should include:

- purpose and scope;
- explicit inputs and outputs;
- inspect-first steps;
- acceptance criteria;
- explicit non-goals;
- commands to run where applicable;
- honest failure and gap reporting requirements.

## Future Spec Kit compatibility

Command-shaped prompts may later become real Spec Kit extension commands after their semantics stabilize.

Profiles may later become reusable derivation/review profiles.

Until then, prompts remain plain Markdown artifacts for manual ChatGPT/Codex-native workflows and should not require `.specify/`, hooks, a package manager, or a Spec Kit CLI installation.
