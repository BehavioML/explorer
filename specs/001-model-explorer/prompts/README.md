# Feature-specific Prompts

This directory stores feature-specific Codex prompts for `specs/001-model-explorer/`.

Repo-wide reusable prompts live under `../../../prompts/`. Feature-specific prompts here should capture one-off or feature-local workflows that are useful to review, repeat, or adapt.


## Relationship to reusable command prompts

Feature-local prompts combine generic repo-wide command prompts with feature-specific source artifacts and constraints. They may be more specific than reusable command prompts because they can name feature goals, technical planning constraints, candidate model elements, and feature-local non-goals.

Reusable command prompts must remain portable across BehavioML projects and should not absorb Model Explorer-specific assumptions. Keep Explorer-specific derivation guidance in this directory instead of moving it into `../../../prompts/commands/`.

Use `0001-derive-model-explorer-draft.prompt.md` for the first Model Explorer BehavioML derivation task.

## Naming convention

Use monotonically increasing numeric prefixes:

- `0001-<short-name>.prompt.md`
- `0002-<short-name>.prompt.md`

## Prompt content checklist

Prompts should include:

- inspect-first steps;
- exact scope;
- what not to do;
- acceptance criteria;
- commands to run where applicable;
- honest reporting requirements.

Prompts should be deterministic, reviewable, and explicit about any source files, generated artifacts, or external references that must be inspected before editing.
