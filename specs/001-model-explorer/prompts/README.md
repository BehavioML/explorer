# Feature-specific Prompts

This directory stores feature-specific Codex prompts for `specs/001-model-explorer/`.

Repo-wide reusable prompts live under `../../../prompts/`. Feature-specific prompts here should capture one-off or feature-local workflows that are useful to review, repeat, or adapt.

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
