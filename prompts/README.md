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
- `behavioml.review`

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
